import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
// Serializes writes for a brand, including capture vs rate editing in transactions.
const lockSchema = new mongoose.Schema({
  _id: {
    type: String
  },
  revision: {
    type: Number,
    default: 0
  }
});
applyStandardPlugins(lockSchema);
export const BrandRateLock = mongoose.models.BrandRateLock || mongoose.model('BrandRateLock', lockSchema);
export async function lockRates(brand, session) {
  await BrandRateLock.updateOne({
    _id: String(brand)
  }, {
    $inc: {
      revision: 1
    }
  }, {
    upsert: true,
    session
  });
}
