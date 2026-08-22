import mongoose from 'mongoose';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Technician } from '../technician/technician.model.js';
import { User } from '../auth/user.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { Claim } from '../warranty-amc-exchange/claim.model.js';
import { Review } from '../reviews/review.model.js';
import { Invoice } from './invoice.model.js';
import { PartOrder } from '../technician/partOrder.model.js';
import { TechInventoryItem } from '../technician/techInventoryItem.model.js';
import { Job } from '../technician/job.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { Payout } from '../technician/payout.model.js';
import { Escalation } from '../super-admin/escalation.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { computeWarrantyStatus, DEFAULT_BRAND_WARRANTY_MONTHS, addMonths } from '../shared/warrantyEngine.js';

// Read-only views of "this brand's world".
//
// Two different linkage strengths are at play, and it matters which:
//
//  - Customers, technicians and completions are derived through
//    ServiceRequest.brand, which is a real ObjectId ref — reliable.
//  - Warranty registrations, AMC subscriptions and claims carry `brand` as a
//    free-text String (the label captured at purchase), so those are matched by
//    brand NAME. Renaming a brand orphans its history until those become refs.

const TERMINAL_STATUSES = ['Closed', 'Cancelled'];

/** Anchored + case-insensitive so "LG" doesn't also match "LG Electronics Spares". */
function nameMatcher(brandName) {
  return new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

/**
 * brandId arrives as a string (it comes off the JWT). find() casts strings to
 * ObjectId automatically, but an aggregation $match does not — a raw string
 * silently matches nothing against an ObjectId field.
 */
function asObjectId(brandId) {
  return new mongoose.Types.ObjectId(String(brandId));
}

async function brandNameOrThrow(brandId) {
  const brand = await Brand.findById(brandId).select('name').lean();
  if (!brand) throw new ApiError(404, 'Brand not found');
  return brand.name;
}

/**
 * Everyone who has raised a service request with this brand, with the per-customer
 * counts the console lists them by.
 *
 * Aggregated in one pass rather than fetching requests and grouping in JS — a
 * brand with a long history would otherwise pull its entire request table.
 */
export async function listBrandCustomers(brandId, { search, page, limit } = {}) {
  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });

  const rows = await ServiceRequest.aggregate([
    { $match: { brand: asObjectId(brandId) } },
    {
      $group: {
        _id: '$user',
        complaints: { $sum: 1 },
        openComplaints: { $sum: { $cond: [{ $in: ['$status', TERMINAL_STATUSES] }, 0, 1] } },
        categories: { $addToSet: '$category' },
        // A customer counts as under warranty if any of their requests with this
        // brand is — warranty is recorded per request, not per person.
        warranties: { $addToSet: '$warranty' },
        lastRequestAt: { $max: '$createdAt' },
      },
    },
    { $sort: { lastRequestAt: -1 } },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
    .select('name email phone status')
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  let items = rows.map((r) => {
    const user = byId.get(String(r._id));
    return {
      id: String(r._id),
      name: user?.name || 'Customer',
      email: user?.email || '',
      phone: user?.phone || '',
      status: user?.status || 'Active',
      complaints: r.complaints,
      openComplaints: r.openComplaints,
      // Distinct appliance categories this customer has raised requests for.
      categories: r.categories.filter(Boolean),
      productCount: r.categories.filter(Boolean).length,
      warrantyStatus: r.warranties.includes('In Warranty') ? 'Under Warranty' : 'Out of Warranty',
      lastRequestAt: r.lastRequestAt,
    };
  });

  if (search) {
    const rx = nameMatcherLoose(search);
    items = items.filter((i) => rx.test(i.name) || rx.test(i.email) || rx.test(i.phone));
  }

  const total = items.length;
  return { items: items.slice(skip, skip + lim), meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Unanchored variant for free-text search boxes. */
function nameMatcherLoose(term) {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/**
 * Technicians who have actually worked this brand's requests, with their
 * workload on this brand specifically — not their platform-wide totals, which
 * would be misleading on a brand console.
 */
export async function listBrandTechnicians(brandId, { page, limit } = {}) {
  const { skip, limit: lim, page: pg } = parsePagination({ page, limit });

  const rows = await ServiceRequest.aggregate([
    { $match: { brand: asObjectId(brandId), technician: { $ne: null } } },
    {
      $group: {
        _id: '$technician',
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $in: ['$status', TERMINAL_STATUSES] }, 0, 1] } },
        completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
      },
    },
    { $sort: { totalJobs: -1 } },
  ]);

  const technicians = await Technician.find({ _id: { $in: rows.map((r) => r._id) } })
    .populate('city', 'name')
    .select('name phone specs rating status availability city')
    .lean();
  const byId = new Map(technicians.map((t) => [String(t._id), t]));

  const items = rows.map((r) => {
    const t = byId.get(String(r._id));
    return {
      id: String(r._id),
      name: t?.name || 'Technician',
      phone: t?.phone || '',
      skill: t?.specs?.length ? t.specs.join(', ') : 'General Repair',
      city: t?.city?.name || '—',
      rating: t?.rating ?? 0,
      status: t?.status || 'Active',
      availability: t?.availability || 'Offline',
      // Scoped to this brand, not the technician's platform-wide counters.
      activeJobs: r.activeJobs,
      completedJobs: r.completedJobs,
      totalJobs: r.totalJobs,
    };
  });

  return { items: items.slice(skip, skip + lim), meta: paginationMeta({ page: pg, limit: lim, total: items.length }) };
}

/** Requests that reached a finished state — the QC/completion review queue. */
export async function listBrandCompletions(brandId, { page, limit, sort } = {}) {
  const query = { brand: brandId, status: { $in: ['Repair Completed', 'Customer Confirmation', 'Closed'] } };
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });

  const [requests, total] = await Promise.all([
    ServiceRequest.find(query)
      .populate('user', 'name phone')
      .populate('technician', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim)
      .lean(),
    ServiceRequest.countDocuments(query),
  ]);

  // Whether the customer has rated the job yet — one batched lookup rather than
  // a query per row.
  const reviews = await Review.find({ serviceRequest: { $in: requests.map((r) => r._id) } })
    .select('serviceRequest rating')
    .lean();
  const reviewBySr = new Map(reviews.map((rv) => [String(rv.serviceRequest), rv]));

  const items = requests.map((r) => {
    const review = reviewBySr.get(String(r._id));
    return {
      ...r,
      id: String(r._id),
      rating: review?.rating ?? null,
      feedbackStatus: review ? 'Received' : 'Pending',
    };
  });

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function listBrandWarrantyRegistrations(brandId, { verificationStatus, page, limit, sort } = {}) {
  const query = { brand: nameMatcher(await brandNameOrThrow(brandId)) };
  if (verificationStatus) query.verificationStatus = verificationStatus;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ExtendedWarrantyOrder.find(query).populate('user', 'name email phone').sort(sortObj).skip(skip).limit(lim),
    ExtendedWarrantyOrder.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function listBrandAmcSubscriptions(brandId, { status, page, limit, sort } = {}) {
  const query = { brand: nameMatcher(await brandNameOrThrow(brandId)) };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    AMCSubscription.find(query)
      .populate('user', 'name email phone')
      .populate('plan', 'name tier price visitsTotal')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    AMCSubscription.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function listBrandClaims(brandId, { status, page, limit, sort } = {}) {
  const query = { brand: nameMatcher(await brandNameOrThrow(brandId)) };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // raisedBy is polymorphic (refPath) — a technician-raised claim points at a
    // Technician doc, a customer-raised one at a User. populate follows either.
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

// ── Dashboard / reports ───────────────────────────────────────────────────────

/** Headline figures for the brand console's landing screen. */
export async function getBrandDashboard(brandId) {
  const brandObjectId = asObjectId(brandId);

  // Seven whole UTC days ending today, so the trend does not shift by a day
  // depending on the server's local timezone.
  const trendStart = new Date();
  trendStart.setUTCHours(0, 0, 0, 0);
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);

  const [statusRows, invoiceRows, focRows, escalations, trendRows, productRows] = await Promise.all([
    ServiceRequest.aggregate([
      { $match: { brand: brandObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Only settled invoices count as billed value — pending and failed money
    // has not moved.
    Invoice.aggregate([
      { $match: { brand: brandObjectId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Claim.aggregate([
      { $match: { brand: nameMatcher(await brandNameOrThrow(brandId)), status: 'Approved' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    Escalation.countDocuments({ brand: brandObjectId, status: { $ne: 'Resolved' } }),
    // Requests per day over the last week. The console drew a fixed seven-point
    // line (1456, 1523, … labelled 15–21 May) that never moved.
    ServiceRequest.aggregate([
      { $match: { brand: brandObjectId, createdAt: { $gte: trendStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Requests by appliance category — also a hardcoded five-row table before.
    ServiceRequest.aggregate([
      { $match: { brand: brandObjectId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // Densify so a day with no requests shows as zero rather than being skipped.
  const trendByDay = Object.fromEntries(trendRows.map((r) => [r._id, r.count]));
  const trend = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(trendStart);
    day.setUTCDate(trendStart.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: trendByDay[key] || 0 };
  });

  const productTotal = productRows.reduce((sum, r) => sum + r.count, 0);
  const byProduct = productRows.map((r) => ({
    name: r._id || 'Uncategorised',
    value: r.count,
    pct: productTotal ? Number(((r.count / productTotal) * 100).toFixed(1)) : 0,
  }));

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.count]));
  const total = statusRows.reduce((sum, r) => sum + r.count, 0);
  const named = ['New', 'Assigned', 'Closed', 'Cancelled', 'Customer NA', 'Reschedule'];

  return {
    totalComplaints: total,
    completed: byStatus.Closed || 0,
    inProgress: Object.entries(byStatus)
      .filter(([s]) => !named.includes(s))
      .reduce((sum, [, c]) => sum + c, 0) + (byStatus.Assigned || 0),
    open: byStatus.New || 0,
    cancelled: byStatus.Cancelled || 0,
    customerNotAvailable: byStatus['Customer NA'] || 0,
    reschedule: byStatus.Reschedule || 0,
    escalations,
    totalInvoiceValue: invoiceRows[0]?.total || 0,
    focPartsApproved: focRows[0]?.count || 0,
    focPartsValue: focRows[0]?.amount || 0,
    statusBreakdown: statusRows.map((r) => ({ label: r._id, count: r.count })),
    trend,
    byProduct,
  };
}

/** Same data split by appliance and by technician, for the reports screen. */
export async function getBrandReports(brandId, { from, to } = {}) {
  const brandObjectId = asObjectId(brandId);
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  const match = { brand: brandObjectId, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) };

  // Six whole months ending this one, in UTC so the buckets don't shift with
  // the server's timezone.
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));

  const [byCategory, techRows, sentimentRows, monthlyRows] = await Promise.all([
    ServiceRequest.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ServiceRequest.aggregate([
      { $match: { ...match, technician: { $ne: null } } },
      {
        $group: {
          _id: '$technician',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),
    // Customer sentiment, bucketed from the 1-5 star reviews left on this
    // brand's requests: 4-5 satisfied, 3 neutral, 1-2 unhappy.
    Review.aggregate([
      { $lookup: { from: 'servicerequests', localField: 'serviceRequest', foreignField: '_id', as: 'sr' } },
      { $match: { 'sr.brand': brandObjectId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
        neutral: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        unhappy: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } },
      } },
    ]),
    // Requests per month over the last six. The console drew a fixed six-bar
    // chart (heights 40, 65, 35, 80, 55, 90 for Jan–Jun) with a "+15% vs last
    // month" caption, none of it derived from anything.
    ServiceRequest.aggregate([
      { $match: { brand: brandObjectId, createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const monthlyByKey = Object.fromEntries(monthlyRows.map((r) => [r._id, r.count]));
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      month: key,
      label: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }),
      count: monthlyByKey[key] || 0,
    };
  });

  // Change against the previous month, or null when there is no prior month to
  // compare with — the caption used to always read "+15%".
  const [prev, current] = [monthly[monthly.length - 2], monthly[monthly.length - 1]];
  const monthlyChangePercent = prev && prev.count > 0
    ? Number((((current.count - prev.count) / prev.count) * 100).toFixed(1))
    : null;

  const technicians = await Technician.find({ _id: { $in: techRows.map((r) => r._id) } })
    .select('name rating')
    .lean();
  const byId = new Map(technicians.map((t) => [String(t._id), t]));

  const sentiment = sentimentRows[0];
  const reviewTotal = sentiment?.total || 0;
  // Null percentages when there are no reviews — a 0% "satisfied" would read as
  // every customer being unhappy rather than as an absence of feedback.
  const share = (n) => (reviewTotal ? Math.round((n / reviewTotal) * 100) : null);

  return {
    requestsByCategory: byCategory.map((r) => ({ label: r._id || 'Uncategorised', count: r.count })),
    monthly,
    monthlyChangePercent,
    sentiment: {
      reviewCount: reviewTotal,
      satisfiedPercent: share(sentiment?.satisfied || 0),
      neutralPercent: share(sentiment?.neutral || 0),
      unhappyPercent: share(sentiment?.unhappy || 0),
    },
    topTechnicians: techRows.map((r) => {
      const t = byId.get(String(r._id));
      return {
        name: t?.name || 'Technician',
        rating: t?.rating ?? 0,
        total: r.total,
        completed: r.completed,
        // Share of this technician's brand jobs that reached Closed.
        completionRate: r.total ? Math.round((r.completed / r.total) * 100) : 0,
      };
    }),
  };
}

// ── Parts ─────────────────────────────────────────────────────────────────────

/**
 * Part orders raised against this brand's jobs.
 *
 * PartOrder carries no brand of its own, but it does reference the Job it was
 * raised for, and a Job references the ServiceRequest — which is where brand
 * ownership actually lives. So this walks PartOrder -> Job -> ServiceRequest
 * rather than guessing from the part name. Orders with no job attached (a
 * technician restocking generally) belong to no brand and are excluded.
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

  const query = { job: { $in: jobs.map((j) => j._id) } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    PartOrder.find(query)
      .populate('technician', 'name phone')
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

  const partOrder = await PartOrder.findById(partOrderId).populate({
    path: 'job',
    populate: { path: 'serviceRequest' },
  });
  if (!partOrder) throw new ApiError(404, 'Part request not found');

  if (partOrder.job && partOrder.job.serviceRequest) {
    if (String(partOrder.job.serviceRequest.brand) !== String(brandId)) {
      throw new ApiError(403, 'Forbidden — part request does not belong to your brand');
    }
  }

  partOrder.status = status;
  await partOrder.save();

  if (partOrder.job && (status === 'Approved' || status === 'Dispatched')) {
    const job = await Job.findById(partOrder.job._id || partOrder.job);
    if (job) {
      job.activeStep = 'revisit_scheduled';
      const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000);
      job.revisit = {
        scheduledDate: parsedDate,
        expectedDate: parsedDate,
        timeSlot: timeSlot || '10:00 AM - 01:00 PM',
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
          sr.status = 'Spare Received';
          sr.timeline.push({
            stepLabel: 'Spare Received',
            done: true,
            timestamp: new Date(),
            description: `Spare part ${status.toLowerCase()} by brand — revisit scheduled`,
          });
          await sr.save();
        }
      }
    }
  }

  return partOrder;
}

/**
 * Spare-part stock held by the technicians who serve this brand.
 *
 * Inventory belongs to a technician's own van stock, not to a brand — a brand
 * does not own parts. The useful brand-side question is "what can the people
 * working my jobs actually fit today", which is what this answers. Rows are
 * grouped by SKU so the console sees total availability rather than one line
 * per technician.
 */
export async function listBrandInventory(brandId, { page, limit } = {}) {
  const technicianIds = await ServiceRequest.distinct('technician', {
    brand: asObjectId(brandId),
    technician: { $ne: null },
  });
  if (technicianIds.length === 0) {
    return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };
  }

  const rows = await TechInventoryItem.aggregate([
    { $match: { technician: { $in: technicianIds } } },
    {
      $group: {
        _id: { sku: '$sku', name: '$name' },
        totalQty: { $sum: '$qty' },
        technicians: { $sum: 1 },
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
    // How many of the brand's technicians carry this part at all.
    technicians: r.technicians,
    price: r.price || 0,
    // Same thresholds the technician-side model uses for a single holding.
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

/** What technicians earned on this brand's jobs. */
export async function listBrandTechnicianPayouts(brandId, { status, page, limit, sort } = {}) {
  const jobIds = await brandJobIds(brandId);
  if (jobIds.length === 0) return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };

  const query = { job: { $in: jobIds } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Payout.find(query)
      .populate('technician', 'name phone')
      .populate({ path: 'job', select: 'serviceRequest', populate: { path: 'serviceRequest', select: 'humanId' } })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Payout.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Invoices this brand has raised that are not yet settled. */
export async function listBrandPendingDues(brandId, { page, limit, sort } = {}) {
  const query = { brand: asObjectId(brandId), status: { $ne: 'Paid' } };
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Invoice.find(query)
      .populate('customer', 'name phone')
      .populate('serviceRequest', 'humanId')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Invoice.countDocuments(query),
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
  const brand = await Brand.findById(brandId).select('name warrantyMonths');
  if (!brand) throw new ApiError(404, 'Brand not found');

  const trimmed = String(query).trim();
  const byName = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  // Either a serial number on the appliance, or a customer's phone.
  let appliance = await OwnedAppliance.findOne({
    brand: new RegExp(`^${brand.name}$`, 'i'),
    serialNumber: byName,
  }).populate('user', 'name phone email');

  if (!appliance) {
    const user = await User.findOne({ phone: trimmed }).select('_id');
    if (user) {
      appliance = await OwnedAppliance.findOne({
        user: user._id,
        brand: new RegExp(`^${brand.name}$`, 'i'),
      }).populate('user', 'name phone email');
    }
  }

  if (!appliance) return { found: false };

  const [amc, ew] = await Promise.all([
    AMCSubscription.findOne({ user: appliance.user._id, status: 'Active', expiryDate: { $gt: new Date() } }),
    ExtendedWarrantyOrder.findOne({ user: appliance.user._id, status: 'Active' }),
  ]);

  const warrantyMonths = brand.warrantyMonths || DEFAULT_BRAND_WARRANTY_MONTHS;
  const status = computeWarrantyStatus({
    purchaseDate: appliance.purchaseDate,
    brandWarrantyMonths: warrantyMonths,
    amcActive: Boolean(amc),
    extendedWarrantyActive: Boolean(ew),
  });

  return {
    found: true,
    status,
    covered: status !== 'Out of Warranty',
    appliance: {
      id: appliance.id,
      category: appliance.category,
      brand: appliance.brand,
      model: appliance.model,
      serialNumber: appliance.serialNumber,
      purchaseDate: appliance.purchaseDate,
      // Base brand warranty expiry; null when the purchase date was never recorded.
      expiryDate: appliance.purchaseDate ? addMonths(appliance.purchaseDate, warrantyMonths) : null,
    },
    customer: {
      // The id is needed to raise a service request against this customer from
      // the lookup result — without it the console can only display a name.
      id: appliance.user?.id || null,
      name: appliance.user?.name || null,
      phone: appliance.user?.phone || null,
    },
    amcActive: Boolean(amc),
    extendedWarrantyActive: Boolean(ew),
  };
}
