# Phase 7 — NCC Margin Reporting, Legacy Cleanup, Acceptance Suite

| | |
|---|---|
| **Status** | ⬜ Not started |
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
- [ ] Backend `GET /api/v1/super-admin/reports/margin?from=&to=&groupBy=category|offering|partner|day&coverage=paid|covered|all`
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
  - `requireRole(SUPER_ADMIN)` + `reports.finance` permission
- [ ] Frontend: new **"Service Margin"** tab in `pages/super-admin/Revenue.jsx`: date range, group-by, KPI tiles (Revenue ex-GST · Payouts · Gross margin · Margin %), table, CSV export via existing `lib/exportCsv.js`
- [ ] Test `backend/tests/marginReport.test.js`: seeded bookings from the Phase 5 worked example → exact totals

### 7.2 Legacy removal
Delete, then prove with grep:

- [ ] `ServiceCatalogItem` model, `findServiceItem`, old `addServiceItem/updateServiceItem/deleteServiceItem` routes in `catalog.routes.js`
- [ ] `scripts/catalogSeedData.js` service/product-type price data, `scripts/seedCatalogOnly.js`
- [ ] `frontend/src/data/bookingCatalog.js` (category visuals now come from `Category`)
- [ ] `frontend/src/pages/super-admin/ServiceCatalog.jsx`
- [ ] `PlatformSettings.serviceProviderCommissionPercent` (model, validation, settings UI) and `serviceProviderShare()` / `DEFAULT_TECH_EARNINGS_SHARE`
- [ ] Price inputs/state in `CustomerAppCustomization.jsx` left over from Phase 3/6
- [ ] Grep gate (must return nothing in `backend/src` and `frontend/src`):
  ```
  ServiceCatalogItem | priceAddon | resolveBookedService | findProductTypeAddon
  serviceProviderCommissionPercent | serviceProviderShare | BOOKING_CATALOG | bookingCatalog
  advanceAmt = 199 | ?? 299 | || 299 | || 149
  ```

### 7.3 Location / pincode override: verify the seam, don't build the UI
- [ ] Test: insert a `CITY: Jaipur` rate for Fan (₹279 / ₹170) → Jaipur quote uses it, Delhi uses DEFAULT; booking snapshot records `rate.scope = CITY`
- [ ] `ARCHITECTURE.md` section "Turning on location pricing": the admin UI needed (a scope selector in `RateChangeModal`) and nothing else (~2 days when wanted)

### 7.4 Automated client acceptance suite
- [ ] `backend/tests/clientAcceptance.test.js`: one `it()` per client test, named exactly as in the brief ("Test 1: Split AC Installation → ₹1,499" …), running against the Phase 1 seed through the real HTTP API (quote → booking → job → completion)
- [ ] `e2e/ui/masterCatalogue.spec.js` (Playwright, existing setup): customer UI walk for Tests 1, 4, 5, 6, 10; admin UI walk for Test 8
- [ ] Wire both into the existing `npm test` / e2e scripts

### 7.5 Performance & hardening
- [ ] Tree API in-memory cache (60 s TTL, busted on any catalogue admin write)
- [ ] Indexes reviewed with `explain()` for tree, quote, search, margin report
- [ ] Rate limit on `/catalog/quote` and `/catalog/search` confirmed

### 7.6 Close-out
- [ ] Every row in [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md) ✅ with the verifying test name
- [ ] README phase table all ✅; ARCHITECTURE.md matches what shipped
- [ ] Short "how to add a new product/service" admin guide appended to README (e.g. adding Refrigerator Double Door 250–350 L Gas Refilling end to end with no code)

---

## Worked example: margin report, one day

Using the Phase 5 job (AC × 2 express + socket add-on) and one Fan × 2 booking:

| Group | Jobs | Revenue ex-GST | GST | Payouts | Gross margin | Margin % |
|---|---|---|---|---|---|---|
| AC | 1 | 3,226.00 (2,998 + 99 + 129) | 580.68 | 1,925 | 1,301.00 | 40.3% |
| Electrical | 1 | 598.00 | 107.64 | 360 | 238.00 | 39.8% |
| **Total** | 2 | 3,824.00 | 688.32 | 2,285 | 1,539.00 | 40.2% |

## Acceptance

- [ ] Full backend `npm test` + e2e green; output pasted below
- [ ] Grep gate returns nothing
- [ ] Client demo script (the 12 tests in order) run once end-to-end in the app

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| | | |

**Deviations from plan:**

**Known gaps / follow-ups:**

**Test output:**
```
```
