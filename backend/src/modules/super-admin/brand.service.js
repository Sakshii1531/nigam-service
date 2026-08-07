import { Brand } from './brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Review } from '../../modules/reviews/review.model.js';
import { Job } from '../technician/job.model.js';

export async function listBrands() {
  return Brand.find().sort({ name: 1 });
}

async function findOr404(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  return brand;
}

export async function getBrand(id) {
  return findOr404(id);
}

export async function createBrand(data, actingUserId) {
  const existing = await Brand.findOne({ name: data.name });
  if (existing) throw new ApiError(409, `Brand "${data.name}" already exists`);
  const brand = await Brand.create(data);
  await logAudit({ user: actingUserId, action: `Created brand "${brand.name}"`, type: 'System' });
  return brand;
}

const EDITABLE_FIELDS = ['name', 'category', 'status', 'slaResolutionTimeHours', 'slaAdherencePercent', 'csat', 'contractTerms'];

export async function updateBrand(id, updates, actingUserId) {
  const brand = await findOr404(id);
  const statusChanged = updates.status !== undefined && updates.status !== brand.status;
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) brand[field] = updates[field];
  }
  await brand.save();
  if (statusChanged) {
    await logAudit({ user: actingUserId, action: `Changed brand "${brand.name}" status to ${brand.status}`, type: 'System' });
  }
  return brand;
}

/**
 * Per-brand SLA panel for the console.
 *
 * Resolution time is measured from creation to the 'Closed' timeline entry, so
 * only closed requests count — an open request has no resolution time and
 * including it as "so far" would drag the average down misleadingly.
 *
 * Adherence is measured only over requests that actually carry an slaDueAt;
 * requests with no SLA set are excluded rather than silently counted as met.
 * Each figure is null when nothing backs it, so the UI can show "—" instead of
 * a zero that reads like a real measurement.
 */
export async function getBrandSla(brandId) {
  const brand = await Brand.findById(brandId).select('slaResolutionTimeHours slaAdherencePercent csat');
  if (!brand) throw new ApiError(404, 'Brand not found');

  const closed = await ServiceRequest.find({ brand: brandId, status: 'Closed' }).select('createdAt slaDueAt timeline');

  let resolvedCount = 0;
  let totalHours = 0;
  let slaTracked = 0;
  let slaMet = 0;

  for (const sr of closed) {
    const closedStep = sr.timeline?.filter((t) => t.stepLabel === 'Closed').pop();
    const closedAt = closedStep?.timestamp;
    if (!closedAt) continue;

    resolvedCount += 1;
    totalHours += (closedAt - sr.createdAt) / (1000 * 60 * 60);

    if (sr.slaDueAt) {
      slaTracked += 1;
      if (closedAt <= sr.slaDueAt) slaMet += 1;
    }
  }

  const ratingRows = await Review.aggregate([
    { $lookup: { from: 'servicerequests', localField: 'serviceRequest', foreignField: '_id', as: 'sr' } },
    { $match: { 'sr.brand': brandId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  return {
    avgResolutionHours: resolvedCount ? Number((totalHours / resolvedCount).toFixed(1)) : null,
    resolvedCount,
    slaAdherencePercent: slaTracked ? Number(((slaMet / slaTracked) * 100).toFixed(1)) : null,
    slaTracked,
    avgRating: ratingRows[0]?.count ? Number(ratingRows[0].avg.toFixed(1)) : null,
    reviewCount: ratingRows[0]?.count || 0,
    // What was contracted, for comparison against the measured values above.
    contracted: {
      resolutionTimeHours: brand.slaResolutionTimeHours ?? null,
      adherencePercent: brand.slaAdherencePercent ?? null,
      csat: brand.csat ?? null,
    },
  };
}

/**
 * What this brand's completed work actually billed, grouped by service
 * category. The console rendered a per-brand table hardcoded against ids
 * 'BRD-001'..'BRD-005' that no Brand document has, and exported that invented
 * table to CSV — an export is worse than nothing when the numbers are fiction.
 */
export async function getBrandServiceRevenue(id) {
  const brand = await findOr404(id);

  const rows = await Job.aggregate([
    { $match: { activeStep: 'completed' } },
    {
      $lookup: {
        from: 'servicerequests',
        localField: 'serviceRequest',
        foreignField: '_id',
        as: 'sr',
      },
    },
    { $unwind: '$sr' },
    { $match: { 'sr.brand': brand._id } },
    {
      $group: {
        _id: '$sr.category',
        count: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$billingEstimate.total', 0] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return rows.map((r) => ({
    category: r._id || 'Uncategorised',
    count: r.count,
    revenue: r.revenue,
    // Average per closed ticket, rather than a fixed per-service price the
    // platform does not hold.
    averageTicket: r.count ? Math.round(r.revenue / r.count) : 0,
  }));
}
