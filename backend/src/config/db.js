import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

let connectPromise = null;

export function connectDB() {
  if (connectPromise) return connectPromise;

  mongoose.connection.on('connected', () => {
    console.log(`[db] connected -> ${mongoose.connection.name}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  connectPromise = mongoose.connect(env.mongodbUri);
  return connectPromise;
}

/**
 * Mongoose's autoIndex createIndexes calls fire in the background and are NOT
 * awaited by connect()/model registration — a short-lived process (a script that
 * connects, does one write, then disconnects) can exit before most of a model's
 * indexes ever finish building, silently leaving uniqueness constraints
 * unenforced. `Model.init()` resolves once that model's indexes are confirmed
 * built (or immediately if they already exist), so awaiting it for every
 * registered model closes that gap. Call after connectDB(), before doing any
 * real work — both server.js and scripts/seed.js do this.
 */
export async function ensureIndexes() {
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
}

export async function disconnectDB() {
  await mongoose.disconnect();
  connectPromise = null;
}

export default mongoose;
