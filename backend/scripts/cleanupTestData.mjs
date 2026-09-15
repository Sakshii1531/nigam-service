// One-off cleanup for test/dev data that leaked into the shared dev DB:
//   1. E2E Playwright fixtures (tagged @e2e.test emails / "E2E Test User" name /
//      "E2E-..." service-request categories) — these were supposed to stay in the
//      dedicated nigam_e2e_test database but a run pointed at this one instead.
//   2. Two manually-created test service providers ("harsh" / "Harsh Pandey")
//      and everything cascading from them (jobs, service requests, bookings).
//
// Dry-run by default; pass --apply to actually delete. Always run dry-run first
// and read the report — this touches ~15 collections by design (cascade).
//
// Usage:
//   node scripts/cleanupTestData.mjs            # report only
//   node scripts/cleanupTestData.mjs --apply     # actually delete

import mongoose from 'mongoose';
import 'dotenv/config';

const APPLY = process.argv.includes('--apply');
const { ObjectId } = mongoose.Types;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`[cleanup] Mode: ${APPLY ? 'APPLY (deleting)' : 'DRY RUN (report only)'}\n`);

  // ── 1. Identify the test users ──────────────────────────────────────────
  const testUsers = await db
    .collection('users')
    .find({
      $or: [
        { email: { $regex: '@e2e\\.test$', $options: 'i' } },
        { name: 'E2E Test User' },
        { email: { $in: ['harsh@gmail.com', 'harsh@appzeto.com'] } },
      ],
    })
    .project({ _id: 1, name: 1, email: 1, phone: 1, role: 1 })
    .toArray();
  const testUserIds = testUsers.map((u) => u._id);
  console.log(`[cleanup] Test users: ${testUsers.length}`);
  const byRole = testUsers.reduce((acc, u) => ((acc[u.role] = (acc[u.role] || 0) + 1), acc), {});
  console.log('  by role:', byRole);

  // ── 2. Test service providers (linked to those users) ──────────────────
  const testProviders = await db
    .collection('serviceproviders')
    .find({ user: { $in: testUserIds } })
    .project({ _id: 1, name: 1, user: 1 })
    .toArray();
  const testProviderIds = testProviders.map((p) => p._id);
  console.log(`[cleanup] Test service providers: ${testProviders.length}`, testProviders.map((p) => p.name));

  // ── 3. Test service requests: owned by a test user, assigned to a test
  //      provider, or E2E-tagged in category (covers super_admin-created ones
  //      with no real customer link) ─────────────────────────────────────
  const testSRs = await db
    .collection('servicerequests')
    .find({
      $or: [
        { user: { $in: testUserIds } },
        { serviceProvider: { $in: testProviderIds } },
        { category: { $regex: '^E2E-', $options: 'i' } },
      ],
    })
    .project({ _id: 1, humanId: 1, booking: 1 })
    .toArray();
  const testSRIds = testSRs.map((s) => s._id);
  const testBookingIds = testSRs.map((s) => s.booking).filter(Boolean);
  console.log(`[cleanup] Test service requests: ${testSRs.length}`, testSRs.map((s) => s.humanId));

  // ── 4. Test jobs (by service request or provider) ──────────────────────
  const testJobs = await db
    .collection('jobs')
    .find({ $or: [{ serviceRequest: { $in: testSRIds } }, { serviceProvider: { $in: testProviderIds } }] })
    .project({ _id: 1 })
    .toArray();
  const testJobIds = testJobs.map((j) => j._id);
  console.log(`[cleanup] Test jobs: ${testJobs.length}`);

  console.log(`[cleanup] Test bookings (via service requests): ${testBookingIds.length}`);

  // ── 5. Cascade — every other collection that can reference the above ───
  const cascadePlan = [
    ['calllogs', { $or: [{ serviceRequest: { $in: testSRIds } }, { customer: { $in: testUserIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['conversations', { $or: [{ serviceRequest: { $in: testSRIds } }, { customer: { $in: testUserIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['messages', {}], // filled in below (needs conversation ids first)
    ['wishlists', { user: { $in: testUserIds } }],
    ['carts', { user: { $in: testUserIds } }],
    ['refreshtokens', { user: { $in: testUserIds } }],
    ['paymentmethods', { user: { $in: testUserIds } }],
    ['payments', { user: { $in: testUserIds } }],
    ['walletledgers', { user: { $in: testUserIds } }],
    ['serviceproviderinventoryitems', { serviceProvider: { $in: testProviderIds } }],
    ['payouts', { $or: [{ serviceProvider: { $in: testProviderIds } }, { job: { $in: testJobIds } }] }],
    ['earningstallies', { serviceProvider: { $in: testProviderIds } }],
    ['ownedappliances', { user: { $in: testUserIds } }],
    ['partorders', { $or: [{ serviceProvider: { $in: testProviderIds } }, { job: { $in: testJobIds } }] }],
    ['livetrackings', { $or: [{ job: { $in: testJobIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['gatewaytransactions', { customer: { $in: testUserIds } }],
    ['escalations', { $or: [{ serviceRequest: { $in: testSRIds } }, { manager: { $in: testUserIds } }] }],
    ['usermemberships', { user: { $in: testUserIds } }],
    ['exchangerequests', { user: { $in: testUserIds } }],
    ['referrals', { $or: [{ referrer: { $in: testUserIds } }, { referredUser: { $in: testUserIds } }] }],
    ['amcsubscriptions', { user: { $in: testUserIds } }],
    ['extendedwarrantyorders', { user: { $in: testUserIds } }],
    ['billingtransactions', { user: { $in: testUserIds } }],
    ['reviews', { $or: [{ serviceRequest: { $in: testSRIds } }, { booking: { $in: testBookingIds } }, { user: { $in: testUserIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['notifications', { recipient: { $in: testUserIds } }],
    ['notificationreceipts', { user: { $in: testUserIds } }],
    ['notificationpreferences', { user: { $in: testUserIds } }],
    ['reverselogisticsreturns', { $or: [{ serviceProvider: { $in: testProviderIds } }, { serviceRequest: { $in: testSRIds } }] }],
    ['claims', { $or: [{ serviceRequest: { $in: testSRIds } }, { raisedBy: { $in: [...testUserIds, ...testProviderIds] } }] }],
    ['generateddocuments', { $or: [{ serviceRequest: { $in: testSRIds } }, { generatedBy: { $in: testUserIds } }] }],
    ['replacementapprovals', { $or: [{ serviceRequest: { $in: testSRIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['invoices', { $or: [{ serviceRequest: { $in: testSRIds } }, { customer: { $in: testUserIds } }, { serviceProvider: { $in: testProviderIds } }] }],
    ['orders', { user: { $in: testUserIds } }],
    ['otps', { $or: [{ identifier: { $in: testUsers.map((u) => u.email).filter(Boolean) } }, { identifier: { $in: testUsers.map((u) => u.phone).filter(Boolean) } }] }],
    ['auditlogs', { user: { $in: testUserIds } }],
  ];

  // conversations need to be resolved before messages (messages ref conversation)
  const testConversations = await db
    .collection('conversations')
    .find({ $or: [{ serviceRequest: { $in: testSRIds } }, { customer: { $in: testUserIds } }, { serviceProvider: { $in: testProviderIds } }] })
    .project({ _id: 1 })
    .toArray();
  const testConversationIds = testConversations.map((c) => c._id);
  cascadePlan.find(([name]) => name === 'messages')[1] = { conversation: { $in: testConversationIds } };

  let totalDeleted = 0;
  for (const [collection, filter] of cascadePlan) {
    const count = await db.collection(collection).countDocuments(filter);
    if (count === 0) continue;
    console.log(`[cleanup] ${collection}: ${count} matching doc(s)`);
    if (APPLY) {
      const res = await db.collection(collection).deleteMany(filter);
      totalDeleted += res.deletedCount;
    }
  }

  // ── 6. Core entities, in dependency order ───────────────────────────────
  const core = [
    ['jobs', { _id: { $in: testJobIds } }, testJobIds.length],
    ['servicerequests', { _id: { $in: testSRIds } }, testSRIds.length],
    ['bookings', { _id: { $in: testBookingIds } }, testBookingIds.length],
    ['serviceproviders', { _id: { $in: testProviderIds } }, testProviderIds.length],
    ['asms', { user: { $in: testUserIds } }, null],
    ['users', { _id: { $in: testUserIds } }, testUserIds.length],
  ];
  for (const [collection, filter, expected] of core) {
    const count = await db.collection(collection).countDocuments(filter);
    console.log(`[cleanup] ${collection}: ${count} doc(s)${expected != null ? ` (expected ${expected})` : ''}`);
    if (APPLY && count > 0) {
      const res = await db.collection(collection).deleteMany(filter);
      totalDeleted += res.deletedCount;
    }
  }

  console.log(`\n[cleanup] ${APPLY ? `Deleted ${totalDeleted} document(s) total.` : 'Dry run complete — re-run with --apply to delete.'}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
