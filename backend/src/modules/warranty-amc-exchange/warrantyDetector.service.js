import { Brand } from '../super-admin/brand.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { AMCSubscription } from './amcSubscription.model.js';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { computeWarrantyStatus } from '../shared/warrantyEngine.js';

/**
 * Automatically detects the warranty/AMC/Extended-Warranty status for a booking/complaint.
 *
 * Checks:
 *   1. User's registered OwnedAppliance
 *   2. Active AMC subscriptions (visits remaining, not expired)
 *   3. Active Extended Warranty orders (claims remaining, not expired)
 *   4. System Brand configuration (to link Brand ObjectId & verify base warranty)
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.category
 * @param {string} [params.brandName]
 * @param {string} [params.serialNo]
 * @param {Date} [params.purchaseDate]
 * @param {string} [params.applianceId]
 * @returns {Promise<object>} Resolved warranty context
 */
export async function detectWarrantyForAppliance({
  userId,
  category,
  brandName,
  serialNo,
  purchaseDate,
  applianceId,
}) {
  let appliance = null;

  // 1. Resolve OwnedAppliance
  if (applianceId) {
    appliance = await OwnedAppliance.findById(applianceId);
  } else if (serialNo) {
    appliance = await OwnedAppliance.findOne({ user: userId, serialNumber: serialNo });
  } else if (brandName && category) {
    appliance = await OwnedAppliance.findOne({
      user: userId,
      category,
      brand: new RegExp(`^${brandName}$`, 'i'),
    });
  }

  // Use values from the appliance if it exists
  const resolvedBrand = brandName || appliance?.brand;
  const resolvedPurchaseDate = purchaseDate || appliance?.purchaseDate;

  // 2. Look up active AMC subscription
  let amcSubscription = null;
  const amcQuery = {
    user: userId,
    status: 'Active',
    visitsRemaining: { $gt: 0 },
    expiryDate: { $gt: new Date() },
  };
  if (appliance) {
    amcQuery.appliance = appliance._id;
    amcSubscription = await AMCSubscription.findOne(amcQuery).populate('plan');
  }
  if (!amcSubscription && resolvedBrand) {
    // Fall back to brand/category-matched subscription
    const brandAmcQuery = { ...amcQuery, brand: new RegExp(`^${resolvedBrand}$`, 'i') };
    amcSubscription = await AMCSubscription.findOne(brandAmcQuery).populate('plan');
  }

  // 3. Look up active Extended Warranty order
  let extendedWarrantyOrder = null;
  const ewQuery = {
    user: userId,
    status: 'Active',
    claimsRemaining: { $gt: 0 },
    validTill: { $gt: new Date() },
  };
  if (appliance) {
    ewQuery.appliance = appliance._id;
    extendedWarrantyOrder = await ExtendedWarrantyOrder.findOne(ewQuery);
  }
  if (!extendedWarrantyOrder && resolvedBrand) {
    // Fall back to brand-matched order
    const brandEwQuery = { ...ewQuery, brand: new RegExp(`^${resolvedBrand}$`, 'i') };
    extendedWarrantyOrder = await ExtendedWarrantyOrder.findOne(brandEwQuery);
  }

  // 4. Resolve Brand ObjectId
  let brandDoc = null;
  if (resolvedBrand) {
    brandDoc = await Brand.findOne({ name: new RegExp(`^${resolvedBrand}$`, 'i') });
  }

  // 5. Compute status
  const warrantyStatus = computeWarrantyStatus({
    purchaseDate: resolvedPurchaseDate,
    amcActive: !!amcSubscription,
    extendedWarrantyActive: !!extendedWarrantyOrder,
    extendedWarrantyValidTill: extendedWarrantyOrder?.validTill,
  });

  // 6. Map to technician job type
  let jobType = 'NCC Paid Service';
  if (warrantyStatus === 'Extended Warranty') jobType = 'NCC Extended Warranty';
  else if (warrantyStatus === 'AMC') jobType = 'AMC Visit';
  else if (warrantyStatus === 'In Warranty') jobType = 'Brand Warranty';

  return {
    warrantyStatus,
    jobType,
    brandId: brandDoc?._id || null,
    applianceId: appliance?._id || null,
    amcSubscriptionId: amcSubscription?._id || null,
    extendedWarrantyOrderId: extendedWarrantyOrder?._id || null,
    purchaseDate: resolvedPurchaseDate || null,
  };
}
