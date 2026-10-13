import { syncJobStage } from '../partner-warranty/claimDispatch.js';
import { evaluateWarranty } from '../brand-crm/warrantyPolicy.service.js';
import { ProductSerial } from '../brand-crm/productSerial.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { Category } from '../catalog/category.model.js';
import { normalisePhone } from '../shared/phone.js';
import mongoose from 'mongoose';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { User } from '../auth/user.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../warranty-amc-exchange/amcVisit.model.js';
import { Claim } from '../warranty-amc-exchange/claim.model.js';
import { PartOrder } from '../service-provider/partOrder.model.js';
import { ServiceProviderInventoryItem } from '../service-provider/serviceProviderInventoryItem.model.js';
import { Job } from '../service-provider/job.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { Payout } from '../service-provider/payout.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';

// Read-only views of "this brand's world".
//
// Brand ownership is always joined with an ObjectId. Legacy display labels stay
// on consumer documents but are never used as a tenant boundary.

const TERMINAL_STATUSES = ['Closed', 'Cancelled'];

/**
 * brandId arrives as a string (it comes off the JWT). find() casts strings to
 * ObjectId automatically, but an aggregation $match does not — a raw string
 * silently matches nothing against an ObjectId field.
 */
function asObjectId(brandId) {
  return new mongoose.Types.ObjectId(String(brandId));
}

/**
 * ServiceProviders who have actually worked this brand's requests, with their
 * workload on this brand specifically — not their platform-wide totals, which
 * would be misleading on a brand console.
 */
export async function listBrandServiceProviders(brandId, { page, limit } = {}) {
  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });

  const rows = await ServiceRequest.aggregate([
    { $match: { brand: asObjectId(brandId), serviceProvider: { $ne: null } } },
    {
      $group: {
        _id: '$serviceProvider',
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $in: ['$status', TERMINAL_STATUSES] }, 0, 1] } },
        completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
      },
    },
    { $sort: { totalJobs: -1 } },
  ]);

  const serviceProviders = await ServiceProvider.find({ _id: { $in: rows.map((r) => r._id) } })
    .populate('city', 'name')
    .select('name phone specs rating status availability city')
    .lean();
  const byId = new Map(serviceProviders.map((t) => [String(t._id), t]));

  const items = rows.map((r) => {
    const t = byId.get(String(r._id));
    return {
      id: String(r._id),
      name: t?.name || 'Service Provider',
      phone: t?.phone || '',
      skill: t?.specs?.length ? t.specs.join(', ') : 'General Repair',
      city: t?.city?.name || '—',
      rating: t?.rating ?? 0,
      status: t?.status || 'Active',
      availability: t?.availability || 'Offline',
      // Scoped to this brand, not the service provider's platform-wide counters.
      activeJobs: r.activeJobs,
      completedJobs: r.completedJobs,
      totalJobs: r.totalJobs,
    };
  });

  return { items: items.slice(skip, skip + lim), meta: paginationMeta({ page: pg, limit: lim, total: items.length }) };
}

export { listBrandCompletions } from './brandCompletions.service.js';

export async function listBrandWarrantyRegistrations(brandId, { verificationStatus, page, limit, sort } = {}) {
  const query = { brandRef: brandId };
  if (verificationStatus) query.verificationStatus = verificationStatus;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ExtendedWarrantyOrder.find(query).populate('user', 'name email phone').sort(sortObj).skip(skip).limit(lim),
    ExtendedWarrantyOrder.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function listBrandAmcSubscriptions(brandId, { status, page, limit, sort } = {}) {
  const query = { brandRef: brandId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [subscriptions, total] = await Promise.all([
    AMCSubscription.find(query)
      .populate('user', 'name email phone')
      .populate('plan', 'name tier price visitsTotal')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    AMCSubscription.countDocuments(query),
  ]);
  const visits = await AMCVisit.find({ subscription: { $in: subscriptions.map((subscription) => subscription._id) } })
    .populate('serviceProvider', 'name')
    .sort({ visitNumber: 1 })
    .lean();
  const visitsBySubscription = new Map();
  for (const visit of visits) {
    const key = String(visit.subscription);
    visitsBySubscription.set(key, [...(visitsBySubscription.get(key) || []), visit]);
  }
  const items = subscriptions.map((subscription) => ({
    ...subscription.toJSON(),
    visits: visitsBySubscription.get(String(subscription._id)) || [],
  }));
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function listBrandClaims(brandId, { status, page, limit, sort } = {}) {
  const query = { brandRef: brandId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // raisedBy is polymorphic (refPath) — a service provider-raised claim points at a
    // Service Provider doc, a customer-raised one at a User. populate follows either.
    Claim.find(query)
      .populate('serviceRequest', 'humanId category')
      .populate('raisedBy', 'name phone')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Claim.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

// ── Parts ─────────────────────────────────────────────────────────────────────

/**
 * Part orders raised against this brand's jobs.
 *
 * PartOrder carries no brand of its own, but it does reference the Job it was
 * raised for, and a Job references the ServiceRequest — which is where brand
 * ownership actually lives. So this walks PartOrder -> Job -> ServiceRequest
 * rather than guessing from the part name. Orders with no job attached (a
 * service provider restocking generally) belong to no brand and are excluded.
 */
export async function listBrandPartOrders(brandId, { status, page, limit, sort } = {}) {
  const brandRequests = await ServiceRequest.find({ brand: asObjectId(brandId) }).select('_id').lean();
  if (brandRequests.length === 0) {
    return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };
  }

  const jobs = await Job.find({ serviceRequest: { $in: brandRequests.map((r) => r._id) } })
    .select('_id serviceRequest')
    .lean();
  if (jobs.length === 0) {
    return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };
  }

  const query = { brand: asObjectId(brandId), job: { $in: jobs.map((j) => j._id) } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query)
      .populate('serviceProvider', 'name phone')
      .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId category' } })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    PartOrder.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function updateBrandPartOrderStatus(brandId, partOrderId, payload) {
  const { status, scheduledDate, timeSlot, notes } = typeof payload === 'string' ? { status: payload } : payload;

  const partOrder = await PartOrder.findOne({ _id: partOrderId, brand: asObjectId(brandId) }).populate({
    path: 'job',
    populate: { path: 'serviceRequest' },
  });
  if (!partOrder) throw new ApiError(404, 'Part request not found');
  if (partOrder.job?.serviceRequest?.warrantyClaim) throw new ApiError(409, 'Use brand parts approval after upgrading legacy warranty parts');
  if (partOrder.warrantyClaim) throw new ApiError(409, 'Use brand parts approval; NCC handles fulfillment');

  if (partOrder.job && partOrder.job.serviceRequest) {
    if (String(partOrder.job.serviceRequest.brand) !== String(brandId)) {
      throw new ApiError(403, 'Forbidden — part request does not belong to your brand');
    }
  }

  // Same two ladders as the super-admin desk: an in-stock part is approved
  // then handed over directly, a procured one is approved, dispatched, then
  // delivered. See adminPartOrder.service.js for the fuller explanation.
  const STATUS_LADDERS = {
    in_stock: ['Pending', 'Approved', 'Ready to Hand Over', 'Handed Over'],
    procurement: ['Pending', 'Approved', 'Dispatched', 'Delivered'],
  };
  const ladder = STATUS_LADDERS[partOrder.fulfillmentType] || STATUS_LADDERS.procurement;
  if (status !== 'Rejected' && !ladder.includes(status)) {
    throw new ApiError(400, `'${status}' is not a valid status for a ${partOrder.fulfillmentType === 'in_stock' ? 'warehouse in-stock' : 'procurement'} part request.`);
  }

  partOrder.status = status;
  await partOrder.save();

  const revisitStatuses = partOrder.fulfillmentType === 'in_stock'
    ? ['Approved', 'Ready to Hand Over', 'Handed Over']
    : ['Approved', 'Dispatched', 'Delivered'];
  if (partOrder.job && revisitStatuses.includes(status)) {
    const job = await Job.findById(partOrder.job._id || partOrder.job);
    if (job) {
      job.activeStep = 'revisit_scheduled';
      const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000);
      // job.revisit.timeSlot is a plain String (see revisitSchema in job.model.js).
      const timeSlotStr = typeof timeSlot === 'object' && timeSlot !== null
        ? (timeSlot.time || '10:00 AM - 01:00 PM')
        : (timeSlot || '10:00 AM - 01:00 PM');
      job.revisit = {
        scheduledDate: parsedDate,
          partReceivedAt: ['Delivered','Handed Over'].includes(status) ? new Date() : job.revisit?.partReceivedAt,
        expectedDate: parsedDate,
        timeSlot: timeSlotStr,
        status: 'Scheduled',
        partOrderId: partOrder._id,
        notes: notes || 'Spare part approved/dispatched by brand',
      };
      await job.save();

      if (partOrder.job.serviceRequest) {
        const sr = await ServiceRequest.findById(partOrder.job.serviceRequest._id || partOrder.job.serviceRequest);
        if (sr) {
          // Record the move. Assigning the status alone left the request
          // jumping to 'Spare Received' with nothing in its timeline, so
          // neither the customer nor an admin could see why it changed.
          // submitSpareParts may already have walked the request through to
          // 'Spare Received'; re-stamping it just duplicates the timeline entry.
          const alreadyReceived = sr.status === 'Spare Received';
          sr.status = 'Spare Received';
          if (!alreadyReceived) sr.timeline.push({
            stepLabel: 'Spare Received',
            done: true,
            timestamp: new Date(),
            description: `Spare part ${status.toLowerCase()} by brand — revisit scheduled`,
          });
          await sr.save();
        if (sr.warrantyClaim) await syncJobStage(sr);
        }
      }
    }
  }

  return partOrder;
}

/**
 * Spare-part stock held by the service providers who serve this brand.
 *
 * Inventory belongs to a service provider's own van stock, not to a brand — a brand
 * does not own parts. The useful brand-side question is "what can the people
 * working my jobs actually fit today", which is what this answers. Rows are
 * grouped by SKU so the console sees total availability rather than one line
 * per service provider.
 */
export async function listBrandInventory(brandId, { page, limit } = {}) {
  const serviceProviderIds = await ServiceRequest.distinct('serviceProvider', {
    brand: asObjectId(brandId),
    serviceProvider: { $ne: null },
  });
  if (serviceProviderIds.length === 0) {
    return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };
  }

  const rows = await ServiceProviderInventoryItem.aggregate([
    { $match: { serviceProvider: { $in: serviceProviderIds } } },
    {
      $group: {
        _id: { sku: '$sku', name: '$name' },
        totalQty: { $sum: '$qty' },
        serviceProviders: { $sum: 1 },
        price: { $max: '$price' },
      },
    },
    { $sort: { totalQty: -1 } },
  ]);

  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });
  const items = rows.map((r) => ({
    sku: r._id.sku || '—',
    name: r._id.name,
    totalQty: r.totalQty,
    // How many of the brand's service providers carry this part at all.
    serviceProviders: r.serviceProviders,
    price: r.price || 0,
    // Same thresholds the service provider-side model uses for a single holding.
    status: r.totalQty <= 0 ? 'Out of Stock' : r.totalQty === 1 ? 'Low Stock' : 'In Stock',
  }));

  return { items: items.slice(skip, skip + lim), meta: paginationMeta({ page: pg, limit: lim, total: items.length }) };
}

// ── Payments ──────────────────────────────────────────────────────────────────

/** Job ids for this brand — the join every payment view below hangs off. */
async function brandJobIds(brandId) {
  const requests = await ServiceRequest.find({ brand: asObjectId(brandId) }).select('_id').lean();
  if (requests.length === 0) return [];
  const jobs = await Job.find({ serviceRequest: { $in: requests.map((r) => r._id) } })
    .select('_id')
    .lean();
  return jobs.map((j) => j._id);
}

/**
 * What customers actually paid on this brand's jobs.
 *
 * Payment is polymorphic (targetType/targetId), so this matches the 'job' rows
 * whose target is one of the brand's jobs. Payments against bookings, orders or
 * warranty purchases are not this brand's business and are excluded.
 */
export async function listBrandCustomerPayments(brandId, { status, page, limit, sort } = {}) {
  const jobIds = await brandJobIds(brandId);
  if (jobIds.length === 0) return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };

  const query = { targetType: 'job', targetId: { $in: jobIds } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Payment.find(query).populate('user', 'name phone email').sort(sortObj).skip(skip).limit(lim),
    Payment.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** What service providers earned on this brand's jobs. */
export async function listBrandServiceProviderPayouts(brandId, { status, page, limit, sort } = {}) {
  const jobIds = await brandJobIds(brandId);
  if (jobIds.length === 0) return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };

  const query = { job: { $in: jobIds } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Payout.find(query)
      .populate('serviceProvider', 'name phone')
      .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId' } })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Payout.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Warranty lookup for the brand console's counter staff: given a serial number
 * or a customer phone, resolve the appliance and say whether it is still
 * covered. Scoped to the calling brand — one brand must not be able to look up
 * another's registrations.
 *
 * Returns { found: false } rather than throwing, because "no record" is an
 * ordinary outcome at a service counter, not an error.
 */
export async function lookupBrandWarranty(brandId, { query }) {
  const brand=await Brand.findById(brandId).lean();if(!brand)throw new ApiError(404,'Brand not found');
  const trimmed=String(query).trim();const serial=trimmed.toUpperCase();const rx=new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i');
  let customerId=null;try {customerId=(await User.findOne({role:'customer',phone:normalisePhone(trimmed)}).select('_id').lean())?._id;}catch {/* A serial need not be a phone. */}
  const [appliance,ticket,registry]=await Promise.all([
    OwnedAppliance.findOne({brandRef:brandId,...(customerId?{user:customerId}:{serialNumber:rx})}).populate('user','name phone'),
    WarrantyClaim.findOne({brand:brandId,...(customerId?{customer:customerId}:{serialNumber:rx})}).sort({createdAt:-1}).populate('customer','name phone'),
    ProductSerial.findOne({brand:brandId,serialNumber:serial}).lean(),
  ]);
  if(!appliance&&!ticket&&!registry)return {found:false};
  const category=ticket?.category||registry?.category||(appliance?(await Category.findOne({key:appliance.category}).select('_id').lean())?._id:null);
  const model=ticket?.modelNumber||appliance?.modelNumber||appliance?.model||registry?.modelNumber;
  const serialNumber=ticket?.serialNumber||appliance?.serialNumber||registry?.serialNumber;
  const purchaseDate=ticket?.purchaseDate||appliance?.purchaseDate;
  const warranty=await evaluateWarranty({brand,category,productType:ticket?.productType,model,serial:serialNumber,purchaseDate,hasInvoice:Boolean(appliance?.invoiceFileUrl)||Boolean(ticket?.documents.some(d=>d.kind==='invoice')),issue:ticket?.issue,serviceType:ticket?.serviceType||'repair'});
  const customer=ticket?.customer||appliance?.user;
  return {found:true,...warranty,covered:warranty.status==='In Warranty',appliance:{id:appliance?.id||ticket?.id||String(registry._id),category:appliance?.category||ticket?.categoryKey,brand:brand.name,model,serialNumber,purchaseDate,expiryDate:warranty.expiresOn},customer:customer?{id:customer.id,name:customer.name,phone:customer.phone}:null};
}
