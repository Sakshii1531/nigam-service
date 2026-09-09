import { Conversation } from './conversation.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { User } from '../auth/user.model.js';
import { maskIdentifier } from '../auth/otpProvider.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';

async function requestingServiceProviderId(reqUser) {
  if (reqUser.role !== ROLES.SERVICE_PROVIDER) return null;
  const serviceProvider = await ServiceProvider.findOne({ user: reqUser.id });
  return serviceProvider ? serviceProvider.id : null;
}

/** Never expose the counterpart's real phone number over this REST surface —
 * masked the same way the OTP screen masks a login identifier. Real masked
 * *calling* (a telephony relay so neither party sees the other's raw number
 * on a call) needs an actual telephony provider integration and is out of
 * scope here, same class of gap as the OTP/SMS provider (BACKEND_CONTEXT.md §9) —
 * this only covers what the chat REST/socket surface itself ever returns. */
async function assembleConversation(conversation) {
  const [customer, serviceProvider] = await Promise.all([
    User.findById(conversation.customer),
    conversation.serviceProvider ? ServiceProvider.findById(conversation.serviceProvider) : null,
  ]);

  const json = conversation.toJSON();
  return {
    ...json,
    // 'support' is a customer<->brand thread; 'job' is customer<->service provider.
    kind: conversation.platformSupport ? 'platform-support' : conversation.brand ? 'support' : 'job',
    customer: customer ? { id: customer.id, name: customer.name, phone: maskIdentifier(customer.phone || '') } : null,
    serviceProvider: serviceProvider ? { id: serviceProvider.id, name: serviceProvider.name, phone: maskIdentifier(serviceProvider.phone || '') } : null,
  };
}

export async function getOrCreateConversation({ serviceRequest, customer, serviceProvider }) {
  const filter = serviceRequest ? { serviceRequest } : { customer, serviceProvider };
  const conversation = await Conversation.findOneAndUpdate(
    filter,
    { serviceRequest, customer, serviceProvider, status: 'Open' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return assembleConversation(conversation);
}

/**
 * Open (or reuse) a brand's support thread with one of its customers.
 *
 * Keyed on (customer, brand) with service provider null, so a support thread is
 * always distinct from the job chat that customer may also have with a
 * service provider — they must not collapse into one another.
 */
export async function getOrCreateBrandConversation(brandId, customerId) {
  const customer = await User.findById(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');
  if (customer.role !== ROLES.CUSTOMER) throw new ApiError(400, 'Support threads can only be opened with a customer');

  const conversation = await Conversation.findOneAndUpdate(
    { customer: customerId, brand: brandId, serviceProvider: null },
    { customer: customerId, brand: brandId, serviceProvider: null, status: 'Open' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return assembleConversation(conversation);
}

/**
 * Open (or reuse) the caller's own platform help-desk thread.
 *
 * One thread per user, not one per query: the desk is a running conversation,
 * so a customer with an unanswered question does not accumulate duplicates.
 * ServiceProviders raise theirs against their own User account, same as customers.
 */
export async function getOrCreateSupportConversation(userId) {
  const conversation = await Conversation.findOneAndUpdate(
    { customer: userId, platformSupport: true },
    { customer: userId, platformSupport: true, serviceProvider: null, brand: null, status: 'Open' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return assembleConversation(conversation);
}

export async function listConversations(reqUser) {
  const query = {};
  if (reqUser.role === ROLES.CUSTOMER) query.customer = reqUser.id;
  else if (reqUser.role === ROLES.SERVICE_PROVIDER) query.serviceProvider = await requestingServiceProviderId(reqUser);
  // A brand admin sees only their own brand's support threads.
  else if (reqUser.role === ROLES.BRAND_ADMIN && reqUser.brand) query.brand = reqUser.brand;
  // Super-admin sees the platform help-desk queue, not every conversation on
  // the platform — job and brand threads stay private to their participants.
  else if (reqUser.role === ROLES.SUPER_ADMIN) query.platformSupport = true;
  else throw new ApiError(403, 'This account has no conversations');

  const conversations = await Conversation.find(query).sort({ updatedAt: -1 });
  return Promise.all(conversations.map(assembleConversation));
}

async function findOwnedOr404(reqUser, id) {
  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const serviceProviderId = await requestingServiceProviderId(reqUser);
  const isOwner =
    (reqUser.role === ROLES.CUSTOMER && String(conversation.customer) === reqUser.id) ||
    (reqUser.role === ROLES.SERVICE_PROVIDER && serviceProviderId && String(conversation.serviceProvider) === serviceProviderId) ||
    (reqUser.role === ROLES.BRAND_ADMIN && conversation.brand && String(conversation.brand) === reqUser.brand) ||
    (reqUser.role === ROLES.SUPER_ADMIN && conversation.platformSupport);
  if (!isOwner) throw new ApiError(403, 'Not a participant of this conversation');

  return conversation;
}

export async function getConversation(reqUser, id) {
  const conversation = await findOwnedOr404(reqUser, id);
  return assembleConversation(conversation);
}

/** Exported for message.service.js's participant check — avoids duplicating
 * the ownership logic in two places. */
export { findOwnedOr404 as assertConversationOwnership };
