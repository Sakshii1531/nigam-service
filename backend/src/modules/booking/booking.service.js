import mongoose from 'mongoose';
import { Booking } from './booking.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { loadBookableOfferings } from '../catalog/offeringBrowse.service.js';
import { buildQuote, detectCoverage } from '../catalog/quote.service.js';
import { toCustomerQuote } from '../catalog/commercialView.js';
import { catalogError, CATALOG_ERROR_CODES } from '../catalog/catalogErrors.js';
import { toPaise, toRupees } from '../catalog/money.js';
import { redeemCoins, creditCoins } from '../payments-wallet/wallet.service.js';
import { estimateServiceProviderEarnings } from '../shared/serviceProviderEarnings.js';
import { Job } from '../service-provider/job.model.js';
import { PartOrder } from '../service-provider/partOrder.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';

// How long a booking keeps looking for a service provider before giving up.
export const SEARCH_WINDOW_MS = 15 * 60 * 1000;

export const SEARCH_END_MESSAGES = Object.freeze({
  PROVIDERS_NOT_ACCEPTING: 'Sorry, our service providers are not accepting service requests right now. Please retry after a few minutes.',
  NO_PROVIDERS_NEARBY: 'There is no service provider near you right now. Kindly retry after some time.',
});
import { findAvailableServiceProvider, rankServiceProviders } from '../shared/assignmentEngine.js';
import { createServiceRequest, transitionStatus, emitWarrantyClaimNotification, scheduleDispatchTimeout } from '../service-requests/serviceRequest.service.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { runInTransaction } from '../../utils/transaction.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';

/**
 * Creates a Booking + its linked ServiceRequest in one flow, matching
 * BookingSuccess.jsx's expectation of an immediately-assigned service provider
 * (BACKEND_CONTEXT.md §3.5). Price is resolved server-side from the catalog —
 * never trust a client-supplied price for what's actually charged.
 */
import { getIO } from '../../sockets/io.js';
import { INSTANT_ROOM } from '../../sockets/instantBooking.gateway.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The offering's required-info answers, validated against its questions. */
function resolveRequiredInfo(offering, answers = []) {
  const byKey = new Map(answers.map((a) => [a.key, String(a.value ?? '').trim()]));
  const missing = [];
  const resolved = [];
  for (const question of offering.requiredInfo || []) {
    const value = byKey.get(question.key) || '';
    if (!value) {
      if (question.required) missing.push(question.label);
      continue;
    }
    if (question.type === 'select' && question.options?.length && !question.options.includes(value)) {
      throw new ApiError(400, `"${value}" is not a valid answer for "${question.label}"`);
    }
    resolved.push({ key: question.key, label: question.label, value });
  }
  if (missing.length) throw new ApiError(400, `Please answer: ${missing.join(', ')}`);
  return resolved;
}

/** The frozen commercial snapshot (rupees) from one priced quote line. */
function commercialSnapshot(quote, line) {
  return {
    offeringId: line.offering.id,
    offeringCode: line.offering.code,
    offeringName: line.offering.name,
    bookingType: line.offering.bookingType,
    category: line.category,
    productType: line.productType,
    variant: line.variant,
    service: line.service,
    pricingUnit: line.offering.pricingUnit,
    unitLabel: line.offering.unitLabel,
    quantity: line.quantity,
    unitPrice: toRupees(line.unitPrice),
    baseAmount: toRupees(line.baseAmount),
    discount: { code: line.discount > 0 ? quote.couponCode : null, amount: toRupees(line.discount) },
    coverage: { type: line.coverage.type, amount: toRupees(line.coverage.amount) },
    isExpress: line.isExpress,
    expressFee: toRupees(line.expressFee),
    taxableAmount: toRupees(line.taxableAmount),
    gstPercent: line.gstPercent,
    gstAmount: toRupees(line.gstAmount),
    finalAmount: toRupees(line.finalAmount),
    coinsApplied: toRupees(quote.coinsApplied),
    spPayoutUnit: toRupees(line.spPayoutUnit),
    expressSpIncentive: toRupees(line.expressSpIncentive),
    spPayoutTotal: toRupees(line.spPayoutTotal),
    nccMargin: toRupees(line.nccMargin),
    rate: line.rate,
    pricedAt: quote.pricedAt,
  };
}

/**
 * Creates a Booking for ONE catalogue offering (docs/master-catalogue Phase 4).
 *
 * The offering is priced with the same engine as POST /catalog/quote — never
 * from anything the client sends — and the full commercial snapshot is frozen
 * on the booking. The client's `expectedFinalAmount` must match the server's
 * price, so a rate that changed while the customer was checking out surfaces
 * as 409 PRICE_CHANGED (with the new quote) instead of a silent surprise.
 * Unknown / inactive / unrated / unserviceable offerings are refused — there
 * is no fallback to "some service in the category" any more (client Test 12).
 */
export async function createBooking(userId, data) {
  const isInstant = Boolean(data.isInstant || data.timeGroup === 'ASAP' || data.timeSlot?.time === 'ASAP' || data.timeSlot?.time?.includes?.('ASAP'));
  // An ASAP booking is an express booking (assumption A3): it pays the express
  // fee, and an offering with express disabled cannot be booked ASAP.
  const isExpress = Boolean(data.isExpress || isInstant);
  const location = { city: data.address?.city || null, pincode: data.address?.pincode || null };

  const [entry] = await loadBookableOfferings({ _id: data.offeringId }, location);
  if (!entry) throw catalogError(CATALOG_ERROR_CODES.OFFERING_NOT_BOOKABLE, 'This service is not available right now.', 400, { offeringId: data.offeringId });
  const { offering } = entry;
  const categoryKey = offering.category.key;
  const requiredInfo = resolveRequiredInfo(offering, data.requiredInfo);

  // Warranty/AMC/EW coverage is decided here, server-side, before pricing —
  // the same detection POST /catalog/quote runs for the same appliance details.
  const { coverageType, detection } = await detectCoverage({
    userId,
    categoryKey,
    warranty: { brand: data.brand, serialNo: data.serialNo, purchaseDate: data.purchaseDate, applianceId: data.applianceId },
  });
  const { warrantyStatus, brandId, applianceId, amcSubscriptionId, extendedWarrantyOrderId } = detection;

  const quote = await buildQuote(
    {
      lines: [{ offeringId: data.offeringId, variantId: data.variantId || null, quantity: data.quantity, isExpress }],
      couponCode: data.couponCode || null,
      useCoins: Boolean(data.useCoins),
      paymentMode: data.paymentMode || 'after',
      location,
    },
    { userId, coverageType },
  );
  const [line] = quote.lines;
  if (toPaise(data.expectedFinalAmount) !== line.finalAmount) {
    const newTotal = toRupees(line.finalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    throw catalogError('PRICE_CHANGED', `The price for ${line.offering.name} has changed to ₹${newTotal}.`, 409, {
      quote: toCustomerQuote(quote),
    });
  }

  const commercial = commercialSnapshot(quote, line);
  const totalPrice = commercial.finalAmount;
  const serviceName = line.offering.name;

  // Coins are taken before the booking exists and returned if it fails.
  if (quote.coinsToRedeem > 0) await redeemCoins(userId, quote.coinsToRedeem, { reason: 'redeemed' });

  const customerCity = data.address?.city || '';
  const customerState = data.address?.state || '';
  const customerLat = data.address?.latitude != null ? Number(data.address.latitude) : null;
  const customerLng = data.address?.longitude != null ? Number(data.address.longitude) : null;

  // Nearest-to-farthest 1-by-1 service provider selection in the territory
  const serviceProvider = await findAvailableServiceProvider({
    category: categoryKey,
    city: customerCity,
    state: customerState,
    latitude: customerLat,
    longitude: customerLng,
  });

  const initialInstantStatus = isInstant ? (serviceProvider ? 'ASSIGNED' : 'SEARCHING') : null;

  // Booking + ServiceRequest + the assignment transition + the back-link from
  // booking to request are one unit of work: a failure partway through used to
  // leave an orphaned Booking pointing at no service request (or a request
  // pointing at a booking that never got its serviceRequest set), which nothing
  // downstream could act on. Everything with an un-rollback-able side effect —
  // the Razorpay order, notifications, the socket broadcast — stays outside.
  let created;
  try {
    created = await runInTransaction(async (session) => {
      const [booking] = await Booking.create([{
        user: userId,
        offering: offering._id,
        commercial,
        isExpress,
        requiredInfo,
        category: categoryKey,
        productType: line.productType?.name,
        service: {
          slug: offering.service.slug,
          name: serviceName,
          price: commercial.unitPrice,
          desc: offering.description || serviceName,
          unit: offering.unitLabel,
        },
        brand: data.brand,
        quantity: line.quantity,
        scheduledDate: isInstant ? new Date() : data.scheduledDate,
        timeSlot: isInstant ? { date: 'Today (ASAP)', time: 'ASAP (Right Now)' } : data.timeSlot,
        address: data.address,
        fullName: data.fullName,
        mobile: data.mobile,
        paymentMode: data.paymentMode || 'after',
        advanceAmount: toRupees(quote.advanceAmount),
        totalPrice,
        serviceProvider: serviceProvider ? serviceProvider._id : null,
        isAccepted: false,
        status: isInstant ? 'Ongoing' : 'Upcoming',
        isInstant,
        instantStatus: initialInstantStatus,
        instantRequestedAt: isInstant ? new Date() : null,
        searchExpiresAt: new Date(Date.now() + SEARCH_WINDOW_MS),
      }], session ? { session } : {});

      const cleanServiceName = serviceName.replace(new RegExp(`^${escapeRegex(categoryKey)}\\s*[-—:]*\\s*`, 'i'), '');
      const displayServiceTitle = serviceName.toLowerCase().startsWith(categoryKey.toLowerCase())
        ? serviceName
        : `${categoryKey} — ${cleanServiceName || serviceName}`;

      let serviceRequest = await createServiceRequest({
        user: userId,
        serviceProvider: serviceProvider ? serviceProvider._id : null,
        isAccepted: false,
        assignedAt: serviceProvider ? new Date() : null,
        customerLocation: (customerLat != null && customerLng != null) ? { latitude: customerLat, longitude: customerLng } : undefined,
        booking: booking._id,
        completionOtp: booking.completionOtp,
        category: categoryKey,
        description: displayServiceTitle,
        requestMode: 'B2C',
        zone: data.address?.city || undefined,
        warranty: warrantyStatus === 'Out of Warranty' ? 'Out of Warranty' : 'In Warranty',
        brand: brandId,
        appliance: applianceId,
        amcSubscription: amcSubscriptionId,
        extendedWarrantyOrder: extendedWarrantyOrderId,
        isInstant,
        instantStatus: initialInstantStatus,
      }, { session });

      if (serviceProvider) {
        serviceRequest = await transitionStatus(serviceRequest.id, 'Assigned', {
          description: isInstant ? `Instant auto-assigned to ${serviceProvider.name}` : `Auto-assigned to ${serviceProvider.name}`,
          session,
        });
      }

      booking.serviceRequest = serviceRequest._id;
      await booking.save(session ? { session } : undefined);

      return { booking, serviceRequest };
    });
  } catch (err) {
    // The booking never came to exist — give the customer their coins back.
    if (quote.coinsToRedeem > 0) await creditCoins(userId, quote.coinsToRedeem, { reason: 'refund' }).catch(() => {});
    throw err;
  }
  const { booking, serviceRequest } = created;

  // Deferred out of the transaction above: createServiceRequest skips this when
  // handed a session so a rolled-back claim never notifies the brand.
  await emitWarrantyClaimNotification(serviceRequest);

  await emitNotification('booking.created', { user: userId, category: categoryKey, bookingId: booking.id });
  if (serviceProvider) {
    await emitNotification('serviceProvider.assigned', {
      user: userId,
      serviceProviderName: serviceProvider.name,
      serviceRequestId: serviceRequest.id,
    });
  }

  // Broadcast real-time dispatch event via Socket.IO for instant pop-up on service provider apps
  const io = getIO();
  if (io) {
    const estEarnings = await estimateServiceProviderEarnings(serviceRequest, booking).catch(() => 0);
    const cleanServiceName = serviceName.replace(new RegExp(`^${escapeRegex(categoryKey)}\\s*[-—:]*\\s*`, 'i'), '');
    const displayServiceTitle = serviceName.toLowerCase().startsWith(categoryKey.toLowerCase())
      ? serviceName
      : `${categoryKey} — ${cleanServiceName || serviceName}`;

    const jobPayload = {
      bookingId: booking.id,
      serviceRequestId: serviceRequest.id,
      category: categoryKey,
      serviceName,
      product: displayServiceTitle,
      address: data.address ? `${data.address.house || ''}, ${data.address.landmark || ''}, ${data.address.city || ''}`.trim().replace(/^,\s*/, '') : 'Customer Address',
      city: customerCity,
      state: customerState,
      fullName: data.fullName,
      customerName: data.fullName,
      mobile: data.mobile,
      totalPrice: booking.totalPrice,
      estEarnings,
      isInstant,
      scheduledTime: booking.timeSlot?.time || (isInstant ? 'ASAP' : 'Scheduled'),
      scheduledDateLabel: booking.timeSlot?.date || 'Today',
      assignedServiceProviderId: serviceProvider ? String(serviceProvider._id) : null,
      assignedServiceProviderUserId: serviceProvider ? String(serviceProvider.user) : null,
      instantStatus: initialInstantStatus,
      isAvailableRequest: !serviceProvider,
    };

    if (serviceProvider) {
      io.to(`service-provider:${serviceProvider._id}`).emit('job:assigned', jobPayload);
      io.to(`service-provider:${serviceProvider.user}`).emit('job:assigned', jobPayload);
      io.to(`service-provider:${serviceProvider._id}`).emit('instant:new_request', jobPayload);
      io.to(`service-provider:${serviceProvider.user}`).emit('instant:new_request', jobPayload);
      io.to(`service-provider:${serviceProvider._id}`).emit('instant:job_offered', jobPayload);
      io.to(`service-provider:${serviceProvider.user}`).emit('instant:job_offered', jobPayload);

      // Schedule 60-second waterfall cascade timeout for Candidate #1
      scheduleDispatchTimeout(serviceRequest._id, serviceProvider._id);
    } else if (customerCity) {
      // If no single candidate matched, broadcast to city channel
      io.to(`city:${customerCity.toLowerCase().trim()}`).emit('job:new_available', jobPayload);
    } else {
      // If no single candidate matched, broadcast to instant room, serviceProviders room, and city channel
      io.to(INSTANT_ROOM).emit('instant:new_request', jobPayload);
      io.to(INSTANT_ROOM).emit('job:new_available', jobPayload);
      io.to(INSTANT_ROOM).emit('instant:job_offered', jobPayload);
      io.to('serviceProviders').emit('job:new_available', jobPayload);
      io.to('serviceProviders').emit('instant:job_offered', jobPayload);
      if (customerCity) {
        io.to(`city:${customerCity.toLowerCase().trim()}`).emit('job:new_available', jobPayload);
        io.to(`city:${customerCity.toLowerCase().trim()}`).emit('instant:new_request', jobPayload);
      }
    }
  }

  // An advance booking has to actually be charged. The advance amount was
  // computed and stored, but nothing ever collected it — the payment screens
  // navigated straight to the success page, so every "paid" booking was unpaid.
  let razorpay = null;
  if (booking.advanceAmount > 0 && data.paymentMethod && data.paymentMethod !== 'Cash') {
    const gatewayOrder = await createRazorpayOrder({
      amount: booking.advanceAmount,
      receipt: `booking_${booking.id}`,
      notes: { bookingId: booking.id },
    });
    await Payment.create({
      user: userId,
      targetType: 'booking',
      targetId: booking._id,
      amount: booking.advanceAmount,
      method: data.paymentMethod,
      status: 'Pending',
      gatewayRef: gatewayOrder.id,
    });
    razorpay = {
      orderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      keyId: env.razorpay.keyId,
    };
  }

  return { booking, serviceRequest, serviceProvider, razorpay };
}

/**
 * Confirms a booking advance paid through Razorpay Checkout. The order id used
 * for signature verification is read from the Pending Payment this booking
 * created — never taken from the client (same reasoning as
 * order.service.js's verifyOrderPayment).
 */
export async function verifyBookingPayment(userId, bookingId, { razorpayPaymentId, razorpaySignature }) {
  const booking = await findOwnedOr404(userId, bookingId);

  const pendingPayment = await Payment.findOne({ targetType: 'booking', targetId: booking._id, status: 'Pending' });
  if (!pendingPayment) throw new ApiError(400, 'No pending payment found for this booking');

  const valid = verifyRazorpaySignature({
    orderId: pendingPayment.gatewayRef,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment signature verification failed');

  pendingPayment.status = 'Success';
  pendingPayment.razorpayPaymentId = razorpayPaymentId;
  await pendingPayment.save();

  booking.advancePaid = true;
  await booking.save();

  return { booking, payment: pendingPayment };
}

async function findOwnedOr404(userId, id) {
  let booking = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    booking = await Booking.findById(id)
      .populate('serviceProvider', 'name phone rating avatar photo')
      .populate({
        path: 'serviceRequest',
        select: 'humanId status timeline tracking warranty brand category description job completionOtp',
        populate: { path: 'brand', select: 'name logo' },
      });
    if (!booking) {
      booking = await Booking.findOne({ serviceRequest: id })
        .populate('serviceProvider', 'name phone rating avatar photo')
        .populate({
          path: 'serviceRequest',
          select: 'humanId status timeline tracking warranty brand category description job completionOtp',
          populate: { path: 'brand', select: 'name logo' },
        });
    }
  }
  if (!booking) {
    booking = await Booking.findOne({ humanId: id })
      .populate('serviceProvider', 'name phone rating avatar photo')
      .populate({
        path: 'serviceRequest',
        select: 'humanId status timeline tracking warranty brand category description job completionOtp',
        populate: { path: 'brand', select: 'name logo' },
      });
    if (!booking) {
      const sr = await ServiceRequest.findOne({ humanId: id }).select('_id');
      if (sr) {
        booking = await Booking.findOne({ serviceRequest: sr._id })
          .populate('serviceProvider', 'name phone rating avatar photo')
          .populate({
            path: 'serviceRequest',
            select: 'humanId status timeline tracking warranty brand category description job completionOtp',
            populate: { path: 'brand', select: 'name logo' },
          });
      }
    }
  }
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.user) !== String(userId)) throw new ApiError(403, 'Not authorized to view this booking');
  return booking;
}

export async function getBooking(userId, id) {
  return findOwnedOr404(userId, id);
}

/**
 * The customer's own sign-off on a spare part the technician requested —
 * gates the super-admin approval queue (adminPartOrderService rejects any
 * status change until this reads 'Approved'). Before this, a technician
 * could add a real-money part to the bill with the customer only ever
 * informed after the fact, never actually asked.
 */
export async function respondToPartRequest(userId, bookingId, { approve }) {
  const booking = await findOwnedOr404(userId, bookingId);
  if (!booking.partApproval || booking.partApproval.status !== 'Pending') {
    throw new ApiError(400, 'There is no spare part request awaiting your approval on this booking.');
  }

  booking.partApproval.status = approve ? 'Approved' : 'Rejected';
  booking.partApproval.respondedAt = new Date();
  await booking.save();

  if (booking.serviceRequest) {
    const job = await Job.findOne({ serviceRequest: booking.serviceRequest });
    if (job) {
      await PartOrder.updateMany(
        { job: job._id, customerApprovalStatus: 'Pending' },
        { customerApprovalStatus: approve ? 'Approved' : 'Rejected', customerRespondedAt: new Date() },
      );
      if (!approve) {
        // Rejected orders are done — nothing for super-admin to act on.
        await PartOrder.updateMany(
          { job: job._id, customerApprovalStatus: 'Rejected', status: 'Pending' },
          { status: 'Rejected' },
        );
        const rejectedNames = booking.partApproval.partNames?.join(', ') || 'the requested spare part';
        job.revisit = job.revisit || {};
        job.revisit.notes = `Customer declined the spare part request (${rejectedNames}) — service cancelled.`;
        job.activeStep = 'cancelled';
        await job.save();

        // A declined cost ends the job outright — reuses the same
        // booking+SR cancellation and service-provider socket notice as any
        // other cancellation (see closeBooking), rather than leaving the job
        // silently parked at completed_pending with no way for the customer
        // or service provider to know it's over.
        await closeBooking(booking, {
          reason: `Customer declined the spare part request (${rejectedNames})`,
          timelineDescription: `Service cancelled — customer declined the spare part request (${rejectedNames})`,
        });

        try {
          const provider = await ServiceProvider.findById(job.serviceProvider);
          if (provider?.user) {
            const sr = await ServiceRequest.findById(booking.serviceRequest);
            await emitNotification('job.part_rejected_cancelled', {
              user: provider.user,
              category: sr?.category,
              partName: rejectedNames,
              amount: booking.partApproval.amount,
              jobId: job.id,
            }).catch(() => {});
          }
        } catch (_err) {
          // Non-critical notification failure
        }
      }
    }
  }

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('booking:updated', {
      bookingId: booking.id,
      partApprovalStatus: booking.partApproval.status,
    });
  } catch (_err) {
    // Non-critical socket emission failure
  }

  return booking;
}

/**
 * Undoes a customer's earlier rejection of a spare-part request: re-approves
 * the cost and reopens the booking/service request/job exactly to the state
 * they were in right before the rejection (parked at completed_pending,
 * awaiting Super Admin dispatch) — the same state a fresh approval leaves
 * them in, so it re-enters the existing PartOrder approval queue unchanged
 * rather than needing its own dispatch/reschedule logic.
 */
export async function reRaisePartRequest(userId, bookingId) {
  const booking = await findOwnedOr404(userId, bookingId);
  if (booking.status !== 'Cancelled' || booking.partApproval?.status !== 'Rejected') {
    throw new ApiError(400, 'This booking was not cancelled by a declined spare-part request.');
  }
  if (!booking.serviceRequest) {
    throw new ApiError(400, 'This booking has no linked service request to reopen.');
  }

  const job = await Job.findOne({ serviceRequest: booking.serviceRequest });
  if (!job) throw new ApiError(404, 'The job for this booking no longer exists.');

  booking.partApproval.status = 'Approved';
  booking.partApproval.respondedAt = new Date();
  booking.status = 'Ongoing';
  booking.instantStatus = booking.isInstant ? 'PARTS_PENDING' : booking.instantStatus;
  booking.cancellationReason = null;
  booking.cancelledAt = null;
  await booking.save();

  const sr = await ServiceRequest.findById(booking.serviceRequest);
  if (sr) {
    sr.status = 'Spare Ordered';
    sr.cancellationReason = null;
    sr.cancelledAt = null;
    sr.timeline.push({
      stepLabel: 'Spare Ordered',
      done: true,
      timestamp: new Date(),
      description: 'Customer re-approved the previously declined spare part request',
    });
    await sr.save();
  }

  job.activeStep = 'completed_pending';
  job.revisit = job.revisit || {};
  job.revisit.status = 'Pending Approval';
  job.revisit.notes = 'Customer re-approved the spare part request.';
  await job.save();

  await PartOrder.updateMany(
    { job: job._id, customerApprovalStatus: 'Rejected' },
    { customerApprovalStatus: 'Approved', status: 'Pending', customerRespondedAt: new Date() },
  );

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('booking:updated', {
      bookingId: booking.id,
      status: booking.status,
      partApprovalStatus: booking.partApproval.status,
    });
    if (job.serviceProvider) {
      io.to(`service-provider:${job.serviceProvider}`).emit('job:updated', {
        jobId: job.id,
        serviceRequestId: sr?.id,
      });
    }
  } catch (_err) {
    // Non-critical socket emission failure
  }

  try {
    const provider = await ServiceProvider.findById(job.serviceProvider);
    if (provider?.user) {
      await emitNotification('job.part_reraised', {
        user: provider.user,
        category: sr?.category,
        partName: booking.partApproval.partNames?.join(', '),
        jobId: job.id,
      }).catch(() => {});
    }
  } catch (_err) {
    // Non-critical notification failure
  }

  return booking;
}

export async function listBookings(userId, { status, page, limit, sort } = {}) {
  const query = { user: userId };
  if (status) {
    if (status === 'Upcoming') {
      query.status = { $in: ['Upcoming', 'Rescheduled'] };
    } else if (status === 'Ongoing') {
      query.status = { $in: ['Ongoing', 'Parts Pending'] };
    } else {
      query.status = status;
    }
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Booking.find(query)
      .populate('serviceProvider', 'name phone rating avatar photo')
      .populate({
        path: 'serviceRequest',
        select: 'humanId status timeline tracking warranty category description brand instantStatus',
        populate: { path: 'brand', select: 'name logo' },
      })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Booking.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function cancelBooking(userId, id, reason) {
  const booking = await findOwnedOr404(userId, id);
  if (booking.status === 'Completed') throw new ApiError(400, 'Cannot cancel a completed booking');
  if (booking.status === 'Cancelled') return booking;

  return closeBooking(booking, {
    reason: reason || 'Cancelled by customer',
    timelineDescription: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer',
  });
}

/** Cancels the booking and its service request, and tells everyone watching. */
async function closeBooking(booking, { reason, timelineDescription, searchEndReason = null }) {
  booking.status = 'Cancelled';
  if (booking.isInstant) {
    booking.instantStatus = 'CANCELLED';
  }
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  if (searchEndReason) booking.searchEndReason = searchEndReason;
  await booking.save();

  if (booking.serviceRequest) {
    try {
      const srId = typeof booking.serviceRequest === 'object' ? booking.serviceRequest._id : booking.serviceRequest;
      const sr = await ServiceRequest.findById(srId);
      if (sr && sr.status !== 'Cancelled' && sr.status !== 'Closed' && sr.status !== 'Completed') {
        sr.status = 'Cancelled';
        if (sr.isInstant) sr.instantStatus = 'CANCELLED';
        sr.cancellationReason = reason;
        sr.cancelledAt = new Date();
        if (searchEndReason) sr.searchEndReason = searchEndReason;
        sr.timeline.push({
          stepLabel: 'Cancelled',
          done: true,
          timestamp: new Date(),
          description: timelineDescription,
        });
        await sr.save();
      }
    } catch (e) {
      console.error('[booking.cancel] error transitioning service request:', e.message);
    }
  }

  // Real-time socket broadcast
  try {
    const io = getIO();
    const payload = {
      bookingId: booking._id,
      serviceRequestId: booking.serviceRequest?._id || booking.serviceRequest,
      status: 'Cancelled',
      instantStatus: 'CANCELLED',
      reason: booking.cancellationReason,
      searchEndReason: booking.searchEndReason || null,
    };
    io.to(`user:${booking.user}`).emit('booking:cancelled', payload);
    io.to(`user:${booking.user}`).emit('instant:status_update', payload);
    io.to(INSTANT_ROOM).emit('instant:status_update', payload);
    if (booking.serviceProvider) {
      const spId = typeof booking.serviceProvider === 'object' ? booking.serviceProvider._id : booking.serviceProvider;
      io.to(`service-provider:${spId}`).emit('job:cancelled', payload);
    }
  } catch (_e) {
    // ignore socket errors
  }

  return booking;
}

/**
 * Stops searching for a service provider once a booking has gone
 * SEARCH_WINDOW_MS without anyone accepting it. Before this, an unaccepted
 * booking was re-offered and re-assigned indefinitely — the customer watched a
 * spinner forever and the server kept dispatching it on every sweep.
 *
 * The reason recorded decides what the customer is told: providers exist in
 * their area (or were offered the job) but none accepted, versus nobody serves
 * their area at all. Runs on an interval from server.js.
 */
export async function expireStaleSearches(now = new Date()) {
  const stale = await Booking.find({
    searchExpiresAt: { $ne: null, $lte: now },
    isAccepted: { $ne: true },
    status: { $nin: ['Cancelled', 'Completed'] },
  });

  let expired = 0;
  for (const booking of stale) {
    try {
      const sr = booking.serviceRequest ? await ServiceRequest.findById(booking.serviceRequest) : null;
      // Accepted through the service request (a Job exists) — not searching.
      if (sr?.isAccepted || ['Engineer Accepted', 'Visit Scheduled', 'Engineer Reached', 'Diagnosis Done', 'Repair Completed', 'Customer Confirmation', 'Closed'].includes(sr?.status)) {
        booking.searchExpiresAt = null;
        await booking.save();
        continue;
      }

      const wasOffered = Boolean(
        sr && (sr.declinedBy?.length || sr.serviceProvider || sr.timeline?.some((step) => step.stepLabel === 'Assigned')),
      );
      let providersNearby = false;
      if (!wasOffered) {
        const nearby = await rankServiceProviders({
          category: booking.category,
          city: booking.address?.city,
          state: booking.address?.state,
          includeUnavailable: true,
        });
        providersNearby = nearby.length > 0;
      }
      const searchEndReason = wasOffered || providersNearby ? 'PROVIDERS_NOT_ACCEPTING' : 'NO_PROVIDERS_NEARBY';
      const message = SEARCH_END_MESSAGES[searchEndReason];

      await closeBooking(booking, {
        reason: message,
        timelineDescription: `Search timed out after ${SEARCH_WINDOW_MS / 60000} minutes — ${searchEndReason === 'NO_PROVIDERS_NEARBY' ? 'no service provider serves this area' : 'no service provider accepted'}`,
        searchEndReason,
      });
      await emitNotification('booking.search_expired', { user: booking.user, reason: searchEndReason, message });
      expired += 1;
    } catch (err) {
      console.warn('[search-expiry]', booking.id, err.message);
    }
  }
  return { checked: stale.length, expired };
}

export async function rescheduleBooking(userId, id, { scheduledDate, timeSlot, reason } = {}) {
  const booking = await findOwnedOr404(userId, id);
  if (booking.status === 'Completed') throw new ApiError(400, 'Cannot reschedule a completed booking');
  if (booking.status === 'Cancelled') throw new ApiError(400, 'Cannot reschedule a cancelled booking');

  const newDate = scheduledDate ? new Date(scheduledDate) : booking.scheduledDate;
  const newSlot = timeSlot || booking.timeSlot;

  booking.status = 'Rescheduled';
  if (booking.isInstant) {
    booking.instantStatus = 'RESCHEDULED';
  }
  booking.scheduledDate = newDate;
  booking.timeSlot = newSlot;
  booking.rescheduledAt = new Date();
  booking.rescheduleReason = reason || 'Rescheduled by customer';
  booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;

  if (booking.serviceProvider) {
    booking.providerRescheduleStatus = 'PENDING';
  }
  // Still unaccepted: give the new time its own search window.
  if (!booking.isAccepted) {
    booking.searchExpiresAt = new Date(Date.now() + SEARCH_WINDOW_MS);
  }

  await booking.save();

  if (booking.serviceRequest) {
    try {
      const srId = typeof booking.serviceRequest === 'object' ? booking.serviceRequest._id : booking.serviceRequest;
      const sr = await ServiceRequest.findById(srId);
      if (sr) {
        sr.status = 'Visit Scheduled';
        if (sr.isInstant) sr.instantStatus = 'RESCHEDULED';
        sr.timeline.push({
          stepLabel: 'Rescheduled',
          done: true,
          timestamp: new Date(),
          description: reason ? `Rescheduled by customer: ${reason}` : 'Rescheduled by customer',
        });
        await sr.save();
      }
    } catch (e) {
      console.error('[booking.reschedule] error updating service request:', e.message);
    }
  }

  // Real-time socket broadcast
  try {
    const io = getIO();
    const dateStr = newDate ? new Date(newDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled date';
    const slotStr = typeof newSlot === 'object' ? (newSlot?.time || newSlot?.date) : newSlot;

    const payload = {
      bookingId: booking._id,
      humanId: booking.humanId,
      serviceRequestId: booking.serviceRequest?._id || booking.serviceRequest,
      status: 'Rescheduled',
      instantStatus: 'RESCHEDULED',
      scheduledDate: newDate,
      timeSlot: newSlot,
      reason: booking.rescheduleReason,
      serviceName: booking.service?.name,
      customerName: booking.fullName,
      scheduledDateLabel: dateStr,
      scheduledTime: slotStr,
    };

    io.to(`user:${booking.user}`).emit('booking:rescheduled', payload);
    io.to(`user:${booking.user}`).emit('instant:status_update', payload);
    io.to(INSTANT_ROOM).emit('instant:status_update', payload);

    if (booking.serviceProvider) {
      const spId = typeof booking.serviceProvider === 'object' ? booking.serviceProvider._id : booking.serviceProvider;
      io.to(`service-provider:${spId}`).emit('job:rescheduled', payload);
    }
  } catch (_e) {
    // ignore socket errors
  }

  return booking;
}

/**
 * Allows the customer to restart the 15-minute partner search for an expired
 * or cancelled booking without having to enter all booking details again.
 */
export async function retrySearchBooking(userId, id) {
  const booking = await findOwnedOr404(userId, id);
  if (booking.status === 'Completed') throw new ApiError(400, 'Cannot retry a completed booking');
  if (booking.isAccepted) throw new ApiError(400, 'This booking has already been accepted by a partner');

  // Reactivate the booking for a fresh 15-minute search window
  booking.status = booking.isInstant ? 'Ongoing' : 'Upcoming';
  booking.instantStatus = 'SEARCHING';
  booking.isAccepted = false;
  booking.serviceProvider = null;
  booking.searchEndReason = null;
  booking.cancellationReason = null;
  booking.searchExpiresAt = new Date(Date.now() + SEARCH_WINDOW_MS);
  booking.instantRequestedAt = new Date();
  await booking.save();

  let serviceRequest = null;
  if (booking.serviceRequest) {
    try {
      const srId = typeof booking.serviceRequest === 'object' ? booking.serviceRequest._id : booking.serviceRequest;
      serviceRequest = await ServiceRequest.findById(srId);
      if (serviceRequest) {
        serviceRequest.status = 'New';
        serviceRequest.isAccepted = false;
        serviceRequest.serviceProvider = null;
        serviceRequest.instantStatus = 'SEARCHING';
        serviceRequest.declinedBy = [];
        serviceRequest.declinedOpenOfferBy = [];
        serviceRequest.declinedAssignmentBy = [];
        serviceRequest.timeline.push({
          stepLabel: 'Search Restarted',
          done: true,
          timestamp: new Date(),
          description: 'Customer restarted partner search for 15 minutes',
        });
        await serviceRequest.save();
      }
    } catch (e) {
      console.error('[booking.retrySearch] error updating service request:', e.message);
    }
  }

  // Attempt to find and assign an available partner immediately
  const customerCity = booking.address?.city || '';
  const customerState = booking.address?.state || '';
  const customerLat = booking.address?.latitude;
  const customerLng = booking.address?.longitude;

  const serviceProvider = await findAvailableServiceProvider({
    category: booking.category,
    city: customerCity,
    state: customerState,
    latitude: customerLat,
    longitude: customerLng,
  });

  if (serviceProvider && serviceRequest) {
    serviceRequest.serviceProvider = serviceProvider._id;
    serviceRequest.assignedAt = new Date();
    await serviceRequest.save();
    await transitionStatus(serviceRequest.id, 'Assigned', {
      description: booking.isInstant ? `Instant auto-assigned to ${serviceProvider.name}` : `Auto-assigned to ${serviceProvider.name}`,
    });
    booking.serviceProvider = serviceProvider._id;
    booking.instantStatus = 'ASSIGNED';
    await booking.save();

    await emitNotification('serviceProvider.assigned', {
      user: userId,
      serviceProviderName: serviceProvider.name,
      serviceRequestId: serviceRequest.id,
    });
  }

  // Real-time socket broadcast
  try {
    const io = getIO();
    if (io) {
      const estEarnings = serviceRequest
        ? await estimateServiceProviderEarnings(serviceRequest, booking).catch(() => 0)
        : 0;

      const jobPayload = {
        bookingId: booking._id,
        humanId: booking.humanId,
        serviceRequestId: serviceRequest?._id || serviceRequest?.id,
        category: booking.category,
        serviceName: booking.service?.name,
        product: serviceRequest?.description || booking.service?.name,
        address: booking.address ? `${booking.address.house || ''}, ${booking.address.landmark || ''}, ${booking.address.city || ''}`.trim().replace(/^,\s*/, '') : 'Customer Address',
        city: customerCity,
        state: customerState,
        fullName: booking.fullName,
        customerName: booking.fullName,
        mobile: booking.mobile,
        totalPrice: booking.totalPrice,
        estEarnings,
        isInstant: Boolean(booking.isInstant),
        scheduledTime: booking.timeSlot?.time || (booking.isInstant ? 'ASAP' : 'Scheduled'),
        scheduledDateLabel: booking.timeSlot?.date || 'Today',
        assignedServiceProviderId: serviceProvider ? String(serviceProvider._id) : null,
        assignedServiceProviderUserId: serviceProvider ? String(serviceProvider.user) : null,
        instantStatus: booking.instantStatus,
        isAvailableRequest: !serviceProvider,
        searchExpiresAt: booking.searchExpiresAt,
      };

      io.to(`user:${booking.user}`).emit('booking:status_update', jobPayload);
      io.to(`user:${booking.user}`).emit('instant:status_update', jobPayload);
      io.to(INSTANT_ROOM).emit('instant:status_update', jobPayload);

      if (serviceProvider) {
        io.to(`service-provider:${serviceProvider.id || serviceProvider._id}`).emit('instant:job_offered', jobPayload);
        io.to(`service-provider:${serviceProvider.id || serviceProvider._id}`).emit('instant:new_request', jobPayload);
        io.to(`service-provider:${serviceProvider.id || serviceProvider._id}`).emit('job:assigned', jobPayload);
      } else {
        io.to(INSTANT_ROOM).emit('instant:job_offered', jobPayload);
        io.to(INSTANT_ROOM).emit('instant:new_request', jobPayload);
        io.to(INSTANT_ROOM).emit('job:new_available', jobPayload);
        io.to('serviceProviders').emit('job:new_available', jobPayload);
      }
    }
  } catch (_e) {
    // ignore socket errors
  }

  return { booking, serviceRequest, serviceProvider };
}
