import { Job } from './job.model.js';
import { Technician } from './technician.model.js';
import { EarningsTally } from './earningsTally.model.js';
import { PartOrder } from './partOrder.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { transitionStatus } from '../service-requests/serviceRequest.service.js';
import { Booking } from '../booking/booking.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../warranty-amc-exchange/amcVisit.model.js';
import { ExtendedWarrantyOrder } from '../warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { computeCharges } from '../shared/pricingEngine.js';
import { raiseTechnicianClaim } from './claim.service.js';
import { getOrCreateConversation } from '../chat/conversation.service.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { JOB_STEP_TRANSITIONS, SERVICE_REQUEST_TRANSITIONS } from '../../config/constants.js';
import { RateCard } from '../brand-admin/rateCard.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';

// Default only — the live share is PlatformSettings.technicianCommissionPercent.
const DEFAULT_TECH_EARNINGS_SHARE = 0.3; // 30% of the D2C subtotal

async function technicianShare() {
  const settings = await PlatformSettings.findOne();
  const percent = settings?.technicianCommissionPercent;
  return percent != null ? percent / 100 : DEFAULT_TECH_EARNINGS_SHARE;
}

// Covered work (Brand Warranty / AMC / EW) is priced from the brand's RateCard
// for that appliance category. This used to be a flat 150 because no RateCard
// existed; it does now, so the flat value is only the fallback for a brand that
// has not configured a card for the category.
const DEFAULT_COVERED_VISIT_EARNINGS = 150;

async function coveredVisitEarnings(serviceRequest) {
  if (!serviceRequest?.brand || !serviceRequest?.category) return DEFAULT_COVERED_VISIT_EARNINGS;
  const card = await RateCard.findOne({ brand: serviceRequest.brand, category: serviceRequest.category });
  return card?.laborRate ?? DEFAULT_COVERED_VISIT_EARNINGS;
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

async function findOwnedJob(technicianId, jobId) {
  const job = await Job.findById(jobId).populate({ path: 'serviceRequest', populate: { path: 'user booking' } });
  if (!job) throw new ApiError(404, 'Job not found');
  if (String(job.technician) !== technicianId) throw new ApiError(403, 'Not authorized to access this job');
  return job;
}

/**
 * Job.activeStep and ServiceRequest.status are two separate state machines
 * (JOB_STEP_TRANSITIONS / SERVICE_REQUEST_TRANSITIONS) that this service keeps
 * in lockstep — every technician action that moves the job forward also drives
 * the ServiceRequest through its matching status, since brand-admin/customer
 * screens read the ServiceRequest, not the Job. `srStatus` is the target
 * ServiceRequest status; transitionStatus() itself throws if that move isn't
 * legal from the current status, which is the desired behavior here (a
 * mismatch means the two machines have drifted out of sync — a real bug, not
 * something to silently swallow).
 */
async function simpleTransition(technicianId, jobId, toStep, srStatus) {
  const job = await findOwnedJob(technicianId, jobId);

  let targetStep = toStep;
  if (job.activeStep === 'revisit_scheduled' && toStep === 'ontheway') targetStep = 'revisit_ontheway';
  if ((job.activeStep === 'revisit_scheduled' || job.activeStep === 'revisit_ontheway') && toStep === 'inspection') targetStep = 'revisit_arrived';
  if ((job.activeStep === 'revisit_arrived' || job.activeStep === 'revisit_complete') && toStep === 'repaircomplete') targetStep = 'revisit_complete';

  ensureTransition(job, targetStep);
  job.activeStep = targetStep;
  await job.save();
  if (srStatus) {
    const serviceRequest = await ServiceRequest.findById(job.serviceRequest._id || job.serviceRequest);
    if (SERVICE_REQUEST_TRANSITIONS[serviceRequest?.status]?.includes(srStatus)) {
      await transitionStatus(job.serviceRequest, srStatus, { description: `Job step -> ${targetStep}` });
    }
  }

  if (targetStep === 'ontheway' || targetStep === 'revisit_ontheway') {
    try {
      const sr = await ServiceRequest.findById(job.serviceRequest._id || job.serviceRequest);
      const tech = await Technician.findById(technicianId);
      if (sr?.user) {
        await emitNotification('technician.ontheway', {
          user: sr.user,
          technicianName: tech?.name || 'Technician',
          bookingId: sr.booking,
          serviceRequestId: sr._id || sr.id,
        });
      }
    } catch (e) {
      console.error('[notification] Failed to emit technician.ontheway:', e.message);
    }
  }

  return job;
}

// Populated on the pre-accept ServiceRequest so the "AMC Plan Details" /
// "Extended Warranty" cards on the job screen show the customer's real
// coverage before the technician has accepted. Those cards used to be
// hardcoded — "AMC Gold Plan", "15 Jan 2027", "3" visits remaining — for every
// AMC job regardless of which plan (or how many visits) the customer actually
// had left. Once accepted, acceptJob() below snapshots this same data onto the
// Job document itself (job.amc / job.ew), so listActiveJobs needs no populate.
const AMC_POPULATE = { path: 'amcSubscription', populate: { path: 'plan', select: 'name' } };
const EW_POPULATE = { path: 'extendedWarrantyOrder' };

export async function listAvailableJobs(technicianId) {
  const acceptedServiceRequestIds = await Job.distinct('serviceRequest');
  return ServiceRequest.find({
    technician: technicianId,
    status: 'Assigned',
    _id: { $nin: acceptedServiceRequestIds },
  })
    .populate('user booking')
    .populate(AMC_POPULATE)
    .populate(EW_POPULATE)
    .sort({ createdAt: -1 });
}

export async function listActiveJobs(technicianId) {
  return Job.find({ technician: technicianId, activeStep: { $ne: 'completed' } })
    .populate({ path: 'serviceRequest', populate: { path: 'user booking' } })
    .sort({ createdAt: -1 });
}

export async function listJobHistory(technicianId, { status = 'all', type = 'all', search = '', page = 1, limit = 50 } = {}) {
  const query = { technician: technicianId };

  if (status === 'completed') {
    query.activeStep = 'completed';
  } else if (status === 'cancelled') {
    query.repairStatus = 'cancelled';
  } else if (status === 'in_progress') {
    query.activeStep = { $nin: ['completed', 'idle'] };
  } else if (status === 'quick' || type === 'quick') {
    query.type = 'NCC Paid Service';
  } else if (status === 'warranty' || status === 'foc' || type === 'warranty' || type === 'foc') {
    query.type = { $in: ['Brand Warranty', 'Under Warranty', 'NCC Extended Warranty'] };
  } else if (status === 'amc' || type === 'amc') {
    query.type = { $in: ['AMC Service', 'AMC Visit'] };
  }

  if (type === 'quick') {
    query.type = 'NCC Paid Service';
  } else if (type === 'warranty' || type === 'foc') {
    query.type = { $in: ['Brand Warranty', 'Under Warranty', 'NCC Extended Warranty'] };
  } else if (type === 'amc') {
    query.type = { $in: ['AMC Service', 'AMC Visit'] };
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Job.find(query)
      .populate({
        path: 'serviceRequest',
        populate: [
          { path: 'user' },
          { path: 'booking' },
          { path: 'amcSubscription', populate: { path: 'plan', select: 'name' } },
          { path: 'extendedWarrantyOrder' },
        ],
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Job.countDocuments(query)
  ]);

  let filtered = items;
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = items.filter(j => {
      const sr = j.serviceRequest;
      const srTitle = (sr?.title || sr?.serviceType || '').toLowerCase();
      const srCategory = (sr?.category || '').toLowerCase();
      const srBrand = (sr?.brand || '').toLowerCase();
      const custName = (sr?.user?.name || sr?.contactName || '').toLowerCase();
      const jobId = String(j._id || j.id || '').toLowerCase();
      const ticketId = (sr?.ticketId || '').toLowerCase();
      return srTitle.includes(s) || srCategory.includes(s) || srBrand.includes(s) || custName.includes(s) || jobId.includes(s) || ticketId.includes(s);
    });
  }

  return {
    items: filtered,
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

export async function getJob(technicianId, id) {
  return findOwnedJob(technicianId, id);
}

/**
 * Accepting a job creates the Job doc (idle -> assigned). `type` and the
 * AMC/EW linkage are accepted as explicit input for now — there's no real AMC/
 * Extended-Warranty *purchase* flow yet (deliberately deferred in Phase 5), so
 * a job can't fully infer its own type from the ServiceRequest/Booking alone.
 * Real bookings (which Phase 4 does build end-to-end) always resolve to
 * 'NCC Paid Service' automatically; anything else needs an explicit override,
 * which in a fuller implementation would come from the brand/AMC context
 * instead of being technician (or test) supplied.
 */
export async function acceptJob(technicianId, serviceRequestId, { type, amcSubscriptionId, extendedWarrantyOrderId } = {}) {
  const serviceRequest = await ServiceRequest.findById(serviceRequestId);
  if (!serviceRequest) throw new ApiError(404, 'Service request not found');
  if (String(serviceRequest.technician) !== technicianId) throw new ApiError(403, 'This request is not assigned to you');

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
  const share = await technicianShare();

  const jobData = {
    serviceRequest: serviceRequest._id,
    technician: technicianId,
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
    // Security: subscriptionId is caller-supplied — without this check a technician
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
  await Technician.findByIdAndUpdate(technicianId, { $inc: { activeJobsCount: 1 } });

  // A technician can only be assigned (and therefore accept) once the SR itself
  // is 'Assigned' — booking.service.js's auto-assign flow already puts it there
  // for D2C jobs; non-D2C fixtures must do the same before calling acceptJob.
  await transitionStatus(serviceRequest._id, 'Engineer Accepted', { description: 'Technician accepted the job' });

  // Customer<->technician chat only makes sense once both sides of a real,
  // verified pairing exist — this is that moment (see chat.routes.js's doc
  // comment for why there's no client-facing "create conversation" endpoint).
  await getOrCreateConversation({ serviceRequest: serviceRequest._id, customer: serviceRequest.user, technician: technicianId });

  return job;
}

export const startTravel = (technicianId, jobId) => simpleTransition(technicianId, jobId, 'ontheway', 'Visit Scheduled');
export const arrive = (technicianId, jobId) => simpleTransition(technicianId, jobId, 'inspection', 'Engineer Reached');
export const confirmRepairComplete = (technicianId, jobId) =>
  simpleTransition(technicianId, jobId, 'repaircomplete', 'Repair Completed');

/** Diagnosis is content submitted *during* the inspection step (Screens 5/6 in
 * the frontend), not itself a Job.activeStep transition — arrive() already
 * moved to 'inspection'; submitSpareParts() is what advances past it. It does
 * drive the ServiceRequest forward though ('Engineer Reached' -> 'Diagnosis Done'). */
export async function submitDiagnosis(technicianId, jobId, diagnosisData) {
  const job = await findOwnedJob(technicianId, jobId);
  if (job.activeStep !== 'inspection') {
    throw new ApiError(400, `Diagnosis can only be submitted during inspection (current step: "${job.activeStep}")`);
  }
  job.diagnosis = diagnosisData;
  await job.save();

  // Only the first submission moves the request on. Saving again — a technician
  // editing their notes, or the inspection step submitting diagnosis before the
  // parts list — used to attempt an illegal 'Diagnosis Done' -> 'Diagnosis Done'
  // transition and fail the whole call with a 400.
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest);
  if (SERVICE_REQUEST_TRANSITIONS[serviceRequest?.status]?.includes('Diagnosis Done')) {
    await transitionStatus(job.serviceRequest, 'Diagnosis Done', { description: 'Technician submitted diagnosis' });
  }
  return job;
}

/**
 * Selecting spare parts both submits the parts list and advances
 * inspection -> spareapproval. For warranty-covered jobs (anything but D2C
 * 'NCC Paid Service'), parts are free to the customer ("Covered" in the
 * frontend's AMC/BrandWarranty/ExtendedWarranty overview screens) — the
 * technician gets reimbursed instead via an auto-created FOC Claim per part,
 * matching TechContext.jsx's placePartsOrder behavior.
 */
export async function submitSpareParts(technicianId, jobId, { parts = [], additionalServices = [] }) {
  const job = await findOwnedJob(technicianId, jobId);
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
        raiseTechnicianClaim(technicianId, {
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

  return job;
}

/**
 * Technician marks that a spare part is required for the job.
 * Creates a PartOrder for Super Admin approval/dispatch, transitions the service request
 * to 'Spare Required' / 'Spare Ordered', and parks the job at 'completed_pending' until
 * the part is delivered and the revisit is scheduled by Super Admin.
 */
export async function requestSparePart(
  technicianId,
  jobId,
  { partName, sku, price, qty = 1, orderSource = 'NCC Warehouse', parts = [], notes = '' } = {},
) {
  const job = await findOwnedJob(technicianId, jobId);

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
        technician: technicianId,
        job: job._id,
        partName: item.name || partName || 'Spare Part',
        sku: item.sku || sku || undefined,
        qty: Number(item.qty || qty || 1),
        price: Number(item.price != null ? item.price : price) || 0,
        orderSource: orderSource || 'NCC Warehouse',
        status: 'Pending',
      }),
    ),
  );

  const primaryPartOrder = createdOrders[0];
  job.revisit = {
    status: 'Pending Approval',
    partOrderId: primaryPartOrder?._id,
    notes: notes || 'Spare part requested by technician',
  };
  await job.save();

  // Progress service request status and timeline
  const sr = await ServiceRequest.findById(job.serviceRequest);
  if (sr) {
    if (SERVICE_REQUEST_TRANSITIONS[sr.status]?.includes('Diagnosis Done')) {
      await transitionStatus(job.serviceRequest, 'Diagnosis Done', { description: 'Technician completed diagnosis' });
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
    if (sr.booking) {
      const booking = await Booking.findById(sr.booking);
      if (booking) {
        customerUserId = booking.user;
        booking.status = 'Ongoing';
        booking.instantStatus = 'PARTS_PENDING';
        await booking.save();
      }
    } else if (sr.user) {
      customerUserId = sr.user;
    }

    if (customerUserId) {
      const partNames = items.map((i) => i.name).join(', ');
      await emitNotification('technician.parts_pending', {
        user: customerUserId,
        category: sr.category,
        partName: partNames,
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
export async function generateBilling(technicianId, jobId) {
  const job = await findOwnedJob(technicianId, jobId);
  // A job that came back for a spare part bills through the revisit branch, the
  // same way simpleTransition aliases travel/arrive/repair-complete. Without
  // this a rescheduled job dead-ended at 'revisit_complete': billing was
  // refused, payment could never be collected, the customer's booking stayed
  // Upcoming forever and the technician was never paid for the return visit.
  const billingStep = job.activeStep === 'revisit_complete' ? 'revisit_billing' : 'billing';
  ensureTransition(job, billingStep);

  const serviceCharge = job.isD2C ? job.price : 0;
  const sparePartsTotal = job.isD2C ? job.spareParts.filter((p) => p.checked).reduce((sum, p) => sum + p.price, 0) : 0;
  const additionalServicesTotal = job.additionalServices.filter((s) => s.checked).reduce((sum, s) => sum + s.price, 0);

  const charges = computeCharges({ laborRate: serviceCharge, partsCost: sparePartsTotal, additionalCharges: additionalServicesTotal });
  const billingShare = await technicianShare();
  const technicianEarnings = job.isD2C ? Math.round(charges.subtotal * billingShare) : job.estEarnings;

  job.billingEstimate = {
    serviceCharge,
    sparePartsTotal,
    additionalServicesTotal,
    gstPercent: charges.gstPercent,
    total: charges.total,
    technicianEarnings,
  };
  job.activeStep = billingStep;
  await job.save();
  return job;
}

/**
 * Shared terminal-action logic once a payment is actually confirmed (either
 * immediately for Cash/already-covered jobs, or after verifyJobPayment()
 * confirms a real Razorpay Checkout payment below): credits the technician's
 * earnings (atomic — same findOneAndUpdate pattern as wallet.service.js),
 * decrements the linked AMCSubscription/ExtendedWarrantyOrder if this was
 * that kind of job, and closes out the ServiceRequest. Not a multi-document
 * transaction — same documented tradeoff as order.service.js (DATA_MODEL.md
 * Phase 5 addendum).
 */
async function finalizeJobCompletion(job, payment) {
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest);
  const technicianId = job.technician;

  await EarningsTally.findOneAndUpdate(
    { technician: technicianId },
    {
      $inc: {
        today: job.billingEstimate.technicianEarnings,
        total: job.billingEstimate.technicianEarnings,
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
        { status: 'Completed', technician: technicianId },
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

  await Technician.findByIdAndUpdate(technicianId, { $inc: { activeJobsCount: -1, completedJobsCount: 1 } });

  // confirmRepairComplete() already drove the SR to 'Repair Completed'; collecting
  // payment is what hands it off to the customer for final sign-off. 'Closed' itself
  // requires an actual customer confirmation action, which is out of Phase 6's scope.
  await transitionStatus(serviceRequest._id, 'Customer Confirmation', { description: 'Payment collected by technician' });

  // The customer's own screens (My Bookings, the booking detail) are keyed on
  // Booking.status, which nothing in the job lifecycle ever advanced — a paid,
  // finished job still displayed as "Upcoming" to the customer, and stayed that
  // way permanently. This is the single completion path for both the Cash and
  // the gateway-verified routes, so syncing here covers both.
  if (serviceRequest.booking) {
    const booking = await Booking.findById(serviceRequest.booking);
    if (booking && booking.status !== 'Cancelled') {
      booking.status = 'Completed';
      if (booking.isInstant) booking.instantStatus = 'COMPLETED';
      await booking.save();
    }
  }

  await emitNotification('payment.success', { user: serviceRequest.user, amount: payment.amount });
  await emitNotification('service.completed', { user: serviceRequest.user, serviceRequestId: serviceRequest.id });

  return { job, payment };
}

/**
 * Two payment paths, same reasoning as order.service.js's createOrder()
 * (post-Phase-15, real Razorpay integration — no legitimate gateway lets a
 * server charge a customer with zero interaction):
 *  - amount <= 0 (fully covered visit) or paymentMethod === 'Cash' (technician
 *    collected cash/card-in-hand on-site — no gateway involved at all):
 *    completes synchronously exactly as before.
 *  - amount > 0 and a real gateway method: moves the job to 'awaitingpayment'
 *    and returns a Razorpay order for the frontend/technician's device to open
 *    Checkout.js against (e.g. handed to the customer to complete in person).
 *    verifyJobPayment() below is what actually finishes the job once Checkout
 *    reports success.
 */
export async function collectPayment(technicianId, jobId, { paymentMethod = 'Cash', otp, signatureUrl } = {}) {
  const job = await findOwnedJob(technicianId, jobId);

  // Auto-compute billingEstimate if missing
  if (!job.billingEstimate || job.billingEstimate.total == null) {
    const serviceCharge = job.isD2C ? (job.price || 499) : 0;
    const sparePartsTotal = job.isD2C ? (job.spareParts || []).filter((p) => p.checked).reduce((sum, p) => sum + (p.price || 0), 0) : 0;
    const additionalServicesTotal = (job.additionalServices || []).filter((s) => s.checked).reduce((sum, s) => sum + (s.price || 0), 0);
    const charges = computeCharges({ laborRate: serviceCharge, partsCost: sparePartsTotal, additionalCharges: additionalServicesTotal });
    const billingShare = await technicianShare();
    const technicianEarnings = job.isD2C ? Math.round(charges.subtotal * billingShare) : (job.estEarnings || 250);
    job.billingEstimate = {
      serviceCharge,
      sparePartsTotal,
      additionalServicesTotal,
      gstPercent: charges.gstPercent,
      total: charges.total,
      technicianEarnings,
    };
  }

  if (otp) {
    if (!job.revisit) job.revisit = {};
    job.revisit.otp = otp;
  }
  if (signatureUrl) {
    if (!job.revisit) job.revisit = {};
    job.revisit.signatureUrl = signatureUrl;
  }

  const amount = job.billingEstimate.total;
  const needsGateway = amount > 0 && paymentMethod !== 'Cash' && paymentMethod !== 'cash';
  const serviceRequest = await ServiceRequest.findById(job.serviceRequest);

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
export async function verifyJobPayment(technicianId, jobId, { razorpayPaymentId, razorpaySignature }) {
  const job = await findOwnedJob(technicianId, jobId);
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
 * The AMC visit history behind this job, so the technician arriving on site can
 * see what was actually done before. The drawer used to render two invented
 * visits ("TDS Check (280 → 140 ppm)", technicians "Rahul S." and "Amir K.")
 * for every AMC job, against real customers.
 */
export async function getJobAmcHistory(technicianId, jobId) {
  const job = await findOwnedJob(technicianId, jobId);
  if (!job.amcSubscription) return { subscription: null, visits: [] };

  const [subscription, visits] = await Promise.all([
    AMCSubscription.findById(job.amcSubscription).populate('plan', 'name visitsTotal'),
    AMCVisit.find({ subscription: job.amcSubscription })
      .populate('technician', 'name')
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
      technician: v.technician?.name || null,
      tasks: (v.tasks || []).map((t) => t.label).filter(Boolean),
      notes: v.notes || null,
    })),
  };
}
