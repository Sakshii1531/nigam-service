import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as claims from './warrantyClaim.service.js';
import {
  createClaimSchema,
  claimIdParamSchema,
  listMyClaimsQuerySchema,
  addDocumentsSchema,
  infoResponseSchema,
} from './warrantyClaim.validation.js';

// Customer warranty claims — /api/v1/partner-warranty/claims.
// A customer only ever sees their own; `:id` accepts the id or the NCCW ticket number.
export const warrantyClaimCustomerRouter = Router();
warrantyClaimCustomerRouter.use(requireAuth, requireRole(ROLES.CUSTOMER));

const handle = (fn, respond = ok) => async (req, res, next) => {
  try {
    const result = await fn(req);
    if (result && result.items && result.meta) respond(res, result.items, result.meta);
    else respond(res, result);
  } catch (err) {
    next(err);
  }
};
const byId = validate(claimIdParamSchema, 'params');

warrantyClaimCustomerRouter.post('/', validate(createClaimSchema), handle((req) => claims.createClaim(req.user, req.body), created));
warrantyClaimCustomerRouter.get('/', validate(listMyClaimsQuerySchema, 'query'), handle((req) => claims.listMyClaims(req.user.id, req.query)));
warrantyClaimCustomerRouter.get('/:id', byId, handle((req) => claims.getMyClaim(req.user.id, req.params.id)));
warrantyClaimCustomerRouter.get('/:id/track', byId, handle((req) => claims.trackMyClaim(req.user.id, req.params.id)));
warrantyClaimCustomerRouter.post('/:id/confirm', byId, handle((req) => claims.confirmMyService(req.user.id, req.params.id)));
warrantyClaimCustomerRouter.post(
  '/:id/documents',
  byId,
  validate(addDocumentsSchema),
  handle((req) => claims.addDocuments(req.user.id, req.params.id, req.body)),
);
warrantyClaimCustomerRouter.post(
  '/:id/info-response',
  byId,
  validate(infoResponseSchema),
  handle((req) => claims.respondToInfoRequest(req.user.id, req.params.id, req.body)),
);
