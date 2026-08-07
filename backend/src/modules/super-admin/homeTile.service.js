import { HomeTile } from './homeTile.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Same split as the rest of the CMS: the apps read only live tiles, the console
// reads everything so it can manage what is currently hidden.

export async function listPublicTiles({ placement } = {}) {
  const query = { isActive: true };
  if (placement) query.placement = placement;
  return HomeTile.find(query).sort({ placement: 1, sortOrder: 1 });
}

export async function listAllTiles({ placement } = {}) {
  const query = {};
  if (placement) query.placement = placement;
  return HomeTile.find(query).sort({ placement: 1, sortOrder: 1 });
}

async function findOr404(id) {
  const tile = await HomeTile.findById(id);
  if (!tile) throw new ApiError(404, 'Home tile not found');
  return tile;
}

export async function createTile(data) {
  return HomeTile.create(data);
}

export async function updateTile(id, updates) {
  const tile = await findOr404(id);
  for (const [field, value] of Object.entries(updates)) {
    if (value !== undefined) tile[field] = value;
  }
  await tile.save();
  return tile;
}

export async function deleteTile(id) {
  const tile = await findOr404(id);
  await tile.deleteOne();
  return { deleted: true };
}
