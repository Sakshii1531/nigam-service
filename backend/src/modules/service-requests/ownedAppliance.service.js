import { OwnedAppliance } from './ownedAppliance.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { computeWarrantyStatus, addMonths, DEFAULT_BRAND_WARRANTY_MONTHS } from '../shared/warrantyEngine.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';

/**
 * Recomputes an appliance's warrantyStatus from the overlays that actually exist
 * for this customer, rather than trusting the cached field. The ExtendWarranty
 * screen used to synthesise a purchase date "6 months ago" and show the customer
 * a fabricated expiry — the only honest source is the registered purchase date
 * plus the customer's real AMC/EW documents.
 */
async function withWarranty(appliance) {
  const [amc, ew] = await Promise.all([
    AMCSubscription.findOne({ user: appliance.user, status: 'Active' }),
    ExtendedWarrantyOrder.findOne({ user: appliance.user, status: 'Active' }).sort({ validTill: -1 }),
  ]);

  const status = computeWarrantyStatus({
    purchaseDate: appliance.purchaseDate,
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
    ? addMonths(appliance.purchaseDate, DEFAULT_BRAND_WARRANTY_MONTHS)
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
  // Serial numbers are unique per physical unit, so re-registering the same one
  // updates the existing record instead of creating a duplicate the customer
  // would then see twice in their appliance list.
  if (data.serialNumber) {
    const existing = await OwnedAppliance.findOne({ user: userId, serialNumber: data.serialNumber });
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return withWarranty(existing);
    }
  }
  const appliance = await OwnedAppliance.create({ ...data, user: userId });
  return withWarranty(appliance);
}

export async function updateAppliance(userId, id, updates) {
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
