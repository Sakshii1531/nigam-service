import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole, requireAsmPermission } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as cityChangeService from '../service-provider/cityChange.service.js';
import { scopeCityForCaller } from './adminServiceProvider.routes.js';
import { listCityChangeRequestsQuerySchema, reviewCityChangeSchema } from './adminServiceProvider.validation.js';

// Review queue for service providers' city change requests. Super-admins see
// every request; an ASM sees (and can decide) requests moving a provider into
// or out of their own zone.
export const cityChangeRequestRouter = Router();
cityChangeRequestRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN, ROLES.ASM));

const requestIdParamSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });

cityChangeRequestRouter.get(
  '/',
  requireAsmPermission('techs:view'),
  validate(listCityChangeRequestsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const scopedCity = await scopeCityForCaller(req);
      const { items, meta } = await cityChangeService.listRequests({ ...req.query, scopedCity });
      ok(res, items, meta);
    } catch (err) {
      next(err);
    }
  },
);

for (const action of ['approve', 'reject']) {
  cityChangeRequestRouter.post(
    `/:id/${action}`,
    requireAsmPermission('techs:manage'),
    validate(requestIdParamSchema, 'params'),
    validate(reviewCityChangeSchema),
    async (req, res, next) => {
      try {
        const scopedCity = await scopeCityForCaller(req);
        const review = action === 'approve' ? cityChangeService.approveRequest : cityChangeService.rejectRequest;
        ok(res, await review(req.params.id, { reviewerId: req.user.id, note: req.body.note, scopedCity }));
      } catch (err) {
        next(err);
      }
    },
  );
}
