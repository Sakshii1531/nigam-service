import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as notificationService from './notification.service.js';
import * as preferenceService from './notificationPreference.service.js';
import {
  listQuerySchema,
  idParamSchema,
  updatePreferencesSchema,
  deviceTokenSchema,
  adHocPushSchema,
  adHocSmsSchema,
} from './notification.validation.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// ── In-app notification feed ──────────────────────────────────────────────────

notificationRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await notificationService.listNotifications(req.user, req.query);
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

// ── Admin ad-hoc dispatch ─────────────────────────────────────────────────────
// Super-admin console composes one-off pushes/SMS (e.g. technician approval).

notificationRouter.post(
  '/push',
  requireRole(ROLES.SUPER_ADMIN),
  validate(adHocPushSchema),
  async (req, res, next) => {
    try {
      created(res, await notificationService.sendAdHocPush(req.body));
    } catch (err) {
      next(err);
    }
  },
);

notificationRouter.post(
  '/sms',
  requireRole(ROLES.SUPER_ADMIN),
  validate(adHocSmsSchema),
  async (req, res, next) => {
    try {
      ok(res, await notificationService.sendAdHocSms(req.body));
    } catch (err) {
      next(err);
    }
  },
);

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

// Broadcast history for the super-admin console's composer screen.
notificationRouter.get('/broadcasts', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { items, meta } = await notificationService.listBroadcasts(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

notificationRouter.get('/push-stats', requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    ok(res, await notificationService.getPushStats());
  } catch (err) {
    next(err);
  }
});

// Registered last on purpose: a `/:id` route declared above the literal paths
// below would capture "/preferences" and "/broadcasts" as ids.
notificationRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await notificationService.getNotification(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
});
