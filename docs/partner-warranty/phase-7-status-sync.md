# Phase 7 — Status sync + tracking + realtime

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #4, #12, #13

## Goal
Whatever happens on the Service Job shows up on the claim — for customer,
brand and admin — immediately.

## Tasks
- [x] `claimJob.syncClaimFromJob(srId)` per ARCHITECTURE §9 (forward-only mapping of SR status + Job step → claim status)
- [x] Call it from `transitionStatus`, `assignServiceProvider`, `declineAssignment`, `acceptJob`, `simpleTransition` (job steps), payment/close paths — wrapped so a sync failure is logged, never breaks the partner's action
- [x] Visit slot: when the partner schedules, store `visit: { date, slot }` on the claim (customer-visible)
- [x] Socket rooms: brand-admin sockets auto-join `brand:{brandId}`; super-admin sockets join `admins`; emit `warranty_claim:updated` `{ id, humanId, status, statusLabel }` to `user:{customer}`, `brand:{brand}`, `admins`
- [x] `GET /partner-warranty/claims/:id/track` — customer-labelled stage list (done/current/pending with timestamps) + partner card once assigned
- [x] **Closing (found in Phase 5):** after payment a warranty job's SR stops at `Customer Confirmation` — bookings close via the booking's customer confirmation, warranty jobs have no booking. Add `POST /partner-warranty/claims/:id/confirm` (customer confirms → SR Closed → claim Closed) plus an auto-close after 72 hours without confirmation.
- [x] Tests `partnerWarrantySync.test.js` walking a job through every step and asserting claim status + timeline + emitted events

## Example
```
partner accepts        → claim 'Partner Assigned'      (customer, LG panel, admin get warranty_claim:updated)
partner startTravel    → claim 'Technician On Way'
partner arrive         → claim 'Service In Progress'
partner repairComplete → claim 'Service Completed'
SR Closed              → claim 'Closed', closedAt set
```

## Acceptance
- No claim status is ever set by hand in the partner flow; all come from the sync.
- Customer track response contains no internal events or payout data.

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–7 uncommitted, as asked).

### Sync (`claimDispatch.syncClaimFromJob`)
| Service Job | Claim |
|---|---|
| SR Engineer Accepted | Partner Assigned — note "Ravi will handle your service" |
| SR Visit Scheduled / Reschedule | Visit Scheduled — note "Visit on {date}, {slot}" |
| job step `ontheway` / `revisit_ontheway` | Technician On Way — note "Ravi is on the way" |
| SR Engineer Reached … Spare Received | Service In Progress |
| SR Repair Completed / Customer Confirmation | Service Completed |
| SR Closed | Closed |
| SR Cancelled | no status change; `allocationFailed` + Super Admin alert |

Forward-only; claims on hold / rejected / cancelled / not yet in service stages are left alone. Stages can be skipped (a partner who heads out without scheduling). The partner is named by **first name** only on customer-visible events.
Called from `transitionStatus` and after every job step; wrapped so a sync failure never breaks the partner's action.

### New endpoints
| Method + path | Who | What |
|---|---|---|
| `POST /api/v1/service-provider/warranty-jobs/:jobId/schedule-visit` `{ date: YYYY-MM-DD, slot }` | partner (own warranty job) | first time → job + claim Visit Scheduled; again → "Visit moved to …" event. Past date → 400; not a warranty job → 400; someone else's job → 404; after service started → 409 |
| `GET /api/v1/partner-warranty/claims/:id/track` | customer | 9 stages (done / current / pending + first time reached); rejected / cancelled claims end at "Not Approved" / "Cancelled"; partner card (name, phone, rating, photo) and completion OTP **only after a partner accepts**; `canConfirm` |
| `POST /api/v1/partner-warranty/claims/:id/confirm` | customer | only when the claim is Service Completed **and** the partner has closed out the job (SR at Customer Confirmation) → SR Closed + claim Closed (`CUSTOMER_CONFIRMED`) |

`autoCloseCompletedClaims({ olderThanHours = 72 })` — hourly from `server.js`; closes with a system `CLAIM_CLOSED` event "Closed automatically — not confirmed within 72 hours of completion".

### Real-time
- `sockets/index.js`: brand-admin sockets join `brand:{brandId}`, super-admin sockets join `admins`.
- `claimTimeline.flushAudit` → `emitClaimUpdated`: customer room only when an event is customer-visible; brand room unless the change is internal-only; admins always. Payload is five fields (`id, humanId, status, customerStatusLabel, updatedAt`) — apps refetch through their own scoped API, so nothing leaks over the socket.

### Not done here (by plan)
Status-change **notifications** (partner assigned, on the way, completed, closed) are Phase 10's matrix; Phase 7 does sockets only.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/claimDispatch.js` | `claimStageForJob`, `syncClaimFromJob` |
| `backend/src/modules/partner-warranty/partnerWarrantyJob.service.js` / `.routes.js` | **new** — schedule visit, confirm, auto-close |
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` / `.routes.js` | track + confirm |
| `backend/src/modules/partner-warranty/claimTimeline.js` | `emitClaimUpdated` |
| `backend/src/modules/partner-warranty/claimStatus.js` | 7 progress actions |
| `backend/src/modules/service-requests/serviceRequest.service.js` | sync from `transitionStatus` |
| `backend/src/modules/service-provider/job.service.js` | sync after each job step |
| `backend/src/sockets/index.js` | brand / admin rooms |
| `backend/src/server.js` | hourly auto-close |
| `backend/src/app.js` | mounts the partner warranty-jobs router |
| `backend/tests/partnerWarrantySync.test.js` | **new** — 10 tests (full journey over HTTP, track, skip, forward-only, cancel, confirm guards, auto-close, reschedule, socket targeting) |

### Verification
- Partner warranty tests (7 files): **87/87 passed**.
- Full backend suite (single run, `--forceExit`): **57 suites, 851 tests passed**.
- ESLint clean on new code (pre-existing unused `City` import in job.service.js remains).
