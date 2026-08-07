import { CategoryBookingConfig } from './categoryBookingConfig.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listCategoryConfigs() {
  return CategoryBookingConfig.find().sort({ categoryName: 1 });
}

export async function getCategoryConfig(categoryName) {
  const config = await CategoryBookingConfig.findOne({ categoryName });
  if (!config) throw new ApiError(404, `No booking configuration for "${categoryName}"`);
  return config;
}

/** categoryName always comes from the URL, never the body. */
export async function upsertCategoryConfig(categoryName, updates) {
  return CategoryBookingConfig.findOneAndUpdate(
    { categoryName },
    { ...updates, categoryName },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteCategoryConfig(categoryName) {
  await CategoryBookingConfig.findOneAndDelete({ categoryName });
  return { deleted: true };
}
