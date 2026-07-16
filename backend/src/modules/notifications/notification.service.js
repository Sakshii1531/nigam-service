import { Notification } from './notification.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { getIO } from '../../sockets/io.js';

// Domain-event -> Notification template map. Booking/job/escalation services
// call emit(event, payload) as a side effect rather than constructing a
// Notification doc themselves — one place owns what each event actually says.
const EVENT_TEMPLATES = {
  'booking.created': (p) => ({
    recipient: p.user,
    type: 'created',
    title: 'Booking Confirmed',
    message: `Your ${p.category} service booking has been confirmed.`,
    cta: p.bookingId ? { label: 'View Booking', route: `/bookings/${p.bookingId}` } : undefined,
  }),
  'technician.assigned': (p) => ({
    recipient: p.user,
    type: 'assigned',
    title: 'Technician Assigned',
    message: `${p.technicianName || 'A technician'} has been assigned to your service request.`,
    cta: p.serviceRequestId ? { label: 'View Details', route: `/service-requests/${p.serviceRequestId}` } : undefined,
  }),
  'payment.success': (p) => ({
    recipient: p.user,
    type: 'payment',
    title: 'Payment Successful',
    message: `Payment of ₹${p.amount} was successful.`,
  }),
  'service.completed': (p) => ({
    recipient: p.user,
    type: 'completed',
    title: 'Service Completed',
    message: 'Your service request has been completed.',
    cta: p.serviceRequestId ? { label: 'View Details', route: `/service-requests/${p.serviceRequestId}` } : undefined,
  }),
  'claim.approved': (p) => ({
    recipient: p.user,
    type: 'claims',
    title: 'Claim Approved',
    message: `Your claim for "${p.item || 'a part'}" has been approved.`,
  }),
  'escalation.raised': (p) => ({
    broadcastRole: 'All',
    type: 'dispatch',
    title: 'Escalation Raised',
    message: p.reason || 'A new escalation has been raised.',
    priority: 'High',
  }),
};

/**
 * Never throws — a bug in a notification template, or the DB write failing,
 * must not break the domain action that triggered it (a booking should still
 * succeed even if its confirmation notification fails to write). Callers
 * `await` this for ordering but don't need a try/catch around it.
 */
export async function emit(event, payload) {
  const template = EVENT_TEMPLATES[event];
  if (!template) {
    console.error(`[notifications] unknown event: ${event}`);
    return null;
  }

  try {
    const data = template(payload);
    const notification = await Notification.create(data);

    const io = getIO();
    if (io) {
      const json = notification.toJSON();
      if (data.recipient) io.to(`user:${data.recipient}`).emit('notification:new', json);
      if (data.broadcastRole) io.to(`broadcast:${data.broadcastRole}`).emit('notification:new', json);
    }

    return notification;
  } catch (err) {
    console.error(`[notifications] failed to emit "${event}":`, err.message);
    return null;
  }
}

export async function listNotifications(userId, { read, page, limit, sort } = {}) {
  const query = { $or: [{ recipient: userId }, { broadcastRole: 'All' }] };
  if (read !== undefined) query.read = read;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Notification.find(query).sort(sortObj).skip(skip).limit(lim),
    Notification.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Broadcast notifications (recipient: null, broadcastRole set) have a single
 * shared `read` flag, not a per-recipient read receipt — the schema has no row
 * to represent "read by user X, unread for user Y". Marking one read here
 * would flip it to read for every recipient at once, so this only ever
 * touches personally-addressed notifications; broadcast read-state is a known
 * gap, not silently mishandled. */
export async function markRead(userId, id) {
  const notification = await Notification.findById(id);
  if (!notification) throw new ApiError(404, 'Notification not found');
  if (!notification.recipient) throw new ApiError(400, 'Broadcast notifications have no per-user read state yet');
  if (String(notification.recipient) !== userId) throw new ApiError(403, 'Not authorized to update this notification');

  notification.read = true;
  await notification.save();
  return notification;
}

export async function markAllRead(userId) {
  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
}
