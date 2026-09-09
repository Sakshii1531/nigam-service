import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Job } from '../service-provider/job.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Platform-wide service provider directory for the super-admin console. Distinct from
// modules/service provider/service provider.service.js, which is the service provider's own
// self-service view of a single profile (their id comes from the JWT).

export async function listServiceProviders({
  status,
  availability,
  city,
  search,
  spec,
  page,
  limit,
  sort,
} = {}) {
  const query = {};
  if (status) query.status = status;
  if (availability) query.availability = availability;
  if (city) query.city = city;
  if (spec) query.specs = spec;

  if (search) {
    // Escape regex metacharacters — a search for "a+b" must not compile as a quantifier.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    query.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ServiceProvider.find(query)
      .populate('city', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ServiceProvider.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

// scopedCity is only ever set for an ASM caller (see adminServiceProvider.routes.js's
// scopeCityForCaller) — a super-admin passes none and sees every provider. An
// ASM reaching for an id outside their own zone gets the same 404 as a
// nonexistent id, rather than a 403 that would confirm the id is real.
async function findOr404(id, scopedCity) {
  const serviceProvider = await ServiceProvider.findById(id).populate('city', 'name');
  if (!serviceProvider) throw new ApiError(404, 'ServiceProvider not found');
  if (scopedCity && String(serviceProvider.city?._id || serviceProvider.city) !== scopedCity) {
    throw new ApiError(404, 'ServiceProvider not found');
  }
  return serviceProvider;
}

export async function getServiceProvider(id, scopedCity) {
  return findOr404(id, scopedCity);
}

/**
 * Approve / suspend / reset a service provider to pending.
 *
 * A service provider who is not Active must not keep advertising themselves as
 * Available to the job feed, so availability is forced Offline alongside.
 * Re-activating leaves availability Offline — the service provider marks themselves
 * Available from their own app.
 */
export async function updateServiceProviderStatus(id, status, scopedCity) {
  const serviceProvider = await findOr404(id, scopedCity);
  serviceProvider.status = status;
  if (status !== 'Active') serviceProvider.availability = 'Offline';
  await serviceProvider.save();

  if (serviceProvider.user) {
    const userStatus = status === 'Active' ? 'Active' : status === 'Pending' ? 'Pending' : 'Suspended';
    await User.findByIdAndUpdate(serviceProvider.user, { status: userStatus });
  }

  return serviceProvider;
}

export async function deleteServiceProvider(id) {
  const serviceProvider = await findOr404(id);

  // Jobs carry a required service provider ref, so removing a service provider mid-job would
  // orphan them. Callers should reassign or close those jobs first. 'idle' and
  // 'completed' are the two steps where nobody is mid-engagement.
  const activeJobs = await Job.countDocuments({
    serviceProvider: serviceProvider._id,
    activeStep: { $nin: ['idle', 'completed'] },
  });
  if (activeJobs > 0) {
    throw new ApiError(409, `Service Provider has ${activeJobs} active job(s) — reassign them before deleting`);
  }

  await serviceProvider.deleteOne();
  if (serviceProvider.user) {
    await User.findByIdAndDelete(serviceProvider.user);
  }
  return { deleted: true, humanId: serviceProvider.humanId, name: serviceProvider.name };
}
