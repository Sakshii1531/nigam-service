// Builds the full Master Catalogue seed (docs/master-catalogue Phase 8): the
// hand-built categories of masterCatalogueSeedData.js plus every other category
// the app shows, from catalogueExpansionData.js, each with a DEMO rate.
//
// Rates are random but deterministic — derived from the offering code — so
// every seed run (and every test) sees the same numbers:
//   customer price ≈ base × type factor × 0.85–1.35, ending in 9
//   partner payout ≈ 55–65 % of the price, rounded to ₹10
import { MASTER_CATALOGUE_SEED } from './masterCatalogueSeedData.js';
import { NEW_CATEGORIES, EXTENSIONS } from './catalogueExpansionData.js';
import { buildOfferingCode } from '../src/modules/catalog/offeringCode.js';

const EXPRESS_RATE = { expressFee: 99, expressSpIncentive: 50 };
const NO_EXPRESS_RATE = { expressFee: 0, expressSpIncentive: 0 };

/** Two stable numbers in [0, 1) from a string (FNV-1a → mulberry32). */
function randoms(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  const next = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return [next(), next()];
}

export function demoRate(code, base, { typeIndex = 0, express = true } = {}) {
  const [a, b] = randoms(code);
  const raw = base * (1 + 0.12 * typeIndex) * (0.85 + a * 0.5);
  const customerPrice = Math.max(99, Math.round(raw / 10) * 10 - 1);
  const spPayout = Math.round((customerPrice * (0.55 + b * 0.1)) / 10) * 10;
  return { customerPrice, spPayout, ...(express ? EXPRESS_RATE : NO_EXPRESS_RATE) };
}

// "Single Door" → "Single Door Refrigerator"; "Desert Cooler" already names the appliance.
function typeLabel(categoryKey, pt) {
  const noun = categoryKey.split(' ').pop().toLowerCase();
  return pt.name.toLowerCase().includes(noun) || categoryKey === 'Geyser' ? pt.name : `${pt.name} ${categoryKey}`;
}

const isVisit = (svc) => /inspection|consultation|diagnosis|checkup/i.test(svc.name || svc.slug);

function offeringFor(category, svc, pt, typeIndex, { unitLabel, express }) {
  const code = buildOfferingCode({ category: category.key, productType: pt?.name, service: svc.name });
  const visit = isVisit(svc);
  const perUnit = !visit && (svc.unitLabel || unitLabel);
  return {
    code,
    name: pt ? `${typeLabel(category.key, pt)} ${svc.name}` : svc.name,
    productType: pt?.slug || null,
    variant: null,
    service: svc.slug,
    pricingUnit: perUnit ? 'PER_UNIT' : 'PER_SERVICE',
    unitLabel: perUnit ? svc.unitLabel || unitLabel : visit ? 'per visit' : 'per job',
    minQty: 1,
    maxQty: perUnit ? svc.maxQty || 3 : 1,
    express: { enabled: express && !visit },
    description: svc.desc || '',
    rate: demoRate(code, svc.base, { typeIndex, express: express && !visit }),
    demo: true,
  };
}

function newCategory(entry) {
  const express = entry.express !== false;
  const services = entry.services.map(({ base: _base, unitLabel: _u, maxQty: _m, ...svc }) => ({ ...svc, keywords: [] }));
  const offerings = entry.productTypes.length
    ? entry.productTypes.flatMap((pt, i) => entry.services.map((svc) => offeringFor(entry, svc, pt, i, { unitLabel: entry.unitLabel, express })))
    : entry.services.map((svc) => offeringFor(entry, svc, null, 0, { unitLabel: entry.unitLabel, express }));
  return {
    key: entry.key,
    keywords: entry.keywords,
    productTypes: entry.productTypes.map((pt) => ({ ...pt, variantDimension: null, variants: [] })),
    services,
    offerings,
  };
}

function extend(base, ext) {
  const entry = structuredClone(base);
  entry.productTypes.push(...ext.productTypes.map((pt) => ({ ...pt, variantDimension: null, variants: [] })));
  for (const svc of ext.services) {
    if (!entry.services.some((s) => s.slug === svc.slug)) {
      const { base: _b, types: _t, ...fields } = svc;
      entry.services.push({ ...fields, keywords: [] });
    }
  }
  const skip = new Set((ext.skip || []).map(([pt, svc]) => `${pt}|${svc}`));
  const taken = new Set(entry.offerings.map((o) => `${o.productType || ''}|${o.variant || ''}|${o.service}`));
  const types = entry.productTypes;
  for (const svc of ext.services) {
    const named = entry.services.find((s) => s.slug === svc.slug);
    const full = { ...named, ...svc, name: named.name };
    const targets = types.length ? types.filter((pt) => !svc.types || svc.types.includes(pt.slug)) : [null];
    for (const pt of targets) {
      if (pt && skip.has(`${pt.slug}|${svc.slug}`)) continue;
      if (taken.has(`${pt?.slug || ''}||${svc.slug}`)) continue;
      const offering = offeringFor(entry, full, pt, types.indexOf(pt), { unitLabel: ext.unitLabel, express: true });
      entry.offerings.push(offering);
    }
  }
  for (const extra of ext.extraOfferings || []) {
    entry.offerings.push({
      code: extra.code,
      name: extra.name,
      productType: extra.productType,
      variant: extra.variant,
      service: extra.service,
      unitLabel: ext.unitLabel,
      minQty: 1,
      maxQty: 3,
      express: { enabled: true },
      rate: demoRate(extra.code, extra.base),
      demo: true,
    });
  }
  return entry;
}

export function buildFullCatalogueSeed() {
  const byKey = new Map(EXTENSIONS.map((e) => [e.key, e]));
  const handBuilt = MASTER_CATALOGUE_SEED.map((entry) => (byKey.has(entry.key) ? extend(entry, byKey.get(entry.key)) : entry));
  return [...handBuilt, ...NEW_CATEGORIES.map(newCategory)];
}

export const FULL_CATALOGUE_SEED = buildFullCatalogueSeed();
