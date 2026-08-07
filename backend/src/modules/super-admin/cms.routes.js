import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as cmsService from './cms.service.js';
import {
  createBannerSchema,
  updateBannerSchema,
  listBannersQuerySchema,
  createStorySchema,
  updateStorySchema,
  createVideoSchema,
  updateVideoSchema,
  createAdvertisementSchema,
  updateAdvertisementSchema,
  upsertCmsPageSchema,
  slugParamSchema,
  setAppSettingSchema,
  appParamSchema,
  idParamSchema,
  adminListStoriesQuerySchema,
  adminListAdvertisementsQuerySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  createSkillSchema,
  updateSkillSchema,
} from './cms.validation.js';

export const cmsRouter = Router();
const requireAdmin = [requireAuth, requireRole(ROLES.SUPER_ADMIN)];

// Banners
cmsRouter.get('/banners', validate(listBannersQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await cmsService.listBanners(req.query));
  } catch (err) {
    next(err);
  }
});
// Console reader — includes deactivated banners the apps never see.
cmsRouter.get('/banners/admin', ...requireAdmin, validate(listBannersQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await cmsService.listAllBanners(req.query));
  } catch (err) {
    next(err);
  }
});
cmsRouter.post('/banners', ...requireAdmin, validate(createBannerSchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createBanner(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put('/banners/:id', ...requireAdmin, validate(idParamSchema, 'params'), validate(updateBannerSchema), async (req, res, next) => {
  try {
    ok(res, await cmsService.updateBanner(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.delete('/banners/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteBanner(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// Stories
cmsRouter.get('/stories', async (req, res, next) => {
  try {
    ok(res, await cmsService.listStories());
  } catch (err) {
    next(err);
  }
});
// Console reader — includes Scheduled stories the apps never see.
cmsRouter.get('/stories/admin', ...requireAdmin, validate(adminListStoriesQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await cmsService.listAllStories(req.query));
  } catch (err) {
    next(err);
  }
});
cmsRouter.post('/stories', ...requireAdmin, validate(createStorySchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createStory(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put('/stories/:id', ...requireAdmin, validate(idParamSchema, 'params'), validate(updateStorySchema), async (req, res, next) => {
  try {
    ok(res, await cmsService.updateStory(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.delete('/stories/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteStory(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// Videos
cmsRouter.get('/videos', async (req, res, next) => {
  try {
    ok(res, await cmsService.listVideos());
  } catch (err) {
    next(err);
  }
});
// Console reader — includes deactivated videos the apps never see.
cmsRouter.get('/videos/admin', ...requireAdmin, async (req, res, next) => {
  try {
    ok(res, await cmsService.listAllVideos());
  } catch (err) {
    next(err);
  }
});
cmsRouter.post('/videos', ...requireAdmin, validate(createVideoSchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createVideo(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put('/videos/:id', ...requireAdmin, validate(idParamSchema, 'params'), validate(updateVideoSchema), async (req, res, next) => {
  try {
    ok(res, await cmsService.updateVideo(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.delete('/videos/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteVideo(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// Advertisements
cmsRouter.get('/advertisements', async (req, res, next) => {
  try {
    ok(res, await cmsService.listAdvertisements());
  } catch (err) {
    next(err);
  }
});
// Console reader — includes Paused campaigns the apps never see.
cmsRouter.get(
  '/advertisements/admin',
  ...requireAdmin,
  validate(adminListAdvertisementsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.listAllAdvertisements(req.query));
    } catch (err) {
      next(err);
    }
  },
);
cmsRouter.post('/advertisements', ...requireAdmin, validate(createAdvertisementSchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createAdvertisement(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put(
  '/advertisements/:id',
  ...requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateAdvertisementSchema),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.updateAdvertisement(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
cmsRouter.delete('/advertisements/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteAdvertisement(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// CMS pages (privacy-policy, terms, faqs, ...)
cmsRouter.get('/pages/:slug', validate(slugParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await cmsService.getCmsPage(req.params.slug));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put(
  '/pages/:slug',
  ...requireAdmin,
  validate(slugParamSchema, 'params'),
  validate(upsertCmsPageSchema),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.upsertCmsPage(req.params.slug, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// App settings (flat key/value per app)
cmsRouter.get('/app-settings/:app', validate(appParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await cmsService.getAppSettings(req.params.app));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put(
  '/app-settings/:app',
  ...requireAdmin,
  validate(appParamSchema, 'params'),
  validate(setAppSettingSchema),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.setAppSetting(req.params.app, req.body.key, req.body.value));
    } catch (err) {
      next(err);
    }
  },
);

// ── Technician app content ────────────────────────────────────────────────────

cmsRouter.get('/announcements', ...requireAdmin, async (req, res, next) => {
  try {
    ok(res, await cmsService.listAnnouncements());
  } catch (err) {
    next(err);
  }
});
cmsRouter.post('/announcements', ...requireAdmin, validate(createAnnouncementSchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createAnnouncement(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put(
  '/announcements/:id',
  ...requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateAnnouncementSchema),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.updateAnnouncement(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
cmsRouter.delete('/announcements/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteAnnouncement(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// Public — the technician profile reads the catalogue to offer a controlled
// list of specialisations.
cmsRouter.get('/skills', async (req, res, next) => {
  try {
    ok(res, await cmsService.listSkills());
  } catch (err) {
    next(err);
  }
});
cmsRouter.post('/skills', ...requireAdmin, validate(createSkillSchema), async (req, res, next) => {
  try {
    created(res, await cmsService.createSkill(req.body));
  } catch (err) {
    next(err);
  }
});
cmsRouter.put(
  '/skills/:id',
  ...requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateSkillSchema),
  async (req, res, next) => {
    try {
      ok(res, await cmsService.updateSkill(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
cmsRouter.delete('/skills/:id', ...requireAdmin, validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await cmsService.deleteSkill(req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
