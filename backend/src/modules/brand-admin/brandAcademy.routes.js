import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as academy from './brandAcademy.service.js';
import {
  createGuideSchema,
  createCourseSchema,
  updateCourseSchema,
  idParamSchema,
} from './brandAcademy.validation.js';

export const brandAcademyRouter = Router();
brandAcademyRouter.use(requireAuth, requireBrandScope);

brandAcademyRouter.get('/guides', async (req, res, next) => {
  try {
    ok(res, await academy.listGuides(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandAcademyRouter.post('/guides', validate(createGuideSchema), async (req, res, next) => {
  try {
    created(res, await academy.createGuide(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandAcademyRouter.delete('/guides/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await academy.deleteGuide(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

brandAcademyRouter.get('/courses', async (req, res, next) => {
  try {
    ok(res, await academy.listCourses(req.user.brand));
  } catch (err) {
    next(err);
  }
});

brandAcademyRouter.post('/courses', validate(createCourseSchema), async (req, res, next) => {
  try {
    created(res, await academy.createCourse(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

brandAcademyRouter.put(
  '/courses/:id',
  validate(idParamSchema, 'params'),
  validate(updateCourseSchema),
  async (req, res, next) => {
    try {
      ok(res, await academy.updateCourse(req.user.brand, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandAcademyRouter.delete('/courses/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await academy.deleteCourse(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});
