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
