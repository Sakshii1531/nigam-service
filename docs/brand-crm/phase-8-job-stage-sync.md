# Phase 8: Live NCC job-stage sync, allocation visibility, closure

**Status:** ✅ Complete · **Layer:** Full stack (+ Partner app check) · **Delivers:** client §7, §8, §9, §20 (NCC Job + Closure) · **Depends on:** Phases 6, 7

## Goal
The Brand Panel always shows the **live, detailed** NCC job stage:
Partner Finding → Job Offered → Accepted → Visit Scheduled → En Route →
Reached → Diagnosis → Parts Required → Repair → Completed → Customer
Confirmation → Closed (plus Allocation Failed). Each stage carries timestamps.

The closure data reaches the ticket: service report, customer confirmation,
rating and closure date. Allocation already filters by location, skill, brand
authorisation, availability and workload. This phase **adds SLA urgency to
ranking** and makes the allocation attempts visible.

## Context: read first
- ARCHITECTURE §4 (draft mapping, **verify it**), §2.1 `closure`; README D11.
- `partner-warranty/claimDispatch.js`: `claimStageForJob`, `syncClaimFromJob`, `onWarrantyJobOffered`, `onWarrantyJobDeclined`, `markAllocationFailed`.
- `service-requests/serviceRequest.service.js`:
  - `transitionStatus`
  - `assignServiceProvider`
  - `declineAssignment` (~L500)
  - `sweepExpiredAssignments`
  - `autoAssignPendingRequests`
- `service-provider/job.service.js`: step transitions (`activeStep` values in `JOB_STEPS`, `config/constants.js` ~L110), completion (OTP, photos, notes), `requestSparePart`.
- `shared/assignmentEngine.js` `rankServiceProviders` (filters + ranking).
- `partner-warranty/warrantyClaim.service.js` `confirmMyService` (customer confirmation); `reviews` module (ratings).
- `backend/src/sockets/index.js` (rooms `brand:{id}`, `admins`).

## Tasks

### Backend
- [x] **Verify the mapping.** Read `job.service.js` and list every place that changes `ServiceRequest.status` or `Job.activeStep`. Write the final `(srStatus, activeStep, isAccepted, flags) → jobStage` table into this phase's log, and correct ARCHITECTURE §4 if needed.
- [x] `claimDispatch.jobStageFor(sr, job, claim)` implements the table (pure function, unit-tested).
- [x] `syncJobStage(srOrId)` is called from every place that already calls `syncClaimFromJob`, **plus**:
  - offer (`onWarrantyJobOffered` → JOB_OFFERED)
  - decline/timeout (→ PARTNER_FINDING again)
  - allocation failed
  - SR creation at approval (→ PARTNER_FINDING)
  - job step changes that don't change the SR status (on the way, reached)

  On change it:
  - sets `jobStage` / `jobStageAt`
  - appends `JOB_STAGE_CHANGED` (visibility brand, with partner name and attempt no. for offers)
  - emits `claim:updated`
  - enqueues the `JOB_STAGE_CHANGED` domain event

  The stage only moves forward, except for re-allocation (offer declined → Partner Finding) and revisit loops (Parts Required → Repair).
- [x] **Allocation visibility:** keep `allocation: { attempts:[{ partner, offeredAt, outcome:'accepted'|'declined'|'timeout'|'withdrawn', reason? }] }` on the ticket. Partner identity is shown to the brand only for the accepted partner; declined ones appear as "Partner 1, 2…". NCC Super Admin sees everything.
- [x] **SLA-aware ranking:** pass the ticket's `priority` and its remaining allocation/visit SLA into `rankServiceProviders` as a `urgency` context. When urgency is high (Critical, or < 25 % SLA left), weight distance and current availability over workload balance. Document the weights. No new hard filters.
- [x] **Closure:**
  - On partner completion, copy the job's completion notes, work done, parts used and completion photos into `closure.serviceReport`. Store the photos as `documents` of kind `service_report`. Verify which fields the Job holds and document them.
  - On customer confirmation (app `confirmMyService`, completion OTP, or brand CCE `POST /brand/tickets/:id/confirm-on-behalf { method:'cce', remarks }` with `tickets:edit`, which requires a logged call from Phase 9 or a note), set `customerConfirmedAt` and `confirmationMethod` → CUSTOMER_CONFIRMATION → Closed per the existing flow.
  - On a customer rating (reviews module) for the NCCJ job, set `closure.rating` / `feedback` + a `RATED` event.
  - `closure.closedAt` is set on Closed.
- [x] Super Admin claim detail and list: show `jobStage` (column + filter) and the allocation attempts.
- [x] Customer app: unchanged statuses (D11). Make sure no internal stage leaks into `toCustomerView`.

### Brand Panel
- [x] Ticket detail **NCC Job** section:
  - stage stepper (13 stages, each with its timestamp; the current one highlighted; Allocation Failed shown red with "NCC is assigning manually")
  - partner card after acceptance (name, photo, rating, phone)
  - visit date/slot
  - allocation attempts count
- [x] **Closure** section: service report (work done, parts used, photos), confirmation method + time, rating stars + feedback, closed at.
- [x] Ticket queue: a `jobStage` column + filter. The "In Service" bucket shows the stage chip.

### Partner app
- [x] Verify that the existing partner flow emits every step needed (on the way, reached/inspection, diagnosis, completion). If "Reached" or "Diagnosis" can't be distinguished today, add the minimal step event (no UI redesign) and record it in the log.

### Tests
- [x] `backend/tests/brandCrmJobStage.test.js` (use `tests/helpers/jobFlow.js` to drive a real job):
  - approve → PARTNER_FINDING
  - offer → JOB_OFFERED
  - decline → PARTNER_FINDING (attempt 2)
  - accept → PARTNER_ASSIGNED
  - on the way → EN_ROUTE
  - reached → REACHED
  - diagnosis → DIAGNOSIS
  - spare required → PARTS_REQUIRED
  - revisit → REPAIR
  - complete → COMPLETED
  - customer confirm → CUSTOMER_CONFIRMATION → CLOSED

  Also:
  - each step writes one event and one socket emit
  - allocation failed path
  - closure fields populated
  - rating propagates
  - the customer view never shows jobStage
  - urgency ranking picks the nearer partner for a Critical ticket where the workload rule would pick another
- [x] Unit tests for `jobStageFor`.
- [x] Extend `e2e/ui/warrantyJourney.spec.js` (4-browser journey): the brand browser sees each stage live.

## Acceptance
- Any NCC job status change shows in the Brand Panel within a second, without reload.
- Closure data is on the ticket.
- Super Admin sees the same stage.

## Implementation Log
Implemented the pure mapping in `jobStage.js`, with `setJobStage` as the single
stage/history writer. The rules below are evaluated in this order; a later rule
cannot replace an earlier match. Forward movement is guarded, with explicit
allocation recovery, rescheduling and revisit exceptions.

| Inputs / condition | Stage |
|---|---|
| Claim Cancelled | CANCELLED |
| SR or claim Closed | CLOSED |
| SR Cancelled while claim remains active | ALLOCATION_FAILED |
| Not accepted, allocation failure flag | ALLOCATION_FAILED |
| Not accepted, provider offered | JOB_OFFERED |
| Not accepted, no provider | PARTNER_FINDING |
| SR Customer Confirmation | CUSTOMER_CONFIRMATION |
| SR Repair Completed; step repaircomplete, revisit_complete, billing, revisit_billing, revisit_payment, revisit_otp, awaitingpayment or completed | COMPLETED |
| Step ontheway or revisit_ontheway | EN_ROUTE |
| Step revisit_scheduled with a part order and no partReceivedAt | PARTS_REQUIRED |
| SR Spare Received or step revisit_arrived | REPAIR |
| SR Spare Required / Spare Ordered; step completed_pending, spare_part_required or revisit_scheduled | PARTS_REQUIRED |
| Step spareapproval, checked parts present | PARTS_REQUIRED |
| Step spareapproval, no checked parts | REPAIR |
| SR Diagnosis Done | DIAGNOSIS |
| SR Engineer Reached or step inspection | REACHED |
| SR Visit Scheduled / Reschedule / Customer NA | VISIT_SCHEDULED |
| Accepted, otherwise | PARTNER_ASSIGNED |

**Writer coverage.** Existing SR transitions continue through `syncClaimFromJob`,
which now also applies the detailed stage. The Job post-save hook calls
`syncJobStage` for travel, arrival, diagnosis, completion and revisit changes
that do not alter the SR status. Offer, decline/timeout, allocation failure,
approval/job creation, NCC replacement/reopen, hold withdrawal, cancellation
and closure write their stage explicitly. NCC and brand part-order desk writers
also synchronize the stage. Stage events retain the current SR ID, so a new
job has its own timestamps and allocation history. Acceptance now persists
`isAccepted` before the SR status transition.

**Receipt and revisit.** Existing part-order writers can set the coarse SR to
Spare Received at approval. The detailed stage remains Parts Required until
Delivered/HandedOver stamps `Job.revisit.partReceivedAt`. Revisit travel and
arrival then show En Route and Repair. The later Phase 10 will add the complete
brand parts workflow; this phase tests the existing desk receipt flow.

**Ranking.** Warranty allocation passes priority and remaining assignment/visit
SLA into the shared ranking engine. Critical tickets, or less than 25% of the
SLA window remaining, use proximity 65%, availability 20%, rating 10%, workload
5%, plus 0.2 times the existing tier bonus. Other warranty tickets use the
configured weighted score and tier bonus. Existing skill, authorization,
service area, active status and availability filters remain in place; ordinary
paid booking GPS ordering is preserved. Paused SLA uses frozen remaining time.

**Allocation and privacy.** Attempts retain SR, partner snapshot, offer time,
outcome, resolution time and reason. Replaced/held/cancelled pending offers
become withdrawn. Brand projections anonymize nonaccepted partners and use
standard outcome reasons; NCC sees the full history. A stage change writes
one brand-visible timeline/audit/domain event and a `claim:updated` brand/admin
socket notification. Existing `warranty_claim:updated` notifications continue
for compatibility. Customer payloads retain their existing coarse statuses and
do not expose jobStage or internal partner offers.

**Completion and closure.** Existing Jobs held diagnosis notes/photos and
checked spare parts. Added `completion` notes, actual workDone, photos, uploader,
time and verified OTP time, captured through the partner's existing repair
completion action. The report form is scoped to the active job and blocks
advancement while photos upload. Photo URLs must come from the configured upload storage, and job ownership is validated. Completion
copies the report and checked parts into the ticket, and adds deduplicated
`service_report` documents with uploader identity. The current legacy part
selection has no quantity field; selected entries use quantity 1.

OTP verification records confirmation time without closing the claim early.
The existing customer app confirmation closes the job/ticket; automatic closure
records method auto. Brand CCE confirmation requires tickets:edit, remarks and
a brand-visible note/contact record logged after completion, and rejects repeat
or cross-brand requests. Phase 9 will supply the full call workflow. Ratings
populate closure rating/feedback and a RATED event. Closed stamps closedAt.

**Views.** Brand detail shows the stage stepper, accepted partner card, visit,
anonymized attempts, report/photos, confirmation, rating and closure date.
Brand and NCC queues have distinct stage columns and filters. NCC detail has
full allocation attempts. Parts and billing sections remain scheduled for
Phases 10 and 13.

**Verification (2026-10-09).** All 71 backend suites / 1,024 tests passed,
including 23 new stage checks. Full regression reports were consolidated by
suite using the latest result. Local database timeouts were rerun against fresh
isolated databases; old registration/webhook event assertions now include the
stage-event contract while preserving coarse lifecycle checks. Replacement-job
history has an explicit regression assertion.

All 15 distinct browser scenarios passed across Customer 360, registration,
RBAC, warranty policy, queue/detail, brand/NCC/partner controls and the four-app
journey. The journey enters work done and notes through the partner completion
form and observes live stages, closure report and rating in the brand browser.
Frontend production build and diff whitespace checks passed. Targeted lint has
zero errors; the partner context/page retain 18 existing warnings and the build
retains its existing large-chunk warning.

Reports: `/private/tmp/crm-phase8-regression-{1..6}.json`,
`crm8-final-fixes.json`, `crm8-recovered.json`,
`crm-phase8repair-regression-{1..4}.json`, consolidated as
`/private/tmp/crm8-verified-summary.json`. Browser logs: `crm8-ui.log` and
`crm8-ui-final.log`. Build/lint: `crm8-final-build.log`, `crm8-final-lint.log`.
