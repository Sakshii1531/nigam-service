# Phase 4 — Booking Engine Cut-over + Customer Booking Flow

| | |
|---|---|
| **Status** | ✅ Done (2026-09-24) |
| **Estimate** | 8–10 developer-days (≈ 4 backend, 5–6 frontend) |
| **Depends on** | Phase 2 (Phase 3 recommended so real rates can be entered, but not required; seed data is enough) |
| **Unblocks** | Phase 5, Phase 6 |
| **Client requirements** | 1, 2, 3, 5, 10, 12, 13, 15, 16, 17, 18, 22 |
| **Client tests closed** | 5, 6, 7, 10 (main flow), 11, 12. Also 1–4 end-to-end in the app |
| **Breaks anything existing?** | **Yes, by design.** `POST /bookings` stops accepting `category/serviceSlug/serviceName`. The backend and frontend halves of this phase must merge together. The old `/booking?service=&price=` page is temporarily redirected (properly replaced in Phase 6) |

## Goal

Every new booking is created from **one offering + selected variant + quantity +
options**. The backend prices it with the Phase 2 engine and freezes the full
commercial snapshot. The customer app's main flow (`/book/:category`) is rebuilt
on the tree + quote APIs, so every screen from service selection to booking
confirmation shows the same numbers.

---

## Tasks: backend

### 4.1 Booking model
- [x] `booking.model.js`: add `offering` (ref), `isExpress`, `requiredInfo[]`, `commercial` subdoc (ARCHITECTURE §5)
- [x] Keep `category` (= category key), `productType` (= name), `service {slug,name,price,unit,desc}`, `quantity`, `totalPrice` filled **from the snapshot**, so notifications, service requests, partner screens and search-by-category keep working unchanged

### 4.2 `createBooking` rewrite: `booking.service.js`
- [x] New Zod `createBookingSchema` per ARCHITECTURE §6 (`offeringId`, `variantId`, `quantity`, `isExpress`, `requiredInfo`, `couponCode`, `useCoins`, `expectedFinalAmount`, plus the existing schedule/address/payment/warranty fields). Old keys are rejected with a clear 400
- [x] Order of work:
  1. Load offering → 400 `OFFERING_NOT_BOOKABLE` if missing/inactive/unavailable/unserviceable for `address.city`
  2. `isExpress = data.isExpress || isInstant` (A3); express on a non-express offering → 400
  3. Validate `requiredInfo` against `offering.requiredInfo` (required keys present, select values valid)
  4. Run the existing `detectWarrantyForAppliance()` **before** pricing → `coverage`
  5. `buildQuote()` (Phase 2) with coverage, coupon, coins, payment mode
  6. `expectedFinalAmount` ≠ quote final → **409 `PRICE_CHANGED`** with the fresh customer quote in the body
  7. Create Booking with `commercial` snapshot (internal quote incl. payout) inside the existing `runInTransaction`
  8. Advance = `quote.advanceAmount` (settings %). The client-chosen `advanceAmount` and the hardcoded ₹199 / ₹49 go away
  9. Coins: redeem inside the same flow via `wallet.service.js#redeemCoins` (today they are only deducted client-side in `Payment.jsx`)
- [x] Delete `resolveBookedService()` and `findProductTypeAddon()`. Remove `priceAddon` from `ProductType`
- [x] `catalog.service.js`: `findCategoryOr404` becomes exact-match only (no "any active category" fallback); `findServiceItem` fallback-to-first-service deleted
- [x] Customer-facing booking responses (`GET /bookings`, `GET /bookings/:id`, create response) pass `commercial` through `toCustomerCommercial()`: no payout/margin
- [~] `ServiceRequest` description comes from the offering name (`"TV — LED TV 55–65 inch Installation"`), but for a size-agnostic offering it doesn't include the customer's chosen size. The full snapshot (incl. size) is on the booking; the partner screens read it in Phase 5

### 4.3 Backend tests: rewrite `backend/tests/booking.test.js` seeding via the Phase 1 seeder
- [x] Test 5: book `ELEC-FAN-INSTALL` with no product type → 201, `commercial.productType === null`
- [x] Test 6: `CLEAN-TANK-1000L` with variant "501–1000 L" → snapshot variant label stored; the 500 L variant with the 1000 L offering → 400
- [x] Test 7: `ELEC-CONSULT` qty 2 → 400 `QUANTITY_OUT_OF_RANGE`; qty 1 → 201
- [x] Test 10 (API): `quote.totals.final === booking.totalPrice === booking.commercial.finalAmount`
- [x] Test 11: book TV 55–65 at 799 → admin rate v2 899 → re-fetch booking → still 799 / payout 450 / `rate.version 1`; a new booking gets 899 / 450
- [x] Test 12: deactivated offering → 400; Window AC + Gas Refilling has no offering id to send at all; old-style `{category, serviceSlug}` body → 400
- [x] 409 `PRICE_CHANGED` when `expectedFinalAmount` is stale
- [x] Warranty-covered booking → `finalAmount 0`, `spPayoutTotal` = offering payout
- [x] No `payout`/`margin` key in any customer booking response

## Tasks: frontend

### 4.4 Data layer
- [x] `frontend/src/lib/catalogueApi.js`: `getCategoryTree(key, loc)`, `getOffering(code, loc)`, `getQuote(body)`
- [x] ~~`context/BookingContext.jsx`~~ **BookingFlow state + `bookingMeta`** (see log, deviation 1) owns:
  - `selection { categoryKey, productTypeId, variantId, serviceId, offeringId, quantity, isExpress, extraLines[], requiredInfo, couponCode, useCoins, paymentMode }`
  - `quote` (last server response), `quoteStatus` (loading / error), `refreshQuote()` debounced 300 ms on any selection change
  - persisted to `sessionStorage` so refresh / payment-gateway return keeps it (replaces the current `resumeBooking` handling)
- [x] Helper `pickOffering(tree, { productTypeId, variantId, serviceId })` implementing the variant-agnostic rule (ARCHITECTURE §2.5). This is the only selection logic the frontend has.

### 4.5 `pages/BookingFlow.jsx`: rebuilt steps (same route `/book/:category`, same visual style)

| Step | Product-linked (AC, TV…) | Standalone (Electrical, Cleaning…) |
|---|---|---|
| 1. What | Product type cards → variant chips (only if `variantDimension`) | Service cards |
| 2. Service | Services available for that product type + variant, each with its price | Option chips if the service has options (tank size), each with its price |
| | Quantity stepper bounded by `minQty/maxQty`; hidden for PER_SERVICE | same |
| | "Also need service for another type?" → adds an `extraLine` (its own offering) | ~~"Add another service"~~ not built: one standalone service per checkout (see log) |
| 3. Schedule | Date/slot. **ASAP / Express** shown only if every line's offering has express enabled; shows "+₹99 express fee" from quote | same |
| 4. Details & pay | Required-info fields from the offering · address · coupon · coins · payment mode · **price breakdown from `quote`** | same |

Mixed categories (RO) show both sections on step 1: "Choose your RO type" and "Or book a service directly".

- [x] Remove every local price calculation: `unitPrice`, `totalPrice`, `combinedTotalPrice`, `additionalTypesTotal`, `priceBreakdown`, `advanceAmt = 199`, `remaining`. Their UI now reads `quote.lines[]`, `quote.totals`, `quote.advanceAmount`, `quote.payableAfterService`
- [x] Breakdown component (mobile bottom bar + desktop summary) renders: Service × qty · Discount · Express fee · GST 18% · **Total**, all from quote
- [x] Replace the "Prices shown are indicative…" note with: "Spare parts, if needed, are quoted on site and added only with your approval."
- [x] Offering details from `getOffering()`: built as an inline panel under the selected service (included / not included / instructions), not a tap-"i" sheet; duration not shown
- [x] 409 `PRICE_CHANGED` → modal "The price for *X* was updated to ₹Y" → confirm uses the new quote
- [x] Remove `getCatalogEntry` / `bookingCatalog.js` imports from BookingFlow (the file itself is deleted in Phase 7)
- [x] **Added:** empty state for a category with no offerings yet (see log, known gaps)

### 4.6 Payment, submission, confirmation
- [x] `lib/bookingSubmission.js`: `buildBookingBody` sends one body per quote line: `offeringId`, `variantId`, `quantity`, `isExpress`, `requiredInfo`, `couponCode` (first line only), `useCoins`, `expectedFinalAmount = line.finalAmount`, plus schedule/address/payment fields
- [x] `Payment.jsx`, `CardPayment.jsx`, `UpiPayment.jsx`, `NetBankingPayment.jsx`: amount from `quote.payableNow` (advance) or `quote.totals.final`. **Remove** `paymentState.price ?? 299` and the client-side coin maths (coins toggle sets `selection.useCoins` → re-quote)
- [x] `BookingSuccess.jsx`, `BookingDetails.jsx`, `MyBookings.jsx`/`Bookings.jsx`: render from `booking.commercial` (service line, variant, qty, discount, express, GST, total), not URL params
- [x] Temporary: `/booking` (old `Booking.jsx`, now a 40-line redirect) redirects to `/book/:category` when the `service` param maps to a category, else to `/services`. Replaced properly in Phase 6

---

## Worked examples: what the customer sees

### A. Test 4: LED TV 55–65" Installation

| Screen | Shows |
|---|---|
| Step 1 | TV → **LED TV** → Screen size chips: 32 inch · 40–43 inch · **55–65 inch** · 75 inch+ |
| Step 2 | Installation **₹799** · Uninstallation ₹299 (no ₹349 anywhere) · qty 1 |
| Bottom bar | Total ₹942.82 ▸ (Installation ₹799.00 · GST 18% ₹143.82) |
| Step 4 summary | Same ₹942.82 |
| Payment page | Pay after service ₹942.82 |
| Booking success / details | TV · LED TV · 55–65 inch · Installation × 1 · ₹799.00 + GST ₹143.82 = **₹942.82** |

### B. Test 5 + 9: Fan installation, 2 fans, standalone

Electrical → **Fan Installation** (no product step) → qty 2 →
`Fan Installation × 2 ₹598.00 · GST ₹107.64 · Total ₹705.64`. Booking created with
`commercial.productType = null`, `spPayoutTotal = 360` (not visible to the customer).

### C. Test 6: Water tank cleaning

Cleaning → Water Tank Cleaning → Tank capacity chips with prices:
*Up to 500 L ₹499 · 501–1000 L ₹699 · 1001–2000 L ₹999 · 2000 L+ ₹1,499* → pick
501–1000 L → total ₹824.82. Snapshot `variant.label = "501–1000 L"`.

### D. Test 12: invalid combination

AC → **Window AC** → services show Installation, Uninstallation, Repair only. Gas
Refilling and Deep Cleaning are absent because no offering exists. A crafted
`POST /bookings` with any other offering id is refused with 400.

### E. Price changed while customer was on the payment page

Admin changes Fan to ₹329 at 10:02. The customer taps Pay at 10:03 → 409 → modal
"Fan Installation is now ₹329 per fan. New total ₹776.44" → Confirm → booking at ₹776.44.

## Acceptance

- [x] `npm test` (backend) green, including the rewritten `booking.test.js`
- [x] Manual walk-through of examples A–E on mobile width (375 px) and desktop; screenshots in the log
- [x] `grep -rn "priceAddon\|resolveBookedService\|advanceAmt = 199\|?? 299\|\|\| 299" frontend/src backend/src` → no hits in booking code paths
- [x] Client tests 1–7, 11, 12 marked ✅ in [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md)

## Out of scope

Partner payout credit (still % until Phase 5; the snapshot already stores the fixed payout), entry points other than `/book/:category` (Phase 6), search (Phase 6).

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-24 | _uncommitted_ | Phase 4 built; verified by API tests, e2e specs and a browser walk-through of every client scenario |

### What was built

**Backend**

| File | Change |
|---|---|
| `booking/booking.model.js` | + `offering`, `commercial` snapshot (ARCHITECTURE §5), `isExpress`, `requiredInfo[]`. The `toJSON` transform strips `spPayoutUnit / expressSpIncentive / spPayoutTotal / nccMargin` from **every** booking response |
| `booking/booking.validation.js` | `createBookingSchema` is offering-based and **strict**; `category / serviceSlug / serviceName / price / totalPrice` → 400 |
| `booking/booking.service.js` | `createBooking` rewritten: offering lookup (bookable + serviceable) → required-info validation → warranty detection → `buildQuote` → `expectedFinalAmount` check (409 `PRICE_CHANGED` with fresh quote) → coins redeemed (refunded if the booking fails) → snapshot. `resolveBookedService` deleted |
| `catalog/catalog.service.js` | `findProductTypeAddon`, `findServiceItem` (and its "first service in the category" fallback) deleted; `findCategoryOr404` exact-key only |
| `catalog/productType.model.js`, `catalog.validation.js` | `priceAddon` removed |
| `catalog/offeringPricing.js` | Coins and the advance are now settled **per line**; the quote's advance = the sum of per-line advances (what each booking will actually charge) |
| `catalog/quote.service.js` | `detectCoverage()` + `COVERAGE_BY_WARRANTY_STATUS` (shared with the booking engine); quote accepts `warranty: { brand, applianceId, serialNo, purchaseDate }` and detects coverage for a signed-in customer |
| `catalog/commercialView.js` | per-line `coinsApplied`, `advanceAmount`, `payableAfterService` |

**Frontend**

| File | Change |
|---|---|
| `lib/catalogueApi.js` | new: `getCategoryTree`, `getOffering`, `getQuote`, `pickOffering`, `servicesFor`, `optionsFor`, `standaloneOffering`, `formatRupees` |
| `lib/apiClient.js` | `ApiError.code` carries the backend `error.code` |
| `pages/BookingFlow.jsx` | Step 1: product type → size chips **or** standalone service → option chips (with prices). Step 2: services valid for type + size with prices, bounded quantity, "another type too" lines, included/excluded/instructions. Step 3: ASAP only when every line's offering allows express, showing the fee. Step 4: required questions, coupon, coins, payment mode, breakdown. **Every amount from the quote**; the previous quote stays on screen, dimmed, while a refresh loads, and confirm is disabled until the fresh one arrives. `PRICE_CHANGED` → "Price updated" dialog + re-quote. ₹0 total → advance disabled, direct booking. Empty state for categories with nothing bookable |
| `lib/bookingSubmission.js` | one booking per quote line: `offeringId, variantId, quantity, isExpress, expectedFinalAmount, requiredInfo`, coupon/coins on line 1; totals summed in paise |
| `pages/Payment.jsx`, `CardPayment.jsx`, `UpiPayment.jsx`, `NetBankingPayment.jsx` | booking amount = `bookingMeta.quote.payableNow`; `?? 299` gone; Payment's own coin toggle hidden for bookings; `PRICE_CHANGED` → back to step 4 with the notice |
| `pages/BookingDetails.jsx` | billing from `booking.commercial`: service × qty (unit price), coverage, coupon, express, GST, total, coins, advance paid; size + Express chips; `?? 499` gone |
| `pages/BookingSuccess.jsx`, `pages/Bookings.jsx` | invented fallbacks (₹299 / ₹49 / ₹499) removed; amounts formatted |
| `pages/Booking.jsx` | old URL-priced page replaced by a redirect to `/book/:category` (or `/services`) |

**Tests**

| File | Change |
|---|---|
| `tests/helpers/catalogue.js` | + `seedSimpleOffering()`, `offeringBooking()` (body + `expectedFinalAmount` from the real engine), `clearCatalogue()` |
| `tests/booking.test.js` | pricing section rewritten: 19 new tests = client Tests 1–7, 9–12 + PRICE_CHANGED, required info, ASAP/express, warranty coverage, coins, advance |
| `tests/catalogQuote.test.js` | + 5 coverage tests (signed-in covered ₹0, guest not covered, old purchase not covered, no "claim coverage" field, covered quote = booking) |
| `appliances`, `fullJourney`, `partRequestApproval`, `serviceProviderJob(Context)`, `smartWarranty`, `catalog` tests | converted to offerings (GST 0 test offerings keep their downstream numbers) |
| `e2e/catalogueFixture.js` + 10 e2e specs | `createTestOffering()` via the admin API, `offeringBookingBody()` via `/catalog/quote` |

### Browser walk-through (390 px phone width, local scratch DB, 2026-09-24)

| # | Scenario | Result |
|---|---|---|
| A | **Test 4 + Test 10**: LED TV 55–65" Installation, brand Sony | ₹942.82 on service step, schedule, payment, success page, booking details (GST ₹143.82, "Size: 55–65 inch"); ₹349 never shown |
| B | **Tests 5 + 9**: Fan Installation × 2 | no product step; ₹705.64; "+₹99 express fee" on ASAP; "Fan type" asked |
| C | **Test 6**: Water Tank Cleaning | tank-size chips each with price; 501–1000 L → ₹824.82 |
| D | **Test 12**: Window AC | services = Installation, Uninstallation, Repair; no Gas Refilling / Deep Cleaning |
| E | Electrician Consultation | ASAP not offered (express disabled) |
| F | Warranty-covered (seeded customer's LG AMC) | "Covered by warranty −₹349", ₹0, booked without a price-changed loop |
| G | Price changed mid-checkout (admin 799 → 899 while on step 4) | "Price updated … ₹1,060.82" dialog → refreshed total ₹1,060.82 |
| H | Pay advance, TV 32" | "Pay ₹82.36 & Confirm", "₹329.46 after service"; payment page ₹82.36, no second coin toggle |

No browser console errors. Screenshots: [screenshots/phase-4/](screenshots/phase-4/).

### Deviations from plan

1. **No separate `BookingContext`.** The selection and quote live in `BookingFlow` and travel to the payment pages inside `bookingMeta` (which already persists in sessionStorage for the gateway round-trip), including the full quote. The payment pages read `bookingMeta.quote`, so there's still one source and no page computes a price.
2. **Warranty coverage is detected inside the quote (new `warranty` field).** Found in the browser test: a covered customer was priced ₹0 by the booking but ₹942.82 by the quote, so every covered booking hit `PRICE_CHANGED` forever. The customer still never *declares* coverage; they send appliance details (brand etc.), and for a signed-in customer the server runs the same detection the booking runs. Guests get no coverage in a quote.
3. **Coins and the advance are per line** in the engine, so a multi-type checkout shows exactly what the separate bookings will charge.
4. **Payout/margin stripped in `Booking.toJSON`**, not in a per-route serializer, so no endpoint (customer, partner, admin, populated) can leak them by accident.
5. **Coupon and coins only for single-service checkouts.** With extra type lines each is its own booking, and splitting a coupon across bookings would make one booking's charge differ from what was shown.
6. **The payment page's own coin toggle is hidden for bookings**, because coins are applied in the booking quote. Product purchases keep it.
7. **Stale-while-refreshing display**: the previous total stays visible (dimmed, `aria-busy`) while a re-quote loads; confirm stays disabled until the fresh quote arrives.
8. **Old `Booking.jsx` reduced to a redirect now** (the plan said "temporarily redirect"; the old 1,057-line page is gone rather than bypassed). Phase 6 still re-points the links.
9. **Old e2e "Refrigerator" booking** now books `AC-WINDOW-REPAIR`, because Refrigerator has no master-catalogue offerings yet (see gaps).
10. **No multi-service standalone checkout.** "Add another service" for standalone categories wasn't built; a customer books one standalone service per checkout (with quantity). Extra lines exist for product types, as before the cut-over.
11. **Offering details** are an inline panel under the selected service rather than a tap-"i" sheet.

### Known gaps carried forward (important)

- **Job billing still adds GST on top of `booking.totalPrice`**, which now already includes GST, and **partner earnings are still 30%** of the booking total. Phase 5 fixes both. Until then, completing a paid job over-bills GST. Do not demo job completion/billing before Phase 5.
- **Categories without offerings** (Refrigerator, Microwave, Chimney, Air Cooler, Plumber, Carpenter, cleaning/pest/painting families…) show "not available to book online yet" until an admin creates their offerings in Master Catalogue. This follows from D1 (clean slate): the client's rate sheet is needed.
- Home tiles, service pages and dashboard shortcuts still link to `/booking?service=…`, which now forwards to the category flow (or `/services`). Proper deep links are Phase 6.
- The Razorpay checkout step itself was not exercised in the browser (no gateway in the scratch env); the amounts leading into it were.
- e2e cleanup (`scripts/cleanupTestData.mjs`) doesn't yet remove the catalogue services/offerings the API specs create in the e2e database (harmless, test DB only).

### Test output

```
backend jest:        Test Suites: 40 passed, 40 total — Tests: 662 passed, 662 total
e2e (Playwright API): 192 passed, 1 skipped (as before)
backend eslint:      0 errors (3 pre-existing 'City' unused warnings)
frontend eslint:     0 errors; BookingFlow's 6 warnings are the same 6 as before the refactor
frontend build:      ok
browser walk-through: scenarios A–H all pass, 0 console errors
```
