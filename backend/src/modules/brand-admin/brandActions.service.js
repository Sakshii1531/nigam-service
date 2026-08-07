import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../warranty-amc-exchange/amcVisit.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { sendAdHocPush } from '../notifications/notification.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import mongoose from 'mongoose';

// Write actions the brand console offers. These previously existed only as
// success toasts — "Renewal reminder email & SMS sent successfully", "Maintenance
// visit scheduled successfully", "Notification sent successfully" — with no
// request leaving the browser, so nothing reached the customer.

const asObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/** A brand may only act on customers it has actually served. */
async function assertBrandCustomer(brandId, userId) {
  const served = await ServiceRequest.exists({ brand: asObjectId(brandId), user: asObjectId(userId) });
  if (!served) throw new ApiError(403, 'This customer has no service history with your brand');
}

export async function notifyCustomer(brandId, { userId, title, body }) {
  await assertBrandCustomer(brandId, userId);
  return sendAdHocPush({ recipientId: userId, title, body, type: 'service' });
}

/** The subscription must belong to a customer this brand has served. */
async function findBrandSubscription(brandId, subscriptionId) {
  const subscription = await AMCSubscription.findById(subscriptionId).populate('plan');
  if (!subscription) throw new ApiError(404, 'AMC subscription not found');
  await assertBrandCustomer(brandId, subscription.user);
  return subscription;
}

export async function sendRenewalReminder(brandId, subscriptionId) {
  const subscription = await findBrandSubscription(brandId, subscriptionId);
  if (subscription.status === 'Expired') {
    throw new ApiError(409, 'This subscription has already expired');
  }

  const expires = subscription.expiryDate
    ? new Date(subscription.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'soon';

  const notification = await sendAdHocPush({
    recipientId: subscription.user,
    title: 'Your AMC is due for renewal',
    body: `Your ${subscription.plan?.name || 'AMC'} plan expires on ${expires}. Renew now to keep your cover unbroken.`,
    type: 'service',
  });

  return { sent: true, notification };
}

export async function scheduleVisit(brandId, subscriptionId, { scheduledDate }) {
  const subscription = await findBrandSubscription(brandId, subscriptionId);
  if (subscription.visitsRemaining <= 0) {
    throw new ApiError(409, 'This subscription has no visits remaining');
  }

  // Visit numbers run in sequence per subscription, so this continues from the
  // highest already booked rather than from the remaining count.
  const last = await AMCVisit.findOne({ subscription: subscription._id }).sort({ visitNumber: -1 });
  const visit = await AMCVisit.create({
    subscription: subscription._id,
    visitNumber: (last?.visitNumber || 0) + 1,
    scheduledDate,
    status: 'Scheduled',
  });

  await sendAdHocPush({
    recipientId: subscription.user,
    title: 'Maintenance visit scheduled',
    body: `Your AMC maintenance visit is booked for ${new Date(scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
    type: 'service',
  });

  return visit;
}
