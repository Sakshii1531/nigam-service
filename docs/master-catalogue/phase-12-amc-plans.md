# Phase 12 — AMC Plans (Membership merged in), Admin-Managed

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 7 |

## Goal

AMC plans and membership plans are one product: an **AMC Plan**. There is one customer route (`/buy/amc`) and one admin section. Every price, visit count and benefit comes from the admin, and nothing is hardcoded.

---

## Tasks

- [x] Model: `AMCPlan` gains `description`, `benefits[]`, `durationMonths`, `applianceCategory` (null = any appliance), `displayOrder`, `isPopular`; `tier` becomes free text
- [x] Admin API `/super-admin/plans/amc` (CRUD + activate/deactivate + audit) and a **Plans & Warranty → AMC Plans** screen
- [x] Customer: the AMC appliance picker is built from the plans (appliances that have a plan, "from ₹X" = the cheapest plan) instead of 5 hardcoded appliances and prices; plan cards use the admin's benefits text
- [x] Membership removed: `Membership` / `UserMembership` models and `/memberships` routes deleted; the Loyalty → Memberships tab removed; `/membership-plans` redirects to `/buy/amc`; Profile / Footer / Buy links renamed "AMC Plans"
- [x] Seed: AMC plans per appliance (Silver / Gold / Platinum) with DEMO prices
- [x] Tests: admin CRUD; a deactivated plan disappears; purchase still creates a subscription with the plan's visits; `/memberships` is gone

---

## Example

Admin adds "AC Gold AMC — ₹1,799, 3 visits, 12 months, benefits: free gas top-up…". The AMC page shows Air Conditioner "from ₹999" (its cheapest plan) and the new Gold card with those exact benefits.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `686c217` | One AMC Plan product; Super Admin → Plans → AMC Plans; membership deleted. New `plansAdmin.test.js` (8 tests); e2e appliances spec 14 ✓; browser walkthrough ✓ |

**Why AMC wins the merge.** An AMC subscription does real work: its visits become covered "AMC Visit" jobs (₹0 to the customer) until they run out or the plan expires. A membership only stored a tier and a benefits list that nothing applied (no discount was ever given). Profile already showed an active AMC as "My Membership".

**Model** (`AMCPlan`)
- **New fields:** `description`, `benefits[]`, `durationMonths` (default 12), `applianceCategory` (a Master Catalogue category key, or null for any appliance), `displayOrder`, `isPopular`.
- **Changed:** `tier` is now a free label (Silver, Gold, Diamond…).
- **Subscriptions:** validity now comes from the plan's `durationMonths` instead of a fixed year. A switched-off plan can't be bought.

**API**

| Call | Purpose |
|---|---|
| `GET /warranty-amc/amc/appliances` | Appliance picker: `{ appliance, name, fromPrice, planCount }`. The from-price includes any-appliance plans. |
| `GET /warranty-amc/amc/plans?appliance=AC` | That appliance's plans first, then any-appliance plans |
| `GET/POST/PUT/DELETE /super-admin/plans/amc[/:id]` | Admin CRUD, audited. A plan customers bought can't be deleted (409): switch it off instead. The list shows how many were sold. |

**Membership removed**
- **Backend:** `Membership` and `UserMembership` models, `/api/v1/memberships`, and the Loyalty → Memberships endpoints are gone.
- **Frontend:** `MembershipPlans.jsx` and the Loyalty "Membership Plans" tab are gone. The sidebar link is now **AMC Plans** (`/super-admin/plans?tab=amc`), and `/membership-plans` redirects to `/buy/amc`.
- **Links re-pointed:** Profile ("AMC Plan", "Get an AMC Plan"), Buy hub banners, Footer and the Help FAQ.

**Customer AMC page**
- The appliance list, "From ₹X" and plan count come from the API; the 5 hardcoded appliances and prices are gone.
- Plan cards show the admin's name, description, benefits, *Popular* flag and validity ("/ year" or "/ 6 months").
- The URL carries the catalogue key (`/buy/amc/plans/AC`).
- Fixed an older bug: "Washing Machine" matched the AC brand list and image because "m**ac**hine" contains "ac".

**Seed** (`scripts/planSeedData.js`, DEMO prices):
- 3 any-appliance plans (Silver ₹999 / 2 visits, Gold ₹2,499 / 4, Platinum ₹3,999 / 6);
- 12 appliance plans across AC, Refrigerator, Washing Machine, TV, RO and Geyser.

Benefits only claim what the system does ("N scheduled service visits at no charge", "Valid for 12 months"). The old membership copy promised "% off" discounts that were never implemented, so it was not carried over.

**Worked example (browser):**
1. Admin → AMC Plans → **New AMC plan**: *AC Diamond AMC*, AC, Diamond, ₹3,999, 6 visits, three benefit lines, then Save (`screenshots/phase-12/1-new-plan.png`, `2-plans-table.png`).
2. Customer → `/membership-plans` redirects to `/buy/amc`. Select appliance shows AC (7 plans, from ₹999), Geyser (from ₹599)… (`3-appliances.png`).
3. AC shows the new *AC Diamond AMC* card with exactly the admin's benefits (`4-ac-plans.png`).

**Deviations from plan:** none. (Plans sit on their own admin page, *Plans*, rather than under the existing "NCC AMC" subscriptions page, which still lists who bought what.)

**Known gaps:** appliance artwork on the AMC picker still comes from the app's bundled images, matched by name. A category with no bundled image (e.g. Geyser) shows the generic one.
