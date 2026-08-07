import { Technician } from '../technician/technician.model.js';
import { ROLES } from '../../config/constants.js';

// Shared by the socket gateway and the HTTP send/close endpoints so both
// authorise a conversation the same way. This used to live only inside
// chat.gateway.js, which meant an HTTP path had no way to reuse it.

// Sentinel for the platform help desk — deliberately not an ObjectId so it can
// never collide with a real brand id.
export const PLATFORM_DESK = 'platform';

export async function resolveParticipant(user) {
  if (user.role === ROLES.CUSTOMER) return { kind: 'customer', id: user.id };
  if (user.role === ROLES.TECHNICIAN) {
    const technician = await Technician.findOne({ user: user.id });
    return technician ? { kind: 'technician', id: technician.id } : null;
  }
  // A brand admin participates as their brand's support desk, not as an
  // individual — messages they send are attributed to 'agent'. An account with
  // no brand attached is not a participant in anything.
  if (user.role === ROLES.BRAND_ADMIN && user.brand) {
    return { kind: 'agent', id: String(user.brand) };
  }
  // Super-admin answers the platform help desk. The id is the desk itself, not
  // the individual admin, so any admin on duty can pick up any thread.
  if (user.role === ROLES.SUPER_ADMIN) return { kind: 'agent', id: PLATFORM_DESK };
  return null;
}

export async function isParticipant(conversation, participant) {
  if (!participant) return false;
  if (participant.kind === 'customer') return String(conversation.customer) === participant.id;
  if (participant.kind === 'technician') return conversation.technician && String(conversation.technician) === participant.id;
  if (participant.kind === 'agent') {
    return participant.id === PLATFORM_DESK
      ? Boolean(conversation.platformSupport)
      : Boolean(conversation.brand) && String(conversation.brand) === participant.id;
  }
  return false;
}

export const conversationRoom = (conversationId) => `conversation:${conversationId}`;
