import { RateCard } from './rateCard.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listRateCards(brandId) {
  return RateCard.find({ brand: brandId }).sort({ category: 1, serviceType: 1 });
}

/** Upsert on (brand, category, serviceType) — matches CallRatesCharges.jsx's UX of
 * "set the rate for this category/service", not a two-step create-then-edit flow. */
export async function upsertRateCard(brandId, { category, serviceType, laborRate, partsMarkupPercent = 0 }) {
  return RateCard.findOneAndUpdate(
    { brand: brandId, category, serviceType },
    { brand: brandId, category, serviceType, laborRate, partsMarkupPercent },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function deleteRateCard(brandId, id) {
  const rateCard = await RateCard.findById(id);
  if (!rateCard) throw new ApiError(404, 'Rate card not found');
  if (String(rateCard.brand) !== brandId) throw new ApiError(403, 'Not authorized to delete this rate card');
  await rateCard.deleteOne();
}
