#!/usr/bin/env node
// One-time cleanup after removing the ServicePartner/PartnerPayout entities
// from the codebase (see the commit that deleted servicePartner.*.js and
// partnerPayout.*.js). Nothing in the app reads any of this data anymore —
// this just clears it out of the live database rather than leaving it inert.
//
// Usage:
//   node scripts/cleanupServicePartnerRemoval.mjs --dry-run   (default, no writes)
//   node scripts/cleanupServicePartnerRemoval.mjs --apply     (writes for real)
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
import mongoose from 'mongoose';
import 'dotenv/config';

const APPLY = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set.');
  process.exit(1);
}

async function main() {
  console.log(APPLY ? '=== APPLYING cleanup (writes enabled) ===' : '=== DRY RUN (no writes; pass --apply to execute) ===');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log('\n--- Drop collections with no remaining purpose ---');
  for (const name of ['servicepartners', 'partnerpayouts']) {
    if (!existing.has(name)) {
      console.log(`  skip: '${name}' does not exist`);
      continue;
    }
    const count = await db.collection(name).countDocuments();
    console.log(`  ${APPLY ? 'dropping' : 'would drop'} '${name}' (${count} docs)`);
    if (APPLY) await db.collection(name).drop();
  }

  console.log("\n--- Clear serviceproviders.servicePartner (field no longer in the schema) ---");
  {
    const count = await db.collection('serviceproviders').countDocuments({ servicePartner: { $exists: true } });
    console.log(`  ${count} doc(s) with a servicePartner field`);
    if (APPLY && count > 0) {
      const res = await db.collection('serviceproviders').updateMany(
        { servicePartner: { $exists: true } },
        { $unset: { servicePartner: '' } },
      );
      console.log(`  modified ${res.modifiedCount}`);
      // The old field also left an index behind; the current schema never
      // declares it, so ensureIndexes() will never drop it on its own.
      const idx = await db.collection('serviceproviders').indexes();
      const stale = idx.find((ix) => ix.key && Object.keys(ix.key).length === 1 && ix.key.servicePartner !== undefined);
      if (stale) {
        console.log(`  dropping stale index '${stale.name}'`);
        await db.collection('serviceproviders').dropIndex(stale.name);
      }
    }
  }

  console.log('\n--- Clear asms.partners (field no longer in the schema) ---');
  {
    const count = await db.collection('asms').countDocuments({ partners: { $exists: true } });
    console.log(`  ${count} doc(s) with a partners field`);
    if (APPLY && count > 0) {
      const res = await db.collection('asms').updateMany(
        { partners: { $exists: true } },
        { $unset: { partners: '' } },
      );
      console.log(`  modified ${res.modifiedCount}`);
    }
  }

  await mongoose.disconnect();
  console.log(`\n${APPLY ? 'Cleanup applied.' : 'Dry run complete — re-run with --apply to execute.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
