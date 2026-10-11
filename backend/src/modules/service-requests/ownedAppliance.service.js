import { OwnedAppliance } from './ownedAppliance.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { computeWarrantyStatus, addMonths } from '../shared/warrantyEngine.js';
import { brandWarrantyMonths } from '../shared/brandWarranty.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
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
  const [amc, ew, warrantyMonths] = await Promise.all([
    AMCSubscription.findOne({ user: appliance.user, status: 'Active' }),
    ExtendedWarrantyOrder.findOne({ user: appliance.user, status: 'Active' }).sort({ validTill: -1 }),
    brandWarrantyMonths(appliance.brand),
  ]);

  const status = computeWarrantyStatus({
    purchaseDate: appliance.purchaseDate,
    brandWarrantyMonths: warrantyMonths,
    amcActive: Boolean(amc),
    extendedWarrantyActive: Boolean(ew),
    extendedWarrantyValidTill: ew?.validTill || null,
  });

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
  const warrantyExpiresOn = ew?.validTill && (!brandExpiry || new Date(ew.validTill) > brandExpiry)
    ? ew.validTill
    : brandExpiry;

  return {
    ...appliance.toJSON(),
    warrantyStatus: status,
    warrantyExpiresOn,
    extendedWarrantyValidTill: ew?.validTill || null,
  };
}

export async function listAppliances(userId, { category } = {}) {
  const query = { user: userId };
  if (category) query.category = category;
  const items = await OwnedAppliance.find(query).sort({ createdAt: -1 });
  return Promise.all(items.map(withWarranty));
}

export async function getAppliance(userId, id) {
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to view this appliance');
  return withWarranty(appliance);
}

/**
 * Finds one of THIS customer's appliances by the identifiers printed on the
 * unit. Returns null rather than 404ing so the caller can offer registration —
 * a serial the platform has never seen is a normal first-time case, not an error.
 */
export async function findByIdentifiers(userId, { modelNumber, serialNumber }) {
  const query = { user: userId };
  if (serialNumber) query.serialNumber = serialNumber;
  if (modelNumber) query.modelNumber = modelNumber;
  const appliance = await OwnedAppliance.findOne(query);
  return appliance ? withWarranty(appliance) : null;
}

export async function registerAppliance(userId, data) {
  data = await resolveBrand(data);
  // Use the same identity as ticket intake, including the no-serial fallback.
  const identity = data.brandRef
    ? { user: userId, brandRef: data.brandRef, identityKey: applianceIdentity(data) }
    : data.serialNumber ? { user: userId, serialNumber: data.serialNumber } : null;
  if (identity) {
    const existing = await OwnedAppliance.findOne(identity);
    if (existing) {
      Object.assign(existing, data);
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
    Object.assign(appliance, data);
    await appliance.save();
  }
  return withWarranty(appliance);
}

export async function updateAppliance(userId, id, updates) {
  updates = await resolveBrand(updates);
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to update this appliance');
  Object.assign(appliance, updates);
  await appliance.save();
  return withWarranty(appliance);
}

export async function deleteAppliance(userId, id) {
  const appliance = await OwnedAppliance.findById(id);
  if (!appliance) throw new ApiError(404, 'Appliance not found');
  if (String(appliance.user) !== String(userId)) throw new ApiError(403, 'Not authorized to delete this appliance');
  await appliance.deleteOne();
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
