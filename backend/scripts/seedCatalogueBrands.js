// Idempotent seed for catalogue brands (docs/master-catalogue Phase 19) — the
// manufacturers a customer picks on a product-linked booking. Inserted once:
// an admin's later edits (warranty months, categories) are never overwritten.
// Categories used to carry their own `brands` list; that copy is dropped.
//
//   npm run seed:brands
//
// Also imported by seed.js.
import { pathToFileURL } from 'node:url';
import { Category } from '../src/modules/catalog/category.model.js';
import { CatalogueBrand } from '../src/modules/catalog/catalogueBrand.model.js';
import { CATALOGUE_BRAND_SEED } from './catalogueBrandSeedData.js';

export async function seedCatalogueBrands() {
  await Category.collection.updateMany({ brands: { $exists: true } }, { $unset: { brands: '' } });
  let inserted = 0;
  for (const brand of CATALOGUE_BRAND_SEED) {
    const nameKey = brand.name.toLowerCase();
    const res = await CatalogueBrand.updateOne({ nameKey }, { $setOnInsert: { ...brand, nameKey, isActive: true } }, { upsert: true });
    inserted += res.upsertedCount;
  }
  return { total: CATALOGUE_BRAND_SEED.length, inserted };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB, disconnectDB, ensureIndexes } = await import('../src/config/db.js');
  const { registerAllModels } = await import('../src/config/registerModels.js');
  try {
    await connectDB();
    await registerAllModels();
    await ensureIndexes();
    const { total, inserted } = await seedCatalogueBrands();
    console.log(`[seed:brands] ${inserted} new, ${total - inserted} already present`);
  } catch (err) {
    console.error('[seed:brands] failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
