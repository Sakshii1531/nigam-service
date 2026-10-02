import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as admin from './adminClaim.service.js';
import {
  claimIdParamSchema,
  listAdminClaimsQuerySchema,
  reasonSchema,
  assignSchema,
  reassignSchema,
  changeStatusSchema,
  reopenSchema,
  noteSchema,
  slaSummaryQuerySchema,
} from './adminClaim.validation.js';

// Super Admin — /api/v1/super-admin/warranty-claims (docs/partner-warranty Phase 8).
export const adminWarrantyClaimRouter = Router();
adminWarrantyClaimRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

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
const action = (path, schema, fn) =>
  adminWarrantyClaimRouter.post(`/:id/${path}`, byId, validate(schema), handle((req) => fn(req.user, req.params.id, req.body)));

adminWarrantyClaimRouter.get('/', validate(listAdminClaimsQuerySchema, 'query'), handle((req) => admin.listClaims(req.query)));
// Static path before '/:id'.
adminWarrantyClaimRouter.get('/sla-summary', validate(slaSummaryQuerySchema, 'query'), handle((req) => admin.slaSummary(req.query)));
adminWarrantyClaimRouter.get('/:id', byId, handle((req) => admin.getClaim(req.params.id)));
adminWarrantyClaimRouter.get('/:id/partner-suggestions', byId, handle((req) => admin.partnerSuggestions(req.params.id)));

action('approve', reasonSchema, admin.approveOnBehalf);
action('reject', reasonSchema, admin.rejectOnBehalf);
action('assign', assignSchema, admin.assignPartner);
action('reassign', reassignSchema, admin.reassignPartner);
action('status', changeStatusSchema, admin.changeStatus);
action('escalate', reasonSchema, admin.escalate);
action('de-escalate', reasonSchema, admin.deEscalate);
action('hold', reasonSchema, admin.hold);
action('resume', reasonSchema, admin.resume);
action('cancel', reasonSchema, admin.cancel);
action('reopen', reopenSchema, admin.reopen);
action('notes', noteSchema, admin.addNote);
