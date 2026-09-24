# Phase 3 — Super Admin: Master Service & Offering Catalogue Module

| | |
|---|---|
| **Status** | ✅ Done (2026-09-24) |
| **Estimate** | 7–9 developer-days |
| **Depends on** | Phase 1, Phase 2 (the admin shows computed GST/final/margin using the engine) |
| **Can run in parallel with** | Phase 4 |
| **Client requirements** | 8, 9, 11, 13, 14, 19, 20, 26 |
| **Client tests closed** | 8 (admin side: price edit leaves payout alone, history recorded) |
| **Breaks anything existing?** | The old "Service Catalog" admin page is replaced. The old customer flow is unaffected (it doesn't read new models until Phase 4) |

## Goal

The admin can build and maintain the whole catalogue without a developer. That
covers categories, product types, variants, services, and offerings with all their
fields. Price/payout changes carry a reason, can take effect on a chosen date, and
are kept in a readable history.

This phase is scheduled early on purpose. **The client can start entering real
rates while Phases 4–6 are built**, which removes the rate-sheet dependency from
the critical path.

---

## Tasks

### 3.1 Admin API: `backend/src/modules/catalog/catalogAdmin.routes.js` + `catalogAdmin.service.js`
Mounted at `/api/v1/super-admin/catalogue`, guarded by `requireRole(ROLES.SUPER_ADMIN)` + a new
permission key `catalogue.manage` (added to the roles/permissions seed so sub-admins can be granted it).

- [x] Categories: list / create / update / `PATCH :id/status`
- [x] Product types: list (by category) / create / update / status; `variantDimension` editable
- [x] Variants: list (by productType or service) / create / update / status / reorder
- [x] Services: list / create / update / status
- [x] Offerings
  - [x] `GET /offerings`: filters `category`, `bookingType`, `active`, `needsRateReview`, `q`; each row includes current DEFAULT rate, GST %, final price, payout, margin % (computed by the Phase 2 engine for qty 1)
  - [x] `POST /offerings`: body = offering fields + `initialRate { customerPrice, spPayout, expressFee, expressSpIncentive, effectiveFrom }`; code auto-suggested if blank (Phase 1 `suggestOfferingCode`)
  - [x] `PUT /offerings/:id`: **rejects** commercial fields and `code` (they have their own endpoints / are immutable)
  - [x] `PATCH /offerings/:id/status`: activation blocked if no active rate
  - [x] `POST /offerings/:id/duplicate`: copies everything except code/variant; new offering starts inactive
- [x] Rates
  - [x] `POST /offerings/:id/rates` → Phase 1 `createRateVersion()`; `reason` required; `effectiveFrom` default now
  - [x] `GET /offerings/:id/rates`: versions newest-first with `changes[]`, `changedBy.name`
  - [x] `GET /rate-changes?from=&to=&field=`: platform-wide log (for "who changed payouts this month")
- [x] Every write also appends an `AuditLog` entry (`type: 'Finance'` for rates, `'System'` otherwise) so it shows in the existing Logs page
- [x] Deactivating a category/product type/service/variant does not delete offerings. The tree API (Phase 2) already hides offerings whose parents are inactive.
- [x] Tests `backend/tests/catalogAdmin.test.js`
  - Test 8: POST rate `{ customerPrice: 899, reason }` on TV 55–65 → v2 has payout 450, history shows one change
  - PUT offering with `spPayout` in body → 400
  - activate offering with no rate → 400
  - non-admin → 403

### 3.2 Admin UI: `frontend/src/pages/super-admin/MasterCatalogue.jsx`
Replaces `ServiceCatalog.jsx` in the sidebar ("Service Catalog" → "Master Catalogue")
and at the same route `/super-admin/service-catalog`, so bookmarks keep working.

Components in `frontend/src/components/super-admin/catalogue/`:

- [x] **`CatalogueTree`** (built as `CatalogueStructure.jsx`): Category → Product Types (→ Variants) / Services (→ Options). Inline add / rename / activate toggle / filter-offerings-by-node. ~~Drag reorder~~ not built (see log)
- [x] **`OfferingTable`** (right pane): offerings under the selected node
  - columns: Code · Name · Variant · Unit · Customer price · GST · **Final** · SP payout · Margin % · Express · Status · ⚠ DEMO badge
  - filters: active/inactive, product-linked/standalone, needs rate review, search
- [x] **`OfferingEditor`** (drawer, tabs):
  1. *Basics*: booking type, category, product type, variant, service (dropdowns filtered by parent), name, code (editable until saved)
  2. *Pricing*: pricing unit, unit label, min/max qty, express enabled, GST override, SAC. On create: initial rate fields. On edit: shows current rate read-only + **"Change price / payout"** button
  3. *Content*: description, included, excluded, customer instructions, estimated duration
  4. *Required info*: repeatable rows `{ label, type, options, required }`
  5. *Availability*: active, display order, serviceability (all / list of cities from existing `Cities` master), available from/until
  6. *Internal*: internal notes (admin only)
- [x] **`RateChangeModal`**: fields for customer price / SP payout / express fee / express incentive, each prefilled with current value; effective from (now or date); reason (required)
  - live preview row: *"Customer ₹799 → ₹899 · SP payout ₹450 (unchanged) · Margin 43.7% → 49.9%"*
  - if payout > customer price → warning (not a block, but explicit confirm)
- [x] **`RateHistoryPanel`**: timeline of versions. Each entry shows the date, who, the reason, and the field diffs, e.g. `Customer price ₹799 → ₹899`
- [x] Empty/loading/error states consistent with other super-admin pages; mobile layout usable (table → cards under 1024px)

### 3.3 Retire overlapping admin surfaces
- [x] `CustomerAppCustomization.jsx`: ~~hide~~ **annotate** the **price** inputs (see log: they still price the old flow until Phase 4) in "Category Customization" and the service-page catalog editor, with a note linking to Master Catalogue. (Full removal of those data paths is Phase 6/7; this stops admins editing a price that no longer drives anything.)
- [x] Remove "Service Catalog" (old) from `components/super-admin/Sidebar.jsx`; add "Master Catalogue"

---

## Worked examples

### Create a new offering: LED TV 40–43" Wall-mount Installation

1. Tree: TV → LED TV → *Add variant* "40–43 inch" (if not already there)
2. *New offering*: Product-linked · TV · LED TV · 40–43 inch · Installation
3. Code auto-fills `TV-LED-40-43-INSTALL`
4. Pricing: Per unit · "per TV" · qty 1–3 · express on · GST default (18%)
5. Initial rate: customer ₹499, SP ₹300, express fee ₹99, incentive ₹50
6. Table row now shows: `₹499 · 18% · ₹588.82 · ₹300 · 39.9% margin`

### Client Test 8 from the admin screen

| Step | Screen shows |
|---|---|
| Open TV-LED-55-65-INSTALL | Customer ₹799 · SP ₹450 · v1 |
| *Change price / payout* → customer 899, reason "Festive pricing" | Preview: SP payout ₹450 (unchanged) |
| Save | Table: Customer ₹899 · SP ₹450 · v2 |
| History tab | `v2 · 04 Oct 2026 · Admin Rahul · "Festive pricing" · Customer price ₹799 → ₹899` |

### Deactivate a combination (Test 12 setup)

Toggle `AC-WINDOW-UNINSTALL` inactive → customer tree for Window AC no longer lists
Uninstallation (verified in Phase 4).

## Acceptance

- [x] `npm test -- catalogAdmin` green
- [x] Build one new product-linked and one standalone offering end-to-end and quote them through `POST /catalog/quote`: **done via the admin API** (`catalogAdmin.test.js`: LED TV 50" → quote ₹765.82; Doorbell Installation). In the browser the create form was opened and filled (screenshot 4) but not submitted
- [x] Test 8 walk-through above done in the browser, screenshot in the log
- [x] Every DEMO offering shows the badge; saving a new rate removes it

## Out of scope

Bulk CSV import (add later if the client's rate sheet is large; ~2 days), CITY/PINCODE rate UI, margin reports (Phase 7).

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-24 | `9a65f5a` | Phase 3 built and verified in the browser |

### What was built

**Backend** (`/api/v1/super-admin/catalogue`, super-admin only)

| File | What it is |
|---|---|
| `backend/src/modules/catalog/catalogAdmin.service.js` | Categories (with offering counts), category structure, product types, services, variants/options, offerings (list with rate/final/payout/margin, detail, create with initial rate, content edit, status, duplicate), rate change, rate history, platform change log, code suggestion. Amounts in rupees at the API, paise in the DB. Every write → `AuditLog` (`Finance` for money) |
| `backend/src/modules/catalog/catalogAdmin.validation.js` | Zod schemas. The offering update schema is **strict**, so `code`, the combination and any money field → 400 |
| `backend/src/modules/catalog/catalogAdmin.routes.js` | 24 routes, mounted in `app.js` |
| `backend/scripts/seed.js` | + `catalogue:manage` permission (granted to Super Admin) |
| `backend/tests/catalogAdmin.test.js` | 17 tests |

**Frontend**

| File | What it is |
|---|---|
| `frontend/src/pages/super-admin/MasterCatalogue.jsx` | The page: summary tiles, category rail, structure pane, offerings table, category create/edit, platform "Recent price changes" |
| `frontend/src/components/super-admin/catalogue/CatalogueStructure.jsx` | Product types → sizes, services → options; add/edit/show-hide; funnel icon filters the table to one node |
| `…/catalogue/OfferingTable.jsx` | Table (≥1024 px) / cards (narrower). Customer · GST · customer pays · SP payout · margin (coloured) · status · DEMO / EXPRESS badges · scheduled next price |
| `…/catalogue/OfferingEditor.jsx` | Drawer, 7 tabs: Basics, Pricing, Content, Required info, Availability, Internal, History. Every client Req 20 field |
| `…/catalogue/RateChangeModal.jsx` | Only edited amounts are sent. Live before→after preview incl. margin; confirm step when payout > price; immediate or future-dated; reason required |
| `…/catalogue/RateHistoryPanel.jsx` | Version timeline: current / scheduled / past, who, when, why, field diffs |
| `…/catalogue/DuplicateOfferingModal.jsx` | Copy to a sibling size/service; copy starts inactive + DEMO-flagged |
| `…/catalogue/ui.jsx`, `listText.js`, `lib/catalogueAdminApi.js` | Shared controls, list helpers, API wrapper |
| `App.jsx`, `components/super-admin/Sidebar.jsx` | "Service Catalog" → **"Master Catalogue"**, same URL `/super-admin/service-catalog` |
| `pages/super-admin/CustomerAppCustomization.jsx` | Legacy-price notice on the Most Booked / Appliance tile editors, linking to Master Catalogue |

### Screenshots (local scratch DB, seeded catalogue, Playwright, 2026-09-24)

| | |
|---|---|
| AC category: structure + offerings with price, final, payout, margin, DEMO badges | [1-catalogue-ac.png](screenshots/phase-3/1-catalogue-ac.png) |
| Test 8: TV 55–65 ₹799 → ₹899, preview shows "SP payout ₹450 (unchanged)", margin 43.7% → 49.9% | [2-test8-rate-change.png](screenshots/phase-3/2-test8-rate-change.png) |
| Test 8: History tab, v2 "Festive pricing", Customer price ₹799 → ₹899 | [3-test8-history.png](screenshots/phase-3/3-test8-history.png) |
| New offering: LED TV + Uninstallation + Any size, name and code suggested | [4-new-offering.png](screenshots/phase-3/4-new-offering.png) |
| 900 px wide, standalone Water Tank Cleaning with tank-capacity options, card layout | [5-narrow-standalone.png](screenshots/phase-3/5-narrow-standalone.png) |

The walk-through script finished with **no browser console errors**.

### Client Test 8 walk-through (done in the browser)

| Step | Screen showed |
|---|---|
| Open TV → TV-LED-55-65-INSTALL | Customer ₹799 · pays ₹942.82 · SP ₹450 · 43.7% |
| Change price / payout → customer 899, reason "Festive pricing" | Preview: SP payout ₹450 (unchanged), margin 43.7% → 49.9% |
| Save | Row: ₹899 · pays ₹1,060.82 · SP ₹450 |
| Edit → History | `v2 CURRENT · Super Admin · "Festive pricing" · Customer price ₹799 → ₹899`; `v1 · System seed · Initial rate (client brief)` |

### Deviations from plan

1. **Gated on the super-admin role, not the permission key.** Every other super-admin module gates on the role, and permission keys are only enforced for ASM callers. `catalogue:manage` is seeded and granted to Super Admin, so it can be enforced later without a data change.
2. **The combination is fixed after creation, like the code.** The edit API rejects `category/productType/variant/service/bookingType`. A different combination is a different offering: use **Duplicate**. This keeps a booking snapshot's offering code meaning the same thing forever.
3. **Legacy price inputs annotated, not hidden.** Until the Phase 4 cut-over, the old booking flow still charges the CMS tile/page prices. Hiding them now would leave admins unable to correct a live price. They carry a "Legacy prices" notice instead; Phase 6 replaces them with an offering picker, as planned.
4. **No drag-reorder.** Offerings have an editable *Display order*. Product types, services and variants keep their seeded `sortOrder`, but there's no reorder UI yet (small follow-up if the client wants it).
5. **Duplicate combinations return 409** with the existing code ("This combination already exists as TV-LED-UNINSTALL"), and the model is validated first, so a wrong-category service is a 400, not a misleading 409.
6. **Accessibility fix found by the browser test.** Field labels now wrap their controls (they weren't associated at first), and multi-control fields are labelled groups.
7. **The margin preview in the rate modal is admin-side arithmetic** for display only. Saved numbers are always recomputed by the backend engine.

### Known gaps carried forward

- The legacy product types from the old catalogue (Cassette, Portable, Tower AC, OLED/QLED TV…) appear in the structure pane with no offerings. They're harmless and invisible to customers (the tree only shows bookable offerings). Clean-up is decided in Phase 6/7 along with the duplicate legacy categories.
- The existing super-admin sidebar isn't responsive below ~1024 px (it's the same on every page). The Master Catalogue content itself reflows (cards, stacked panes).
- The old `ServiceCatalog.jsx` page is no longer routed. The file is deleted in Phase 7.
- No bulk CSV import (out of scope; ~2 days if the client's rate sheet is large).

### Test output

```
catalogAdmin:            17 passed
full backend suite:      Test Suites: 40 passed, 40 total
                         Tests:       644 passed, 644 total
backend eslint:          clean (1 pre-existing warning in app.js: unused City import)
frontend eslint (new):   0 errors; 3 warnings (data-loading in effects, same pattern as existing pages)
frontend vite build:     ok
browser walk-through:    Test 8 + create + narrow layout, 0 console errors
```
