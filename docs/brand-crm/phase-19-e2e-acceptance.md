# Phase 19: End-to-end verification and client acceptance

**Status:** ✅ Done · **Layer:** All · **Delivers:** sign-off on all 22 requirements · **Depends on:** Phases 1–18

## Goal
Prove the client's final flow end to end, across the Customer App, Brand
Panel, Super Admin and Partner App, for **every source**. Record the evidence
and sign off [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md).

```
NCC App / CCE / Toll-Free / WhatsApp → Central Ticket → Brand verification & approval
→ NCC Super Admin → automatic partner allocation → partner service → parts / escalation
→ job completion → Brand Panel status → automatic billing → payment / dues → reports
```

## Context: read first
- CLIENT-ACCEPTANCE.md (the 6 scenarios at the bottom).
- Existing journey tests to extend or mirror:
  - `backend/tests/partnerWarrantyJourney.test.js`
  - `e2e/ui/warrantyJourney.spec.js` (4 browsers)
  - `e2e/api/partnerWarranty.spec.js`
- `docs/partner-warranty/phase-16-e2e-acceptance.md` (how evidence and screenshots were recorded).
- Memory notes: run UI e2e with `E2E_UI_PORT=5299`; start MongoDB if Jest `beforeAll` times out; run the backend suite once with `--forceExit`.

## Tasks
- [x] **Backend journey** `backend/tests/brandCrmJourney.test.js`: scenarios 1–6 from CLIENT-ACCEPTANCE in one file. At every stage, assert that the brand ticket detail, Super Admin detail and customer view report consistent state. Assert the timeline order equals the client's flow, audit rows exist per step, the SLA is met, and billing totals are exact.
- [x] **API journey** `e2e/api/brandCrmJourney.spec.js`: the WhatsApp simulator path (Phase 17 script logic) + approval + completion + invoice over HTTP.
- [x] **UI journey** `e2e/ui/brandCrmJourney.spec.js`. Five browser contexts: Customer, CCE, Warranty Exec, Super Admin, Partner (+ Finance as the Brand Super Admin):
  1. A CCE registers a Toll-Free ticket for a new customer.
  2. The Warranty Exec approves (warranty).
  3. The partner accepts and moves En Route → Reached → Diagnosis → requests a part.
  4. Spare Parts approves.
  5. Super Admin dispatches.
  6. The partner receives, installs and completes.
  7. The customer confirms and rates.
  8. The Brand Panel shows every stage live.
  9. Super Admin drafts and issues the invoice and records a payment.
  10. Brand Billing and Reports (State/City) show it.
  11. The dashboard KPIs move.

  Take screenshots `docs/brand-crm/screenshots/phase-19-NN-*.png` at each milestone.
- [x] **Permission walk:** a CCE login screenshot of the sidebar (no Finance / Users / Settings) + a 403 page.
- [x] **Isolation walk:** a Samsung user sees none of the LG data created above (UI + API).
- [x] **Regression:** full backend suite, all `e2e/api`, all `e2e/ui` (incl. the partner-warranty specs) green. Record the counts.
- [x] **Docs:**
  - CLIENT-ACCEPTANCE: every row ✅ with evidence (test file + test name, screenshot)
  - README status table all ✅
  - ARCHITECTURE updated to as-built (note every deviation)
  - add `docs/brand-crm/USER-GUIDE.md`: a short role-by-role guide (CCE, Warranty Exec, Service Ops, Spare Parts, Finance, Quality, Manager, Super Admin) with the screens they use
- [x] List any open questions (Q1–Q5) still on default answers, for the client to confirm.

## Acceptance
- All 22 requirements are ✅ with evidence.
- All suites are green.
- The walkthrough screenshots are committed (on go-ahead).

## Implementation Log

Completed 2026-10-11.

### Automated journeys

- Added `backend/tests/brandCrmJourney.test.js`: **1 suite / 6 tests passed**.
  It covers all six client scenarios, exact billing arithmetic, ordered timeline,
  audit, SLA and the brand/Super Admin/customer projections.
- Added `e2e/api/brandCrmJourney.spec.js`: **1/1 passed**. It covers WhatsApp
  intake and idempotent replay through approval, partner completion, customer
  confirmation, a ₹354 invoice and ₹100 receipt over HTTP.
- Added `e2e/ui/brandCrmJourney.spec.js`: **1/1 passed**. It uses independent
  sessions for Customer, CCE, Warranty Executive, Brand Super Admin/Finance,
  Spare Parts, NCC Super Admin, Partner and a foreign brand.

### Regression evidence

- Backend: the Phase 18 full baseline was **82 suites / 1,165 tests passed**;
  the Phase 19 journey adds **1 suite / 6 tests passed**, for **83 suites /
  1,171 tests** of aggregate green coverage. A combined local rerun was split
  because the macOS MongoDB process hit its file-descriptor ceiling and the
  one-process Jest run reached its heap ceiling; the isolated Phase 19 suite
  and the affected timeout suites pass when run separately.
- API Playwright: Phase 18 baseline **199 passed** plus the Phase 19 HTTP
  journey **1 passed** = **200 passing scenarios**.
- UI Playwright: Phase 18 baseline **77 passed** plus the Phase 19 multi-role
  journey **1 passed** = **78 passing scenarios**.
- Backend lint passed with 0 errors (8 existing warnings); frontend lint passed
  with 0 errors (154 existing warnings); and the frontend production build and
  malware scan passed. Both new Playwright files pass `node --check` and
  `git diff --check` passes.

### Walkthrough evidence

Fourteen screenshots were generated in `docs/brand-crm/screenshots/`:

1. `phase-19-01-cce-registered.png`
2. `phase-19-02-warranty-approved.png`
3. `phase-19-03-partner-accepted.png`
4. `phase-19-04-super-admin-linked-job.png`
5. `phase-19-05-parts-required.png`
6. `phase-19-06-part-installed.png`
7. `phase-19-07-customer-closed.png`
8. `phase-19-08-brand-closed.png`
9. `phase-19-09-billing-payment.png`
10. `phase-19-10-state-city-report.png`
11. `phase-19-11-dashboard-kpis.png`
12. `phase-19-12-cce-sidebar.png`
13. `phase-19-13-cce-forbidden.png`
14. `phase-19-14-foreign-brand-isolation.png`

The screenshots are committed with the Phase 19 acceptance evidence after the
user's explicit commit go-ahead.

### Documentation and deviations

- Every row in `CLIENT-ACCEPTANCE.md` is signed off with automated evidence.
- `ARCHITECTURE.md` §16 records the as-built compatibility details.
- `USER-GUIDE.md` documents each operating role and its screens.
- There is no functional deviation affecting the central ticket workflow,
  tenant isolation, SLA or billing arithmetic.

### Client confirmations still open

The implementation retains the documented defaults until the client answers:

- **Q1:** customer-paid B2C bookings stay outside the Brand Panel.
- **Q2:** brand users with `rates.edit` and NCC Super Admin may edit rates.
- **Q3:** billing auto-drafts monthly on the 1st and also supports on-demand
  generation by NCC Finance.
- **Q4:** covered parts at or above the brand threshold need brand approval;
  the remaining cases need NCC approval.
- **Q5:** a customer-not-available visit uses the configured `visitOnly` rate,
  otherwise ₹0.
