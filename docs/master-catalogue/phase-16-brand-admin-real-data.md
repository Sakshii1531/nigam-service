# Phase 16 — Brand-Admin Dashboard & Payments from Real Data

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 15 |

## Goal

Every number on the brand-admin Dashboard and Payments pages comes from the brand's own data; none is hardcoded.

---

## Tasks

- [x] `GET /brand/payments/summary`: collected this month (successful customer payments on the brand's jobs), paid out this month (settled partner payouts), outstanding dues (unpaid invoices: count + amount), overdue (unpaid more than 30 days after the invoice was raised: count + amount)
- [x] `GET /brand/dashboard` adds `finance` (total / pending / paid / overdue invoice value) and `parts` (inventory on hand, parts in transit, FOC parts approved, dispatched today) from the brand's inventory and part orders
- [x] Payments summary cards and the Dashboard "Financial Overview" and parts cards read these; loading and empty states instead of numbers
- [x] Tests: brand-scoped (another brand's data never counted), exact sums on seeded invoices / payments / payouts / part orders

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `a08a6dc` | New `GET /brand/payments/summary`; `/brand/dashboard` gains `finance` + `parts`; 10 hardcoded figures replaced. `brandAdmin.test.js` 61 tests (2 new, with a second brand's data seeded to prove isolation) |

**What each figure is now** (all scoped to the logged-in brand)

| Screen · card | Before | Now |
|---|---|---|
| Payments · Total Collected | ₹40,30,020 | successful customer payments on the brand's jobs, this calendar month |
| Payments · Total Paid Out | ₹8,24,320 | settled partner payouts (net) on the brand's jobs, this month |
| Payments · Outstanding Dues | ₹9,910 · "2 pending" | unpaid invoices: amount and count |
| Payments · Overdue Amount | ₹3,186 · "1 overdue" | invoices unpaid more than **30 days** after they were raised |
| Dashboard · Financial Overview | ₹48,75,230 / ₹8,45,210 / ₹40,30,020 / ₹2,15,780 | total / pending / paid / overdue invoice value |
| Dashboard · Spare Parts | 15,230 / 1,845 / 2,356 / 256 | stock held by the brand's partners / parts dispatched and not yet delivered / approved FOC claims / parts dispatched or handed over today |

Each card shows "—" while loading.

- **Scoping:** payments, payouts and part orders belong to a brand through Job → ServiceRequest.brand (the same rule the existing lists use); invoices carry the brand directly.
- **Example** (from the test): Brand A has invoices of ₹1,000 paid, ₹500 pending, and ₹300 pending for 40 days. Its Payments page shows Outstanding **₹800 (2 invoices)** and Overdue **₹300 (1)**. Brand B's ₹9,999 invoice and ₹5,000 payment never appear.

**Deviations from plan:** the "FOC Parts Approved" card counts approved FOC *claims*, the unit the data has, so it's labelled "Claims" rather than "Pcs".

**Known gaps:** invoices have no due date, so the 30-day overdue term is fixed in code (`INVOICE_OVERDUE_DAYS`).
