# Phase 1 — Groundwork: data model, IDs, status machine, bug fixes

**Status:** ✅ Done (2026-09-29) · **Layer:** Backend · **Delivers:** #2, #5, #8 (IDs), #17 (foundation)

## Goal
Create the entities everything else hangs off, with the rules enforced in one
place, and fix the two existing bugs that would leak into this flow.

## Tasks
- [x] `partner-warranty/claimStatus.js` — status enum, transition table, terminal set, customer labels (ARCHITECTURE §3)
- [x] `partner-warranty/warrantyClaim.model.js` — schema per §2 with `humanId` `NCCW-{YYYY}-######`, indexes
- [x] `partner-warranty/warrantyGroup.model.js`, `warrantyIssue.model.js`
- [x] `partner-warranty/claimTimeline.js` — `appendEvent(claim, { action, toStatus, actor, note, visibility })`: validates transition, pushes event, writes AuditLog (§4). Throws 400 on an illegal move.
- [x] `constants.js` — `ID_PREFIXES.SERVICE_JOB = 'NCCJ'` + yearly scheme (claims keep the existing `WARRANTY_TICKET: 'NCCW'` key; no alias added)
- [x] `Brand` += `logoUrl`, `warrantyEnabled`, `coverage`, `warrantySla`, `webhook`
- [x] `ServiceProvider` += `authorizedBrands`, `servicePincodes`, `serviceRadiusKm`
- [x] `ServiceRequest` += `warrantyClaim`, `pincode`, `requestMode` enum `'B2B2C'`
- [x] `AuditLog` += `entityType`, `entityId`, `fromStatus`, `toStatus`, `reason`; type `'Warranty'`
- [x] Register new models — nothing to do: `registerAllModels()` imports every `*.model.js` automatically
- [x] **Bug fix:** `brand.warranty_claim` notification → targeted at the claim brand's users, not the `Brands` broadcast role
- [x] **Bug fix:** parts claims raised on Brand Warranty jobs carry the real brand name (from `ServiceRequest.brand`), so the brand panel can see them
- [x] Tests: `backend/tests/partnerWarrantyModel.test.js`

## Examples
```
generateHumanId('NCCW') in 2026 → NCCW-2026-000001, NCCW-2026-000002 …
generateHumanId('NCCJ') in 2027 → NCCJ-2027-000001  (counter resets per year)

appendEvent(claim /* Submitted */, { toStatus: 'Closed' })
  → 400 Cannot move claim from "Submitted" to "Closed"
appendEvent(claim /* Brand Review */, { toStatus: 'Rejected', note: 'Serial mismatch', actor: {kind:'brand', …} })
  → status Rejected, timeline +1, AuditLog { entityType:'WarrantyClaim', fromStatus:'Brand Review', toStatus:'Rejected', reason:'Serial mismatch' }
```

## Acceptance
- IDs follow `NCCW-{current year}-######` / `NCCJ-{current year}-######`, unique, year from the clock.
- Every legal transition in §3 passes; every other pair is rejected.
- Each status change leaves one timeline event and one AuditLog row.
- LG's brand users receive a brand warranty notification; Samsung's do not.
- Full backend suite green.

## Implementation Log

**Done 2026-09-29.** Not committed yet.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/claimStatus.js` | **new** — 14 statuses, `CLAIM_TRANSITIONS` (hold/cancel added to every non-terminal row), `SERVICE_STAGES`, `TERMINAL_STATUSES`, `canTransition`, customer labels, `CLAIM_ACTIONS` |
| `backend/src/modules/partner-warranty/warrantyClaim.model.js` | **new** — `WarrantyClaim` per ARCHITECTURE §2, humanId `NCCW-{YYYY}-######`, 5 indexes |
| `backend/src/modules/partner-warranty/warrantyGroup.model.js` | **new** — ElectroCare-style groups over Master Catalogue categories |
| `backend/src/modules/partner-warranty/warrantyIssue.model.js` | **new** — issues per product type, with category-level fallback (`productType: null`) |
| `backend/src/modules/partner-warranty/claimTimeline.js` | **new** — `appendEvent` (only writer of `claim.status`), `flushAudit` (sequential AuditLog rows after save), `recordAndSave` |
| `backend/src/config/constants.js` | `ID_PREFIXES.SERVICE_JOB = 'NCCJ'` + yearly 6-digit scheme |
| `backend/src/modules/super-admin/brand.model.js` | `logoUrl`, `warrantyEnabled`, `coverage`, `warrantySla`, `webhook` (secret `select: false`) |
| `backend/src/modules/service-provider/serviceProvider.model.js` | `authorizedBrands`, `servicePincodes`, `serviceRadiusKm` |
| `backend/src/modules/service-requests/serviceRequest.model.js` | `warrantyClaim`, `pincode`, `requestMode` + `'B2B2C'` |
| `backend/src/modules/super-admin/auditLog.model.js`, `auditLog.validation.js`, `shared/auditLog.js` | `entityType`, `entityId`, `fromStatus`, `toStatus`, `reason`; type `Warranty` |
| `backend/src/modules/notifications/notification.service.js` | `emitToBrand(event, brandId, payload)`, `emitToAdmins(event, payload)`; `brand.warranty_claim` is now per-recipient |
| `backend/src/modules/service-requests/serviceRequest.service.js` | brand warranty alert uses `emitToBrand` |
| `backend/src/modules/service-provider/job.service.js` | parts claims on Brand Warranty jobs carry the real brand name |
| `backend/tests/partnerWarrantyModel.test.js` | **new** — 17 tests |

### Decisions made while building
- `WarrantyIssue` got a required `category` so issues can be defined once per category and overridden per product type (ARCHITECTURE §2 updated).
- Audit rows are written **after** the claim save, one at a time, so a failed save never leaves a phantom audit row and the order is stable.
- `Partner Assigned → Job Created` is allowed (a reassignment before work starts returns the claim to "waiting for a partner").

### Bugs fixed
1. **Cross-brand leak** — `brand.warranty_claim` went to the `Brands` broadcast role (every brand). It now goes only to users with `role: brand_admin` and `brand` = the request's brand. Test: LG admin gets 1, Samsung admin 0, broadcast 0.
2. **Invisible parts claims** — a Brand Warranty job's parts claim was saved with brand `"Brand Warranty Claim"`, which the brand panel's exact-name match never found. It now uses the ServiceRequest's brand name (fallback: appliance/booking brand). Test walks a real job over HTTP and reads it back from `GET /brand/claims`.

### Verification
- `tests/partnerWarrantyModel.test.js`: **17/17 passed**.
- Full backend suite: **51 suites, 781 tests passed** (baseline before the phase: 50 suites / 764 tests). One earlier full run had a single failure in `notifications.test.js`; that file passes 57/57 on its own and the next full run was fully green, so it was a flake, not a regression.
