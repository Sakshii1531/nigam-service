// Short-lived, in-process cache for the customer category tree
// (docs/master-catalogue Phase 7 §7.5). The tree is the most-read catalogue
// endpoint — every booking screen opens with it — and changes only when an
// admin edits the catalogue, so it is cached for TREE_TTL_MS and dropped the
// moment any catalogue document is written (see watchCatalogueWrites below).
//
// Prices shown from a cached tree can at worst be TREE_TTL_MS late to pick up
// a rate whose effectiveFrom passes on its own; the quote (never cached) is
// what a booking is checked against, so the PRICE_CHANGED guard still holds.

const TREE_TTL_MS = 60 * 1000;
const trees = new Map();

export async function cachedTree(key, loc, load) {
  const cacheKey = JSON.stringify([key, (loc.city || '').toLowerCase(), loc.pincode || '']);
  const hit = trees.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value;
  const pending = load();
  trees.set(cacheKey, { value: pending, expires: Date.now() + TREE_TTL_MS });
  try {
    return await pending;
  } catch (err) {
    trees.delete(cacheKey); // never cache a failure (e.g. unknown category)
    throw err;
  }
}

/** Same idea for other catalogue-derived reads (e.g. the search index). */
const values = new Map();
export async function cachedValue(key, load, ttlMs = TREE_TTL_MS) {
  const hit = values.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const pending = load();
  values.set(key, { value: pending, expires: Date.now() + ttlMs });
  try {
    return await pending;
  } catch (err) {
    values.delete(key);
    throw err;
  }
}

export function bustCatalogueCache() {
  trees.clear();
  values.clear();
}

const WRITE_HOOKS = ['save', 'insertMany', 'updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne'];

/** Mongoose plugin: any write to this collection drops the cached trees. */
export function watchCatalogueWrites(schema) {
  for (const hook of WRITE_HOOKS) schema.post(hook, bustCatalogueCache);
}
