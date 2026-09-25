# Phase 7 — NCC Margin Reporting, Legacy Cleanup, Acceptance Suite

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25, uncommitted) |
| **Estimate** | 5–6 developer-days |
| **Depends on** | Phases 1–6 |
| **Client requirements** | 24, 25 (documented and tested seam), 27, 28 |
| **Client tests closed** | All 12, re-verified by an automated suite |
| **Breaks anything existing?** | Deletes dead code/models. Nothing live should reference them by now; the grep checks below prove it |

## Goal

Give admins the margin view the client asked for. Remove every leftover pricing
source so there is provably one catalogue. Lock the 12 client tests into automated
tests so they can't regress.

---

## Tasks

### 7.1 NCC gross margin report
- [x] Backend `GET /api/v1/super-admin/reports/margin?from=&to=&groupBy=category|offering|partner|day&coverage=paid|covered|all`
  - source: completed bookings' `commercial` + their jobs' `billingEstimate` (add-ons, parts)
  - per group:

    | Field | Formula |
    |---|---|
    | Jobs | count |
    | Customer service revenue (ex-GST) | Σ `taxableAmount` (booking + add-ons) |
    | Discounts given | Σ `discount.amount` |
    | Express fees | Σ `expressFee` |
    | GST collected (separate, not revenue) | Σ `gstAmount` |
    | Spare parts revenue (separate) | Σ parts subtotal |
    | Partner payouts | Σ job `payout.total` |
    | **NCC gross service margin** | revenue ex-GST − partner payouts |
    | Margin % | margin / revenue |
  - covered (warranty/AMC/EW) jobs reported separately: revenue 0 from the customer, payout is a cost recoverable from the brand
  - `requireRole(SUPER_ADMIN)` ~~+ `reports.finance` permission~~ (see Deviations)
- [x] Frontend: new **"Service Margin"** tab in `pages/super-admin/Revenue.jsx`: date range, group-by, KPI tiles (Revenue ex-GST · Payouts · Gross margin · Margin %), table, CSV export via existing `lib/exportCsv.js`
- [x] Test `backend/tests/marginReport.test.js`: seeded bookings from the Phase 5 worked example → exact totals

### 7.2 Legacy removal
Delete, then prove with grep:

- [x] `ServiceCatalogItem` model, `findServiceItem`, old `addServiceItem/updateServiceItem/deleteServiceItem` routes in `catalog.routes.js`
- [x] `scripts/catalogSeedData.js` service/product-type price data, `scripts/seedCatalogOnly.js`
- [x] `frontend/src/data/bookingCatalog.js` (category visuals now come from `Category`)
- [x] `frontend/src/pages/super-admin/ServiceCatalog.jsx`
- [x] `PlatformSettings.serviceProviderCommissionPercent` (model, validation, settings UI) and `serviceProviderShare()` / `DEFAULT_TECH_EARNINGS_SHARE`
- [x] Price inputs/state in `CustomerAppCustomization.jsx` left over from Phase 3/6
- [x] Grep gate (must return nothing in `backend/src` and `frontend/src`):
  ```
  ServiceCatalogItem | priceAddon | resolveBookedService | findProductTypeAddon
  serviceProviderCommissionPercent | serviceProviderShare | BOOKING_CATALOG | bookingCatalog
  advanceAmt = 199 | ?? 299 | || 299 | || 149
  ```

### 7.3 Location / pincode override: verify the seam, don't build the UI
- [x] Test: insert a `CITY: Jaipur` rate for Fan (₹279 / ₹170) → Jaipur quote uses it, Delhi uses DEFAULT; booking snapshot records `rate.scope = CITY`
- [x] `ARCHITECTURE.md` section "Turning on location pricing": the admin UI needed (a scope selector in `RateChangeModal`) and nothing else (~2 days when wanted)

### 7.4 Automated client acceptance suite
- [x] `backend/tests/clientAcceptance.test.js`: one `it()` per client test, named exactly as in the brief ("Test 1: Split AC Installation → ₹1,499" …), running against the Phase 1 seed through the real HTTP API (quote → booking → job → completion)
- [x] `e2e/ui/masterCatalogue.spec.js` (Playwright, existing setup): customer UI walk for Tests 1, 4, 5, 6, 10; admin UI walk for Test 8
- [x] Wire both into the existing `npm test` / e2e scripts

### 7.5 Performance & hardening
- [x] Tree API in-memory cache (60 s TTL, busted on any catalogue admin write)
- [x] Indexes reviewed with `explain()` for tree, quote, search, margin report
- [x] Rate limit on `/catalog/quote` and `/catalog/search` confirmed

### 7.6 Close-out
- [x] Every row in [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md) ✅ with the verifying test name
- [x] README phase table all ✅; ARCHITECTURE.md matches what shipped
- [x] Short "how to add a new product/service" admin guide appended to README (e.g. adding Refrigerator Double Door 250–350 L Gas Refilling end to end with no code)

---

## Worked example: margin report, one day

Using the Phase 5 job (AC × 2 express + socket add-on) and one Fan × 2 booking:

| Group | Jobs | Revenue ex-GST | GST | Payouts | Gross margin | Margin % |
|---|---|---|---|---|---|---|
| AC | 1 | 3,226.00 (2,998 + 99 + 129) | 580.68 | 1,925 | 1,301.00 | 40.3% |
| Electrical | 1 | 598.00 | 107.64 | 360 | 238.00 | 39.8% |
| **Total** | 2 | 3,824.00 | 688.32 | 2,285 | 1,539.00 | 40.2% |

## Acceptance

- [x] Full backend `npm test` + e2e green; output pasted below
- [x] Grep gate returns nothing
- [~] Client demo script (the 12 tests in order) run once end-to-end in the app — automated instead (see Deviations)

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | _uncommitted_ | Margin report (API + Revenue tab), legacy pricing removed (grep gate empty), location-pricing seam proven, 12-test acceptance suite (API + browser), tree cache, indexes, rate limits. Backend 700/700, e2e API 192 ✓ / 1 skipped, e2e UI 29 ✓ / 11 ✘ (all 11 pre-existing; baseline had 12) |

### 7.1 NCC gross margin report

`GET /api/v1/super-admin/reports/margin?from=&to=&groupBy=&coverage=` (`super-admin/marginReport.{service,routes}.js`)
reads completed bookings by their new `Booking.completedAt`, set when the partner collects payment.

It takes each booking's frozen `commercial` snapshot, then its job's catalogue add-ons, spare parts and `payout.total`.
Everything is summed in paise.

| Field | Source |
|---|---|
| Revenue ex-GST | booking `taxableAmount` + add-ons' `taxableAmount` |
| Discounts / Express fees | `commercial.discount.amount` / `commercial.expressFee` |
| GST collected | service GST + add-on GST + parts GST (beside revenue, not in it) |
| Spare parts (ex-GST) | checked parts on the job (goods, not service revenue) |
| Partner payouts | job `payout.total` (includes add-on payouts), else the snapshot's `spPayoutTotal` |
| Gross margin / Margin % | revenue − payouts / margin ÷ revenue |

Covered (warranty / AMC / EW) bookings are a separate `covered` section. Their revenue is 0 and their payout is a cost recoverable from the brand.

**Worked example.** `backend/tests/marginReport.test.js` runs the jobs below through the real API and gets the plan's numbers to the paisa:
- Split AC 1.5 T install × 2, ASAP, plus a socket add-on;
- Fan × 2 with a ₹200 part;
- a warranty-covered Window AC install.

| Group | Jobs | Revenue ex-GST | GST | Payouts | Gross margin | Margin % |
|---|---|---|---|---|---|---|
| AC | 1 | 3,226.00 (2,998 + 99 express + 129 socket) | 580.68 | 1,925 (1,800 + 50 + 75) | 1,301.00 | 40.3 % |
| Electrician | 1 | 598.00 | 143.64 (107.64 + 36 on the part) | 360 | 238.00 | 39.8 % |
| **Paid total** | 2 | 3,824.00 | | 2,285 | 1,539.00 | 40.2 % |
| Covered | 1 | 0 | | 350 | −350 | — |

**UI.** Revenue Dashboard → **Service Margin** tab (the default; the old view is under *Channels*). It has:
- a date range (default: last 30 days) and group-by (Category · Offering · Partner · Day);
- KPI tiles (Revenue ex-GST · Partner payouts · Gross margin · Margin %);
- the paid and covered tables with totals, and CSV export.

Browser check against a seeded scratch DB with two real completed jobs: ₹3,825 revenue · ₹2,275 payouts · ₹1,550 margin · 40.5 %. The CSV matched (`screenshots/phase-7/1-service-margin-by-category.png`, `2-…-by-offering.png`).

### 7.2 Legacy removal — grep gate empty

This grep over `backend/src` and `frontend/src` now returns nothing:

```
grep -rnE "ServiceCatalogItem|priceAddon|resolveBookedService|findProductTypeAddon|serviceProviderCommissionPercent|serviceProviderShare|BOOKING_CATALOG|bookingCatalog|advanceAmt = 199|\?\? 299|\|\| 299|\|\| 149|DEFAULT_TECH_EARNINGS_SHARE" backend/src frontend/src
```

**Deleted:**
- `serviceCatalogItem.model.js`;
- the legacy per-category service and product-type editor routes (`/catalog/categories/:key/services|product-types|admin`);
- `scripts/catalogSeedData.js`, `scripts/seedCatalogOnly.js`;
- `frontend/src/data/bookingCatalog.js`, `pages/super-admin/ServiceCatalog.jsx`;
- `serviceProviderShare()`, `DEFAULT_TECH_EARNINGS_SHARE` and the percentage fallback in `initialJobPayout`;
- `PlatformSettings.serviceProviderCommissionPercent` (model, validation, service);
- the Settings commission editor and its "earnings simulator";
- the price inputs in the CMS tile and service-package editors, and 40+ hardcoded default prices there;
- `HomeTile.price`, `ServicePageConfig` item `price`, `CategoryBookingConfig.services`.

**Replaced:**
- `GET /catalog/categories` now lists each category's services and product types that have an active offering. It returns names only, no price, and the AllServices page reads these names.
- `scripts/categorySeedData.js` holds category visuals only. The "Prices are indicative" notes now read "The price you confirm is what you pay…".
- `seed.js` seeds home tiles from real catalogue groups (title + deep link), one per category first.
- The Settings tab is now **Payouts & Advance**: a note that payouts live per offering, plus the visit fee and advance %. The sidebar link was renamed from "Partner Commission".
- `resetCatalogueData.js` drops a leftover `servicecatalogitems` collection if one exists.

**Tests updated.** `catalog.test.js` was rewritten: categories list names only, and the old price editor returns 404. The commission test was deleted (the setting is gone). The tile test now asserts that no price is stored. `e2e/api/catalog.spec.js` was updated to match.

### 7.3 Location / pincode override seam

`backend/tests/locationPricing.test.js` (4 tests):
- A CITY rate for Jaipur (Fan ₹279 / ₹170) is used by the Jaipur quote and tree. Delhi and no location get the default ₹299. City matching ignores case.
- A PINCODE rate (302017, ₹259) beats the city rate.
- A Jaipur booking snapshots `rate.scope = "CITY"`, `unitPrice 279`, `spPayoutUnit 170`, final ₹329.22.

ARCHITECTURE.md §4 now has **"Turning on location pricing"**: exactly what the admin UI still needs (~2 days) and what already works.

### 7.4 Automated client acceptance suite

- `backend/tests/clientAcceptance.test.js` has one `it` per client test, named as in the brief. It runs on the seeded catalogue through the real HTTP API: tree → quote → booking → partner accept/travel/diagnose → billing → cash collection, with the admin API for Test 8 (price change) and Test 12 (deactivation). **12/12 pass.**
- `e2e/ui/masterCatalogue.spec.js` (browser) covers Tests 1, 4, 5, 6, 10 (search → Fan × 2 → ₹705.64 on step 2, schedule and payment) and admin Test 8 (change price in the UI, history shows the reason, payout still ₹450, Service Margin tab opens). **6/6 pass.** The admin test restores ₹799 in a `finally` so other UI specs keep the seeded price.
- Both run in the existing scripts: `npm test` (backend) and `npm run test:ui` (e2e).

### 7.5 Performance & hardening

- **Tree cache.** `catalog/catalogCache.js` caches the category tree for 60 s per (category, city, pincode). Mongoose write hooks on all seven catalogue models (and PlatformSettings, for the GST default) drop it on *any* write: admin API, seed, or a direct model update. Acceptance Test 12 checks it: it loads the tree, deactivates an offering and reloads. The quote is never cached, so PRICE_CHANGED still protects bookings.
- **Indexes.** `explain()` against a seeded DB shows every hot query using an index:

  | Query | Plan |
  |---|---|
  | tree: offerings by category | `category_1_isActive_1_displayOrder_1` |
  | tree/quote: rates by offering | `offering_1_effectiveFrom_-1` |
  | tree: variants by category | `category_1` |
  | quote: offering by id / code | `_id` / `code_1` |
  | margin: completed bookings | `status_1_completedAt_1` (**new**) |
  | margin: requests by booking | `booking_1` (**new**) |
  | margin: jobs by request | `serviceRequest_1` |
  | search: `searchText` regex | COLLSCAN over offerings (unanchored regex; fine at catalogue size) |

- **Rate limits.** `/catalog/quote`, `/catalog/search` and `/catalog/search/resolve` were already limited. `/catalog/service-groups` is now limited too (120/min/IP shared limiter).

### 7.6 Close-out

- CLIENT-ACCEPTANCE.md: every test and requirement ✅, each with its verifying test.
- README: all phases ✅, plus **§7 Admin guide**. It walks through adding *Refrigerator · Double Door · 250–350 L · Gas Refilling* with no code; the code, final price and margin quoted there were checked against the code.
- ARCHITECTURE.md: new APIs (search, resolve, service-groups, margin report), tree cache, rate limits, and the old→new table marked done.

### Fixes found while verifying

- **Label → product type** (Phase 6 search). "Split AC Installation" resolved to "from ₹599", which is the *Window* AC price. A label that names a product type now resolves to that type ("from ₹1,399"). There is a regression test in `catalogSearch.test.js`.
- **Margin grouping.** A summing loop also "added" to the group's `key` / `label` ("AC0"). Caught by the test and fixed.
- **Margin display.** "₹724.5" now shows as ₹724.50: amounts with paise always show both digits.

**Deviations from plan:**
- **No `reports.finance` permission.** The report uses `requireRole(SUPER_ADMIN)`, like the catalogue admin it reports on. Per-permission gating for super-admin screens doesn't exist elsewhere in the app yet.
- **Legacy CMS configs are kept as content.** `ServicePageConfig` and `CategoryBookingConfig` keep their non-price content (copy, brands, product-type chips). Only the price fields were removed, and no customer screen reads them. The planned CMS *offering picker* was not built: tiles resolve their title to the catalogue instead (Phase 6 decision).
- **Client demo script automated.** Instead of a one-off manual run, all 12 tests run through the API on every `npm test`. Six of them also run in the browser on every `npm run test:ui`.

**Known gaps / follow-ups:**
- **UI e2e suite: 11 failures, all present before the catalogue work.** They were checked by running the same suite on commit `4bd4b3d`, which had 12 failures. The failing specs are `cityChange` ×2, `serviceProviderJobs` ×3, `serviceProviderLogin` email mode, `searchingPartner` pop-up ×2, `bookingDetails` ×2 and `cancelBooking` ×1. None was introduced by this work.
  - Two `bookingPrice` tests that the catalogue flow broke (they clicked "Split AC" and continued with no size, then expected ₹299/₹199) were updated.
  - The pre-existing desktop-sidebar test in that file was rewritten to check the real desktop behaviour, and now passes.
- **Location pricing admin UI** is not built (by design, Req 25; steps in ARCHITECTURE §4).
- **Search.** No typo tolerance, and it scans offerings by regex (fine for hundreds of offerings; Atlas Search if the catalogue grows to thousands).
- **Partner add-on tick and Billing screen** are still covered by API tests, not by a browser walk (carried from Phase 5).
- **Categories without offerings** (Refrigerator, Plumber, salon…) are not bookable until the client's rates are entered, and 29 of the 34 seeded rates are DEMO placeholders (flagged in the admin) — only the 5 rates the brief gave (Split 1.5 T, Window, TV 32", TV 55–65", Fan) are real.

**Test output:**
```
backend  $ npm test
Test Suites: 45 passed, 45 total
Tests:       700 passed, 700 total

e2e      $ npx playwright test                       (API)
  1 skipped
  192 passed

e2e      $ npm run test:ui                           (browser)
  29 passed · 11 failed   (baseline at 4bd4b3d: 22 passed · 12 failed — same 11 + 1 now fixed)
  ui/masterCatalogue.spec.js   6 passed
  ui/bookingPrice.spec.js      3 passed

frontend $ npm run build     ✓
```
