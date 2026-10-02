# Phase 11 — B2B2C payout (manual, product-wise)

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #20

## Goal
Partners see B2B2C (partner brand warranty) earnings in Invoice Payout as
totals, by brand and by product; settlement is manual by NCC.

## Tasks
- [x] Earnings summary: new `b2b2c` bucket = completed Jobs whose SR has `warrantyClaim`; `{ amount, jobs, byBrand: [{brand, jobs, amount}], byProduct: [{category, jobs, amount}], settled, pending }`
- [x] Keep EW/AMC in the existing invoice bucket but separate from `b2b2c`
- [x] ~~`requestPayout` rejects `payoutType: 'Invoice'`~~ — **changed:** B2B2C earnings never enter the withdrawable balance, so neither Quick nor Invoice can reach them; Invoice requests for AMC / EW work keep working as before
- [x] Super Admin: `GET /super-admin/b2b2c-payouts?brand=` (unsettled, grouped by partner), `GET …/service-providers/:id/jobs`, `POST …/settle` `{ serviceProviderId, jobIds, reference, note }` → one settled Invoice `Payout`, jobs `settlement.status: settled`
- [x] Tests `partnerWarrantyPayout.test.js`

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–11 uncommitted, as asked).

### The gap this closed
Every completed job's earning went into `EarningsTally.total` — the partner's withdrawable balance — so a warranty job's payout could be taken out at once with a Quick payout, bypassing the manual settlement the client asked for (#20).

### How it works now
- **Accept:** a Job for a warranty Service Job carries `warrantyClaim`.
- **Complete:** the earning (brand RateCard, frozen at accept) is **not** added to `today` / `total`; the job gets `settlement.status: 'unsettled'`. Completed-job counts still include it.
- **Partner sees** (`GET /service-provider/earnings/breakdown` → `b2b2c`, and `GET /service-provider/warranty-jobs/payouts`): total jobs + amount, settled vs pending, **by brand** and **by product**, `settlement: 'manual'`; `GET …/payouts/jobs?status=` lists each job (NCCJ, NCCW, brand, product, amount, status, reference). Recent-earnings rows carry `isB2B2C` and `settlementStatus`. The old Invoice card (`split.invoice`) no longer counts B2B2C jobs, so nothing is double-counted. `lifetimeEarned` includes pending B2B2C money.
- **Super Admin settles** (`/api/v1/super-admin/b2b2c-payouts`): worklist of unsettled earnings per partner (filter by brand) → `POST /settle` with the bank/UPI **reference** → one settled `Payout` (Invoice, no fee, credited to the partner's primary method), jobs marked settled with the payout id, Finance audit row, partner notified ("Warranty Job Payout Settled").
- **Double payment is impossible:** jobs are claimed with a conditional update; if any was taken concurrently the batch is undone → 409 (tested with two simultaneous settlements → one payout). Settling writes with `timestamps: false`, so the job's "completed at" doesn't move.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/b2b2cPayout.service.js` / `.routes.js` | **new** |
| `backend/src/modules/service-provider/job.model.js` | `warrantyClaim`, `settlement` |
| `backend/src/modules/service-provider/job.service.js` | tag at accept; B2B2C earning kept out of the balance at completion |
| `backend/src/modules/service-provider/earnings.service.js` | `b2b2c` block; invoice split excludes it; history flags |
| `backend/src/modules/partner-warranty/partnerWarrantyJob.routes.js` | partner payout endpoints |
| `backend/src/modules/notifications/notification.service.js` | `b2b2c.payout_settled` |
| `backend/src/app.js` | mounts the admin router |
| `backend/tests/partnerWarrantyPayout.test.js` | **new** — 5 tests |

### Not built
Billing the **brands** for the warranty work (NCC ↔ brand invoicing) — outside #20; the per-brand totals here are the input for it.

### Verification
- `partnerWarrantyPayout.test.js`: **5/5**; partner warranty + earnings / payout / client-acceptance suites: **197/197**.
- Full backend suite: **60 of 61 files passed (867/892 tests)**; the other file (`adminServiceProvider.test.js`) failed only on `beforeAll` hook timeouts under machine load and then passed on its own **25/25** — so all 892 pass, just not in one run.
- ESLint clean.
