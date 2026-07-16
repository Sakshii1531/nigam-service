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

export async function disconnectDB() {
  await mongoose.disconnect();
  connectPromise = null;
}

export default mongoose;
