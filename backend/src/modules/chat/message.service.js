import { Message } from './message.model.js';
import { assertConversationOwnership } from './conversation.service.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listMessages(reqUser, conversationId, { page, limit, sort } = {}) {
  await assertConversationOwnership(reqUser, conversationId);

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort: sort || 'createdAt' });
  const [items, total] = await Promise.all([
    Message.find({ conversation: conversationId }).sort(sortObj).skip(skip).limit(lim),
    Message.countDocuments({ conversation: conversationId }),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}
