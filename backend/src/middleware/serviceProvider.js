import { Technician } from '../modules/technician/technician.model.js';
import { ApiError } from './errorHandler.js';

/** Resolves the Technician profile for the authenticated user and attaches it
 * as req.technician — every /tech/* route needs this, so it's centralized here
 * rather than each route re-querying (same reasoning as requireAuth attaching req.user). */
export async function attachTechnician(req, res, next) {
  try {
    const technician = await Technician.findOne({ user: req.user.id });
    if (!technician) throw new ApiError(404, 'No technician profile found for this account');
    req.technician = technician;
    next();
  } catch (err) {
    next(err);
  }
}
