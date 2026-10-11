// Clock fixture for browser acceptance: only a validated isolated test database.
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { assertSafeTestDb } from '../testDatabase.js';
import { registerAllModels } from '../../backend/src/config/registerModels.js';
import { WarrantyClaim } from '../../backend/src/modules/partner-warranty/warrantyClaim.model.js';
import { runSlaSweep } from '../../backend/src/modules/partner-warranty/claimSla.service.js';
import { awaitPendingDeliveries } from '../../backend/src/modules/notifications/notification.service.js';
const uri = process.env.E2E_MONGODB_URI;
assertSafeTestDb(uri);
try {
  await mongoose.connect(uri);
  await registerAllModels();
  await WarrantyClaim.updateOne({ _id: process.argv[2] }, { $set: { 'sla.brandApprovalDueAt': new Date(Date.now() - 60000) } });
  await runSlaSweep();
  await awaitPendingDeliveries();
} finally { await mongoose.disconnect(); }
