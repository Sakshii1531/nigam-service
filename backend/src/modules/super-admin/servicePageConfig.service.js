import { ServicePageConfig } from './servicePageConfig.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listServicePageConfigs() {
  return ServicePageConfig.find().sort({ serviceKey: 1 });
}

/**
 * Null when the service has no configured page — that is an ordinary state, not
 * an error: the customer app falls back to its built-in copy for any service an
 * admin has not customised. This used to 404, so simply opening a service page
 * logged a failed request in every customer's console.
 */
export async function getServicePageConfig(serviceKey) {
  return ServicePageConfig.findOne({ serviceKey });
}

/** Upsert so the console can save a service that has never been configured. */
export async function upsertServicePageConfig(serviceKey, updates) {
  const payload = { ...updates, serviceKey };
  if (Array.isArray(payload.subServices)) {
    payload.subServices = payload.subServices.join(', ');
  }
  return ServicePageConfig.findOneAndUpdate(
    { serviceKey },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteServicePageConfig(serviceKey) {
  const config = await ServicePageConfig.findOneAndDelete({ serviceKey });
  if (!config) throw new ApiError(404, `No page configuration for "${serviceKey}"`);
  return { deleted: true };
}
