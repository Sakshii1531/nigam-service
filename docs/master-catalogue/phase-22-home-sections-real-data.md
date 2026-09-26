# Phase 22 — Home Screen Sections from Real, Bookable Data

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phases 6, 17, 20 |

## Goal

Check these four customer-home sections and make them honest:
- Most Booked Services
- Appliance repair & service
- Spare Parts & Accessories
- Stories

Each should be configurable from Super Admin and fed from the database: no hardcoded names, prices, ratings or mock items. Every service card must open a real, bookable service.

## What the audit found

| Section | Before |
|---|---|
| Most Booked / Appliance | Tiles were free-text titles, and the app guessed a service from the words (e.g. "Repair"). **Ratings (4.76, 4.9…) and badges ("Instant", "Best Seller", "Trending", "2 ACs") were typed in by hand.** The admin page wrote a built-in default list, ratings included, into the database whenever it found none. The app showed a hardcoded list when the database had no tiles. The seed put the same 6 tiles in both rows, so they looked identical. |
| Spare Parts & Accessories | Read store products in the "Spare Parts" category, but no such category existed in the dev database, so the row was always an empty heading. Every card had a fixed "Genuine" badge and opened a generic page. |
| Stories | Admin-managed, but with nothing published the app showed a bundled set of 4 stories. The dev database had only 2 leftover "Scheduled" test stories. |

---

## Tasks

- [x] `HomeTile.target` = `{ productType | null, service }`, the catalogue service group a service tile books.
  - `rating` and `badge` were removed from the model and the API.
  - A most-booked / appliance-service tile without a valid target is refused (400); so is a product type from another category.
  - The title defaults to the service name.
- [x] `GET /catalog/home-sections?city=&pincode=`, every figure live:
  - **price**: the group's lowest current rate for that location ("from ₹…", before GST)
  - **Instant**: only when the service can be booked as an express visit
  - **rating**: the average of real customer reviews of bookings of that service, with the review count; none when there are no reviews
  - **link**: that service's booking flow
  - A tile whose service isn't bookable in the customer's city is left out.
  - **Most Booked** = pinned tiles first, then the services with the most bookings in the last 90 days (cancelled ones excluded), up to 8. It is empty when there are neither.
  - Cached 60 s; any catalogue or tile write clears it.
- [x] `GET /super-admin/catalogue/service-groups`: every bookable service with live price, Instant, rating, review count and 90-day bookings. It feeds the admin pickers.
- [x] Customer home (`Dashboard.jsx`):
  - both rows read `/catalog/home-sections`, with no hardcoded lists and no guessing a service from the title;
  - a row with nothing to show is hidden;
  - the row shows every tile the admin adds (it used to cut off after 8).
- [x] Admin, Customer App → Most Booked / Appliance repair & service:
  - a new editor where each tile picks a **bookable service** (searchable, showing its live price);
  - optional label and picture; reorder, hide, remove;
  - live figures shown per tile;
  - Most Booked also lists what is being filled automatically from real bookings;
  - the old editor, its default lists and the automatic write of fake defaults are removed.
- [x] Spare Parts & Accessories:
  - hidden when there are no products;
  - the badge is only the real discount or real low stock;
  - the price shows with MRP;
  - a card opens that product's page; See All opens Buy → Spare Parts & Accessories.
- [x] Stories:
  - the bundled fallback is removed; with nothing published the row is hidden;
  - a story can link to a bookable service (admin picker). The viewer then shows **Book {service}**, which opens its booking. The button disappears while the service isn't bookable.
- [x] `npm run seed:home` (also run by `seed.js`):
  - removes old free-text tiles from the two rows;
  - creates catalogue tiles: 8 product services for Appliance, 4 pinned for Most Booked;
  - leaves a row the admin has already set up alone.
- [x] Tests: backend `homeSections.test.js` (10); updated tile tests in `superAdmin.test.js`; e2e API endpoint check; UI `homeSections.spec.js`.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | _pending_ | Service tiles are catalogue targets; live home sections; stories can book; no bundled fallbacks |

**Example** (UI spec):
1. The admin opens Appliance repair & service → Add a service, searches "fan inst" and picks **Fan Installation (from ₹299)**.
2. On the customer home, that row shows **Fan Installation — from ₹299**, with no rating because there are no reviews yet.
3. Tapping it opens `/book/Electrician?svc=fan_installation`.

**Test output**
```
backend  $ npm test                 Test Suites: 50 passed · Tests: 757 passed   (homeSections.test.js: 10 new)
e2e      $ npx playwright test      195 passed
e2e      $ npm run test:ui          49 passed (43.0s)  ·  rerun: 49 passed (43.1s)
frontend $ npm run build            ✓   (lint: 0 errors)
```

**Dev database**: not changed in this phase. Until `npm run seed:home` runs there, the old free-text tiles (no catalogue target) are simply not shown. The two home rows stay hidden until tiles are set up.
