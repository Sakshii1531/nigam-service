# Phase 9 — Remove Dead CMS Screens

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 8 |

## Goal

Every CMS screen left in the admin changes something a customer sees. Screens whose data no customer screen reads any more are deleted, along with their backend modules.

---

## Tasks

- [x] Audit every section of `CustomerAppCustomization.jsx` (and `CMS.jsx`) against what the customer app actually reads
- [x] Delete the service-page editor + `ServicePageConfig` (model, routes, service, validation, `/cms/service-pages`)
- [x] Delete the category booking-config editor + `CategoryBookingConfig` (`/cms/category-configs`) — brands, "why brand" points and notes live on `Category`, editable in the Master Catalogue
- [x] Delete any other section the audit finds unused (e.g. the "dashboard-service" tile placement the Dashboard computes but never renders)
- [x] Tests/specs that exercised deleted endpoints removed; suites green

---

## Example

The admin opens CMS → Customer App and sees only sections that affect the app (banners, category chips, home tiles, brand cards…), not a "Service page catalogue" that nothing reads.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `686c217` | CMS editor 4,700 → 3,329 lines; 2 backend modules deleted. Backend 702/702 (the 4 service-page tests went with the feature), build ✓ |

**Audit: what each CMS section feeds**

| Section (CMS → Customer App) | Customer reader | Result |
|---|---|---|
| Category chips | Dashboard top chips (`/cms/home-tiles?placement=category`) | kept, now just name + icon + For You / More / Fridge flags |
| Banners | Dashboard carousel (`/cms/banners`) | kept |
| Brands & Offers | Dashboard brand cards | kept |
| Most Booked / Appliance Services tiles | Dashboard tiles; price and link from the catalogue (Phase 6) | kept, now title + rating + badge + image (+ optional link) |
| Stories | `components/home/Stories.jsx` | kept |
| **Services tiles** (`dashboard-service`) | **nothing**: the Dashboard built the list and never rendered it | **deleted** (section, sidebar link, Dashboard code) |
| **Service pages**: "Checkout Booking Flow Settings" + "Services & Packages" inside the tile editors (`/cms/service-pages`) | **nothing** since Phase 4 | **deleted** (UI, `ServicePageConfig` model/routes/service/validation) |
| **Category booking config**: brands, appliance types, price note, services JSON, "details page link" (`/cms/category-configs`) | **nothing**; the booking flow reads `Category` + the Master Catalogue | **deleted** (UI, `CategoryBookingConfig` module) |
| CMS & Pages (`CMS.jsx`) | FAQs, About NCC, policy pages | kept |

**Also removed**:
- about 40 hardcoded default "packages" and product-type lists;
- the start-up code that silently wrote default service pages on every admin visit;
- 7 unused image imports;
- the `/booking` default path on appliance tiles (a tile with no explicit link now opens its catalogue service).

**Deviations from plan:** none.
