import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as asmService from './asm.service.js';
import { createAsmSchema, updateAsmSchema, listQuerySchema, idParamSchema } from './asm.validation.js';

export const asmRouter = Router();

// An ASM's own profile — how their frontend resolves "which zone am I", the
// same way service-provider routes resolve the caller's own profile from the
// JWT. Defined ahead of the super-admin-only block below since it needs a
// different role.
asmRouter.get('/me', requireAuth, requireRole(ROLES.ASM), async (req, res, next) => {
  try {
    ok(res, await asmService.getAsmByUserId(req.user.id));
  } catch (err) {
    next(err);
  }
});

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

asmRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await asmService.deleteAsm(req.params.id));
  } catch (err) {
    next(err);
  }
});
