import { HomeTile, SERVICE_TILE_PLACEMENTS } from './homeTile.model.js';
import { CatalogService } from '../catalog/catalogService.model.js';
import { ProductType } from '../catalog/productType.model.js';
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

/**
 * Checks a service tile's target is a real catalogue service (and that the
 * product type, if any, belongs to the same category) and returns its name,
 * e.g. "Split AC Installation" — the tile's default title.
 */
async function describeTarget(target) {
  const [service, productType] = await Promise.all([
    CatalogService.findById(target.service).select('name category').lean(),
    target.productType ? ProductType.findById(target.productType).select('name category').lean() : null,
  ]);
  if (!service) throw new ApiError(400, 'That service is not in the catalogue');
  if (target.productType && (!productType || String(productType.category) !== String(service.category))) {
    throw new ApiError(400, 'That product type does not belong to the service’s category');
  }
  return productType ? `${productType.name} ${service.name}` : service.name;
}

async function withServiceTarget(data, current = {}) {
  const placement = data.placement || current.placement;
  if (!SERVICE_TILE_PLACEMENTS.includes(placement)) return data;
  const target = data.target || current.target;
  if (!target?.service) throw new ApiError(400, 'Pick the service this tile books');
  const name = data.target ? await describeTarget({ productType: target.productType || null, service: target.service }) : null;
  const title = data.title ?? current.title;
  return {
    ...data,
    ...(data.target ? { target: { productType: target.productType || null, service: target.service } } : {}),
    ...(!title && name ? { title: name } : {}),
  };
}

export async function createTile(data) {
  return HomeTile.create(await withServiceTarget(data));
}

export async function updateTile(id, updates) {
  const tile = await findOr404(id);
  const data = await withServiceTarget(updates, tile.toObject());
  for (const [field, value] of Object.entries(data)) {
    if (value !== undefined) tile[field] = value;
  }
  if (SERVICE_TILE_PLACEMENTS.includes(tile.placement) && !tile.title) tile.title = await describeTarget(tile.target);
  await tile.save();
  return tile;
}

export async function deleteTile(id) {
  const tile = await findOr404(id);
  await tile.deleteOne();
  return { deleted: true };
}
