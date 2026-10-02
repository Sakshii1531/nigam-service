import mongoose from 'mongoose';
import { CLAIM_STATUS } from './claimStatus.js';
import { claimLinks } from './claimLinks.js';
import { DomainEvent } from './domainEvent.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { User } from '../auth/user.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { emit as emitNotification, emitToBrand, emitToAdmins } from '../notifications/notification.service.js';

// What happens after a claim change is saved (docs/partner-warranty Phase 10):
// the service-progress notifications of ARCHITECTURE §10, and the domain
// events for brand CRMs (§8). Called by claimTimeline.flushAudit once per
// save with that save's events. Decisions that already notify at the point
// of action (approve, reject, request info, cancel …) are not repeated here.

const S = CLAIM_STATUS;

// Service progress → who hears about it (client #16 / ARCHITECTURE §10).
const PROGRESS = {
  [S.PARTNER_ASSIGNED]: { title: 'Technician Assigned', admin: true },
  [S.VISIT_SCHEDULED]: { title: 'Visit Scheduled', admin: false },
  [S.TECHNICIAN_ON_WAY]: { title: 'Technician On the Way', admin: false },
  [S.SERVICE_COMPLETED]: { title: 'Service Completed', admin: true },
  [S.CLOSED]: { title: 'Warranty Claim Closed', admin: false },
};

/** Timeline event → CRM event type (client #18). */
function eventTypeFor(e) {
  switch (e.action) {
    case 'CLAIM_SUBMITTED':
      return 'CLAIM_CREATED';
    case 'CLAIM_APPROVED':
      return 'CLAIM_APPROVED';
    case 'CLAIM_REJECTED':
      return 'CLAIM_REJECTED';
    case 'INFO_REQUESTED':
      return 'CLAIM_INFO_REQUESTED';
    default:
      break;
  }
  return {
    [S.JOB_CREATED]: 'JOB_CREATED',
    [S.PARTNER_ASSIGNED]: 'PARTNER_ASSIGNED',
    [S.SERVICE_IN_PROGRESS]: 'JOB_STARTED',
    [S.SERVICE_COMPLETED]: 'JOB_COMPLETED',
    [S.CLOSED]: 'CLAIM_CLOSED',
    [S.CANCELLED]: 'CLAIM_CANCELLED',
  }[e.toStatus] || null;
}

async function notifyProgress(claim, events) {
  for (const e of events) {
    const progress = PROGRESS[e.toStatus];
    if (!progress) continue;
    const common = { humanId: claim.humanId, title: progress.title, detail: e.note || null };
    const tasks = [
      emitToBrand('warranty.progress_brand', claim.brand, { ...common, cta: { label: 'View Claim', route: claimLinks.brand(claim.id) } }),
    ];
    // A status an admin set without telling the customer stays that way.
    if (e.visibility === 'customer') {
      tasks.push(
        emitNotification('warranty.progress_customer', {
          ...common,
          user: claim.customer,
          cta: { label: e.toStatus === S.SERVICE_COMPLETED ? 'Confirm Service' : 'Track Claim', route: claimLinks.customer(claim.id) },
        }),
      );
    }
    if (progress.admin) {
      tasks.push(emitToAdmins('warranty.progress_admin', { ...common, cta: { label: 'View Claim', route: claimLinks.admin(claim.id) } }));
    }
    await Promise.all(tasks);
  }
}

/** The CRM payload — the brand's own claim, so its customer details are included. */
async function buildPayload(claim, type, e, id) {
  const [customer, sr] = await Promise.all([
    User.findById(claim.customer).select('name phone').lean(),
    claim.serviceRequest
      ? ServiceRequest.findById(claim.serviceRequest).select('humanId status serviceProvider').populate('serviceProvider', 'name').lean()
      : null,
  ]);
  return {
    id: String(id),
    type,
    occurredAt: e.at,
    claim: {
      id: String(claim._id),
      ticket: claim.humanId,
      status: claim.status,
      product: claim.productName,
      category: claim.categoryKey,
      issue: claim.issueName,
      modelNumber: claim.modelNumber || null,
      serialNumber: claim.serialNumber || null,
      purchaseDate: claim.purchaseDate || null,
      remarks: claim.remarks || null,
      createdAt: claim.createdAt,
      customer: customer ? { name: customer.name, phone: customer.phone || null } : null,
      address: { city: claim.address?.city || null, state: claim.address?.state || null, pincode: claim.address?.pincode || null },
    },
    serviceJob: sr ? { id: sr.humanId, status: sr.status } : null,
    partner: sr?.serviceProvider?.name ? { name: sr.serviceProvider.name } : null,
    // Reasons and messages the brand can already see (rejection reason, info request).
    note: e.visibility === 'internal' ? null : e.note || null,
  };
}

async function recordDomainEvents(claim, events) {
  const typed = events.map((e) => ({ e, type: eventTypeFor(e) })).filter((x) => x.type);
  if (!typed.length) return;
  const brand = await Brand.findById(claim.brand).select('webhook.url webhook.enabled webhook.events').lean();
  const hook = brand?.webhook;

  for (const { e, type } of typed) {
    const subscribed = Boolean(hook?.enabled && hook.url && (!hook.events?.length || hook.events.includes(type)));
    const _id = new mongoose.Types.ObjectId();
    await DomainEvent.create({
      _id,
      type,
      claim: claim._id,
      brand: claim.brand,
      occurredAt: e.at,
      payload: await buildPayload(claim, type, e, _id),
      status: subscribed ? 'pending' : 'skipped',
      nextAttemptAt: new Date(),
    });
  }
}

/** Never throws: a failed notification or event row must not undo a claim change the user already made. */
export async function runClaimEffects(claim, events) {
  try {
    await notifyProgress(claim, events);
  } catch (err) {
    console.warn('[partner-warranty] progress notifications failed:', err.message);
  }
  try {
    await recordDomainEvents(claim, events);
  } catch (err) {
    console.warn('[partner-warranty] domain events failed:', err.message);
  }
}
