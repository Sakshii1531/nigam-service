# Phase 7 — Status sync + tracking + realtime

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #4, #12, #13

## Goal
Whatever happens on the Service Job shows up on the claim — for customer,
brand and admin — immediately.

## Tasks
- [ ] `claimJob.syncClaimFromJob(srId)` per ARCHITECTURE §9 (forward-only mapping of SR status + Job step → claim status)
- [ ] Call it from `transitionStatus`, `assignServiceProvider`, `declineAssignment`, `acceptJob`, `simpleTransition` (job steps), payment/close paths — wrapped so a sync failure is logged, never breaks the partner's action
- [ ] Visit slot: when the partner schedules, store `visit: { date, slot }` on the claim (customer-visible)
- [ ] Socket rooms: brand-admin sockets auto-join `brand:{brandId}`; super-admin sockets join `admins`; emit `warranty_claim:updated` `{ id, humanId, status, statusLabel }` to `user:{customer}`, `brand:{brand}`, `admins`
- [ ] `GET /partner-warranty/claims/:id/track` — customer-labelled stage list (done/current/pending with timestamps) + partner card once assigned
- [ ] Tests `partnerWarrantySync.test.js` walking a job through every step and asserting claim status + timeline + emitted events

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
_Filled in when the phase is done._
