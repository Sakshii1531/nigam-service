import { Booking } from './booking.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { findServiceItem } from '../catalog/catalog.service.js';
import { findAvailableTechnician } from '../shared/assignmentEngine.js';
import { createServiceRequest, transitionStatus } from '../service-requests/serviceRequest.service.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
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
  const serviceItem = await findServiceItem(data.category, data.serviceSlug);
  const quantity = data.quantity || 1;
  const basePrice = serviceItem.price * quantity;

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

  const booking = await Booking.create({
    user: userId,
    category: data.category,
    productType: data.productType,
    service: { slug: serviceItem.slug, name: serviceItem.name, price: serviceItem.price, desc: serviceItem.desc, unit: serviceItem.unit },
    brand: data.brand,
    quantity,
    scheduledDate: isInstant ? new Date() : data.scheduledDate,
    timeSlot: isInstant ? { date: 'Today (ASAP)', time: 'ASAP (Right Now)' } : data.timeSlot,
    address: data.address,
    fullName: data.fullName,
    mobile: data.mobile,
    paymentMode: data.paymentMode || 'after',
    advanceAmount: data.paymentMode === 'advance' ? Math.round(totalPrice * (advancePercent / 100)) : 0,
    totalPrice,
    technician: technician ? technician._id : null,
    status: isInstant ? 'Ongoing' : 'Upcoming',
    isInstant,
    instantStatus: initialInstantStatus,
    instantRequestedAt: isInstant ? new Date() : null,
  });

  let serviceRequest = await createServiceRequest({
    user: userId,
    technician: technician ? technician._id : null,
    booking: booking._id,
    category: data.category,
    description: `${data.category} — ${serviceItem.name}`,
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
  });

  if (technician) {
    serviceRequest = await transitionStatus(serviceRequest.id, 'Assigned', {
      description: isInstant ? `Instant auto-assigned to ${technician.name}` : `Auto-assigned to ${technician.name}`,
    });
  }

  booking.serviceRequest = serviceRequest._id;
  await booking.save();

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
        serviceName: serviceItem.name,
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
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Booking.find(query)
      .populate('technician', 'name phone rating avatar photo')
      .populate({
        path: 'serviceRequest',
        select: 'humanId status timeline tracking warranty category description',
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
