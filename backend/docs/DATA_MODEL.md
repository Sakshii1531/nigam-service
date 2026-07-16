# Data Model (Phase 1)

64 collections, implemented as Mongoose schemas under `src/modules/*/*.model.js`. This
doc records the *decisions* (embed vs. reference, relationships, indexes) — field-level
detail already lives in `../../BACKEND_CONTEXT.md` §3–§6 and isn't repeated here.

## Conventions

- **`applyStandardPlugins(schema, { prefix })`** (`src/modules/shared/plugins.js`) is applied to every top-level collection:
  - adds a `humanId` field (unique, sparse) carrying the frontend's existing ID scheme (`NCC-...`, `SR-...`, etc. — see `ID_PREFIXES` in `src/config/constants.js`). Generation itself (the `Counter`-backed atomic increment) is a Phase 2 service; Phase 1 just reserves the field.
  - shapes `toJSON` so `_id` → `id` and `__v` is dropped, so every API response has a consistent shape without each controller doing it by hand.
- **Embed vs. reference** — embedded wherever a sub-document has no independent lifecycle and is always read/written with its parent (e.g. `Address` inside `User`, `ServiceRequest.timeline`, all of `Job`'s work-in-progress state). Referenced (own collection, `ObjectId` + `ref`) wherever a document is independently queried, paginated, or has its own lifecycle (e.g. `Technician`, `Invoice`, `Product`).
- **Snapshots over live refs for money/legal fields** — `Booking.service`, `Booking.address`, `Order.items[].name/price` are copied at write time rather than referencing the live `ServiceCatalogItem`/`Address`/`Product`, so editing the catalog or an address later can't retroactively change a customer's existing booking/order.
- **Three deliberate "merge instead of duplicate" calls**, each documented inline in the model file: `Role` (single collection for both super-admin's platform-wide roles and brand-admin's brand-scoped roles, disambiguated by `scope`+`brand` — plan draft called for two collections; a discriminator gives the same isolation with far less duplicated CRUD/validation code), `Escalation` (same pattern for brand-level vs. platform-level escalations), `Claim` (single collection for both customer-raised and technician-raised claims, via `raisedByModel`/`refPath` polymorphism).
- **Transactions**: `Payment` + `WalletLedger` + `Booking`/`Order` status writes must happen inside one Mongo session/transaction (Phase 5) — requires the replica-set connection noted in `.env.example`.

## Collections by module

### `auth/`
| Collection | Kind | Notes |
|---|---|---|
| `User` | top-level | One collection for all 4 roles (`role` enum), not 4 separate tables — auth/session logic is identical, only the extra fields differ (customer-only: coins/referral/membership; brand_admin-only: `brand`). Embeds `Address[]`. |
| `Permission` | top-level | Seeded once; keyed by `key` (e.g. `invoices:export`). |
| `Role` | top-level | See "merge instead of duplicate" above. |
| `Otp` | top-level, TTL | Auto-expires (`expiresAt` TTL index). |
| `RefreshToken` | top-level, TTL | Revocation list for JWT refresh tokens. |
| `Address` (`address.schema.js`) | embedded only | Lives inside `User.addresses[]`, `Booking.address`, `Order.address` (snapshot). |

### `catalog/`
`Category` → `ProductType` (ref category) → `ServiceCatalogItem` (ref category). Replaces `frontend/src/data/bookingCatalog.js`; written to by super-admin CMS endpoints (Phase 8), read by customer booking flow (Phase 4).

### `booking/`
`Booking` — snapshots `service` and `address`; refs `user`, `technician` (nullable until auto-assigned), `serviceRequest` (set once the booking spawns one).

### `service-requests/`
`OwnedAppliance` (a customer's registered appliance instance; `warrantyStatus` is a cached field recomputed by `warrantyEngine`, Phase 2) and `ServiceRequest` — the central ticket entity, embeds its own `timeline[]`, referenced by Invoice/Review/GeneratedDocument/ReverseLogisticsReturn/Escalation/Job.

### `warranty-amc-exchange/`
`ExtendedWarrantyOrder`, `AMCPlan` (catalog of plan tiers) → `AMCSubscription` (a customer's active plan) → `AMCVisit` (one per scheduled/completed visit), `Claim` (polymorphic `raisedBy`), and the Exchange sub-domain: `ExchangeQuestionSet` (embeds its `questions[]`, `deductions` as a `Map`), `ExchangeCampaign`, `ExchangeProductConfig` (ties a `Product` to a question set + campaign), `ExchangeRequest` (a customer's trade-in valuation; stores the computed `estimatedValue` rather than recomputing it later, so a config change can't retroactively alter a quoted value).

### `buy-commerce/`
`Product` (new + refurbished, one collection distinguished by `condition`), `Cart` (one doc per user, embedded `items[]`), `Wishlist` (many-to-many `user`×`product` rows — unlike Cart, no reason to embed since it's never edited as a batch), `Order` (embeds item snapshots + address snapshot).

### `payments-wallet/`
`Payment`, `WalletLedger` (append-only; `User.walletCoins` is a cache kept in sync inside the same transaction as each ledger write), `PaymentMethod`.

### `rewards-loyalty/`
`Coupon`, `Membership` (plan tiers), `SpinWheelConfig` (singleton-ish doc, embeds `segments[]` since probabilities are validated as a set, not per-row), `Referral`, `LoyaltyMilestone`.

### `notifications/`
`Notification` (either `recipient` (single user) or `broadcastRole` (platform-wide push) — not both), `NotificationPreference` (one doc per user, channel booleans rather than one row per channel).

### `chat/`
`Conversation` (scoped to a `serviceRequest`, links `customer`+`technician`), `Message`.

### `reviews/`
`Review` — refs `serviceRequest`, `technician`; embeds `categoryRatings`.

### `technician/` (largest module — mirrors `ActiveJob.jsx`, the biggest frontend file)
- `Technician` — profile; embeds `skills[]`, `certifications[]`, `payoutMethods[]` (all small, always read with the profile).
- `Job` — **one per `ServiceRequest` (1:1)**, kept as its own collection rather than merged into `ServiceRequest` because most of its content (diagnosis, proofs, billing estimate, revisit sub-flow) only exists once a technician is actively engaged, and is always read/written together as a unit. Embeds `amc`/`ew` type-specific metadata, `diagnosis`, `proofs`, `revisit`, `billingEstimate`, and `additionalServices[]`/`spareParts[]` line items. `activeStep` covers both the main state machine (`idle → ... → completed`) and the revisit sub-flow states in one enum (`JOB_STEPS` + `JOB_REVISIT_STEPS` in `src/config/constants.js`).
- `TechInventoryItem` — `status` (In/Low/Out of Stock) is a **virtual**, derived from `qty`, never stored (can't drift out of sync).
- `PartOrder`, `EarningsTally` (one per technician, a running cache updated on `Payout` settlement), `Payout`.
- `TrainingGuide`, `Course`, `TechBlog`, `Announcement` (Academy content — no per-technician relation, read-only reference material).

### `brand-admin/` (every query here must be scoped by `brand` — enforced by `requireBrandScope` middleware, Phase 3)
`Invoice`, `RateCard` (feeds `pricingEngine`; `totalBase` is a virtual, not stored), `ReplacementApproval`, `ReverseLogisticsReturn`, the 3-level catalog hierarchy `MasterService` → `SubBrand` → `BrandProduct` (services mapped per product), `Team`, `GeneratedDocument`. **No separate `BrandUser` model** — a brand-admin account is just a `User` with `role: 'brand_admin'` and `brand` set; its permissions come from `Role` docs with `scope: 'brand'`.

### `super-admin/`
- Org/geo: `Brand`, `City` (no dependencies — referenced by nearly everything else), `ServicePartner` (refs `City`), `ASM` (refs `City` + `ServicePartner[]`).
- Ops: `AssignmentWeighting` (config for the Phase 8 auto-assignment scorer), `LiveTracking` (one doc per active `Job`, upserted on each GPS ping — latest position only, not history), `Escalation` (see "merge instead of duplicate"), `AuditLog` (append-only, no `humanId`/`toJSON` plugin needed), `SparePartCatalog` (`retailPrice`/`status` are virtuals), `PlatformSettings` (singleton).
- Finance: `BillingTransaction`, `Revenue` (aggregated rows, built by a reporting job — not per-transaction), `PartnerPayout` (payouts to a `ServicePartner`, distinct from technician-level `Payout`), `GatewayTransaction` (raw gateway log, distinct from the app-level `Payment`).
- CMS/app-customization: `Banner`, `Story`, `Video`, `Advertisement`, `CMSPage` (static pages by `slug`), `AppSetting` (flat key/value store per app — new toggles need no schema migration).

### `shared/`
`Counter` — backing store for `idGenerator` (Phase 2): one doc per prefix+scope key, atomically incremented via `findOneAndUpdate($inc)`.

## Indexes worth calling out

Every list-page filter pattern from `BACKEND_CONTEXT.md` §7.4 has a matching compound index: `ServiceRequest{brand,status,createdAt}` / `{technician,status}`, `Invoice{brand,status,createdAt}`, `Job{technician,activeStep}`, `Booking{user,status,createdAt}`, plus unique-scoped indexes (`Category.key`, `Coupon.code`, `Role{name,scope,brand}`, `RateCard{brand,category,serviceType}`) and a text index on `Product{name,brand}` for the search bar.

## Deviations from the original phase plan

- `Role` and `Escalation`: one collection with a `scope` discriminator instead of two separate collections (see Conventions above) — same tenant isolation, less duplication.
- `BrandUser` (mentioned in `BACKEND_CONTEXT.md` §5): folded into the single `User` collection rather than a separate model.

## Phase 2 addendum — shared services wired up

- **`idGenerator`** (`src/modules/shared/idGenerator.js`) is now live: `humanIdPlugin` (`src/modules/shared/plugins.js`) calls it from a `pre('save')` hook on every model configured with a `prefix`, atomically allocating the next ID via the `Counter` collection (`ID_SCHEMES` in `src/config/constants.js` defines digits/date-reset per prefix). **`User` is the one exception** — it doesn't use the generic plugin's prefix option, since a single `User` collection spans all 4 roles and only `role: 'customer'` should ever get a `CUST-###` id; it has its own small `pre('save')` hook gated on `role`.
- **Schema fix**: `ExtendedWarrantyOrder.appliance` was a free-text category string in Phase 1; it's now `{ appliance: ObjectId ref OwnedAppliance, applianceCategory: String }` so `warrantyEngine` can actually resolve the Extended Warranty overlay for a given appliance instead of only reading `AMCSubscription`.
- **`warrantyEngine`** and **`pricingEngine`** (`src/modules/shared/`) are pure functions (no DB access) — callers resolve `AMCSubscription`/`ExtendedWarrantyOrder`/`RateCard` docs and pass plain values in, which is what makes them cheaply unit-testable without a database.
- **`fileUpload`** (`src/modules/shared/fileUpload.js`): Multer buffers in memory; `storeUploadedFile` persists to local disk (`backend/uploads/`, gitignored) when `S3_*` env vars are unset, or to an S3-compatible bucket (`@aws-sdk/client-s3` — works against AWS S3 or Cloudflare R2) once they're configured. `app.js` only serves `/uploads` statically when the local backend is active.
- **Throwaway dev routes** (`src/modules/shared/dev.routes.js`, mounted at `/api/v1/_dev/*` only when `NODE_ENV !== 'production'`) exist solely to exercise pagination/validation/upload/id-generation end-to-end per this phase's exit criterion — covered by `e2e/api/dev.spec.js`. Expect both to be deleted once Phase 4+ real routes make them redundant.

## Phase 3 addendum — auth, sessions & RBAC wired up

- **Auth module** (`src/modules/auth/`): `POST /auth/{login,otp/send,otp/verify,forgot-password,reset-password,refresh,logout}`. Login is two-step, matching the frontend's existing UI flow — `login` verifies the password and sends an OTP (no tokens yet); `otp/verify` is what actually issues the JWT access+refresh pair. No signup endpoint exists yet — accounts come from `npm run seed` or an admin panel in a later phase.
- **JWT access tokens embed a `permissions` snapshot** (resolved from `User.assignedRoles -> Role.permissions -> Permission.key` at issuance time), so `requirePermission()` middleware never needs a DB hit — tradeoff is up to `JWT_ACCESS_EXPIRES_IN` (15m) of staleness if a role's permissions change mid-session.
- **Refresh tokens are rotated and hashed at rest**: `RefreshToken.tokenHash` (sha256), never the raw token; each `/auth/refresh` call revokes the old doc and issues a new one. Found and fixed a real bug here during testing — two refresh tokens signed for the same user within the same second are byte-identical JWTs (1s `iat` resolution) unless a nonce is added, which collided on `tokenHash`'s unique index; `signRefreshToken` now always includes a random `jti`.
- **`registerAllModels()`** (`src/config/registerModels.js`), called once at the top of `server.js`, imports every `*.model.js` so Mongoose has every schema registered before the first request — added after `.populate('assignedRoles')` threw "Schema hasn't been registered for model 'Role'" in manual testing, because nothing in the auth module's own import graph happened to load `role.model.js`/`permission.model.js`. This class of bug will keep recurring as more services add `.populate()` calls, so it's solved once here rather than per-service.
- **RBAC seed** (`backend/scripts/seed.js`, `npm run seed`, idempotent): 10 baseline permissions, a platform-scoped "Super Admin" role (all permissions) and a brand-scoped "Brand Admin" role (subset), one demo `Brand`, and exactly one `User` per role (customer/technician/brand_admin/super_admin) plus a linked `Technician` profile — reuses the frontend's demo personas ("Sakshi Dwivedi", "Rahul Sharma") and demo creds (`admin123@gmail.com` / `admin123` shared across both admin roles, matching what the frontend already hardcodes).
- **Auth rate limiting** (`authRouter`, 20 req/15min) is skipped under `NODE_ENV=test` — its in-memory store persists for the process lifetime, and a single Jest file legitimately exceeds 20 requests across its auth test cases; the limiter itself isn't what's under test there.
- **`User`'s compound unique indexes were silently broken since Phase 1** — `{phone:1,role:1}`/`{email:1,role:1}` were declared `sparse`, on the assumption a compound sparse index skips a document if *any* indexed field is missing. It doesn't: MongoDB only skips a document from a compound sparse index if it's missing *every* indexed field, and `role` is always present, so every user without a `phone` was still indexed as `phone: null` and collided with every *other* phone-less user of the same role. Only surfaced once the E2E suite created a second phone-less `super_admin` in a persisted database (`E11000 duplicate key`). Fixed with explicit `partialFilterExpression: { phone: { $exists: true } }` (and same for `email`) instead of `sparse`.
- **`ensureIndexes()`** (`src/config/db.js`), called after `connectDB()` in both `server.js` and `scripts/seed.js`: Mongoose's `autoIndex` fires `createIndexes` in the background and does *not* block on it, so a short-lived process — `seed.js` connects, writes, and disconnects in a couple hundred milliseconds — could exit before most of a model's indexes ever finished building, leaving uniqueness effectively unenforced. `ensureIndexes()` awaits `Model.init()` (which resolves once that model's indexes are confirmed built) for every registered model before any real work happens. This was found by directly inspecting `db.users.getIndexes()` after running `npm run seed` and seeing only 2 of 8 expected indexes present.

## Phase 4 addendum — catalog, booking & service-request routes wired up

- **Catalog module** (`src/modules/catalog/`): `GET /catalog/categories` and `GET /catalog/categories/:key` (public — the customer app browses without logging in) assemble `Category` + its `ProductType`s + `ServiceCatalogItem`s into exactly the shape `frontend/src/data/bookingCatalog.js`'s `BOOKING_CATALOG` entries already have (`{ key, productTypes: [{id,name,icon,desc}], services: [{id,name,icon,desc,price,unit}], ... }`), so no reshaping is needed once the frontend is wired to real APIs. Writes (`POST /catalog/categories`, `.../product-types`, `.../services`, `PUT /catalog/categories/:key`) are gated by `requireRole(SUPER_ADMIN)` for now — a real brand-scoped/permission-based CMS is Phase 8's job.
- **`backend/scripts/catalogSeedData.js`**: all 9 categories from `bookingCatalog.js` (AC, Washing Machine, Refrigerator, TV, RO Water Purifier, Geyser, Microwave, Chimney, Air Cooler), seeded by `scripts/seed.js` — same prices, product types, and services as the frontend mock, so the seeded backend catalog is a genuine drop-in replacement, not a token 1-category stub.
- **`findAvailableTechnician()`** (`src/modules/shared/assignmentStub.js`) is the explicitly-temporary stand-in for Phase 8's full weighted auto-assignment engine: first `Active`+`Available` `Technician` whose `specs` includes the booking's category, falling back to any `Active`+`Available` technician. Same function signature Phase 8 will fill in properly, so `booking.service.js` doesn't need to change when that lands.
- **`SERVICE_REQUEST_TRANSITIONS`** (`src/config/constants.js`): explicit allowed-next-status map, enforced server-side in `serviceRequest.service.js`'s `transitionStatus()` — the Phase 4 exit criterion ("status transitions validated server-side, not client-trusted"). `Closed`/`Cancelled` are terminal (no outgoing edges).
- **Booking creation is transactional in spirit but not yet in a Mongo `session`**: `createBooking()` prices server-side from the catalog (a client-supplied price is silently discarded — `createBookingSchema` doesn't even accept one), auto-assigns a technician, creates the linked `ServiceRequest`, and immediately transitions it `New -> Assigned` if a technician was found. Multi-document atomicity across `Booking`+`ServiceRequest`+`Counter` writes is deferred to Phase 5 (where the plan already calls for a real transaction on the payment/wallet path) rather than introduced piecemeal here.
- **Bug found via manual smoke testing, not just written to pass**: `booking.service.js` called `transitionStatus()` for the auto-assign step but discarded its return value, so the API response (and the `serviceRequest` the function returned) still showed status `"New"` with a 1-entry timeline even though the database was correctly updated to `"Assigned"`. Fixed by capturing and returning the updated document.
- **E2E test-isolation bug found via the E2E suite itself, not the (sequential, per-suite-DB) Jest tests**: booking/service-request E2E specs originally all booked against the shared seeded `'AC'` category. Under Playwright's parallel workers, `findAvailableTechnician`'s "first matching specialist" query nondeterministically picked whichever `Active`+`Available` technician with `'AC'` in `specs` happened to match first — sometimes the seeded "Rahul Sharma", sometimes another test's fixture technician, not necessarily the current test's own. Fixed by giving every booking/service-request E2E test its own uniquely-keyed category + service + technician (`setupIsolatedFixture()` in `e2e/api/booking.spec.js`), so no cross-test or cross-worker collision is even possible — not a retry/wait-based workaround.
- **`e2e/global-setup.js`** runs the real `backend/scripts/seed.js` (idempotent) against the e2e database once before the suite starts, reusing the exact same seed logic as local dev rather than a parallel fixture-creation path — `auth.spec.js` doesn't depend on it (creates its own users via `/_dev/test-user`), but `catalog.spec.js`'s read tests and the RBAC seed data do.
- **`POST /_dev/test-technician`** (new `NODE_ENV=test`-only dev route, same reasoning as `/_dev/test-user`): creates a `User`+`Technician` pair with caller-specified `specs`/`availability`, needed because booking/service-request E2E specs must control exactly which technician is eligible for auto-assignment.
- **Jest cross-file flakiness found and fixed — every test file now gets its own database, not one shared one**: 5 test files (`health`, `idGenerator`, `auth`, `catalog`, `booking`) each independently called `mongoose.connect()`/`dropDatabase()`/`disconnect()` against the *same* `nigam_care_test` database. Once there were enough of them, the full suite started failing intermittently (passed in isolation, occasionally failed as part of the full run) — one file's teardown could race against another's setup/tests on the same physical database. Fixed with `tests/helpers/testDb.js`'s `testDbUri(suffix)`, giving each file its own `nigam_care_test_<name>` database so this class of race is impossible by construction. Caught by running the full suite repeatedly (not just once) after the fix to confirm it actually resolved it, since the original failure didn't reproduce every time either.
- **Related bug in the same area**: `health.test.js` imports `createApp()`, which transitively imports *every* model (via the full route chain) even though the test only exercises `/health`. Mongoose's `autoIndex` schedules `createIndexes()` for each newly-registered model in the background, unawaited — those could still be in-flight when `afterAll`'s `dropDatabase()` ran, recreating empty collections with indexes immediately after the drop and leaving a stray database behind even on a supposedly-clean teardown. Fixed by adding the same `ensureIndexes()` call (`src/config/db.js`, already used by `auth`/`catalog`/`booking` tests) to `health.test.js`'s `beforeAll`, so all pending index builds resolve before the test runs and well before teardown.
