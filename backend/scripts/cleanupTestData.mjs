// Comprehensive cleanup for test and E2E data across MongoDB collections.
//
// Removes:
//   1. E2E test users (name: 'E2E Test User', 'E2E Test ServiceProvider', 'E2E Tracking Customer', @e2e.test emails, etc.)
//   2. E2E test service providers (name: 'E2E Test ServiceProvider' or linked to test users)
//   3. E2E service requests, bookings, jobs, conversations, calls, reviews, notifications, etc.
//   4. E2E test categories, catalog items, and mock brands
//
// NEVER touches seeded data:
//   - Rahul Sharma (9000000001)
//   - Vipin Aanjna (9876543210)
//   - Ujjawal Provider (9772732665)
//   - Admin accounts (admin123@gmail.com, admin2@gmail.com)
//
// Usage:
//   node scripts/cleanupTestData.mjs            # dry-run report
//   node scripts/cleanupTestData.mjs --apply    # perform deletions

import mongoose from "mongoose";
import "dotenv/config";

const WHITELISTED_PHONES = ["9000000001", "9876543210", "9772732665"];
const WHITELISTED_EMAILS = ["admin123@gmail.com", "admin2@gmail.com"];

export async function cleanTestData({
  uri,
  apply = false,
  silent = false,
} = {}) {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("[cleanup] No MONGODB_URI provided");
  }

  const shouldDisconnect = mongoose.connection.readyState === 0;
  if (shouldDisconnect) {
    await mongoose.connect(mongoUri);
  }

  const db = mongoose.connection.db;
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  log(
    `[cleanup] Mode: ${apply ? "APPLY (deleting)" : "DRY RUN (report only)"}\n`,
  );

  // ── 1. Identify test service providers first ──────────────────────────────
  const rawTestProviders = await db
    .collection("serviceproviders")
    .find({
      $and: [
        {
          $or: [
            { name: "E2E Test ServiceProvider" },
            { name: { $regex: /^E2E /i } },
            { phone: { $regex: /^9199/ } },
          ],
        },
        { phone: { $nin: WHITELISTED_PHONES } },
      ],
    })
    .project({ _id: 1, name: 1, user: 1, phone: 1 })
    .toArray();

  const providerLinkedUserIds = rawTestProviders
    .map((p) => p.user)
    .filter(Boolean);

  // ── 2. Identify test users ───────────────────────────────────────────────
  const testUsers = await db
    .collection("users")
    .find({
      $and: [
        {
          $or: [
            { email: { $regex: "@e2e\\.test$", $options: "i" } },
            { name: "E2E Test User" },
            { name: "E2E Test ServiceProvider" },
            { name: "E2E Tracking Customer" },
            { name: { $regex: /^E2E /i } },
            { email: { $in: ["harsh@gmail.com", "harsh@appzeto.com"] } },
            { _id: { $in: providerLinkedUserIds } },
          ],
        },
        { phone: { $nin: WHITELISTED_PHONES } },
        { email: { $nin: WHITELISTED_EMAILS } },
      ],
    })
    .project({ _id: 1, name: 1, email: 1, phone: 1, role: 1 })
    .toArray();

  const testUserIds = testUsers.map((u) => u._id);
  log(`[cleanup] Test users: ${testUsers.length}`);

  // ── 3. Complete test service providers (by name or by user) ──────────────
  const testProviders = await db
    .collection("serviceproviders")
    .find({
      $and: [
        {
          $or: [
            { _id: { $in: rawTestProviders.map((p) => p._id) } },
            { user: { $in: testUserIds } },
          ],
        },
        { phone: { $nin: WHITELISTED_PHONES } },
      ],
    })
    .project({ _id: 1, name: 1, user: 1 })
    .toArray();

  const testProviderIds = testProviders.map((p) => p._id);
  log(`[cleanup] Test service providers: ${testProviders.length}`);

  // ── 4. Test service requests ─────────────────────────────────────────────
  const testSRs = await db
    .collection("servicerequests")
    .find({
      $or: [
        { user: { $in: testUserIds } },
        { serviceProvider: { $in: testProviderIds } },
        { category: { $regex: "^E2E-", $options: "i" } },
        { description: { $regex: "E2E", $options: "i" } },
      ],
    })
    .project({ _id: 1, humanId: 1, booking: 1 })
    .toArray();

  const testSRIds = testSRs.map((s) => s._id);
  const testBookingIds = testSRs.map((s) => s.booking).filter(Boolean);
  log(`[cleanup] Test service requests: ${testSRs.length}`);

  // ── 5. Test bookings (directly by user, provider, or linked SR) ───────────
  const additionalBookings = await db
    .collection("bookings")
    .find({
      $or: [
        { user: { $in: testUserIds } },
        { serviceProvider: { $in: testProviderIds } },
        { _id: { $in: testBookingIds } },
      ],
    })
    .project({ _id: 1 })
    .toArray();

  const allTestBookingIds = [
    ...new Set([
      ...testBookingIds.map(String),
      ...additionalBookings.map((b) => String(b._id)),
    ]),
  ].map((id) => new mongoose.Types.ObjectId(id));
  log(`[cleanup] Test bookings: ${allTestBookingIds.length}`);

  // ── 6. Test jobs ─────────────────────────────────────────────────────────
  const testJobs = await db
    .collection("jobs")
    .find({
      $or: [
        { serviceRequest: { $in: testSRIds } },
        { serviceProvider: { $in: testProviderIds } },
      ],
    })
    .project({ _id: 1 })
    .toArray();

  const testJobIds = testJobs.map((j) => j._id);
  log(`[cleanup] Test jobs: ${testJobs.length}`);

  // ── 7. Test categories & catalog items ───────────────────────────────────
  const testCategories = await db
    .collection("categories")
    .find({
      $or: [
        { key: { $regex: "^E2E-", $options: "i" } },
        { name: { $regex: "^E2E", $options: "i" } },
      ],
    })
    .project({ _id: 1 })
    .toArray();
  const testCategoryIds = testCategories.map((c) => c._id);

  const testCatalogItems = await db
    .collection("servicecatalogitems")
    .find({
      $or: [
        { key: { $regex: "^E2E-", $options: "i" } },
        { name: { $regex: "^E2E", $options: "i" } },
        { category: { $in: testCategoryIds } },
      ],
    })
    .project({ _id: 1 })
    .toArray();
  const testCatalogItemIds = testCatalogItems.map((c) => c._id);

  // ── 8. Test brands & AMC plans ───────────────────────────────────────────
  const testBrands = await db
    .collection("brands")
    .find({ name: { $regex: "^E2E", $options: "i" } })
    .project({ _id: 1 })
    .toArray();
  const testBrandIds = testBrands.map((b) => b._id);

  const testAMCPlans = await db
    .collection("amcplans")
    .find({ name: { $regex: "^E2E", $options: "i" } })
    .project({ _id: 1 })
    .toArray();
  const testAMCPlanIds = testAMCPlans.map((p) => p._id);

  // ── 8b. Test cities (territories), their ASMs, and city change requests ──
  // Name patterns are the ones the e2e specs create: superAdmin.spec
  // ("E2E City <uuid>"), cityChange.spec ("E2E From/To <id>"), cities.spec
  // ("Testpur <id>", "Techville <id>", "ActiveCity <id>"). A matching city that a real (non-test)
  // service provider or ASM still points at is kept, and reported.
  const candidateCities = await db
    .collection("cities")
    .find({ name: { $regex: /^(E2E (City|From|To) |Testpur |Techville |ActiveCity |InactiveCity )/ } })
    .project({ _id: 1, name: 1 })
    .toArray();
  const candidateCityIds = candidateCities.map((c) => c._id);
  const [realProvidersInCities, realAsmsInCities] = await Promise.all([
    db
      .collection("serviceproviders")
      .find({ city: { $in: candidateCityIds }, _id: { $nin: testProviderIds } })
      .project({ city: 1 })
      .toArray(),
    db
      .collection("asms")
      .find({ city: { $in: candidateCityIds }, name: { $not: /^E2E /i }, user: { $nin: testUserIds } })
      .project({ city: 1 })
      .toArray(),
  ]);
  const inRealUse = new Set([...realProvidersInCities, ...realAsmsInCities].map((d) => String(d.city)));
  const testCities = candidateCities.filter((c) => !inRealUse.has(String(c._id)));
  const testCityIds = testCities.map((c) => c._id);
  const keptCities = candidateCities.filter((c) => inRealUse.has(String(c._id)));
  if (keptCities.length) {
    log(`[cleanup] Keeping ${keptCities.length} test-named city(ies) still used by real providers/ASMs: ${keptCities.map((c) => c.name).join(", ")}`);
  }

  const testAsms = await db
    .collection("asms")
    .find({
      $or: [
        { name: { $regex: /^E2E /i } },
        { city: { $in: testCityIds } },
        { user: { $in: testUserIds } },
      ],
    })
    .project({ _id: 1, user: 1, name: 1 })
    .toArray();
  const testAsmIds = testAsms.map((a) => a._id);
  const testAsmUserIds = testAsms.map((a) => a.user).filter(Boolean);

  // A real provider's change history is kept even if it mentions a test city;
  // only requests by test providers, or entirely between test cities, go.
  const testCityChangeFilter = {
    $or: [
      { serviceProvider: { $in: testProviderIds } },
      {
        $and: [
          { "fromCity.city": { $in: testCityIds } },
          { "toCity.city": { $in: testCityIds } },
        ],
      },
    ],
  };

  // ── 9. Conversations and messages ────────────────────────────────────────
  const testConversations = await db
    .collection("conversations")
    .find({
      $or: [
        { serviceRequest: { $in: testSRIds } },
        { customer: { $in: testUserIds } },
        { serviceProvider: { $in: testProviderIds } },
      ],
    })
    .project({ _id: 1 })
    .toArray();
  const testConversationIds = testConversations.map((c) => c._id);

  // ── 10. Cascading collections ────────────────────────────────────────────
  const cascadePlan = [
    [
      "calllogs",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { customer: { $in: testUserIds } },
          { serviceProvider: { $in: testProviderIds } },
        ],
      },
    ],
    ["conversations", { _id: { $in: testConversationIds } }],
    ["messages", { conversation: { $in: testConversationIds } }],
    ["wishlists", { user: { $in: testUserIds } }],
    ["carts", { user: { $in: testUserIds } }],
    ["refreshtokens", { user: { $in: testUserIds } }],
    ["paymentmethods", { user: { $in: testUserIds } }],
    ["payments", { user: { $in: testUserIds } }],
    ["walletledgers", { user: { $in: testUserIds } }],
    [
      "serviceproviderinventoryitems",
      { serviceProvider: { $in: testProviderIds } },
    ],
    [
      "payouts",
      {
        $or: [
          { serviceProvider: { $in: testProviderIds } },
          { job: { $in: testJobIds } },
        ],
      },
    ],
    ["earningstallies", { serviceProvider: { $in: testProviderIds } }],
    ["ownedappliances", { user: { $in: testUserIds } }],
    [
      "partorders",
      {
        $or: [
          { serviceProvider: { $in: testProviderIds } },
          { job: { $in: testJobIds } },
        ],
      },
    ],
    [
      "livetrackings",
      {
        $or: [
          { job: { $in: testJobIds } },
          { serviceProvider: { $in: testProviderIds } },
        ],
      },
    ],
    ["gatewaytransactions", { customer: { $in: testUserIds } }],
    [
      "escalations",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { manager: { $in: testUserIds } },
        ],
      },
    ],
    ["exchangerequests", { user: { $in: testUserIds } }],
    [
      "referrals",
      {
        $or: [
          { referrer: { $in: testUserIds } },
          { referredUser: { $in: testUserIds } },
        ],
      },
    ],
    [
      "amcsubscriptions",
      {
        $or: [
          { user: { $in: testUserIds } },
          { plan: { $in: testAMCPlanIds } },
        ],
      },
    ],
    ["extendedwarrantyorders", { user: { $in: testUserIds } }],
    ["billingtransactions", { user: { $in: testUserIds } }],
    [
      "reviews",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { booking: { $in: allTestBookingIds } },
          { user: { $in: testUserIds } },
          { serviceProvider: { $in: testProviderIds } },
        ],
      },
    ],
    ["notifications", { recipient: { $in: testUserIds } }],
    ["notificationreceipts", { user: { $in: testUserIds } }],
    ["notificationpreferences", { user: { $in: testUserIds } }],
    [
      "reverselogisticsreturns",
      {
        $or: [
          { serviceProvider: { $in: testProviderIds } },
          { serviceRequest: { $in: testSRIds } },
        ],
      },
    ],
    [
      "claims",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { raisedBy: { $in: [...testUserIds, ...testProviderIds] } },
        ],
      },
    ],
    [
      "generateddocuments",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { generatedBy: { $in: testUserIds } },
        ],
      },
    ],
    [
      "replacementapprovals",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { serviceProvider: { $in: testProviderIds } },
        ],
      },
    ],
    [
      "invoices",
      {
        $or: [
          { serviceRequest: { $in: testSRIds } },
          { customer: { $in: testUserIds } },
          { serviceProvider: { $in: testProviderIds } },
        ],
      },
    ],
    ["orders", { user: { $in: testUserIds } }],
    [
      "otps",
      {
        $or: [
          {
            identifier: { $in: testUsers.map((u) => u.email).filter(Boolean) },
          },
          {
            identifier: { $in: testUsers.map((u) => u.phone).filter(Boolean) },
          },
        ],
      },
    ],
    ["auditlogs", { user: { $in: testUserIds } }],
    ["servicecatalogitems", { _id: { $in: testCatalogItemIds } }],
    ["categories", { _id: { $in: testCategoryIds } }],
    ["brands", { _id: { $in: testBrandIds } }],
    ["amcplans", { _id: { $in: testAMCPlanIds } }],
    ["citychangerequests", testCityChangeFilter],
    ["roles", { name: { $regex: /^ASM — E2E /i }, scope: "platform" }],
    ["users", { _id: { $in: testAsmUserIds }, role: "asm", email: { $nin: WHITELISTED_EMAILS } }],
    ["asms", { _id: { $in: testAsmIds } }],
    ["cities", { _id: { $in: testCityIds } }],
  ];

  let totalDeleted = 0;
  for (const [collection, filter] of cascadePlan) {
    const count = await db.collection(collection).countDocuments(filter);
    if (count === 0) continue;
    log(`[cleanup] ${collection}: ${count} matching doc(s)`);
    if (apply) {
      const res = await db.collection(collection).deleteMany(filter);
      totalDeleted += res.deletedCount;
    }
  }

  // ── 11. Core entities, in dependency order ─────────────────────────────────
  const core = [
    ["jobs", { _id: { $in: testJobIds } }],
    ["servicerequests", { _id: { $in: testSRIds } }],
    ["bookings", { _id: { $in: allTestBookingIds } }],
    ["serviceproviders", { _id: { $in: testProviderIds } }],
    ["asms", { user: { $in: testUserIds } }],
    ["users", { _id: { $in: testUserIds } }],
  ];

  for (const [collection, filter] of core) {
    const count = await db.collection(collection).countDocuments(filter);
    if (count === 0) continue;
    log(`[cleanup] ${collection}: ${count} core doc(s)`);
    if (apply) {
      const res = await db.collection(collection).deleteMany(filter);
      totalDeleted += res.deletedCount;
    }
  }

  log(
    `\n[cleanup] ${apply ? `Deleted ${totalDeleted} document(s) total.` : "Dry run complete — re-run with --apply to delete."}`,
  );

  if (shouldDisconnect) {
    await mongoose.disconnect();
  }

  return {
    totalDeleted,
    testUsersCount: testUsers.length,
    testProvidersCount: testProviders.length,
  };
}

// Direct CLI execution
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/.*[/\\]/, ""))
) {
  const APPLY = process.argv.includes("--apply");
  cleanTestData({ apply: APPLY }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
