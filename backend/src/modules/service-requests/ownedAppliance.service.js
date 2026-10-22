import { Job } from '../service-provider/job.model.js';
import { randomUUID } from 'node:crypto';
import { ServiceRequest } from './serviceRequest.model.js';
import { deleteApplianceFiles } from './applianceDocuments.js';
import { OwnedAppliance } from './ownedAppliance.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { addMonths } from '../shared/warrantyEngine.js';
import { brandWarrantyMonths } from '../shared/brandWarranty.js';
import { detectWarrantyForAppliance } from '../warranty-amc-exchange/warrantyDetector.service.js';
import { Brand } from '../super-admin/brand.model.js';
import { applianceIdentity } from '../shared/applianceIdentity.js';

async function resolveBrand(data) {
  if (data.brand === undefined) return data;
  const brand = await Brand.findOne({ name: String(data.brand).trim() })
    .collation({ locale: 'en', strength: 2 })
    .select('_id')
    .lean();
  return { ...data, brandRef: brand?._id || null };
}

/**
 * Recomputes an appliance's warrantyStatus from the overlays that actually exist
 * for this customer, rather than trusting the cached field. The ExtendWarranty
 * screen used to synthesise a purchase date "6 months ago" and show the customer
 * a fabricated expiry — the only honest source is the registered purchase date
 * plus the customer's real AMC/EW documents.
 */
export async function withWarranty(appliance) {
  const [detection, warrantyMonths] = await Promise.all([
    detectWarrantyForAppliance({ userId: appliance.user, category: appliance.category, applianceId: appliance._id }),
    brandWarrantyMonths(appliance.brand),
  ]);
  const status = detection.warrantyStatus;
  const ewExpiry = detection.extendedWarrantyValidTill;

  if (status !== appliance.warrantyStatus) {
    appliance.warrantyStatus = status;
    await appliance.save();
  }

  // The date cover actually runs out: the extended-warranty overlay if one is
  // active, otherwise the brand warranty measured from the registered purchase
  // date. Null when no purchase date was ever recorded — the screens must show
  // "not recorded" rather than invent one.
  const brandExpiry = appliance.purchaseDate
    ? addMonths(appliance.purchaseDate, warrantyMonths)
    : null;
  const warrantyExpiresOn = status === 'AMC'
    ? detection.amcExpiryDate
    : ewExpiry && (!brandExpiry || new Date(ewExpiry) > brandExpiry) ? ewExpiry : brandExpiry;

  return {
    ...appliance.toJSON(),
    warrantyStatus: status,
    warrantyExpiresOn,
    extendedWarrantyValidTill: ewExpiry,
  };
}

export async function listAppliances(userId, { category } = {}) {
  const query = { user: userId, deletedAt: null };
  if (category) query.category = category;
  const items = await OwnedAppliance.find(query).sort({ createdAt: -1 });
  return Promise.all(items.map(withWarranty));
}

export async function getAppliance(userId, id) {
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance || appliance.deletedAt) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to view this appliance');
  return withWarranty(appliance);
}

/**
 * Finds one of THIS customer's appliances by the identifiers printed on the
 * unit. Returns null rather than 404ing so the caller can offer registration —
 * a serial the platform has never seen is a normal first-time case, not an error.
 */
export async function findByIdentifiers(userId, { modelNumber, serialNumber }) {
  const query = { user: userId, deletedAt: null };
  if (serialNumber) query.serialNumber = serialNumber;
  if (modelNumber) query.modelNumber = modelNumber;
  const appliance = await OwnedAppliance.findOne(query);
  return appliance ? withWarranty(appliance) : null;
}

export async function registerAppliance(userId, data) {
  const separate = data.createSeparateUnit;
  const { createSeparateUnit: _separate, ...fields } = data;
  data = await resolveBrand(fields);
  if (separate && !data.serialNumber) data.registryKey = randomUUID();
  // Use the same identity as ticket intake, including the no-serial fallback.
  const identity = data.brandRef
    ? { user: userId, brandRef: data.brandRef, identityKey: applianceIdentity(data) }
    : data.serialNumber ? { user: userId, serialNumber: data.serialNumber } : null;
  if (identity) {
    const existing = await OwnedAppliance.findOne(identity);
    if (existing) {
      if (separate && !existing.deletedAt) throw new ApiError(409, 'This appliance is already saved. Edit the existing appliance instead.');
      Object.assign(existing, data, { deletedAt: null });
      await existing.save();
      return withWarranty(existing);
    }
  }
  let appliance;
  try { appliance = await OwnedAppliance.create({ ...data, user: userId }); } catch (err) {
    if (err.code !== 11000 || !data.brandRef) throw err;
    // Another registration or ticket may have inserted this identity first.
    appliance = await OwnedAppliance.findOne(identity);
    if (!appliance) throw err;
    if (separate && !appliance.deletedAt) throw new ApiError(409, 'This appliance is already saved. Edit the existing appliance instead.');
    Object.assign(appliance, data, { deletedAt: null });
    await appliance.save();
  }
  return withWarranty(appliance);
}

export async function updateAppliance(userId, id, updates) {
  updates = await resolveBrand(updates);
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance || appliance.deletedAt) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to update this appliance');
  Object.assign(appliance, updates);
  await appliance.save();
  return withWarranty(appliance);
}

export async function deleteAppliance(userId, id) {
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to delete this appliance');
  if (!appliance.deletedAt) { appliance.deletedAt = new Date(); await appliance.save(); }
  await deleteApplianceFiles(appliance);
}

/** Atomic CRM identity, with fill-only purchase/invoice updates on repeat tickets. */
export async function upsertTicketAppliance(ticket, brand, { session = null } = {}) {
  const data = {
    user: ticket.customer, brandRef: brand._id, brand: brand.name, category: ticket.categoryKey,
    model: ticket.modelNumber?.trim(), modelNumber: ticket.modelNumber?.trim(), serialNumber: ticket.serialNumber?.trim(),
  };
  const identityKey = applianceIdentity(data);
  const filter = { user: data.user, brandRef: data.brandRef, identityKey };
  const insert = { ...data, identityKey };
  if (ticket.purchaseDate) insert.purchaseDate = ticket.purchaseDate;
  const invoice = ticket.documents.find(d => d.kind === 'invoice');
  if (invoice) insert.invoiceFileUrl = invoice.url;
  let appliance;
  try {
    appliance = await OwnedAppliance.findOneAndUpdate(filter, { $setOnInsert: insert }, { upsert: true, new: true, runValidators: true, session });
  } catch (err) {
    // Standalone racing upserts may lose on the unique key. Transactions let
    // the driver retry the whole callback; never issue reads in an aborted one.
    if (err.code !== 11000 || session) throw err;
    appliance = await OwnedAppliance.findOne(filter);
  }
  if (ticket.purchaseDate) await OwnedAppliance.updateOne({ ...filter, purchaseDate: null }, { $set: { purchaseDate: ticket.purchaseDate } }, { session });
  if (invoice) await OwnedAppliance.updateOne({ ...filter, $or: [{ invoiceFileUrl: null }, { invoiceFileUrl: '' }] }, { $set: { invoiceFileUrl: invoice.url } }, { session });
  return appliance;
}

/** Only explicit appliance links; a shared brand/model is never proof of service history. */
export async function applianceHistory(userId, id, { before, beforeId } = {}) {
  await getAppliance(userId, id);
  const query = { user: userId, appliance: id };
  if (before && beforeId) query.$or = [{ createdAt: { $lt: before } }, { createdAt: before, _id: { $lt: beforeId } }];
  const requests = await ServiceRequest.find(query)
    .select('humanId category description status createdAt updatedAt booking warrantyClaim')
    .populate({ path: 'booking', select: 'humanId serviceTitle status totalPrice scheduledDate completedAt commercial.offeringName' })
    .populate({ path: 'warrantyClaim', select: 'humanId productName issueName status' })
    .sort({ createdAt: -1, _id: -1 }).limit(100).lean();
  const jobs = await Job.find({ serviceRequest: { $in: requests.map(r => r._id) }, activeStep: 'completed' }).select('serviceRequest billingEstimate.total').lean();
  const finalTotals = new Map(jobs.filter(j => Number.isFinite(j.billingEstimate?.total)).map(j => [String(j.serviceRequest), j.billingEstimate.total]));
  return requests.map(r => ({ id: String(r._id), number: r.booking?.humanId || r.humanId,
    title: r.booking?.serviceTitle || r.booking?.commercial?.offeringName || r.description || r.category,
    status: r.booking?.status || r.status, date: r.createdAt,
    total: finalTotals.get(String(r._id)) ?? r.booking?.totalPrice ?? null,
    amountType: finalTotals.has(String(r._id)) ? 'final' : 'booked',
    bookingId: r.booking?._id ? String(r.booking._id) : null,
    claimId: r.warrantyClaim?._id ? String(r.warrantyClaim._id) : null,
  }));
}
