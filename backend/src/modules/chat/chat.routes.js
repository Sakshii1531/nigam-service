import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as conversationService from './conversation.service.js';
import * as messageService from './message.service.js';
import { idParamSchema, listMessagesQuerySchema } from './chat.validation.js';

// No public "create conversation" endpoint — conversations are a system-derived
// side effect of job.service.js's acceptJob() (customer+technician+serviceRequest
// are already verified together at that point), not user-initiated with arbitrary
// participant ids. This surface is read-only; sending happens over the socket
// (chat.gateway.js's 'send-message' event), not REST.
export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get('/conversations', async (req, res, next) => {
  try {
    ok(res, await conversationService.listConversations(req.user));
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/conversations/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await conversationService.getConversation(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
});

chatRouter.get(
  '/conversations/:id/messages',
  validate(idParamSchema, 'params'),
  validate(listMessagesQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { items, meta } = await messageService.listMessages(req.user, req.params.id, req.query);
      ok(res, items, meta);
    } catch (err) {
      next(err);
    }
  },
);
