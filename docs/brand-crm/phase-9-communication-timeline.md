# Phase 9: Communication and activity timeline

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §5 (CCE work), §14 · **Depends on:** Phases 6, 7

## Goal
Every customer interaction and every CCE activity is on the ticket timeline with:
- user + employee ID
- date and time
- action and remarks

CCEs can log calls (or click-to-call), close contact requests, reschedule
visits, add notes and documents, and work a "My work" queue.

## Context: read first
- ARCHITECTURE §10, §5; Phase 6 (`contactRequests`, `request-contact`).
- `backend/src/modules/calls/`:
  - `call.service.js` (Twilio relay, customer ↔ partner)
  - `callLog.model.js` (`serviceRequest` required, `initiatedBy: customer|service_provider`)
- Reschedule today: SR status `Reschedule`, partner/admin flow in `serviceRequest.service` / `job.service` (find the existing reschedule entry point and document it).
- `notifications/notification.service.js` (templates, `emit`, `emitToBrand`).

## Tasks

### Backend
- [x] `brand-crm/ticketComm.service.js` + routes on `/api/v1/brand/tickets/:id`:
  - `POST /contacts { channel, direction, outcome, durationSec?, callbackAt?, remarks, contactRequestId? }` (`tickets:edit`):
    - writes `CUSTOMER_CONTACTED` with `meta`
    - closes the referenced contact request (`status: done | failed` by outcome)
    - `callback_requested` + `callbackAt` creates a reminder notification to the CCE at that time (use the existing sweep pattern; add a `reminders` sweep or reuse the SLA sweep tick)
    - stops the **response** SLA if it's still running
  - `POST /call { to: 'customer' }` (`tickets:edit`): click-to-call. Bridges brand user ↔ customer through the existing Twilio relay when configured; otherwise 501 with `{ fallback: 'log_manually' }`.
    - `CallLog` gains `warrantyClaim`, `brandUser`, `initiatedBy: 'brand_user'`; `serviceRequest` and `serviceProvider` become optional
    - the status callback auto-writes `CUSTOMER_CONTACTED` with `durationSec` and outcome mapped from the Twilio status
  - `POST /reschedule { date, slot, reason }` (`tickets:edit`):
    - before a partner is assigned → updates `preferredVisit` (`RESCHEDULED`)
    - after → creates `RESCHEDULE_REQUESTED`, notifies the partner + Super Admin, and moves the SR to `Reschedule` through the existing transition. The partner confirms the new slot (existing flow); the confirmation writes `RESCHEDULED`.
    - document which existing endpoint the partner uses
  - `POST /documents { documents[] }` (`tickets:edit`): CCE adds documents (kind any; ≤ 10 per call) → `DOCUMENT_ADDED` (actor brand) → re-runs warranty evaluation (Phase 5).
  - `POST /notes` (existing) is kept; notes get `visibility: brand`.
- [x] Notification log: when the notification service sends anything to the ticket's customer (push / SMS / WhatsApp / email) about this ticket, append a `CUSTOMER_NOTIFIED` event (visibility brand) with the channel and template key. Hook it in one place in `notification.service` by `meta.claimId`.
- [x] `GET /api/v1/brand/my-work` (`tickets:view`) returns, for the current user:
  - tickets assigned to them (open)
  - open contact requests on them
  - callbacks due today
  - tickets they registered that are awaiting customer
- [x] Customer 360 `communication[]` (Phase 3) now reads these events across the customer's tickets.

### Brand Panel
- [x] Ticket detail action bar: **Log contact** (dialog: channel, direction, outcome, duration, callback, remarks), **Call customer** (if Twilio is enabled; shows call state), **Reschedule**, **Add document**, **Add note**.
- [x] Activity timeline: icons per type; filter chips (All, Communication, Status, Job, Parts, SLA, Billing, Notes); each row shows "{name} ({employeeId}) · {role} · {dd MMM yyyy, hh:mm a}" + remarks.
- [x] New `pages/brand-admin/MyWork.jsx` (`/brand-admin/my-work`): sidebar item first under Complaint Management for users with `tickets:edit`. Shows the counts in the badge.

### Tests
- [x] `backend/tests/brandCrmCommunication.test.js`:
  - a contact log closes the contact request and stops the response SLA
  - callback reminder fires
  - reschedule before vs after assignment
  - a document by CCE triggers warranty re-evaluation
  - customer-notified events recorded once per send
  - my-work lists exactly the user's items
  - Viewer 403 on all writes
  - click-to-call returns 501 fallback without Twilio, and with a mocked Twilio writes a CallLog + an event on callback
- [x] `e2e/ui/brandCrmCommunication.spec.js`: request contact (Warranty Exec) → CCE sees it in My Work → logs the call → the request closes, and the timeline shows both with employee IDs.

## Acceptance
- The client's timeline list (created, contacted, CCE activity, approval, partner assigned, partner updates, reschedule, parts, escalation, completion, closure) is all present with user + date + time + action + remarks. Parts and escalation events land in Phases 10 and 11; check them off there.

## Implementation Log
Implemented communication in `ticketComm.service.js`, voice relay in
`ticketCall.service.js`, and append-only notification history in
`ticketNotification.service.js`. Brand APIs remain under the existing deny-by-default
permission table. All writes require `tickets:edit`; My Work, communication
options and call-state reads require `tickets:view`. Every ticket lookup is
brand-scoped, with foreign tickets returning 404.

**Contact contract.** Channels are `phone`, `whatsapp`, `sms`, `email`,
`in_person`; directions inbound/outbound; outcomes connected/resolved,
no_answer/busy/wrong_number/failed, or callback_requested. Remarks are required;
duration is optional and bounded; callback_requested requires a future time.
A referenced contact request must belong to the ticket and remain open. Failed
outcomes close it as failed; other outcomes close it as done. Events carry the
brand actor snapshot, employee ID, roles, channel, duration and remarks.
Contact stamps `firstCustomerContactAt`, `firstBrandActionAt` if absent and
`sla.met.response`, without stopping approval/allocation/visit/resolution.
The configurable response deadline/sweep follows in Phase 11; that phase already
uses firstBrandActionAt as the first-response stop condition.

**Callbacks and My Work.** Callbacks stay on the ticket with the logging CCE,
due time and completion/reminder stamps. A successful contact completes their
already-due callbacks on that ticket; requesting another callback preserves the
new future reminder. The server sweeps every minute, checks current brand/user
and edit permission, and uses a unique notification dedupe key. Retries or
concurrent sweeps create one reminder. Closed/rejected/cancelled tickets do not
send reminders.

`GET /brand/my-work` returns independent counts and up to 100 latest tickets
per section: assigned open tickets, their open contact requests, the user's
callbacks due today (Asia/Kolkata), and tickets they registered awaiting
customer information. Callbacks can belong to the contact logger even if another
CCE owns the ticket. An unassigned ticket is handled through All Tickets and
assignment; it does not become every CCE's personal work. Sidebar badge sums the
work-category counts; My Work refreshes on live claim updates and manual refresh.

**Reschedule integration.** Before a partner accepts, the action changes only
preferredVisit. After acceptance it is available before travel starts, creates
pendingReschedule and a pending flag on Job, and uses `transitionStatus` to move
the SR to Reschedule. Engineer Accepted now also permits that transition.
Claim, job and SR changes share the existing transaction helper. The partner
and NCC receive notifications with their respective portal links; the partner
also receives `job:rescheduled`.

The existing partner Dashboard modal confirms through
`POST /service-provider/jobs/:id/respond-reschedule { action:'accept'|'reject', reason? }`.
For warranty requests this endpoint applies the proposed slot only on acceptance
and writes a partner-actor RESCHEDULED event. Rejection retains the previous
confirmed slot and accepted partner, and alerts NCC to arrange another slot.
Duplicate responses and service already in progress return 409. Travel is
blocked until the pending proposal has a response. The original partner visit
scheduler remains `/service-provider/warranty-jobs/:jobId/schedule-visit`.
Paid booking reschedule behavior is preserved.

**Voice relay.** `POST /brand/tickets/:id/call {to:'customer'}` rings the
brand user's registered phone, then bridges to the customer's phone via the
existing Twilio client/virtual number. No real phone numbers are returned.
CallLog now permits a brand_user initiator without a service provider or NCC
job and freezes the brand actor. The Dial action callback reports the customer's leg, so a busy/unanswered
customer is not marked connected just because the caller picked up. Final
signed callbacks map completed to
connected, no-answer to no_answer, busy to busy, and failures/cancellation to
failed. An early callback can locate the pre-created CallLog through its signed
callback URL before the Voice create response returns. A transaction writes the contact and callback stamp once; late status
callbacks cannot regress a completed brand call. The UI polls the scoped
`GET /brand/tickets/:id/calls/:callId` while a call is active.

Calling requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VOICE_NUMBER,
CALL_MASKING_ENABLED and API_PUBLIC_URL (public origin, no /api/v1 suffix).
The public origin is documented in `.env.example` and is used to validate Twilio
callback signatures for brand calls. Unconfigured calls return 501 with
`error.details.fallback: log_manually`; the Call customer button appears only
when configured. Live provider credentials/calling are not exercised by tests.

**Documents and notification history.** CCE uploads use the existing image/PDF/
video upload service, restrict URLs to configured storage, deduplicate attachments,
and stamp the uploader. Up to ten documents attach per action. Before approval,
proof re-runs evaluation against the original policy version and preserves an
explicit warranty override. After approval, supplementary documents attach
without rewriting the approved coverage snapshot.

The notification service logs CUSTOMER_NOTIFIED for a ticket's own customer,
with channel, template key and notification ID. In-app persistence counts as
accepted; external channels count only when their provider accepts a send.
Skipped, unconfigured or rejected sends do not fabricate delivery history;
accepted is not a read/delivery receipt. Staff/partner notifications are excluded.
The hook supports warrantyClaim and meta.claimId. A conditional atomic timeline
append deduplicates each notification/channel without changing business version
numbers, so a concurrent notification cannot invalidate an approval/contact.
The shared appendEvent/flushAudit helpers still construct, audit and publish
these events. Customer 360 reads communication events across scoped tickets and
suppresses the duplicate legacy inbox row for recorded notifications.

**Brand views.** Ticket detail has contact, conditional call, reschedule and
upload dialogs alongside notes. Activity retains its category filters and now
shows type icons, actor name/employee ID/roles, contact metadata and remarks.
My Work is the first Complaint Management item for ticket editors.

**Verification.** All 72 backend suites / 1,040 tests pass, including 16
communication cases covering contact outcomes, callback ownership/reminder
idempotency, scoped My Work, document evaluation, transactional rescheduling,
notification history and signed voice callbacks. The complete regression first
identified three legacy tests whose exact event counts/positions predated the
new customer-notified events; these assertions now select the business events
they test, and their affected suites pass on rerun. The final communication
rerun also confirms rejection restores the original slot in the partner job.

All 16 distinct browser scenarios pass across registration, policies, queue,
RBAC, detail, Customer 360 and the customer/brand/admin/partner flows. The
communication scenario checks a Warranty Executive contact request through CCE
My Work, contact logging, employee/role activity, document upload and
rescheduling. The four-app journey confirms the proposed slot through the
partner modal, then completes, OTP-confirms, closes and rates the same job.
Frontend production build passes; lint has zero errors and seven existing
warnings. Build retains its existing large-chunk warning.

Evidence: [communication screen](screenshots/phase-9-communication.png),
`brandCrmCommunication.test.js`, `brandCrmCommunication.spec.js` and
`warrantyJourney.spec.js`. Voice tests use mocked provider calls and real
signature verification; live provider calling requires the documented
configuration and was not exercised.
