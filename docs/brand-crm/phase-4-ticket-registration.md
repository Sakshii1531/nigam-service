# Phase 4: Multi-channel ticket registration (CCE / Toll-Free / Manual) + intake fields

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §1, §2, §5 (registration), §13 · **Depends on:** Phases 1–3

## Goal
A Customer Care Executive takes a Toll-Free call and works through these steps:
1. Search the mobile number.
2. Open the existing profile, or create the customer.
3. Pick or add the product.
4. Capture the complaint, address and preferred visit.
5. Raise the ticket.

The ticket is the **same** Ticket the NCC App creates, with `source` saved
automatically and `registeredBy` set to the CCE. The NCC App also gains the
missing intake fields: videos, preferred visit time and visit location.

## Context: read first
- ARCHITECTURE §2.1, §2.3, §7; README D6, D16, D17.
- `partner-warranty/ticketIntake.service.js` (`createTicket`, Phase 1) and `brand-crm/customer360.service.js` (Phase 3).
- `partner-warranty/warrantyCatalog.service.js`: the brand's covered categories and issues (`/brand/warranty-coverage`, public catalogue reads).
- `frontend/src/pages/brand-admin/RegisterComplaint.jsx` (5-step wizard, disabled in Phase 1).
- Customer app:
  - `frontend/src/pages/RaiseWarrantyRequest.jsx`, `SelectBrand.jsx`, `SelectProduct.jsx`, `SelectIssue.jsx`
  - `frontend/src/lib/partnerWarrantyApi.js`, `frontend/src/lib/uploadImage.js`
- Customer create validation: `partner-warranty/warrantyClaim.validation.js` `createClaimSchema`.

## Tasks

### Backend
- [x] `POST /api/v1/brand/tickets` (`tickets:create`). The brand comes from the token.

  Body:
  ```
  { customerId | newCustomer:{name, phone, alternatePhone?, email?},
    source: 'toll_free'|'brand_manual',
    categoryId, productTypeId?, serviceType?,
    applianceId? | product:{ modelNumber?, serialNumber?, purchaseDate? },
    issueId? | issueName,
    remarks (≥ 10 chars), priority?,
    address: addressId | {…pincode required},
    preferredVisit?: { date, slot, notes },
    documents?: [{kind,url,name}],
    approveNow?: boolean }
  ```

  Behaviour:
  - `newCustomer` → Phase 3 `createCustomer` inside the same transaction. A duplicate phone → 409 `existingId`.
  - The category must be in the brand's coverage → else 400 "Brand does not service this product".
  - `approveNow` is honoured only if the caller has `tickets:approve` (D6). It records `TICKET_CREATED` then `APPROVED` (two events), and the job is dispatched after commit.
  - `registeredBy` = actor snapshot. `assignedCce` = the registrant when `BrandSettings.cceAutoAssign === 'registrant'` (default).
  - Unlike the customer flow, model, serial, purchase date and invoice are **optional**. Missing ones lead to `warranty.status = 'Verification Required'` (Phase 5 refines this).
- [x] `GET /api/v1/brand/tickets/form-options` (`tickets:create`):
  - the brand's covered categories with product types
  - issues per category
  - service types
  - priorities
  - slots
  - the sources this user may pick
- [x] Customer app create (`POST /partner-warranty/claims`): accept `preferredVisit` (optional), `documents[].kind: 'video'` (≤ 2), and an optional `visitAddressId` / `visitAddress` that differs from the billing address (stored as `address`; ask the user to confirm the visit location).
- [x] The partner offer and job context (`claimDispatch.warrantyJobInfo`) include `preferredVisit` so the partner schedules against it. Super Admin claim detail shows it.
- [x] `assignedCce` can be changed with `POST /brand/tickets/:id/assign-cce { userId }` (`tickets:assign`). The target must be an active user of this brand. This writes a `CCE_ASSIGNED` event and notifies the assignee.

### Brand Panel: `RegisterComplaint.jsx` rewrite
- [x] Step 1 **Search**: phone input → `GET /brand/customers/search`.
  - `brand` → show the profile card, then Continue.
  - `platform` → "Existing NCC customer, new to {Brand}" (masked phone), then Continue (link).
  - `none` → inline **New customer** form (name, phone pre-filled, alt phone, email).
- [x] Step 2 **Customer and address**: pick a saved address or add a new one (pincode required, city/state auto-filled from pincode if the City master supports it; otherwise typed).
- [x] Step 3 **Product**: pick from the customer's products (Phase 3 profile) or add a new one (category → product type → model, serial, purchase date, all optional) + service type.
- [x] Step 4 **Complaint**: issue (from the catalogue, or "Other" free text), description, priority, preferred visit date/slot, uploads (invoice, warranty card, photos, video), source radio (**Toll-Free** default / Manual Entry).
- [x] Step 5 **Review**:
  - shows the warranty result that will be applied (preview endpoint below)
  - buttons "Register" and "Register & Approve" (the latter only if `can('tickets:approve')`)
  - success modal with NCCW + brand ticket no + (if approved) NCCJ, with copy buttons
- [x] `POST /brand/tickets/preview-warranty` (Phase 5 fills the real logic; here it returns the estimate) for the step-5 preview.
- [x] "New ticket" from Customer 360 jumps straight to Step 3 with the customer selected.
- [x] Remove the Phase 1 temporary banner.

### Customer app
- [x] `RaiseWarrantyRequest.jsx`:
  - "Preferred visit" date + slot picker (next 7 days; morning/afternoon/evening)
  - "Add video" upload (≤ 2, ≤ 50 MB, shows progress)
  - visit address picker
- [x] `TicketDetails.jsx` / `TrackTicket.jsx` show the preferred slot and play videos.

### Tests
- [x] `backend/tests/brandCrmRegistration.test.js`:
  - existing customer + toll-free → ticket with source, registeredBy employeeId, assignedCce, Pending Approval
  - new customer + ticket in one call; a duplicate phone → 409 and no ticket created (transaction rolled back)
  - an uncovered category → 400
  - `approveNow` without `tickets:approve` → 403; with it → NCCJ created
  - a missing serial → `Verification Required`
  - a Viewer → 403
  - the customer app with video + preferredVisit stored; a 3rd video → 400
- [x] `e2e/ui/brandCrmRegistration.spec.js`:
  - CCE: new mobile → create customer → product → complaint → Register → the ticket appears in the queue with source Toll-Free
  - Warranty Exec: Register & Approve shows NCCJ
- [x] Update `e2e/ui/partnerWarranty.spec.js` for the new optional fields (the existing flow must still pass).

## API examples
```
POST /api/v1/brand/tickets
{ "newCustomer":{"name":"Asha Rao","phone":"9876500000"}, "source":"toll_free",
  "categoryId":"…AC…", "issueName":"Water leakage from indoor unit", "remarks":"Leaks since 2 days",
  "address":{"house":"12 MG Rd","city":"Pune","state":"Maharashtra","pincode":"411001"},
  "preferredVisit":{"date":"2026-10-08","slot":"morning"} }
→ 201 { humanId:'NCCW-2026-000214', brandTicketNo:'LG-2026-000031', source:'toll_free',
        status:'Submitted', warranty:{ status:'Verification Required', reasons:['NO_SERIAL','NO_PURCHASE_DATE'] },
        registeredBy:{ name:'Neha K', employeeId:'LG-CC-014' } }
```

## Acceptance
- A Toll-Free call can be registered for a new or existing customer without duplicates.
- The ticket is indistinguishable in workflow from an NCC App ticket.
- The source, registrant and time are saved automatically.
- The NCC App captures videos and the preferred visit.

## Implementation Log
Implemented and verified (uncommitted). Full regression gate passed before Phase 5: **67 unique suites / 970 tests**. The batched CLI also selected two overlapping filename patterns; totals here deduplicate those files.

- New registration service/routes/validation provide POST tickets, form-options,
  preview-warranty and assign-cce. Token brand and current permissions determine
  scope; source and actor cannot be spoofed. New customer, saved first-visit
  address, membership, ticket, product and explicit approval/job share the caller
  transaction; customer audits, ticket effects and dispatch happen after commit.
- Phase 3 customer creation now supports a transaction owner and deferred audit;
  standalone development retains compensating cleanup. Human ID gaps after
  aborted transactions are permitted. Production atomicity requires a replica set.
- Registration rewrites the five steps using exact mobile lookup, masked platform
  matches, covered catalogue choices, saved products/addresses, optional proof,
  preferred visit, source, review and real ticket numbers. Customer 360 skips to
  Product. A missing visit address sends the user back to address capture.
- Staff proof gaps (model, serial, purchase date, invoice) give Verification Required.
  Register & Approve needs tickets:approve; incomplete proof approved explicitly
  is recorded as goodwill, never silently treated as manufacturer warranty.
- CCE assignment validates active same-brand staff, records CCE_ASSIGNED and
  notifies the assignee. A registry/template title alone does not grant registration:
  the caller needs tickets:create, plus tickets:approve for immediate approval.
- Customer claims accept preferredVisit and an optional visit-address override;
  the customer UI confirms the location, supports next-seven-day slots from server
  options and two videos with actual byte progress. Five additional photos plus the three
  proof slots and two videos stay within the ten-document intake limit. Detail/tracking play videos
  and show preferred scheduling; partner context and NCC detail receive it.
- City master has no pincode mapping, so city/state are entered explicitly.
  Creation retains CLAIM_SUBMITTED / CLAIM_APPROVED event names for existing
  domain effects and webhooks; these are the creation/approval events in the plan.
- Focused verification: registration + ticket suites **33/33 tests passed**;
  Customer 360, RBAC, partner claims and allocation also passed. Earlier assertions
  expecting manufacturer cover without an invoice were updated for the required
  verification state. Browser **7/7 passed**, including full customer service closure.
- Playable media check: a browser-recorded WebM reaches metadata-ready state
  in tracking. Local static uploads now allow cross-origin media embedding,
  while API responses retain Helmet's stricter resource policy. The upload-test
  cleanup now deletes only its own files rather than other concurrent uploads.
  Registration/static-media/upload-storage regressions: **18/18 passed**.
- Changed backend/frontend files lint cleanly; production build passes.
- Screenshots: phase-4-review.png, phase-4-success.png, phase-4-approved.png.

