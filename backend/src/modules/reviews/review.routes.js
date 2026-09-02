import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as reviewService from './review.service.js';
import { Review } from './review.model.js';
import {
  createReviewSchema,
  respondSchema,
  idParamSchema,
  technicianIdParamSchema,
  listQuerySchema,
  brandListQuerySchema,
} from './review.validation.js';

export const reviewRouter = Router();

// ─── Super Admin: FeaturedReview CRUD ────────────────────────────────────────
reviewRouter.get('/featured-admin', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    ok(res, await reviewService.listAdminFeaturedReviews());
  } catch (err) {
    next(err);
  }
});

reviewRouter.post('/featured-admin', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    created(res, await reviewService.createAdminFeaturedReview(req.body));
  } catch (err) {
    next(err);
  }
});

reviewRouter.patch('/featured-admin/:id', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    ok(res, await reviewService.updateAdminFeaturedReview(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

reviewRouter.delete('/featured-admin/:id', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    ok(res, await reviewService.deleteAdminFeaturedReview(req.params.id));
  } catch (err) {
    next(err);
  }
});


// Public — customers browsing a technician's profile / brand-admin dashboards
// read reviews without needing their own account.
reviewRouter.get('/technicians/:technicianId', validate(technicianIdParamSchema, 'params'), validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await reviewService.listTechnicianReviews(req.params.technicianId, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

// Public — featured overall platform reviews for customer dashboard
reviewRouter.get('/featured', async (req, res, next) => {
  try {
    const items = await reviewService.getFeaturedPlatformReviews();
    ok(res, items);
  } catch (err) {
    next(err);
  }
});

// ─── Product Catalog Ratings & Reviews Endpoints ─────────────────────────
reviewRouter.get('/product/:productId', async (req, res, next) => {
  try {
    ok(res, await reviewService.listProductReviews(req.params.productId));
  } catch (err) {
    next(err);
  }
});

reviewRouter.post('/product', requireAuth, async (req, res, next) => {
  try {
    created(res, await reviewService.createProductReview(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

// ─── Customer Service Rating Endpoints ─────────────────────────────────────
reviewRouter.post('/service-rating', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    created(res, await reviewService.submitServiceRating(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

reviewRouter.get('/service-rating/:serviceId', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    ok(res, await reviewService.getServiceRatingStatus(req.user.id, req.params.serviceId));
  } catch (err) {
    next(err);
  }
});

// Declared before `/:id` — otherwise Express matches "brand" as an id.
reviewRouter.get(
  '/brand',
  requireAuth,
  requireBrandScope,
  validate(brandListQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { items, meta } = await reviewService.listBrandReviews(req.user.brand, req.query);
      ok(res, items, meta);
    } catch (err) {
      next(err);
    }
  },
);

reviewRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await reviewService.getReview(req.params.id));
  } catch (err) {
    next(err);
  }
});

reviewRouter.post('/', requireAuth, validate(createReviewSchema), async (req, res, next) => {
  try {
    created(res, await reviewService.createReview(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

reviewRouter.patch(
  '/:id/respond',
  requireAuth,
  requireBrandScope,
  validate(idParamSchema, 'params'),
  validate(respondSchema),
  async (req, res, next) => {
    try {
      ok(res, await reviewService.respondToReview(req.user.brand, req.params.id, req.body.response));
    } catch (err) {
      next(err);
    }
  },
);

reviewRouter.get('/user/reviews', requireAuth, async (req, res, next) => {
  try {
    const items = await Review.find({ user: req.user.id });
    ok(res, items);
  } catch (err) {
    next(err);
  }
});
