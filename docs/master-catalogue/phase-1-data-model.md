# Phase 1 — Catalogue Data Model + Seed

| | |
|---|---|
| **Status** | ✅ Done (2026-09-24) |
| **Estimate** | 4–5 developer-days |
| **Depends on** | — |
| **Unblocks** | Phase 2, Phase 3 |
| **Client requirements** | 1, 2, 3, 4, 5, 6, 8, 11, 12, 20, 25 (model), 26 (model) |
| **Breaks anything existing?** | No. Purely additive; the old booking flow keeps running on the old models until Phase 4 |

## Goal

Create the models from [ARCHITECTURE.md §2](ARCHITECTURE.md#2-data-model) and fill
them with the client's example catalogue, so that "Split AC 1.5 Ton Installation →
₹1,499 → partner ₹900" exists as **one row you can point at**. Also create the
clean-slate wipe script (decision D1).

No API or UI yet. At the end of this phase you can open MongoDB and see the whole
catalogue, including a rate history.

---

## Tasks

### 1.1 Money helpers
- [x] `backend/src/modules/catalog/money.js`
  - `toPaise(rupees)`: `Math.round(rupees * 100)`, rejects negative/NaN
  - `toRupees(paise)`: `paise / 100`
  - `percentOf(paise, percent)`: integer, half-up rounding
- [x] Unit tests: `backend/tests/money.test.js` (e.g. `percentOf(63720, 18) === 11470`)

### 1.2 Extend existing models
- [x] `category.model.js`: add `keywords: [String]`
- [x] `productType.model.js`: add `variantDimension {key,label}`, `isActive`, `sortOrder`
      (keep `priceAddon` for now; the old flow still reads it until Phase 4)

### 1.3 New models (in `backend/src/modules/catalog/`)
- [x] `variant.model.js`: exactly-one-of(`productType`, `service`) validator; unique `(productType, slug)` and `(service, slug)` partial indexes
- [x] `catalogService.model.js`: model name `CatalogService`; unique `(category, slug)`
- [x] `serviceOffering.model.js`
  - all fields from ARCHITECTURE §2.5, including `internalNotes`, `needsRateReview`
  - `code`: uppercase, `^[A-Z0-9]+(-[A-Z0-9]+)*$`, unique, immutable (pre-save hook rejects change)
  - unique `(service, productType, variant)`
  - pre-validate: bookingType ⇔ productType consistency; variant belongs to productType/service; service.category === category
  - `PER_SERVICE` forces `minQty = maxQty = 1`
  - pre-save: rebuild `searchText`
  - text index on `searchText`; index `(category, isActive, displayOrder)`
- [x] `offeringRate.model.js`: fields from §2.6; indexes `(offering, scope.type, scope.value, version)` unique, `(offering, effectiveFrom)`

No registration step is needed. `config/registerModels.js` auto-imports every `*.model.js`.

### 1.4 Rate-writing service (the single place a rate is created)
- [x] `backend/src/modules/catalog/rateWriter.js`: `createRateVersion(offeringId, patch, { reason, changedBy, effectiveFrom, scope })`
  1. Load the current version for that scope (or none → v1; all four money fields required)
  2. `next = { ...current, ...patch }`: **fields not in `patch` are carried forward unchanged**
  3. Compute `changes[]` = fields where `next ≠ current`; reject if empty ("nothing changed")
  4. Close the current row's `effectiveUntil = next.effectiveFrom`
  5. Insert `version + 1` inside a transaction (`runInTransaction` from shared utils)
  6. Clear `offering.needsRateReview`
- [x] `reason` required for every version after v1
- [x] `effectiveFrom` must not be before the current version's `effectiveFrom`

This function is what guarantees client Test 8 at data level: there is no code path
where changing `customerPrice` touches `spPayout`.

### 1.5 Offering code suggestion
- [x] `catalog/offeringCode.js`: `suggestOfferingCode({ category, productType, variant, service })`
  - `AC` + `Split AC` + `1.5 Ton` + `Installation` → `AC-SPLIT-15T-INSTALL`
  - `Electrical` + `Fan Installation` → `ELEC-FAN-INSTALL`
  - abbreviation map for common words (Installation→INSTALL, Uninstallation→UNINSTALL, Electrical→ELEC, Cleaning→CLEAN), suffix `-2`, `-3` on collision

### 1.6 Clean-slate + seed scripts
- [x] `backend/scripts/resetCatalogueData.js` (`npm run db:reset-catalogue`)
  - refuses when `NODE_ENV=production` unless `--force`
  - reuses `clearBookingsAndServiceRequests.js` logic (bookings, service requests, jobs, payments, payouts, earnings tallies)
  - deletes `Variant`, `CatalogService`, `ServiceOffering`, `OfferingRate`
  - keeps `Category` rows (their icons/banners/groups are CMS content), and keeps `ProductType` + legacy `ServiceCatalogItem` until Phase 4 (the old booking flow still reads them)
  - requires `--yes` and prints the target database first (the dev `.env` points at Atlas)
- [x] `backend/scripts/masterCatalogueSeedData.js`: the data below
- [x] `backend/scripts/seedMasterCatalogue.js` (`npm run seed:catalogue`): idempotent upsert by `code`; creates v1 rate only if the offering has none
- [x] `seed.js` calls the new seeder **after** the old `CATALOG_SEED` step (the old items stay until Phase 4, see log)

### 1.7 Tests
- [x] `backend/tests/catalogModels.test.js`
  - standalone offering with a productType → validation error
  - variant from another product type → validation error
  - duplicate (service, productType, variant) → duplicate key error
  - code change after create → error
- [x] `backend/tests/rateWriter.test.js`
  - v1 → change only customerPrice → v2 has same spPayout, `changes` has one entry
  - no-op change rejected; missing reason rejected
  - previous version's `effectiveUntil` closed

---

## Seed catalogue

✅ = rate given by the client. **DEMO** = placeholder, `needsRateReview: true`, shown
with a badge in the Phase 3 admin so the client knows what to fill in.

### Product-linked

| Code | Category → Product → Variant → Service | Unit | Qty | Price | Payout | |
|---|---|---|---|---|---|---|
| `AC-SPLIT-1T-INSTALL` | AC → Split AC → 1 Ton → Installation | per AC | 1–5 | 1,399 | 850 | DEMO |
| `AC-SPLIT-15T-INSTALL` | AC → Split AC → 1.5 Ton → Installation | per AC | 1–5 | **1,499** | **900** | ✅ |
| `AC-SPLIT-2T-INSTALL` | AC → Split AC → 2 Ton → Installation | per AC | 1–5 | 1,699 | 1,000 | DEMO |
| `AC-SPLIT-UNINSTALL` | AC → Split AC → *(any)* → Uninstallation | per AC | 1–5 | **999** | 550 | ✅ price / DEMO payout |
| `AC-SPLIT-REPAIR` | AC → Split AC → *(any)* → Repair (visit) | per visit | 1 | 399 | 250 | DEMO |
| `AC-SPLIT-DEEPCLEAN` | AC → Split AC → *(any)* → Deep Cleaning | per AC | 1–5 | 649 | 380 | DEMO |
| `AC-SPLIT-GAS` | AC → Split AC → *(any)* → Gas Refilling | per AC | 1–5 | 2,499 | 1,200 | DEMO |
| `AC-WINDOW-INSTALL` | AC → Window AC → Installation | per AC | 1–5 | **599** | **350** | ✅ |
| `AC-WINDOW-UNINSTALL` | AC → Window AC → Uninstallation | per AC | 1–5 | 399 | 220 | DEMO |
| `AC-WINDOW-REPAIR` | AC → Window AC → Repair (visit) | per visit | 1 | 349 | 220 | DEMO |
| `TV-LED-32-INSTALL` | TV → LED TV → 32 inch → Installation | per TV | 1–3 | **349** | **200** | ✅ |
| `TV-LED-40-43-INSTALL` | TV → LED TV → 40–43 inch → Installation | per TV | 1–3 | 499 | 300 | DEMO |
| `TV-LED-55-65-INSTALL` | TV → LED TV → 55–65 inch → Installation | per TV | 1–3 | **799** | **450** | ✅ |
| `TV-LED-75-INSTALL` | TV → LED TV → 75 inch+ → Installation | per TV | 1–3 | 1,299 | 700 | DEMO |
| `TV-LED-UNINSTALL` | TV → LED TV → *(any)* → Uninstallation | per TV | 1–3 | 299 | 150 | DEMO |
| `WM-FRONT-INSTALL` | Washing Machine → Front Load → Installation | per machine | 1 | 499 | 280 | DEMO |
| `GEYSER-15L-INSTALL` | Geyser → Storage → 15 L → Installation | per geyser | 1–3 | 599 | 350 | DEMO |
| `CCTV-WIFI-INSTALL` | CCTV (new) → Wi-Fi Camera → Installation | per camera | 1–10 | 399 | 220 | DEMO |

**Intentionally not seeded** (for client Test 12): Window AC → Gas Refilling,
Window AC → Deep Cleaning. The flow must not offer them.

### Standalone

| Code | Category → Service → Option | Unit | Qty | Price | Payout | |
|---|---|---|---|---|---|---|
| `ELEC-FAN-INSTALL` | Electrician → Fan Installation | per fan | 1–10 | **299** | **180** | ✅ |
| `ELEC-SWITCH-INSTALL` | Electrician → Switch Installation | per piece | 1–20 | 99 | 60 | DEMO |
| `ELEC-SOCKET-INSTALL` | Electrician → Socket Installation | per piece | 1–20 | 129 | 75 | DEMO |
| `ELEC-MCB-INSTALL` | Electrician → MCB Installation | per piece | 1–10 | 249 | 150 | DEMO |
| `ELEC-CONSULT` | Electrician → Electrician Consultation | per visit | 1 | 199 | 120 | DEMO |
| `ELEC-INSPECT` | Electrician → Electrical Inspection | per visit | 1 | 299 | 180 | DEMO |
| `ELEC-WIRING-REPAIR` | Electrician → Wiring Repair | per visit | 1 | 349 | 210 | DEMO |
| `CLEAN-TANK-500L` | Water Tank Sump Cleaning → Water Tank Cleaning → Up to 500 L | per tank | 1–5 | 499 | 300 | DEMO |
| `CLEAN-TANK-1000L` | Water Tank Sump Cleaning → Water Tank Cleaning → 501–1000 L | per tank | 1–5 | 699 | 420 | DEMO |
| `CLEAN-TANK-2000L` | Water Tank Sump Cleaning → Water Tank Cleaning → 1001–2000 L | per tank | 1–5 | 999 | 600 | DEMO |
| `CLEAN-TANK-2000L-PLUS` | Water Tank Sump Cleaning → Water Tank Cleaning → 2000 L+ | per tank | 1–5 | 1,499 | 900 | DEMO |
| `CLEAN-OVERHEAD-TANK` | Water Tank Sump Cleaning → Overhead Tank Cleaning | per tank | 1–5 | 799 | 480 | DEMO |
| `CLEAN-UNDERGROUND-TANK` | Water Tank Sump Cleaning → Underground Tank Cleaning | per tank | 1–3 | 1,299 | 780 | DEMO |
| `RO-PREFILTER` | RO Water Purifier → RO Pre-Filter Service / Replacement | per unit | 1–3 | 349 | 200 | DEMO |
| `RO-INSPECT` | RO Water Purifier → RO Inspection | per visit | 1 | 199 | 120 | DEMO |
| `RO-MAINTENANCE` | RO Water Purifier → RO Maintenance | per unit | 1–3 | 499 | 300 | DEMO |

Express (all seeded offerings where it makes sense): `express.enabled = true`, fee
₹99, partner incentive ₹50 (DEMO). Consultation/inspection: express disabled.

### Variant dimensions seeded

| Product / Service | Dimension | Values |
|---|---|---|
| Split AC | Capacity | 1 Ton, 1.5 Ton, 2 Ton |
| Window AC | none | — |
| LED TV | Screen Size | 32 inch, 40–43 inch, 55–65 inch, 75 inch+ |
| Front Load WM | none (capacity added later by admin, no code change) | — |
| Storage Geyser | Capacity | 10 L, 15 L, 25 L |
| Water Tank Cleaning (service) | Tank Capacity | Up to 500 L, 501–1000 L, 1001–2000 L, 2000 L+ |

---

## Worked example: what the database looks like

```js
// ServiceOffering
{ code: 'TV-LED-55-65-INSTALL', name: 'LED TV 55–65 inch Installation',
  bookingType: 'PRODUCT_LINKED', category: <TV>, productType: <LED TV>,
  variant: <55–65 inch>, service: <TV Installation>,
  pricingUnit: 'PER_UNIT', unitLabel: 'per TV', minQty: 1, maxQty: 3,
  express: { enabled: true }, tax: { gstPercent: null, sacCode: '998719' },
  estimatedDurationMins: 90, included: ['Wall-mount fitting', 'Demo'],
  excluded: ['Wall bracket (sold separately)'], isActive: true, needsRateReview: false }

// OfferingRate
{ offering: <above>, scope: { type: 'DEFAULT', value: null }, version: 1,
  customerPrice: 79900, spPayout: 45000, expressFee: 9900, expressSpIncentive: 5000,
  effectiveFrom: 2026-10-01, effectiveUntil: null, changes: [], reason: 'Initial rate (client brief)' }
```

Then `createRateVersion(id, { customerPrice: 89900 }, { reason: 'Festive', ... })` →

```js
{ version: 2, customerPrice: 89900, spPayout: 45000,   // ← payout carried forward
  changes: [{ field: 'customerPrice', from: 79900, to: 89900 }], reason: 'Festive' }
// and v1.effectiveUntil is now set
```

## Acceptance

- [x] `npm run db:reset-catalogue && npm run seed:catalogue` runs clean twice in a row (idempotent)
- [x] `ServiceOffering.countDocuments()` = 34, every offering has exactly one active DEFAULT rate
- [x] `npm test -- catalogModels rateWriter money` all green
- [x] Existing test suite still green (nothing removed yet)

## Out of scope

APIs, admin UI, customer flow, CITY/PINCODE rate rows (the field exists, nothing writes it).

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-24 | _uncommitted_ | Phase 1 built and verified; all tasks above done |

### What was built

| File | What it is |
|---|---|
| `backend/src/modules/catalog/money.js` | `toPaise`, `toRupees`, `percentOf` (half-up), `isPaise` |
| `backend/src/modules/catalog/dimension.schema.js` | Shared `{ key, label }` sub-schema for `ProductType.variantDimension` and `CatalogService.optionDimension` |
| `backend/src/modules/catalog/category.model.js` | + `keywords` |
| `backend/src/modules/catalog/productType.model.js` | + `variantDimension`, `isActive`, `sortOrder`; `priceAddon` marked deprecated (removed in Phase 4) |
| `backend/src/modules/catalog/variant.model.js` | New. Exactly-one-parent validator, partial unique indexes per parent |
| `backend/src/modules/catalog/catalogService.model.js` | New (`CatalogService`), no price |
| `backend/src/modules/catalog/serviceOffering.model.js` | New. All ARCHITECTURE §2.5 fields, consistency validation, immutable code (also blocked on `updateOne`/`findOneAndUpdate`), auto `searchText`, text index |
| `backend/src/modules/catalog/offeringRate.model.js` | New. Append-only versions in paise with `scope` (DEFAULT/CITY/PINCODE), `changes[]`, `reason`, `changedBy` |
| `backend/src/modules/catalog/rateWriter.js` | `createRateVersion()` + `findLatestRate()`: the only way a rate is written |
| `backend/src/modules/catalog/offeringCode.js` | `buildOfferingCode()` (pure) + `suggestOfferingCode()` (adds `-2`, `-3` on collision) |
| `backend/scripts/masterCatalogueSeedData.js` | 8 categories, 34 offerings, 14 variants/options, 24 services |
| `backend/scripts/seedMasterCatalogue.js` | Idempotent seeder, exported as `seedMasterCatalogue()` for `seed.js` and tests. `npm run seed:catalogue` |
| `backend/scripts/resetCatalogueData.js` | Clean-slate wipe. `npm run db:reset-catalogue -- --yes` |
| `backend/scripts/seed.js` | Calls the new seeder after the legacy catalogue step |
| `backend/tests/helpers/catalogue.js` | `seedTestCatalogue()`: the full catalogue in one call, for Phase 2+ tests |
| `backend/tests/money.test.js`, `catalogModels.test.js`, `rateWriter.test.js` | 29 tests |

### Try it yourself

```bash
cd backend
# against a local scratch DB, never the Atlas dev DB by accident:
export MONGODB_URI=mongodb://127.0.0.1:27017/nigam_scratch
npm run seed                                   # legacy data + master catalogue
npm run seed:catalogue                         # re-run → "0 new v1 rates" (idempotent)
mongosh nigam_scratch --eval 'db.serviceofferings.find({code:"TV-LED-55-65-INSTALL"}).pretty()'
mongosh nigam_scratch --eval 'db.offeringrates.find({}, {customerPrice:1, spPayout:1, version:1, reason:1}).limit(5)'
```

Test 8 at data level (from `rateWriter.test.js`): v1 `79900 / 45000` → `createRateVersion(id, { customerPrice: 89900 }, { reason: 'Festive pricing' })` → v2 `89900 / 45000`, `changes = [{ field: 'customerPrice', from: 79900, to: 89900 }]`, v1 `effectiveUntil` closed.

### Deviations from plan

1. **Category keys.** The plan said "Electrical", "Cleaning" and "RO". The seed uses the **existing** keys `Electrician`, `Water Tank Sump Cleaning` and `RO Water Purifier`, because the customer app and partner matching (`ServiceProvider.specs`) already route by them. Offering codes keep the client's style (`ELEC-*`, `CLEAN-*`, `RO-*`). `CCTV` is a new category (`groups: ['handyman']`, section "Installation").
2. **Legacy data kept longer.** `seed.js` still seeds the old `ServiceCatalogItem` rows, and `db:reset-catalogue` does not delete `ProductType` / `ServiceCatalogItem`. The old booking flow reads them until the Phase 4 cut-over, so removing them now would break the running app. Phase 4 removes both.
3. **Reset safety.** Besides the planned `NODE_ENV=production` guard, the reset needs `--yes` and prints the target DB, because `backend/.env` points the dev DB at Atlas.
4. **"Activate only with an active rate"** is not a model rule (the offering is saved before its first rate). It moves to the Phase 3 admin service, where activation happens.
5. **`isActive` on the seeded offerings** is `true`. DEMO offerings are bookable in dev so the client tests can be exercised; the `needsRateReview` flag is what marks them.

### Known gaps carried forward

- **Duplicate legacy categories.** There is a `TV Installation` category alongside `TV`, and `Electrician` still has legacy services such as "Fan Installation & Repair". They stay until the Phase 6 entry-point work; decide there whether to merge or retire them.
- The standalone MongoDB used locally has no transactions, so `createRateVersion` runs without one there (this is the existing `runInTransaction` behaviour). Atlas (replica set) gets real atomicity.

### Test output

```
money / catalogModels / rateWriter:  3 suites, 29 tests passed
full backend suite:                  Test Suites: 37 passed, 37 total
                                     Tests:       581 passed, 581 total
eslint (new files):                  clean
scripts on local scratch DB:         reset without --yes → refused; seed → 34 offerings / 34 rates;
                                     re-seed → 0 new rates; reset --yes → 34/34/14/24 deleted;
                                     reseed → 34 offerings, 34 rates, 29 flagged DEMO
```
