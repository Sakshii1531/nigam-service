import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as notificationService from './notification.service.js';
import * as preferenceService from './notificationPreference.service.js';
import { listQuerySchema, idParamSchema, updatePreferencesSchema } from './notification.validation.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await notificationService.listNotifications(req.user.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

notificationRouter.patch('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user.id);
    ok(res, { updated: true });
  } catch (err) {
    next(err);
  }
});

notificationRouter.patch('/:id/read', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await notificationService.markRead(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

notificationRouter.get('/preferences', async (req, res, next) => {
  try {
    ok(res, await preferenceService.getPreferences(req.user.id));
  } catch (err) {
    next(err);
  }
});

notificationRouter.put('/preferences', validate(updatePreferencesSchema), async (req, res, next) => {
  try {
    ok(res, await preferenceService.updatePreferences(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});
