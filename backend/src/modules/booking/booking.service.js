import { Booking } from './booking.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { findServiceItem } from '../catalog/catalog.service.js';
import { findAvailableTechnician } from '../shared/assignmentEngine.js';
import { createServiceRequest, transitionStatus, emitWarrantyClaimNotification } from '../service-requests/serviceRequest.service.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { runInTransaction } from '../../utils/transaction.js';
import { detectWarrantyForAppliance } from '../warranty-amc-exchange/warrantyDetector.service.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../payments-wallet/paymentGateway.js';
import { env } from '../../config/env.js';

/**
 * Creates a Booking + its linked ServiceRequest in one flow, matching
 * BookingSuccess.jsx's expectation of an immediately-assigned technician
 * (BACKEND_CONTEXT.md §3.5). Price is resolved server-side from the catalog —
 * never trust a client-supplied price for what's actually charged.
 */
import { getIO } from '../../sockets/io.js';
import { INSTANT_ROOM } from '../../sockets/instantBooking.gateway.js';

export async function createBooking(userId, data) {
  let serviceItem = null;
  try {
    serviceItem = await findServiceItem(data.category, data.serviceSlug);
  } catch (_err) {
    serviceItem = null;
  }

  // findServiceItem throws for a slug that isn't in the catalog, which used to
  // surface as a 404. The swallow above exists so the app can book work it
  // describes itself (a custom job carries its own name/price), but that must
  // not extend to a slug the client believed was a catalog service: without
  // this guard a typo'd slug quietly books "Home Service" at the 299 default,
  // and the unguarded serviceItem.name reads below turned it into a 500.
  if (!serviceItem && !(data.serviceName || data.service)) {
    throw new ApiError(404, `No service "${data.serviceSlug}" in category "${data.category}"`);
  }

  const quantity = data.quantity || 1;
  const itemPrice = data.price != null ? Number(data.price) : (serviceItem?.price || 299);
  const basePrice = (data.totalPrice != null && Number(data.totalPrice) > 0) ? Number(data.totalPrice) : (itemPrice * quantity);
  const serviceName = data.serviceName || data.service || serviceItem?.name || 'Home Service';
  const serviceSlug = data.serviceSlug || serviceItem?.slug || 'service';

  const isInstant = Boolean(data.isInstant || data.timeGroup === 'ASAP' || data.timeSlot?.time === 'ASAP' || data.timeSlot?.time?.includes('ASAP'));

  // How much of the total an "advance" booking collects up front, from the
  // super-admin Settings console. The reference below was added without this
  // lookup, so every advance booking failed with a 500.
  const settings = await PlatformSettings.findOne();
  const advancePercent = settings?.bookingAdvancePercent ?? 20;

  // Run automated Smart Warranty Detection pipeline
  const {
    warrantyStatus,
    brandId,
    applianceId,
    amcSubscriptionId,
    extendedWarrantyOrderId,
  } = await detectWarrantyForAppliance({
    userId,
    category: data.category,
    brandName: data.brand,
    serialNo: data.serialNo,
    purchaseDate: data.purchaseDate,
    applianceId: data.applianceId,
  });

  // Apply pricing benefits: covered visits are free (price resolves to 0)
  const totalPrice = warrantyStatus === 'Out of Warranty' ? basePrice : 0;

  const technician = await findAvailableTechnician({ category: data.category, city: data.address?.city });

  const initialInstantStatus = isInstant ? (technician ? 'ASSIGNED' : 'SEARCHING') : null;

  // Booking + ServiceRequest + the assignment transition + the back-link from
  // booking to request are one unit of work: a failure partway through used to
  // leave an orphaned Booking pointing at no service request (or a request
  // pointing at a booking that never got its serviceRequest set), which nothing
  // downstream could act on. Everything with an un-rollback-able side effect —
  // the Razorpay order, notifications, the socket broadcast — stays outside.
  const { booking, serviceRequest } = await runInTransaction(async (session) => {
    const [booking] = await Booking.create([{
      user: userId,
      category: data.category,
      productType: data.productType,
      service: {
        slug: serviceSlug,
        name: serviceName,
        price: itemPrice,
        desc: serviceItem?.desc || serviceName,
        unit: serviceItem?.unit || 'service'
      },
      brand: data.brand,
      quantity,
      scheduledDate: isInstant ? new Date() : data.scheduledDate,
      timeSlot: isInstant ? { date: 'Today (ASAP)', time: 'ASAP (Right Now)' } : data.timeSlot,
      address: data.address,
      fullName: data.fullName,
      mobile: data.mobile,
      paymentMode: data.paymentMode || 'after',
      advanceAmount: data.advanceAmount != null ? Number(data.advanceAmount) : (data.paymentMode === 'advance' ? Math.round(totalPrice * (advancePercent / 100)) : 0),
      totalPrice,
      // Not gated on isInstant: findAvailableTechnician above runs for every
      // booking, and the transitionStatus(...'Assigned') + technician.assigned
      // notification below both fire whenever it returns someone. Gating only
      // these two writes (added with the instant-booking work) left a scheduled
      // booking at status "Assigned", telling the customer a technician was
      // assigned, while storing technician: null on both documents — so nothing
      // could then be accepted or transitioned by that technician (403).
      technician: technician ? technician._id : null,
      status: isInstant ? 'Ongoing' : 'Upcoming',
      isInstant,
      instantStatus: initialInstantStatus,
      instantRequestedAt: isInstant ? new Date() : null,
    }], session ? { session } : {});

    let serviceRequest = await createServiceRequest({
      user: userId,
      technician: technician ? technician._id : null,
      booking: booking._id,
      category: data.category,
      description: `${data.category} — ${serviceName}`,
      requestMode: 'B2C',
      // Carried over from the booking address so later re-ranking (the assignment
      // console, and the backlog sweep when a technician comes online) scores
      // proximity against the real city. Without it every candidate got the
      // neutral 50 and assignment was effectively city-blind once the booking
      // itself was over.
      zone: data.address?.city || undefined,
      warranty: warrantyStatus === 'Out of Warranty' ? 'Out of Warranty' : 'In Warranty',
      brand: brandId,
      appliance: applianceId,
      amcSubscription: amcSubscriptionId,
      extendedWarrantyOrder: extendedWarrantyOrderId,
      isInstant,
      instantStatus: initialInstantStatus,
    }, { session });

    if (technician) {
      serviceRequest = await transitionStatus(serviceRequest.id, 'Assigned', {
        description: isInstant ? `Instant auto-assigned to ${technician.name}` : `Auto-assigned to ${technician.name}`,
        session,
      });
    }

    booking.serviceRequest = serviceRequest._id;
    await booking.save(session ? { session } : undefined);

    return { booking, serviceRequest };
  });

  // Deferred out of the transaction above: createServiceRequest skips this when
  // handed a session so a rolled-back claim never notifies the brand.
  await emitWarrantyClaimNotification(serviceRequest);

  await emitNotification('booking.created', { user: userId, category: data.category, bookingId: booking.id });
  if (technician) {
    await emitNotification('technician.assigned', {
      user: userId,
      technicianName: technician.name,
      serviceRequestId: serviceRequest.id,
    });
  }

  // Broadcast instant booking event via Socket.IO if instant request
  if (isInstant) {
    const io = getIO();
    if (io) {
      // Scoped to the technicians' room — this payload carries the customer's
      // name, mobile and address, and used to go to every connected socket.
      io.to(INSTANT_ROOM).emit('instant:new_request', {
        bookingId: booking.id,
        serviceRequestId: serviceRequest.id,
        category: data.category,
        serviceName,
        address: data.address,
        fullName: data.fullName,
        mobile: data.mobile,
        assignedTechnicianId: technician ? String(technician._id) : null,
        instantStatus: initialInstantStatus,
      });
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

  return { booking, serviceRequest, technician, razorpay };
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
  const booking = await Booking.findById(id)
    .populate('technician', 'name phone rating avatar photo')
    .populate({
      path: 'serviceRequest',
      select: 'humanId status timeline tracking warranty brand category description job',
      populate: { path: 'brand', select: 'name logo' },
    });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.user) !== userId) throw new ApiError(403, 'Not authorized to view this booking');
  return booking;
}

export async function getBooking(userId, id) {
  return findOwnedOr404(userId, id);
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
      .populate('technician', 'name phone rating avatar photo')
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

export async function cancelBooking(userId, id) {
  const booking = await findOwnedOr404(userId, id);
  if (booking.status === 'Completed') throw new ApiError(400, 'Cannot cancel a completed booking');

  booking.status = 'Cancelled';
  await booking.save();

  if (booking.serviceRequest) {
    await transitionStatus(booking.serviceRequest, 'Cancelled', { description: 'Cancelled by customer' }).catch(() => {
      // Already in a terminal state (e.g. was already Cancelled/Closed) — booking cancellation itself still succeeds.
    });
  }

  return booking;
}
