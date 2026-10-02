import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import * as brandClaims from './brandClaim.service.js';
import {
  claimIdParamSchema,
  listBrandClaimsQuerySchema,
  approveSchema,
  rejectSchema,
  requestInfoSchema,
  noteSchema,
} from './brandClaim.validation.js';

// Brand panel — /api/v1/brand/warranty-claims. Scoped to req.user.brand from
// the token; the brand id is never taken from the request.
export const brandWarrantyClaimRouter = Router();
brandWarrantyClaimRouter.use(requireAuth, requireBrandScope);

const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    if (result && result.items && result.meta) ok(res, result.items, result.meta);
    else ok(res, result);
  } catch (err) {
    next(err);
  }
};
const byId = validate(claimIdParamSchema, 'params');

brandWarrantyClaimRouter.get('/', validate(listBrandClaimsQuerySchema, 'query'), handle((req) => brandClaims.listClaims(req.user.brand, req.query)));
brandWarrantyClaimRouter.get('/:id', byId, handle((req) => brandClaims.getClaim(req.user, req.params.id)));
brandWarrantyClaimRouter.post('/:id/approve', byId, validate(approveSchema), handle((req) => brandClaims.approveClaim(req.user, req.params.id, req.body)));
brandWarrantyClaimRouter.post('/:id/reject', byId, validate(rejectSchema), handle((req) => brandClaims.rejectClaim(req.user, req.params.id, req.body)));
brandWarrantyClaimRouter.post('/:id/request-info', byId, validate(requestInfoSchema), handle((req) => brandClaims.requestInfo(req.user, req.params.id, req.body)));
brandWarrantyClaimRouter.post('/:id/notes', byId, validate(noteSchema), handle((req) => brandClaims.addNote(req.user, req.params.id, req.body)));
