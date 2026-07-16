import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachTechnician } from '../../middleware/technician.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { Course } from './course.model.js';
import { TrainingGuide } from './trainingGuide.model.js';
import { TechBlog } from './techBlog.model.js';
import { Announcement } from './announcement.model.js';

// Read-only content endpoints — courses/guides/blogs/announcements are authored
// via super-admin CMS tooling (Phase 8), technicians only ever read them.
export const academyRouter = Router();
academyRouter.use(requireAuth, requireRole(ROLES.TECHNICIAN), attachTechnician);

academyRouter.get('/courses', async (req, res, next) => {
  try {
    ok(res, await Course.find({ status: 'Active' }).sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

academyRouter.get('/guides', async (req, res, next) => {
  try {
    ok(res, await TrainingGuide.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

academyRouter.get('/blogs', async (req, res, next) => {
  try {
    ok(res, await TechBlog.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

academyRouter.get('/announcements', async (req, res, next) => {
  try {
    ok(res, await Announcement.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});
