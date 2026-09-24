# Phase 6 — Discovery: Search + Every Entry Point on Offerings

| | |
|---|---|
| **Status** | ⬜ Not started |
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
- [ ] `GET /api/v1/catalog/search?q=&city=&limit=`
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
- [ ] Seed/admin keywords so the client's examples resolve:

| Query | Top result |
|---|---|
| "AC installation" | Split AC Installation (from ₹1,399), Window AC Installation ₹599 |
| "Fan installation" | Fan Installation ₹299 |
| "Water tank cleaning" | Water Tank Cleaning (from ₹499) |
| "RO pre filter" | RO Pre-Filter Service / Replacement ₹349 |
| "Electrician" | Electrical category + Electrician Consultation, Fan/Switch/Socket Installation |
| "TV installation" | LED TV Installation (from ₹349) |

- [ ] Tests `backend/tests/catalogSearch.test.js`: every row of the table above

### 6.2 Deep links into the booking flow
- [ ] `BookingFlow.jsx` accepts `?pt=&variant=&svc=&offering=&qty=` and pre-selects them, then jumps to the first step that still needs input
- [ ] `/book/o/:offeringCode` → resolves the offering → redirects to `/book/:category?offering=CODE`

### 6.3 Customer search UI
- [ ] Wire the existing search inputs (`Dashboard.jsx`, `Categories.jsx`) to `/catalog/search` with 250 ms debounce; result sheet shows groups with "from ₹X" and navigates via `deepLink`
- [ ] Empty state: "No service found for '…'. Talk to us" → existing Help & Support

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

- [ ] CMS admin (`CustomerAppCustomization.jsx`): service-page catalog editor swaps the free-text price input for an **offering picker** (search by code/name); category customization loses its services editor
- [ ] Backend: `ServicePageConfig` item schema: `price` removed, `offeringCode` added; `CategoryBookingConfig.services` removed
- [ ] Delete `pages/Booking.jsx` and its `/booking` route (keep `/booking` as a redirect to `/services` for any old links)

### 6.5 Consistency check across entry points (Test 10)
- [ ] Manual matrix: for **Split AC 1.5T Install**, **Fan × 2** and **Tank 1000 L**, enter from (a) search, (b) home tile, (c) category page, (d) service page, (e) dashboard shortcut. Record the price on the entry card, step 2, step 4, payment and booking details. All must match the quote

---

## Worked example: "fan installation" from search

1. Customer types *fan* → sheet shows **Fan Installation · Electrical · ₹299 per fan**
2. Tap → `/book/Electrical?svc=fan_installation` → flow opens at step 2 with Fan Installation selected, qty 1
3. Qty 2 → bottom bar ₹705.64 → same number on summary, payment and booking details

## Acceptance

- [ ] `npm test -- catalogSearch` green
- [ ] `grep -rn "price=\${\|&price=\|?price=" frontend/src` → no hits in customer booking paths
- [ ] Entry-point matrix (6.5) filled in the log, all equal
- [ ] Client test 10 marked ✅

## Out of scope

Typo tolerance / fuzzy search (Atlas Search) if Mongo text search proves too strict; that would be a follow-up.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| | | |

**Entry-point matrix:**

| Offering | Search | Home tile | Category | Service page | Dashboard | Step 2 | Step 4 | Payment | Booking |
|---|---|---|---|---|---|---|---|---|---|
| Split AC 1.5T Install | | | | | | | | | |
| Fan × 2 | | | | | | | | | |
| Tank 501–1000 L | | | | | | | | | |

**Deviations from plan:**

**Known gaps carried forward:**
