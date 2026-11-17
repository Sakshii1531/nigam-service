import { HomeSection, BUILT_IN_SECTIONS } from './homeSection.model.js';
import { HomeTile } from './homeTile.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Kind -> the tile placement its content lives under.
const PLACEMENT_OF = Object.freeze({
  'brand-cards': 'brand-card',
  'most-booked': 'most-booked',
  'appliance-services': 'appliance-service',
  'service-row': 'appliance-service',
  categories: 'category',
});

/**
 * Makes sure every built-in section exists. The first read on any database
 * (a fresh install, or an existing one that predates this feature) creates them
 * in the order the home screen has always used, so nothing needs a migration.
 */
export async function ensureBuiltInSections() {
  const have = new Set((await HomeSection.find({ builtIn: true }).select('key').lean()).map((s) => s.key));
  const missing = BUILT_IN_SECTIONS.filter((b) => !have.has(b.key));
  if (!missing.length) return;
  const last = await HomeSection.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  let order = last ? last.sortOrder + 1 : 0;
  for (const def of missing) {
    try {
      await HomeSection.create({ kind: def.kind, key: def.key, title: def.title, builtIn: true, isActive: true, sortOrder: order });
      order += 1;
    } catch (err) {
      if (err?.code !== 11000) throw err; // another request created it first
    }
  }
}

const view = (s) => ({
  id: String(s._id),
  kind: s.kind,
  key: s.key || null,
  title: s.title,
  builtIn: Boolean(s.builtIn),
  isActive: s.isActive,
  sortOrder: s.sortOrder,
  seeAllLink: s.seeAllLink || '',
});

/** What the customer app draws, top to bottom: visible sections only. */
export async function listPublicSections() {
  await ensureBuiltInSections();
  const rows = await HomeSection.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return rows.map(view);
}

/** Every section for the console, with how much content each holds. */
export async function listAdminSections() {
  await ensureBuiltInSections();
  const [rows, counts] = await Promise.all([
    HomeSection.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    HomeTile.aggregate([{ $group: { _id: { placement: '$placement', section: '$section', active: '$isActive' }, n: { $sum: 1 } } }]),
  ]);
  const tally = (placement, section) => {
    let total = 0;
    let active = 0;
    for (const c of counts) {
      const sameSection = section ? String(c._id.section) === String(section) : !c._id.section;
      if (c._id.placement === placement && sameSection) {
        total += c.n;
        if (c._id.active) active += c.n;
      }
    }
    return { total, active };
  };
  return rows.map((s) => {
    const placement = PLACEMENT_OF[s.kind];
    return {
      ...view(s),
      defaultTitle: BUILT_IN_SECTIONS.find((b) => b.key === s.key)?.title || null,
      headingShown: s.builtIn ? BUILT_IN_SECTIONS.find((b) => b.key === s.key)?.headingShown : true,
      tiles: placement ? tally(placement, s.builtIn ? null : s._id) : null,
    };
  });
}

async function findOr404(id) {
  const section = await HomeSection.findById(id);
  if (!section) throw new ApiError(404, 'Home section not found');
  return section;
}

export async function createSection({ kind, title, seeAllLink = '', isActive = true }) {
  await ensureBuiltInSections();
  const last = await HomeSection.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  const section = await HomeSection.create({
    kind,
    title,
    builtIn: false,
    isActive,
    // A service row's "See all" only makes sense for service rows.
    seeAllLink: kind === 'service-row' ? seeAllLink : '',
    sortOrder: (last?.sortOrder ?? -1) + 1,
  });
  return view(section);
}

export async function updateSection(id, updates) {
  const section = await findOr404(id);
  if (updates.title !== undefined) section.title = updates.title;
  if (updates.isActive !== undefined) section.isActive = updates.isActive;
  if (updates.seeAllLink !== undefined) {
    if (section.kind !== 'service-row') throw new ApiError(400, 'Only a service row has a "See all" link');
    section.seeAllLink = updates.seeAllLink;
  }
  await section.save();
  return view(section);
}

/** Puts the sections in the given order (ids top to bottom); any not listed follow. */
export async function reorderSections(ids) {
  await ensureBuiltInSections();
  const existing = await HomeSection.find().sort({ sortOrder: 1, createdAt: 1 }).select('_id').lean();
  const known = new Set(existing.map((s) => String(s._id)));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, 'Each section can appear only once');
  if (ids.some((id) => !known.has(String(id)))) throw new ApiError(400, 'One or more sections do not exist');
  const rest = existing.map((s) => String(s._id)).filter((id) => !ids.includes(id));
  // updateOne (not bulkWrite) so the catalogue-cache write hook fires.
  await Promise.all([...ids, ...rest].map((id, index) => HomeSection.updateOne({ _id: id }, { $set: { sortOrder: index } })));
  return listAdminSections();
}

/** Deletes a custom section and everything published in it. Built-ins can only be hidden. */
export async function deleteSection(id) {
  const section = await findOr404(id);
  if (section.builtIn) throw new ApiError(409, 'Built-in sections cannot be deleted — hide the section instead');
  const removed = await HomeTile.deleteMany({ section: section._id });
  await section.deleteOne();
  return { deleted: true, tilesRemoved: removed.deletedCount || 0 };
}

/** For tile validation: the section a tile is being added to. */
export async function findSectionForTile(id) {
  const section = await HomeSection.findById(id).lean();
  if (!section) throw new ApiError(400, 'That home section does not exist');
  if (section.builtIn) throw new ApiError(400, 'Built-in sections keep their content by placement; add the tile without a section');
  return section;
}
