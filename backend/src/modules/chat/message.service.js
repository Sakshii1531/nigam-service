import { Message } from './message.model.js';
import { Conversation } from './conversation.model.js';
import { assertConversationOwnership } from './conversation.service.js';
import { resolveParticipant, isParticipant, conversationRoom } from './participants.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { getIO } from '../../sockets/io.js';

export async function listMessages(reqUser, conversationId, { page, limit, sort } = {}) {
  await assertConversationOwnership(reqUser, conversationId);

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort: sort || 'createdAt' });
  const [items, total] = await Promise.all([
    Message.find({ conversation: conversationId }).sort(sortObj).skip(skip).limit(lim),
    Message.countDocuments({ conversation: conversationId }),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Sends a message over HTTP and broadcasts it to the conversation's socket room
 * so live clients see it immediately. The admin consoles answer tickets from a
 * desktop page that never opens a socket, and without this they appended the
 * reply to browser state only — the customer never received it.
 */
export async function sendMessage(reqUser, conversationId, { text, attachmentUrl, attachmentName }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const participant = await resolveParticipant(reqUser);
  if (!(await isParticipant(conversation, participant))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }
  if (conversation.status === 'Closed') {
    throw new ApiError(409, 'This conversation is closed');
  }
  if (!text && !attachmentUrl) {
    throw new ApiError(400, 'A message needs text or an attachment');
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: participant.kind,
    text,
    attachmentUrl,
    attachmentName,
    status: 'sent',
  });

  // Best-effort: a message must persist even if no socket server is running
  // (the jest suites boot the app without one).
  try {
    getIO()?.to(conversationRoom(conversationId)).emit('message:new', message.toJSON());
  } catch {
    // No socket server attached — the HTTP response still carries the message.
  }

  return message;
}

/** Closes or reopens a thread. The console's "Mark as Resolved" changed only
 * browser state, so a resolved ticket reappeared as open on the next load. */
export async function setConversationStatus(reqUser, conversationId, status) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const participant = await resolveParticipant(reqUser);
  if (!(await isParticipant(conversation, participant))) {
    throw new ApiError(403, 'Not a participant of this conversation');
  }

  conversation.status = status;
  await conversation.save();
  return conversation;
}
