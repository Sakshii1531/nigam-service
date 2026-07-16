import { Conversation } from '../modules/chat/conversation.model.js';
import { Message } from '../modules/chat/message.model.js';
import { Technician } from '../modules/technician/technician.model.js';
import { ROLES } from '../config/constants.js';

async function resolveParticipant(socketUser) {
  if (socketUser.role === ROLES.CUSTOMER) return { kind: 'customer', id: socketUser.id };
  if (socketUser.role === ROLES.TECHNICIAN) {
    const technician = await Technician.findOne({ user: socketUser.id });
    return technician ? { kind: 'technician', id: technician.id } : null;
  }
  return null;
}

async function isParticipant(conversation, participant) {
  if (!participant) return false;
  if (participant.kind === 'customer') return String(conversation.customer) === participant.id;
  if (participant.kind === 'technician') return conversation.technician && String(conversation.technician) === participant.id;
  return false;
}

const room = (conversationId) => `conversation:${conversationId}`;

/**
 * Conversation-scoped real-time messaging — the Phase 9 exit criterion is
 * exactly this: two connected clients exchange a message scoped to one
 * conversation and don't leak into another. Room-per-conversation (Socket.IO
 * rooms) is what makes that a structural guarantee rather than an
 * application-level filter: a client that never joined room X can never
 * receive an emit targeted at room X, full stop.
 *
 * Participant membership is re-checked on every join AND every send (not just
 * trusted from a prior join) — a socket's `user` doesn't change over its
 * connection lifetime, but re-checking costs one indexed findById and closes
 * off any client that tries to emit `send-message` for a conversation it
 * never (successfully) joined.
 */
export function registerChatGateway(io) {
  io.on('connection', (socket) => {
    socket.on('join-conversation', async ({ conversationId }, ack) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack?.({ ok: false, error: 'Conversation not found' });

        const participant = await resolveParticipant(socket.user);
        if (!(await isParticipant(conversation, participant))) {
          return ack?.({ ok: false, error: 'Not a participant of this conversation' });
        }

        socket.join(room(conversationId));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('send-message', async ({ conversationId, text, attachmentUrl }, ack) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack?.({ ok: false, error: 'Conversation not found' });

        const participant = await resolveParticipant(socket.user);
        if (!(await isParticipant(conversation, participant))) {
          return ack?.({ ok: false, error: 'Not a participant of this conversation' });
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: participant.kind,
          text,
          attachmentUrl,
          status: 'sent',
        });

        io.to(room(conversationId)).emit('message:new', message.toJSON());
        ack?.({ ok: true, message: message.toJSON() });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('leave-conversation', ({ conversationId }) => {
      socket.leave(room(conversationId));
    });
  });
}
