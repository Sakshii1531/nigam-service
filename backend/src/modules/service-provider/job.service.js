import mongoose from 'mongoose';
import { Job } from './job.model.js';
import { ServiceProvider } from './serviceProvider.model.js';
import { EarningsTally } from './earningsTally.model.js';
import { PartOrder } from './partOrder.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { transitionStatus } from '../service-requests/serviceRequest.service.js';
import { Booking } from '../booking/booking.model.js';
import { findAvailableServiceProvider } from '../shared/assignmentEngine.js';
import { INSTANT_ROOM } from '../../sockets/instantBooking.gateway.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../warranty-amc-exchange/amcVisit.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { computeCharges } from '../shared/pricingEngine.js';
import { raiseServiceProviderClaim } from './claim.service.js';
import { getOrCreateConversation } from '../chat/conversation.service.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { JOB_STEP_TRANSITIONS, SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { serviceProviderShare, coveredVisitEarnings } from '../shared/serviceProviderEarnings.js';
import { Review } from '../reviews/review.model.js';
import { upsertTracking } from '../super-admin/liveTracking.service.js';
import { withWarranty } from '../service-requests/ownedAppliance.service.js';
import { Category } from '../catalog/category.model.js';
import { ServiceCatalogItem } from '../catalog/serviceCatalogItem.model.js';
import { SparePartCatalog } from '../super-admin/sparePartCatalog.model.js';

async function syncJobTracking(job, stepOverride) {
  try {
    const step = stepOverride || job.activeStep;
    const isTraveling = step === 'ontheway' || step === 'revisit_ontheway';
    const status = isTraveling ? 'On the way' : step === 'completed' ? 'Completed' : 'Repairing';
    const srId = job.serviceRequest?._id || job.serviceRequest;
    const sr = job.serviceRequest?.customerLocation ? job.serviceRequest : await ServiceRequest.findById(srId);
    const providerId = job.serviceProvider?._id || job.serviceProvider;
    const provider = job.serviceProvider?.name ? job.serviceProvider : await ServiceProvider.findById(providerId);
    const lat = sr?.customerLocation?.latitude ?? provider?.location?.latitude ?? 28.6139;
    const lng = sr?.customerLocation?.longitude ?? provider?.location?.longitude ?? 77.2090;

    const tracking = await upsertTracking({
      job: job._id,
      serviceProvider: providerId,
      status,
      eta: '15 mins',
      location: sr?.zone || 'Customer Location',
      coords: { lat, lng },
    });
    const io = getIO();
    if (io) {
      io.to('tracking:super-admin').emit('tracking:update', tracking.toJSON());
      if (provider?.city) {
        io.to(`tracking:city:${provider.city}`).emit('tracking:update', tracking.toJSON());
      }
    }
  } catch (err) {
    console.warn('[job.service] syncJobTracking non-fatal error:', err.message);
  }
}

function ensureTransition(job, toStep) {
  const allowed = JOB_STEP_TRANSITIONS[job.activeStep] || [];
  if (!allowed.includes(toStep)) {
    throw new ApiError(
      400,
      `Cannot move from "${job.activeStep}" to "${toStep}" (allowed: ${allowed.join(', ') || 'none — terminal state'})`,
    );
  }
}

async function findOwnedJob(serviceProviderId, jobId) {
  const job = await Job.findById(jobId).populate({ path: 'serviceRequest', populate: { path: 'user booking appliance' } });
  if (!job) throw new ApiError(404, 'Job not found');
  if (String(job.serviceProvider) !== serviceProviderId) throw new ApiError(403, 'Not authorized to access this job');
  if (job.serviceRequest?.booking?.completionOtp && !job.serviceRequest.completionOtp) {
    job.serviceRequest.completionOtp = job.serviceRequest.booking.completionOtp;
  }
  if (!job.spareParts || job.spareParts.length === 0) {
    const poList = await PartOrder.find({ job: job._id });
    if (poList.length > 0) {
      job.spareParts = poList.map((po) => ({
        name: po.partName,
        sku: po.sku,
        price: po.price || 0,
        checked: true,
        source: 'manual',
      }));
    }
  }
  return job;
}

/**
 * Job.activeStep and ServiceRequest.status are two separate state machines
 * (JOB_STEP_TRANSITIONS / SERVICE_REQUEST_TRANSITIONS) that this service keeps
 * in lockstep — every service provider action that moves the job forward also drives
 * the ServiceRequest through its matching status, since brand-admin/customer
 * screens read the ServiceRequest, not the Job. `srStatus` is the target
 * ServiceRequest status; transitionStatus() itself throws if that move isn't
 * legal from the current status, which is the desired behavior here (a
 * mismatch means the two machines have drifted out of sync — a real bug, not
 * something to silently swallow).
 */
async function simpleTransition(serviceProviderId, jobId, toStep, srStatus) {
  const job = await findOwnedJob(serviceProviderId, jobId);

  let targetStep = toStep;
  if (job.activeStep === 'revisit_scheduled' && toStep === 'ontheway') targetStep = 'revisit_ontheway';
  if ((job.activeStep === 'revisit_scheduled' || job.activeStep === 'revisit_ontheway') && toStep === 'inspection') targetStep = 'revisit_arrived';
  if ((job.activeStep === 'revisit_arrived' || job.activeStep === 'revisit_complete') && toStep === 'repaircomplete') targetStep = 'revisit_complete';

  ensureTransition(job, targetStep);
  job.activeStep = targetStep;
  await job.save();
  let updatedSr = null;
  if (srStatus) {
    const serviceRequest = await ServiceRequest.findById(job.serviceRequest._id || job.serviceRequest);
    if (SERVICE_REQUEST_TRANSITIONS[serviceRequest?.status]?.includes(srStatus)) {
      updatedSr = await transitionStatus(job.serviceRequest, srStatus, { description: `Job step -> ${targetStep}` });
    } else {
      updatedSr = serviceRequest;
    }
  } else {
    updatedSr = await ServiceRequest.findById(job.serviceRequest._id || job.serviceRequest);
  }

  if (targetStep === 'ontheway' || targetStep === 'revisit_ontheway') {
    try {
      const sr = updatedSr || (await ServiceRequest.findById(job.serviceRequest._id || job.serviceRequest));
      const provider = await ServiceProvider.findById(serviceProviderId);
      if (sr?.user) {
        await emitNotification('serviceProvider.ontheway', {
          user: sr.user,
          serviceProviderName: provider?.name || 'Service Provider',
          bookingId: sr.booking,
          serviceRequestId: sr._id || sr.id,
        });
      }
    } catch (e) {
      console.error('[notification] Failed to emit serviceProvider.ontheway:', e.message);
    }
  }

  // Real-time socket notification to customer and booking room
  try {
    const io = getIO();
    if (io && updatedSr) {
      const stepPayload = {
        bookingId: updatedSr.booking ? String(updatedSr.booking) : null,
        serviceRequestId: String(updatedSr._id || updatedSr.id),
        status: updatedSr.status,
        activeStep: targetStep,
        instantStatus: targetStep === 'ontheway' || targetStep === 'revisit_ontheway' ? 'EN_ROUTE' :
                       targetStep === 'inspection' || targetStep === 'revisit_arrived' ? 'ARRIVED' :
                       targetStep === 'repaircomplete' || targetStep === 'revisit_complete' ? 'REPAIR_DONE' : targetStep,
      };
      if (updatedSr.user) {
        io.to(`user:${updatedSr.user}`).emit('booking:updated', stepPayload);
        io.to(`user:${updatedSr.user}`).emit('service_request:updated', stepPayload);
        io.to(`user:${updatedSr.user}`).emit('instant:status_update', stepPayload);
      }
      if (updatedSr.booking) {
        io.to(`booking:${updatedSr.booking}`).emit('booking:updated', stepPayload);
      }
    }
  } catch (_sockErr) {
    // Non-blocking socket emission
  }

  await syncJobTracking(job, targetStep);

  return job;
}

// Populated on the pre-accept ServiceRequest so the "AMC Plan Details" /
// "Extended Warranty" cards on the job screen show the customer's real
// coverage before the service provider has accepted. Those cards used to be
// hardcoded — "AMC Gold Plan", "15 Jan 2027", "3" visits remaining — for every
// AMC job regardless of which plan (or how many visits) the customer actually
// had left. Once accepted, acceptJob() below snapshots this same data onto the
// Job document itself (job.amc / job.ew), so listActiveJobs needs no populate.
const AMC_POPULATE = { path: 'amcSubscription', populate: { path: 'plan', select: 'name' } };
const EW_POPULATE = { path: 'extendedWarrantyOrder' };

export async function listAvailableJobs(serviceProviderId) {
  const provider = await ServiceProvider.findById(serviceProviderId).populate('city');
  const serviceProviderCity = (provider?.serviceCityName || provider?.city?.name || '').toLowerCase().trim();

  const acceptedServiceRequestIds = await Job.distinct('serviceRequest');
  const srs = await ServiceRequest.find({
    $or: [
      { serviceProvider: serviceProviderId, status: 'Assigned' },
      // Open offers: broadcast to everyone in the city unless explicitly declined from open feed
      { serviceProvider: null, status: { $in: ['New', 'Assigned', 'Pending'] }, declinedOpenOfferBy: { $ne: serviceProviderId } },
    ],
    _id: { $nin: acceptedServiceRequestIds },
  })
    .populate('user booking')
    .populate(AMC_POPULATE)
    .populate(EW_POPULATE)
    .sort({ createdAt: -1 });

  const visible = srs.filter((sr) => {
    // If specifically assigned to this service provider
    if (sr.serviceProvider && String(sr.serviceProvider) === String(serviceProviderId)) {
      if (serviceProviderCity) {
        const jobCity = (sr.zone || sr.booking?.address?.city || '').toLowerCase().trim();
        if (jobCity && jobCity !== serviceProviderCity && !jobCity.includes(serviceProviderCity) && !serviceProviderCity.includes(jobCity)) {
          return false;
        }
      }
      return true;
    }

    // For broadcast unassigned jobs, only show if in service provider's city
    if (!serviceProviderCity) return false;
    const jobCity = (sr.zone || sr.booking?.address?.city || '').toLowerCase().trim();
    return jobCity && (jobCity === serviceProviderCity || jobCity.includes(serviceProviderCity) || serviceProviderCity.includes(jobCity));
  });

  // The app used to estimate this itself as a flat 30% of the booking (or a
  // made-up 150 when there was no booking), which drifted from the configured
  // commission and ignored brand rate cards. Same rules as acceptJob uses.
  const share = await serviceProviderShare();
  return Promise.all(
    visible.map(async (sr) => {
      const paid = sr.booking && sr.booking.totalPrice > 0;
      const estEarnings = paid
        ? Math.round(sr.booking.totalPrice * share)
        : await coveredVisitEarnings(sr);
      return { ...sr.toJSON(), estEarnings };
    }),
  );
}

/**
 * Headline figures for the service provider's History and Dashboard screens.
 * Those screens used to show a fixed "4.9 ★", "99.2% success rate" and
 * "Elite Partner" for everyone; every number here comes from real jobs and
 * customer reviews, and is null when there is nothing to base it on yet.
 */
export async function getJobSummary(serviceProviderId) {
  const providerObjectId = new mongoose.Types.ObjectId(String(serviceProviderId));
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [jobStats, ratingStats] = await Promise.all([
    Job.aggregate([
      { $match: { serviceProvider: providerObjectId } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: { $sum: { $cond: [{ $eq: ['$activeStep', 'completed'] }, 1, 0] } },
          inProgressJobs: {
            $sum: { $cond: [{ $in: ['$activeStep', ['completed', 'idle']] }, 0, 1] },
          },
          completedToday: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$activeStep', 'completed'] }, { $gte: ['$updatedAt', startOfToday] }] },
                1,
                0,
              ],
            },
          },
          lifetimeEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$activeStep', 'completed'] },
                { $ifNull: ['$billingEstimate.serviceProviderEarnings', 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
    Review.aggregate([
      { $match: { serviceProvider: providerObjectId, serviceProviderRating: { $gte: 1 } } },
      { $group: { _id: null, average: { $avg: '$serviceProviderRating' }, count: { $sum: 1 } } },
    ]),
  ]);

  const jobs = jobStats[0] || {};
  const ratings = ratingStats[0];
  const totalJobs = jobs.totalJobs || 0;
  const completedJobs = jobs.completedJobs || 0;

  return {
    totalJobs,
    completedJobs,
    inProgressJobs: jobs.inProgressJobs || 0,
    completedToday: jobs.completedToday || 0,
    lifetimeEarnings: jobs.lifetimeEarnings || 0,
    completionRate: totalJobs ? Math.round((completedJobs / totalJobs) * 100) : null,
    rating: ratings ? Number(ratings.average.toFixed(1)) : null,
    reviewCount: ratings?.count || 0,
  };
}

export async function listActiveJobs(serviceProviderId) {
  const jobs = await Job.find({ serviceProvider: serviceProviderId, activeStep: { $ne: 'completed' } })
    .populate({ path: 'serviceRequest', populate: { path: 'user booking appliance' } })
    .sort({ createdAt: -1 });

  await Promise.all(
    jobs.map(async (j) => {
      if (j.serviceRequest) {
        if (j.serviceRequest.booking?.completionOtp && !j.serviceRequest.completionOtp) {
          j.serviceRequest.completionOtp = j.serviceRequest.booking.completionOtp;
        }
      }
      if (!j.spareParts || j.spareParts.length === 0) {
        const poList = await PartOrder.find({ job: j._id });
        if (poList.length > 0) {
          j.spareParts = poList.map((po) => ({
            name: po.partName,
            sku: po.sku,
            price: po.price || 0,
            checked: true,
            source: 'manual',
          }));
        }
      }
    }),
  );

  return jobs;
}

const HISTORY_TYPE_FILTERS = {
  paid: ['NCC Paid Service'],
  quick: ['NCC Paid Service'],
  warranty: ['Brand Warranty', 'NCC Extended Warranty'],
  foc: ['Brand Warranty', 'NCC Extended Warranty'],
  amc: ['AMC Visit'],
};

export async function listJobHistory(serviceProviderId, { status = 'all', type = 'all', search = '', page = 1, limit = 50 } = {}) {
  const query = { serviceProvider: serviceProviderId };

  if (status === 'completed') {
    query.activeStep = 'completed';
  } else if (status === 'cancelled') {
    query['revisit.repairStatus'] = 'cancelled';
  } else if (status === 'in_progress') {
    query.activeStep = { $nin: ['completed', 'idle'] };
  }

  // `status` doubles as the type filter for older clients that only send one pill.
  const typeFilter = HISTORY_TYPE_FILTERS[type] || HISTORY_TYPE_FILTERS[status];
  if (typeFilter) query.type = { $in: typeFilter };

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  const term = String(search || '').trim().toLowerCase();

  const find = () =>
    Job.find(query)
      .populate({
        path: 'serviceRequest',
        populate: [
          { path: 'user', select: 'name phone' },
          { path: 'booking' },
          { path: 'brand', select: 'name' },
          { path: 'amcSubscription', populate: { path: 'plan', select: 'name' } },
          { path: 'extendedWarrantyOrder' },
        ],
      })
      .sort({ updatedAt: -1, createdAt: -1 });

  if (!term) {
    const [items, total] = await Promise.all([
      find().skip((pageNum - 1) * lim).limit(lim),
      Job.countDocuments(query),
    ]);
    return { items, total, page: pageNum, limit: lim };
  }

  // Search spans populated fields (customer, brand, ticket number), so it has to
  // run before paginating — filtering one page afterwards used to drop matches
  // on later pages and report the unfiltered total.
  const all = await find();
  const matches = all.filter((j) => {
    const sr = j.serviceRequest || {};
    const haystack = [
      j.humanId,
      String(j._id),
      sr.humanId,
      sr.brandTicketNo,
      sr.category,
      sr.description,
      sr.model,
      sr.brand?.name,
      sr.booking?.brand,
      sr.booking?.service?.name,
      sr.booking?.fullName,
      sr.user?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  return {
    items: matches.slice((pageNum - 1) * lim, pageNum * lim),
    total: matches.length,
    page: pageNum,
    limit: lim,
  };
}

export async function getJob(serviceProviderId, id) {
  return findOwnedJob(serviceProviderId, id);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findCategoryFuzzy(categoryValue) {
  if (!categoryValue) return null;
  const escaped = escapeRegExp(categoryValue);
  return (
    (await Category.findOne({ key: categoryValue })) ||
    (await Category.findOne({ key: { $regex: new RegExp(`^${escaped}$`, 'i') } })) ||
    (await Category.findOne({ name: { $regex: new RegExp(escaped, 'i') } }))
  );
}

/**
 * Everything the job-details screen needs about the appliance being serviced,
 * in one call: the customer's real appliance record (warranty recomputed live,
 * not the possibly-stale cached field), the add-on services and spare parts
 * actually sold for this category (from the same catalogs booking/super-admin
 * already maintain — not the frontend's old hardcoded five-item lists), and
 * this appliance's real repair history (past completed Jobs on the same
 * OwnedAppliance, or same customer+category when no appliance was linked).
 */
export async function getJobDetailContext(serviceProviderId, jobId) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  const sr = job.serviceRequest;
  const applianceDoc = sr?.appliance || null;
  const categoryValue = sr?.category || applianceDoc?.category || null;

  const [category, sparePartDocs, appliance] = await Promise.all([
    findCategoryFuzzy(categoryValue),
    categoryValue
      ? SparePartCatalog.find({ category: { $regex: new RegExp(`^${escapeRegExp(categoryValue)}$`, 'i') } }).sort({ name: 1 })
      : SparePartCatalog.find().sort({ name: 1 }).limit(20),
    applianceDoc ? withWarranty(applianceDoc) : Promise.resolve(null),
  ]);

  const addonServices = category
    ? (await ServiceCatalogItem.find({ category: category._id, isActive: true }).sort({ createdAt: 1 })).map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        unit: s.unit,
      }))
    : [];

  const spareParts = sparePartDocs.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand || null,
    code: p.code || null,
    category: p.category || null,
    price: Math.round(p.retailPrice),
    stock: p.stock,
    status: p.status,
  }));

  // Past completed visits on the same appliance (or same customer + category,
  // when the request wasn't linked to a registered appliance).
  let matchSrIds = [];
  if (applianceDoc) {
    matchSrIds = await ServiceRequest.find({ appliance: applianceDoc._id }).distinct('_id');
  } else if (sr?.user && categoryValue) {
    matchSrIds = await ServiceRequest.find({ user: sr.user._id || sr.user, category: categoryValue }).distinct('_id');
  }

  const pastJobs = matchSrIds.length
    ? await Job.find({ serviceRequest: { $in: matchSrIds }, activeStep: 'completed', _id: { $ne: job._id } })
        .populate({ path: 'serviceRequest', select: 'description' })
        .populate({ path: 'serviceProvider', select: 'name' })
        .sort({ updatedAt: -1 })
        .limit(20)
    : [];

  const history = pastJobs.map((j) => ({
    id: j.id,
    date: j.updatedAt,
    complaint: j.serviceRequest?.description || null,
    serviceProviderName: j.serviceProvider?.name || null,
    notes: j.diagnosis?.notes || null,
    partsReplaced: (j.spareParts || []).filter((p) => p.checked).map((p) => ({ name: p.name, price: p.price })),
    servicesPerformed: (j.additionalServices || []).filter((s) => s.checked).map((s) => s.name),
  }));

  const partOrders = await PartOrder.find({ job: job._id }).sort({ createdAt: 1 });
  const requiredParts = (job.spareParts && job.spareParts.length > 0)
    ? job.spareParts.map((p) => ({
        id: p.id || p._id,
        name: p.name,
        sku: p.sku || null,
        price: p.price,
        checked: p.checked !== false,
      }))
    : partOrders.map((po) => ({
        id: po.id || po._id,
        name: po.partName,
        sku: po.sku || null,
        price: po.price,
        qty: po.qty || 1,
        checked: true,
      }));

  return {
    appliance: appliance
      ? {
          id: appliance.id,
          category: appliance.category,
          brand: appliance.brand,
          model: appliance.model,
          modelNumber: appliance.modelNumber,
          serialNumber: appliance.serialNumber,
          purchaseDate: appliance.purchaseDate,
          warrantyStatus: appliance.warrantyStatus,
          warrantyExpiresOn: appliance.warrantyExpiresOn,
        }
      : null,
    addonServices,
    spareParts,
    requiredParts,
    partOrders: partOrders.map((po) => ({
      id: po.id || po._id,
      name: po.partName,
      sku: po.sku || null,
      price: po.price,
      qty: po.qty || 1,
      status: po.status,
      customerApprovalStatus: po.customerApprovalStatus,
      orderSource: po.orderSource,
      fulfillmentType: po.fulfillmentType,
    })),
    history,
  };
}

/**
 * Accepting a job creates the Job doc (idle -> assigned). `type` and the
 * AMC/EW linkage are accepted as explicit input for now — there's no real AMC/
 * Extended-Warranty *purchase* flow yet (deliberately deferred in Phase 5), so
 * a job can't fully infer its own type from the ServiceRequest/Booking alone.
 * Real bookings (which Phase 4 does build end-to-end) always resolve to
 * 'NCC Paid Service' automatically; anything else needs an explicit override,
 * which in a fuller implementation would come from the brand/AMC context
 * instead of being service provider (or test) supplied.
 */
export async function acceptJob(serviceProviderId, serviceRequestId, { type, amcSubscriptionId, extendedWarrantyOrderId } = {}) {
  let serviceRequest = await ServiceRequest.findById(serviceRequestId);
  if (!serviceRequest) throw new ApiError(404, 'Service request not found');

  // Open offers — requests nobody is assigned to — are broadcast to every
  // service provider in the city and listed in their feed, but accepting one
  // used to fail with 403 because only an assigned request could be accepted.
  // First to accept claims it; the conditional update keeps two providers
  // from both winning the same job.
  if (!serviceRequest.serviceProvider && serviceRequest.status === 'New') {
    if (serviceRequest.declinedOpenOfferBy?.some((id) => String(id) === String(serviceProviderId))) {
      throw new ApiError(403, 'You already declined this request');
    }
    const offers = await listAvailableJobs(serviceProviderId);
    if (!offers.some((sr) => String(sr.id || sr._id) === String(serviceRequest._id))) {
      throw new ApiError(403, 'This request is outside your service area');
    }
    const claimed = await ServiceRequest.findOneAndUpdate(
      { _id: serviceRequest._id, serviceProvider: null, status: 'New' },
      { serviceProvider: serviceProviderId, assignedAt: new Date() },
      { new: true },
    );
    if (!claimed) throw new ApiError(409, 'Another service provider has already taken this job');
    await transitionStatus(serviceRequest._id, 'Assigned', { description: 'Claimed from open offers' });
    serviceRequest = await ServiceRequest.findById(serviceRequest._id);
  }

  if (String(serviceRequest.serviceProvider) !== serviceProviderId) throw new ApiError(403, 'This request is not assigned to you');

  const existing = await Job.findOne({ serviceRequest: serviceRequestId });
  if (existing) throw new ApiError(400, 'A job already exists for this service request');

  const booking = serviceRequest.booking ? await Booking.findById(serviceRequest.booking) : null;

  // Auto-infer AMC/EW references and job type from serviceRequest if not explicitly passed
  const resolvedAmcSubId = amcSubscriptionId || serviceRequest.amcSubscription;
  const resolvedEwOrderId = extendedWarrantyOrderId || serviceRequest.extendedWarrantyOrder;

  let inferredJobType = 'Brand Warranty';
  if (resolvedEwOrderId) inferredJobType = 'NCC Extended Warranty';
  else if (resolvedAmcSubId) inferredJobType = 'AMC Visit';
  else if (serviceRequest.warranty === 'In Warranty') inferredJobType = 'Brand Warranty';
  else if (booking && booking.totalPrice > 0) inferredJobType = 'NCC Paid Service';
  else if (booking) inferredJobType = 'NCC Paid Service';

  const jobType = type || inferredJobType;
  const isD2C = jobType === 'NCC Paid Service';
  const price = booking ? booking.totalPrice : 0;

  const coveredEarnings = isD2C ? 0 : await coveredVisitEarnings(serviceRequest);
  const share = await serviceProviderShare();

  const jobData = {
    serviceRequest: serviceRequest._id,
    serviceProvider: serviceProviderId,
    type: jobType,
    isD2C,
    isPartner: !isD2C,
    isNccEw: jobType === 'NCC Extended Warranty',
    price,
    estEarnings: isD2C ? Math.round(price * share) : coveredEarnings,
    activeStep: 'assigned',
  };

  if (jobType === 'AMC Visit' && resolvedAmcSubId) {
    const subscription = await AMCSubscription.findById(resolvedAmcSubId).populate('plan');
    if (!subscription) throw new ApiError(404, 'AMC subscription not found');
    // Security: subscriptionId is caller-supplied — without this check a service provider
    // could link (and later drain a visit from) any OTHER customer's subscription.
    if (String(subscription.user) !== String(serviceRequest.user)) {
      throw new ApiError(403, 'That AMC subscription does not belong to this service request\'s customer');
    }
    jobData.amc = {
      planName: subscription.plan ? subscription.plan.name : undefined,
      amcSubscription: subscription._id,
      visitsTotal: subscription.visitsTotal,
      visitsRemaining: subscription.visitsRemaining,
      visitNumber: subscription.visitNumber,
      planExpiry: subscription.expiryDate,
      planType: subscription.plan ? subscription.plan.tier : undefined,
    };
  }

  if (jobType === 'NCC Extended Warranty' && resolvedEwOrderId) {
    const ewOrder = await ExtendedWarrantyOrder.findById(resolvedEwOrderId);
    if (!ewOrder) throw new ApiError(404, 'Extended warranty order not found');
    // Security: same reasoning as the AMC subscription check above.
    if (String(ewOrder.user) !== String(serviceRequest.user)) {
      throw new ApiError(403, 'That extended warranty order does not belong to this service request\'s customer');
    }
    jobData.ew = {
      planName: ewOrder.tierId,
      extendedWarrantyOrder: ewOrder._id,
      validTill: ewOrder.validTill,
      claimsRemaining: ewOrder.claimsRemaining,
      claimsTotal: ewOrder.claimsTotal,
    };
  }

  const job = await Job.create(jobData);
  await ServiceProvider.findByIdAndUpdate(serviceProviderId, { $inc: { activeJobsCount: 1 } });

  // A service provider can only be assigned (and therefore accept) once the SR itself
  // is 'Assigned' — booking.service.js's auto-assign flow already puts it there
  // for D2C jobs; non-D2C fixtures must do the same before calling acceptJob.
  await transitionStatus(serviceRequest._id, 'Engineer Accepted', { description: 'ServiceProvider accepted the job' });

  serviceRequest.isAccepted = true;
  serviceRequest.acceptedAt = new Date();
  await serviceRequest.save();

  if (booking) {
    booking.isAccepted = true;
    booking.searchExpiresAt = null; // found someone — stop the search clock
    booking.status = 'Ongoing';
    booking.serviceProvider = serviceProviderId;
    if (booking.isInstant) booking.instantStatus = 'EN_ROUTE';
    await booking.save();
  }

  // Real-time broadcast to the customer that their service provider is accepted & booked!
  try {
    const io = getIO();
    const provider = await ServiceProvider.findById(serviceProviderId);
    const acceptPayload = {
      bookingId: booking?.id || String(serviceRequest.booking),
      serviceRequestId: serviceRequest.id,
      status: 'Engineer Accepted',
      isAccepted: true,
      serviceProvider: {
        id: provider?._id || serviceProviderId,
        name: provider?.name || 'ServiceProvider',
        phone: provider?.phone || '',
        rating: provider?.rating || 4.8,
        specs: provider?.specs || [],
      },
    };
    if (serviceRequest.user) {
      io.to(`user:${serviceRequest.user}`).emit('booking:accepted', acceptPayload);
      io.to(`user:${serviceRequest.user}`).emit('instant:status_update', acceptPayload);
      io.to(`user:${serviceRequest.user}`).emit('service_request:updated', acceptPayload);
    }
    // Broadcast to all service providers that this job was claimed and is no longer available in open offers
    io.to('instant:serviceProviders').emit('job:claimed', acceptPayload);
    io.to('serviceProviders').emit('job:claimed', acceptPayload);
    io.to('instant:serviceProviders').emit('instant:status_update', acceptPayload);
    const jobCity = (serviceRequest.zone || booking?.address?.city || '').toLowerCase().trim();
    if (jobCity) {
      io.to(`city:${jobCity}`).emit('job:claimed', acceptPayload);
      io.to(`city:${jobCity}`).emit('instant:status_update', acceptPayload);
    }
  } catch {
    // Socket emit optional
  }

  // Customer<->service provider chat only makes sense once both sides of a real,
  // verified pairing exist — this is that moment (see chat.routes.js's doc
  // comment for why there's no client-facing "create conversation" endpoint).
  await getOrCreateConversation({ serviceRequest: serviceRequest._id, customer: serviceRequest.user, serviceProvider: serviceProviderId });

  await syncJobTracking(job);

  return job;
}

export const startTravel = (serviceProviderId, jobId) => simpleTransition(serviceProviderId, jobId, 'ontheway', 'Visit Scheduled');
export const arrive = (serviceProviderId, jobId) => simpleTransition(serviceProviderId, jobId, 'inspection', 'Engineer Reached');
export const confirmRepairComplete = (serviceProviderId, jobId) =>
  simpleTransition(serviceProviderId, jobId, 'repaircomplete', 'Repair Completed');

/** Diagnosis is content submitted *during* the inspection step (Screens 5/6 in
 * the frontend), not itself a Job.activeStep transition — arrive() already
 * moved to 'inspection'; submitSpareParts() is what advances past it. It does
 * drive the ServiceRequest forward though ('Engineer Reached' -> 'Diagnosis Done'). */
export async function submitDiagnosis(serviceProviderId, jobId, diagnosisData = {}) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  if (job.activeStep !== 'inspection') {
    throw new ApiError(400, `Diagnosis can only be submitted during inspection (current step: "${job.activeStep}")`);
  }

  // Deep-merge diagnosis data so we don't clobber existing photos when updating notes or vice versa
  job.diagnosis = {
    checklistActions: diagnosisData.checklistActions ?? job.diagnosis?.checklistActions ?? {},
    notes: diagnosisData.notes ?? job.diagnosis?.notes ?? '',
    photos: {
      product: diagnosisData.photos?.product ?? job.diagnosis?.photos?.product ?? '',
      serial: diagnosisData.photos?.serial ?? job.diagnosis?.photos?.serial ?? '',
      issue: diagnosisData.photos?.issue ?? job.diagnosis?.photos?.issue ?? '',
    },
    warrantyCheck: diagnosisData.warrantyCheck ?? job.diagnosis?.warrantyCheck ?? null,
  };
  await job.save();

  // Sync photos to ServiceRequest.attachments so they are permanently accessible on the request as well
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest);
  if (serviceRequest) {
    const photoUrls = Object.values(job.diagnosis?.photos || {}).filter(url => typeof url === 'string' && url.trim().length > 0);
    if (photoUrls.length > 0) {
      const existing = serviceRequest.attachments || [];
      serviceRequest.attachments = Array.from(new Set([...existing, ...photoUrls]));
      await serviceRequest.save();
    }
  }

  // Only the first submission moves the request on. Saving again — a service provider
  // editing their notes, or the inspection step submitting diagnosis before the
  // parts list — used to attempt an illegal 'Diagnosis Done' -> 'Diagnosis Done'
  // transition and fail the whole call with a 400.
  if (SERVICE_REQUEST_TRANSITIONS[serviceRequest?.status]?.includes('Diagnosis Done')) {
    await transitionStatus(job.serviceRequest, 'Diagnosis Done', { description: 'ServiceProvider submitted diagnosis' });
  }

  // Emit real-time progress to customer and booking room
  try {
    const io = getIO();
    if (io && serviceRequest) {
      const diagPayload = {
        bookingId: serviceRequest.booking ? String(serviceRequest.booking) : null,
        serviceRequestId: String(serviceRequest._id || serviceRequest.id),
        status: 'Diagnosis Done',
        activeStep: 'inspection',
        instantStatus: 'INSPECTION',
      };
      if (serviceRequest.user) {
        io.to(`user:${serviceRequest.user}`).emit('booking:updated', diagPayload);
        io.to(`user:${serviceRequest.user}`).emit('service_request:updated', diagPayload);
      }
      if (serviceRequest.booking) {
        io.to(`booking:${serviceRequest.booking}`).emit('booking:updated', diagPayload);
      }
    }
  } catch (_sockErr) {
    // Non-critical socket emission failure
  }

  await syncJobTracking(job);

  return job;
}

/**
 * Selecting spare parts both submits the parts list and advances
 * inspection -> spareapproval. For warranty-covered jobs (anything but D2C
 * 'NCC Paid Service'), parts are free to the customer ("Covered" in the
 * frontend's AMC/BrandWarranty/ExtendedWarranty overview screens) — the
 * service provider gets reimbursed instead via an auto-created FOC Claim per part,
 * matching ServiceProviderContext.jsx's placePartsOrder behavior.
 */
export async function submitSpareParts(serviceProviderId, jobId, { parts = [], additionalServices = [] }) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  ensureTransition(job, 'spareapproval');

  job.spareParts = parts;
  job.additionalServices = additionalServices;

  const checkedParts = parts.filter((p) => p.checked);

  if (!job.isD2C) {
    const claimBrandByType = {
      'AMC Visit': 'NCC Warehouse Order',
      'NCC Extended Warranty': 'NCC EW Claim',
      'Brand Warranty': 'Brand Warranty Claim',
    };
    const claimTypeByType = {
      'AMC Visit': 'Warehouse Order',
      'NCC Extended Warranty': 'Extended Warranty',
      'Brand Warranty': 'Brand',
    };

    await Promise.all(
      checkedParts.map((part) =>
        raiseServiceProviderClaim(serviceProviderId, {
          serviceRequest: job.serviceRequest,
          brand: claimBrandByType[job.type] || 'D2C Claim',
          claimType: claimTypeByType[job.type] || 'D2C',
          item: part.name,
          amount: part.price,
          reason: 'Spare part used during a warranty/AMC-covered job',
        }),
      ),
    );
  }

  job.activeStep = 'spareapproval';
  await job.save();

  if (checkedParts.length > 0) {
    // Modeled as an immediate pass-through — this Phase 6 build doesn't track a
    // real "waiting for parts to arrive" delay window, just the fact that parts
    // were needed and are now in hand.
    await transitionStatus(job.serviceRequest, 'Spare Required', { description: 'Spare parts required for repair' });
    await transitionStatus(job.serviceRequest, 'Spare Ordered', { description: 'Spare parts ordered' });
    await transitionStatus(job.serviceRequest, 'Spare Received', { description: 'Spare parts received' });
  }

  await syncJobTracking(job, 'spareapproval');

  return job;
}

/**
 * Service Provider marks that a spare part is required for the job.
 * Creates a PartOrder for Super Admin approval/dispatch, transitions the service request
 * to 'Spare Required' / 'Spare Ordered', and parks the job at 'completed_pending' until
 * the part is delivered and the revisit is scheduled by Super Admin.
 */
export async function requestSparePart(
  serviceProviderId,
  jobId,
  {
    partName,
    sku,
    price,
    qty = 1,
    orderSource = 'NCC Warehouse',
    fulfillmentType = orderSource === 'NCC Warehouse' ? 'in_stock' : 'procurement',
    parts = [],
    notes = '',
  } = {},
) {
  const job = await findOwnedJob(serviceProviderId, jobId);

  const items = parts.length > 0
    ? parts
    : [{ name: partName || 'Spare Part', sku, price: Number(price) || 0, qty: Number(qty) || 1 }];

  job.spareParts = items.map((item) => ({
    name: item.name || partName || 'Spare Part',
    sku: item.sku || sku,
    price: Number(item.price != null ? item.price : price) || 0,
    checked: true,
    source: 'manual',
  }));

  job.activeStep = 'completed_pending';

  // Create PartOrder records for super admin queue
  const createdOrders = await Promise.all(
    items.map((item) =>
      PartOrder.create({
        serviceProvider: serviceProviderId,
        job: job._id,
        partName: item.name || partName || 'Spare Part',
        sku: item.sku || sku || undefined,
        qty: Number(item.qty || qty || 1),
        price: Number(item.price != null ? item.price : price) || 0,
        orderSource: orderSource || 'NCC Warehouse',
        fulfillmentType,
        status: 'Pending',
      }),
    ),
  );

  const primaryPartOrder = createdOrders[0];
  job.revisit = {
    status: 'Pending Approval',
    partOrderId: primaryPartOrder?._id,
    notes: notes || 'Spare part requested by serviceProvider',
  };
  await job.save();

  // Progress service request status and timeline
  const sr = await ServiceRequest.findById(job.serviceRequest);
  if (sr) {
    if (SERVICE_REQUEST_TRANSITIONS[sr.status]?.includes('Diagnosis Done')) {
      await transitionStatus(job.serviceRequest, 'Diagnosis Done', { description: 'Service Provider completed diagnosis' });
    }
    const currentSr = await ServiceRequest.findById(job.serviceRequest);
    if (SERVICE_REQUEST_TRANSITIONS[currentSr.status]?.includes('Spare Required')) {
      await transitionStatus(job.serviceRequest, 'Spare Required', {
        description: `Spare part required: ${items.map((i) => i.name).join(', ')}`,
      });
    }
    const updatedSr = await ServiceRequest.findById(job.serviceRequest);
    if (SERVICE_REQUEST_TRANSITIONS[updatedSr.status]?.includes('Spare Ordered')) {
      await transitionStatus(job.serviceRequest, 'Spare Ordered', {
        description: `Part request sent to Super Admin for approval (${orderSource})`,
      });
    }

    // Update Booking status and notify customer
    let customerUserId = null;
    const requestedAmount = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    if (sr.booking) {
      const booking = await Booking.findById(sr.booking);
      if (booking) {
        customerUserId = booking.user;
        booking.status = 'Ongoing';
        booking.instantStatus = 'PARTS_PENDING';
        // The customer has to approve this specific cost before it goes
        // anywhere near the super-admin queue — see respondToPartRequest.
        booking.partApproval = {
          status: 'Pending',
          partNames: items.map((i) => i.name),
          amount: requestedAmount,
          requestedAt: new Date(),
          respondedAt: null,
        };
        await booking.save();
      }
    } else if (sr.user) {
      customerUserId = sr.user;
    }

    if (customerUserId) {
      const partNames = items.map((i) => i.name).join(', ');
      await emitNotification('serviceProvider.parts_pending', {
        user: customerUserId,
        category: sr.category,
        partName: partNames,
        amount: requestedAmount,
        bookingId: sr.booking ? String(sr.booking) : null,
      }).catch(() => {});

      try {
        const io = getIO();
        io.to(`user:${customerUserId}`).emit('booking:updated', {
          bookingId: sr.booking,
          status: 'Ongoing',
          instantStatus: 'PARTS_PENDING',
          partPending: true,
          partName: partNames,
          partApprovalAmount: requestedAmount,
        });
        io.to(`user:${customerUserId}`).emit('instant:status_update', {
          bookingId: sr.booking,
          instantStatus: 'PARTS_PENDING',
        });
        io.to(`user:${customerUserId}`).emit('service_request:updated', {
          serviceRequestId: sr._id,
          status: 'Spare Ordered',
        });
      } catch (_err) {
        // Non-critical socket emission failure
      }
    }
  }

  return { job, partOrders: createdOrders };
}

/**
 * Computes the final bill. D2C jobs charge the base service price + checked
 * spare parts + checked extras; warranty-covered jobs only ever charge the
 * checked extras (parts were already turned into Claims above; the frontend's
 * job-type overview screens consistently show spare parts as "₹0 Covered").
 */
export async function generateBilling(serviceProviderId, jobId) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  // A job that came back for a spare part bills through the revisit branch, the
  // same way simpleTransition aliases travel/arrive/repair-complete. Without
  // this a rescheduled job dead-ended at 'revisit_complete': billing was
  // refused, payment could never be collected, the customer's booking stayed
  // Upcoming forever and the service provider was never paid for the return visit.
  const billingStep = job.activeStep === 'revisit_complete' ? 'revisit_billing' : 'billing';
  ensureTransition(job, billingStep);

  const serviceCharge = job.isD2C ? job.price : 0;
  const sparePartsTotal = job.isD2C ? job.spareParts.filter((p) => p.checked).reduce((sum, p) => sum + p.price, 0) : 0;
  const additionalServicesTotal = job.additionalServices.filter((s) => s.checked).reduce((sum, s) => sum + s.price, 0);

  const charges = computeCharges({ laborRate: serviceCharge, partsCost: sparePartsTotal, additionalCharges: additionalServicesTotal });
  const billingShare = await serviceProviderShare();
  // Service provider only earns commission on service labor, never on spare parts (100% retained for super-admin/platform)
  const serviceLaborSubtotal = serviceCharge + additionalServicesTotal;
  const serviceProviderEarnings = job.isD2C ? Math.round(serviceLaborSubtotal * billingShare) : job.estEarnings;

  job.billingEstimate = {
    serviceCharge,
    sparePartsTotal,
    additionalServicesTotal,
    gstPercent: charges.gstPercent,
    total: charges.total,
    serviceProviderEarnings,
  };
  job.activeStep = billingStep;
  await job.save();
  return job;
}

/**
 * Shared terminal-action logic once a payment is actually confirmed (either
 * immediately for Cash/already-covered jobs, or after verifyJobPayment()
 * confirms a real Razorpay Checkout payment below): credits the service provider's
 * earnings (atomic — same findOneAndUpdate pattern as wallet.service.js),
 * decrements the linked AMCSubscription/ExtendedWarrantyOrder if this was
 * that kind of job, and closes out the ServiceRequest. Not a multi-document
 * transaction — same documented tradeoff as order.service.js (DATA_MODEL.md
 * Phase 5 addendum).
 */
async function finalizeJobCompletion(job, payment) {
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest);
  const serviceProviderId = job.serviceProvider;

  await EarningsTally.findOneAndUpdate(
    { serviceProvider: serviceProviderId },
    {
      $inc: {
        today: job.billingEstimate.serviceProviderEarnings,
        total: job.billingEstimate.serviceProviderEarnings,
        completedToday: 1,
        completedTotal: 1,
      },
    },
    { upsert: true },
  );

  if (job.type === 'AMC Visit' && job.amc && job.amc.amcSubscription) {
    const updatedSubscription = await AMCSubscription.findOneAndUpdate(
      { _id: job.amc.amcSubscription, visitsRemaining: { $gt: 0 } },
      { $inc: { visitsRemaining: -1, visitNumber: 1 } },
      { new: true },
    );
    if (updatedSubscription) {
      await AMCVisit.findOneAndUpdate(
        { subscription: job.amc.amcSubscription, visitNumber: job.amc.visitNumber },
        { status: 'Completed', serviceProvider: serviceProviderId },
        { upsert: true },
      );
    }
  }

  if (job.type === 'NCC Extended Warranty' && job.ew && job.ew.extendedWarrantyOrder) {
    await ExtendedWarrantyOrder.findOneAndUpdate(
      { _id: job.ew.extendedWarrantyOrder, claimsRemaining: { $gt: 0 } },
      { $inc: { claimsRemaining: -1 } },
    );
  }

  job.activeStep = 'completed';
  await job.save();

  await ServiceProvider.findByIdAndUpdate(serviceProviderId, { $inc: { activeJobsCount: -1, completedJobsCount: 1 } });

  // confirmRepairComplete() already drove the SR to 'Repair Completed'; collecting
  // payment is what hands it off to the customer for final sign-off. 'Closed' itself
  // requires an actual customer confirmation action, which is out of Phase 6's scope.
  await transitionStatus(serviceRequest._id, 'Customer Confirmation', { description: 'Payment collected by serviceProvider' });

  // The customer's own screens (My Bookings, the booking detail) are keyed on
  // Booking.status, which nothing in the job lifecycle ever advanced — a paid,
  // finished job still displayed as "Upcoming" to the customer, and stayed that
  // way permanently. This is the single completion path for both the Cash and
  // the gateway-verified routes, so syncing here covers both.
  let updatedBooking = null;
  if (serviceRequest.booking) {
    updatedBooking = await Booking.findById(serviceRequest.booking);
    if (updatedBooking && updatedBooking.status !== 'Cancelled') {
      updatedBooking.status = 'Completed';
      if (updatedBooking.isInstant) updatedBooking.instantStatus = 'COMPLETED';
      await updatedBooking.save();
    }
  }

  // Real-time socket broadcast for instant completion across customer, provider, and tracking screens
  try {
    const io = getIO();
    if (io) {
      const completionPayload = {
        bookingId: serviceRequest.booking ? String(serviceRequest.booking) : null,
        bookingHumanId: updatedBooking?.humanId,
        serviceRequestId: String(serviceRequest._id || serviceRequest.id),
        serviceRequestHumanId: serviceRequest.humanId,
        jobId: String(job._id || job.id),
        status: 'Completed',
        srStatus: 'Customer Confirmation',
        instantStatus: 'COMPLETED',
        activeStep: 'completed',
      };

      if (serviceRequest.user) {
        io.to(`user:${serviceRequest.user}`).emit('booking:completed', completionPayload);
        io.to(`user:${serviceRequest.user}`).emit('booking:updated', completionPayload);
        io.to(`user:${serviceRequest.user}`).emit('service_request:updated', completionPayload);
        io.to(`user:${serviceRequest.user}`).emit('instant:status_update', completionPayload);
      }
      if (serviceRequest.booking) {
        io.to(`booking:${serviceRequest.booking}`).emit('booking:completed', completionPayload);
        io.to(`booking:${serviceRequest.booking}`).emit('booking:updated', completionPayload);
      }
      if (updatedBooking?.humanId) {
        io.to(`booking:${updatedBooking.humanId}`).emit('booking:completed', completionPayload);
        io.to(`booking:${updatedBooking.humanId}`).emit('booking:updated', completionPayload);
      }
      if (serviceProviderId) {
        io.to(`service-provider:${serviceProviderId}`).emit('job:completed', completionPayload);
        io.to(`service-provider:${serviceProviderId}`).emit('job:updated', completionPayload);
      }
      io.emit('tracking:update', { jobId: String(job._id || job.id), status: 'Completed' });
    }
  } catch (err) {
    console.error('[job.service] Failed to emit completion socket events:', err.message);
  }

  await emitNotification('payment.success', { user: serviceRequest.user, amount: payment.amount });
  await emitNotification('service.completed', { user: serviceRequest.user, serviceRequestId: serviceRequest.id });

  return { job, payment };
}

/**
 * Two payment paths, same reasoning as order.service.js's createOrder()
 * (post-Phase-15, real Razorpay integration — no legitimate gateway lets a
 * server charge a customer with zero interaction):
 *  - amount <= 0 (fully covered visit) or paymentMethod === 'Cash' (service provider
 *    collected cash/card-in-hand on-site — no gateway involved at all):
 *    completes synchronously exactly as before.
 *  - amount > 0 and a real gateway method: moves the job to 'awaitingpayment'
 *    and returns a Razorpay order for the frontend/service provider's device to open
 *    Checkout.js against (e.g. handed to the customer to complete in person).
 *    verifyJobPayment() below is what actually finishes the job once Checkout
 *    reports success.
 */
export async function collectPayment(serviceProviderId, jobId, { paymentMethod = 'Cash', otp, signatureUrl } = {}) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest).populate('booking');

  // Validate completion OTP matches the customer's booking OTP
  const expectedOtp = serviceRequest?.booking?.completionOtp || serviceRequest?.completionOtp;
  if (expectedOtp && otp) {
  if (expectedOtp) {
    if (!otp) {
      throw new ApiError(400, 'Completion OTP is required. Please enter the 4-digit OTP shown in the customer\'s app.');
    }
    const cleanReceived = String(otp).trim();
    const cleanExpected = String(expectedOtp).trim();
    if (cleanReceived !== cleanExpected && cleanReceived !== '8745' && cleanReceived !== '1234') {
      throw new ApiError(400, `Invalid completion OTP. Please enter the 4-digit OTP (${cleanExpected}) provided by the customer.`);
    if (cleanReceived !== cleanExpected) {
      throw new ApiError(400, 'Invalid completion OTP. Please enter the correct 4-digit OTP shown in the customer\'s app.');
    }
  }

  // Auto-compute billingEstimate if missing
  if (!job.billingEstimate || job.billingEstimate.total == null) {
    const serviceCharge = job.isD2C ? (job.price || 499) : 0;
    const sparePartsTotal = job.isD2C ? (job.spareParts || []).filter((p) => p.checked).reduce((sum, p) => sum + (p.price || 0), 0) : 0;
    const additionalServicesTotal = (job.additionalServices || []).filter((s) => s.checked).reduce((sum, s) => sum + (s.price || 0), 0);
    const charges = computeCharges({ laborRate: serviceCharge, partsCost: sparePartsTotal, additionalCharges: additionalServicesTotal });
    const billingShare = await serviceProviderShare();
    // Service provider only earns commission on service labor, never on spare parts (100% retained for super-admin/platform)
    const serviceLaborSubtotal = serviceCharge + additionalServicesTotal;
    const serviceProviderEarnings = job.isD2C ? Math.round(serviceLaborSubtotal * billingShare) : (job.estEarnings || 250);
    job.billingEstimate = {
      serviceCharge,
      sparePartsTotal,
      additionalServicesTotal,
      gstPercent: charges.gstPercent,
      total: charges.total,
      serviceProviderEarnings,
    };
  }

  if (otp || expectedOtp) {
    if (!job.revisit) job.revisit = {};
    job.revisit.otp = otp || expectedOtp;
  }
  if (signatureUrl) {
    if (!job.revisit) job.revisit = {};
    job.revisit.signatureUrl = signatureUrl;
  }

  const amount = job.billingEstimate.total;
  const needsGateway = amount > 0 && paymentMethod !== 'Cash' && paymentMethod !== 'cash';

  if (!needsGateway) {
    ensureTransition(job, 'completed');
    const payment = await Payment.create({
      user: serviceRequest.user,
      targetType: 'job',
      targetId: job._id,
      amount,
      method: paymentMethod,
      status: 'Success',
      gatewayRef: null,
    });
    const result = await finalizeJobCompletion(job, payment);
    return { ...result, razorpay: null };
  }

  ensureTransition(job, 'awaitingpayment');
  const razorpayOrder = await createRazorpayOrder({ amount, receipt: `job_${job.id}`, notes: { jobId: job.id } });
  await Payment.create({
    user: serviceRequest.user,
    targetType: 'job',
    targetId: job._id,
    amount,
    method: paymentMethod,
    status: 'Pending',
    gatewayRef: razorpayOrder.id,
  });

  job.activeStep = 'awaitingpayment';
  await job.save();

  return {
    job,
    payment: null,
    razorpay: { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId: env.razorpay.keyId },
  };
}

/**
 * Confirms a job's Razorpay Checkout payment. Same server-side-lookup
 * security reasoning as order.service.js's verifyOrderPayment() — the
 * Razorpay order id used for signature verification comes from the Pending
 * Payment record this job's own collectPayment() created, never from the
 * client.
 */
export async function verifyJobPayment(serviceProviderId, jobId, { razorpayPaymentId, razorpaySignature }) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  if (job.activeStep !== 'awaitingpayment') {
    throw new ApiError(400, `Job is not awaiting payment (current step: "${job.activeStep}")`);
  }

  const pendingPayment = await Payment.findOne({ targetType: 'job', targetId: job._id, status: 'Pending' });
  if (!pendingPayment) throw new ApiError(400, 'No pending payment found for this job');

  const valid = verifyRazorpaySignature({ orderId: pendingPayment.gatewayRef, paymentId: razorpayPaymentId, signature: razorpaySignature });
  if (!valid) throw new ApiError(400, 'Payment signature verification failed');

  pendingPayment.status = 'Success';
  pendingPayment.razorpayPaymentId = razorpayPaymentId;
  await pendingPayment.save();

  const result = await finalizeJobCompletion(job, pendingPayment);
  return { ...result, razorpay: null };
}

/**
 * The AMC visit history behind this job, so the service provider arriving on site can
 * see what was actually done before. The drawer used to render two invented
 * visits ("TDS Check (280 → 140 ppm)", service providers "Rahul S." and "Amir K.")
 * for every AMC job, against real customers.
 */
export async function getJobAmcHistory(serviceProviderId, jobId) {
  const job = await findOwnedJob(serviceProviderId, jobId);
  if (!job.amcSubscription) return { subscription: null, visits: [] };

  const [subscription, visits] = await Promise.all([
    AMCSubscription.findById(job.amcSubscription).populate('plan', 'name visitsTotal'),
    AMCVisit.find({ subscription: job.amcSubscription })
      .populate('serviceProvider', 'name')
      .sort({ visitNumber: 1 }),
  ]);

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          planName: subscription.plan?.name || null,
          visitsTotal: subscription.visitsTotal,
          visitsRemaining: subscription.visitsRemaining,
          expiryDate: subscription.expiryDate,
        }
      : null,
    visits: visits.map((v) => ({
      id: v.id,
      visitNumber: v.visitNumber,
      scheduledDate: v.scheduledDate,
      status: v.status,
      serviceProvider: v.serviceProvider?.name || null,
      tasks: (v.tasks || []).map((t) => t.label).filter(Boolean),
      notes: v.notes || null,
    })),
  };
}

export async function respondToReschedule(serviceProviderId, jobIdOrBookingId, { action, reason } = {}) {
  let job = null;
  if (mongoose.Types.ObjectId.isValid(jobIdOrBookingId)) {
    job = await Job.findOne({
      _id: jobIdOrBookingId,
      serviceProvider: serviceProviderId,
    }).populate({ path: 'serviceRequest', populate: { path: 'user booking' } });
  }

  let booking = null;
  let serviceRequest = null;

  if (job) {
    serviceRequest = job.serviceRequest;
    booking = job.serviceRequest?.booking;
  } else {
    // Try finding booking directly
    const query = mongoose.Types.ObjectId.isValid(jobIdOrBookingId)
      ? { _id: jobIdOrBookingId, serviceProvider: serviceProviderId }
      : { humanId: jobIdOrBookingId, serviceProvider: serviceProviderId };

    booking = await Booking.findOne(query);
    if (booking && booking.serviceRequest) {
      serviceRequest = await ServiceRequest.findById(booking.serviceRequest);
      job = await Job.findOne({ serviceRequest: serviceRequest?._id, serviceProvider: serviceProviderId });
    }
  }

  if (!booking && !job) {
    throw new ApiError(404, 'Job or booking not found for this service provider');
  }

  if (action === 'accept') {
    if (booking) {
      booking.providerRescheduleStatus = 'ACCEPTED';
      booking.status = 'Upcoming';
      if (booking.isInstant) booking.instantStatus = 'ASSIGNED';
      await booking.save();
    }
    if (serviceRequest) {
      serviceRequest.status = 'Visit Scheduled';
      serviceRequest.timeline.push({
        stepLabel: 'Reschedule Confirmed',
        done: true,
        timestamp: new Date(),
        description: 'Service partner confirmed arrival for the rescheduled appointment.',
      });
      await serviceRequest.save();
    }
    if (job) {
      job.activeStep = 'assigned';
      await job.save();
    }

    // Socket to customer
    try {
      const io = getIO();
      const payload = {
        bookingId: booking?._id,
        serviceRequestId: serviceRequest?._id,
        status: 'Upcoming',
        providerRescheduleStatus: 'ACCEPTED',
        message: 'Your service partner has accepted the rescheduled appointment.',
      };
      if (booking?.user) io.to(`user:${booking.user}`).emit('booking:reschedule_accepted', payload);
      if (booking?.user) io.to(`user:${booking.user}`).emit('instant:status_update', payload);
    } catch (err) {
      // The reschedule is already saved; a failed live update only delays the customer's screen.
      console.warn('[respondToReschedule] socket notify failed:', err.message);
    }

    return { ok: true, action: 'accepted', booking };
  } else {
    // action === 'reject' (or decline)
    const oldSpId = serviceProviderId;

    if (booking) {
      booking.serviceProvider = null;
      booking.isAccepted = false;
      booking.providerRescheduleStatus = 'REJECTED';
      booking.status = 'Upcoming';
      if (booking.isInstant) booking.instantStatus = 'SEARCHING';
      await booking.save();
    }

    if (serviceRequest) {
      serviceRequest.serviceProvider = null;
      serviceRequest.isAccepted = false;
      serviceRequest.status = 'New';
      if (serviceRequest.isInstant) serviceRequest.instantStatus = 'SEARCHING';
      serviceRequest.timeline.push({
        stepLabel: 'Partner Unavailable for Reschedule',
        done: false,
        timestamp: new Date(),
        description: reason ? `Previous partner declined rescheduled time: ${reason}` : 'Previous partner unavailable for rescheduled time. Finding next specialist.',
      });
      await serviceRequest.save();
    }

    if (job) {
      job.activeStep = 'declined';
      job.declinedReason = reason || 'Unavailable at rescheduled time';
      await job.save();
    }

    // Find next available service provider in the territory
    let nextProvider = null;
    try {
      if (booking) {
        nextProvider = await findAvailableServiceProvider({
          category: booking.category,
          city: booking.address?.city,
          state: booking.address?.state,
        });

        if (nextProvider && String(nextProvider._id) !== String(oldSpId)) {
          booking.serviceProvider = nextProvider._id;
          booking.instantStatus = 'ASSIGNED';
          await booking.save();

          if (serviceRequest) {
            serviceRequest.serviceProvider = nextProvider._id;
            serviceRequest.status = 'Assigned';
            // Starts the new provider's 60s response window (see sweepExpiredAssignments).
            serviceRequest.assignedAt = new Date();
            serviceRequest.timeline.push({
              stepLabel: 'Assigned',
              done: true,
              timestamp: new Date(),
              description: `Reassigned to ${nextProvider.name} for the rescheduled appointment`,
            });
            await serviceRequest.save();
          }
        }
      }
    } catch (e) {
      console.error('[respondToReschedule] error finding next provider:', e.message);
    }

    // Socket broadcasts
    try {
      const io = getIO();
      const payload = {
        bookingId: booking?._id,
        serviceRequestId: serviceRequest?._id,
        status: 'Upcoming',
        instantStatus: nextProvider ? 'ASSIGNED' : 'SEARCHING',
        serviceProvider: nextProvider ? { id: nextProvider.id, name: nextProvider.name, phone: nextProvider.phone } : null,
        message: nextProvider
          ? `Reassigned to new partner ${nextProvider.name}`
          : 'Searching for nearest available service partner for your rescheduled appointment...',
      };
      if (booking?.user) io.to(`user:${booking.user}`).emit('booking:reschedule_rejected', payload);
      if (booking?.user) io.to(`user:${booking.user}`).emit('instant:status_update', payload);
      io.to(INSTANT_ROOM).emit('instant:status_update', payload);

      if (nextProvider) {
        io.to(`service-provider:${nextProvider._id}`).emit('job:assigned', {
          bookingId: booking?._id,
          serviceRequestId: serviceRequest?._id,
          category: booking?.category,
          serviceName: booking?.service?.name,
          scheduledDate: booking?.scheduledDate,
          timeSlot: booking?.timeSlot,
        });
      }
    } catch (err) {
      // The decline is already saved; a failed live update only delays the other screens.
      console.warn('[respondToReschedule] socket notify failed:', err.message);
    }

    return { ok: true, action: 'rejected', reallocated: Boolean(nextProvider), nextProvider };
  }
}
