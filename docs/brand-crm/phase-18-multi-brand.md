# Phase 18: Multi-brand hardening and isolation suite

**Status:** ✅ Done · **Layer:** Backend + tests (+ small fixes in UI) · **Delivers:** client §22 · **Depends on:** Phases 1–17

## Goal
Prove that nothing is hardcoded for one brand. Each brand has its own:
- products and catalogue
- warranty policy
- service catalogue and pricing
- SLA
- users and departments
- billing rules

Prove too that Brand A can never access Brand B's customers, complaints,
billing, reports, users or service data, through any route.

## Context: read first
- README D-table; GAP-AUDIT §22 (name-regex joins).
- Known weak spots at baseline:
  - `super-admin/claim.*` parts-reimbursement `Claim.brand` is a **string**; `brandInsights` used `nameMatcher` on it
  - `OwnedAppliance.brand` is a string (Phase 3 added `brandRef`)
  - `lookupBrandWarranty` regex on brand name (Phase 5 replaced it; verify)
  - any `new RegExp(brand.name …)` left in the code
- `middleware/auth.js` `requireBrandScope`; sockets room join `brand:{id}` (`sockets/index.js` ~L43).
- Notification fan-out `emitToBrand` (the partner-warranty audit fixed a cross-brand leak once; re-verify).

## Tasks

### Hardening
- [x] `grep -rn "nameMatcher\|new RegExp(.*brand\|brand: *new RegExp\|brand.name" backend/src` and replace every brand-by-name join with an ObjectId join:
  - `Claim` gets `brandRef` (set at creation from the SR's brand)
  - `OwnedAppliance` queries use `brandRef`
  - write the list of changes in the log
- [x] Every brand-scoped model has a `brand` ObjectId field + index. List them:
  - WarrantyClaim, BillingLine, BrandInvoice, BrandPayment, BrandRate
  - WarrantyPolicy, ProductSerial, Escalation, AuditLog, ApiKey
  - PartOrder (Phase 10), Role, User, Team, BrandSettings
  - catalog models
- [x] Mongoose query guard (dev/test only): a plugin on brand-scoped models that throws when a `find`/`aggregate` runs inside a brand request context (AsyncLocalStorage set by `requireBrandScope`) **without** a `brand` condition. Production runs it in log-only mode. Document it.
- [x] Sockets: `claim:updated`, `brand:*` events go only to `brand:{claim.brand}` and `admins`; a brand socket can't join another brand's room (explicit test).
- [x] Notifications: every `emitToBrand` call passes an ObjectId, and the recipients are users of that brand with the needed permission (e.g. billing notifications only to `billing:view` users).
- [x] Per-brand configuration completeness: `GET /api/v1/super-admin/brands/:id/readiness` lists the missing config:
  - ticketPrefix, coverage, at least one active WarrantyPolicy, SLA (or platform default), at least one BrandRate per covered category
  - billing profile (GSTIN), at least one Brand Super Admin, warrantyEnabled

  Shown on the Super Admin brand detail page as a checklist.
- [x] Seed a **third brand** with a different configuration (no state rates, different SLA, different policy) to catch hidden single-brand assumptions in tests and demos.

### Isolation suite
- [x] `backend/tests/brandCrmIsolation.test.js`: table-driven model, route, resource and filter isolation checks; the existing Phase 2 router walk remains the deny-by-default permission authority.
- [x] Intake: an LG key with a Samsung brandId → 403; reading a Samsung ticket → 404.
- [x] Reports and dashboard with crafted filters (e.g. `brand=` query param injection) → ignored or rejected before execution.
- [x] Socket test: an LG brand socket never receives a Samsung `claim:updated`.

### Tests to keep green
- [x] Full backend suite + all `e2e/api` + `e2e/ui` specs.

## Acceptance
- No brand-by-name joins remain.
- The isolation suite covers 100 % of brand routes and passes.
- The third, differently configured brand works end to end.

## Implementation Log

- Removed the CRM read-time name joins. Legacy display labels remain, while
  Claim, OwnedAppliance, ExchangeRequest, AMCSubscription and
  ExtendedWarrantyOrder now resolve/store Brand ObjectIds. Brand catalog
  products and part orders also carry direct indexed ownership.
- Added `brandScopeGuard` to the tenant-owned operational schemas. The
  `requireBrandScope` middleware places the authenticated brand in
  AsyncLocalStorage. Unscoped queries throw in development/test and log in
  production. Shared dual-scope identity models retain explicit scoped service
  queries so platform operations and Mongoose population remain valid.
- Fixed every query exposed by the guard, including catalog ownership and
  population, policy/rate updates, billing charge synchronization, notification
  timeline writes and legacy part-order derivation.
- Brand notification fan-out now requires an ObjectId, active membership in the
  exact tenant and the event permission. Socket tests prove an LG connection
  cannot receive a Samsung claim update.
- Added the readiness endpoint and Super Admin checklist for ticket prefix,
  coverage, active policy, SLA/defaults, per-category rates, GSTIN, owner and
  warranty intake. The seed now includes Voltas Demo with an 18-month AC policy,
  custom SLA and a national-only rate.
- The Express inventory contains **154 Brand API operations**. Every one has a
  deny-by-default permission rule and an isolation strategy in the router-walk
  suites. Direct foreign-resource and crafted-filter probes, indexed-model and
  query-guard checks, notification permissions, readiness and socket isolation
  are covered by `brandCrmIsolation.test.js`, `brandCrmRbac.test.js`,
  `brandCrmIntake.test.js` and `sockets.test.js`.
- Final validation passed across all layers: **82 backend suites / 1,165 tests**
  (four suites affected by local MongoDB file-handle exhaustion passed on a
  clean database rerun), **199 API E2E tests**, and **77 UI E2E tests**. Backend
  and frontend lint completed with no errors, the production frontend build
  succeeded, and `git diff --check` reported no whitespace errors.
