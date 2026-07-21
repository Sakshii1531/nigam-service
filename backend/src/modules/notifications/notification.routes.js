import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as notificationService from './notification.service.js';
import * as preferenceService from './notificationPreference.service.js';
import { listQuerySchema, idParamSchema, updatePreferencesSchema, deviceTokenSchema } from './notification.validation.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// ── In-app notification feed ──────────────────────────────────────────────────

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

// ── Channel preferences ───────────────────────────────────────────────────────

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

// ── FCM device token registration ─────────────────────────────────────────────
// Mobile clients call POST on app launch / token refresh, DELETE on logout.
// Tokens are stored on User.fcmTokens[] (max 20 per user to avoid unbounded growth).

notificationRouter.post('/device-token', validate(deviceTokenSchema), async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    // Avoid duplicates; cap at 20 tokens per user (remove oldest if needed)
    if (!user.fcmTokens.includes(token)) {
      if (user.fcmTokens.length >= 20) user.fcmTokens.shift(); // remove oldest
      user.fcmTokens.push(token);
      await user.save();
    }

    ok(res, { registered: true, tokenCount: user.fcmTokens.length });
  } catch (err) {
    next(err);
  }
});

notificationRouter.delete('/device-token', validate(deviceTokenSchema), async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await User.updateOne(
      { _id: req.user.id },
      { $pull: { fcmTokens: token } },
    );
    ok(res, { removed: result.modifiedCount > 0 });
  } catch (err) {
    next(err);
  }
});
