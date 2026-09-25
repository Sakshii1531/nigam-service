import { Category } from './category.model.js';
import { ServiceOffering } from './serviceOffering.model.js';
import { loadBookableOfferings } from './offeringBrowse.service.js';
import { toRupees } from './money.js';
import { cachedValue } from './catalogCache.js';
import { synonymsOf } from './searchSynonyms.js';
import { Booking } from '../booking/booking.model.js';

// Customer search over the Master Catalogue (docs/master-catalogue Phases 6, 11).
//
// Every query word must match a word of the offering's searchText — its code,
// name, category name + keywords, product type, size and service name +
// keywords — so "AC installation" finds AC installs, not every installation.
// A word matches, best first: exactly · through a synonym (fridge ↔
// refrigerator, searchSynonyms.js) · as a prefix ("insta") · with a typo
// (one edit, two for long words, same first letter: "instalation"). Only bookable offerings are searched (same filter as
// the booking tree: active, available, serviceable, rated), and results are
// grouped so a query doesn't return a wall of near-identical sizes.
// Customer-safe: prices only, never payout.

const STOP_WORDS = new Set(['and', 'the', 'for', 'of', 'a', 'an', 'service', 'services', 'my', 'in', 'near', 'me', 'book', 'to', 'with']);

const stem = (word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
const words = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem);
export const queryTokens = (q) => words(q).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

/** Levenshtein distance, giving up once it passes `max`. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

const typoAllowance = (token) => (token.length >= 9 ? 2 : token.length >= 5 ? 1 : 0);

/**
 * How one query word matches a set of words: { score, word, fuzzy } or null.
 * Exact 4 · synonym 3 · prefix 2 · typo 1. A typo match must keep the first
 * letter, and may also be against the start of a longer word (mid-typing:
 * "instalat" → "installation").
 */
function matchToken(token, haystack) {
  if (haystack.includes(token)) return { score: 4, word: token, fuzzy: false };
  for (const syn of synonymsOf(token)) if (haystack.includes(syn)) return { score: 3, word: syn, fuzzy: false };
  const prefixed = haystack.find((w) => w.startsWith(token));
  if (prefixed) return { score: 2, word: prefixed, fuzzy: false };
  const max = typoAllowance(token);
  if (!max) return null;
  let best = null;
  for (const w of haystack) {
    if (w[0] !== token[0]) continue;
    const whole = editDistance(token, w, max);
    const start = w.length > token.length ? editDistance(token, w.slice(0, token.length), max) : whole;
    const d = Math.min(whole, start);
    if (d <= max && (!best || d < best.d)) best = { d, word: w };
  }
  return best ? { score: 1, word: best.word, fuzzy: true } : null;
}

/** Sum of word scores, plus the typo corrections used; null when any word doesn't match. */
function scoreText(tokens, haystackWords) {
  let score = 0;
  const corrections = new Map();
  for (const token of tokens) {
    const hit = matchToken(token, haystackWords);
    if (!hit) return null;
    score += hit.score;
    if (hit.fuzzy) corrections.set(token, hit.word);
  }
  return { score, corrections };
}

function deepLink(categoryKey, { productTypeSlug, serviceSlug, offeringCode }) {
  const params = new URLSearchParams();
  if (productTypeSlug) params.set('pt', productTypeSlug);
  if (serviceSlug) params.set('svc', serviceSlug);
  if (offeringCode) params.set('offering', offeringCode);
  const qs = params.toString();
  return `/book/${encodeURIComponent(categoryKey)}${qs ? `?${qs}` : ''}`;
}

/**
 * Every bookable offering for a location with its words pre-split — the
 * search "index". A few hundred offerings: matched in memory, cached like the
 * category tree and dropped on any catalogue write (catalogCache.js).
 */
function searchIndex(loc) {
  const key = `search-index|${(loc.city || '').toLowerCase()}|${loc.pincode || ''}`;
  return cachedValue(key, async () =>
    (await loadBookableOfferings({}, loc)).map(({ offering, rate }) => ({
      offering,
      rate,
      words: words(offering.searchText),
      nameWords: words(`${offering.service.name} ${offering.productType?.name || ''} ${offering.category.name}`),
      serviceWords: words(offering.service.name),
    })),
  );
}

/** Scored bookable offerings for a query (unsorted). */
async function scoredOfferings(tokens, loc) {
  if (!tokens.length) return [];
  return (await searchIndex(loc))
    .map(({ offering, rate, words: haystack, nameWords, serviceWords }) => {
      const hit = scoreText(tokens, haystack);
      if (!hit) return null;
      // Prefer offerings whose own service / product names carry the words,
      // and above all whose *service* does — "chimney clean" is about the
      // cleaning service, not every service of the Auto-Clean chimney type.
      const specific = scoreText(tokens, nameWords);
      const serviceBonus = 3 * tokens.filter((t) => matchToken(t, serviceWords)).length;
      return {
        offering,
        rate,
        score: hit.score + (specific?.score ?? 0) + serviceBonus,
        specific: Boolean(specific),
        corrections: hit.corrections,
      };
    })
    .filter(Boolean);
}

function group(scored, keyOf, describe) {
  const groups = new Map();
  for (const entry of scored) {
    const key = keyOf(entry.offering);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.values()]
    .map((entries) => {
      const prices = entries.map((e) => e.rate.customerPrice);
      return {
        ...describe(entries),
        fromPrice: toRupees(Math.min(...prices)),
        offeringCount: entries.length,
        score: Math.max(...entries.map((e) => e.score)),
      };
    })
    .sort((a, b) => b.score - a.score || a.fromPrice - b.fromPrice || a.title.localeCompare(b.title));
}

/**
 * "Split AC" already says what it is; "Side By Side" doesn't, so it reads
 * "Side By Side Refrigerator". A synonym counts ("Solar Heater" is a geyser).
 */
function typeTitle(offering) {
  const type = offering.productType.name;
  const typeWords = new Set(words(type));
  const says = words(offering.category.name).some((w) => typeWords.has(w) || [...synonymsOf(w)].some((syn) => typeWords.has(syn)));
  return says ? type : `${type} ${offering.category.name}`;
}

const describeProductGroup = (entries) => {
  const { offering } = entries[0];
  const categoryKey = offering.category.key;
  const title = offering.productType ? `${typeTitle(offering)} ${offering.service.name}` : offering.service.name;
  return {
    title,
    category: { key: categoryKey, name: offering.category.name },
    productType: offering.productType ? offering.productType.name : null,
    service: offering.service.name,
    deepLink: deepLink(categoryKey, {
      productTypeSlug: offering.productType?.slug,
      serviceSlug: offering.service.slug,
      offeringCode: entries.length === 1 ? offering.code : undefined,
    }),
  };
};

async function matchingCategories(tokens) {
  if (!tokens.length) return [];
  const [categories, withOfferings] = await Promise.all([
    Category.find({ isActive: true }).select('key name keywords').lean(),
    ServiceOffering.distinct('category', { isActive: true }),
  ]);
  const bookable = new Set(withOfferings.map(String));
  return categories
    .filter((c) => bookable.has(String(c._id)))
    .map((c) => ({ c, hit: scoreText(tokens, words(`${c.key} ${c.name} ${(c.keywords || []).join(' ')}`)) }))
    .filter((x) => x.hit)
    .sort((a, b) => b.hit.score - a.hit.score)
    .map(({ c }) => ({ key: c.key, name: c.name, deepLink: deepLink(c.key, {}) }));
}

/** GET /catalog/search — grouped offerings (by product type + service) and matching categories. */
export async function searchCatalogue(q, { city = null, pincode = null, limit = 12 } = {}) {
  const tokens = queryTokens(q);
  const loc = { city, pincode };
  const [scored, categories] = await Promise.all([scoredOfferings(tokens, loc), matchingCategories(tokens)]);
  // When some offerings carry every word in their own names ("fan
  // installation" → Fan Installation), drop those that only matched through
  // keywords (Switch Installation, via the Electrician keyword "fan").
  const named = scored.filter((e) => e.specific);
  const used = named.length ? named : scored;
  const groups = group(used, (o) => `${o.category._id}|${o.productType?._id || ''}|${o.service._id}`, describeProductGroup)
    .slice(0, limit)
    .map(({ score: _score, ...g }) => g);
  return { query: q, didYouMean: correctedQuery(q, used), groups, categories };
}

/**
 * "instalation" → "installation": the query with the typo corrections the
 * best result relied on, or null when nothing was corrected.
 */
function correctedQuery(q, entries) {
  const best = [...entries].sort((a, b) => b.score - a.score)[0];
  if (!best?.corrections?.size) return null;
  return String(q)
    .split(/(\s+)/)
    .map((part) => best.corrections.get(stem(part.toLowerCase().replace(/[^a-z0-9]/g, ''))) || part)
    .join('');
}

/**
 * GET /catalog/service-groups — every bookable service, grouped like search
 * results (product type + service, sizes folded into a "from" price), in
 * catalogue order. Backs the "all services" listing pages.
 */
export async function listServiceGroups({ city = null, pincode = null } = {}) {
  const bookable = await loadBookableOfferings({}, { city, pincode });
  const groups = new Map();
  for (const entry of bookable) {
    const { offering } = entry;
    const key = `${offering.category._id}|${offering.productType?._id || ''}|${offering.service._id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.values()]
    .map((entries) => ({
      ...describeProductGroup(entries),
      fromPrice: toRupees(Math.min(...entries.map((e) => e.rate.customerPrice))),
      offeringCount: entries.length,
      order: Math.min(...entries.map((e) => e.offering.displayOrder ?? 0)),
    }))
    .sort((a, b) => a.category.name.localeCompare(b.category.name) || a.order - b.order || a.title.localeCompare(b.title))
    .map(({ order: _order, ...g }) => g);
}

/**
 * The single best destination for a free-text label — used by home tiles and
 * other entry points that carry a title ("AC repair", "Electrician Service")
 * instead of a catalogue id. A label that names a category outright goes to
 * that category; otherwise the best (category, service) match, across product
 * types (so "AC repair" opens AC with Repair preselected, not one AC type).
 * Returns null when nothing bookable matches — the caller shows no price.
 * ("from" price = the lowest per-unit customer price, before GST.)
 */
async function resolveOne(label, loc) {
  const tokens = queryTokens(label);
  if (!tokens.length) return null;
  const [scored, categories] = await Promise.all([scoredOfferings(tokens, loc), matchingCategories(tokens)]);

  // Every word names a category (key, name or keywords) → that category.
  const categoryHit = categories[0];
  if (categoryHit) {
    const prices = scored.filter((e) => e.offering.category.key === categoryHit.key).map((e) => e.rate.customerPrice);
    return {
      title: categoryHit.name,
      category: { key: categoryHit.key, name: categoryHit.name },
      fromPrice: prices.length ? toRupees(Math.min(...prices)) : null,
      deepLink: categoryHit.deepLink,
    };
  }

  // The label names a product type outright ("Split AC Installation") →
  // that type's group, so the price is Split AC's, not the cheapest AC's.
  const [typed] = group(scored, (o) => `${o.category._id}|${o.productType?._id || ''}|${o.service._id}`, describeProductGroup);
  const typedEntry = typed && scored.find((e) => e.offering.productType && describeProductGroup([e]).title === typed.title);
  if (typedEntry && words(typedEntry.offering.productType.name).every((w) => tokens.includes(w))) {
    return { title: typed.title, category: typed.category, fromPrice: typed.fromPrice, deepLink: typed.deepLink };
  }

  const [best] = group(
    scored,
    (o) => `${o.category._id}|${o.service._id}`,
    (entries) => {
      const { offering } = entries[0];
      const productTypes = new Set(entries.map((e) => String(e.offering.productType?._id || '')));
      const singleType = productTypes.size === 1 && offering.productType;
      return {
        title: singleType ? `${typeTitle(offering)} ${offering.service.name}` : `${offering.category.name} ${offering.service.name}`,
        category: { key: offering.category.key, name: offering.category.name },
        deepLink: deepLink(offering.category.key, {
          productTypeSlug: singleType ? offering.productType.slug : undefined,
          serviceSlug: offering.service.slug,
          offeringCode: entries.length === 1 ? offering.code : undefined,
        }),
      };
    },
  );
  if (best) return { title: best.title, category: best.category, fromPrice: best.fromPrice, deepLink: best.deepLink };

  // Last resort: the label contains a bookable category's whole key or name
  // ("Foam-jet AC service" → AC) — open that category rather than nothing.
  return categoryNamedIn(label, loc);
}

async function categoryNamedIn(label, loc) {
  const labelText = ` ${words(label).join(' ')} `;
  const [categories, withOfferings] = await Promise.all([
    Category.find({ isActive: true }).select('key name').lean(),
    ServiceOffering.distinct('category', { isActive: true }),
  ]);
  const bookable = new Set(withOfferings.map(String));
  const named = categories
    .filter((c) => bookable.has(String(c._id)))
    .filter((c) => [c.key, c.name].some((n) => labelText.includes(` ${words(n).join(' ')} `)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!named) return null;
  const inCategory = await loadBookableOfferings({ category: named._id }, loc);
  if (!inCategory.length) return null;
  return {
    title: named.name,
    category: { key: named.key, name: named.name },
    fromPrice: toRupees(Math.min(...inCategory.map((e) => e.rate.customerPrice))),
    deepLink: deepLink(named.key, {}),
  };
}

/** POST /catalog/search/resolve — best destination for each label, in order. */
export async function resolveLabels(labels, { city = null, pincode = null } = {}) {
  const loc = { city, pincode };
  return Promise.all(labels.map(async (label) => ({ label, match: await resolveOne(label, loc) })));
}

/**
 * GET /catalog/search/popular — what to suggest in an empty search box: the
 * services booked most in the last 90 days, topped up with the categories
 * that offer the most. Real data only; nothing is hand-picked.
 */
export async function popularSearches({ limit = 8 } = {}) {
  const since = new Date(Date.now() - 90 * 86400000);
  const booked = await Booking.aggregate([
    { $match: { createdAt: { $gte: since }, 'commercial.offeringCode': { $exists: true } } },
    { $group: { _id: { category: '$commercial.category.name', service: '$commercial.service.name' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: limit * 2 },
  ]);
  const out = [];
  const seen = new Set();
  for (const { _id } of booked) {
    const label = _id.service && _id.category && !_id.service.toLowerCase().includes(_id.category.toLowerCase())
      ? `${_id.category} ${_id.service}`
      : _id.service || _id.category;
    const match = label && (await resolveOne(label, {}));
    if (match && !seen.has(match.deepLink)) {
      seen.add(match.deepLink);
      out.push({ label, deepLink: match.deepLink });
    }
    if (out.length >= limit) return out;
  }
  const counts = await ServiceOffering.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  const categories = await Category.find({ _id: { $in: counts.map((c) => c._id) }, isActive: true }).select('key name').lean();
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  for (const { _id } of counts) {
    const c = byId.get(String(_id));
    const link = c && deepLink(c.key, {});
    if (c && !seen.has(link)) {
      seen.add(link);
      out.push({ label: c.name, deepLink: link });
    }
    if (out.length >= limit) break;
  }
  return out;
}
