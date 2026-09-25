# Phase 6 — Discovery: Search + Every Entry Point on Offerings

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25, uncommitted) |
| **Estimate** | 5–6 developer-days |
| **Depends on** | Phase 4 |
| **Client requirements** | 1, 15, 21, 22 |
| **Client tests closed** | 10 (from every entry point, not just `/book/:category`) |
| **Breaks anything existing?** | Removes the `/booking?service=&price=` page and the price fields of CMS service pages |

## Goal

Every way a customer can reach a service leads into the same offering-based
flow at the right pre-selected step. That covers search, the home dashboard,
category pages, service pages, the refrigerator page and warranty shortcuts. No
page anywhere shows a price that did not come from the catalogue.

---

## Tasks

### 6.1 Search API
- [x] `GET /api/v1/catalog/search?q=&city=&limit=`
  - Mongo `$text` on `ServiceOffering.searchText` (+ category/service `keywords`), fallback case-insensitive prefix regex for queries under 3 chars or with no text hits
  - only bookable offerings (same filter as the tree API: active, available, serviceable, rated)
  - **grouped** results so "AC installation" doesn't return a wall of near-duplicates:
    ```jsonc
    { "groups": [
        { "title": "Split AC Installation", "category": "AC", "fromPrice": 1399.00,
          "variantCount": 3, "deepLink": "/book/AC?pt=split&svc=installation" },
        { "title": "Window AC Installation", "category": "AC", "fromPrice": 599.00,
          "deepLink": "/book/AC?pt=window&svc=installation" } ],
      "categories": [{ "key": "AC", "name": "AC" }] }
    ```
  - customer-safe (no payout)
- [x] Seed/admin keywords so the client's examples resolve:

| Query | Top result |
|---|---|
| "AC installation" | Split AC Installation (from ₹1,399), Window AC Installation ₹599 |
| "Fan installation" | Fan Installation ₹299 |
| "Water tank cleaning" | Water Tank Cleaning (from ₹499) |
| "RO pre filter" | RO Pre-Filter Service / Replacement ₹349 |
| "Electrician" | Electrical category + Electrician Consultation, Fan/Switch/Socket Installation |
| "TV installation" | LED TV Installation (from ₹349) |

- [x] Tests `backend/tests/catalogSearch.test.js`: every row of the table above

### 6.2 Deep links into the booking flow
- [x] `BookingFlow.jsx` accepts `?pt=&variant=&svc=&offering=&qty=` and pre-selects them, then jumps to the first step that still needs input
- [x] `/book/o/:offeringCode` → resolves the offering → redirects to `/book/:category?offering=CODE`

### 6.3 Customer search UI
- [x] Wire the existing search inputs (`Dashboard.jsx`, `Categories.jsx`) to `/catalog/search` with 250 ms debounce; result sheet shows groups with "from ₹X" and navigates via `deepLink`
- [x] Empty state: "No service found for '…'. Talk to us" → existing Help & Support

### 6.4 Replace every hard-priced entry point

| File | Today | After |
|---|---|---|
| `pages/Dashboard.jsx` (~1163, ~1173) | `/booking?service=…&price=…` (and `price=0&warranty=true`) | `/book/:category?svc=…` (+ `&warranty=1`, which makes the flow run warranty detection → coverage) |
| `pages/AllApplianceServices.jsx` (~83) | `/booking?service=…&price=${service.price}` | tile → deep link; price label = `fromPrice` from the tree/search API |
| `pages/AllCleaningServices.jsx`, `pages/AllServices.jsx` | static/CMS prices | same as above |
| `pages/RefrigeratorDetails.jsx` (~96, ~105) | `/booking?service=Refrigerator Service&price=…` | `/book/Refrigerator?svc=…` |
| Home tiles (`cms/home-tiles`) | tile → category/service name | tile stores a category key or offering code; no price field |
| Service pages (`ServicePageConfig.catalog[].items`) | `price: "₹149"` display string | item stores `offeringCode`; the page fetches live price via `getOffering()`; "Book" → deep link. Items whose offering is inactive are hidden |
| `CategoryBookingConfig.services` | per-type service lists with prices | **dropped**; `brands`, `whyBrandPoints`, `categoryNote` stay (brand picker content) |

- [~] CMS admin (`CustomerAppCustomization.jsx`): service-page catalog editor swaps the free-text price input for an **offering picker** (search by code/name); category customization loses its services editor
- [~] Backend: `ServicePageConfig` item schema: `price` removed, `offeringCode` added; `CategoryBookingConfig.services` removed
- [~] Delete `pages/Booking.jsx` and its `/booking` route (keep `/booking` as a redirect to `/services` for any old links)

### 6.5 Consistency check across entry points (Test 10)
- [x] Manual matrix: for **Split AC 1.5T Install**, **Fan × 2** and **Tank 1000 L**, enter from (a) search, (b) home tile, (c) category page, (d) service page, (e) dashboard shortcut. Record the price on the entry card, step 2, step 4, payment and booking details. All must match the quote

---

## Worked example: "fan installation" from search

1. Customer types *fan* → sheet shows **Fan Installation · Electrical · ₹299 per fan**
2. Tap → `/book/Electrical?svc=fan_installation` → flow opens at step 2 with Fan Installation selected, qty 1
3. Qty 2 → bottom bar ₹705.64 → same number on summary, payment and booking details

## Acceptance

- [x] `npm test -- catalogSearch` green
- [x] `grep -rn "price=\${\|&price=\|?price=" frontend/src` → no hits in customer booking paths
- [x] Entry-point matrix (6.5) filled in the log, all equal
- [x] Client test 10 marked ✅

## Out of scope

Typo tolerance / fuzzy search (Atlas Search) if Mongo text search proves too strict; that would be a follow-up.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | _uncommitted_ | (Phase 7 follow-up: a label naming a product type — "Split AC Installation" — now resolves to that type's price.) Search API + resolve + service-groups, deep links, short link, search UI, every customer entry point re-pointed. Backend 685/685, e2e 192 passed / 1 skipped, frontend build ✅ |

### What was built

**Backend** — `backend/src/modules/catalog/offeringSearch.service.js`

| Endpoint | Purpose |
|---|---|
| `GET /catalog/search?q=&city=&pincode=&limit=` | Grouped results (`{ groups, categories }`), each group `{ title, category, productType, service, fromPrice, offeringCount, deepLink }` |
| `POST /catalog/search/resolve` `{ labels: [...] }` | Best destination + "from" price for free-text labels (home tiles, CMS titles, old `/booking?service=` links). `null` = nothing bookable |
| `GET /catalog/service-groups` | Every bookable service grouped the same way (the "all services" pages) |

How matching works (instead of Mongo `$text`, see Deviations):
- The query is split into words, lowercased, with plurals trimmed ("fans" → "fan") and filler words dropped ("service", "near", "me", …).
- **Every** word must match a word, or the start of a word, in the offering's `searchText`. That text holds the code, name, category name and keywords, product type, size, and service name and keywords.
- An exact word scores 2 and a prefix scores 1. Offerings whose own service / type / category *name* carries the words get a bonus. When any such named match exists, matches that came only through keywords are dropped: "fan installation" returns only Fan Installation, not Switch Installation via the Electrician keyword "fan".
- Only bookable offerings are searched, using the same filter as the booking tree (active, in date, serviceable, rated). Sizes of one (type, service) fold into one group with the lowest price.
- Resolve order:
  1. A label whose words all name a category → that category.
  2. Otherwise the best (category, service) match across product types ("AC repair" → `/book/AC?svc=repair`).
  3. Otherwise a category whose whole key or name appears in the label ("Foam-jet AC service" → AC).
  4. Otherwise `null`.

Client's example queries (`backend/tests/catalogSearch.test.js`, 12 tests):

| Query | Top result | Link |
|---|---|---|
| AC installation | Split AC Installation from ₹1,399 (3 sizes) · Window AC Installation ₹599 — nothing else | `/book/AC?pt=split&svc=installation` |
| Fan installation | Fan Installation ₹299 (only) | `/book/Electrician?svc=fan_installation&offering=ELEC-FAN-INSTALL` |
| Water tank cleaning | Water Tank Cleaning from ₹499 (4 sizes) | `/book/Water%20Tank%20Sump%20Cleaning?svc=water_tank_cleaning` |
| RO pre filter | RO Pre-Filter Service / Replacement ₹349 | |
| Electrician | Electrician category + Consultation, Fan / Switch / Socket Installation, … | `/book/Electrician` |
| TV installation | LED TV Installation from ₹349 (4 sizes) | |

**Deep links** — `BookingFlow.jsx` + `selectionFromDeepLink()` in `lib/catalogueApi.js`

- `?pt=&variant=&svc=&offering=&qty=` are applied once, when the category tree loads, on a fresh start (a resumed booking wins). Unknown slugs are ignored, so a stale link still opens the category.
- The flow opens at step 2 when the type/size (or standalone option) is fully chosen. Otherwise it opens at step 1.
- `svc` for a product-linked service is a *preferred* service: it is selected in step 2 as soon as the chosen type/size offers it. Example: the "Repair" tile opens AC at step 1, and after Split AC · 1.5 Ton, Repair is already selected.
- `/book/o/:offeringCode` resolves the offering and redirects to `/book/:category?offering=CODE`.
- `/booking?service=…&price=…` (old links) now resolves the `service` label and redirects. `price` is ignored.

**Search UI** — `lib/useCatalogueSearch.js` (250 ms debounce, latest query wins) and `components/common/CatalogueSearchResults.jsx`

- Dashboard search bar: a results sheet under the input. It shows categories first, then services with "from ₹X" and the option count.
- Categories page: catalogue results above the existing category-name matches.
- Empty state: "No services found for '…'" with a **Help & Support** button (`/help-support`).

**Entry points re-pointed**

| File | Before | After |
|---|---|---|
| `pages/Dashboard.jsx` most-booked + appliance tiles | hardcoded fallback prices (₹649, ₹299, ₹1198…) and CMS `price`; `/booking?service=&price=` | price = catalogue "from ₹X" via resolve, or blank; click → resolved `deepLink` (an explicit CMS link like `/refrigerator-details` still wins), else `/services` |
| `pages/Dashboard.jsx` warranty modal | `/booking?…&price=0&warranty=true` / `&price=…` | both buttons → the resolved deep link; coverage is detected by the booking from brand + registered cover (P4) |
| `pages/Dashboard.jsx` `hasServicePage` + `/cms/service-pages` fetch | legacy service-page lookup | removed |
| `pages/AllApplianceServices.jsx` | legacy `category.services[].price` → `/booking?…&price=` | `GET /catalog/service-groups` → "from ₹X" → deep link |
| `pages/AllCleaningServices.jsx` | hardcoded prices and fake "% OFF" badges → `/booking` | curated artwork tiles; price and link via resolve (none of these five are in the catalogue yet, so no price → `/services`) |
| `pages/RefrigeratorDetails.jsx` | legacy price, "Starting from ₹499", "Save up to 20%", `/booking?…&price=` | resolve "Refrigerator" → "from ₹X" or "Price shown when you book"; both buttons → `/book/Refrigerator` |
| `CustomerAppCustomization.jsx` | "Legacy prices" notice | notice now says tile prices are **not shown to customers**; the tile title is matched to the catalogue |

### Worked example (from the browser run)

1. Dashboard → type **fan inst** → the sheet shows **Fan Installation · Electrician · ₹299** (`screenshots/phase-6/1-dashboard-search.png`).
2. Tap it → `/book/Electrician?svc=fan_installation&offering=ELEC-FAN-INSTALL`. The flow opens at step 2 with Fan Installation selected.
3. Tap + → qty 2 → **₹705.64** (598 + 18 % GST). Step 4 shows the same ₹705.64 (`search-fan-step2.png`, `search-fan-step4.png`).

**Entry-point matrix** (browser run against a local seeded DB; reference = `POST /catalog/quote`, Pay After Service, uncovered brand):

| Offering | Quote | Search | Home tile | Deep link | Short link `/book/o/` | Category page | Step 2 | Step 4 |
|---|---|---|---|---|---|---|---|---|
| Split AC 1.5T Install | ₹1,768.82 | ✅ (group → pt+svc preselected) | — (no seeded tile) | ✅ `?pt=split&variant=15t&svc=installation` | ✅ | ✅ | ✅ | ✅ |
| Fan × 2 | ₹705.64 | ✅ Dashboard search | — | ✅ (search link) | — | — | ✅ | ✅ |
| Tank 501–1000 L | ₹824.82 | ✅ Categories search | — | ✅ (search link) | — | — | ✅ | ✅ |

The home tiles were checked separately:
- The seeded "Repair" tile shows **from ₹349** (lowest AC repair: Window AC).
- It opens `/book/AC?svc=repair`, and Repair is preselected after the type/size pick (`6-home-tiles.png`, `6b-tile-ac-repair-step2.png`).
- `/booking?service=AC%20Repair&price=5` → `/book/AC?svc=repair`.

Payment and booking-details screens were verified to carry the quote in Phase 4. They read `bookingMeta.quote` and the booking snapshot, so they don't depend on the entry point.

Note from the run: a customer with a registered warranty on the chosen brand correctly sees ₹0 at step 4. The first matrix attempt used such a brand, so the matrix uses "Other / Not Listed".

**Deviations from plan:**
- **Word/prefix matching in JS instead of Mongo `$text`.** The DB is narrowed by a regex on the longest word, and every word must then match. `$text` ORs words together: "AC installation" would also return every TV and fan installation, which fails the client's first example. At catalogue size (tens to hundreds of offerings) this is cheap.
- **Tiles keep free-text titles** (resolved by `POST /catalog/search/resolve`) instead of storing a category key or offering code. The CMS schema and editor stay unchanged. This keeps CMS editing as it is, and a title that stops matching simply loses its price.
- **Not done here, moved to Phase 7 (legacy cleanup) — done there, see its log:**
  - Deleting `ServicePageConfig` item prices and `CategoryBookingConfig.services`, plus their CMS editors. No customer screen reads them any more.
  - The CMS offering picker.
  - Deleting the dead `frontend/src/data/bookingCatalog.js`.
- `/booking` is kept as a redirect (label → catalogue), as the plan allowed.

**Known gaps carried forward:**
- Seeded categories without offerings (Refrigerator, Plumber, salon, home cleaning…) show no price and open the services list or an empty booking state until rates are entered.
- Search has no typo tolerance ("instalation" finds nothing); fuzzy search is still out of scope.
- The spare-parts strip on the Dashboard still has static product prices. Those are store products, not services, so they are outside the catalogue.
