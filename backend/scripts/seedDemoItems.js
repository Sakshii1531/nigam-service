import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { seedDemoEntities } from './demoSeedData.js';

async function main() {
  console.log('[seedDemoItems] Connecting to database...');
  await connectDB();
  await registerAllModels();
  await ensureIndexes();

  await seedDemoEntities();

  console.log('[seedDemoItems] Done!');
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[seedDemoItems] Error during seeding:', err);
  await disconnectDB();
  process.exit(1);
});
