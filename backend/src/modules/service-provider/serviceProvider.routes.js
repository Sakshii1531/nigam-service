import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as serviceProviderService from './serviceProvider.service.js';
import * as cityChangeService from './cityChange.service.js';
import {
  requestCityChangeSchema,
  cityChangeRequestIdParamSchema,
  updateProfileSchema,
  addPayoutMethodSchema,
  methodIdParamSchema,
  setAvailabilitySchema,
} from './serviceProvider.validation.js';

export const serviceProviderRouter = Router();
serviceProviderRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

serviceProviderRouter.get('/profile', async (req, res, next) => {
  try {
    ok(res, await serviceProviderService.getProfile(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.put('/profile', validate(updateProfileSchema), async (req, res, next) => {
  try {
    ok(res, await serviceProviderService.updateProfile(req.serviceProvider.id, req.body));
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.patch('/availability', validate(setAvailabilitySchema), async (req, res, next) => {
  try {
    ok(res, await serviceProviderService.setAvailability(req.serviceProvider.id, req.body.availability));
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.post('/payout-methods', validate(addPayoutMethodSchema), async (req, res, next) => {
  try {
    ok(res, await serviceProviderService.addPayoutMethod(req.serviceProvider.id, req.body));
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.delete('/payout-methods/:methodId', validate(methodIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await serviceProviderService.removePayoutMethod(req.serviceProvider.id, req.params.methodId));
  } catch (err) {
    next(err);
  }
});

// Service city changes go through review — the city decides which jobs a
// provider is offered and which ASM oversees them, so it isn't a field on
// the self-service PUT /profile above.
serviceProviderRouter.get('/city-change-requests', async (req, res, next) => {
  try {
    ok(res, await cityChangeService.listOwnRequests(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.post('/city-change-requests', validate(requestCityChangeSchema), async (req, res, next) => {
  try {
    ok(res, await cityChangeService.requestCityChange(req.serviceProvider.id, req.user.id, req.body), {}, 201);
  } catch (err) {
    next(err);
  }
});

serviceProviderRouter.post(
  '/city-change-requests/:requestId/cancel',
  validate(cityChangeRequestIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await cityChangeService.cancelOwnRequest(req.serviceProvider.id, req.params.requestId));
    } catch (err) {
      next(err);
    }
  },
);
