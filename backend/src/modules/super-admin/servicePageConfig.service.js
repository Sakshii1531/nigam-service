import { ServicePageConfig } from './servicePageConfig.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listServicePageConfigs() {
  return ServicePageConfig.find().sort({ serviceKey: 1 });
}

export async function getServicePageConfig(serviceKey) {
  const config = await ServicePageConfig.findOne({ serviceKey });
  if (!config) throw new ApiError(404, `No page configuration for "${serviceKey}"`);
  return config;
}

/** Upsert so the console can save a service that has never been configured. */
export async function upsertServicePageConfig(serviceKey, updates) {
  return ServicePageConfig.findOneAndUpdate(
    { serviceKey },
    { ...updates, serviceKey },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteServicePageConfig(serviceKey) {
  const config = await ServicePageConfig.findOneAndDelete({ serviceKey });
  if (!config) throw new ApiError(404, `No page configuration for "${serviceKey}"`);
  return { deleted: true };
}
