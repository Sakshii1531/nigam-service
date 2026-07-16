import { AssignmentWeighting } from './assignmentWeighting.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Singleton doc — service layer enforces exactly one exists (same pattern as
// platformSettings.service.js) and that the four weights sum to 100.
export async function getWeighting() {
  let weighting = await AssignmentWeighting.findOne();
  if (!weighting) weighting = await AssignmentWeighting.create({});
  return weighting;
}

export async function updateWeighting({ proximityPercent, skillPercent, ratingPercent, workloadPercent }) {
  const sum = proximityPercent + skillPercent + ratingPercent + workloadPercent;
  if (sum !== 100) throw new ApiError(400, `Weights must sum to 100 (got ${sum})`);

  const weighting = await getWeighting();
  weighting.proximityPercent = proximityPercent;
  weighting.skillPercent = skillPercent;
  weighting.ratingPercent = ratingPercent;
  weighting.workloadPercent = workloadPercent;
  await weighting.save();
  return weighting;
}
