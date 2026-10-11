# Phase 2: Brand RBAC: roles, departments, permission enforcement

**Status:** ✅ Done (2026-10-06) · **Layer:** Full stack · **Delivers:** client §5, §18 · **Depends on:** Phase 1

## Goal
Brand users work with individual IDs under **module × action** permissions
that the **backend enforces** on every brand route. Nine role templates ship
per brand. A CCE cannot reach Finance, Pricing, User Management or Settings
unless explicitly granted.

## Context: read first
- ARCHITECTURE §6 (catalogue, templates, enforcement); README D8, D9.
- `backend/src/middleware/auth.js`: `requireAuth` puts `permissions` from the **JWT** on `req.user`. `requirePermission(key)` exists but no brand route uses it. `requireBrandScope`.
- `backend/src/modules/auth/auth.service.js` (~L60: `resolvePermissions` from `assignedRoles`); `auth.routes.js` `GET /me`.
- `backend/src/modules/auth/role.model.js`, `permission.model.js`; `backend/scripts/seed.js` (`PERMISSIONS`, `upsertRoles`).
- `backend/src/modules/brand-admin/brandRole.*`, `brandUser.*`, `team.*` (department enum: Field Service / QA / Remote Support / Installation).
- `backend/src/modules/super-admin/brandAdmin.service.js` (`ensureBrandAdminRole` creates "Brand Admin" with **empty** permissions).
- Frontend:
  - `frontend/src/pages/brand-admin/UserRoleManagement.jsx`, `TeamsDepartments.jsx`
  - `frontend/src/components/brand-admin/Sidebar.jsx`
  - `frontend/src/App.jsx` (brand routes ~L937–1080)
  - `frontend/src/context/AuthContext`
- Every router mounted under `/api/v1/brand/*` in `backend/src/app.js` (~L187–203), plus `brandInsightsRouter`.

## Tasks

### Backend
- [x] `brand-crm/permissions.js`: the catalogue (module, action, key, label, description) and `ROLE_TEMPLATES` exactly as in §6.1–6.2. Export `BRAND_PERMISSION_KEYS`.
- [x] `Permission.scope` field. The seed upserts all brand keys with `scope:'brand'` (existing platform keys get `scope:'platform'`).
- [x] `brand-crm/roleTemplates.service.js`: `ensureBrandRoleTemplates(brandId)` creates any of the 9 template roles that are missing (by name) for that brand, and is idempotent. Mark them `Role.template: <key>` (new field) so the UI can show "Template".
- [x] Call it on brand create (`super-admin/brand.service.js`) and in the seed for existing brands.
- [x] `brandAdmin.service.createBrandAdmin`: assign the **Brand Super Admin** template role (D9), replacing `ensureBrandAdminRole`.
- [x] `brand-crm/brandPermission.middleware.js`:
  - `requireBrandPermission(...keys)` (any-of)
  - `requireAllBrandPermissions(...keys)`
  - effective permissions come from the DB through a 60 s LRU cache keyed by userId
  - a suspended user → 401
  - export `invalidateBrandPermissions(userId?)`
- [x] Apply guards to **every** brand route. Make a mapping table in the Implementation Log. Minimum:
  - insights / dashboard → `dashboard:view`
  - customers → `customers:*`
  - warranty-claims / tickets → `tickets:*` (approve / reject / request-info → `tickets:approve`; notes → `tickets:edit`)
  - rate-cards → `rates:view|edit`
  - invoices / payments → `billing:*` / `payments:view`
  - part-orders → `parts:view|approve`
  - escalations → `escalations:*`
  - roles → `roles:manage`; users → `users:*`; teams → `teams:manage`
  - settings → `settings:*`; warranty-coverage → `warranty:policy_edit`; webhook → `integrations:manage`
  - catalog → `catalog:*`; reviews / chat / academy / notifications → `engagement:*`
  - replacement-approvals / returns / documents / completions → `operations:*`
- [x] Guard rails:
  - you cannot remove or suspend the last active user holding the Brand Super Admin template role
  - you cannot change your own roles
  - you cannot delete a template role that is still assigned → 409
- [x] `User.department` (String: `Customer Care`, `Warranty`, `Service Operations`, `Spare Parts`, `Finance`, `Quality`, `Management`). Extend the `Team.department` enum with the same values. `brandUser` create/update accept `employeeId`, `department`, `assignedRoles`.
- [x] Every role, user and team change → `recordAction` audit (Phase 1 helper) + `invalidateBrandPermissions`.
- [x] `GET /api/v1/brand/permissions/catalog` returns the catalogue for the matrix UI. `GET /auth/me` returns `permissions` **resolved from the DB** for brand users (not the JWT snapshot).

### Brand Panel
- [x] `usePermissions()` hook (from `/auth/me`, refreshed on focus and every 60 s): `can('tickets:approve')`.
- [x] Sidebar: hide items the user can't view. Route guard: show a `Forbidden` page (new `pages/brand-admin/Forbidden.jsx`) on a direct URL.
- [x] Buttons on existing pages respect `can()`:
  - approve / reject / request-info on claims
  - edit on rate cards
  - create invoice
  - user/role/team mutations
- [x] `UserRoleManagement.jsx`:
  - users table with Employee ID, department, roles, status
  - invite/edit form with employeeId, department, roles (multi)
  - role editor as a **module × action checkbox matrix** from the catalogue
  - template badge; "duplicate role"
- [x] `TeamsDepartments.jsx`: new departments; team members picker shows employeeId.

### Tests
- [x] `backend/tests/brandCrmRbac.test.js`:
  - the 9 templates exist per brand and are idempotent
  - CCE → 403 on rates edit, billing, users, roles, settings, webhook; 200 on ticket view
  - Warranty Exec can approve; CCE can't
  - revoking a role takes effect within the cache window (call `invalidateBrandPermissions` / TTL 0 in tests)
  - last-super-admin guard; self-role-change guard
  - every brand router has a guard: a test walks `app._router` for `/api/v1/brand` routes and asserts each has a permission middleware, so a future route can't be added unguarded
- [x] `e2e/ui/brandCrmRbac.spec.js`: a CCE login sees no Finance/Users/Settings menus and gets Forbidden on a direct URL. The super admin role matrix saves.
- [x] Update existing brand tests and specs that log in as a brand user: they must hold the Brand Super Admin role (seed/helper).

## API examples
```
CCE  PUT  /api/v1/brand/rate-cards           → 403 { message: 'Missing permission: rates:edit' }
WE   POST /api/v1/brand/warranty-claims/:id/approve → 200
GET  /api/v1/brand/permissions/catalog       → [{ module:'tickets', actions:[{ key:'tickets:approve', label:'Approve / reject / hold' }…] }…]
```

## Acceptance
- No brand route is reachable without the matching permission.
- The 9 templates exist and match §6.2.
- The UI hides what a user can't use.
- Changes are audited.

## Implementation Log

**Done 2026-10-06.** Not committed (waiting for the go-ahead). Builds on Phase 1, also uncommitted.

### How access works now
1. **One table.** `backend/src/modules/brand-crm/brandAccess.js` (`BRAND_ROUTE_RULES`) lists every `/api/v1/brand/*` route with the permission(s) it needs (any-of).
2. **Mounted once.** It is mounted at `/api/v1/brand`, ahead of every brand router (`requireAuth → requireBrandScope → rule`).
3. **Deny by default.** A brand route with no rule is refused with 403. A test walks Express's router and fails if any brand route lacks a rule, or if a rule matches no route.
4. **Permissions come from the database.** `requireBrandPermission` loads the user's roles (only brand-scope keys count) through a 60 s cache. Role, user and team changes clear it at once. A non-Active user gets 401.
5. **Brand-scoped routes outside `/brand`** use route-level guards: `GET /reviews/brand`, `PATCH /reviews/:id/respond`, `GET /exchange/requests/brand`, and the brand side of `GET/PATCH /service-requests…` (only when the caller is a brand user).
6. **`GET /auth/me`** returns the DB-resolved `permissions` and `brandRoles` for brand users. The panel polls it every 60 s and on window focus (Sidebar), so a role change shows up without signing out.

### Route → permission mapping
The full table is `BRAND_ROUTE_RULES` in `brandAccess.js`. In summary:

| Area | Read | Write |
|---|---|---|
| Tickets (`/warranty-claims`) | `tickets:view` | approve / reject / request-info → `tickets:approve`; notes → `tickets:edit` |
| Dashboard / reports | `dashboard:view` / `reports:view` | — |
| Customers | `customers:view` | notify-customer → `customers:edit` or `tickets:edit` |
| Warranty (registrations, lookup, coverage) | `warranty:view` | coverage → `warranty:policy_edit` |
| Parts (part-orders, inventory, parts claims) | `parts:view` | part-order status → `parts:approve` |
| Escalations | `escalations:view` | create / status → `escalations:manage` |
| Rate cards | `rates:view` | `rates:edit` |
| Invoices / payments | `billing:view` / `payments:view` | invoice create / status → `billing:edit` |
| Operations (service providers, completions, AMC, replacements, returns, documents) | `operations:view` | `operations:edit` |
| Catalog | `catalog:view` | `catalog:edit` |
| Academy | `engagement:view` | `engagement:edit` |
| Roles / users / teams | `users:view` (teams also `teams:edit`; roles also `roles:manage`) | roles → `roles:manage`; users → `users:edit`; teams → `teams:edit` |
| Permission catalogue | `users:view`, `roles:manage` or `teams:edit` | — |
| Settings | **any brand user** (the sidebar shows the support number) | `settings:edit` |
| CRM webhook | `integrations:manage` | `integrations:manage` |
| Chat, notifications, own password | not gated: personal to each user | |

### Files
| File | Change |
|---|---|
| `backend/src/modules/brand-crm/permissions.js` | **new**: catalogue (20 modules, 45 keys), 9 `ROLE_TEMPLATES`, `BRAND_DEPARTMENTS` |
| `backend/src/modules/brand-crm/brandPermission.middleware.js` | **new**: `loadBrandAccess` (60 s cache), `requireBrandPermission`, `requireBrandPermissionIfBrand`, `invalidateBrandPermissions`, `ANY_BRAND_USER` |
| `backend/src/modules/brand-crm/brandAccess.js` | **new**: `BRAND_ROUTE_RULES`, `ruleFor`, `brandAccessControl` |
| `backend/src/modules/brand-crm/roleTemplates.service.js` | **new**: `ensureBrandPermissions`, `ensureBrandRoleTemplates`, `assignTemplateRole`, `backfillRolelessBrandUsers` |
| `backend/src/modules/brand-crm/brandPermission.routes.js` | **new**: `GET /brand/permissions/catalog` (modules, templates, departments, team departments) |
| `backend/src/app.js` | mounts `brandAccessControl` and the catalogue router |
| `backend/src/modules/auth/permission.model.js` / `role.model.js` | `Permission.scope` (`platform` / `brand`), `Role.template` |
| `backend/src/modules/auth/auth.routes.js` | `/auth/me` gives brand users DB-resolved `permissions` + `brandRoles` |
| `backend/src/modules/brand-admin/brandRole.service.js` / `.routes.js` | brand keys only; Super Admin role locked (permissions, delete); a role in use can't be deleted; duplicate name → 409; `userCount`; audit; cross-brand → 404 |
| `backend/src/modules/brand-admin/brandUser.service.js` / `.routes.js` / `.validation.js` | `employeeId` (unique per brand → 409), `department`; no self role/status change; last active Super Admin guard; suspend revokes refresh tokens; audit with diff; cross-brand → 404 |
| `backend/src/modules/brand-admin/team.*` | departments = brand departments + the 4 old ones; lead and members must be brand users; audit; cross-brand → 404 |
| `backend/src/modules/super-admin/brand.service.js` | new brands get the 9 templates |
| `backend/src/modules/super-admin/brandAdmin.service.js` | the brand administrator NCC creates gets Brand Super Admin (was an empty "Brand Admin" role) |
| `backend/src/modules/reviews/review.routes.js`, `warranty-amc-exchange/exchange.routes.js`, `service-requests/serviceRequest.routes.js` | brand guards on the shared routes |
| `backend/src/modules/shared/dev.routes.js` | `/_dev/test-user` for a brand user grants a template (default Brand Super Admin; `brandRoleTemplate`, `employeeId` optional) |
| `backend/scripts/seed.js` | platform keys get `scope: 'platform'`; seeded brands get templates; seeded admins are Brand Super Admins; backfill |
| `backend/scripts/backfillBrandRoles.js` + `npm run db:backfill-brand-roles` | **new**: for existing databases. Templates for every brand, plus Brand Super Admin for brand users whose roles grant no brand permission |
| `frontend/src/lib/brandAccess.js` | **new**: page → permission map, `pageAccess`, `firstAllowedPage` |
| `frontend/src/hooks/useBrandPermissions.js` | **new**: `can`, `canOpen`, `roles`, polling |
| `frontend/src/components/brand-admin/BrandAccessGate.jsx`, `pages/brand-admin/Forbidden.jsx` | **new**: wraps `<Routes>` in `App.jsx`; Forbidden page names the user's roles and links to their first allowed page |
| `frontend/src/components/brand-admin/Sidebar.jsx` | links and sections hidden per permission; escalation badge only fetched with `escalations:view`; polls permissions |
| `frontend/src/pages/brand-admin/UserRoleManagement.jsx` | rewritten: Users tab (employee ID, department, multiple roles, edit dialog, self-edit limits) and Roles tab (cards, template badge, user count, duplicate, delete, module × action matrix editor; Super Admin matrix locked) |
| `frontend/src/pages/brand-admin/TeamsDepartments.jsx` | departments from the API, working Members dialog (add/remove), lead picker shows employee ID, edits gated by `teams:edit` |
| `WarrantyClaimDetail.jsx`, `CallRatesCharges.jsx`, `PartRequests.jsx`, `Escalations.jsx`, `Settings.jsx`, `WarrantySettings.jsx` | action buttons gated (`tickets:approve` / `tickets:edit`, `rates:edit`, `parts:approve`, `escalations:manage`, `settings:edit`, `warranty:policy_edit`; webhook card only with `integrations:manage`) |
| `backend/tests/brandCrmRbac.test.js` | **new**: 21 tests |
| `e2e/ui/brandCrmRbac.spec.js` | **new**: browser test + screenshots `docs/brand-crm/screenshots/phase-2-*.png` |
| `backend/tests/helpers/partnerWarranty.js`, `helpers/brandCrm.js` | kit brand admins are Brand Super Admins; `brandUser(brand, { templates: ['cce'] … })` |
| `backend/tests/{brandAdmin,brandEscalation,reviews,partnerWarrantyCatalog,partnerWarrantyModel}.test.js` | fixtures grant Brand Super Admin; two `brandAdmin` tests now assert the new rules (team members must be brand users; platform keys can't be granted) |

### Decisions and deviations from the plan
- **One central rule table instead of guards on each router.** Same effect, but the whole access model reads in one place and is deny-by-default. The plan's "every route has a guard" test checks it against the live router.
- **Key names `users:edit` and `teams:edit`, not `users:manage` / `teams:manage`.** `Permission.key` is unique across the collection, and `users:manage` / `teams:manage` already exist as platform keys. `ensureIndexes` never drops indexes, so making keys unique per scope would have collided on existing databases. Brand keys are therefore a disjoint set, and a brand can only ever grant `scope: 'brand'` keys.
- **`billing:edit` added.** The catalogue had only billing view/export, but the existing manual invoice create/status routes need a write permission. Finance and Super Admin hold it. Phase 13 replaces those routes.
- **`GET /brand/settings` is open to every brand user.** The sidebar shows the brand's support number from it. Writing still needs `settings:edit`; the Settings *page* needs `settings:view`.
- **Templates are matched by template key, not by name.** A renamed template isn't recreated. A pre-existing role with a template's name and no template is adopted.
- **Cross-brand access to roles, users and teams now returns 404 (was 403)**, so another brand's records can't be confirmed to exist.
- **Existing accounts.** Brand users whose roles grant no brand permission (none, or only the old empty "Brand Admin" role) get Brand Super Admin from the seed and the backfill script. Before this phase every brand user could do everything, so nobody loses access. On a database that isn't re-seeded, run `npm run db:backfill-brand-roles` once.

### Verification
- `tests/brandCrmRbac.test.js`: **21/21**, including the router walk (89 brand routes, each with a rule, no unused rule).
- Full backend suite (`NODE_OPTIONS=--max-old-space-size=6144 npm test -- --forceExit`): **64 suites, 937 tests passed**.
- Playwright API (all): **198/198**.
- Playwright UI (all, `E2E_UI_PORT=5299`): **58/58**, including the new `brandCrmRbac.spec.js`.
- ESLint clean on new and changed files. The two remaining `react-hooks/set-state-in-effect` warnings, in `Sidebar.jsx` (spare-parts toggle) and `Escalations.jsx`, were there before this phase. `vite build` succeeds.
- Screenshots checked: `phase-2-cce-sidebar.png`, `phase-2-forbidden.png`, `phase-2-role-matrix.png`.
- The partner-warranty UI specs rewrite their screenshots in `docs/partner-warranty/screenshots/` on every run, which is why those PNGs show as modified in git.

### Notes for Phase 3
- New brand routes must be added to `BRAND_ROUTE_RULES`, or they are refused (and `brandCrmRbac` fails). Phase 3 needs rules for `/customers/search`, `POST /customers`, `GET/PATCH /customers/:id`, `POST /customers/:id/addresses`.
- Use `actorFromReq(req)` + `recordAction` for audit, as roles, users and teams do.
- Frontend: add any new page path to `frontend/src/lib/brandAccess.js` (e.g. `/brand-admin/customers/:id` is covered by `/brand-admin/customers`).
