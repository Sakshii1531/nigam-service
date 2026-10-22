import { Brand } from '../super-admin/brand.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { AMCSubscription } from './amcSubscription.model.js';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { computeWarrantyStatus } from '../shared/warrantyEngine.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { brandWarrantyMonths } from '../shared/brandWarranty.js';

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
  newAppliance = false,
}) {
  let appliance = null;
  let brandDoc = brandName
    ? await Brand.findOne({ name: String(brandName).trim() }).collation({ locale: 'en', strength: 2 })
    : null;

  // 1. Resolve OwnedAppliance
  if (newAppliance && applianceId) throw new ApiError(400, 'Choose a saved appliance or a new appliance, not both');
  if (applianceId) {
    appliance = await OwnedAppliance.findOne({ _id: applianceId, user: userId, deletedAt: null });
    if (!appliance) throw new ApiError(404, 'Appliance not found');
    if (category && appliance.category !== category) throw new ApiError(400, 'Appliance category does not match this service');
    if (brandName && appliance.brand?.toLowerCase() !== brandName.trim().toLowerCase()) throw new ApiError(400, 'Appliance brand does not match this service');
  } else if (!newAppliance && serialNo) {
    appliance = await OwnedAppliance.findOne({ user: userId, serialNumber: serialNo, deletedAt: null });
  } else if (!newAppliance && brandName && category) {
    const candidates = await OwnedAppliance.find({
      user: userId,
      deletedAt: null,
      category,
      brand: { $regex: `^${String(brandName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).limit(2);
    appliance = candidates.length === 1 ? candidates[0] : null;
  }

  if (appliance && category && appliance.category !== category) throw new ApiError(400, 'Appliance category does not match this service');

  if (!brandDoc && appliance?.brandRef) brandDoc = await Brand.findById(appliance.brandRef);

  // Use values from the appliance if it exists
  const resolvedBrand = brandName || appliance?.brand;
  const resolvedPurchaseDate = purchaseDate || appliance?.purchaseDate;

  // A catalogue manufacturer need not be a partner Brand. Match unlinked
  // purchases by their saved brand/category, while appliance-bound purchases
  // only cover that unit. Never grant coverage from an unpaid checkout.
  const matchesAppliance = (purchase, purchaseCategory, model) => {
    if (!category || (purchaseCategory && purchaseCategory !== category)) return false;
    if (purchase.appliance) return !!appliance && String(purchase.appliance) === String(appliance._id);
    if (!resolvedBrand || purchase.brand?.trim().toLowerCase() !== resolvedBrand.trim().toLowerCase()) return false;
    const ownedModel = appliance?.modelNumber || appliance?.model;
    return !ownedModel || !model || ownedModel.trim().toLowerCase() === model.trim().toLowerCase();
  };
  const now = new Date();
  const [amcCandidates, ewCandidates] = await Promise.all([
    AMCSubscription.find({
      user: userId, paid: true, status: { $in: ['Active', 'Expiring Soon'] },
      visitsRemaining: { $gt: 0 }, expiryDate: { $gt: now },
    }).populate('plan').sort({ createdAt: -1 }),
    ExtendedWarrantyOrder.find({
      user: userId, paid: true, status: 'Active', verificationStatus: { $ne: 'Rejected' },
      claimsRemaining: { $gt: 0 }, validTill: { $gt: now },
    }).sort({ createdAt: -1 }),
  ]);
  const amcSubscription = amcCandidates.find((sub) => sub.plan && matchesAppliance(
    sub, sub.applianceCategory || sub.plan.applianceCategory, sub.model,
  )) || null;
  const extendedWarrantyOrder = ewCandidates.find((order) => matchesAppliance(
    order, order.applianceCategory, order.modelNumber,
  )) || null;

  // 4. Compute status
  // The brand's own warranty length — not a flat 12 months for every brand.
  const warrantyStatus = computeWarrantyStatus({
    purchaseDate: resolvedPurchaseDate,
    brandWarrantyMonths: await brandWarrantyMonths(resolvedBrand),
    amcActive: !!amcSubscription,
    extendedWarrantyActive: !!extendedWarrantyOrder,
    extendedWarrantyValidTill: extendedWarrantyOrder?.validTill,
  });

  // 5. Map to service provider job type
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
    extendedWarrantyValidTill: extendedWarrantyOrder?.validTill || null,
    amcExpiryDate: amcSubscription?.expiryDate || null,
  };
}
