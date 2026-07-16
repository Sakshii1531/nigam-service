import mongoose from 'mongoose';

// Backing store for idGenerator (Phase 2): one doc per prefix+scope (e.g. "NCC-260716"
// for daily-reset booking IDs), atomically incremented via findOneAndUpdate($inc).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // scope key, e.g. `${prefix}:${YYMMDD}`
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
