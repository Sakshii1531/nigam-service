import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as asmService from './asm.service.js';
import { createAsmSchema, updateAsmSchema, partnerSchema, listQuerySchema, idParamSchema, partnerParamSchema } from './asm.validation.js';

export const asmRouter = Router();
asmRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

asmRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await asmService.listAsms(req.query));
  } catch (err) {
    next(err);
  }
});

asmRouter.post('/', validate(createAsmSchema), async (req, res, next) => {
  try {
    created(res, await asmService.createAsm(req.body));
  } catch (err) {
    next(err);
  }
});

asmRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await asmService.getAsm(req.params.id));
  } catch (err) {
    next(err);
  }
});

asmRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateAsmSchema), async (req, res, next) => {
  try {
    ok(res, await asmService.updateAsm(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

asmRouter.post('/:id/partners', validate(idParamSchema, 'params'), validate(partnerSchema), async (req, res, next) => {
  try {
    ok(res, await asmService.addPartner(req.params.id, req.body.partnerId));
  } catch (err) {
    next(err);
  }
});

asmRouter.delete('/:id/partners/:partnerId', validate(partnerParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await asmService.removePartner(req.params.id, req.params.partnerId));
  } catch (err) {
    next(err);
  }
});
