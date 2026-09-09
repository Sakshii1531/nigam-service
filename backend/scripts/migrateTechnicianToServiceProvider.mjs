#!/usr/bin/env node
// One-time data migration for the technician -> service provider rename.
// Run this ONCE, after deploying the renamed backend code (or right before —
// see the deploy-order note in the PR/summary), against the real database.
//
// Two kinds of change, both idempotent (safe to re-run; already-migrated
// documents are simply skipped by the query filters):
//
//   1. Physical collection renames (metadata-only, instant, no document
//      rewrite) — needed because the Mongoose model names changed and none
//      of them pin an explicit collection name, so they now resolve to a
//      different default-pluralized collection than where the data lives.
//        technicians          -> serviceproviders
//        techinventoryitems   -> serviceproviderinventoryitems
//        technicianskills     -> serviceproviderskills   (harmless if empty)
//        techblogs            -> serviceproviderblogs    (harmless if empty)
//
//   2. Field/value updates — every place 'technician' was a stored string
//      value or field name:
//        users.role: 'technician' -> 'service_provider'
//        <14 collections>.technician (FK field) -> renamed to serviceProvider
//        chat messages / call logs: 'technician' sender/initiatedBy -> 'service_provider'
//        appsettings / banners: app: 'technician' -> 'service_provider'
//
// Usage:
//   node scripts/migrateTechnicianToServiceProvider.mjs --dry-run   (default, no writes)
//   node scripts/migrateTechnicianToServiceProvider.mjs --apply     (writes for real)
//
// Reads MONGODB_URI from the environment the same way the app does (backend/.env).
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

const COLLECTION_RENAMES = [
  ['technicians', 'serviceproviders'],
  ['techinventoryitems', 'serviceproviderinventoryitems'],
  ['technicianskills', 'serviceproviderskills'],
  ['techblogs', 'serviceproviderblogs'],
];

// Every collection whose documents may carry a `technician` ObjectId
// reference field that must become `serviceProvider`.
const FK_FIELD_COLLECTIONS = [
  'bookings',
  'conversations',
  'servicerequests',
  'livetrackings',
  'amcvisits',
  'earningstallies',
  'reviews',
  'reverselogisticsreturns',
  'replacementapprovals',
  'invoices',
  'payouts',
  'partorders',
  'jobs',
  'techinventoryitems', // note: renamed to serviceproviderinventoryitems above; this list
  'serviceproviderinventoryitems', // entry covers both names depending on run order
];

async function main() {
  console.log(APPLY ? '=== APPLYING migration (writes enabled) ===' : '=== DRY RUN (no writes; pass --apply to execute) ===');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log('\n--- Step 1: physical collection renames ---');
  // Mongoose auto-vivifies an empty collection at the new default-pluralized
  // name the moment a renamed model's indexes get built against this
  // database (no document write required) — so finding '<to>' already
  // present with 0 documents is expected, not evidence of a prior migration,
  // and must not block the real rename.
  for (const [from, to] of COLLECTION_RENAMES) {
    if (!existing.has(from)) {
      console.log(`  skip: '${from}' does not exist (nothing to rename)`);
      continue;
    }
    if (existing.has(to)) {
      const stubCount = await db.collection(to).countDocuments();
      if (stubCount > 0) {
        console.log(`  skip: '${to}' already exists WITH ${stubCount} doc(s) — investigate before touching, not auto-handled`);
        continue;
      }
      console.log(`  '${to}' exists but is an empty stub (auto-created by index registration) — ${APPLY ? 'dropping it first' : 'would drop it first'}`);
      if (APPLY) await db.collection(to).drop();
    }
    const count = await db.collection(from).countDocuments();
    console.log(`  ${APPLY ? 'renaming' : 'would rename'} '${from}' (${count} docs) -> '${to}'`);
    if (APPLY) await db.collection(from).rename(to);
  }

  console.log('\n--- Step 2: users.role technician -> service_provider ---');
  {
    const count = await db.collection('users').countDocuments({ role: 'technician' });
    console.log(`  ${count} user(s) with role='technician'`);
    if (APPLY && count > 0) {
      const res = await db.collection('users').updateMany({ role: 'technician' }, { $set: { role: 'service_provider' } });
      console.log(`  updated ${res.modifiedCount}`);
    }
  }

  console.log('\n--- Step 3: rename `technician` field -> `serviceProvider` on referencing collections ---');
  const dedupedFkCollections = [...new Set(FK_FIELD_COLLECTIONS)];
  for (const coll of dedupedFkCollections) {
    const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
    if (!names.has(coll)) continue;
    const count = await db.collection(coll).countDocuments({ technician: { $exists: true } });
    if (count === 0) {
      console.log(`  ${coll}: 0 docs with 'technician' field`);
      continue;
    }
    console.log(`  ${coll}: ${count} doc(s) with 'technician' field ${APPLY ? '- renaming' : '- would rename'}`);
    if (APPLY) {
      // A collection that had `unique: true` on the old `technician` field
      // (only earningstallies does) still carries that constraint as an
      // orphaned index — the current schema no longer declares it, so
      // Mongoose never drops it automatically. $rename-ing more than one
      // matching document under that live unique index fails the moment a
      // second document is left with technician: null. Drop any index still
      // built on the old field name first; the new schema's own index
      // (serviceProvider_1, already built when the server started) replaces it.
      const idx = await db.collection(coll).indexes();
      for (const ix of idx) {
        if (ix.key && Object.keys(ix.key).length === 1 && ix.key.technician !== undefined) {
          console.log(`    dropping stale index '${ix.name}' on ${coll} (superseded by the schema's own serviceProvider index)`);
          await db.collection(coll).dropIndex(ix.name);
        }
      }
      const res = await db.collection(coll).updateMany(
        { technician: { $exists: true } },
        { $rename: { technician: 'serviceProvider' } },
      );
      console.log(`    modified ${res.modifiedCount}`);
    }
  }

  console.log('\n--- Step 4: misc value fields (chat sender, call initiatedBy, app-scoped settings) ---');
  const miscUpdates = [
    { coll: 'messages', filter: { sender: 'technician' }, update: { $set: { sender: 'service_provider' } } },
    { coll: 'calllogs', filter: { initiatedBy: 'technician' }, update: { $set: { initiatedBy: 'service_provider' } } },
    { coll: 'appsettings', filter: { app: 'technician' }, update: { $set: { app: 'service_provider' } } },
    { coll: 'banners', filter: { app: 'technician' }, update: { $set: { app: 'service_provider' } } },
    { coll: 'notifications', filter: { type: 'tech' }, update: { $set: { type: 'provider' } } },
    { coll: 'notifications', filter: { broadcastRole: 'Technicians' }, update: { $set: { broadcastRole: 'ServiceProviders' } } },
  ];
  for (const { coll, filter, update } of miscUpdates) {
    const names = new Set((await db.listCollections().toArray()).map((c) => c.name));
    if (!names.has(coll)) continue;
    const count = await db.collection(coll).countDocuments(filter);
    if (count === 0) {
      console.log(`  ${coll} ${JSON.stringify(filter)}: 0 docs`);
      continue;
    }
    console.log(`  ${coll} ${JSON.stringify(filter)}: ${count} doc(s) ${APPLY ? '- updating' : '- would update'}`);
    if (APPLY) {
      const res = await db.collection(coll).updateMany(filter, update);
      console.log(`    modified ${res.modifiedCount}`);
    }
  }

  await mongoose.disconnect();
  console.log(`\n${APPLY ? 'Migration applied.' : 'Dry run complete — re-run with --apply to execute.'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
