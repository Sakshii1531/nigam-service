import { ServiceProvider } from '../modules/service-provider/serviceProvider.model.js';
import { ApiError } from './errorHandler.js';

/** Resolves the Service Provider profile for the authenticated user and attaches it
 * as req.service provider — every /service-provider/* route needs this, so it's centralized here
 * rather than each route re-querying (same reasoning as requireAuth attaching req.user). */
export async function attachServiceProvider(req, res, next) {
  try {
    const serviceProvider = await ServiceProvider.findOne({ user: req.user.id });
    if (!serviceProvider) throw new ApiError(404, 'No serviceProvider profile found for this account');
    req.serviceProvider = serviceProvider;
    next();
  } catch (err) {
    next(err);
  }
}
