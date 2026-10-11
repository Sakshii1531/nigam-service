# Phase 10: Spare parts connection

**Status:** ✅ Complete · **Layer:** Full stack + Partner app · **Delivers:** client §10, §14 (parts events), §20 (Parts section) · **Depends on:** Phases 6–8

## Goal
Partner App → Parts Request → NCC/Brand Approval → Dispatch → Received →
Installed, all linked to the ticket. The Brand Panel sees, per part:
- part and part number
- quantity
- ticket ID
- technician
- approval status
- dispatch status
- installation status

## Context: read first
- README Q4 (default approval rule); ARCHITECTURE §5 (PART_* events), §12 (approved brand-payable parts feed billing).
- `backend/src/modules/service-provider/partOrder.model.js`: statuses `Pending, Approved, Ready to Hand Over, Handed Over, Dispatched, Delivered, Rejected`; `customerApprovalStatus`; `fulfillmentType in_stock|procurement`; links `job` only.
- `service-provider/job.service.js`:
  - `requestSparePart` (~L1069): creates PartOrders, job → `completed_pending`, SR → Spare Required/Ordered
  - `submitSpareParts` (~L984)
- `booking/booking.service.js` `respondToPartRequest` (customer approval for paid jobs).
- `super-admin/adminPartOrder.service.js` (admin queue + `updatePartOrderStatus`).
- `brand-admin/brandInsights.service.js` `listBrandPartOrders` / `updateBrandPartOrderStatus` (walks PartOrder → Job → SR → brand); `frontend/src/pages/brand-admin/PartRequests.jsx`.
- `super-admin/sparePartCatalog.model.js` (part numbers).

## Tasks

### Backend
- [x] `PartOrder` additions:
  - `warrantyClaim` (indexed), `serviceRequest`, `brand` (indexed; denormalised for direct brand queries)
  - `partNumber` (from catalogue/SKU)
  - `approval: { required: ['brand'|'ncc'], brand: { status, by: ActorSnapshot, at, remarks }, ncc: {…} }`
  - `payer: 'brand'|'customer'|'ncc'`
  - statuses += `Received` (by partner) and `Installed` (by partner, with optional photo)
  - `receivedAt`, `installedAt`, `installPhotoUrl`
  - `statusHistory[]: { status, at, actor }`
- [x] On `requestSparePart` for a **warranty job** (`sr.warrantyClaim`):
  - set the links and `brand`
  - compute `payer` from `claim.warranty.policy.coverage.partsCovered` + `coverageDecision` (goodwill → brand)
  - set `approval.required` per Q4: brand approval when payer is brand and the price ≥ `BrandSettings.partsApprovalThreshold` (default 0, meaning always); NCC approval always for stock/dispatch
  - **skip customer approval** when payer is brand
  - write `PART_REQUESTED` on the ticket; notify the brand's Spare Parts users (`parts:approve`)
- [x] Brand routes `/api/v1/brand/parts` (replacing `/brand/part-orders`):
  - `GET /?status&approval&ticket&q&from&to` (`parts:view`): rows include ticket NCCW/brand no, NCCJ, technician name, part, part number, qty, price, payer, approval/dispatch/install status
  - `POST /:id/approve { remarks? }` / `POST /:id/reject { reason }` (`parts:approve`): brand approval only; the NCC side moves it on through the existing admin flow
- [x] Super Admin `adminPartOrder`: only acts once the required brand approval is `Approved`, else 409 "Awaiting brand approval". Shows the brand approval state.
- [x] Partner app endpoints (existing job routes): `POST /jobs/:id/parts/:partOrderId/received` and `/installed { photoUrl? }`. Installed is allowed only after Received (or Handed Over for in-stock). The revisit flow continues as today.
- [x] Every part status change → ticket timeline (`PART_APPROVED`, `PART_REJECTED`, `PART_DISPATCHED`, `PART_RECEIVED`, `PART_INSTALLED`) + `claim:updated` + `PART_STATUS_CHANGED` domain event. Parts Required / Repair job stages (Phase 8) stay consistent.
- [x] Ticket detail `parts[]` section is populated (Phase 7 contract).
- [x] Fix the known label bug class: parts linked to brands by name (`Claim.brand` string) must not be used for warranty jobs. Use `PartOrder.brand`.

### Brand Panel
- [x] `PartRequests.jsx` rewritten on `/brand/parts`:
  - tabs Awaiting brand approval / In progress / Installed / Rejected
  - columns as listed in the goal
  - approve/reject dialogs
  - export
- [x] Ticket detail **Parts** section: per-part stepper Requested → Approved → Dispatched/Handed over → Received → Installed, with timestamps and actors.

### Partner app
- [x] On the active job (`frontend/src/pages/service-provider/…` job flow): "Mark part received" and "Mark installed" (+ photo) buttons for each part order. Find the revisit screens and document the file names in the log.

### Super Admin
- [x] Part orders list: brand approval column + filter. Actions are disabled until the brand approves when required.

### Tests
- [x] `backend/tests/brandCrmParts.test.js`:
  - warranty job part → brand approval required, customer approval skipped, payer brand
  - below threshold → NCC only
  - admin dispatch blocked until brand approval
  - received → installed order enforced
  - each change writes a ticket event + emit
  - Spare Parts role can approve; CCE can't
  - Brand B can't see Brand A parts
  - paid (non-warranty) jobs are unchanged (existing `partRequestApproval.test.js` stays green)
- [x] `e2e/ui/brandCrmParts.spec.js`: partner requests → brand approves → admin dispatches → partner receives + installs → brand ticket shows the full stepper.

## Acceptance
- The full parts chain is visible on the ticket and in the parts list with all eight attributes.
- Brand approval is enforced when the policy makes the brand the payer.

## Implementation Log
Implemented `brand-crm/ticketParts.service.js` and `ticketParts.routes.js`.
Warranty part requests now carry direct ticket, SR and Brand ObjectId links,
part number, payer, independent brand/NCC approvals, status history and receipt/
installation evidence. Catalogue code is resolved from a matching SKU/code;
manual part numbers are retained when no catalogue match exists.

**Approval and payer.** The ticket's frozen original coverage determines payer:
goodwill is brand-paid; warranty with partsCovered=true is brand-paid; otherwise
the customer pays. Brand approval is required when the **line total**
(unit price × quantity) reaches `BrandSettings.partsApprovalThreshold`, default
zero. NCC approval always remains required. Brand-paid orders skip customer
consent, but do not skip either required desk approval. The threshold is editable
in Brand Settings → Service Configuration by settings editors only.

Customer-payable warranty parts have their own explicit consent flow because
a warranty ticket does not have a paid Booking. The customer is notified and
can approve/decline the quoted total in Claim Details through
`GET /partner-warranty/claims/:id/parts` and
`POST /partner-warranty/claims/:id/parts/:partId/respond {approved}`.
Foreign tickets return 404; duplicate responses return 409. This records consent;
customer invoicing/collection remains in the later billing phase.

**Ownership and fulfillment.** Brand `GET /brand/parts` supports status, approval,
section, ticket, part search, date range and pagination. Brand decisions use
`POST /brand/parts/:id/approve` or `/reject` with employee actor snapshots;
rejection requires a reason. CCE cannot approve, and foreign brands receive 404.
The legacy brand fulfillment endpoint rejects warranty orders, so it cannot
bypass the NCC desk. Warranty requests no longer create name-linked FOC Claims.
Paid/AMC legacy request behavior is kept on its existing path.

NCC uses the existing `PATCH /super-admin/part-orders/:id`, with required brand
approval checked before any fulfillment action. Procurement follows Pending →
Approved → Dispatched → Delivered; stock follows Pending → Approved → Ready to
Hand Over → Handed Over. Skips, repeated actions and terminal changes return
409. Dispatch does not release the warranty revisit. The partner acknowledges
receipt through `POST /service-provider/jobs/:id/parts/:partOrderId/received`;
installation uses `/installed {photoUrl?}`, only after Received or stock Handed
Over. Photos must be uploaded through the existing storage service. Receipt is
allowed from Dispatched, Delivered or Handed Over; it is the partner's actual
acknowledgment, independent of a carrier delivery status.

The job remains PARTS_REQUIRED until every non-rejected part is received/handed
over. Actual receipt schedules the existing revisit, and installation preserves
any visit already in progress. Repair completion requires all non-rejected
orders to be Installed. If every request is rejected, diagnosis is reopened so
the partner can request the correct replacement or continue without that part.
Multi-part and concurrent decision/request guards are covered in tests.

**Timeline and live updates.** Each request/approval/rejection/fulfillment/
receipt/installation adds a PART_* ticket event through appendEvent/persistClaim/
flushAudit and creates a PART_STATUS_CHANGED domain event with structured part
metadata. Transactional writes cover ticket, part, job and SR on replica sets;
the existing transaction helper retains its documented standalone fallback.
Audits, notifications and socket updates run after commit. Brand and NCC receive
claim:updated, and the partner receives job:updated plus an in-app notification.
Part requests notify current active brand users with parts:approve only.

**Views.** Brand PartRequests has Awaiting brand approval / In progress /
Installed / Rejected sections, scoped filters, pagination, approve/reject dialogs
and CSV export of all filtered pages with formula-safe cells. Ticket detail
populates parts with the requested attributes and a timestamped actor history.
The NCC list shows/filters brand approval and disables blocked actions. Partner
`ActiveJob.jsx` mounts `job-flows/WarrantyParts.jsx` to request, receive, optionally
upload a photo, and install each part. The existing revisit screens remain in
`ActiveJob.jsx` (revisit_scheduled, revisit_ontheway, revisit_arrived and
revisit_complete); their real state machine is reused.

**Existing data upgrade.** Before releasing against an existing database,
preview `node scripts/backfillWarrantyParts.js` from backend, then apply with
`--apply` during the release. The idempotent migration resolves legacy orders
through Job → SR → WarrantyClaim and uses the claim's Brand ObjectId, preserving
fulfillment state and customer consent. It never invents a historical brand
approval, receipt time or actor; required brand approval remains Pending even
if NCC previously dispatched the order. Such orders appear in Awaiting brand
approval and can be approved before the next action. NCC/legacy brand routes
refuse unupgraded warranty orders rather than bypassing the new gates. Paid
orders remain untouched. Only isolated test databases were used here; the
application database has not been migrated.

**Verification.** All 73 backend suites / 1,051 tests pass. The 11 new parts
cases cover both payers, line-total threshold, brand/NCC separation, warehouse
and procurement steps, scoping/roles, rejection recovery, concurrent decisions
and requests, multi-part revisit/completion guards, history/domain events, and
legacy migration dry-run/idempotency. Existing paid part approvals pass unchanged.
The older stage and warranty lifecycle scenarios now exercise required approvals,
receipt and installation before completing the repair; their suites pass. A
parallel home-section setup timeout passed on the focused rerun with a larger
setup budget. Every backend suite has a passing final result.

All 17 distinct browser scenarios pass across CRM, customer, brand, NCC and
partner apps. `brandCrmParts.spec.js` requests a part through the partner screen,
checks NCC is blocked, approves as Spare Parts staff, approves/dispatches as NCC,
receives/installs as the partner, uploads an installation photo, opens the stored
photo link, checks ticket history/employee identity and exports the Installed
list. The existing four-app completion/confirmation/closure/rating journey and
partner visit/payout journey also pass. The parallel rerun hit transient UI waits;
the final parts and partner scenarios pass sequentially, and the photo journey
passes in its final rerun.

Frontend production build passes. Full frontend lint reports zero errors with
154 existing warnings; lint of the modified frontend files has zero errors and
14 existing warnings. The new parts components are warning-free. The existing
large-chunk build warning remains. `git diff --check` passes.

Evidence: [ticket parts history](screenshots/phase-10-parts.png),
`backend/tests/brandCrmParts.test.js`, `brandCrmJobStage.test.js`,
`partRequestApproval.test.js`, `partnerWarrantyJob.test.js`,
`partnerWarrantyJourney.test.js`, and `e2e/ui/brandCrmParts.spec.js`.
