# Phase 5 — Approval → automatic Service Job

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #8, #19

## Goal
Brand approval creates the separate Service Job and starts dispatch, with no
human in between.

## Tasks
- [x] `claimJob.service.createServiceJobForClaim(claim, { session })` per ARCHITECTURE §5 — `ServiceRequest` with `humanId` `NCCJ-{YYYY}-######`, `warrantyClaim`, `requestMode: 'B2B2C'`, `warranty: 'In Warranty'`, address → `zone`/`pincode`/`customerLocation`, documents → `attachments`
- [x] Approve runs in a transaction (`utils/transaction.js`): claim Approved → Job Created + SR create, both or neither
- [x] After commit: `assignServiceProvider(sr, null)`; "no eligible partner" is not an error for approval — it sets `allocationFailed` (Phase 6 refines)
- [x] Idempotent: approving a claim that already has a `serviceRequest` never creates a second job
- [x] `acceptJob` for an SR with `warrantyClaim` → Job `type: 'Brand Warranty'`, `isPartner: true`, payout from brand RateCard
- [x] Warranty SR is free to the customer: billing step collects ₹0 service charge (verify existing covered-job billing path; spare parts under warranty are FOC)
- [x] Tests `partnerWarrantyJob.test.js`

## Example
```
POST /brand/warranty-claims/{NCCW-2026-000001}/approve
→ claim.status 'Job Created', claim.serviceRequest → SR { humanId: 'NCCJ-2026-000001', brand: LG, category: 'AC', requestMode: 'B2B2C' }
→ SR status 'Assigned' to the top eligible partner (or claim.flags.allocationFailed = true)
```

## Acceptance
- Claim and job are separate documents with separate IDs, linked both ways.
- A failure mid-approval leaves neither an approved claim without a job nor an orphan job.

## Implementation Log

**Done 2026-09-30.** Not committed yet (Phase 4 is also still uncommitted).

### How approval works now
`POST /brand/warranty-claims/:id/approve` → `approveAndCreateJob()` (claimJob.service.js):
1. Load the claim **inside** the transaction (so a retried transaction can't double-append), apply the approval, and **save first**. Of two simultaneous approvals the loser fails here with 409, before any job exists.
2. `createServiceJobForClaim()` → `ServiceRequest` with humanId **`NCCJ-{year}-######`**, `warrantyClaim`, `requestMode: 'B2B2C'`, `warranty: 'In Warranty'`, category key, model, serial, description (`Warranty: {product} — {issue}. {remarks}`), document URLs as attachments, `zone` = city, `pincode`, `customerLocation`, `slaDueAt` = the claim's resolution deadline.
3. Claim → **Job Created** (`JOB_CREATED` event, note "Service Job NCCJ-…"), saved.
4. After commit: audit rows, then `dispatchServiceJob()` → the existing `assignServiceProvider()` (offer → accept / decline / 60 s timeout → next).
5. Nobody eligible → `flags.allocationFailed = true`, internal `ALLOCATION_FAILED` event, Super Admins alerted **once** ("Warranty Job Needs Manual Assignment").

Job creation is idempotent: it looks the job up **by `warrantyClaim`**, not only by the claim's link, so a crash between creating and linking (possible on a standalone MongoDB, which has no transactions) never yields a second job.

### The partner side needed no changes
Verified end to end over HTTP: `acceptJob` infers **Brand Warranty** (`isPartner: true`), payout = brand **RateCard** `laborRate` (₹150 fallback) frozen at accept; billing = **₹0** to the customer (service charge 0, spare parts FOC); the customer reads the **completion OTP** from their claim (new `completionOtp` field in the customer view, shown only after a partner accepts); ₹0 is recorded as a successful Cash payment and the job completes.

### Other changes
- `createServiceRequest(data, { notifyBrand: false })` — the Service Job doesn't fire the generic "Brand Warranty Claim" alert (it used to depend on `session` being set, which is `null` on a standalone DB).
- `claimTimeline.persistClaim()` — save without audit, for use inside transactions; `saveClaim = persistClaim + flushAudit`.
- Brand view's `serviceJob` shows the NCCJ ID, job status and partner name.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/claimJob.service.js` | **new** — `createServiceJobForClaim`, `approveAndCreateJob`, `dispatchServiceJob`, `markAllocationFailed` |
| `backend/src/modules/partner-warranty/brandClaim.service.js` | approve goes through `approveAndCreateJob` |
| `backend/src/modules/partner-warranty/claimTimeline.js` | `persistClaim()` |
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` | `completionOtp` in the customer view |
| `backend/src/modules/service-requests/serviceRequest.service.js` | `notifyBrand` option |
| `backend/src/modules/notifications/notification.service.js` | `warranty.allocation_failed` |
| `backend/tests/partnerWarrantyJob.test.js` | **new** — 7 tests |
| `backend/tests/partnerWarrantyBrand.test.js` | approve now ends at Job Created |

### Found for Phase 7
After payment the job's ServiceRequest stops at **Customer Confirmation**; for bookings the customer's confirmation closes it, but a warranty job has no booking. Phase 7 must give the claim a way to reach **Closed** (customer confirmation on the claim, or auto-close).

### Verification
- Partner warranty tests (all 5 files): **63/63 passed**.
- The first full run after this phase had **1 failure**: the Phase 4 test still expected `Approved`, which Phase 5 intentionally changed to `Job Created` — an outdated assertion, fixed.
- Full backend suite after the fix: **55 suites, 827 tests passed**.
- ESLint clean.
