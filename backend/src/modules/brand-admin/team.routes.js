import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as teamService from './team.service.js';
import { createTeamSchema, updateTeamSchema, memberSchema, idParamSchema, memberParamSchema } from './team.validation.js';

export const teamRouter = Router();
teamRouter.use(requireAuth, requireBrandScope);

teamRouter.get('/', async (req, res, next) => {
  try {
    ok(res, await teamService.listTeams(req.user.brand));
  } catch (err) {
    next(err);
  }
});

teamRouter.post('/', validate(createTeamSchema), async (req, res, next) => {
  try {
    created(res, await teamService.createTeam(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

teamRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await teamService.getTeam(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

teamRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateTeamSchema), async (req, res, next) => {
  try {
    ok(res, await teamService.updateTeam(req.user.brand, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

teamRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await teamService.deleteTeam(req.user.brand, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

teamRouter.post('/:id/members', validate(idParamSchema, 'params'), validate(memberSchema), async (req, res, next) => {
  try {
    ok(res, await teamService.addMember(req.user.brand, req.params.id, req.body.userId));
  } catch (err) {
    next(err);
  }
});

teamRouter.delete('/:id/members/:userId', validate(memberParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await teamService.removeMember(req.user.brand, req.params.id, req.params.userId));
  } catch (err) {
    next(err);
  }
});
