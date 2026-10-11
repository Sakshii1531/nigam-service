# Phase 6: Approval workflow v2 + unified ticket queue

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §1, §3, §7 · **Depends on:** Phases 1–5

## Goal
One **Tickets** queue in the Brand Panel replaces both "All Complaints" and
"Warranty Claims". Authorised users act on a ticket with:
- Approve (warranty / goodwill)
- Reject (code + reason)
- Hold / Resume
- Request More Information
- Request Document
- Request Customer Contact

Every action records user + employee ID + date/time + remarks. Super Admin
sees the same tickets with the source and linked IDs.

## Context: read first
- ARCHITECTURE §3 (queue buckets, brand hold, rejection codes), §2.1 (`coverageDecision`); README D3, D5, D6, D7.
- `partner-warranty/brandClaim.service.js` / `.routes.js` / `.validation.js` (current approve / reject / request-info / notes; first open → Brand Review).
- `partner-warranty/claimStatus.js` (`CLAIM_TRANSITIONS`; On Hold allowed from non-terminal, admin-only today).
- `partner-warranty/adminClaim.service.js` (`hold` / `resume` pattern to copy).
- `partner-warranty/claimJob.service.js` `approveAndCreateJob`.
- Frontend:
  - `frontend/src/pages/brand-admin/WarrantyClaims.jsx`, `Requests.jsx` (to retire), `ComplaintMonitoring.jsx`
  - `frontend/src/lib/brandWarrantyApi.js` (`BRAND_TABS`, `DECIDABLE`)
  - `frontend/src/hooks/useWarrantyClaimLive.js`
- Super Admin: `frontend/src/pages/super-admin/partner-warranty/Claims.jsx`, `ClaimDetail.jsx`; `adminClaim.service.listClaims`.

## Tasks

### Backend
- [x] `brand-crm/brandTicket.routes.js` mounted at `/api/v1/brand/tickets`. Keep `/brand/warranty-claims` as an alias to the same handlers until the frontend has switched (remove the alias at the end of this phase if nothing uses it).
- [x] `GET /` (`tickets:view`):
  - filters: `bucket` (§3), `status`, `source`, `priority`, `warrantyStatus`, `categoryKey`, `city`, `state`, `pincode`, `assignedCce` (`me` supported), `registeredBy`, `slaState`, `escalated`, `from`, `to`, `q` (NCCW / brand no / NCCJ / phone / serial / customer name)
  - sort; pagination
  - `meta.counts` per bucket
  - rows carry: IDs (NCCW, brand no, NCCJ), source, customer name + masked phone, product, issue, warranty status, priority, status label, jobStage, assigned CCE, partner name, SLA next due + state, createdAt
- [x] `GET /export?…same filters` (`tickets:export`) → CSV/XLSX.
- [x] Actions (all `tickets:approve` unless noted; all take `remarks`; all record the actor snapshot incl. employeeId):
  - `POST /:id/approve { coverageDecision: 'warranty'|'goodwill', remarks? }`. `goodwill` requires remarks. `warranty` is refused with 409 when `warranty.status === 'Out of Warranty'` (use goodwill or reject). `Verification Required` needs `warranty:verify` or a prior override → otherwise 409 "Verify warranty first".
  - `POST /:id/reject { rejectionCode, reason }`: code from §3, reason ≥ 5 chars. `OUT_OF_WARRANTY` → the customer notification includes the "Book a paid service" CTA (route into the normal booking for that category).
  - `POST /:id/hold { reason }` / `POST /:id/resume { remarks? }`: before approval only (brand). SLA pause is already handled by `applySlaTransition`; verify it.
  - `POST /:id/request-info { message, documentKinds?: ['invoice','warranty_card',…] }`: **Request Document** is request-info with `documentKinds`. The customer app shows the specific upload slots.
  - `POST /:id/request-contact { reason }` → `contactRequests[]` + `CONTACT_REQUESTED`. Notifies the assigned CCE (or all users with `tickets:edit` in Customer Care if none). Closed in Phase 9 by a contact log.
  - `POST /:id/priority { priority, remarks }` (`tickets:priority`) → `PRIORITY_CHANGED`.
  - `POST /:id/notes` (`tickets:edit`) is unchanged.
- [x] Concurrency: keep `saveClaim` optimistic concurrency (409 on a double decision).
- [x] Super Admin list/detail (`adminClaim.service`): add `source`, `brandTicketNo`, `registeredBy`, `priority`, `coverageDecision`, `preferredVisit`, `warranty` (policy + reasons). Add filters `source`, `priority`, `warrantyStatus`. Rename the UI label "Warranty Claims" → "Brand Tickets" (route paths stay).
- [x] Q1 default (D5): customer-paid SRs no longer appear in any brand list. Remove the SR-based `Requests.jsx` data path. `GET /service-requests` for brand users returns only SRs linked to a ticket (`warrantyClaim != null`).

### Brand Panel
- [x] New `pages/brand-admin/Tickets.jsx` at `/brand-admin/tickets`:
  - bucket tabs with counts
  - filter bar
  - search
  - live row patching via `useWarrantyClaimLive` / `claim:updated`
  - "My tickets" toggle
  - export
  - row → ticket detail (`/brand-admin/tickets/:id`; until Phase 7 this renders the existing `WarrantyClaimDetail.jsx`, extended below)
- [x] Sidebar "Complaint Management":
  - Register Complaint → `/brand-admin/requests` (Phase 4 page)
  - All Tickets → `/brand-admin/tickets`
  - Pending Approval → `/brand-admin/tickets?bucket=pending_approval`
  - Complaint Monitoring
  - Escalations

  Remove "Warranty Claims" and the old "All Complaints". Redirect `/brand-admin/complaints` and `/brand-admin/warranty-claims[/:id]` → the new routes.
- [x] Action bar on detail:
  - Approve dialog with coverage decision radio + remarks
  - Reject dialog with code select + reason (required)
  - Hold / Resume
  - Request Info with a document-kind checklist
  - Request Customer Contact
  - Priority change

  Buttons are shown per `can()` and per status. Each decision shows "by {name} ({employeeId}) · {date time}" in the history.
- [x] Delete `Requests.jsx` (old All Complaints) and its route. Update `ComplaintMonitoring.jsx` to read `/brand/tickets` counts.

### Customer app
- [x] An info request with `documentKinds` shows labelled upload slots (`TicketDetails.jsx` / respond flow).
- [x] A rejection with `OUT_OF_WARRANTY` shows "Book a paid repair" → the booking flow for the category.

### Tests
- [x] `backend/tests/brandCrmApproval.test.js`:
  - each action's permission (CCE 403 on approve)
  - mandatory reject code + reason
  - goodwill needs remarks
  - Out-of-Warranty `warranty` approve → 409
  - Verification Required approve → 409 without verify
  - brand hold/resume before approval only (after approval → 409)
  - request-document → customer view lists the kinds
  - request-contact creates a contact request and notifies the CCE
  - actor employeeId in timeline + audit
  - parallel approve + reject → one wins, 409 for the other
  - bucket counts correct
  - every filter works
  - cross-brand 404
- [x] Update `partnerWarrantyBrand.test.js` and `e2e/ui/brandWarranty.spec.js` to the new routes/screens. `e2e/ui/brandCrmQueue.spec.js`: queue tabs, filters, approve with goodwill, reject with code, live update when another browser approves.

## API examples
```
POST /api/v1/brand/tickets/:id/reject { rejectionCode:'PHYSICAL_DAMAGE', reason:'Cracked panel visible in photo 2' }
 → 200 { status:'Rejected', timeline:[…{ action:'STATUS_CHANGED', toStatus:'Rejected',
         actor:{ name:'Vikram S', employeeId:'LG-WE-003', roles:['Warranty Executive'] }, note:'…', at }] }
GET /api/v1/brand/tickets?bucket=pending_approval&source=toll_free&assignedCce=me
```

## Acceptance
- One queue holds every source's tickets.
- All six actions work with the permission and remark rules.
- Super Admin sees source and linked IDs.
- The old SR complaint screens are gone.

## Implementation Log
- Added the canonical `/brand/tickets` queue with source/priority/warranty/location/ownership/date/SLA/escalation filters, search across all linked IDs, customer names/phones and serials, bucket counts, masked queue phones and protected CSV export. Exports reject requests above 10,000 rows instead of silently truncating; spreadsheet formulas are escaped.
- Brand actions enforce warranty versus goodwill, mandatory goodwill justification and rejection code/reason, verification permission, pre-approval hold/resume, document requests, customer contact requests and priority-change remarks. All writes use actor snapshots and optimistic concurrency. Existing claim endpoints retain compatibility while enforcing the same decision rules.
- Registration approval shares these coverage rules and checks failed approval before saving a ticket. Customer identity/ticket rollback remains covered by the Phase 4 tests.
- Contact requests notify the assigned CCE, or active Customer Care staff with ticket editing permission. Open requests move pending tickets into Awaiting Customer. Holds pause and resume the existing SLA clocks.
- Retired the SR-based Requests page and old Warranty Claims queue. Legacy page links redirect to Tickets; monitoring reads live queue counts. Brand service-request lists include only ticket-linked jobs.
- NCC lists/detail expose source, brand number, registrant, priority, warranty policy/reasons and coverage decision, with source/priority/warranty filters. Added an optional ticket reference to Escalation so pre-job open escalations can be represented and filtered.
- Customer info requests render specific document/video upload slots, and OUT_OF_WARRANTY rejection offers a paid-repair link. Fixed the city gate so existing warranty tickets remain accessible in unserved cities.
- Focused compatibility checks: 116 tests passed; final shared-registration/approval checks: 23 passed. All 10 CRM/customer browser scenarios passed; existing brand, NCC and partner scenarios passed. Full backend gate: 69 suites / 998 tests passed; the four-app warranty journey passed. Legacy rejection fixtures now supply required reason codes. Frontend build, changed-code lint and diff checks passed.
