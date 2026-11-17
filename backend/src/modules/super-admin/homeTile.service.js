import { HomeTile, SERVICE_TILE_PLACEMENTS } from './homeTile.model.js';
import { CatalogService } from '../catalog/catalogService.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { findSectionForTile } from './homeSection.service.js';

// Same split as the rest of the CMS: the apps read only live tiles, the console
// reads everything so it can manage what is currently hidden.

function scope({ placement, section } = {}) {
  const query = {};
  if (placement) query.placement = placement;
  if (section === 'none') query.section = null;
  else if (section) query.section = section;
  return query;
}

export async function listPublicTiles(filter = {}) {
  return HomeTile.find({ ...scope(filter), isActive: true }).sort({ placement: 1, sortOrder: 1 });
}

export async function listAllTiles(filter = {}) {
  return HomeTile.find(scope(filter)).sort({ placement: 1, sortOrder: 1 });
}

// Which tile placement each custom section kind holds.
const SECTION_PLACEMENT = { 'brand-cards': 'brand-card', 'service-row': 'appliance-service' };

/** A tile put in a custom section must be of the kind that section holds. */
async function checkSection(data) {
  if (!data.section) return data;
  const section = await findSectionForTile(data.section);
  if (SECTION_PLACEMENT[section.kind] !== data.placement) {
    throw new ApiError(400, `That section holds ${section.kind === 'brand-cards' ? 'brand cards' : 'service tiles'}, not "${data.placement}" tiles`);
  }
  return data;
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
  return HomeTile.create(await withServiceTarget(await checkSection(data)));
}

export async function updateTile(id, updates) {
  const tile = await findOr404(id);
  // A tile never moves between sections.
  const { section: _ignored, ...changes } = updates;
  const data = await withServiceTarget(changes, tile.toObject());
  for (const [field, value] of Object.entries(data)) {
    if (value !== undefined) tile[field] = value;
  }
  if (SERVICE_TILE_PLACEMENTS.includes(tile.placement) && !tile.title) tile.title = await describeTarget(tile.target);
  await tile.save();
  return tile;
}

/**
 * Puts a placement's tiles in the given order. Every id must be a tile of that
 * placement (so one row cannot be used to renumber another), and tiles not
 * listed keep their place after the listed ones.
 */
export async function reorderTiles(placement, ids, section = null) {
  const existing = await HomeTile.find({ placement, section: section || null }).select('_id sortOrder').sort({ sortOrder: 1 }).lean();
  const known = new Set(existing.map((t) => String(t._id)));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, 'Each tile can appear only once');
  const unknown = ids.filter((id) => !known.has(String(id)));
  if (unknown.length) throw new ApiError(400, 'One or more tiles do not belong to this row');
  const rest = existing.map((t) => String(t._id)).filter((id) => !ids.includes(id));
  const order = [...ids, ...rest];
  // updateOne (not bulkWrite) so the catalogue-cache write hook fires.
  await Promise.all(order.map((id, index) => HomeTile.updateOne({ _id: id }, { $set: { sortOrder: index } })));
  return listAllTiles({ placement, section: section || 'none' });
}

export async function deleteTile(id) {
  const tile = await findOr404(id);
  await tile.deleteOne();
  return { deleted: true };
}
