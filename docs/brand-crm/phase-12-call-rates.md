# Phase 12: Call rates v2 (Brand → Service → State → City) + charge capture

**Status:** ✅ Complete (2026-10-10) · **Layer:** Full stack · **Delivers:** client §15 · **Depends on:** Phases 1, 2, 8

## Goal
Rates are configured per **Brand → Service (category + service type) → State
→ City** (e.g. LG → AC Repair → Maharashtra → Pune → ₹450). When a job
completes, the applicable rate is selected automatically and captured on a
**BillingLine** that feeds billing (Phase 13). The partner payout is kept
separate (D13).

## Context: read first
- ARCHITECTURE §12; README D12, D13, D14, Q2, Q5.
- `brand-admin/rateCard.model.js` (`{brand, category:String, serviceType, laborRate, partsMarkupPercent}`, unique brand+category+serviceType), `rateCard.service.js` / `.routes.js`.
- `shared/serviceProviderEarnings.js` `coveredVisitEarnings` (reads `RateCard.laborRate` as the **partner** earning for warranty jobs); `shared/servicePartnerPayout.js`; `partner-warranty/b2b2cPayout.service.js`.
- `frontend/src/pages/brand-admin/CallRatesCharges.jsx`.
- `super-admin/city.model.js` (City master: state/city names to validate against).
- Ticket `address.state` / `address.city`, `categoryKey`, `serviceType`.

## Tasks

### Backend
- [x] `brand-crm/brandRate.model.js` (§12) with:
  - validation: state/city names must exist in the City master when given (case-insensitive, stored canonical); city requires state
  - unique `{brand, category, serviceType, state, city, effectiveFrom}`
  - no overlapping effective ranges for the same key (validate on save)
- [x] `brand-crm/rateResolver.js` `resolveRate({ brand, categoryId, serviceType, state, city, at })` → `{ rate, matchedOn, row }`, most specific active row at the time `at`. Pure query + unit tests. Missing → `{ matchedOn:'missing', amount:0 }`.
- [x] Brand routes `/api/v1/brand/rates`:
  - `GET` (`rates:view`): filters category, serviceType, state, city, active
  - `POST` / `PATCH /:id` / `POST /:id/deactivate` (`rates:edit`): an edit of an active row with past usage creates a new row with `effectiveFrom = now` and closes the old one; no in-place change of history
  - `POST /import` CSV (dry-run + commit)
  - `GET /resolve?categoryId&serviceType&state&city` (preview)
  - `GET /export`

  Every change is audited (`rate.created|updated|deactivated`, with a diff). **The brand payload never includes `partnerPayout`.**
- [x] Super Admin routes `/api/v1/super-admin/brand-rates`: same CRUD across brands, plus `partnerPayout` and `visitOnlyRate`.
- [x] Retire `RateCard`:
  - remove `rateCard.*` and the `/brand/rate-cards` mount (clean slate)
  - `coveredVisitEarnings` → `resolveRate(...).row.partnerPayout` (fall back to 0 + flag `PAYOUT_MISSING` for Super Admin)
  - update `partnerWarrantyPayout.test.js` / `partnerPayout.test.js` fixtures
- [x] `brand-crm/billingLine.model.js` (§12).
- [x] **Charge capture** in `brand-crm/charges.service.js`:
  - On jobStage → COMPLETED for a ticket with `coverageDecision` set, create a `BillingLine`:
    - `status:'pending_closure'`
    - rate resolved at `completedAt` using the ticket address state/city
    - `gstPercent` = `Brand.billing.gstPercent ?? PlatformSettings.defaultGstPercent`
    - parts = brand-payable, brand-approved, Installed part orders (Phase 10) at their price
    - `subtotal`, `gstAmount`, `total` rounded to paise using `utils/money` if present
  - Idempotent: one line per ticket.
  - Timeline event `CHARGE_CAPTURED` (brand-visible: amount, matched rule).
- [x] On Closed → `billable`. On reopen / cancel → `void` with a reason (a new line is created on the next completion).
- [x] Customer NA visit (Q5): when the SR ends as `Customer NA` on a warranty ticket and the brand has `visitOnlyRate` → a line with `serviceType:'visit_only'`.
- [x] `RATE_MISSING`: the line is still created at ₹0 with `rate.matchedOn:'missing'`; Finance users (`billing:view`) and Super Admin are notified; the line is shown flagged.
- [x] NCC Finance adjustment: `POST /super-admin/billing-lines/:id/charges { label, amount, reason }` adds `otherCharges` (audited) while the line is not invoiced.
- [x] Ticket detail `billing` section (Phase 7 contract): rate (amount + "matched on city: Pune"), parts, other charges, GST, total, line status, invoice no (Phase 13).

### Brand Panel
- [x] `CallRatesCharges.jsx` rewritten:
  - grid by category × service type with expandable state/city overrides
  - "Add override" (state → city pickers from the City master)
  - effective dates, history drawer per key
  - CSV import/export
  - a "What rate applies?" tester
  - read-only for users without `rates:edit`
- [x] Ticket detail **Billing** section (charge part).

### Super Admin
- [x] Brand Rates page (new `pages/super-admin/BrandRates.jsx` or a tab in the brand detail): brand rate + partner payout side by side; margin column.

### Tests
- [x] `backend/tests/brandCrmRates.test.js`:
  - resolution city > state > national
  - effective dating (a rate change mid-month does not alter an already captured line)
  - overlap rejected
  - unknown city rejected
  - CCE 403 on edit
  - brand payload has no `partnerPayout`
  - import dry-run
  - partner earnings now read `partnerPayout`
- [x] `backend/tests/brandCrmCharges.test.js`:
  - completion creates exactly one line with the correct rate, parts and GST
  - Closed → billable
  - reopen → void
  - missing rate → ₹0 flagged + notification
  - Customer NA visit line
  - other charges blocked after invoicing (Phase 13 makes it invoiced; stub here)
- [x] `e2e/ui/brandCrmRates.spec.js`: add a Pune override → complete a Pune ticket → the ticket billing section shows the Pune rate.

## Acceptance
- Rates are configurable at all four levels.
- Completing a job auto-selects and snapshots the right rate.
- The brand never sees the partner payout.

## Implementation Log
Implemented dated `BrandRate` configuration and frozen `BillingLine` capture across
Brand Panel, NCC and the existing warranty job lifecycle.

- Canonical City-master geography; half-open effective intervals; city → state →
  national resolution; overlap validation and transactional per-brand write locks.
  Used rates are versioned; expired/deactivated history cannot be edited. Future
  cancellation leaves an empty interval, allowing replacement schedules.
- Brand and NCC CRUD, filter/options, lookup, CSV export and preview/atomic import.
  Brand request schemas reject partner payouts. Response/CSV allow-lists and
  separate internal audit rows prevent disclosure of NCC payout amounts.
- Retired the old RateCard model/services/routes and page. Warranty complaints
  use separate configured partner payouts, frozen at acceptance. Missing payouts
  are zero with `PAYOUT_MISSING` surfaced on NCC claim job details. Catalogue
  booking snapshots and the existing AMC/EW fallback remain intact.
- Completion captures the service rate, installed brand-payable parts (including
  orders below the brand approval threshold marked Not Required), GST and totals
  with integer-paise arithmetic. Partner completion writes the job step, SR,
  claim and billing line in one transaction. A simulated capture failure verifies
  rollback and successful retry. Direct SR completion/Customer NA uses the same
  transaction boundary.
- Current-line uniqueness with void history; Closed → billable; reopen/cancel →
  void; a completed repair supersedes a visit-only charge. Missing service rates
  capture zero and create in-app notifications for billing users and Super Admin.
  NCC adjustments require a reason and cannot modify invoiced/void lines.
- Brand rate grid, geographic pickers, effective dates, service/key history,
  rate tester and CSV tools respect `rates:edit`. NCC shows payout and margin.
  Ticket Billing shows captured rate/rule, parts, adjustments, GST, totals and
  status. Invoice generation and payment allocation remain Phase 13.

Validation:
- **76 backend suites / 1,078 tests passed**, consolidated from the full regression
  and final focused reruns; includes 15 new rate/charge contracts.
- **19 distinct browser scenarios passed**: all 18 existing Brand CRM/warranty
  flows plus Pune override → job completion → frozen billing, read-only manager,
  CSV export and NCC payout columns.
- **5 brand HTTP API scenarios passed**. Updated the legacy queue fixture assertion
  to the current linked-ticket-only contract while preserving positive own-record
  and cross-brand denial checks.
- Frontend production build passed; frontend lint: **0 errors**, 153 existing
  warnings. Relevant backend files linted successfully. Billing/NCC screenshots
  saved in `docs/brand-crm/screenshots/phase-12-*.png`.

Deployment: configure BrandRate rows explicitly before using the new money flow;
legacy RateCard values are not copied because they mixed brand charge and partner
payout. No application database was migrated or cleared. MongoDB transactions
require a replica set, consistent with the existing transaction helper.

