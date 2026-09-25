// Idempotent seed for the Master Service & Offering Catalogue
// (docs/master-catalogue/phase-1-data-model.md). Safe to re-run: every row is
// upserted by its natural key (category key, product-type/service slug,
// variant slug, offering code), and an offering's v1 rate is only created
// when it has no rate yet — re-running never rewrites a rate an admin has
// since changed.
//
//   npm run seed:catalogue
//
// Also imported by seed.js and by tests that need the real catalogue.
import { pathToFileURL } from 'node:url';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Variant } from '../src/modules/catalog/variant.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { findLatestRate, createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { toPaise } from '../src/modules/catalog/money.js';
import { FULL_CATALOGUE_SEED } from './catalogueExpansion.js';

async function upsertCategory(entry) {
  let category = await Category.findOne({ key: entry.key });
  if (!category) {
    if (!entry.create) throw new Error(`[seed:catalogue] Category "${entry.key}" does not exist — run npm run seed first`);
    category = await Category.create({ key: entry.key, ...entry.create });
  }
  category.keywords = entry.keywords || [];
  await category.save();
  return category;
}

async function upsertVariants(category, parent, values) {
  const bySlug = {};
  for (const [i, value] of values.entries()) {
    bySlug[value.slug] = await Variant.findOneAndUpdate(
      { ...parent, slug: value.slug },
      { category: category._id, ...parent, slug: value.slug, label: value.label, sortOrder: i },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return bySlug;
}

async function upsertOffering(category, refs, spec) {
  const { rate, demo, productType, variant, service, code, ...fields } = spec;
  const productTypeDoc = productType ? refs.productTypes[productType] : null;
  const serviceDoc = refs.services[service];
  const variantDoc = variant
    ? (productType ? refs.productVariants[productType] : refs.serviceOptions[service])?.[variant]
    : null;
  if (productType && !productTypeDoc) throw new Error(`[seed:catalogue] ${code}: unknown product type "${productType}"`);
  if (!serviceDoc) throw new Error(`[seed:catalogue] ${code}: unknown service "${service}"`);
  if (variant && !variantDoc) throw new Error(`[seed:catalogue] ${code}: unknown variant "${variant}"`);

  const offering = (await ServiceOffering.findOne({ code })) || new ServiceOffering({ code });
  offering.set({
    ...fields,
    bookingType: productTypeDoc ? 'PRODUCT_LINKED' : 'STANDALONE',
    category: category._id,
    productType: productTypeDoc?._id || null,
    variant: variantDoc?._id || null,
    service: serviceDoc._id,
  });
  await offering.save();

  const created = !(await findLatestRate(offering._id));
  if (created) {
    await createRateVersion(
      offering._id,
      {
        customerPrice: toPaise(rate.customerPrice),
        spPayout: toPaise(rate.spPayout),
        expressFee: toPaise(rate.expressFee),
        expressSpIncentive: toPaise(rate.expressSpIncentive),
      },
      { reason: demo ? 'DEMO rate — replace with the client rate' : 'Initial rate (client brief)', needsRateReview: Boolean(demo) },
    );
  }
  return { offering, rateCreated: created };
}

export async function seedMasterCatalogue(data = FULL_CATALOGUE_SEED) {
  const summary = { categories: 0, offerings: 0, ratesCreated: 0 };

  for (const entry of data) {
    const category = await upsertCategory(entry);
    summary.categories += 1;

    const refs = { productTypes: {}, productVariants: {}, services: {}, serviceOptions: {} };

    for (const [i, pt] of entry.productTypes.entries()) {
      const { variants, ...ptFields } = pt;
      const doc = await ProductType.findOneAndUpdate(
        { category: category._id, slug: pt.slug },
        { category: category._id, ...ptFields, sortOrder: i, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      refs.productTypes[pt.slug] = doc;
      refs.productVariants[pt.slug] = await upsertVariants(category, { productType: doc._id, service: null }, variants || []);
    }

    for (const [i, svc] of entry.services.entries()) {
      const { options, ...svcFields } = svc;
      const doc = await CatalogService.findOneAndUpdate(
        { category: category._id, slug: svc.slug },
        { category: category._id, optionDimension: null, ...svcFields, sortOrder: i, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      refs.services[svc.slug] = doc;
      refs.serviceOptions[svc.slug] = await upsertVariants(category, { productType: null, service: doc._id }, options || []);
    }

    for (const [i, spec] of entry.offerings.entries()) {
      const { rateCreated } = await upsertOffering(category, refs, { displayOrder: i, ...spec });
      summary.offerings += 1;
      if (rateCreated) summary.ratesCreated += 1;
    }
  }

  return summary;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB, disconnectDB, ensureIndexes } = await import('../src/config/db.js');
  const { registerAllModels } = await import('../src/config/registerModels.js');
  try {
    await connectDB();
    await registerAllModels();
    await ensureIndexes();
    const summary = await seedMasterCatalogue();
    console.log(
      `[seed:catalogue] ${summary.categories} categories, ${summary.offerings} offerings, ${summary.ratesCreated} new v1 rates`,
    );
  } catch (err) {
    console.error('[seed:catalogue] failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
