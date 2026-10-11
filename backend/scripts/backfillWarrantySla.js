// Preview: node scripts/backfillWarrantySla.js
// Apply:   node scripts/backfillWarrantySla.js --apply
import { connectDB, disconnectDB } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { backfillWarrantySla } from '../src/modules/brand-crm/slaMigration.js';
try {
  await registerAllModels(); await connectDB();
  console.log(JSON.stringify(await backfillWarrantySla({ dryRun: !process.argv.includes('--apply') })));
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { await disconnectDB(); }
