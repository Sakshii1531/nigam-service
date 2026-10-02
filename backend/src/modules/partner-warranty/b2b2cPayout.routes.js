import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as payouts from './b2b2cPayout.service.js';

// Super Admin — /api/v1/super-admin/b2b2c-payouts (docs/partner-warranty Phase 11).
export const adminB2b2cPayoutRouter = Router();
adminB2b2cPayoutRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const handle = (fn) => async (req, res, next) => {
  try {
    ok(res, await fn(req));
  } catch (err) {
    next(err);
  }
};

adminB2b2cPayoutRouter.get('/', validate(z.object({ brand: objectId.optional() }), 'query'), handle((req) => payouts.listUnsettledByPartner(req.query)));
adminB2b2cPayoutRouter.get(
  '/service-providers/:id/jobs',
  validate(z.object({ id: objectId }), 'params'),
  validate(z.object({ status: z.enum(['settled', 'unsettled']).optional() }), 'query'),
  handle((req) => payouts.listPartnerB2b2cJobs(req.params.id, req.query)),
);
adminB2b2cPayoutRouter.post(
  '/settle',
  validate(
    z.object({
      serviceProviderId: objectId,
      jobIds: z.array(objectId).min(1).max(500),
      // The bank / UPI transfer reference — what the partner and finance reconcile on.
      reference: z.string().trim().min(3).max(100),
      note: z.string().trim().max(500).optional(),
    }),
  ),
  handle((req) => payouts.settle(req.user.id, req.body)),
);
