import { Conversation } from './conversation.model.js';
import { Technician } from '../technician/technician.model.js';
import { User } from '../auth/user.model.js';
import { maskIdentifier } from '../auth/otpProvider.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ROLES } from '../../config/constants.js';

async function requestingTechnicianId(reqUser) {
  if (reqUser.role !== ROLES.TECHNICIAN) return null;
  const technician = await Technician.findOne({ user: reqUser.id });
  return technician ? technician.id : null;
}

/** Never expose the counterpart's real phone number over this REST surface —
 * masked the same way the OTP screen masks a login identifier. Real masked
 * *calling* (a telephony relay so neither party sees the other's raw number
 * on a call) needs an actual telephony provider integration and is out of
 * scope here, same class of gap as the OTP/SMS provider (BACKEND_CONTEXT.md §9) —
 * this only covers what the chat REST/socket surface itself ever returns. */
async function assembleConversation(conversation) {
  const [customer, technician] = await Promise.all([
    User.findById(conversation.customer),
    conversation.technician ? Technician.findById(conversation.technician) : null,
  ]);

  const json = conversation.toJSON();
  return {
    ...json,
    customer: customer ? { id: customer.id, name: customer.name, phone: maskIdentifier(customer.phone || '') } : null,
    technician: technician ? { id: technician.id, name: technician.name, phone: maskIdentifier(technician.phone || '') } : null,
  };
}

export async function getOrCreateConversation({ serviceRequest, customer, technician }) {
  const filter = serviceRequest ? { serviceRequest } : { customer, technician };
  const conversation = await Conversation.findOneAndUpdate(
    filter,
    { serviceRequest, customer, technician, status: 'Open' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return assembleConversation(conversation);
}

export async function listConversations(reqUser) {
  const query = {};
  if (reqUser.role === ROLES.CUSTOMER) query.customer = reqUser.id;
  else if (reqUser.role === ROLES.TECHNICIAN) query.technician = await requestingTechnicianId(reqUser);
  else throw new ApiError(403, 'Only customers and technicians have conversations');

  const conversations = await Conversation.find(query).sort({ updatedAt: -1 });
  return Promise.all(conversations.map(assembleConversation));
}

async function findOwnedOr404(reqUser, id) {
  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const technicianId = await requestingTechnicianId(reqUser);
  const isOwner =
    (reqUser.role === ROLES.CUSTOMER && String(conversation.customer) === reqUser.id) ||
    (reqUser.role === ROLES.TECHNICIAN && technicianId && String(conversation.technician) === technicianId);
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
