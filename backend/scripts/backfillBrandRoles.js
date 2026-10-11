// One-off for databases created before brand permissions were enforced
// (docs/brand-crm Phase 2). Idempotent — safe to re-run.
//
// For every brand: creates any missing role templates, then gives Brand Super
// Admin to brand users whose roles grant no brand permission, so nobody who
// could use the panel yesterday is locked out today. New users always get
// roles explicitly.
//
//   npm run db:backfill-brand-roles
import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { backfillRolelessBrandUsers } from '../src/modules/brand-crm/roleTemplates.service.js';

async function main() {
  await connectDB();
  await ensureIndexes();
  const brands = await Brand.find().select('name').lean();
  for (const brand of brands) {
    const n = await backfillRolelessBrandUsers(brand._id);
    console.log(`[backfill] ${brand.name}: templates ready${n ? `, ${n} user(s) given Brand Super Admin` : ''}`);
  }
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[backfill] failed:', err);
  await disconnectDB();
  process.exit(1);
});
