import { Notification } from './notification.model.js';
import { NotificationPreference } from './notificationPreference.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { getIO } from '../../sockets/io.js';
import { User } from '../auth/user.model.js';
import { sendPush } from './providers/push.provider.js';
import { sendWhatsApp } from './providers/whatsapp.provider.js';
import { sendSms } from './providers/sms.provider.js';

// Domain-event -> Notification template map. Each template returns:
//   - The standard in-app notification fields (recipient, type, title, message, cta, priority)
//   - `smsBody`      — short copy for SMS (≤ 160 chars ideally; DLT {message} slot)
//   - `whatsappBody` — richer copy for WhatsApp (can be multi-line)
//
// Booking/job/escalation services call emit(event, payload) as a side effect
// rather than constructing a Notification doc themselves — one place owns what
// each event actually says.
const EVENT_TEMPLATES = {
  'booking.created': (p) => ({
    recipient: p.user,
    type: 'created',
    title: 'Booking Confirmed',
    message: `Your ${p.category} service booking has been confirmed.`,
    cta: p.bookingId ? { label: 'View Booking', route: `/bookings/${p.bookingId}` } : undefined,
    smsBody: `Your ${p.category} service booking is confirmed. Track via Nigam Care app.`,
    whatsappBody: `✅ *Booking Confirmed!*\n\nYour *${p.category}* service has been booked successfully.\n\nOpen the Nigam Care app to track your booking.`,
  }),
  'technician.assigned': (p) => ({
    recipient: p.user,
    type: 'assigned',
    title: 'Technician Assigned',
    message: `${p.technicianName || 'A technician'} has been assigned to your service request.`,
    cta: p.serviceRequestId ? { label: 'View Details', route: `/service-requests/${p.serviceRequestId}` } : undefined,
    smsBody: `${p.technicianName || 'A technician'} has been assigned to your service request. Track live on the Nigam Care app.`,
    whatsappBody: `🔧 *Technician Assigned!*\n\n*${p.technicianName || 'A technician'}* is on the way to you.\n\nOpen the Nigam Care app to track their live location.`,
  }),
  'payment.success': (p) => ({
    recipient: p.user,
    type: 'payment',
    title: 'Payment Successful',
    message: `Payment of ₹${p.amount} was successful.`,
    smsBody: `Payment of Rs.${p.amount} received for your Nigam Care service. Thank you!`,
    whatsappBody: `💰 *Payment Received!*\n\nWe've received your payment of *₹${p.amount}*.\n\nThank you for choosing Nigam Care!`,
  }),
  'service.completed': (p) => ({
    recipient: p.user,
    type: 'completed',
    title: 'Service Completed',
    message: 'Your service request has been completed.',
    cta: p.serviceRequestId ? { label: 'View Details', route: `/service-requests/${p.serviceRequestId}` } : undefined,
    smsBody: 'Your Nigam Care service is complete. Please rate your experience on the app.',
    whatsappBody: `✅ *Service Completed!*\n\nYour service request has been completed successfully.\n\nPlease rate your experience on the Nigam Care app — your feedback helps us improve! ⭐`,
  }),
  'claim.approved': (p) => ({
    recipient: p.user,
    type: 'claims',
    title: 'Claim Approved',
    message: `Your claim for "${p.item || 'a part'}" has been approved.`,
    smsBody: `Your claim for "${p.item || 'a part'}" has been approved by Nigam Care.`,
    whatsappBody: `✅ *Claim Approved!*\n\nYour claim for *"${p.item || 'a part'}"* has been approved.\n\nOur team will process it shortly.`,
  }),
  'escalation.raised': (p) => ({
    broadcastRole: 'All',
    type: 'dispatch',
    title: 'Escalation Raised',
    message: p.reason || 'A new escalation has been raised.',
    priority: 'High',
    // Escalation notifications are broadcast (no single phone/token available) —
    // SMS/WhatsApp/Push require a resolved recipient, so these channels are skipped.
  }),
  'brand.warranty_claim': (p) => ({
    broadcastRole: 'Brands',
    type: 'dispatch',
    title: 'Brand Warranty Claim',
    message: p.reason || 'A new Brand Warranty claim has been raised.',
    priority: 'High',
  }),
};

// ── Channel delivery helpers ──────────────────────────────────────────────────

/**
 * Delivers push + SMS + WhatsApp for a personally-addressed notification.
 * Uses Promise.allSettled so any single channel failure never affects others.
 * Never throws — logs errors silently.
 *
 * Push is driven by the notification's own title/message, so it runs for any
 * template. SMS and WhatsApp each require their body on the template — that's
 * how a template opts out of those two channels (ad-hoc admin pushes pass {}).
 */
async function deliverExternal(notification, template, recipientId) {
  if (!recipientId) return; // broadcast notifications have no resolvable recipient

  try {
    const [user, prefs] = await Promise.all([
      User.findById(recipientId).select('phone fcmTokens').lean(),
      NotificationPreference.findOne({ user: recipientId }).lean(),
    ]);
    if (!user) return;

    // Check category preferences
    const notifType = notification.type || '';
    const isPromotional = notifType === 'promo' || notifType === 'promotional' || notifType === 'offer' || Boolean(template?.isPromotional);
    const isBookingUpdate = notifType === 'created' || notifType === 'assigned' || notifType === 'status' || notifType === 'completed' || notifType === 'payment';
    const isSecurityAlert = notifType === 'security' || notifType === 'login';

    let pushEnabled = prefs?.push !== false && prefs?.pushNotifications !== false && process.env.NOTIFICATION_PUSH_ENABLED !== 'false';
    if (isPromotional && (prefs?.pushNotifications === false || (prefs?.whatsAppPromo === false && prefs?.emailPromo === false))) {
      pushEnabled = false;
    }
    if (isBookingUpdate && prefs?.bookingUpdates === false) {
      pushEnabled = false;
    }
    if (isSecurityAlert && prefs?.securityAlerts === false) {
      pushEnabled = false;
    }

    let whatsappEnabled = prefs?.whatsapp !== false && process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'false';
    if (isPromotional && prefs?.whatsAppPromo === false) {
      whatsappEnabled = false;
    }

    let smsEnabled = prefs?.sms !== false && process.env.NOTIFICATION_SMS_ENABLED !== 'false';

    const tasks = [];

    // ── FCM Push ─────────────────────────────────────────────────────────────
    if (pushEnabled && user.fcmTokens?.length) {
      tasks.push(
        sendPush({
          tokens: user.fcmTokens,
          title: notification.title,
          body: notification.message,
          data: { notificationId: String(notification._id) },
          onStaleTokens: (stale) => {
            User.updateOne(
              { _id: recipientId },
              { $pull: { fcmTokens: { $in: stale } } },
            ).catch((e) => console.error('[push] stale-token prune failed:', e.message));
          },
        }),
      );
    }

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    if (whatsappEnabled && user.phone && template.whatsappBody) {
      tasks.push(sendWhatsApp({ to: user.phone, body: template.whatsappBody }));
    }

    // ── SMS ──────────────────────────────────────────────────────────────────
    if (smsEnabled && user.phone && template.smsBody) {
      tasks.push(sendSms({ to: user.phone, body: template.smsBody }));
    }

    if (tasks.length) {
      const results = await Promise.allSettled(tasks);
      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.error('[notifications] external channel error:', r.reason?.message);
        }
      });
    }
  } catch (err) {
    console.error('[notifications] deliverExternal error:', err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Emit a domain event notification.
 *
 * Never throws — a bug in a notification template, or the DB write failing,
 * must not break the domain action that triggered it (a booking should still
 * succeed even if its confirmation notification fails to write). Callers
 * `await` this for ordering but don't need a try/catch around it.
 *
 * Delivery order:
 *   1. DB write (Notification document)
 *   2. Socket.IO real-time push (in-app)
 *   3. FCM mobile push + WhatsApp + SMS — fired in parallel via Promise.allSettled
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

    // Step 2: in-app Socket.IO
    const io = getIO();
    if (io) {
      const json = notification.toJSON();
      if (data.recipient) io.to(`user:${data.recipient}`).emit('notification:new', json);
      if (data.broadcastRole) io.to(`broadcast:${data.broadcastRole}`).emit('notification:new', json);
    }

    // Step 3: external channels — fire-and-forget (non-blocking)
    deliverExternal(notification, data, data.recipient ? String(data.recipient) : null).catch((err) =>
      console.error('[notifications] deliverExternal uncaught:', err.message),
    );

    return notification;
  } catch (err) {
    console.error(`[notifications] failed to emit "${event}":`, err.message);
    return null;
  }
}

// ── Admin ad-hoc dispatch ─────────────────────────────────────────────────────
// The super-admin console composes one-off messages (technician approval, a
// campaign blast) that map to no domain event, so they carry their own copy
// instead of going through EVENT_TEMPLATES. Delivery reuses the same plumbing
// as emit() — DB write, Socket.IO, then FCM via deliverExternal.

/**
 * Send an ad-hoc push to one user or to a whole role.
 * Unlike emit(), this throws — an admin pressing "send" gets a real error back
 * rather than a silent no-op.
 */
export async function sendAdHocPush({ recipientId, broadcastRole, title, body, type = 'tech', priority = 'Medium', cta }) {
  if (!recipientId && !broadcastRole) {
    throw new ApiError(400, 'Either recipientId or broadcastRole is required');
  }
  if (recipientId && broadcastRole) {
    throw new ApiError(400, 'Provide recipientId or broadcastRole, not both');
  }

  if (recipientId) {
    const exists = await User.exists({ _id: recipientId });
    if (!exists) throw new ApiError(404, 'Recipient not found');
  }

  const notification = await Notification.create({
    recipient: recipientId || null,
    broadcastRole: broadcastRole || null,
    type,
    title,
    message: body,
    priority,
    cta,
  });

  const io = getIO();
  if (io) {
    const json = notification.toJSON();
    if (recipientId) io.to(`user:${recipientId}`).emit('notification:new', json);
    if (broadcastRole) io.to(`broadcast:${broadcastRole}`).emit('notification:new', json);
  }

  // Empty template => push only; SMS/WhatsApp are dispatched by their own endpoint.
  await deliverExternal(notification, {}, recipientId ? String(recipientId) : null);

  return notification;
}

/**
 * Send an ad-hoc transactional SMS. Resolves the destination from an explicit
 * phone number, or from a user id when the console only has the former.
 */
export async function sendAdHocSms({ recipientId, phone, message, templateId }) {
  let to = phone;

  if (!to) {
    if (!recipientId) throw new ApiError(400, 'Either phone or recipientId is required');
    const user = await User.findById(recipientId).select('phone').lean();
    if (!user) throw new ApiError(404, 'Recipient not found');
    to = user.phone;
  }
  if (!to) throw new ApiError(400, 'Recipient has no phone number on record');

  await sendSms({ to, body: message, templateId });

  return { sent: true, to };
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
/**
 * One notification the user is entitled to see — their own, or a broadcast
 * aimed at their role. Separate from markRead because broadcasts have no
 * per-user read state and must still be openable.
 */
export async function getNotification(user, id) {
  const notification = await Notification.findById(id);
  if (!notification) throw new ApiError(404, 'Notification not found');

  const isOwn = notification.recipient && String(notification.recipient) === user.id;
  const isBroadcast = Boolean(notification.broadcastRole);
  if (!isOwn && !isBroadcast) throw new ApiError(403, 'Not authorized to view this notification');

  return notification;
}

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

/**
 * The super-admin console's broadcast history — every role-wide notification
 * ever composed, newest first. Distinct from listNotifications, which is a
 * single user's inbox.
 */
export async function listBroadcasts({ page, limit } = {}) {
  const { skip, limit: lim, page: pg, sort } = parsePagination({ page, limit, sort: '-createdAt' });
  const [items, total] = await Promise.all([
    Notification.find({ broadcastRole: { $ne: null } }).sort(sort).skip(skip).limit(lim),
    Notification.countDocuments({ broadcastRole: { $ne: null } }),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Reach stats for the console's notification composer. Only what is actually
 * recorded: how many accounts hold a live FCM token, and how many broadcasts
 * have been sent. Delivery/open rates would need per-message receipts from FCM,
 * which nothing here stores.
 */
export async function getPushStats() {
  const [activeDevices, deviceHolders, broadcasts] = await Promise.all([
    User.aggregate([
      { $match: { fcmTokens: { $exists: true, $ne: [] } } },
      { $group: { _id: null, total: { $sum: { $size: '$fcmTokens' } } } },
    ]),
    User.countDocuments({ fcmTokens: { $exists: true, $ne: [] } }),
    Notification.countDocuments({ broadcastRole: { $ne: null } }),
  ]);

  return { activeDevices: activeDevices[0]?.total || 0, deviceHolders, broadcasts };
}
