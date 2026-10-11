import { Brand } from './brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';
import { ensureBrandRoleTemplates } from '../brand-crm/roleTemplates.service.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Review } from '../../modules/reviews/review.model.js';
import { Job } from '../service-provider/job.model.js';
import { WarrantyPolicy } from '../brand-crm/warrantyPolicy.model.js';
import { BrandRate } from '../brand-crm/brandRate.model.js';
import { Role } from '../auth/role.model.js';
import { User } from '../auth/user.model.js';
import { PlatformSettings } from './platformSettings.model.js';
import { SUPER_ADMIN_TEMPLATE } from '../brand-crm/permissions.js';

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

/** Configuration required before a brand can safely receive production work. */
export async function getBrandReadiness(id) {
  const brand = await findOr404(id);
  const now = new Date();
  const coverageIds = (brand.coverage || []).map(String);
  const [activePolicies, activeRates, ownerRole, platformSettings] = await Promise.all([
    WarrantyPolicy.countDocuments({
      brand: brand._id,
      isActive: true,
      $and: [
        { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }] },
      ],
    }),
    BrandRate.find({
      brand: brand._id,
      isActive: true,
      category: { $in: brand.coverage || [] },
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
    }).select('category').lean(),
    Role.findOne({ brand: brand._id, scope: 'brand', template: SUPER_ADMIN_TEMPLATE }).select('_id').lean(),
    PlatformSettings.findOne().select('warrantySla').lean(),
  ]);
  const ownerCount = ownerRole
    ? await User.countDocuments({
      brand: brand._id,
      role: 'brand_admin',
      status: 'Active',
      assignedRoles: ownerRole._id,
    })
    : 0;
  const ratedCategories = new Set(activeRates.map((row) => String(row.category)));
  const missingRateCategories = coverageIds.filter((categoryId) => !ratedCategories.has(categoryId));
  const brandSla = brand.warrantySla?.toObject?.() || brand.warrantySla || {};
  const platformSla = platformSettings?.warrantySla || new PlatformSettings().warrantySla;
  const slaKeys = ['responseHours', 'approvalHours', 'assignmentHours', 'visitHours', 'resolutionHours'];
  const hasSla = slaKeys.every((key) => brandSla[key] != null || platformSla[key] != null);
  const slaSource = slaKeys.every((key) => brandSla[key] != null) ? 'brand' : 'brand + platform defaults';

  const checks = [
    { key: 'ticketPrefix', label: 'Ticket prefix', complete: Boolean(brand.ticketPrefix), detail: brand.ticketPrefix || 'Missing' },
    { key: 'coverage', label: 'Product coverage', complete: coverageIds.length > 0, detail: coverageIds.length ? `${coverageIds.length} categories` : 'No categories selected' },
    { key: 'warrantyPolicy', label: 'Active warranty policy', complete: activePolicies > 0, detail: `${activePolicies} active` },
    { key: 'sla', label: 'Warranty SLA', complete: hasSla, detail: hasSla ? slaSource : 'Brand and platform defaults are incomplete' },
    {
      key: 'rates',
      label: 'Rates for covered categories',
      complete: coverageIds.length > 0 && missingRateCategories.length === 0,
      detail: coverageIds.length ? `${ratedCategories.size}/${coverageIds.length} categories configured` : 'Coverage is required first',
      missingCategoryIds: missingRateCategories,
    },
    { key: 'billingProfile', label: 'Billing GSTIN', complete: Boolean(brand.billing?.gstin?.trim()), detail: brand.billing?.gstin || 'Missing' },
    { key: 'brandOwner', label: 'Active Brand Super Admin', complete: ownerCount > 0, detail: `${ownerCount} active` },
    { key: 'warrantyEnabled', label: 'Warranty intake enabled', complete: brand.warrantyEnabled === true, detail: brand.warrantyEnabled ? 'Enabled' : 'Disabled' },
  ];
  return {
    brand: { id: brand.id, name: brand.name },
    ready: checks.every((check) => check.complete),
    checks,
    missing: checks.filter((check) => !check.complete).map((check) => check.key),
  };
}

export async function createBrand(data, actingUserId) {
  const existing = await Brand.findOne({ name: data.name });
  if (existing) throw new ApiError(409, `Brand "${data.name}" already exists`);
  const brand = await Brand.create(data);
  // Every brand starts with the nine template roles (docs/brand-crm Phase 2).
  await ensureBrandRoleTemplates(brand._id);
  await logAudit({ user: actingUserId, action: `Created brand "${brand.name}"`, type: 'System' });
  return brand;
}

const EDITABLE_FIELDS = [
  'name',
  'category',
  'status',
  'warrantyMonths',
  'supportEmail',
  'supportPhone',
  'slaResolutionTimeHours',
  'slaAdherencePercent',
  'csat',
  'contractTerms',
];

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

export async function deleteBrand(id, actingUserId) {
  const brand = await findOr404(id);
  await Brand.findByIdAndDelete(id);
  await logAudit({ user: actingUserId, action: `Deleted brand "${brand.name}"`, type: 'System' });
  return { deleted: true };
}
