import { Conversation } from '../modules/chat/conversation.model.js';
import { Message } from '../modules/chat/message.model.js';
import { resolveParticipant, isParticipant, conversationRoom as room } from '../modules/chat/participants.js';

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

    socket.on('send-message', async ({ conversationId, text, attachmentUrl, attachmentName }, ack) => {
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
          attachmentName,
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
