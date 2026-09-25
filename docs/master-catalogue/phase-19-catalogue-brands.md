# Phase 19 — Catalogue Brands Separated from Partner Brands; Brand Warranty Length

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phases 3, 4, 13 |

## Goal

Super Admin → **Categories & Brands** had two tabs. The review found:

| Tab | What it did | Used? |
|---|---|---|
| Product Categories | the Buy New store's product categories (`ProductCategory`): store category chips and the admin Products dropdown | ✅ yes, and kept (renamed **Store Categories**) |
| Product Brands | edited the **same `Brand` records as Brand Partners**. These are the companies with a brand-admin login. The public `/catalog/brands` also listed them to customers, and inserted 16 default "partners" into that collection if it was empty. | ⚠️ it mixed up two different things |

The user's decision (2026-09-25):
- A **partner brand** is a company that logs in to the brand-admin panel.
- A **catalogue brand** is the manufacturer a customer picks when booking a **product-linked** service, so the Service Partner knows whose product it is.
- Standalone services have nothing to do with brands.

The review also found a bug in the brand warranty length:
- The customer-side warranty checks (booking detection, My Appliances) always used 12 months.
- They ignored the brand's configured `warrantyMonths`.
- Result: a 24-month brand's appliance showed "Out of Warranty" after one year.

---

## Tasks

- [x] New `CatalogueBrand` model:
  - name, unique ignoring case
  - `categories` (the Master Catalogue category keys it is offered for)
  - `warrantyMonths` (default 12), `isActive`, `sortOrder`
  - its writes drop the cached category tree
- [x] Admin API `/api/v1/super-admin/catalogue/brands`: list, create, edit, delete (audited)
  - refuses unknown categories, duplicate names and warranty > 120 months
- [x] `GET /catalog/brands` returns active catalogue brands, and `?category=AC` narrows the list
  - It never lists partner brands, and no longer inserts default brands into the partner collection.
- [x] Booking tree `category.brands`:
  - comes from catalogue brands
  - only when the category has product-linked offerings; a standalone-only category has none
- [x] Customer booking flow:
  - a standalone booking never shows the brand picker and never sends a brand (booking, quote warranty check, success page)
- [x] `Category.brands` removed from the model, the category seed and the old category API
  - The seed turns the 9 appliance lists into 50 catalogue brands (`catalogueBrandSeedData.js`), inserted once so admin edits are never overwritten.
- [x] Super Admin → Categories & Brands → **Catalogue Brands** tab:
  - Fields: name, "Offered for" (only categories with product services), warranty months, order, Active/Hidden.
  - The tab says that partner brands live in Brand Partners.
- [x] Brand Partners:
  - **Edit details** added (warranty months, support email/phone, status)
  - the create form's "Spare Stock" / "Revenue Share" inputs, which were never saved, were replaced with those real fields
- [x] AMC and Extended-Warranty Buy screens:
  - the brands per appliance come from catalogue brands, not a hardcoded list in each page
  - the "Samsung" default is gone
- [x] Warranty-length fix: `brandWarrantyMonths(name)` is used by `warrantyDetector` and `ownedAppliance.withWarranty`
  - it uses the partner brand's own months, then the catalogue brand's, then the platform default
  - My Appliances' expiry date uses the same figure
  - Brand names are now regex-escaped in detection; a name like `A+ (Home` used to crash it.
- [x] Tests: backend `catalogueBrands.test.js` (12), e2e API brand list, e2e UI `catalogueBrands.spec.js` (2)

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `00abd5f` | Catalogue brands split from partner brands; warranty months honoured |
| 2026-09-25 | _pending_ | New `npm run seed:brands` (standalone, idempotent). With the user's go-ahead, the dev DB (Atlas `nigam`, which had 0 offerings) was seeded with `seed:catalogue` (211 offerings, 211 DEMO v1 rates) and `seed:brands` (50 brands). Nothing was deleted. Checked: AC tree in Lucknow has 11 brands, and a Split AC 1 Ton Installation quote is ₹1,399 + GST = ₹1,650.82 |

**How it is decided now**

| Question | Answer comes from |
|---|---|
| Which brands can a customer pick when booking an AC repair? | catalogue brands whose "Offered for" includes AC, and only while the AC booking is product-linked |
| Does a plumber / cleaning booking ask for a brand? | No. It has no product type, so the tree sends `brands: []`, and the flow hides the picker for any standalone service |
| Which brands show on AMC / Extended Warranty / Shop by Brand? | `GET /catalog/brands` (catalogue brands; filtered by appliance on AMC/EW) |
| Who can log in to the brand-admin panel? | partner brands (Brand Partners) — unchanged |
| How long is an appliance "In Warranty"? | the partner brand's own months if it set any, otherwise the catalogue brand's, otherwise 12 |

**Example**:
1. The admin adds "Brand X", offered for AC, with 24 months' warranty.
2. On `/book/AC` → Split 1.5 Ton → Repair → Schedule Visit, "Brand X" is in the Select Brand list.
3. It does not appear in Brand Partners.
4. A customer's Brand X AC bought 18 months ago now shows **In Warranty**, with an expiry 24 months after purchase. Before this phase it showed Out of Warranty.

**API**
```
GET  /api/v1/catalog/brands?category=TV
→ [{ "name": "LG", "categories": ["AC","Washing Machine","Refrigerator","TV","Microwave"], "warrantyMonths": 12 }, …]

POST /api/v1/super-admin/catalogue/brands   { "name": "Daikin", "categories": ["AC"], "warrantyMonths": 18 }
→ 201 { "id": "…", "name": "Daikin", "categories": ["AC"], "warrantyMonths": 18, "isActive": true, "sortOrder": 0 }
POST … { "name": "daikin" }                 → 409 Brand "daikin" already exists
POST … { "name": "Sony", "categories": ["Spaceship"] } → 400 Unknown category: Spaceship
```

**Test output**
```
backend  $ npm test                 Test Suites: 48 passed · Tests: 738 passed   (catalogueBrands.test.js: 12 new)
e2e      $ npx playwright test      194 passed (0 skipped)
e2e      $ npm run test:ui          46 passed (44.1s)  ·  rerun: 46 passed (40.9s)
frontend $ npm run build            ✓   (lint: 0 errors)
backend  $ eslint src scripts tests 0 errors
```
