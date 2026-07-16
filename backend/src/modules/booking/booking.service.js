import { Booking } from './booking.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { findServiceItem } from '../catalog/catalog.service.js';
import { findAvailableTechnician } from '../shared/assignmentStub.js';
import { createServiceRequest, transitionStatus } from '../service-requests/serviceRequest.service.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

/**
 * Creates a Booking + its linked ServiceRequest in one flow, matching
 * BookingSuccess.jsx's expectation of an immediately-assigned technician
 * (BACKEND_CONTEXT.md §3.5). Price is resolved server-side from the catalog —
 * never trust a client-supplied price for what's actually charged.
 */
export async function createBooking(userId, data) {
  const serviceItem = await findServiceItem(data.category, data.serviceSlug);
  const quantity = data.quantity || 1;
  const totalPrice = serviceItem.price * quantity;

  const technician = await findAvailableTechnician({ category: data.category });

  const booking = await Booking.create({
    user: userId,
    category: data.category,
    productType: data.productType,
    service: { slug: serviceItem.slug, name: serviceItem.name, price: serviceItem.price, desc: serviceItem.desc, unit: serviceItem.unit },
    brand: data.brand,
    quantity,
    scheduledDate: data.scheduledDate,
    timeSlot: data.timeSlot,
    address: data.address,
    fullName: data.fullName,
    mobile: data.mobile,
    paymentMode: data.paymentMode || 'after',
    advanceAmount: data.paymentMode === 'advance' ? Math.round(totalPrice * 0.2) : 0,
    totalPrice,
    technician: technician ? technician._id : null,
    status: 'Upcoming',
  });

  let serviceRequest = await createServiceRequest({
    user: userId,
    technician: technician ? technician._id : null,
    booking: booking._id,
    category: data.category,
    description: `${data.category} — ${serviceItem.name}`,
    requestMode: 'B2C',
  });

  if (technician) {
    // transitionStatus returns the updated doc — must be captured, not discarded,
    // or the response (and the `serviceRequest` this function returns) would still
    // show status "New" despite the DB itself correctly being "Assigned".
    serviceRequest = await transitionStatus(serviceRequest.id, 'Assigned', {
      description: `Auto-assigned to ${technician.name}`,
    });
  }

  booking.serviceRequest = serviceRequest._id;
  await booking.save();

  return { booking, serviceRequest, technician };
}

async function findOwnedOr404(userId, id) {
  const booking = await Booking.findById(id);
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
    Booking.find(query).sort(sortObj).skip(skip).limit(lim),
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
