import { z } from 'zod';
import {customerParts,respondCustomerPart} from '../brand-crm/ticketParts.service.js';
import { Router } from 'express';
import { visitDateRange } from '../shared/preferredVisit.js';
import { VISIT_SLOTS } from './ticketConstants.js';
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
warrantyClaimCustomerRouter.get('/intake-options', (req,res) => ok(res,{slots:VISIT_SLOTS,visitDates:visitDateRange()}));
warrantyClaimCustomerRouter.get('/:id/parts',byId,handle(req=>customerParts(req.user.id,req.params.id)));
warrantyClaimCustomerRouter.post('/:id/parts/:partId/respond',validate(z.object({id:z.string().min(1),partId:z.string().regex(/^[a-f\d]{24}$/i)}),'params'),validate(z.object({approved:z.boolean()}).strict()),handle(req=>respondCustomerPart(req.user.id,req.params.id,req.params.partId,req.body.approved)));
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
