# Phase 21 — Spare-Parts Inventory in Detail, with a Part Page and Stock History

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 20 (shared form parts) |

## Goal

Super Admin → Inventory Management becomes a real parts catalogue:
- what each part is and what it fits;
- its pricing;
- where it is stored;
- how its stock got to today's number.

---

## Tasks

- [x] `SparePartCatalog` gains:
  - `description`, `images`, `specifications`
  - `unit` (piece/set/pair/metre/litre/kg/roll)
  - `compatibleCategories` / `compatibleBrands` / `compatibleModels`
  - `warrantyMonths`, `gstPercent`, `hsnCode`, `storageLocation`, `isActive`
  - derived `marginPerUnit`, `stockValue`, `imageUrl`
- [x] New `SparePartStockMovement`: an append-only history of stock changes. Types: OPENING, RESTOCK, ISSUE, ADJUSTMENT. Each has a signed quantity, the stock after, a reason and who made it.
  - Creating a part with stock records OPENING.
  - `POST /super-admin/spare-parts/:id/stock` restocks, issues or adjusts with a reason. It is atomic and never goes below 0.
  - A stock change made through the edit form is recorded as an ADJUSTMENT.
- [x] `GET /super-admin/spare-parts`:
  - search (name, part no., brand, ID, compatible model), filter by appliance (main or compatible), stock in/low/out, status, paging
  - `meta.summary` for the whole catalogue: parts, units, stock value at cost, low stock, out of stock
  - The old page loaded only the first 20 parts.
- [x] `GET /super-admin/spare-parts/:id`: the part plus its 50 latest stock movements
- [x] Partner job screen:
  - lists parts for the job's appliance (main or compatible), active parts only
  - now includes picture, unit and warranty
- [x] Admin screens (`/super-admin/inventory`, `/new`, `/:id`, `/:id/edit`):
  - **List**: 5 summary cards (low / out of stock act as filters); picture, part no., fits, cost → price, stock badge with re-order level, supplier / bin.
  - **Editor** sections:
    - Part details and pictures.
    - Fits: other appliances, compatible brands and models.
    - Specifications.
    - Pricing, with live selling price / margin / with-GST.
    - Stock, supplier & warranty.
  - **Detail page**:
    - Pictures, fits, specifications, pricing breakdown, supply & storage.
    - Stock card with **Restock / Issue / Adjust**, and the stock history table.
- [x] Tests: backend `storeAndInventory.test.js` (Inventory, 3 tests); UI `storeAndInventory.spec.js` (add a part → restock → history shows +10 and the opening stock)

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | _pending_ | Detailed parts, stock history, list/detail/editor pages |

**Test output** (Phases 20 + 21)
```
backend  $ npm test                 Test Suites: 49 passed · Tests: 747 passed   (storeAndInventory.test.js: 9 new)
e2e      $ npx playwright test      194 passed
e2e      $ npm run test:ui          48 passed (46.9s)  ·  rerun: 48 passed (52.6s)
frontend $ npm run build            ✓   (lint: 0 errors)
```
