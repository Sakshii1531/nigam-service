import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as couponService from './coupon.service.js';
import { createCouponSchema, updateCouponSchema, checkoutCouponsSchema } from './coupon.validation.js';

export const couponRouter = Router();

couponRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    ok(res, await couponService.listActiveCoupons());
  } catch (err) {
    next(err);
  }
});

// The checkout's coupon list: every live coupon, with whether it applies to
// this order and, when it doesn't, why. The discount itself is always worked
// out again by the quote, so a client-sent order value only affects this list.
couponRouter.post('/checkout', requireAuth, validate(checkoutCouponsSchema), async (req, res, next) => {
  try {
    ok(res, await couponService.listCouponsForCheckout({ ...req.body, userId: req.user.id }));
  } catch (err) {
    next(err);
  }
});

couponRouter.post('/', requireAuth, requireRole(ROLES.SUPER_ADMIN), validate(createCouponSchema), async (req, res, next) => {
  try {
    created(res, await couponService.createCoupon(req.body));
  } catch (err) {
    next(err);
  }
});

couponRouter.get('/admin', requireAuth, requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    ok(res, await couponService.listAllCoupons());
  } catch (err) {
    next(err);
  }
});

couponRouter.patch('/:id', requireAuth, requireRole(ROLES.SUPER_ADMIN), validate(updateCouponSchema), async (req, res, next) => {
  try {
    ok(res, await couponService.updateCoupon(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

couponRouter.delete('/:id', requireAuth, requireRole(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    ok(res, await couponService.deleteCoupon(req.params.id));
  } catch (err) {
    next(err);
  }
});
