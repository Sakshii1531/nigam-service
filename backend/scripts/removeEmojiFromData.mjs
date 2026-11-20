// One-off data clean-up: removes emoji from admin-managed content that was
// seeded or typed in before item pictures were supported (catalogue icons,
// category icons, home tiles, brand cards and so on).
//
//   node scripts/removeEmojiFromData.mjs            dry run: report what would change
//   node scripts/removeEmojiFromData.mjs --apply    write the changes
//
// - An `icon` / `iconUrl` field that holds an emoji is cleared (the app then
//   shows a neutral icon until an admin uploads the real picture).
// - Any other text field has the emoji removed and keeps the rest of the text.
// - Only admin-managed collections are changed. Content written by customers
//   (reviews, chat, addresses) is never touched; the report lists any emoji
//   found elsewhere so nothing is hidden.
import 'dotenv/config';
import mongoose from 'mongoose';
import { hasEmoji, stripEmoji } from '../src/modules/shared/noEmoji.js';

const APPLY = process.argv.includes('--apply');
const MANAGED = new Set([
  'categories', 'producttypes', 'catalogservices', 'productcategories', 'cataloguebrands', 'serviceofferings',
  'hometiles', 'homesections', 'homestories', 'homebanners', 'brands', 'plans', 'amcplans', 'extendedwarrantyplans',
  'warrantycatalogs', 'faqs', 'cmspages', 'appsettings',
]);
const PICTURE_KEYS = new Set(['icon', 'iconUrl', 'emoji']);

// Returns [newValue, changedPaths[]] without mutating the input.
function clean(value, path = '') {
  if (typeof value === 'string') {
    if (!hasEmoji(value)) return [value, []];
    const key = path.split('.').pop();
    if (PICTURE_KEYS.has(key)) return ['', [path]];
    return [stripEmoji(value).trim(), [path]];
  }
  if (Array.isArray(value)) {
    const changed = [];
    const out = value.map((v, i) => {
      const [nv, c] = clean(v, `${path}.${i}`);
      changed.push(...c);
      return nv;
    });
    return [out, changed];
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const changed = [];
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const [nv, c] = clean(v, path ? `${path}.${k}` : k);
      out[k] = nv;
      changed.push(...c);
    }
    return [out, changed];
  }
  return [value, []];
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const summary = [];
for (const { name } of await db.listCollections().toArray()) {
  if (name.startsWith('system.')) continue;
  const col = db.collection(name);
  const managed = MANAGED.has(name.toLowerCase());
  let docs = 0;
  let fields = 0;
  for await (const doc of col.find({})) {
    const { _id, ...rest } = doc;
    const [next, changed] = clean(rest);
    if (!changed.length) continue;
    docs += 1;
    fields += changed.length;
    if (managed && APPLY) await col.updateOne({ _id }, { $set: next });
  }
  if (docs) summary.push({ collection: name, documents: docs, fields, action: managed ? (APPLY ? 'cleaned' : 'would clean') : 'left alone (not admin-managed)' });
}
console.table(summary.length ? summary : [{ result: 'no emoji found in the database' }]);
if (!APPLY && summary.some((s) => s.action === 'would clean')) console.log('Dry run — nothing written. Re-run with --apply to clean.');
await mongoose.disconnect();
