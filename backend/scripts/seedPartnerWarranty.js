// Idempotent seed for the Partner Warranty catalogue (docs/partner-warranty
// Phase 2): the seven groups and the issue lists that used to be hardcoded in
// the customer app's PartnerWarranty / SelectIssue screens.
//
//   npm run seed:partner-warranty
//
// Groups are inserted once by slug and issues once per category, so an admin's
// later edits are never overwritten. A group only links categories that exist
// in the Master Catalogue — add the rest in Super Admin → Partner Warranty.
// Partner brands and their coverage are NOT seeded: those are real brand
// accounts, set up in Super Admin.
import { pathToFileURL } from 'node:url';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';

export const WARRANTY_GROUP_SEED = [
  { slug: 'electrocare', name: 'ElectroCare', tagline: 'Home Appliances & Electronics', categoryKeys: ['Refrigerator', 'Washing Machine', 'TV', 'Microwave'] },
  { slug: 'bathcare', name: 'BathCare', tagline: 'Sanitaryware & Bath Products', categoryKeys: ['Plumber', 'Geyser'] },
  { slug: 'it-cpcare', name: 'IT&CPCare', tagline: 'IT & Computer Peripherals', categoryKeys: [] },
  { slug: 'kitchencare', name: 'KitchenCare', tagline: 'Ovens, Chimneys & Kitchenware', categoryKeys: ['Microwave', 'Chimney', 'Gas Stove & Hob Services'] },
  { slug: 'aircare', name: 'AirCare', tagline: 'Air Conditioners & Coolers', categoryKeys: ['AC', 'Air Cooler'] },
  { slug: 'watercare', name: 'WaterCare', tagline: 'Water Purifiers & Heaters', categoryKeys: ['RO Water Purifier', 'Geyser'] },
  { slug: 'securecare', name: 'SecureCare', tagline: 'CCTV & Security Systems', categoryKeys: ['CCTV'] },
];

const GENERAL = ['General Performance Issue', 'Complete Breakdown', 'Noise / Vibration Issue', 'Part Replacement / Repair'];

export const WARRANTY_ISSUE_SEED = {
  AC: ['Cooling Issue', 'Water Leakage', 'PCB / Circuit Issue', 'Gas Charging', 'Noise Problem', 'Installation / Deinstallation'],
  Refrigerator: ['Not Cooling Enough', 'Water Leakage / Ice Melting', 'Excessive / Strange Noise', 'Power Failure / Not Turning On', 'Door Gasket Replacement'],
  'Washing Machine': ['Not Spinning / Vibrating', 'Water Drainage Issue', 'Program / PCB Error', "No Power / Won't Start", 'Installation & Setup'],
  Microwave: ['Not Heating / Sparking', 'Turntable Plate Not Spinning', 'Touch Panel / Buttons Not Working', 'Loud Buzzing Noise'],
  TV: ['Display Panel Lines / Blank Screen', 'Sound Output Issue', 'TV Not Powering On', 'HDMI / USB Ports Loose'],
  Plumber: ['Water Leakage / Blockage', 'Low Water Pressure', 'Fitting Loose / Broken', ...GENERAL.slice(3)],
  Geyser: ['Not Heating', 'Water Leakage', 'Tripping / Electrical Fault', 'Noise / Vibration Issue'],
  'RO Water Purifier': ['Not Purifying / Bad Taste', 'Water Leakage', 'Low Water Flow', 'Filter Replacement', 'No Power'],
  Chimney: ['Low Suction', 'Oil Leakage', 'Motor Not Working', 'Noise / Vibration Issue'],
  'Air Cooler': ['Not Cooling', 'Pump Not Working', 'Water Leakage', 'Fan / Motor Issue'],
  CCTV: ['No Video / Camera Offline', 'Night Vision Not Working', 'Recording Issue', 'Power / Adapter Fault'],
  'Gas Stove & Hob Services': ['Burner Not Lighting', 'Gas Leakage Smell', 'Knob / Valve Stuck', ...GENERAL.slice(3)],
};

export async function seedPartnerWarranty() {
  const categories = await Category.find().select('_id key').lean();
  const byKey = new Map(categories.map((c) => [c.key, c._id]));

  let groupsInserted = 0;
  for (const [i, { categoryKeys, ...group }] of WARRANTY_GROUP_SEED.entries()) {
    const ids = categoryKeys.map((k) => byKey.get(k)).filter(Boolean);
    const res = await WarrantyGroup.updateOne(
      { slug: group.slug },
      { $setOnInsert: { ...group, categories: ids, sortOrder: i, isActive: true } },
      { upsert: true },
    );
    groupsInserted += res.upsertedCount;
  }

  let issuesInserted = 0;
  for (const [key, names] of Object.entries(WARRANTY_ISSUE_SEED)) {
    const category = byKey.get(key);
    if (!category) continue;
    if (await WarrantyIssue.exists({ category, productType: null })) continue;
    await WarrantyIssue.insertMany(names.map((name, sortOrder) => ({ category, productType: null, name, sortOrder })));
    issuesInserted += names.length;
  }

  return { groupsInserted, issuesInserted, missingCategories: [...new Set(WARRANTY_GROUP_SEED.flatMap((g) => g.categoryKeys))].filter((k) => !byKey.has(k)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB, disconnectDB, ensureIndexes } = await import('../src/config/db.js');
  const { registerAllModels } = await import('../src/config/registerModels.js');
  try {
    await connectDB();
    await registerAllModels();
    await ensureIndexes();
    const { groupsInserted, issuesInserted, missingCategories } = await seedPartnerWarranty();
    console.log(`[seed:partner-warranty] ${groupsInserted} groups, ${issuesInserted} issues inserted`);
    if (missingCategories.length) console.log(`[seed:partner-warranty] categories not in the catalogue yet: ${missingCategories.join(', ')}`);
  } catch (err) {
    console.error('[seed:partner-warranty] failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
