# Phase 8 — Super Admin control APIs

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #3, #14, #17

## Goal
Full visibility across all brands plus every manual override the client listed.

## Tasks
- [x] `GET /super-admin/warranty-claims` — filters: brand, category, productType, status, date range, city, pincode, escalated, allocationFailed, slaState, q (ticket / job ID / customer phone / serial); columns: ticket, brand, customer, product, issue, location, date, status, assigned partner; status counts
- [x] `GET /super-admin/warranty-claims/:id` — everything: all timeline events (incl. internal), audit rows, SLA, flags, documents, linked job (SR + Job + partner + dispatch history: declinedBy, assignedAt)
- [x] Overrides (each requires `reason`, audited as actor `admin`):
  - `POST …/:id/approve` / `…/reject` on the brand's behalf
  - `POST …/:id/assign` `{ serviceProviderId }` — manual assign (uses existing `suggestServiceProviders` for the picker; `GET …/:id/partner-suggestions`)
  - `POST …/:id/reassign` `{ serviceProviderId?, reason }` — pull from the current partner (only before work started, or with `force` after, which cancels the old Job step cleanly) and assign next/named
  - `POST …/:id/status` `{ status, reason }` — admin-only transitions allowed by §3
  - `POST …/:id/escalate` / `…/de-escalate`
  - `POST …/:id/hold` / `…/resume`
  - `POST …/:id/cancel` — cancels the linked SR too
  - `POST …/:id/reopen` — Rejected/Closed/Cancelled → Brand Review or Job Created (new SR if the old one was cancelled)
  - `POST …/:id/notes` — internal note
- [x] ~~`SERVICE_REQUEST_STATUS` gains `On Hold`~~ — **changed:** hold is claim-level (see log); no new job status
- [x] Tests `partnerWarrantyAdmin.test.js`

## Acceptance
- Every action in #14 exists, requires a reason, and leaves an audit row with old/new status.
- Filters return correct subsets; a brand-admin token gets 403 on these routes.

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–8 uncommitted, as asked).

### Endpoints (`/api/v1/super-admin/warranty-claims`, super-admin only; every action needs `reason`)
| Method + path | What |
|---|---|
| `GET /` | all brands; filters `brand, category, productType, status (comma list), from, to, city, pincode, escalated, allocationFailed, slaState, q` (ticket, **Service Job ID**, serial, model, **customer name/phone**); columns: ticket, brand, customer, product, issue, location, date, status, **assigned partner**, Service Job, flags, SLA state; `meta.counts` per status |
| `GET /:id` | everything: all timeline events with visibility (internal included), AuditLog rows with who, every Service Job the claim has had (partner, accepted, declinedBy names, job step, **payout**, cancellation reason), documents, info requests, warranty estimate, flags, SLA |
| `GET /:id/partner-suggestions` | warranty-rule shortlist incl. Busy/Offline (for manual assignment) |
| `POST /:id/approve` · `/reject` | on the brand's behalf. Approve: customer sees a normal approval; "why NCC stepped in" is a brand-visible note. Reject: reason shown to the customer |
| `POST /:id/assign` `{ serviceProviderId }` | manual assignment (any Active partner, even Offline) before acceptance; creates a job if the claim has no live one; clears `allocationFailed`. After acceptance → 409 (use reassign) |
| `POST /:id/reassign` `{ serviceProviderId?, force? }` | before acceptance: same job to the named partner, or next eligible (current one excluded). **After acceptance only with `force`**: old job Cancelled + Job step `cancelled` + partner's active count −1, claim → Job Created, **new NCCJ job** dispatched. Customer sees "We are arranging a new service partner for you"; the reason stays internal |
| `POST /:id/status` `{ status }` | Brand Review or any service stage, within the transition table; Approved / Rejected / On Hold / Cancelled → 400 "use the dedicated action". Closing also closes a job that is ready to close |
| `POST /:id/escalate` · `/de-escalate` | flag + brand-visible event; brand notified on escalation |
| `POST /:id/hold` · `/resume` | see below |
| `POST /:id/cancel` | claim + live job cancelled; customer and brand notified; repeat → 409 |
| `POST /:id/reopen` `{ to? }` | Rejected → Brand Review; Closed / Cancelled → Brand Review, or **Job Created with a new NCCJ job** |
| `POST /:id/notes` | internal note |

### Design decisions made while building
- **Replacing an accepted job creates a new Service Job.** A Job is unique per ServiceRequest, so a new partner can't accept the old one; cancelling it and issuing a new NCCJ keeps both histories (and the old partner's payout record) intact. The old job is retired with direct writes, so the status sync never reacts to it, and the sync ignores any job that isn't the claim's current one.
- **Hold is claim-level**, not a new job status: an unaccepted offer is pulled back and auto-dispatch skips held claims; an accepted job keeps its partner (tell them directly) and the claim stops following it. Resume re-syncs to whatever the job did meanwhile and re-offers a job nobody holds. Adding `On Hold` to the ServiceRequest machine would have broken the partner app's step transitions.
- Only an **active** job is reused by `createServiceJobForClaim` (Cancelled / Closed ones are skipped), which is what makes replace and reopen possible.

### Bug found by the tests
A second cancel "succeeded": a same-status move is a no-op in `appendEvent`, so it logged a duplicate event and re-sent the notifications. Cancel and hold now refuse a repeat with 409; every other override already refused a no-op.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/adminClaim.service.js` / `.validation.js` / `.routes.js` | **new** |
| `backend/src/modules/partner-warranty/claimJob.service.js` | reuse only an active job |
| `backend/src/modules/partner-warranty/claimDispatch.js` | sync ignores held / finished claims and replaced jobs |
| `backend/src/modules/partner-warranty/claimStatus.js` | `MANUAL_ASSIGNMENT`, `REASSIGNED`, `STATUS_OVERRIDDEN` |
| `backend/src/modules/service-requests/serviceRequest.service.js` | auto-dispatch refuses held / finished claims |
| `backend/src/modules/notifications/notification.service.js` | `warranty.claim_cancelled`, `warranty.claim_reopened`, `warranty.claim_escalated` |
| `backend/src/app.js` | mounts the admin router |
| `backend/tests/partnerWarrantyAdmin.test.js` | **new** — 14 tests |

### Verification
- `partnerWarrantyAdmin.test.js`: **14/14**; all partner warranty tests: **101/101**.
- Full backend suite (single run, `--forceExit`): **58 suites, 865 tests passed**.
- ESLint clean.
