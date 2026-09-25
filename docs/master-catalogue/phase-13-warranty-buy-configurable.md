# Phase 13 — Extended Warranty, Buy Hub & Store Lists Admin-Managed

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 12 |

## Goal

No customer-facing price anywhere in the app is typed into the code. Extended-warranty plans get an admin screen; the Buy hub's appliance and accessory lists and the Dashboard's spare-parts strip come from admin-managed data.

---

## Tasks

- [x] Admin API `/super-admin/plans/extended-warranty` (CRUD, per-appliance scoping, claims, features) + **Plans & Warranty → Extended Warranty** screen
- [x] Buy hub: the EW appliance picker comes from the EW plans ("from ₹X"), with no hardcoded 5 appliances / prices; the plan list is filtered to the chosen appliance
- [x] Buy hub "All appliances" (Smart TV ₹10,999…) and "Accessories" (₹199…) come from `/products` (admin Products), filtered by product category
- [x] Dashboard "Spare Parts & Accessories" strip comes from `/products`
- [x] Membership fallbacks removed (Phase 12); the finance page's invented "pre-approved" limits and rates removed (see log)
- [x] Grep gate: no `price: "₹…"` / `price: 1234` literals left in customer pages
- [x] Tests: admin CRUD for EW plans; the Buy hub shows only what the admin configured

---

## Example

Admin sets "Refrigerator — 2-year Extended Warranty ₹1,299". The Buy → Extended Warranty picker shows Refrigerator "from ₹1,299" and that plan, and an admin price change shows up at once.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `686c217` | EW packs admin + public appliance picker; Buy hub and Dashboard store lists from Products; fake finance approvals removed. `plansAdmin.test.js` 12 tests (4 new); browser walkthrough ✓ |

**Extended-warranty packs**
- **Model:** `ExtendedWarrantyPlan` gains `displayOrder` and `isPopular`. `applianceCategory` is now a Master Catalogue key.
- **Admin API:** `GET/POST/PUT/DELETE /super-admin/plans/extended-warranty[/:id]`, audited. A pack customers bought can't be deleted (409), only switched off. The list shows how many were sold.
- **Public API:** `GET /warranty-amc/extended-warranty/appliances` returns `{ appliance, name, fromPrice, planCount }`, and plans are filtered by `?category=` (the appliance's packs first, then any-appliance ones). A switched-off pack can't be bought.
- **Admin UI:** **Plans → Extended Warranty** tab, and a sidebar link **Warranty Packs**.
- **Seed:** 12 packs across TV, Refrigerator, Washing Machine, AC, RO, Geyser, Microwave, Chimney and Air Cooler (DEMO prices), plus the 2 existing any-appliance packs.

**Buy hub (`Buy.jsx`)**

| Section | Before | After |
|---|---|---|
| Extended Warranty → Select appliance | 5 hardcoded appliances with prices | admin packs: appliance, pack count, "From ₹X" (`1-ew-appliances.png`) |
| Select tier | all packs for every appliance | that appliance's packs + any-appliance packs (`2-fridge-packs.png`) |
| All Appliances | 9 hardcoded tiles | every appliance with a pack, with its from-price |
| Popular Products | 5 hardcoded appliances (₹6,999…) that opened a *warranty* page | store Products (Super Admin → Products); tap opens the product page |
| Spare Parts & Accessories | 5 hardcoded RO parts (₹199…) | Products in the "Spare Parts" category (`3-store.png`) |
| Shop by Category row | display names | catalogue keys (no prices; icons kept) |

- Fixed: `/buy/accessories` and `/buy/all-appliances` had no URL → step mapping, so those two pages could never be reached. They always showed the hub.
- Fixed: the same "washing m**ac**hine matches AC" brand bug as on the AMC page.

**Dashboard.** The "Spare Parts & Accessories" strip now reads `/products?category=Spare Parts`. The seed adds the 5 RO parts as real Products and seeds the product categories the admin Products screen picks from.

**Other hardcoded amounts removed**
- **Finance page:** after "apply" it used to say *"Congratulations! Your eligibility is pre-approved by our CIBIL validation system"* with an invented limit (₹8,50,000 / ₹1,20,000…) and rate, although no request was sent anywhere. It now says the finance partner will call back with eligibility, limit and rates. The subtitle no longer promises "pre-approved up to ₹10,00,000".
- **Searching-partner care tip:** "Save up to ₹800/month" became "Lower power bills".

**Price-literal gate** (customer pages):

```
grep -rnE "(price|amount|mrp|cost)[A-Za-z]*: *['\"]?₹?[0-9]{2,}|₹ ?[0-9][0-9,]{2,}" frontend/src/{pages,components,context,lib}
```

This excludes super-admin, partner and placeholders. The only matches left are code comments and the **brand-admin** portal (see Known gaps).

**Deviations from plan:** the finance loan copy was not turned into CMS text. The invented numbers were removed instead, since they were fake approvals, not product prices.

**Known gaps:**
- The **brand-admin** Dashboard and Payments pages still show hardcoded summary figures (e.g. "Total Collected ₹40,30,020"). They are brand-portal KPIs, not product prices or customer screens, and should be wired to the brand invoice API. Logged as a follow-up.
- Product and appliance *artwork* is bundled and matched by name unless the admin uploads an image.
