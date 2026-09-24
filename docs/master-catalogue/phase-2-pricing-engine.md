# Phase 2 — Pricing Engine + Quote & Browse APIs

| | |
|---|---|
| **Status** | ✅ Done (2026-09-24) |
| **Estimate** | 5–6 developer-days |
| **Depends on** | Phase 1 |
| **Unblocks** | Phase 3, Phase 4 |
| **Client requirements** | 10, 13, 14, 16, 17, 25 (resolver) |
| **Client tests closed (API level)** | 1, 2, 3, 4, 9 (price side), 12 (API side) |
| **Breaks anything existing?** | No. New endpoints only; old `/catalog/categories` payload unchanged until Phase 4 |

## Goal

One backend calculator that every screen and the booking engine use. After this
phase, `curl` can answer "what does 2 fans with express cost in Jaipur?" with the
full breakdown, and invalid combinations are refused. Formula: [ARCHITECTURE.md §3](ARCHITECTURE.md#3-pricing--payout-formula).

---

## Tasks

### 2.1 Rate resolver
- [x] `catalog/rateResolver.js`: `resolveRate(offeringId, { at = now, city, pincode })`
  - order PINCODE → CITY → DEFAULT; within a scope, the row with `effectiveFrom ≤ at` and (`effectiveUntil` null or `> at`)
  - returns `null` when nothing matches (→ offering not bookable)
  - batch variant `resolveRates(offeringIds, ctx)` with one query, for the tree API
- [x] Tests: future-dated v2 not used before its date; CITY row beats DEFAULT (seeded only in the test)

### 2.2 Pure engine
- [x] `catalog/offeringPricing.js`: `priceLine({ offering, rate, quantity, isExpress, discountPaise, coverage, gstPercent })` and `priceQuote(lines, { advancePercent, paymentMode, coinsPaise })`
  - no DB access, integer paise in and out
  - validates `minQty ≤ qty ≤ maxQty` → `QUANTITY_OUT_OF_RANGE`
  - `isExpress && !offering.express.enabled` → `EXPRESS_NOT_AVAILABLE`
  - returns both the customer fields and the internal fields (`spPayoutUnit`, `spPayoutTotal`, `expressSpIncentive`, `nccMargin`)
- [x] `backend/tests/offeringPricing.test.js`: **every row of the worked-example table in ARCHITECTURE §3**, plus:
  - qty 0 and qty > max rejected
  - offering-level GST override (e.g. 5%) beats platform default
  - discount larger than base is capped at base
  - covered booking → final 0, payout unchanged

### 2.3 Quote service (DB + engine)
- [x] `catalog/quote.service.js`: `buildQuote(input, { userId })`
  1. Load offerings by id (`isActive`, `availableFrom ≤ now ≤ availableUntil`), plus category/productType/variant/service names
  2. Serviceability: `offering.serviceability.mode === 'CITIES'` → city must be in the list → else `OFFERING_NOT_BOOKABLE`
  3. `variantId` check (ARCHITECTURE §2.5 variant-agnostic rule); required when the product type/service has variants
  4. `resolveRate()`; null → `OFFERING_NOT_BOOKABLE`
  5. Coupon: reuse `rewards-loyalty/coupon.service.js#resolveCoupon(code, 'service')`. `Coupon.discount` is a **flat ₹ amount** (same as `order.service.js` uses it), capped at base (A1)
  6. Coins: wallet balance + the existing 10-coins-per-₹1 rule, applied after GST (A2)
  7. `PlatformSettings.defaultGstPercent`, `bookingAdvancePercent`
  8. Call the engine, return the **internal** quote object
- [x] `catalog/commercialView.js`: `toCustomerQuote(quote)` strips payout/margin/rate internals (ARCHITECTURE §8). The only serializer customer routes may use.

### 2.4 Browse API: what the customer is allowed to pick
- [x] `GET /api/v1/catalog/categories/:key/tree?city=&pincode=`
  - exact key match only: **no** "first active category" fallback
  - builds the tree **from bookable offerings upward**, so a product type, variant or service with zero bookable offerings never appears (Req 17)
- [x] `GET /api/v1/catalog/offerings/:code?city=&pincode=`: detail view
- [x] `POST /api/v1/catalog/quote`: new `optionalAuth` middleware in `middleware/auth.js` (sets `req.user` if a valid token is present, never rejects). Logged-in → coins/coupons allowed; guest → plain price
- [x] Zod schemas in `catalog.validation.js`
- [x] Rate-limit `/quote` with the existing `express-rate-limit` config (the app calls it on every selection change)

### 2.5 Tests (API)
- [x] `backend/tests/catalogQuote.test.js`, seeded with the Phase 1 seeder:
  - Test 1: Split AC 1.5T Install → unit 1,499.00, final 1,768.82
  - Test 2: Window AC Install → 599.00 / 706.82
  - Test 3: TV 32" → 349.00 / 411.82
  - Test 4: TV 55–65" → 799.00 / 942.82, and the 32" price does not appear anywhere in the 55–65" tree node
  - Test 9: Fan ×2 → base 598.00, internal payout 360.00
  - Test 12: Window AC tree has no "Gas Refilling"; quoting a deactivated offering → 400
  - Response of `/quote` contains no key matching `/payout|margin/i` (recursive check)

---

## Worked examples

### Tree for TV (what Phase 4 renders)

```http
GET /api/v1/catalog/categories/TV/tree?city=Jaipur
```
```jsonc
{
  "category": { "key": "TV", "name": "TV", "icon": "…" },
  "productTypes": [{
    "id": "…", "name": "LED TV", "variantDimension": { "key": "screen_size", "label": "Screen Size" },
    "variants": [
      { "id": "v32", "label": "32 inch" }, { "id": "v43", "label": "40–43 inch" },
      { "id": "v55", "label": "55–65 inch" }, { "id": "v75", "label": "75 inch+" }
    ]
  }],
  "standaloneServices": [],
  "offerings": [
    { "id": "o1", "code": "TV-LED-32-INSTALL",    "productTypeId": "…", "variantId": "v32", "serviceId": "sInst", "serviceName": "Installation",   "customerPrice": 349.00, "unitLabel": "per TV", "minQty": 1, "maxQty": 3, "express": { "enabled": true, "fee": 99.00 } },
    { "id": "o3", "code": "TV-LED-55-65-INSTALL", "productTypeId": "…", "variantId": "v55", "serviceId": "sInst", "serviceName": "Installation",   "customerPrice": 799.00, "…": "…" },
    { "id": "o5", "code": "TV-LED-UNINSTALL",     "productTypeId": "…", "variantId": null,  "serviceId": "sUn",   "serviceName": "Uninstallation", "customerPrice": 299.00, "…": "…" }
  ]
}
```
Frontend rule (Phase 4): pick LED TV → pick 55–65 inch → services = offerings where
`variantId === 'v55' || variantId === null` → *Installation ₹799, Uninstallation ₹299*.

### Quote: 2 fans, express, flat ₹60 coupon

```http
POST /api/v1/catalog/quote
{ "lines": [{ "offeringId": "<ELEC-FAN-INSTALL>", "quantity": 2, "isExpress": true }],
  "couponCode": "NCC60", "paymentMode": "after", "location": { "city": "Jaipur" } }
```
```jsonc
{ "lines": [{ "offeringCode": "ELEC-FAN-INSTALL", "quantity": 2, "unitPrice": 299.00,
              "baseAmount": 598.00, "discount": 60.00, "expressFee": 99.00,
              "taxableAmount": 637.00, "gstPercent": 18, "gstAmount": 114.66,
              "finalAmount": 751.66, "rateVersion": 1 }],
  "totals": { "final": 751.66 }, "payableNow": 0, "payableAfterService": 751.66 }
```

### Invalid combination

```http
POST /api/v1/catalog/quote
{ "lines": [{ "offeringId": "<deactivated offering>", "quantity": 1 }] }
→ 400 { "code": "OFFERING_NOT_BOOKABLE", "message": "This service is not available right now." }
```

## Acceptance

- [x] `npm test -- offeringPricing catalogQuote` green
- [x] Manual: the three `curl`s above return exactly the numbers shown
- [x] Old booking flow still works (no existing endpoint changed)

## Out of scope

Booking creation (Phase 4), admin writes (Phase 3), search (Phase 6), any CITY/PINCODE admin UI.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-24 | `9a65f5a` | Phase 2 built and verified; all tasks above done |

### What was built

| File | What it is |
|---|---|
| `backend/src/modules/catalog/offeringPricing.js` | Pure engine: `priceLine()`, `priceQuote()`. Integer paise, no DB |
| `backend/src/modules/catalog/rateResolver.js` | `resolveRates()` (one query, many offerings) / `resolveRate()`. PINCODE → CITY → DEFAULT, effective window |
| `backend/src/modules/catalog/offeringBrowse.service.js` | `loadBookableOfferings()` (the single "is this bookable?" filter), `getCategoryTree()`, `getOfferingDetail()`, `platformPricingSettings()` |
| `backend/src/modules/catalog/quote.service.js` | `buildQuote()`: offerings + variant rules + coupon + coins + settings → engine. Returns the **internal** quote (paise, incl. payout/margin) that Phase 4 will snapshot |
| `backend/src/modules/catalog/commercialView.js` | Whitelist serializers: `toCustomerOffering`, `toCustomerOfferingDetail`, `toCustomerQuote` |
| `backend/src/modules/catalog/catalogErrors.js` | Error codes surfaced as `error.code` |
| `backend/src/middleware/auth.js` | + `optionalAuth` |
| `backend/src/modules/catalog/catalog.routes.js` | + `GET /categories/:key/tree`, `GET /offerings/:code`, `POST /quote` (120/min limiter, off under test) |
| `backend/src/modules/catalog/catalog.validation.js` | + `quoteSchema`, `locationQuerySchema`, `offeringCodeParamSchema` |
| `backend/tests/offeringPricing.test.js` | 21 engine tests: every ARCHITECTURE §3 row + rules |
| `backend/tests/catalogQuote.test.js` | 25 API tests on the real seeded catalogue |

### Try it yourself

```bash
cd backend
export MONGODB_URI=mongodb://127.0.0.1:27017/nigam_scratch PORT=4099
npm run seed && node src/server.js &
curl -s "localhost:4099/api/v1/catalog/categories/TV/tree" | jq '.data.offerings[] | {code, serviceName, customerPrice}'
curl -s localhost:4099/api/v1/catalog/offerings/TV-LED-55-65-INSTALL | jq .data
FAN=$(mongosh --quiet nigam_scratch --eval 'print(db.serviceofferings.findOne({code:"ELEC-FAN-INSTALL"})._id)')
curl -s -X POST localhost:4099/api/v1/catalog/quote -H 'content-type: application/json' \
  -d "{\"lines\":[{\"offeringId\":\"$FAN\",\"quantity\":2,\"isExpress\":true}]}" | jq .data.totals
```

Live-server output recorded on 2026-09-24 (local scratch DB, `NCC60` = flat ₹60 coupon):

```
TV tree   → LED TV variants: 32 inch, 40–43 inch, 55–65 inch, 75 inch+
            TV-LED-32-INSTALL 349 · TV-LED-40-43-INSTALL 499 · TV-LED-55-65-INSTALL 799
            TV-LED-75-INSTALL 1299 · TV-LED-UNINSTALL 299
Fan ×2 express + NCC60 → base 598 · discount 60 · express 99 · taxable 637 · GST 114.66 · final 751.66
TV 55–65 → taxable 799 · GST 143.82 · final 942.82
Deactivate AC-WINDOW-UNINSTALL → quote: 400 {"code":"OFFERING_NOT_BOOKABLE"}; Window AC tree: ["Installation","Repair"]
```

### Deviations from plan

1. **No `coverage` in the quote request** (ARCHITECTURE §6 updated). Letting the client declare warranty coverage would let anyone price a job at ₹0. `buildQuote()` takes `coverageType` only as a server-side argument, which the Phase 4 booking engine will pass from its warranty detection.
2. **Two extra error codes**, `VARIANT_REQUIRED` and `VARIANT_MISMATCH`, so the app can tell "pick a size" apart from "wrong size". `VARIANT_MISMATCH` names the variant-specific offering to use when one exists.
3. **Coupon allocation across lines** is in order, each line capped at its base (the plan didn't say how a flat coupon splits).
4. **The bookability filter also checks parents.** An inactive category, product type, variant or service hides its offerings, even if the offering itself is active.
5. **CITIES-mode offerings need a city.** A quote or tree request without `city` treats them as not serviceable.

### Known gaps carried forward

- The customer app does not call these endpoints yet. That is Phase 4.
- The tree API has no caching yet (Phase 7 adds a 60 s cache).

### Test output

```
offeringPricing + catalogQuote:  2 suites, 46 tests passed
full backend suite:              Test Suites: 39 passed, 39 total
                                 Tests:       627 passed, 627 total
eslint (catalog module):         clean
```
