import { CityChangeRequest } from './cityChangeRequest.model.js';
import { ServiceProvider } from './serviceProvider.model.js';
import { City } from '../super-admin/city.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { logAudit } from '../shared/auditLog.js';
import { emit as emitNotification } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sameText = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

async function activeCityOr400(cityId) {
  const city = await City.findById(cityId).catch(() => null);
  if (!city) throw new ApiError(404, 'City not found');
  if (city.status !== 'Active') throw new ApiError(400, `${city.name} is not an active service city`);
  return city;
}

function currentCitySnapshot(provider) {
  const ref = provider.city?._id || provider.city || null;
  return {
    city: ref,
    name: provider.city?.name || provider.serviceCityName || '',
    state: provider.city?.state || provider.serviceStateName || '',
  };
}

function isSameCity(provider, city) {
  const ref = provider.city?._id || provider.city;
  if (ref) return String(ref) === String(city._id);
  return sameText(provider.serviceCityName, city.name) && (!provider.serviceStateName || sameText(provider.serviceStateName, city.state));
}

/**
 * Moves the provider to `city`. Job feeds (listAvailableJobs) and
 * auto-assignment read the provider's city fresh on every call, so the switch
 * takes effect immediately; the app is told so it can re-join the new city's
 * live broadcast room.
 */
async function applyCity(provider, city) {
  provider.city = city._id;
  provider.serviceCityName = city.name;
  provider.serviceStateName = city.state || '';
  await provider.save();

  try {
    const payload = { serviceProviderId: provider.id, city: { id: city.id, name: city.name, state: city.state } };
    getIO()?.to(`service-provider:${provider._id}`).emit('serviceProvider:city_changed', payload);
  } catch {
    // Live update is best-effort; the next app load reads the new city anyway.
  }
}

// ── Provider ────────────────────────────────────────────────────────────────

export async function listOwnRequests(serviceProviderId) {
  return CityChangeRequest.find({ serviceProvider: serviceProviderId }).sort({ createdAt: -1 }).limit(20);
}

export async function requestCityChange(serviceProviderId, userId, { cityId, reason = '' }) {
  const provider = await ServiceProvider.findById(serviceProviderId).populate('city', 'name state');
  if (!provider) throw new ApiError(404, 'Service provider not found');
  const city = await activeCityOr400(cityId);
  if (isSameCity(provider, city)) throw new ApiError(400, `You already serve ${city.name}`);

  const pending = await CityChangeRequest.findOne({ serviceProvider: serviceProviderId, status: 'Pending' });
  if (pending) {
    throw new ApiError(409, `You already have a pending request to move to ${pending.toCity.name}. Cancel it first to ask for a different city.`);
  }

  try {
    return await CityChangeRequest.create({
      serviceProvider: serviceProviderId,
      fromCity: currentCitySnapshot(provider),
      toCity: { city: city._id, name: city.name, state: city.state },
      reason,
      source: 'provider',
      status: 'Pending',
      requestedBy: userId,
    });
  } catch (err) {
    // Two taps racing past the check above — the partial unique index wins.
    if (err?.code === 11000) throw new ApiError(409, 'You already have a pending city change request');
    throw err;
  }
}

export async function cancelOwnRequest(serviceProviderId, requestId) {
  const request = await CityChangeRequest.findOne({ _id: requestId, serviceProvider: serviceProviderId }).catch(() => null);
  if (!request) throw new ApiError(404, 'City change request not found');
  if (request.status !== 'Pending') throw new ApiError(409, `This request is already ${request.status.toLowerCase()}`);
  request.status = 'Cancelled';
  request.reviewNote = 'Cancelled by the service provider';
  request.reviewedAt = new Date();
  await request.save();
  return request;
}

// ── Admin / ASM ─────────────────────────────────────────────────────────────

/**
 * An ASM reviews requests that touch their zone — moving out of it or into it.
 * The provider's current city can be a name-only snapshot (city ref null),
 * so that side also matches by name, the same fallback adminServiceProvider
 * uses for zone scoping.
 */
function zoneFilter(scopedCity) {
  if (!scopedCity) return {};
  const byName = new RegExp(`^${escapeRegex(scopedCity.name || '')}$`, 'i');
  return {
    $or: [
      { 'toCity.city': scopedCity.id },
      { 'fromCity.city': scopedCity.id },
      { 'fromCity.city': null, 'fromCity.name': byName },
    ],
  };
}

export async function listRequests({ status, page, limit, scopedCity } = {}) {
  const query = { ...zoneFilter(scopedCity) };
  if (status) query.status = status;
  const { skip, limit: lim, page: pg, sort } = parsePagination({ page, limit, sort: '-createdAt' });
  const [items, total] = await Promise.all([
    CityChangeRequest.find(query)
      .populate('serviceProvider', 'name phone status availability')
      .populate('reviewedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(lim),
    CityChangeRequest.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findReviewable(requestId, scopedCity) {
  const request = await CityChangeRequest.findOne({ _id: requestId, ...zoneFilter(scopedCity) }).catch(() => null);
  // Out-of-zone for an ASM reads as not found, like the provider directory.
  if (!request) throw new ApiError(404, 'City change request not found');
  if (request.status !== 'Pending') throw new ApiError(409, `This request is already ${request.status.toLowerCase()}`);
  return request;
}

export async function approveRequest(requestId, { reviewerId, note = '', scopedCity } = {}) {
  const request = await findReviewable(requestId, scopedCity);
  const provider = await ServiceProvider.findById(request.serviceProvider).populate('city', 'name state');
  if (!provider) throw new ApiError(404, 'Service provider not found');
  const city = await activeCityOr400(request.toCity.city);

  await applyCity(provider, city);
  request.status = 'Approved';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.reviewNote = note;
  await request.save();

  await logAudit({
    user: reviewerId,
    action: `Approved service provider "${provider.name}" moving from ${request.fromCity?.name || 'no city'} to ${city.name}`,
    type: 'System',
  });
  if (provider.user) {
    await emitNotification('serviceProvider.city_change_approved', { user: provider.user, cityName: city.name, note });
  }
  return request;
}

export async function rejectRequest(requestId, { reviewerId, note = '', scopedCity } = {}) {
  const request = await findReviewable(requestId, scopedCity);
  const provider = await ServiceProvider.findById(request.serviceProvider).select('name user');

  request.status = 'Rejected';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date();
  request.reviewNote = note;
  await request.save();

  await logAudit({
    user: reviewerId,
    action: `Rejected service provider "${provider?.name || request.serviceProvider}" moving to ${request.toCity.name}`,
    type: 'System',
  });
  if (provider?.user) {
    await emitNotification('serviceProvider.city_change_rejected', { user: provider.user, cityName: request.toCity.name, note });
  }
  return request;
}

/** Super-admin sets the city outright. Any open request is closed as superseded. */
export async function changeCityDirectly(serviceProviderId, { cityId, reason = '', adminId }) {
  const provider = await ServiceProvider.findById(serviceProviderId).populate('city', 'name state');
  if (!provider) throw new ApiError(404, 'Service provider not found');
  const city = await activeCityOr400(cityId);
  if (isSameCity(provider, city)) throw new ApiError(400, `${provider.name} already serves ${city.name}`);

  const fromCity = currentCitySnapshot(provider);
  await CityChangeRequest.updateMany(
    { serviceProvider: provider._id, status: 'Pending' },
    { status: 'Cancelled', reviewedBy: adminId, reviewedAt: new Date(), reviewNote: `Superseded: admin changed the city to ${city.name}` },
  );
  await applyCity(provider, city);

  const record = await CityChangeRequest.create({
    serviceProvider: provider._id,
    fromCity,
    toCity: { city: city._id, name: city.name, state: city.state },
    reason,
    source: 'admin',
    status: 'Approved',
    requestedBy: adminId,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  await logAudit({
    user: adminId,
    action: `Changed service provider "${provider.name}" city from ${fromCity.name || 'no city'} to ${city.name}`,
    type: 'System',
  });
  if (provider.user) {
    await emitNotification('serviceProvider.city_changed_by_admin', { user: provider.user, cityName: city.name, note: reason });
  }

  await provider.populate('city', 'name state');
  return { serviceProvider: provider, change: record };
}
