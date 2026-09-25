# Phase 20 — NCC Products as Detailed Listings, with a Product Page

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 17 (image uploads) |

## Goal

Super Admin → NCC Products becomes a marketplace-style product manager (like Flipkart):
- a full listing per product;
- a detail page for each product;
- a list that shows what matters at a glance.

The customer store page shows what the admin enters, not fixed promises.

---

## Tasks

- [x] `Product` gains:
  - `modelNumber`, `colour`, `description`
  - `specifications` (named groups of label/value rows)
  - `inTheBox`, `warrantySummary`, `returnDays` (default 7; 0 = not returnable)
  - `codAvailable`, `installationIncluded`
  - `manufacturer`, `countryOfOrigin`, `lowStockThreshold`
  - derived `discountPercent` and `stockStatus`
  - The first gallery picture is always the main picture.
  - The unused `fullSpecs` map was removed.
- [x] Validation:
  - MRP can't be below the selling price, on create and on edit.
  - A duplicate SKU is a clear 409, not a raw database error.
- [x] `GET /products/manage` (admin):
  - includes hidden products
  - search (name, brand, model, SKU), filters (category, condition, stock in/low/out, live/hidden), paging
  - units sold, revenue and orders per product (confirmed / shipped / delivered orders only)
- [x] `GET /products/manage/:id`: the product plus its sales and its 10 latest orders
- [x] Checkout refuses Pay on Delivery for a product that doesn't allow it
- [x] Admin screens (`/super-admin/products`, `/new`, `/:id`, `/:id/edit`):
  - **List**: picture, price with MRP and % off, stock badge, units sold, services, live/hidden; server-side filters and paging.
    - The old page loaded only the first 20 products and never showed hidden ones.
  - **Editor**: a full page in sections.
    - Basic details and pictures (Cloudinary, reorderable, the first is main).
    - Price & stock, with a live "% off" preview.
    - Highlights & description, grouped specifications, in the box.
    - Warranty & services, manufacturer.
    - The generated SKU gets a short random tail so it never clashes.
  - **Detail page**: the listing as the customer sees it.
    - Gallery, price, highlights, the 4 service cards, description, specification tables, box contents, manufacturer.
    - Beside it: sales, stock and recent orders.
    - Actions: Hide/Put live, and Edit.
- [x] Customer store page (Buy New → product):
  - The 4 service cards come from the product's own settings. They used to be the same "Free installation / 7 days replacement / Pay on delivery" for every product.
  - New sections: description, grouped specifications, in the box, manufacturer.
  - The legacy `/product-details` page reads `specifications` instead of `fullSpecs`.
- [x] Tests: backend `storeAndInventory.test.js` (Products, 6 tests); UI `storeAndInventory.spec.js` (create a listing → detail page → search)

## Where the store categories are used

Categories & Brands → Store Categories is used only by the Buy New shop:
- its category chips and product lists;
- the category picker in NCC Products.

Services and spare parts use Master Catalogue categories instead.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | _pending_ | Detailed listing model and admin list/detail/editor pages; customer page reads per-product services |

**Deployment note**: the product text index is deliberately unchanged, as `{ name, brand }`. A changed text index can't be created next to the existing one, so the server would not start on a live database. The admin search matches model numbers itself.

**Test output**: see Phase 21 (both phases ran together).
