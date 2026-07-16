import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as bookingService from './booking.service.js';
import { createBookingSchema, listBookingsQuerySchema, idParamSchema } from './booking.validation.js';

export const bookingRouter = Router();
bookingRouter.use(requireAuth, requireRole(ROLES.CUSTOMER));

bookingRouter.post('/', validate(createBookingSchema), async (req, res, next) => {
  try {
    const { booking, serviceRequest, technician } = await bookingService.createBooking(req.user.id, req.body);
    created(res, {
      booking,
      serviceRequest,
      technician: technician ? { id: technician.id, name: technician.name, rating: technician.rating } : null,
    });
  } catch (err) {
    next(err);
  }
});

bookingRouter.get('/', validate(listBookingsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await bookingService.listBookings(req.user.id, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

bookingRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await bookingService.getBooking(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

bookingRouter.post('/:id/cancel', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await bookingService.cancelBooking(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});
