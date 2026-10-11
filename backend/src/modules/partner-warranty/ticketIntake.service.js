import {assertApprovalCoverage} from '../brand-crm/approvalRules.js';
import { upsertTicketAppliance } from '../service-requests/ownedAppliance.service.js';
import { runInTransaction } from '../../utils/transaction.js';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, persistClaim, flushAudit } from './claimTimeline.js';
import { CLAIM_STATUS, TERMINAL_STATUSES } from './claimStatus.js';
import { slaHours, startSla } from './claimSla.js';
import { createServiceJobForClaim, dispatchServiceJob, approveAndCreateJob } from './claimJob.service.js';
import { claimLinks } from './claimLinks.js';
import {
  TICKET_SOURCES,
  TICKET_SOURCE,
  STAFF_SOURCES,
  WARRANTY_STATUS,
  MAX_TICKET_VIDEOS,
} from './ticketConstants.js';
import { Brand } from '../super-admin/brand.model.js';
import { BrandSettings } from '../brand-admin/brandSettings.model.js';
import { User } from '../auth/user.model.js';
import { getSettings as getPlatformSettings } from '../super-admin/platformSettings.service.js';
import { escapeRegex } from '../shared/brandWarranty.js';
import { evaluateWarranty } from '../brand-crm/warrantyPolicy.service.js';
import { estimateBrandWarranty } from '../shared/brandWarrantyEstimate.js';
import { generateBrandTicketNo } from '../shared/idGenerator.js';
import { SYSTEM_ACTOR } from '../brand-crm/actor.js';
import { emit as emitNotification, emitToBrand, emitToAdmins } from '../notifications/notification.service.js';
import { ROLES } from '../../config/constants.js';
import { ApiError } from '../../middleware/errorHandler.js';

// The one way a Brand CRM ticket comes into existence (docs/brand-crm
// ARCHITECTURE §2.3). The customer app, a toll-free CCE, a brand's manual entry
// and the intake API all call createTicket, so every ticket gets the same
// IDs, warranty check, SLA clocks, timeline and notifications, whatever the
// source. Channel-specific rules (the app's mandatory invoice, a CCE's new
// customer) stay with the caller; what is true of every ticket lives here.

const SOURCE_LABEL = Object.freeze({
  [TICKET_SOURCE.NCC_APP]: 'NCC App',
  [TICKET_SOURCE.TOLL_FREE]: 'Toll-Free call',
  [TICKET_SOURCE.BRAND_MANUAL]: 'brand manual entry',
  [TICKET_SOURCE.WHATSAPP]: 'WhatsApp',
  [TICKET_SOURCE.API]: 'brand CRM',
});

export function sourceLabel(source) {
  return SOURCE_LABEL[source] || source;
}

/**
 * Warranty verdict until the policy engine (Phase 5): the brand's warranty
 * months from the purchase date. No purchase date means the brand has to
 * verify — it is never guessed either way.
 */
export const estimateWarranty = estimateBrandWarranty;

/** Open ticket for the same brand + serial — a second one would split the brand's work. */
export async function findOpenDuplicate(brandId, serialNumber) {
  if (!serialNumber) return null;
  return WarrantyClaim.findOne({
    brand: brandId,
    serialNumber: new RegExp(`^${escapeRegex(serialNumber)}$`, 'i'),
    status: { $nin: TERMINAL_STATUSES },
  })
    .select('humanId')
    .lean();
}

/** Brands created before ticket prefixes existed get one the first time they need it. */
async function brandWithPrefix(brand) {
  if (brand.ticketPrefix) return brand;
  const doc = await Brand.findById(brand._id);
  if (!doc) throw new ApiError(404, 'Brand not found');
  await doc.save(); // the pre-validate hook assigns the prefix
  return { ...brand, ticketPrefix: doc.ticketPrefix };
}

function snapshotCustomer(user, override = {}) {
  return {
    name: override.name || user.name,
    phone: override.phone || user.phone || undefined,
    alternatePhone: override.alternatePhone || user.alternatePhone || undefined,
    email: override.email || user.email || undefined,
  };
}

/**
 * @param {object} input
 * @param {string} input.customer        id of an existing customer User
 * @param {object} input.brand           Brand (lean or document)
 * @param {object} input.category        Category (lean): _id, key, name
 * @param {object} [input.productType]
 * @param {string} [input.group]
 * @param {object} [input.issue]         WarrantyIssue (lean); or give issueName
 * @param {string} [input.issueName]
 * @param {string} [input.modelNumber]
 * @param {string} [input.serialNumber]
 * @param {Date}   [input.purchaseDate]
 * @param {string} [input.remarks]
 * @param {string} [input.serviceType]
 * @param {string} [input.priority]
 * @param {object} [input.preferredVisit] { date, slot, notes }
 * @param {object} [input.customerSnapshot] name/phone as captured (a CCE's typing)
 * @param {object[]} input.documents      already checked: { kind, url, name, uploadedBy, uploadedAt }
 * @param {object} input.address          resolved snapshot with a 6-digit pincode
 * @param {object} ctx
 * @param {string} ctx.source             one of TICKET_SOURCES
 * @param {object} [ctx.actor]            snapshot of who created it; required for staff sources
 * @param {object} [ctx.sourceRef]
 * @returns {Promise<import('mongoose').Document>} the saved ticket
 */
export async function createTicket(input, ctx) {
  const { source, sourceRef } = ctx;
  if (!TICKET_SOURCES.includes(source)) throw new Error(`createTicket: unknown source "${source}"`);
  const isStaffSource = STAFF_SOURCES.includes(source);
  if (isStaffSource && ctx.actor?.kind !== 'brand') {
    throw new Error(`createTicket: a ${source} ticket needs the registering brand user as ctx.actor`);
  }
  const actor = ctx.actor || SYSTEM_ACTOR;

  const brand = await brandWithPrefix(input.brand);
  const { category } = input;
  if (!(brand.coverage || []).some((id) => String(id) === String(category._id))) {
    throw new ApiError(400, `${brand.name} does not service ${category.name}`);
  }

  const customer = await User.findById(input.customer).select('name phone alternatePhone email role').session(ctx.session || null).lean();
  if (!customer) throw new ApiError(404, 'Customer not found');
  if (customer.role !== ROLES.CUSTOMER) throw new ApiError(400, 'A ticket can only be raised for a customer account');

  const issueName = input.issue?.name || input.issueName?.trim();
  if (!issueName) throw new ApiError(400, 'Describe the issue');

  const documents = input.documents || [];
  if (documents.filter((d) => d.kind === 'video').length > MAX_TICKET_VIDEOS) {
    throw new ApiError(400, `A ticket can hold at most ${MAX_TICKET_VIDEOS} videos`);
  }

  const serialNumber = input.serialNumber?.trim() || undefined;
  const duplicate = await findOpenDuplicate(brand._id, serialNumber);
  if (duplicate) {
    const message = source === TICKET_SOURCE.NCC_APP
      ? `You already have an open claim for this product (${duplicate.humanId})`
      : `There is already an open ticket for this product (${duplicate.humanId})`;
    throw new ApiError(409, message, { existingClaim: duplicate.humanId });
  }

  const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : undefined;
  const [warranty, brandTicketNo, settings] = await Promise.all([
    evaluateWarranty({brand,category:category._id,productType:input.productType?._id,model:input.modelNumber,serial:serialNumber,purchaseDate,hasInvoice:documents.some(d=>d.kind==='invoice'),issue:input.issue?._id,serviceType:input.serviceType||'repair'}),
    generateBrandTicketNo(brand),
    BrandSettings.findOne({ brand: brand._id }).select('autoApproveSources cceAutoAssign').lean(),
  ]);

  const cceAutoAssign = settings?.cceAutoAssign || 'registrant';
  let claim = new WarrantyClaim({
    source,
    sourceRef: sourceRef || undefined,
    brandTicketNo,
    customer: customer._id,
    customerSnapshot: snapshotCustomer(customer, input.customerSnapshot),
    registeredBy: isStaffSource ? actor : null,
    assignedCce: isStaffSource && cceAutoAssign === 'registrant' ? { ...actor, assignedAt: new Date() } : null,
    brand: brand._id,
    group: input.group || null,
    category: category._id,
    categoryKey: category.key,
    productType: input.productType?._id || null,
    productName: category.name,
    issue: input.issue?._id || null,
    issueName,
    serviceType: input.serviceType || undefined,
    priority: input.priority || undefined,
    modelNumber: input.modelNumber?.trim() || undefined,
    serialNumber,
    purchaseDate,
    remarks: input.remarks?.trim() || undefined,
    preferredVisit: input.preferredVisit || undefined,
    warranty,
    documents,
    address: input.address,
    status: CLAIM_STATUS.SUBMITTED,
  });

  // SLA hours snapshot: the brand's own, else the platform's (partner-warranty Phase 9).
  const platform = (await getPlatformSettings())?.warrantySla?.toObject?.() || {};
  startSla(claim, {
    response: slaHours(brand, 'responseHours', platform),
    approval: slaHours(brand, 'approvalHours', platform),
    assignment: slaHours(brand, 'assignmentHours', platform),
    visit: slaHours(brand, 'visitHours', platform),
    resolution: slaHours(brand, 'resolutionHours', platform),
  }, new Date(), { Critical: 0.5, High: 0.75, Normal: 1, Low: 1.5, ...(brand.warrantySla?.priorityFactor?.toObject?.() || brand.warrantySla?.priorityFactor || {}) });

  appendEvent(claim, {
    action: 'CLAIM_SUBMITTED',
    actor,
    note: source === TICKET_SOURCE.NCC_APP ? undefined : `Registered via ${sourceLabel(source)}`,
    visibility: 'customer',
    meta: { source },
  });
  const ticketSeed = claim.toObject();
  const creationEvents = claim.$locals.pendingAudit;
  const write = async session => {
    // withTransaction may retry: do not reuse a document marked saved by an
    // aborted attempt. Keep the same ticket _id while rebuilding its state.
    claim = new WarrantyClaim(ticketSeed);
    if(ctx.approveNow)claim.coverageDecision=assertApprovalCoverage(claim,ctx.approval,ctx.canVerify);
    claim.$locals.pendingAudit = creationEvents;
    await persistClaim(claim, { session });
    await upsertTicketAppliance(claim, brand, { session });
    if (ctx.approveNow) {
      appendEvent(claim, { action: 'CLAIM_APPROVED', toStatus: CLAIM_STATUS.APPROVED, actor,
        note: ctx.approval?.remarks||'Approved during registration', visibility: 'customer' });
      await persistClaim(claim, { session });
      const job = await createServiceJobForClaim(claim, { session });
      claim.serviceRequest = job._id;
      appendEvent(claim, { action: 'JOB_CREATED', toStatus: CLAIM_STATUS.JOB_CREATED, actor: SYSTEM_ACTOR,
        note: `Service Job ${job.humanId}`, visibility: 'customer' });
      await persistClaim(claim, { session });
    }
  };
  if (ctx.transactionOwned) await write(ctx.session);
  else await runInTransaction(write);
  if (ctx.deferEffects) return claim;
  return finishTicketCreation(claim, brand, settings);
}

/** Called by transaction owners only after commit. */
export async function finishTicketCreation(claim, brand, settings) {
  await flushAudit(claim);

  const common = {
    brand: claim.brand,
    warrantyClaim: claim._id,
    humanId: claim.humanId,
    brandName: brand.name,
    productName: claim.productName,
    issueName: claim.issueName,
    city: claim.address.city,
    pincode: claim.address.pincode,
  };
  await Promise.all([
    emitNotification('warranty.claim_submitted', { ...common, user: claim.customer, cta: { label: 'Track Claim', route: claimLinks.customer(claim.id) } }),
    emitToBrand('warranty.new_claim_brand', brand._id, { ...common, cta: { label: 'Review Claim', route: claimLinks.brand(claim.id) } }),
    emitToAdmins('warranty.new_claim_admin', { ...common, cta: { label: 'View Claim', route: claimLinks.admin(claim.id) } }),
  ]);

  if (claim.serviceRequest) {
    await emitNotification('warranty.claim_approved', { ...common, user: claim.customer, cta: { label: 'View Claim', route: claimLinks.customer(claim.id) } });
    const brandId = claim.brand?._id || claim.brand;
    await dispatchServiceJob(claim._id, brandId);
    return WarrantyClaim.findOne({ _id: claim._id, brand: brandId });
  }
  if (settings === undefined) settings = await BrandSettings.findOne({ brand: brand._id }).select('autoApproveSources').lean();
  if (shouldAutoApprove(claim, settings)) return autoApprove(claim, brand);
  return claim;
}

/**
 * README D6: a brand may have tickets from chosen sources approved on
 * creation. Only a ticket the system judges In Warranty qualifies — anything
 * that needs verification, or is out of warranty, still waits for a person.
 */
function shouldAutoApprove(claim, settings) {
  if ([TICKET_SOURCE.WHATSAPP, TICKET_SOURCE.API].includes(claim.source)) return false;
  return Boolean(settings?.autoApproveSources?.includes(claim.source)) && claim.warranty?.status === WARRANTY_STATUS.IN;
}

async function autoApprove(claim, brand) {
  await approveAndCreateJob({ _id: claim._id }, (c) => {
    c.coverageDecision = 'warranty';
    appendEvent(c, {
      action: 'CLAIM_APPROVED',
      toStatus: CLAIM_STATUS.APPROVED,
      actor: SYSTEM_ACTOR,
      note: `Approved on creation: ${brand.name} approves ${sourceLabel(c.source)} tickets that are in warranty`,
      visibility: 'customer',
    });
  });
  const approved = await WarrantyClaim.findById(claim._id);
  await Promise.all([
    emitNotification('warranty.claim_approved', {
      user: approved.customer,
      brand: approved.brand,
      warrantyClaim: approved._id,
      humanId: approved.humanId,
      brandName: brand.name,
      cta: { label: 'View Claim', route: claimLinks.customer(approved.id) },
    }),
    emitToAdmins('warranty.claim_decided_admin', {
      humanId: approved.humanId,
      brandName: brand.name,
      decision: 'Approved',
      cta: { label: 'View Claim', route: claimLinks.admin(approved.id) },
    }),
  ]);
  return approved;
}
