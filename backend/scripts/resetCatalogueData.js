// Clean-slate reset for the master-catalogue rebuild (docs/master-catalogue,
// decision D1 — the app is not live). Wipes every booking and everything that
// hangs off one (via clearBookingsAndServiceRequests.js), then the
// master-catalogue collections themselves. Categories and product types are
// kept. The pre-catalogue `servicecatalogitems` collection (its model was
// deleted in Phase 7) is dropped if a database still has it.
//
//   npm run db:reset-catalogue -- --yes          (then: npm run seed:catalogue)
//
// Destructive, so it names the target database and does nothing without
// --yes, and refuses NODE_ENV=production without --force as well.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { env } from '../src/config/env.js';

const args = new Set(process.argv.slice(2));
const target = env.mongodbUri.replace(/\/\/[^@]*@/, '//***@');

if (process.env.NODE_ENV === 'production' && !args.has('--force')) {
  console.error('[reset-catalogue] Refusing to run with NODE_ENV=production (pass --force if you really mean it).');
  process.exit(1);
}
if (!args.has('--yes')) {
  console.error(`[reset-catalogue] This deletes ALL bookings, jobs, payments and the master catalogue in:\n  ${target}\nRe-run with --yes to proceed.`);
  process.exit(1);
}

console.log(`[reset-catalogue] Target: ${target}`);
execFileSync(process.execPath, [fileURLToPath(new URL('./clearBookingsAndServiceRequests.js', import.meta.url))], {
  stdio: 'inherit',
  env: process.env,
});

try {
  await connectDB();
  await registerAllModels();
  for (const name of ['OfferingRate', 'ServiceOffering', 'Variant', 'CatalogService']) {
    const { deletedCount } = await mongoose.model(name).deleteMany({});
    console.log(`[reset-catalogue] ${name}: ${deletedCount} deleted`);
  }
  const legacy = await mongoose.connection.db.listCollections({ name: 'servicecatalogitems' }).toArray();
  if (legacy.length) {
    await mongoose.connection.db.dropCollection('servicecatalogitems');
    console.log('[reset-catalogue] legacy servicecatalogitems: dropped');
  }
  console.log('[reset-catalogue] Done. Run `npm run seed:catalogue` to reseed.');
} catch (err) {
  console.error('[reset-catalogue] failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
