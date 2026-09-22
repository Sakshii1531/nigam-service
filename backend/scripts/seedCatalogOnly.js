// Standalone, idempotent catalog upsert — deliberately does NOT import or run
// seed.js's other steps (RBAC users, demo entities, Notification.deleteMany).
// Safe to re-run: every write is a findOneAndUpdate({upsert:true}) keyed by
// Category.key / ProductType.slug / ServiceCatalogItem.slug, so re-running
// only refreshes fields on existing rows and adds new ones — it never deletes.
import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { CATALOG_SEED } from './catalogSeedData.js';

async function upsertCatalog() {
  for (const entry of CATALOG_SEED) {
    const { productTypes, services, ...categoryFields } = entry;
    const category = await Category.findOneAndUpdate({ key: entry.key }, categoryFields, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    await Promise.all(
      productTypes.map((pt) =>
        ProductType.findOneAndUpdate({ category: category._id, slug: pt.slug }, { category: category._id, ...pt }, { upsert: true }),
      ),
    );
    await Promise.all(
      services.map((s) =>
        ServiceCatalogItem.findOneAndUpdate({ category: category._id, slug: s.slug }, { category: category._id, ...s }, { upsert: true }),
      ),
    );
  }
  console.log(`[seedCatalogOnly] catalog ready: ${CATALOG_SEED.length} categories`);
}

async function main() {
  await connectDB();
  await ensureIndexes();
  await upsertCatalog();
  await disconnectDB();
}

main().catch((err) => {
  console.error('[seedCatalogOnly] failed:', err);
  process.exit(1);
});
