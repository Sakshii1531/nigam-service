import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as auditLogService from './auditLog.service.js';
import { listQuerySchema } from './auditLog.validation.js';

export const auditLogRouter = Router();
auditLogRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

auditLogRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await auditLogService.listAuditLogs(req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});
