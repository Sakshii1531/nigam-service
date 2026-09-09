import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as assistantService from './assistant.service.js';

export const assistantRouter = Router();
assistantRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

// The whole conversation is replayed each turn — the API is stateless, and the
// grounding context is rebuilt server-side per request so it reflects the
// service provider's stock and job as of now, not as of when the chat opened.
const askSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

assistantRouter.post('/', validate(askSchema), async (req, res, next) => {
  try {
    ok(res, await assistantService.askAssistant(req.serviceProvider.id, req.body));
  } catch (err) {
    next(err);
  }
});
