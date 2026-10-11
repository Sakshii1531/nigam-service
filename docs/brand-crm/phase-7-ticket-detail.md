# Phase 7: Ticket detail page (single source of truth)

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §20 (shell + 7 of 11 sections) · **Depends on:** Phase 6

## Goal
One Brand Panel page shows the complete history of a ticket. Sections:
- Ticket
- Customer
- Product
- Warranty
- Complaint
- Approval
- NCC Job
- Parts
- Activity
- Billing
- Closure

This phase builds the page, the aggregated detail API, and the first seven
sections. Parts (Phase 10), Billing (Phase 13), Closure and the live job stage
(Phase 8) plug into placeholders built here.

## Context: read first
- ARCHITECTURE §2.1, §4, §5.
- `partner-warranty/brandClaim.service.js` `getClaim` (brand projection; first open → Brand Review).
- `frontend/src/pages/brand-admin/WarrantyClaimDetail.jsx` (current sections: Product & issue, Information requests, History, Customer, Service job, Internal note), `frontend/src/lib/partnerWarrantyFormat.js`.
- Super Admin `frontend/src/pages/super-admin/partner-warranty/ClaimDetail.jsx` (reference for the SLA table and audit trail).

## Tasks

### Backend
- [x] `GET /api/v1/brand/tickets/:id` (`tickets:view`) returns a **sectioned** payload (stable contract, documented in the log):
  ```
  { ticket:{ id, humanId, brandTicketNo, source, sourceRef?, status, statusLabel, priority, bucket,
             createdAt, registeredBy, assignedCce, sla:{ stages:[{key, dueAt, metAt, state, remainingMs}] }, flags },
    customer:{ id, humanId, name, phone, alternatePhone, email, address, profileUrl },
    product:{ category, productType, modelNumber, serialNumber, purchaseDate, serviceType, applianceId },
    warranty:{ status, reasons, expiresOn, policy:{ name, version, coverage }, verifiedBy, overrideNote },
    complaint:{ issueName, remarks, preferredVisit, documents:[{kind,url,name,uploadedBy,uploadedAt}] , infoRequests, contactRequests },
    approval:{ decision:'approved'|'rejected'|null, coverageDecision, by:ActorSnapshot, at, remarks, rejectionCode, reason, hold },
    job:{ nccJobId, jobStage, jobStageAt, partner:{ name, phone (after assignment), photo, rating }, technician, visit, allocation:{ attempts, failed } } | null,
    parts:[],            // Phase 10
    billing:null,        // Phase 13
    closure:{ serviceReport, customerConfirmedAt, confirmationMethod, rating, feedback, closedAt } | null,  // Phase 8 fills
    activity:[TimelineEvent (brand-visible), newest first] }
  ```
- [x] `GET /api/v1/brand/tickets/:id/activity?type=` for a filtered/paginated timeline (types: status, communication, job, parts, sla, billing, notes).
- [x] Opening a Submitted ticket still moves it to Brand Review, and also stops the **response** SLA (Phase 11 wires the SLA; here, record `firstBrandActionAt`).

### Brand Panel
- [x] New `pages/brand-admin/TicketDetail.jsx` at `/brand-admin/tickets/:id`.
  - **Layout:**
    - header strip: NCCW · brand no · NCCJ (copyable), source chip, status, priority, SLA countdown, assigned CCE, action bar from Phase 6
    - left column: Customer, Product, Warranty, Complaint (+ documents gallery with image/PDF/video viewers), Approval
    - right column: NCC Job, Parts, Billing, Closure
    - full-width Activity timeline with type filter chips
  - Every section has an empty state that says when it fills, e.g. "Billing appears once the job is completed".
  - Live: subscribe to `claim:updated` and refetch the changed sections.
  - Print / "Download ticket summary (PDF)": use the browser print stylesheet; no server PDF.
- [x] Retire `WarrantyClaimDetail.jsx`. `/brand-admin/warranty-claims/:id` redirects.
- [x] Customer name links to Customer 360 (Phase 3); NCCJ shows partner details only after assignment.

### Tests
- [x] `backend/tests/brandCrmTicketDetail.test.js`:
  - payload sections present for Submitted / Approved / Closed tickets
  - internal (NCC-only) timeline events are excluded
  - partner phone is hidden before assignment
  - cross-brand 404
  - the activity filter works
- [x] `e2e/ui/brandCrmTicketDetail.spec.js`: all section headings render; the documents viewer opens a video; the live status change updates the header without reload.

## Acceptance
- One page shows the full ticket history with every section present (some empty until their phases).
- No data on it is hardcoded.

## Implementation Log
- Canonical GET `/brand/tickets/:id` returns exactly the eleven top-level sections in the documented contract. Lists/documents/info/contact requests use explicit brand projections; API key IDs and arbitrary event metadata are omitted. Offered partner identity and phone remain hidden until acceptance; internal timeline events are excluded.
- GET `/brand/tickets/:id/activity` supports the seven documented type filters plus page/limit, newest first. Brand actor names, employee IDs and role snapshots are retained. Legacy warranty-claim detail remains a flat compatibility projection.
- Opening Submitted records `firstBrandActionAt` once while transitioning to Brand Review, including through the legacy reader. Phase 11 owns the separate response deadline wiring.
- Replaced the old page with `TicketDetail.jsx`: all eleven sections, Customer 360 link, copyable IDs, live countdown/action bar, labelled document gallery with video/image preview and PDF opening, activity filters/pagination, internal note, and browser print stylesheet. Parts and billing retain the planned empty states for Phases 10/13.
- Focused section/privacy/opening tests and route permission coverage passed. Frontend build and changed-page lint passed. Existing queue/policy/brand/four-app browser scenarios passed; new detail-browser and full backend regression gates are running.

- Final gate: all 70 backend suites / 1,001 tests passed, with a final focused contract rerun after appliance/actor projection refinements. All 15 applicable browser scenarios passed across runs, including real WebM playback, live detail header, queue/policy/registration/customer/RBAC and the four-app journey. Rendered screenshot inspected; build/lint/diff checks passed.
