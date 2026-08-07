import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as conversationService from './conversation.service.js';
import * as messageService from './message.service.js';
import {
  idParamSchema,
  listMessagesQuerySchema,
  openBrandConversationSchema,
  sendMessageSchema,
  conversationStatusSchema,
} from './chat.validation.js';

// Job conversations (customer<->technician) stay system-derived: they are a
// side effect of job.service.js's acceptJob(), never user-initiated with
// arbitrary participant ids. The one exception below is a brand opening a
// SUPPORT thread with its own customer — the brand is fixed from the caller's
// token, so it still cannot name arbitrary participants.
//
// Sending remains socket-only (chat.gateway.js's 'send-message'); this surface
// reads history and opens threads.
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

// Declared after the :id routes is fine — the method differs (POST vs GET).
chatRouter.post(
  '/conversations/brand',
  requireBrandScope,
  validate(openBrandConversationSchema),
  async (req, res, next) => {
    try {
      created(res, await conversationService.getOrCreateBrandConversation(req.user.brand, req.body.customerId));
    } catch (err) {
      next(err);
    }
  },
);

// Any signed-in user can open their own help-desk thread — no body needed, the
// subject is always the caller.
chatRouter.post('/conversations/support', async (req, res, next) => {
  try {
    created(res, await conversationService.getOrCreateSupportConversation(req.user.id));
  } catch (err) {
    next(err);
  }
});

chatRouter.post(
  '/conversations/:id/messages',
  validate(idParamSchema, 'params'),
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      created(res, await messageService.sendMessage(req.user, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

chatRouter.patch(
  '/conversations/:id/status',
  validate(idParamSchema, 'params'),
  validate(conversationStatusSchema),
  async (req, res, next) => {
    try {
      ok(res, await messageService.setConversationStatus(req.user, req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);
