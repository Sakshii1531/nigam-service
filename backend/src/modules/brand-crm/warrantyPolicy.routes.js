import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../config/constants.js';
import { Brand } from '../super-admin/brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { ok,created } from '../../utils/respond.js';
import { actorFromReq } from './actor.js';
import { id } from './registration.validation.js';
import { policySchema,evaluationSchema,importSerialsSchema } from './warrantyPolicy.validation.js';
import { formOptions } from './registration.service.js';
import { WARRANTY_STATUSES } from '../partner-warranty/ticketConstants.js';
import * as service from './warrantyPolicy.service.js';
function createPolicyRouter(admin = false) {
const warrantyPolicyRouter=Router({ mergeParams: true });
if (admin) {
  warrantyPolicyRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));
  warrantyPolicyRouter.use(validate(z.object({ brandId: id }), 'params'), async (req, res, next) => {
    try {
      if (!await Brand.exists({ _id: req.params.brandId })) throw new ApiError(404, 'Brand not found');
      next();
    } catch (error) { next(error); }
  });
}
const brand = req => admin ? req.params.brandId : req.user.brand;
const handle=(fn,response=ok)=>async(req,res,next)=>{try{response(res,await fn(req));}catch(e){next(e);}};
warrantyPolicyRouter.get('/options',handle(async req=>({...await formOptions(brand(req), { includeInactive: admin }),warrantyStatuses:WARRANTY_STATUSES})));
warrantyPolicyRouter.get('/',handle(req=>service.listPolicies(brand(req))));
warrantyPolicyRouter.post('/',validate(policySchema),handle(async req=>service.createPolicy(brand(req),await actorFromReq(req),req.body),created));
warrantyPolicyRouter.post('/test',validate(evaluationSchema),handle(req=>service.evaluateWarranty({...req.body,brand:brand(req)})));
warrantyPolicyRouter.get('/serials',validate(z.object({q:z.string().trim().max(60).default('')}),'query'),handle(req=>service.listSerials(brand(req),req.query.q)));
warrantyPolicyRouter.post('/serials/import',validate(importSerialsSchema),handle(async req=>service.importSerials(brand(req),await actorFromReq(req),req.body)));
warrantyPolicyRouter.get('/:id',validate(z.object({id}).passthrough(),'params'),handle(req=>service.findPolicy(brand(req),req.params.id)));
warrantyPolicyRouter.put('/:id',validate(z.object({id}).passthrough(),'params'),validate(policySchema),handle(async req=>service.versionPolicy(brand(req),req.params.id,await actorFromReq(req),req.body)));
warrantyPolicyRouter.delete('/:id',validate(z.object({id}).passthrough(),'params'),handle(async req=>service.deactivatePolicy(brand(req),req.params.id,await actorFromReq(req))));

return warrantyPolicyRouter;
}
export const warrantyPolicyRouter = createPolicyRouter();
export const adminWarrantyPolicyRouter = createPolicyRouter(true);
