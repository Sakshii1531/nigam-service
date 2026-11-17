import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as sectionService from './homeSection.service.js';
import { createSectionSchema, updateSectionSchema, reorderSectionsSchema, sectionIdParamSchema } from './homeSection.validation.js';

export const homeSectionRouter = Router();
const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

// Public — the customer app draws its home screen from this, top to bottom.
homeSectionRouter.get('/', wrap(async (req, res) => ok(res, await sectionService.listPublicSections())));

// Console reader — includes hidden sections and how much content each holds.
homeSectionRouter.get('/admin', ...requireAdmin, wrap(async (req, res) => ok(res, await sectionService.listAdminSections())));

homeSectionRouter.post('/', ...requireAdmin, validate(createSectionSchema), wrap(async (req, res) => created(res, await sectionService.createSection(req.body))));

// Registered before '/:id' so "reorder" is not read as an id.
homeSectionRouter.put('/reorder', ...requireAdmin, validate(reorderSectionsSchema), wrap(async (req, res) => ok(res, await sectionService.reorderSections(req.body.ids))));

homeSectionRouter.put('/:id', ...requireAdmin, validate(sectionIdParamSchema, 'params'), validate(updateSectionSchema), wrap(async (req, res) => ok(res, await sectionService.updateSection(req.params.id, req.body))));

homeSectionRouter.delete('/:id', ...requireAdmin, validate(sectionIdParamSchema, 'params'), wrap(async (req, res) => ok(res, await sectionService.deleteSection(req.params.id))));
