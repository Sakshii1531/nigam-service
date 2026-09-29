# Phase 2 — Warranty catalogue: groups, brand coverage, issues

**Status:** ✅ Done (2026-09-29) · **Layer:** Backend · **Delivers:** #1 (data source)

## Goal
Everything the customer picks (group → brand → product → issue) comes from the
database, managed by Super Admin (and brands for their own coverage). Nothing
hardcoded in the app.

## Tasks
- [x] Public reads (`/api/v1/partner-warranty`):
  - `GET /groups` — active groups with image + tagline
  - `GET /brands?group=&q=` — `Brand` with `status: Active`, `warrantyEnabled: true`, coverage intersecting the group's categories; `q` = case-insensitive name search (client: "search brands")
  - `GET /brands/:brandId/products?group=` — the brand's covered categories within the group (name, image, key)
  - `GET /products/:categoryId/issues?productType=` — WarrantyIssues for the category (a product type's own issues win when given)
- [x] Super Admin CRUD (`/api/v1/super-admin/warranty-catalog`): groups, issues, brand coverage/`warrantyEnabled`/logo
- [x] Brand admin: `GET/PUT /api/v1/brand/warranty-coverage` — the brand edits its own covered categories
- [x] Seed script `scripts/seedPartnerWarranty.js` (local DB only): 7 groups from the current mock (ElectroCare, BathCare, IT&CPCare, KitchenCare, AirCare, WaterCare, SecureCare) and the mock issue lists as category-level issues
- [x] Validation schemas; tests `partnerWarrantyCatalog.test.js`

## Examples
```
GET /partner-warranty/brands?group=electrocare&q=l
→ [{ id, name: 'LG', logoUrl }, …]           // inactive / non-warranty brands excluded

GET /partner-warranty/brands/{LG}/products?group=electrocare
→ [{ id, name: 'Refrigerator', key: 'Refrigerator', imageUrl }, { name: 'Washing Machine', … }]

GET /partner-warranty/products/{acCategoryId}/issues
→ [{ id, name: 'Cooling Issue' }, { name: 'Water Leakage' }, …]
```

## Acceptance
- A brand with `warrantyEnabled: false` or `status: Pending` never appears.
- A brand only lists categories in its coverage (and, under a group, only the group's categories).
- Search is by name, case-insensitive, regex-escaped.
- Super Admin changes are reflected immediately in public reads.

## Implementation Log

**Done 2026-09-29.** Not committed yet.

### Design change (before coding)
The plan had brand coverage and the customer's "Product" step keyed on
Master Catalogue **ProductTypes**. Most categories (Refrigerator, Microwave,
Plumber, Chimney…) have no product types, and the client's flow picks the
appliance ("AC"), not its sub-type. So:
- `Brand.coverage` → list of **Category** ids.
- "Product" step = a covered category; `productType` stays optional on claims and issues.
- Issues are per category, with an optional per-product-type list that replaces the category's when present.

ARCHITECTURE §2 and the Phase 3 spec were updated to match.

### Endpoints
| Method + path | Who | What |
|---|---|---|
| `GET /api/v1/partner-warranty/groups` | public | active groups + `brandCount` |
| `GET /api/v1/partner-warranty/brands?group=&q=` | public | listed brands (Active + `warrantyEnabled`); group by slug or id; name search, regex-escaped |
| `GET /api/v1/partner-warranty/brands/:brandId/products?group=` | public | the brand's covered, active categories (within the group) |
| `GET /api/v1/partner-warranty/products/:categoryId/issues?productType=` | public | active issues; product-type list wins when it has any |
| `GET/POST /api/v1/super-admin/warranty-catalog/groups`, `PUT …/groups/:id` | super admin | groups CRUD (unknown category → 400, duplicate slug → 409) |
| `GET/POST …/issues`, `PUT/DELETE …/issues/:id` | super admin | issues CRUD (product type must belong to the category) |
| `GET …/brands`, `GET/PUT …/brands/:id`, `GET …/coverage-options` | super admin | `warrantyEnabled`, `logoUrl`, `coverage`, `warrantySla` |
| `GET/PUT /api/v1/brand/warranty-coverage` | brand admin | own `coverage` + `logoUrl` only (strict schema — `warrantyEnabled`/`warrantySla` → 400) |

All admin/brand writes leave a `Warranty` AuditLog row.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/warrantyCatalog.service.js` | **new** — public reads, `resolveSelection()` (for Phase 3), admin + brand management |
| `backend/src/modules/partner-warranty/warrantyCatalog.validation.js` | **new** — zod schemas; logos go through `mediaUrl` (no base64) |
| `backend/src/modules/partner-warranty/warrantyCatalog.routes.js` | **new** — public, super-admin and brand routers |
| `backend/src/app.js` | mounts the three routers |
| `backend/src/modules/super-admin/brand.model.js` | `coverage` now refs `Category` |
| `backend/scripts/seedPartnerWarranty.js`, `package.json` | **new** `npm run seed:partner-warranty` — 7 groups + 12 category issue lists, insert-once, reports missing categories |
| `backend/tests/partnerWarrantyCatalog.test.js` | **new** — 16 tests |

### Seed mapping
ElectroCare → Refrigerator, Washing Machine, TV, Microwave · BathCare → Plumber, Geyser ·
IT&CPCare → *(no matching categories yet — admin adds them)* · KitchenCare → Microwave, Chimney, Gas Stove & Hob ·
AirCare → AC, Air Cooler · WaterCare → RO Water Purifier, Geyser · SecureCare → CCTV.
The seed was **not** run against any shared database — only inside the test DB.

### Verification
- `tests/partnerWarrantyCatalog.test.js`: **16/16 passed**.
- Full backend suite: **52 suites, 797 tests passed**.
- ESLint clean on all partner-warranty files.
