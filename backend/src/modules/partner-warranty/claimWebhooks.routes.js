import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole, requireBrandScope } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { WARRANTY_EVENT_TYPES } from './domainEvent.model.js';
import * as webhooks from './claimWebhooks.service.js';

// Brand CRM webhooks (docs/partner-warranty Phase 10).

const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    if (result && result.items && result.meta) ok(res, result.items, result.meta);
    else ok(res, result);
  } catch (err) {
    next(err);
  }
};

const configSchema = z
  .object({
    url: z.string().trim().max(2048).nullable().optional(),
    enabled: z.boolean().optional(),
    events: z.array(z.enum(WARRANTY_EVENT_TYPES)).max(WARRANTY_EVENT_TYPES.length).optional(),
    rotateSecret: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// Brand admin — /api/v1/brand/warranty-webhook
export const brandWarrantyWebhookRouter = Router();
brandWarrantyWebhookRouter.use(requireAuth, requireBrandScope);
brandWarrantyWebhookRouter.get('/', handle((req) => webhooks.getWebhookConfig(req.user.brand)));
brandWarrantyWebhookRouter.put('/', validate(configSchema), handle((req) => webhooks.updateWebhookConfig(req.user.brand, req.body, req.user.id)));
brandWarrantyWebhookRouter.post('/test', handle((req) => webhooks.sendTestPing(req.user.brand)));

// Super Admin — /api/v1/super-admin/warranty-webhooks
export const adminWarrantyWebhookRouter = Router();
adminWarrantyWebhookRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));
const listSchema = z.object({
  brand: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  status: z.enum(['pending', 'delivered', 'failed', 'skipped']).optional(),
  type: z.enum([...WARRANTY_EVENT_TYPES, 'PING']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
adminWarrantyWebhookRouter.get('/deliveries', validate(listSchema, 'query'), handle((req) => webhooks.listDeliveries(req.query)));
adminWarrantyWebhookRouter.post(
  '/deliveries/:id/retry',
  validate(z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) }), 'params'),
  handle((req) => webhooks.retryEvent(req.params.id, req.user.id)),
);
