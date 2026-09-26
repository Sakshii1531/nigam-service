// Idempotent seed for the home screen's service rows (docs/master-catalogue
// Phase 22). Each tile points at a real bookable service group; price,
// "Instant" and rating are never stored on it.
//
//   npm run seed:home
//
// Tiles from before Phase 22 (free-text title, typed-in rating/badge, no
// catalogue target) and tiles whose service no longer exists are removed
// from the two service rows first. A row the admin has already set up is
// left alone.
import { pathToFileURL } from 'node:url';
import { HomeTile } from '../src/modules/super-admin/homeTile.model.js';
import { listServiceGroups } from '../src/modules/catalog/offeringSearch.service.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';

const APPLIANCE_TILES = 8;
const PINNED_MOST_BOOKED = 4;

export async function seedHomeSections() {
  const placements = ['most-booked', 'appliance-service'];
  const legacy = await HomeTile.deleteMany({ placement: { $in: placements }, 'target.service': { $exists: false } });
  // Tiles whose service no longer exists (e.g. after a catalogue reset) can
  // never show — remove them so the row is set up again below.
  const existing = new Set((await CatalogService.distinct('_id')).map(String));
  const dangling = (await HomeTile.find({ placement: { $in: placements } }).select('target').lean())
    .filter((t) => !existing.has(String(t.target?.service)))
    .map((t) => t._id);
  const removed = dangling.length ? (await HomeTile.deleteMany({ _id: { $in: dangling } })).deletedCount : 0;

  const groups = await listServiceGroups({});
  // Product services (AC, TV, fridge…), one per category first so the row spans appliances.
  const byCategoryFirst = (list) => {
    const firsts = list.filter((g, i) => list.findIndex((x) => x.category.key === g.category.key) === i);
    return [...firsts, ...list.filter((g) => !firsts.includes(g))];
  };
  const picks = {
    'appliance-service': byCategoryFirst(groups.filter((g) => g.productTypeId)).slice(0, APPLIANCE_TILES),
    'most-booked': byCategoryFirst(groups).slice(0, PINNED_MOST_BOOKED),
  };

  let created = 0;
  for (const placement of placements) {
    if (await HomeTile.exists({ placement })) continue;
    for (const [i, g] of picks[placement].entries()) {
      await HomeTile.create({
        placement,
        title: g.title,
        target: { productType: g.productTypeId, service: g.serviceId },
        sortOrder: i,
        isActive: true,
      });
      created += 1;
    }
  }
  return { removedLegacy: legacy.deletedCount + removed, created };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB, disconnectDB } = await import('../src/config/db.js');
  const { registerAllModels } = await import('../src/config/registerModels.js');
  try {
    await connectDB();
    await registerAllModels();
    const { removedLegacy, created } = await seedHomeSections();
    console.log(`[seed:home] removed ${removedLegacy} old free-text tiles, created ${created} catalogue tiles`);
  } catch (err) {
    console.error('[seed:home] failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
