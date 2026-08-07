import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { Counter } from '../shared/counter.model.js';

// Referenced first (no deps) since Technician/Brand/ServicePartner all point at it.
const citySchema = new mongoose.Schema(
  {
    // `sparse` matches humanIdPlugin's convention (see shared/plugins.js): a
    // plain unique index treats every missing cityId as the same null key, so a
    // second city created through a path that skips the pre-save hook below
    // collides — and once two exist, the index cannot build and the server
    // refuses to start.
    cityId: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true },
    state: String,
    district: String,
    coverageAreaSqkm: Number,
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  },
  { timestamps: true },
);

citySchema.index({ name: 1, state: 1 }, { unique: true });

// Uses the shared Counter collection (keyed 'citySeq') rather than a second
// counter model — 'citySeq' cannot collide with idGenerator's keys, which are
// all ID_SCHEMES prefixes.
async function nextCityId() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'citySeq' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `CIT-${String(counter.seq).padStart(3, '0')}`;
}

// Auto-generate cityId before every new document.
citySchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    this.cityId = await nextCityId();
    next();
  } catch (err) {
    next(err);
  }
});

// An upsert is a query, not a document save, so the hook above never fires for
// it — seed.js's City.findOneAndUpdate(..., { upsert: true }) was producing
// cities with a null cityId. $setOnInsert applies only when the upsert actually
// inserts, so an update to an existing city keeps the id it already has.
citySchema.pre('findOneAndUpdate', async function assignCityIdOnUpsert(next) {
  try {
    if (!this.getOptions().upsert) return next();
    const update = this.getUpdate() || {};
    // Nothing to do if the caller is setting one explicitly.
    if (update.cityId || update.$set?.cityId || update.$setOnInsert?.cityId) return next();

    this.setUpdate({ ...update, $setOnInsert: { ...(update.$setOnInsert || {}), cityId: await nextCityId() } });
    next();
  } catch (err) {
    next(err);
  }
});

applyStandardPlugins(citySchema);

export const City = mongoose.models.City || mongoose.model('City', citySchema);
