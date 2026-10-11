# Phase 1: Unified ticket foundation

**Status:** ✅ Done (2026-10-06) · **Layer:** Backend · **Delivers:** client §1, §7, §14, §19 (foundation) · **Depends on:** nothing

## Goal
Make `WarrantyClaim` the single master **Ticket** for every source:
- one creator function
- source, IDs, priority, CCE and actor snapshot in place
- the brand path that creates `ServiceRequest` complaints directly is removed

There is no UI work in this phase (the existing screens must keep working).

## Context: read first
- ARCHITECTURE §2 (ticket fields), §2.3 (`createTicket`), §5 (actor snapshot, single writer); README D1–D4, D10, D16, D17.
- `backend/src/modules/partner-warranty/`:
  - `warrantyClaim.model.js`
  - `warrantyClaim.service.js` (`createClaim` at ~L160 does customer creation: address, warranty estimate, SLA start, timeline)
  - `claimTimeline.js` (`appendEvent`, `flushAudit`, `saveClaim`)
  - `claimStatus.js`
- `backend/src/modules/shared/idGenerator.js` (`generateHumanId`, per-prefix yearly counters); `counter.model.js`.
- `backend/src/modules/service-requests/serviceRequest.routes.js` `POST /` (brand-admin create branch, to remove).
- `backend/src/modules/shared/fileUpload.js` (mime list, 10 MB limit).
- `backend/src/modules/auth/user.model.js` (no `employeeId` yet); `super-admin/auditLog.model.js`.
- Tests helper: `backend/tests/helpers/partnerWarranty.js`.

## Tasks

### Model and IDs
- [x] `WarrantyClaim`: add the §2.1 fields:
  - `source` (required, immutable, enum), `sourceRef`, `brandTicketNo`
  - `customerSnapshot`, `registeredBy`, `assignedCce`
  - `serviceType` (default `repair`), `priority` (default `Normal`), `preferredVisit`
  - `jobStage`, `jobStageAt`
  - `contactRequests`, `holdReason`, `heldBy`, `closure`, `billingLine`, `coverageDecision`, `rejectionCode`
- [x] `WarrantyClaim`: make `issue` optional when `issueName` is given.
- [x] `WarrantyClaim`: replace `warrantyCheck` with `warranty` (§2.1). Clean slate (D1): update every reader (`grep -rn warrantyCheck backend frontend`).
- [x] Add the new indexes from §2.1.
- [x] `documents[].kind` += `video`, `service_report`, `other`.
- [x] `Brand.ticketPrefix` (unique, uppercase 2–6 chars). Default it on brand create from the name, de-duplicated (`LG`, `SAMS`, `SAMS2`…).
- [x] `generateBrandTicketNo(brand)` → `{prefix}-{YYYY}-{######}`, using a per-brand counter key in `Counter` (`brandTicket:{brandId}:{year}`).
- [x] `User.employeeId` (String, optional). Unique per brand: a partial unique index on `{brand, employeeId}` for `role: brand_admin`.

### Actor snapshot and single writer
- [x] `brand-crm/actor.js`: `actorFromUser(userDoc, kind)` and `actorFromReq(req)` → `{kind, user, name, employeeId, roles, department}`. Roles are names from `assignedRoles`.
- [x] `claimTimeline.appendEvent`: accept and store the full snapshot (`actor.employeeId`, `actor.roles`). Keep the old `{kind, user, name}` input working.
- [x] `AuditLog`: add `brand`, `actor` (snapshot), `meta`. `flushAudit` sets `brand = claim.brand`.
- [x] `shared/auditLog.js`: add `recordAction({ brand, entityType, entityId, action, actor, reason, meta })` for non-ticket entities (used from Phase 2 on).
- [x] New timeline action constants (ARCHITECTURE §5 list) in `claimStatus.js` or a new `ticketActions.js`.

### One creator
- [x] New `partner-warranty/ticketIntake.service.js` with `createTicket(input, ctx)`, implementing §2.3 steps 1–8. Steps 1, 3, 7 and 8 are minimal in this phase:
  - customer must already exist (creation comes in Phase 3)
  - warranty is the existing estimate, mapped to the new `warranty` shape (`Unknown` → `Verification Required`); the policy engine comes in Phase 5
  - OwnedAppliance upsert is stubbed until Phase 3
  - approval routing only checks `BrandSettings.autoApproveSources` (add the field, default `[]`)
- [x] Refactor `warrantyClaim.service.createClaim` to call `createTicket(…, { source: 'ncc_app', actor: customerActor })`. Behaviour and response must be unchanged. **All partner-warranty tests must stay green.**
- [x] `customerSnapshot` is filled from the customer `User` (name, phone, email) at creation.

### Retire the second system (D4)
- [x] Remove the brand-admin branch of `POST /api/v1/service-requests` (route + `createServiceRequestSchema` if unused elsewhere). A brand user now gets 404/405 there.
- [x] Keep `RegisterComplaint.jsx` compiling. Show a temporary banner, "Registration moves to the new ticket flow (Phase 4)", and disable the submit button. Leave a TODO naming Phase 4.
- [x] Update `e2e/api/brandAdmin.spec.js` and `backend/tests/brandAdmin.test.js` cases that relied on brand SR creation (delete or convert them to `createTicket`).

### Uploads (D17)
- [x] `fileUpload.js`: allow `video/mp4`, `video/webm`, `video/quicktime` with a 50 MB limit (images and PDFs stay at 10 MB). Videos are not converted to WebP. Add a validation: ≤ 2 `video` documents per ticket.

### Seed and fixtures
- [x] `scripts/seed.js`: give the seeded brands a `ticketPrefix` (LG, SAMS…). Give seeded brand users an `employeeId`.
- [x] New `backend/tests/helpers/brandCrm.js`:
  - re-export the partnerWarranty kit
  - `brandUser(brand, { roles, employeeId })`
  - `ticketInput(overrides)`
  - `createTicketAs(actor, input)`

### Tests: `backend/tests/brandCrmTicket.test.js`
- [x] `createTicket` for each source sets `source`, `brandTicketNo` (per-brand sequence, year in the ID) and `customerSnapshot`.
- [x] `registeredBy` is null for `ncc_app` and a snapshot with `employeeId` for `toll_free`.
- [x] `source` cannot be changed after creation.
- [x] Two brands → independent brand counters; NCCW stays globally unique.
- [x] The timeline event has an actor snapshot with employeeId. The `AuditLog` row has `brand` + `actor`.
- [x] `autoApproveSources: ['toll_free']` → the ticket is approved and the NCCJ job is created in the same call.
- [x] A brand user calling `POST /service-requests` → 404/405.
- [x] Video upload accepted at 20 MB, rejected at 60 MB. A third video is rejected.
- [x] The full partner-warranty suites still pass.

## API examples
```
(no new HTTP API this phase; customer POST /partner-warranty/claims unchanged)
claim after create → { humanId:'NCCW-2026-000001', brandTicketNo:'LG-2026-000001', source:'ncc_app',
                       registeredBy:null, priority:'Normal', warranty:{ status:'In Warranty', … } }
```

## Acceptance
- Every ticket has a source, an NCCW ID and a brand ticket number, and is created through `createTicket`.
- No code path lets a brand create a `ServiceRequest` directly.
- Timeline and audit entries carry the full actor snapshot.
- Backend suite green.

## Implementation Log

**Done 2026-10-06.** Not committed (waiting for the go-ahead).

### What changed, in one paragraph
Every ticket is now created by `partner-warranty/ticketIntake.service.js`
`createTicket(input, ctx)`. The customer app's `createClaim` keeps only its
channel rules: the catalogue selection, the mandatory invoice, own-upload URLs
and a purchase date not in the future. It then calls `createTicket` with
`source: 'ncc_app'`.

A ticket now carries:
- `source` (immutable)
- `brandTicketNo` (`LG-2026-000001`, per brand per year)
- `customerSnapshot`
- `registeredBy` and `assignedCce` (actor snapshots with employee ID and role names)
- `priority`, `serviceType`, `preferredVisit`
- the new `warranty` block (which replaces `warrantyCheck`)
- every field later phases fill: `jobStage`, `closure`, `contactRequests`, `coverageDecision`, `rejectionCode`, `billingLine`

Timeline events and `AuditLog` rows store the full actor snapshot. Audit rows
also carry `brand`. The brand path that created `ServiceRequest` complaints
directly (`POST /api/v1/service-requests`) is gone, and the Register Complaint
screen is paused behind a banner until Phase 4.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/ticketIntake.service.js` | **new**: `createTicket`, `estimateWarranty`, `findOpenDuplicate`, `sourceLabel`, auto-approval (D6) |
| `backend/src/modules/partner-warranty/ticketConstants.js` | **new**: sources, priorities, service types, warranty statuses, coverage decisions, rejection codes, job stages, slots, document kinds, `MAX_TICKET_VIDEOS` |
| `backend/src/modules/brand-crm/actor.js` | **new**: `snapshotOf`, `actorFromUser`, `actorFromReq`, `SYSTEM_ACTOR` |
| `backend/src/modules/partner-warranty/warrantyClaim.model.js` | ticket fields (§2.1), actor snapshot sub-schema, timeline `meta`, new document kinds, 5 new indexes (unique `{brand, brandTicketNo}`) |
| `backend/src/modules/partner-warranty/claimStatus.js` | 23 new timeline actions; actor kind `integration` |
| `backend/src/modules/partner-warranty/claimTimeline.js` | `appendEvent` stores the snapshot + `meta`; `flushAudit` writes `brand`, `actor`, `meta` |
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` | `createClaim` → `createTicket`; video cap on add-documents / info response; customer actor via `actorFromUser` |
| `backend/src/modules/partner-warranty/warrantyClaim.validation.js` | customers may attach `video` documents |
| `backend/src/modules/partner-warranty/brandClaim.service.js` | views: `source`, `brandTicketNo`, `priority`, `warrantyStatus` / `warranty`, `registeredBy`; timeline `by.employeeId`; brand actor = full snapshot |
| `backend/src/modules/partner-warranty/adminClaim.service.js` | detail: `warranty`, `source`, `brandTicketNo`, `registeredBy` |
| `backend/src/modules/super-admin/brand.model.js` | `ticketPrefix` (+ `derivePrefix`, pre-validate hook), `billing` profile |
| `backend/src/modules/brand-admin/brandSettings.model.js` | `autoApproveSources`, `cceAutoAssign` |
| `backend/src/modules/auth/user.model.js` | `employeeId`, `department`; unique `{brand, employeeId}` for brand users |
| `backend/src/modules/super-admin/auditLog.model.js` | `brand`, `actor`, `meta` |
| `backend/src/modules/shared/auditLog.js` | `logAudit` takes `brand/actor/meta`; new `recordAction` |
| `backend/src/modules/shared/idGenerator.js` | `generateBrandTicketNo` |
| `backend/src/modules/shared/fileUpload.js` | mp4/webm/mov up to 50 MB; other files still 10 MB; Cloudinary `resource_type: video` |
| `backend/src/middleware/errorHandler.js` | multer errors → 400 (an oversized file used to be a 500) |
| `backend/src/modules/service-requests/serviceRequest.routes.js` / `.validation.js` | brand `POST /` and `createServiceRequestSchema` removed |
| `backend/scripts/seed.js` | prefixes `DEMO` / `SDB`, employee IDs `DEMO-001` / `SDB-001` |
| `frontend/src/pages/brand-admin/RegisterComplaint.jsx` | paused (banner + disabled submit, TODO Phase 4) |
| `frontend/src/pages/brand-admin/WarrantyClaims.jsx`, `WarrantyClaimDetail.jsx`, `super-admin/partner-warranty/ClaimDetail.jsx` | read `warrantyStatus` / `warranty` instead of `warrantyCheck`; amber for Verification Required |
| `backend/tests/helpers/brandCrm.js` | **new** kit: `brandUser(brand, {employeeId, name, roles, department})`, `ticketInput(w, cust, overrides)`, `createTicketAs(user, input, source)` |
| `backend/tests/brandCrmTicket.test.js` | **new**: 21 tests |
| `backend/tests/brandAdmin.test.js` | the 3 brand-SR-create tests replaced by one "route is gone" test (the file's other, pre-existing uncommitted change was left alone) |
| `backend/tests/partnerWarranty{Model,Claim,Brand,Admin}.test.js` | `source` on the direct model create; `warrantyCheck` → `warranty` / `warrantyStatus` |

### Decisions and deviations from the plan
- **Creation action name.** A ticket from any source is still created with the timeline action `CLAIM_SUBMITTED`, not a new `TICKET_CREATED`. The event carries `meta.source`, and its note says "Registered via Toll-Free call" for staff sources. Notifications, domain events and webhooks key off `CLAIM_SUBMITTED`, so renaming it would have broken the partner-warranty CRM events for nothing. ARCHITECTURE §5 is updated.
- **`ticketPrefix` is not a unique index.** The pre-validate hook keeps prefixes unique on a best-effort basis (`SAMS`, `SAMS2`). A DB-unique index would let two brands created at the same moment fail. Ticket numbers are unique per brand regardless, so a rare clash costs readability only. Brands saved before prefixes existed get one lazily on their first ticket.
- **Auto-approval (D6) only fires for In Warranty tickets.** Verification Required and Out of Warranty always wait for a person.
- **Duplicate-serial check moved into `createTicket`.** It now applies to every source. The customer app keeps its original wording; staff sources read "There is already an open ticket…".
- **`warranty` with no purchase date** → `Verification Required` with reason `NO_PURCHASE_DATE`. An expired one → `Out of Warranty` with `EXPIRED`. The Phase 5 policy engine replaces `estimateWarranty`.
- **`User.department`** was added now, alongside `employeeId`, because the actor snapshot needs it. Phase 2 adds the UI and validation.
- **Video test size.** The upload test uses a 12 MB video and a 12 MB PDF (not 20 MB): that's enough to prove the per-type limit and keeps the test fast. 51 MB → 400.
- **The e2e API specs never created brand ServiceRequests,** so `e2e/api/brandAdmin.spec.js` needed no change.

### Verification
- `tests/brandCrmTicket.test.js`: **21/21 passed**.
- Full backend suite (`npm test -- --forceExit`): **63 suites, 916 tests passed**. This needed `NODE_OPTIONS=--max-old-space-size=6144`. With Node's default ~2 GB heap, the single `--runInBand` process ran **out of memory after ~60 suites**: no test failed, the process died before the last three suites (`brandCrmTicket`, `partnerWarrantyJourney`, `partnerWarrantyModel`), which then passed 39/39 on their own. Not bisected against the pre-Phase-1 tree. The suites that ran before the crash don't include the new ones, so it looks like cumulative memory growth across suites rather than this phase. Worth confirming.
- Browser (`E2E_UI_PORT=5299`): `brandWarranty`, `adminWarranty`, `partnerWarranty` → **3/3 passed**.
- API (Playwright): `brandAdmin`, `partnerWarranty`, `serviceFlow` → **20/20 passed**.
- ESLint clean on every changed backend and frontend file.
- Local MongoDB was stopped and `brew services start` failed (launchctl exit 5), so `mongod --config /opt/homebrew/etc/mongod.conf` was started in the background for the runs.

### Notes for Phase 2
- `actorFromUser` resolves role **names** from `assignedRoles`. Phase 2's templates will make these meaningful ("Customer Care Executive", …).
- `recordAction({ brand, entityType, entityId, action, actor, meta })` is ready for role, user and team audit.
- `User.employeeId` and `department` exist. Phase 2 adds them to the brand user create/edit API and screens.
