import { Router } from 'express';
import { ok } from '../../utils/respond.js';
import { BRAND_PERMISSION_CATALOG, ROLE_TEMPLATES, BRAND_DEPARTMENTS } from './permissions.js';
import { TEAM_DEPARTMENTS } from '../brand-admin/team.model.js';

// GET /api/v1/brand/permissions/catalog — what the role editor's module ×
// action matrix is built from. Access is decided by brandAccess.js.
export const brandPermissionRouter = Router();

brandPermissionRouter.get('/catalog', (req, res) => {
  ok(res, {
    modules: BRAND_PERMISSION_CATALOG,
    templates: ROLE_TEMPLATES.map((t) => ({ template: t.template, name: t.name, permissions: t.permissions })),
    // Where a user works (User.department) and what a team may be (Team.department).
    departments: BRAND_DEPARTMENTS,
    teamDepartments: TEAM_DEPARTMENTS,
  });
});
