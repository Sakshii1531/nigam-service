import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Job } from '../service-provider/job.model.js';
import { User } from '../auth/user.model.js';
import { ASM } from './asm.model.js';
import { City } from './city.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';

// Platform-wide service provider directory for the super-admin console. Distinct from
// modules/service provider/service provider.service.js, which is the service provider's own
// self-service view of a single profile (their id comes from the JWT).

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A provider "in" a city means either: `city` (the ObjectId ref) matches, or
 * — self-registration (serviceProviderRegistration.routes.js) only resolves
 * `city` by an exact case-insensitive name lookup against the City
 * collection, so a typo, extra whitespace, or a city not yet added there
 * leaves `city: null` even though `serviceCityName` (always saved verbatim)
 * correctly says which zone the applicant meant. Without this fallback such
 * a provider is invisible to every zone-scoped view (an ASM's own list, and
 * this same filter used for super-admin's ?city= and ?asm=), including
 * Pending Approvals — exactly the case that must never silently vanish.
 */
async function cityMatch(cityId) {
  const cityDoc = await City.findById(cityId).select('name');
  if (!cityDoc) return { city: cityId };
  return { $or: [{ city: cityId }, { city: null, serviceCityName: new RegExp(`^${escapeRegex(cityDoc.name)}$`, 'i') }] };
}

/**
 * The zone <-> ASM relationship is derived from city, never stored on
 * ServiceProvider (see asm.service.js's findAsmForCity) — one batched lookup
 * here rather than N+1 per row, since a list page can render 200 providers
 * spanning only a handful of cities.
 */
async function attachAsm(items) {
  const cityIds = [...new Set(items.map((i) => String(i.city?._id || i.city || '')).filter(Boolean))];
  const asms = cityIds.length ? await ASM.find({ city: { $in: cityIds } }).select('name city') : [];
  const asmByCity = new Map(asms.map((a) => [String(a.city), { id: a.id, name: a.name }]));
  return items.map((item) => {
    const obj = item.toJSON();
    return { ...obj, asm: asmByCity.get(String(item.city?._id || item.city || '')) || null };
  });
}

export async function listServiceProviders({
  status,
  availability,
  city,
  asm,
  search,
  spec,
  page,
  limit,
  sort,
} = {}) {
  const query = {};
  if (status) query.status = status;
  if (availability) query.availability = availability;
  if (spec) query.specs = spec;

  // city and asm (below) both end up as an $or clause (cityMatch's
  // city-ref-or-name-fallback) — folded into $and alongside search's own
  // $or so neither ever silently overwrites the other on the query object.
  const andClauses = [];

  if (city) andClauses.push(await cityMatch(city));

  // Filtering by ASM means filtering by that ASM's zone — the relationship
  // is derived, not stored (see attachAsm above), so resolve the ASM's city
  // first and fold it into the same fallback-aware city match a direct
  // ?city= would use.
  if (asm) {
    const asmDoc = await ASM.findById(asm).select('city');
    // An unknown/deleted ASM id must return zero rows, not "no filter at all".
    andClauses.push(asmDoc ? await cityMatch(asmDoc.city) : { _id: null });
  }

  if (search) {
    // Escape regex metacharacters — a search for "a+b" must not compile as a quantifier.
    const rx = new RegExp(escapeRegex(search), 'i');
    andClauses.push({ $or: [{ name: rx }, { phone: rx }, { email: rx }] });
  }

  if (andClauses.length) query.$and = andClauses;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    ServiceProvider.find(query)
      .populate('city', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ServiceProvider.countDocuments(query),
  ]);

  return { items: await attachAsm(items), meta: paginationMeta({ page: pg, limit: lim, total }) };
}

// scopedCity ({ id, name }) is only ever set for an ASM caller (see
// adminServiceProvider.routes.js's scopeCityForCaller) — a super-admin
// passes none and sees every provider. An ASM reaching for an id outside
// their own zone gets the same 404 as a nonexistent id, rather than a 403
// that would confirm the id is real.
async function findOr404(id, scopedCity) {
  const serviceProvider = await ServiceProvider.findById(id).populate('city', 'name');
  if (!serviceProvider) throw new ApiError(404, 'ServiceProvider not found');
  if (scopedCity) {
    const cityRefMatches = String(serviceProvider.city?._id || serviceProvider.city || '') === scopedCity.id;
    // Same city-ref-or-name fallback as cityMatch (list) — a provider whose
    // registration left city: null (an unresolved typo/whitespace/unknown
    // city, see cityMatch's comment) must still be reachable by the ASM
    // whose zone their serviceCityName actually names.
    const nameFallbackMatches = !serviceProvider.city && serviceProvider.serviceCityName
      && serviceProvider.serviceCityName.trim().toLowerCase() === scopedCity.name.trim().toLowerCase();
    if (!cityRefMatches && !nameFallbackMatches) throw new ApiError(404, 'ServiceProvider not found');
  }
  return serviceProvider;
}

export async function getServiceProvider(id, scopedCity) {
  const serviceProvider = await findOr404(id, scopedCity);
  const [withAsm] = await attachAsm([serviceProvider]);
  return withAsm;
}

/**
 * Approve / suspend / reset a service provider to pending.
 *
 * A service provider who is not Active must not keep advertising themselves as
 * Available to the job feed, so availability is forced Offline alongside.
 * Re-activating leaves availability Offline — the service provider marks themselves
 * Available from their own app.
 *
 * actingUserId is logged (see logAudit below) rather than inferred — this is
 * the one mutating action an ASM currently has (requireAsmPermission
 * ('techs:manage')), so it's also the whole of "what did this ASM do" for
 * their detail page's activity log.
 */
export async function updateServiceProviderStatus(id, status, scopedCity, actingUserId) {
  const serviceProvider = await findOr404(id, scopedCity);
  const previousStatus = serviceProvider.status;
  serviceProvider.status = status;
  if (status !== 'Active') serviceProvider.availability = 'Offline';
  // Approving is the console's KYC review — the reviewer opens the uploaded
  // Aadhaar before approving — but it never touched the per-document statuses,
  // so an approved partner's Verification screen said "Pending" forever.
  // Rejected documents are left alone; only still-pending ones clear.
  if (status === 'Active') {
    const verification = serviceProvider.verification || {};
    for (const key of ['aadharStatus', 'panStatus', 'backgroundCheckStatus']) {
      if (!verification[key] || verification[key] === 'Pending') {
        serviceProvider.set(`verification.${key}`, 'Verified');
      }
    }
  }
  await serviceProvider.save();

  if (serviceProvider.user) {
    const userStatus = status === 'Active' ? 'Active' : status === 'Pending' ? 'Pending' : 'Suspended';
    await User.findByIdAndUpdate(serviceProvider.user, { status: userStatus });
  }

  if (actingUserId && previousStatus !== status) {
    await logAudit({
      user: actingUserId,
      action: `Changed service provider "${serviceProvider.name}" status from ${previousStatus} to ${status}`,
      type: 'System',
    });
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
