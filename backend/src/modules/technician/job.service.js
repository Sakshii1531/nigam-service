import { Job } from './job.model.js';
import { Technician } from './technician.model.js';
import { EarningsTally } from './earningsTally.model.js';
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
import { env } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { JOB_STEP_TRANSITIONS } from '../../config/constants.js';

const TECH_EARNINGS_SHARE = 0.3; // 30% of the D2C subtotal — matches the frontend's BillingEstimate.jsx note
// Flat per-visit payout for warranty/AMC/EW jobs — there's no brand RateCard yet
// (that's Phase 7 scope) to price a technician's visit fee on covered work, so
// this is a placeholder flat rate rather than a real computed one.
const FLAT_COVERED_VISIT_EARNINGS = 150;

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
  const job = await Job.findById(jobId);
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
  ensureTransition(job, toStep);
  job.activeStep = toStep;
  await job.save();
  if (srStatus) {
    await transitionStatus(job.serviceRequest, srStatus, { description: `Job step -> ${toStep}` });
  }
  return job;
}

export async function listAvailableJobs(technicianId) {
  const acceptedServiceRequestIds = await Job.find({ technician: technicianId }).distinct('serviceRequest');
  return ServiceRequest.find({
    technician: technicianId,
    status: 'Assigned',
    _id: { $nin: acceptedServiceRequestIds },
  }).sort({ createdAt: -1 });
}

export async function listActiveJobs(technicianId) {
  return Job.find({ technician: technicianId, activeStep: { $ne: 'completed' } }).sort({ createdAt: -1 });
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
  const jobType = type || (booking ? 'NCC Paid Service' : 'Brand Warranty');
  const isD2C = jobType === 'NCC Paid Service';
  const price = booking ? booking.totalPrice : 0;

  const jobData = {
    serviceRequest: serviceRequest._id,
    technician: technicianId,
    type: jobType,
    isD2C,
    isPartner: !isD2C,
    isNccEw: jobType === 'NCC Extended Warranty',
    price,
    estEarnings: isD2C ? Math.round(price * TECH_EARNINGS_SHARE) : FLAT_COVERED_VISIT_EARNINGS,
    activeStep: 'assigned',
  };

  if (jobType === 'AMC Visit' && amcSubscriptionId) {
    const subscription = await AMCSubscription.findById(amcSubscriptionId).populate('plan');
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

  if (jobType === 'NCC Extended Warranty' && extendedWarrantyOrderId) {
    const ewOrder = await ExtendedWarrantyOrder.findById(extendedWarrantyOrderId);
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
  await transitionStatus(job.serviceRequest, 'Diagnosis Done', { description: 'Technician submitted diagnosis' });
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
 * Computes the final bill. D2C jobs charge the base service price + checked
 * spare parts + checked extras; warranty-covered jobs only ever charge the
 * checked extras (parts were already turned into Claims above; the frontend's
 * job-type overview screens consistently show spare parts as "₹0 Covered").
 */
export async function generateBilling(technicianId, jobId) {
  const job = await findOwnedJob(technicianId, jobId);
  ensureTransition(job, 'billing');

  const serviceCharge = job.isD2C ? job.price : 0;
  const sparePartsTotal = job.isD2C ? job.spareParts.filter((p) => p.checked).reduce((sum, p) => sum + p.price, 0) : 0;
  const additionalServicesTotal = job.additionalServices.filter((s) => s.checked).reduce((sum, s) => sum + s.price, 0);

  const charges = computeCharges({ laborRate: serviceCharge, partsCost: sparePartsTotal, additionalCharges: additionalServicesTotal });
  const technicianEarnings = job.isD2C ? Math.round(charges.subtotal * TECH_EARNINGS_SHARE) : job.estEarnings;

  job.billingEstimate = {
    serviceCharge,
    sparePartsTotal,
    additionalServicesTotal,
    gstPercent: charges.gstPercent,
    total: charges.total,
    technicianEarnings,
  };
  job.activeStep = 'billing';
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
export async function collectPayment(technicianId, jobId, { paymentMethod = 'Cash' } = {}) {
  const job = await findOwnedJob(technicianId, jobId);
  // Guard billingEstimate access before ensureTransition's normal check runs
  // below — an out-of-order call (e.g. before the billing step) has no
  // billingEstimate at all, so reading .total off it would throw a raw 500
  // instead of the same clean 400 every other out-of-order action gets.
  if (job.activeStep !== 'billing') {
    throw new ApiError(400, `Cannot move from "${job.activeStep}" to "completed" (allowed: billing -> completed)`);
  }
  const amount = job.billingEstimate.total;
  const needsGateway = amount > 0 && paymentMethod !== 'Cash';
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
