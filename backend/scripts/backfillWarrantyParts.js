// Preview: node scripts/backfillWarrantyParts.js
// Apply:   node scripts/backfillWarrantyParts.js --apply
import {connectDB,disconnectDB} from '../src/config/db.js';
import {registerAllModels} from '../src/config/registerModels.js';
import {backfillWarrantyParts} from '../src/modules/brand-crm/partsMigration.js';
try{await registerAllModels();await connectDB();console.log(JSON.stringify(await backfillWarrantyParts({dryRun:!process.argv.includes('--apply')})));}catch(e){console.error(e.message);process.exitCode=1;}finally{await disconnectDB();}
