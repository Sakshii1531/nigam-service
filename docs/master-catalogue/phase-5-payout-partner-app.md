# Phase 5 — Fixed Payout Engine + Service Partner App

| | |
|---|---|
| **Status** | ✅ Done (2026-09-24) |
| **Estimate** | 5–6 developer-days |
| **Depends on** | Phase 4 (bookings carry `commercial.spPayoutTotal`) |
| **Client requirements** | 7, 8, 9, 10, 13 (incentive), 23 |
| **Client tests closed** | 8 (partner side), 9 (payout side) |
| **Breaks anything existing?** | The global % commission stops applying to catalogue bookings. Brand-originated service requests with no booking keep the RateCard rule |

## Goal

The partner earns exactly the fixed payout frozen on the booking, times quantity,
plus the express incentive if configured. Changing a customer price never changes
what a partner earns. On-site extra work is picked from the catalogue so it also
carries a configured payout. The partner app clearly shows what the job is and
what they will earn.

---

## Tasks: backend (`backend/src/modules/service-provider/`)

### 5.1 Job payout snapshot
- [x] `job.model.js`: add `payout { base, expressIncentive, addOns, total }` (rupees, 2 dp); keep `estEarnings` = `payout.total` for existing readers
- [x] `job.service.js` job creation (~line 617, where `estEarnings` is set today):
  - booking with `commercial` → `payout.base = commercial.spPayoutUnit × qty`, `expressIncentive = commercial.expressSpIncentive`, applied **for paid and covered jobs alike** (A5)
  - service request with **no** booking (brand-raised complaint) → unchanged: `coveredVisitEarnings()` from the brand RateCard
- [x] Incoming-request list (~line 221, "est. earnings" shown before accept) → same rule, from the booking snapshot
- [x] `shared/serviceProviderEarnings.js`: `serviceProviderShare()` no longer called for booking-backed jobs. The function stays until Phase 7 removal

### 5.2 On-site add-ons from the catalogue (A6)
- [x] `GET /service-provider/jobs/:id/addon-offerings?category=`: bookable offerings in the job's category (or `category`), customer price + the partner's payout. Only offerings needing no further choice (see log). "Related categories" are not auto-included
- [x] `POST /service-provider/jobs/:id/addons { offeringId, quantity }` (no `variantId`: only size-free add-ons are offered, see log) → priced with the Phase 2 engine (GST included); stored on `job.additionalServices[]` as `{ offeringId, code, name, qty, finalAmount, spPayout, checked }`
- [x] Free-text additional services are no longer accepted. Spare parts are unchanged (customer approval flow, partner earns ₹0 on parts)

### 5.3 Billing: `generateBilling()` (~line 1034)
Today it adds GST again on `job.price` (which is `booking.totalPrice`). With GST now
inside the booking snapshot, that would double-tax.

- [x] New composition:
  ```
  bookingAmount   = booking.commercial.finalAmount                 (already incl. GST)
  addOnsAmount    = Σ checked add-ons finalAmount                  (engine-priced, incl. GST)
  partsAmount     = computeCharges({ partsCost, gstPercent }).total  (parts + GST, D2C only)
  total           = bookingAmount + addOnsAmount + partsAmount
  alreadyPaid     = advance paid + coins redeemed
  amountToCollect = total − alreadyPaid
  spEarnings      = payout.base + payout.expressIncentive + Σ checked add-on spPayout
  ```
- [x] `billingEstimate` stores each of these parts (for the partner screen and Phase 7 reporting)
- [x] `finalizeJobCompletion()` credits `spEarnings` (unchanged mechanism, new number)

### 5.4 Tests: `backend/tests/serviceProviderJob.test.js` (+ new cases)
- [x] Test 9: Fan × 2 completed → EarningsTally +360
- [x] Test 8 end-to-end: book TV 55–65 (₹799 / ₹450) → admin sets customer ₹899 → partner completes the job → earns 450. A second booking made after the change also earns 450
- [x] Express fan × 2 (incentive ₹50) → earns 410
- [x] Warranty-covered AC install → customer pays 0, partner earns the payout (tested with Window AC: ₹0 / ₹350)
- [x] Add-on `ELEC-SWITCH-INSTALL` × 3 on an AC job → +3 × payout; bill includes its GST once
- [x] Billing total on a plain booking = booking `finalAmount` exactly (no second GST)
- [ ] Brand complaint without booking → still RateCard labor rate: **no new test added**; the path (`coveredVisitEarnings`) is unchanged

## Tasks: Service Partner app (`frontend/src/pages/service-provider/`)

### 5.5 Job request & job detail
- [x] `Dashboard.jsx` request cards: **service line** ("Split AC · 1.5 Ton · Installation × 2") + "⚡ Express" badge, **"You earn ₹1,850"** (the total incl. bonus; the base/bonus split shows in the job summary, not on the card)
- [x] `ActiveJob.jsx` + `job-flows/*` detail header:
  - Service name, product type / variant (if any), quantity, pricing unit
  - Customer name, phone (existing masking rules), address, scheduled time / EXPRESS badge
  - Job instructions: offering `customerInstructions` + the customer's `requiredInfo` answers (e.g. "Wall type: Concrete")
  - Included / not included (collapsible), so the partner knows the scope
  - **Customer amount**: "Collect ₹1,768.82 after service" or "Paid online". Shown only where the partner collects (A10)
  - **Your payout: ₹900**
- [x] `BillingEstimate.jsx`: lines for booked service (fixed), add-ons (picked from catalogue picker), spare parts. Footer shows "Collect from customer ₹X" and "Your earning ₹Y"
- [~] Add-on picker: the existing "Add More Services" list/checkboxes now use catalogue offerings (price + GST, "you earn ₹X") and sync through `updateAddOns`; **no search box or qty stepper in the UI** (API supports quantity)

### 5.6 Earnings screens
- [~] `EarningDetail.jsx`: per-job breakdown booked-service payout / express bonus / extra work ✅. `RecentEarnings.jsx` / `Earnings.jsx` **unchanged**: they show `billingEstimate.serviceProviderEarnings`, which is now the fixed payout
- [~] `ServiceHistory.jsx` **unchanged**: it shows `billingEstimate.serviceProviderEarnings` / `estEarnings`, both of which now equal `payout.total`

---

## Worked example: one job, partner's view

Customer booked **Split AC 1.5 Ton Installation × 2, Express**, pay after service.
On site the partner adds 1 × Socket Installation.

| Item | Customer pays | Partner earns |
|---|---|---|
| Split AC 1.5T Install × 2 (₹1,499 each) | 2,998.00 | 1,800 (2 × 900) |
| Express fee / bonus | 99.00 | 50 |
| GST 18% on booking | 557.46 | — |
| **Booking total** | **3,654.46** | |
| Add-on: Socket Installation × 1 (₹129 + 18%) | 152.22 | 75 |
| **Collect on site** | **3,806.68** | **1,925** |

The partner app header reads: *Split AC · 1.5 Ton · Installation × 2 · EXPRESS ·
Collect ₹3,806.68 · Your payout ₹1,925*.

## Acceptance

- [x] Backend tests above green
- [~] Walk the example above on the partner app (mobile width): dashboard, job summary and earning detail ✅ with screenshots; the add-on tick and the Billing screen are not browser-verified (see log)
- [x] `grep -rn "serviceProviderShare" backend/src` → only the RateCard/no-booking path and the function definition remain
- [x] Client tests 8 and 9 marked ✅ in [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md)

## Out of scope

Customer approval of add-ons before billing (today only spare parts need approval; add if the client asks). Payout disbursement mechanics (unchanged).

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-24 | `9a65f5a` | Phase 5 built; payout and billing verified end to end by API tests; partner screens partly browser-verified (see below) |

### What was built

**Backend**

| File | Change |
|---|---|
| `shared/servicePartnerPayout.js` (new) | `initialJobPayout()` (booking snapshot payout → brand RateCard for complaints without a booking → legacy % only for pre-catalogue bookings), `withAddOnPayout()`, `computeJobBilling()` (the one bill: booked final as-is + add-on finals + parts with GST − advance/coins already paid) |
| `shared/serviceProviderEarnings.js` | `estimateServiceProviderEarnings()` = the fixed payout (used by the socket job offers, SR broadcasts, available-jobs list) |
| `service-provider/job.model.js` | `payout {base, expressIncentive, addOns, total}`; `additionalServices` are catalogue add-ons `{offeringId, code, name, quantity, unitPrice, taxableAmount, gstAmount, finalAmount, spPayout}`; `billingEstimate` + `alreadyPaid`, `amountToCollect` |
| `service-provider/job.service.js` | accept freezes `payout`; available-jobs estimate = payout; `generateBilling` and `collectPayment` both use `computeJobBilling`; **payment charges `amountToCollect`** (was the full total even after an advance); `submitSpareParts` no longer takes free-text extras; new `listAddOnOfferings / addJobAddOn / removeJobAddOn`; job context `addonServices` = catalogue add-ons; new `jobSummary` in job context |
| `job.routes.js`, `job.validation.js` | `GET /:id/addon-offerings`, `POST /:id/addons`, `DELETE /:id/addons/:addOnId`; spare-parts schema drops `additionalServices` |

**Partner app**

| File | Change |
|---|---|
| `components/service-provider/JobSummaryCard.jsx` (new) | Booked service (type · size · qty), EXPRESS, collect-from-customer (with "already paid online"), **Your payout** with base / express / extra-work split, the customer's required-info answers, offering instructions, included / not included. Shown on the job-progress timeline and the step panels |
| `pages/service-provider/ActiveJob.jsx` | add-ons seeded from the job + catalogue; `updateAddOns` syncs every tick/untick to the add-on endpoints (reverts on failure) and refreshes the summary; bill preview no longer re-taxes the booked amount (GST on parts only); `finalAmountCollected` = server `amountToCollect`; pre-accept card: fake "Est. Spare Cost ₹950" → real service line, "Customer pays", "You earn (fixed)"; resume list shows the service line |
| `pages/service-provider/BillingEstimate.jsx` | server bill figures; earnings = fixed payout (the `extras × 0.3` and `|| 850` fallbacks are gone); "GST on parts"; "Already paid" + "Collect now" |
| `pages/service-provider/EarningDetail.jsx` | Payout breakdown = booked-service payout / express bonus / extra work → total. The old "Service Amount − Platform Fee" (which exposed NCC's margin to partners) is removed |
| `context/ServiceProviderContext.jsx`, `Dashboard.jsx` | job lists carry `serviceLine`, `isExpress`, `payout`; request cards show "Split AC · 1.5 Ton · Installation × 2 · ⚡ Express" + "You earn ₹1,850" |

**Tests**

| File | Change |
|---|---|
| `tests/partnerPayout.test.js` (new) | 11 end-to-end tests on the real catalogue: Test 9 (Fan × 2 → ₹360), booked amount not re-taxed (TV → ₹942.82), express incentive (₹410), covered booking (₹0 / ₹350), Test 8 price change and payout change after booking, add-ons (Switch × 3: ₹350.46 + ₹180 payout; parts ₹236), size-needing add-ons hidden, removal, closed after billing, advance not collected twice (₹754.26 of ₹942.82), pre-accept estimate, job summary (no margin) |
| `tests/serviceProviderJob.test.js` | lifecycle rewritten to catalogue add-ons (bill ₹1,690, earnings ₹360); the "commission setting drives pay" tests replaced by Test 8 partner-side tests (setting 50% changes nothing; price change after booking changes nothing) |
| `tests/serviceProviderJobContext.test.js`, `e2e/api/serviceProvider.spec.js` | add-on seeded as an offering; parts now ₹590 incl. GST, payout ₹300 fixed |

### Worked example, as verified

Customer booked **Split AC 1.5 Ton Installation × 2, Express**, pay after service → **₹3,654.46** (2 × 1,499 + 99 = 3,097 + GST 557.46). Partner accepted → frozen payout **₹1,850** (2 × 900 + 50). With a ₹500 part: server bill **₹4,244.46** (3,654.46 + 590), partner earnings **₹1,850**. Collected ₹4,244.46 in cash. (With the planned ₹129 socket add-on, the API tests confirm the add-on's ₹152.22 and ₹75 payout are added the same way.)

### Browser checks (390 px, local scratch DB, 2026-09-24)

| Screen | Result |
|---|---|
| Dashboard request card | "Split AC · 1.5 Ton · Installation × 2 · ⚡ Express", "You earn ₹1,850" ✅ |
| Job progress → JobSummaryCard | "Split AC 1.5 Ton Installation × 2 · EXPRESS · Collect ₹3,654.46 · Your payout ₹1,850 (₹1,800 base + ₹50 express) · Wall type: Concrete" ✅ |
| Earning detail | "Booked service payout", "Express bonus", no "Platform Fee" ✅ |
| Ticking a catalogue add-on in the job UI | **not browser-verified.** The add-on checkboxes are on the inspection overview, reached only after photo uploads the harness can't do. API endpoints are covered by tests |
| Billing & Estimate screen | **not browser-verified with this job**: the scratch partner had several open jobs and the script couldn't reliably select this one at the billing step. Its figures are the server bill (API-verified); the earnings row showed the fixed ₹1,850 |

No browser console errors. Screenshots: [screenshots/phase-5/](screenshots/phase-5/).

### Deviations from plan

1. **Found and fixed: advance collected twice.** `collectPayment` charged the full bill even when an advance was already verified. It now charges `amountToCollect` (bill − verified advance − coins).
2. **Found and fixed: partner app showed NCC's margin.** EarningDetail's "Platform Fee" was *bill − partner earnings* (the margin). It's replaced by the partner's own payout components (Req 24).
3. **Found and fixed: fabricated "Est. Spare Cost ₹950"** on every paid job offer.
4. **Add-on UI** reuses the existing add-on list and checkboxes through one `updateAddOns` sync function, instead of a new picker sheet with search and a quantity stepper. The API takes a quantity; the UI adds quantity 1.
5. **Add-on list scope**: only offerings that need no further choice (a size-specific offering, or a type/service without sizes), so the partner picks one row. A size-agnostic offering like "Split AC Uninstallation" isn't offered as an add-on. `?category=` browses another category; related categories aren't auto-included.
6. **`jobSummary` in the job-context API** (not in the plan) gives the partner header one server-built source for service line, answers, instructions, payout and amount to collect.
7. **Payout for legacy bookings** (no snapshot) still uses the old commission %, which is reachable only on data the clean-slate reset didn't wipe. Phase 7 removes it with the setting.

### Known gaps carried forward

- The two partner UI paths above aren't browser-verified. Worth a manual check on a device: tick an add-on during inspection, then open Billing & Estimate.
- Customer approval of on-site add-ons isn't implemented (out of scope in the plan; spare parts keep their approval flow).
- The AMC / Brand Warranty / EW job overviews list catalogue add-on candidates at their pre-GST price ("₹99 + GST" in the add-services modal; the overview checkboxes show the bare figure).
- `serviceProviderShare()` / `PlatformSettings.serviceProviderCommissionPercent` remain for the legacy path. Removed in Phase 7.

### Test output

```
backend jest:        Test Suites: 41 passed, 41 total — Tests: 673 passed, 673 total
e2e (Playwright API): 192 passed, 1 skipped
frontend build:      ok; ActiveJob lint warnings 12 (was 13), 0 errors; other touched files 0 errors
```
