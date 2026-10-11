# Phase 5: Warranty policy engine and verification

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §4, §22 (policy per brand) · **Depends on:** Phases 1, 2, 4

## Goal
Warranty is configured **per brand, per product and model**. The system
checks Product + Model + Serial + Purchase Date and returns:
- the warranty status (In Warranty / Verification Required / Out of Warranty)
- the applicable policy (covered and non-covered service, parts and labour
  coverage, visit charges, conditions)

The policy is snapshotted onto every ticket.

## Context: read first
- ARCHITECTURE §8; README D7.
- `backend/src/modules/shared/warrantyEngine.js` (pure In/Out from months; AMC/EW overlay). Keep it for AMC/EW; the new engine handles the brand policy.
- `partner-warranty/warrantyClaim.service.js`: `warrantyEstimate(brandName, purchaseDate)` (to replace).
- `brand-admin/brandInsights.service.js` `lookupBrandWarranty` (Warranty Verification page; `OwnedAppliance` by serial or phone).
- `Brand.warrantyMonths` (fallback), `Brand.coverage` (categories).
- Frontend:
  - `frontend/src/pages/brand-admin/WarrantySettings.jsx` (coverage + webhook)
  - `Warranty.jsx` (Warranty Verification lookup)

## Tasks

### Backend
- [x] `brand-crm/warrantyPolicy.model.js` (§8): an edit creates a new `version` (the previous one is kept with `isActive:false`), so ticket snapshots stay meaningful.
- [x] `brand-crm/productSerial.model.js` (§8), unique `{brand, serialNumber}`.
- [x] `brand-crm/warrantyPolicy.service.js`:
  - `resolvePolicy(brand, {category, productType, model}, at)`: most specific active policy (model pattern = case-insensitive prefix or regex limited to `[A-Z0-9*-]` with `*` wildcard; productType; category; brand default). If none exists, a synthetic fallback from `Brand.warrantyMonths` with `coverage` unknown → `Verification Required` reason `NO_POLICY`.
  - `evaluateWarranty(input)`: the §8 rules. Returns `{status, reasons[], expiresOn, months, policy:{id,name,version,coverage}}`. Reason codes:
    - `EXPIRED`
    - `NO_PURCHASE_DATE`
    - `NO_INVOICE`
    - `NO_SERIAL`
    - `SERIAL_NOT_IN_REGISTRY`
    - `SERIAL_MODEL_MISMATCH`
    - `ISSUE_EXCLUDED`
    - `SERVICE_NOT_COVERED`
    - `NO_POLICY`
    - `PURCHASE_IN_FUTURE`
  - Registry: if a serial exists in `ProductSerial`, `warrantyStartsOn ?? soldOn` overrides a **missing** purchase date. A purchase date earlier than `manufacturedOn` → reason `PURCHASE_BEFORE_MANUFACTURE` → Verification Required.
- [x] `createTicket` uses `evaluateWarranty` (replacing the estimate). Re-evaluate on:
  - customer document upload
  - info-request response
  - brand edit of product fields (`PATCH /brand/tickets/:id/product`, `tickets:edit`, before approval only, audited)

  Each re-evaluation writes `WARRANTY_VERIFIED` (visibility brand) when the status changes.
- [x] `POST /brand/tickets/:id/warranty/override { status, note }` (`warranty:verify`) → `WARRANTY_OVERRIDDEN`, `warranty.verifiedBy`.
- [x] `POST /brand/tickets/preview-warranty` (used by Phase 4 step 5) → `evaluateWarranty` without saving.
- [x] Routes `/api/v1/brand/warranty-policies`:
  - CRUD (`warranty:policy_edit` for writes, `warranty:view` for reads)
  - `POST /test` (evaluate an arbitrary input)
- [x] Serial registry: `POST /api/v1/brand/warranty-policies/serials/import` (CSV: serial, model, category key, manufacturedOn, soldOn, warrantyStartsOn; dry-run report: rows ok / errors) and `GET …/serials?q=`.
- [x] `lookupBrandWarranty` (Warranty Verification page) uses `evaluateWarranty` + the registry + tickets (not only `OwnedAppliance`), and returns the policy coverage.
- [x] Customer view (`toCustomerView`): `warranty.status` label; never the internal reasons except a friendly "We'll verify your warranty" for Verification Required.
- [x] Audit every policy create/version/deactivate and every import.

### Brand Panel
- [x] **Warranty Settings** gets a **Policies** tab:
  - list (scope, months, parts/labour flags, visit charge, version, active)
  - editor form with coverage checkboxes (service types), excluded issues (from the catalogue), conditions text, requirements (invoice/serial/registry), effective dates
  - "Test a product" panel
- [x] **Serial Registry** tab: CSV import with a dry-run preview, and search.
- [x] **Warranty Verification** page (`Warranty.jsx`): show status, reasons, matched policy and coverage.
- [x] Ticket screens (queue + detail, existing claim pages until Phase 7): a warranty badge with a reasons tooltip; "Override" for `warranty:verify`.

### Tests
- [x] `backend/tests/brandCrmWarrantyPolicy.test.js`:
  - specificity (model > productType > category > default)
  - versioning keeps old snapshots
  - each reason code
  - registry fills a missing purchase date
  - an excluded issue → Out of Warranty
  - an override needs `warranty:verify` and writes an event
  - re-evaluation on document upload flips Verification Required → In Warranty
  - Brand B can't read Brand A's policies
- [x] Unit tests for `evaluateWarranty` as a pure function (date edges: expiry day inclusive, leap years).
- [x] `e2e/ui/brandCrmWarrantyPolicy.spec.js`: create a policy → test a product → register a ticket → the badge shows the policy name.

## API examples
```
POST /api/v1/brand/warranty-policies
{ name:'LG AC Standard', appliesTo:{ category:'…AC…' }, warrantyMonths:12, partsWarrantyMonths:60,
  coverage:{ coveredServices:['repair','installation'], partsCovered:true, labourCovered:true,
             visitCharge:{ payer:'brand', amount:0 }, conditions:'Compressor 5 yrs; physical damage excluded' },
  requireInvoice:true, requireSerial:true }
POST /api/v1/brand/warranty-policies/test { category, model:'PS-Q19', serial:'X1', purchaseDate:'2025-12-01', hasInvoice:true }
 → { status:'In Warranty', expiresOn:'2026-12-01', policy:{ name:'LG AC Standard', version:1, coverage:{…} } }
```

## Acceptance
- Each brand configures its own policies.
- Every ticket carries a status, reasons and a policy snapshot.
- Verification Required exists and can be resolved by documents or an authorised override.

## Implementation Log
- Added immutable policy versions and brand-scoped serial registry with preview/import reports, validation and audited upserts.
- Policies resolve by model wildcard prefix, product type, category and brand default. Wildcards use bounded string matching; no user-controlled regex executes.
- Calendar expiry dates clamp month ends and include the expiry day. Missing coverage uses the manufacturer's duration for reference and remains Verification Required (`NO_POLICY`).
- Ticket creation/preview, Customer 360 and warranty lookup share the engine. Document uploads and info responses use the original policy version; product scope changes select a policy for the updated product.
- Overrides require `warranty:verify`, a note and a pre-approval ticket. Customers receive the status and friendly verification message without internal reasons or override notes.
- Warranty Settings includes Policies, product testing and Serial Registry. Queue/detail badges show the policy version and reason tooltip; verification shows actual policy coverage.
- Focused integration and pure rule tests: 17 policy checks plus 12 registration checks passed. All 8 browser flows passed, including the existing customer-to-service closure journey. Build and changed-file lint passed. Full regression: 68 unique backend suites / 987 tests passed after updating two legacy claim expectations and fixing the rewards test server’s loopback binding.
