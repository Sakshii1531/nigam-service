import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { Course } from './course.model.js';
import { TrainingGuide } from './trainingGuide.model.js';
import { ServiceProviderBlog } from './serviceProviderBlog.model.js';
import { Announcement } from './announcement.model.js';
import { ServiceProvider } from './serviceProvider.model.js';

// Read-only content endpoints — courses/guides/blogs/announcements are authored
// via super-admin CMS tooling (Phase 8), service providers only ever read them.
export const academyRouter = Router();
academyRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

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
    ok(res, await ServiceProviderBlog.find().sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

academyRouter.get('/announcements', async (req, res, next) => {
  try {
    const provider = await ServiceProvider.findById(req.serviceProvider.id).populate('city', 'name');
    const cityName = (provider?.serviceCityName || provider?.city?.name || '').trim();
    const audience = [
      { scope: 'all' },
      { scope: 'role', region: { $in: ['Service Providers', 'service_provider', 'All Service Providers'] } },
    ];
    if (cityName) audience.push({ scope: 'city', region: new RegExp(cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
    ok(res, await Announcement.find({ $or: audience }).sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});
