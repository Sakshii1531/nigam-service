import { Brand } from '../super-admin/brand.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { AMCSubscription } from './amcSubscription.model.js';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { computeWarrantyStatus } from '../shared/warrantyEngine.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { brandWarrantyMonths } from '../shared/brandWarranty.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';

// A covered request uses its plan allowance when the job is completed. Until
// then it is "in flight", and must still count against the allowance —
// otherwise a 2-claim plan could have three covered bookings open at once and
// all three would be done for free.
const IN_FLIGHT = { status: { $nin: ['Cancelled', 'Customer Confirmation', 'Closed'] } };
async function inFlightUse(field, ids) {
  if (!ids.length) return new Map();
  const rows = await ServiceRequest.aggregate([
    { $match: { [field]: { $in: ids }, ...IN_FLIGHT } },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

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
  protection,
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
  let [amcCandidates, ewCandidates] = await Promise.all([
    AMCSubscription.find({
      user: userId, paid: true, status: { $in: ['Active', 'Expiring Soon'] },
      visitsRemaining: { $gt: 0 }, expiryDate: { $gt: now },
    }).populate('plan').sort({ createdAt: -1 }),
    ExtendedWarrantyOrder.find({
      user: userId, paid: true, status: 'Active', verificationStatus: { $ne: 'Rejected' },
      claimsRemaining: { $gt: 0 }, validTill: { $gt: now },
      // An extended warranty only covers once the brand warranty has ended.
      $or: [{ validFrom: null }, { validFrom: { $lte: now } }],
    }).sort({ createdAt: -1 }),
  ]);
  // What the appliance *has* (shown in My Appliances) is decided before plans
  // whose allowance is taken by open bookings are dropped — those still exist,
  // they just cannot cover one more booking right now.
  const hasAmc = amcCandidates.some((sub) => sub.plan && matchesAppliance(sub, sub.applianceCategory || sub.plan.applianceCategory, sub.model));
  const hasEw = ewCandidates.some((order) => matchesAppliance(order, order.applianceCategory, order.modelNumber));
  // Drop plans whose remaining allowance is already taken by open bookings.
  const [amcBusy, ewBusy] = await Promise.all([
    inFlightUse('amcSubscription', amcCandidates.map((s) => s._id)),
    inFlightUse('extendedWarrantyOrder', ewCandidates.map((o) => o._id)),
  ]);
  amcCandidates = amcCandidates.filter((s) => s.visitsRemaining > (amcBusy.get(String(s._id)) || 0));
  ewCandidates = ewCandidates.filter((o) => o.claimsRemaining > (ewBusy.get(String(o._id)) || 0));
  let amcSubscription = amcCandidates.find((sub) => sub.plan && matchesAppliance(
    sub, sub.applianceCategory || sub.plan.applianceCategory, sub.model,
  )) || null;
  let extendedWarrantyOrder = ewCandidates.find((order) => matchesAppliance(
    order, order.applianceCategory, order.modelNumber,
  )) || null;

  if (protection) {
    const chosen = protection.kind === 'amc' ? amcCandidates.find(p => String(p._id) === protection.id) : ewCandidates.find(p => String(p._id) === protection.id);
    const owned = protection.kind === 'amc' ? await AMCSubscription.exists({ _id:protection.id, user:userId }) : await ExtendedWarrantyOrder.exists({ _id:protection.id, user:userId });
    if (!owned) throw new ApiError(404, 'Protection plan not found');
    if (!chosen || (protection.kind === 'amc' && !chosen.plan) || !matchesAppliance(chosen, chosen.applianceCategory || chosen.plan?.applianceCategory, chosen.model || chosen.modelNumber)) throw new ApiError(400, 'This plan is unavailable, exhausted or does not cover the selected appliance');
    amcSubscription = protection.kind === 'amc' ? chosen : null;
    extendedWarrantyOrder = protection.kind === 'extended-warranty' ? chosen : null;
  }

  // 4. Compute status
  // The brand's own warranty length — not a flat 12 months for every brand.
  const months = await brandWarrantyMonths(resolvedBrand);
  // warrantyStatus: what the appliance has (display). coverageStatus: what
  // this booking is actually covered by — the two differ when a plan's
  // allowance is taken by open bookings, or a brand warranty cannot be billed.
  const warrantyStatus = computeWarrantyStatus({
    purchaseDate: resolvedPurchaseDate, brandWarrantyMonths: months,
    amcActive: hasAmc, extendedWarrantyActive: hasEw,
  });
  let coverageStatus = computeWarrantyStatus({
    purchaseDate: resolvedPurchaseDate,
    brandWarrantyMonths: months,
    amcActive: !!amcSubscription,
    extendedWarrantyActive: !!extendedWarrantyOrder,
    extendedWarrantyValidTill: extendedWarrantyOrder?.validTill,
  });

  // A free brand-warranty visit is billed to the brand, so it needs (a) a
  // partner brand to bill and (b) proof of purchase. It used to be granted on
  // the purchase date alone — a date the customer types — so any appliance
  // could be booked for ₹0 and, for brands not onboarded, NCC absorbed it.
  // Anything else is a normal paid visit; partner brands' customers can also
  // raise a Partner Warranty claim, which the brand reviews.
  let brandWarrantyNote = null;
  if (coverageStatus === 'In Warranty') {
    const hasInvoice = Boolean(appliance?.documents?.some((d) => d.kind === 'invoice'));
    if (!brandDoc) brandWarrantyNote = `${resolvedBrand || 'This brand'} is not an NCC partner brand, so brand-warranty repairs are claimed from the manufacturer directly.`;
    else if (!hasInvoice) brandWarrantyNote = 'Add the purchase invoice to this appliance in My Appliances to get the brand-warranty visit free.';
    if (brandWarrantyNote) coverageStatus = 'Out of Warranty';
  }

  // 5. Map to service provider job type
  let jobType = 'NCC Paid Service';
  if (coverageStatus === 'Extended Warranty') jobType = 'NCC Extended Warranty';
  else if (coverageStatus === 'AMC') jobType = 'AMC Visit';
  else if (coverageStatus === 'In Warranty') jobType = 'Brand Warranty';

  return {
    warrantyStatus,
    coverageStatus,
    jobType,
    brandId: brandDoc?._id || null,
    applianceId: appliance?._id || null,
    amcSubscriptionId: coverageStatus === 'AMC' ? amcSubscription?._id || null : null,
    extendedWarrantyOrderId: coverageStatus === 'Extended Warranty' ? extendedWarrantyOrder?._id || null : null,
    purchaseDate: resolvedPurchaseDate || null,
    extendedWarrantyValidTill: extendedWarrantyOrder?.validTill || null,
    amcExpiryDate: amcSubscription?.expiryDate || null,
    brandWarrantyNote,
    coverageSource: coverageStatus === 'AMC' ? { kind:'amc', id:String(amcSubscription._id), name:amcSubscription.planSnapshot?.name || amcSubscription.plan.name, number:amcSubscription.humanId }
      : coverageStatus === 'Extended Warranty' ? { kind:'extended-warranty', id:String(extendedWarrantyOrder._id), name:extendedWarrantyOrder.planName || 'Extended Warranty', number:extendedWarrantyOrder.humanId }
      : coverageStatus === 'In Warranty' ? { kind:'brand', name:`${resolvedBrand || 'Manufacturer'} warranty` } : null,
  };
}
