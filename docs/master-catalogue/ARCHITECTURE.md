# Target Architecture

This is the reference every phase builds towards. If a phase changes the design,
this file is updated in the same commit and the change is noted in that phase's
Implementation Log.

- [1. Today vs target](#1-today-vs-target)
- [2. Data model](#2-data-model)
- [3. Pricing & payout formula](#3-pricing--payout-formula)
- [4. Rate versioning, audit, effective dates, location overrides](#4-rate-versioning-audit-effective-dates-location-overrides)
- [5. Booking commercial snapshot](#5-booking-commercial-snapshot)
- [6. APIs](#6-apis)
- [7. Price consistency contract](#7-price-consistency-contract)
- [8. Customer-visibility rules](#8-customer-visibility-rules)
- [9. File layout](#9-file-layout)
- [10. Old → new mapping (what gets deleted)](#10-old--new-mapping-what-gets-deleted)

---

## 1. Today vs target

| Concern | Today | Target |
|---|---|---|
| Where a price comes from | 4 backend sources (`ServiceCatalogItem`, `ServicePageConfig.catalog[].price` string, `CategoryBookingConfig.services` Mixed, slug fallback) + hardcoded `frontend/src/data/bookingCatalog.js` + URL `?price=` | **One**: the active `OfferingRate` of a `ServiceOffering` |
| Product-specific price | `service.price + productType.priceAddon` (same addon for every service) | Each (product type, variant, service) is its own offering with its own price |
| Size / capacity | Not modelled | `Variant` rows under a product type (or under a service for standalone options) |
| Invalid combination | Fuzzy fallbacks book *some* service at *some* price (`findServiceItem`, `findCategoryOr404`) | No offering → not shown, and `createBooking` returns 400 |
| Partner earnings | `totalPrice × 30%` (global setting) at billing | `rate.spPayout × qty (+ express incentive)` frozen at booking |
| GST | 18% added only at post-service job billing | Added on top at quote time (D2), shown on every screen, frozen in snapshot |
| Express | `isInstant` flag, no fee | Per-offering express fee + optional partner incentive |
| Price history | None | Append-only `OfferingRate` versions with old/new, who, when, why, effective date |
| Booking snapshot | `service{name,price,unit}`, `totalPrice` | Full commercial snapshot incl. offering code, variant, tax, payout, rate version |

---

## 2. Data model

```
Category ─┬─< ProductType ─< Variant (dimension: capacity / screen_size / type …)
          │
          ├─< CatalogService ─< Variant (standalone options, e.g. tank size)
          │
          └─< ServiceOffering >── (productType?, variant?, service)
                     │
                     └─< OfferingRate   (append-only versions; scope DEFAULT | CITY | PINCODE)
```

### 2.1 `Category` — existing model, extended
`backend/src/modules/catalog/category.model.js`. Keeps all its current UI fields
(icon, colors, banner, groups, section…). Adds:

| Field | Type | Why |
|---|---|---|
| `keywords` | `[String]` | Search synonyms — `Electrical` gets `["electrician", "wiring", "switch"]` |

A category can hold product-linked **and** standalone offerings (RO has both).

> Phase 1: the seed uses the existing category keys (`Electrician`, `Water Tank Sump Cleaning`,
> `RO Water Purifier`) rather than new "Electrical / Cleaning / RO" ones. Examples in this
> document that say "Electrical" mean the `Electrician` category.

### 2.1a `CatalogueBrand` — new in Phase 19
`backend/src/modules/catalog/catalogueBrand.model.js`. This is the manufacturer a customer picks on a
**product-linked** booking ("which brand is your AC?"), so the partner knows whose product it is.
It is **not** a partner brand: partner brands (`super-admin/brand.model.js`) are brand-admin tenants
with logins.

| Field | Type | Why |
|---|---|---|
| `name` / `nameKey` | String | unique ignoring case |
| `categories` | `[String]` | category keys it is offered for; drives the booking tree's `category.brands` (only when the category has product types) and `GET /catalog/brands?category=` |
| `warrantyMonths` | Number (12) | manufacturer warranty. Warranty checks use the partner brand's own months first, then this, then 12 (`shared/brandWarranty.js`) |
| `isActive`, `sortOrder` | | hidden brands leave every picker; picker order |

Replaces the old `Category.brands` string list (removed).

### 2.2 `ProductType` — existing model, repurposed
`backend/src/modules/catalog/productType.model.js`

| Field | Type | Notes |
|---|---|---|
| `category` | ref Category | existing |
| `slug`, `name`, `icon`, `desc` | | existing — `split` / `Split AC` |
| `variantDimension` | `{ key, label }` | e.g. `{ key: 'capacity', label: 'Capacity' }`, `{ key: 'screen_size', label: 'Screen Size' }`. Null = no variants |
| `isActive`, `sortOrder` | | new |
| ~~`priceAddon`~~ | | **removed in Phase 4** |

### 2.3 `Variant` — new
`backend/src/modules/catalog/variant.model.js`

| Field | Type | Notes |
|---|---|---|
| `category` | ref Category | for fast listing |
| `productType` | ref ProductType \| null | set for product variants (1.5 Ton) |
| `service` | ref CatalogService \| null | set for standalone options (Up to 500 L) |
| `slug`, `label` | String | `15t` / `1.5 Ton`; `55-65` / `55–65 inch` |
| `sortOrder`, `isActive` | | |

Validation: exactly one of `productType` / `service` is set. Unique `(productType|service, slug)`.

### 2.4 `CatalogService` — new (replaces `ServiceCatalogItem`)
`backend/src/modules/catalog/catalogService.model.js`. **Has no price.** It only
describes the work.

| Field | Type | Notes |
|---|---|---|
| `category` | ref Category | A8: services are category-scoped |
| `slug`, `name`, `icon`, `desc` | | `installation` / `Installation`; `fan_installation` / `Fan Installation` |
| `optionDimension` | `{ key, label }` \| null | standalone options: `{ key: 'tank_capacity', label: 'Tank Capacity' }` |
| `keywords` | `[String]` | `["ceiling fan", "fan fitting"]` |
| `sortOrder`, `isActive` | | |

### 2.5 `ServiceOffering` — new, the bookable unit
`backend/src/modules/catalog/serviceOffering.model.js`

| Group | Field | Type / example |
|---|---|---|
| Identity | `code` | `AC-SPLIT-15T-INSTALL` — unique, uppercase, immutable after create (A7) |
| | `name` | `Split AC 1.5 Ton Installation` |
| | `bookingType` | `PRODUCT_LINKED` \| `STANDALONE` |
| Classification | `category` | ref |
| | `productType` | ref \| null (null ⇔ STANDALONE) |
| | `variant` | ref \| null |
| | `service` | ref |
| Quantity | `pricingUnit` | `PER_SERVICE` \| `PER_UNIT` \| `PER_PIECE` \| `PER_CAPACITY` \| `CUSTOM` |
| | `unitLabel` | `per AC`, `per fan`, `per tank`, `per visit` |
| | `minQty`, `maxQty` | `1`, `10` (PER_SERVICE forces 1/1) |
| Express | `express.enabled` | Boolean |
| Tax | `tax.gstPercent` | Number \| null → null means use `PlatformSettings.defaultGstPercent` |
| | `tax.sacCode` | `998719` (for invoices) |
| Content | `estimatedDurationMins` | `90` |
| | `description` | text |
| | `included` / `excluded` | `[String]` |
| | `customerInstructions` | text |
| | `requiredInfo` | `[{ key, label, type: 'text'\|'number'\|'select'\|'photo', options?, required }]` e.g. "Wall type: Brick / Concrete" |
| Admin only | `internalNotes` | text, never sent to customer/partner |
| | `needsRateReview` | Boolean — true for seeded DEMO rates; cleared automatically when an admin saves a new rate version |
| Visibility | `isActive` | Boolean |
| | `displayOrder` | Number |
| | `serviceability` | `{ mode: 'ALL' \| 'CITIES', cities: [String] }` |
| | `availableFrom`, `availableUntil` | Date \| null — when the offering itself can be booked (client's "Effective From/Until") |
| Search | `searchText` | denormalised: code + name + category/product/variant/service names + keywords (rebuilt on save) |
| | `keywords` | `[String]` |

**Commercial numbers are not on the offering** — they live in `OfferingRate` (§4).

Uniqueness: `(service, productType, variant)` unique — you cannot create two
"Split AC 1.5 Ton Installation" offerings.

**Variant-agnostic offerings.** An offering whose `variant` is null applies to *every*
variant of its product type (or every option of its service). The client priced
"Split AC Uninstallation ₹999" without a tonnage, so one `AC-SPLIT-UNINSTALL`
offering covers 1 / 1.5 / 2 Ton. When the customer has picked a variant V:

```
services shown = offerings for (productType, V)  ∪  offerings for (productType, variant = null)
if both exist for the same service → the variant-specific one wins
```

The customer's **selected** variant is still recorded on the booking snapshot
(`commercial.variant`), even when the offering itself is variant-agnostic, so the
partner sees "Split AC · 1.5 Ton · Uninstallation".

Consistency rules (validated on save):
- `bookingType = STANDALONE` ⇒ `productType = null`; `variant`, if set, must belong to `service`.
- `bookingType = PRODUCT_LINKED` ⇒ `productType` required; `variant`, if set, must belong to `productType`; `service.category === category`.
- Offering cannot be activated without an active DEFAULT rate.

### 2.6 `OfferingRate` — new, append-only
`backend/src/modules/catalog/offeringRate.model.js`

| Field | Type | Notes |
|---|---|---|
| `offering` | ref | |
| `scope` | `{ type: 'DEFAULT' \| 'CITY' \| 'PINCODE', value: String \| null }` | Only DEFAULT is written until location pricing is switched on (Req 25) |
| `version` | Number | 1, 2, 3… per (offering, scope) |
| `customerPrice` | Number (paise) | per unit |
| `spPayout` | Number (paise) | per unit, fixed |
| `expressFee` | Number (paise) | per booking |
| `expressSpIncentive` | Number (paise) | per booking, 0 = none |
| `effectiveFrom` | Date | |
| `effectiveUntil` | Date \| null | set automatically when a newer version takes over |
| `changes` | `[{ field, from, to }]` | computed on write — the audit diff |
| `reason` | String, required (except v1 seed) | |
| `changedBy` | ref User | |
| `createdAt` | | |

Rows are **never updated or deleted** except `effectiveUntil` being closed by the next version.

### 2.7 Changes to existing models

**`Booking`** (`backend/src/modules/booking/booking.model.js`)
- `offering` ref, `isExpress` Boolean, `requiredInfo` `[{ key, label, value }]`
- `commercial` subdocument (§5)
- Kept for all existing readers: `category`, `productType` (name), `service {slug,name,price,unit,desc}`, `quantity`, `totalPrice` (= `commercial.finalAmount`)

**`Job`** (`backend/src/modules/service-provider/job.model.js`)
- `payout` subdocument: `{ base, expressIncentive, addOns, total }`, copied from the booking snapshot at accept; `addOns` grows when the partner adds catalogue add-ons
- `estEarnings` = `payout.total` (kept so existing screens keep working)
- `additionalServices` = catalogue add-ons `{ offeringId, code, name, quantity, unitPrice, taxableAmount, gstAmount, finalAmount, spPayout }`
- `billingEstimate` adds `alreadyPaid` (verified advance + coins) and `amountToCollect`; built only by `shared/servicePartnerPayout.js#computeJobBilling` (Phase 5):
  booked final as-is (GST already inside) + add-on finals + parts × (1 + GST) − already paid

**`PlatformSettings`**
- keeps `defaultGstPercent` (18) and `bookingAdvancePercent`
- `serviceProviderCommissionPercent` **removed** (Phase 7)

---

## 3. Pricing & payout formula

All arithmetic in **integer paise**; GST rounded half-up to the paisa once per line.

```
Per line (one offering):
  unitPrice      = rate.customerPrice
  base           = unitPrice × qty
  discount       = coupon.discount (flat ₹, existing Coupon model), capped at base   (A1)
  coverage       = base − discount   if warranty/AMC/EW covered, else 0
  expressFee     = isExpress ? rate.expressFee : 0                   (A3, A4)
  taxable        = base − discount − coverage + (covered ? 0 : expressFee)
  gstPercent     = offering.tax.gstPercent ?? settings.defaultGstPercent
  gst            = round(taxable × gstPercent / 100)
  final          = taxable + gst

  spPayout       = rate.spPayout × qty + (isExpress ? rate.expressSpIncentive : 0)
  nccMargin      = taxable − spPayout          (internal only; GST excluded)

Per quote:
  total          = Σ final
  advance        = paymentMode = 'advance' ? round(total × settings.bookingAdvancePercent / 100) : 0
  coinsApplied   = min(coins requested, allowed by wallet rule)      (A2 — after GST)
  payableNow     = advance or (total − coinsApplied) depending on payment mode
```

### Worked examples (GST 18%)

| Case | base | discount | express | taxable | GST | **final** | payout | margin |
|---|---|---|---|---|---|---|---|---|
| Split AC 1.5T Install ×1 (₹1,499 / ₹900) | 1,499.00 | 0 | 0 | 1,499.00 | 269.82 | **1,768.82** | 900 | 599.00 |
| Window AC Install ×1 (₹599 / ₹350) | 599.00 | 0 | 0 | 599.00 | 107.82 | **706.82** | 350 | 249.00 |
| LED TV 32" Install (₹349 / ₹200) | 349.00 | 0 | 0 | 349.00 | 62.82 | **411.82** | 200 | 149.00 |
| LED TV 55–65" Install (₹799 / ₹450) | 799.00 | 0 | 0 | 799.00 | 143.82 | **942.82** | 450 | 349.00 |
| Fan Install ×2 (₹299 / ₹180) | 598.00 | 0 | 0 | 598.00 | 107.64 | **705.64** | 360 | 238.00 |
| Fan ×2, Express (fee ₹99, incentive ₹50) | 598.00 | 0 | 99.00 | 697.00 | 125.46 | **822.46** | 410 | 287.00 |
| Fan ×2, Express, coupon NCC60 (flat ₹60) | 598.00 | 60.00 | 99.00 | 637.00 | 114.66 | **751.66** | 410 | 227.00 |
| Split AC Install, warranty-covered | 1,499.00 | 0 | — | 0 | 0 | **0.00** | 900 | −900 (billed to brand) |

---

## 4. Rate versioning, audit, effective dates, location overrides

**Changing only the customer price** (client Test 8):

```
v1  customerPrice 799  spPayout 450  effectiveFrom 2026-10-01  reason "Initial rate"
v2  customerPrice 899  spPayout 450  effectiveFrom 2026-11-01  reason "Festive pricing"
        changes: [{ field: "customerPrice", from: 799, to: 899 }]      ← payout carried forward, not recomputed
```

The admin API takes only the fields being changed; every other field is copied
from the current version. There is no code path that derives payout from price.

**Resolving the active rate** for (offering, at = now, city, pincode):

```
1. PINCODE scope rows for this pincode   → latest version with effectiveFrom ≤ at < effectiveUntil
2. CITY scope rows for this city          → same rule
3. DEFAULT scope                          → same rule
4. none                                   → offering is not bookable right now
```

Steps 1–2 exist in code from Phase 2 but no UI writes CITY/PINCODE rows yet —
switching location pricing on later needs only an admin screen, no model or
engine change (Req 25).

### Location pricing (Req 25) — built in Phase 10

_The admin UI below is now built (phase-10-location-pricing-admin.md); this section is kept as the design record._

#### Original notes

**What already works** (proved by `backend/tests/locationPricing.test.js`):
- `createRateVersion(offeringId, amounts, { scope: { type: 'CITY', value: 'Jaipur' } })` writes a CITY rate. Each (offering, scope) pair has its own version chain, and its first version needs all four amounts.
- Quotes (`location.city` / `location.pincode`), the category tree (`?city=`), search, and bookings (from `address.city` / `address.pincode`) all use the most specific rate. City matching ignores case.
- The booking snapshot records `rate.scope` ("CITY"), and the payout frozen on the job is the local payout.

Example: Fan in Jaipur is ₹279 / ₹170. The Jaipur quote is ₹279 + 18 % = ₹329.22 and the payout is ₹170. Delhi gets the default ₹299 / ₹180. Pincode 302017 at ₹259 beats Jaipur's ₹279.

**What's missing: the admin UI only (~2 days).**
1. Add an optional `scope` to `changeRateSchema` (it is `.strict()` today) and pass it from `changeRate()` to `createRateVersion()`. That's a few lines; the writer already takes it. Then add a *Scope* selector (Default · City · Pincode + value) to `RateChangeModal`.
2. In `RateHistoryPanel`, group versions by scope (the API already sorts by `scope.type`), and allow "End this override" (a version with `effectiveUntil`).
3. In the offering table, show a "local rates" badge when an offering has non-DEFAULT rates.
4. The scheduled-changes view, `catalogAdmin.service.js` around line 266, filters `scope.type: 'DEFAULT'`. Widen it.

Nothing in the pricing engine, the models, the booking snapshot or the partner payout needs to change.

**Future-dated change** (A9): admin sets `effectiveFrom = 2026-12-01`. Quotes and
bookings created before that date use v1; after, v2. Bookings already created keep
their snapshot forever.

---

## 5. Booking commercial snapshot

Saved on `Booking.commercial` at creation. Never recalculated.

```jsonc
{
  "offeringId": "665f…",
  "offeringCode": "TV-LED-55-65-INSTALL",
  "offeringName": "LED TV 55–65 inch Installation",
  "bookingType": "PRODUCT_LINKED",
  "category":    { "id": "…", "name": "TV" },
  "productType": { "id": "…", "name": "LED TV" },          // null for standalone
  "variant":     { "id": "…", "label": "55–65 inch" },      // null if none
  "service":     { "id": "…", "name": "Installation" },
  "pricingUnit": "PER_UNIT",
  "unitLabel":   "per TV",
  "quantity": 1,
  "unitPrice": 799.00,
  "baseAmount": 799.00,
  "discount": { "code": null, "amount": 0 },
  "coverage": { "type": null, "amount": 0 },               // "Brand Warranty" | "AMC" | "NCC Extended Warranty"
  "isExpress": false,
  "expressFee": 0,
  "taxableAmount": 799.00,
  "gstPercent": 18,
  "gstAmount": 143.82,
  "finalAmount": 942.82,
  "spPayoutUnit": 450.00,
  "expressSpIncentive": 0,
  "spPayoutTotal": 450.00,
  "rate": { "id": "…", "version": 1, "scope": "DEFAULT" },  // "Catalogue/Price Version"
  "pricedAt": "2026-10-04T10:21:07.000Z"
}
```

Covers every field in client Req 18. `spPayout*` fields are stripped from all
customer-facing responses (§8).

---

## 6. APIs

### Customer / public (`/api/v1/catalog`)

| Method & path | Purpose |
|---|---|
| `GET /catalog/categories` | Category list; each category's `services` / `productTypes` are the ones with an active offering (names only — no prices) |
| `GET /catalog/categories/:key/tree?city=&pincode=` | Everything needed to render the booking flow for one category: product types → variants → services, **plus the list of bookable offerings** with their current customer price. Only active, available, serviceable, rated offerings appear. Cached in-process for 60 s per (category, city, pincode); any catalogue write drops the cache (`catalogCache.js`) |
| `GET /catalog/offerings/:code?city=&pincode=` | One offering's full detail (description, included/excluded, instructions, requiredInfo, price) |
| `GET /catalog/search?q=&city=&pincode=&limit=` | Offering search, grouped by (product type, service) with "from" price + deep link (Phase 6) |
| `POST /catalog/search/resolve` `{ labels, location? }` | Best destination + "from" price for free-text labels — home tiles, old `/booking?service=` links (Phase 6) |
| `GET /catalog/service-groups?city=&pincode=` | Every bookable service, grouped like search (the "all services" pages) |
| `POST /catalog/quote` | Price a selection (below) |

**`POST /catalog/quote`**

```jsonc
// request
{
  "lines": [
    { "offeringId": "…", "variantId": null, "quantity": 2, "isExpress": true }
    // variantId = the variant the customer picked. Required when the product type /
    // service has variants; must equal offering.variant, or any variant of the
    // product type if the offering is variant-agnostic.
  ],
  "couponCode": "NCC60",
  "useCoins": false,
  "paymentMode": "after",
  "location": { "city": "Jaipur", "pincode": "302001" },
  "warranty": { "brand": "LG", "purchaseDate": "2026-08-01" }
  // Optional appliance details. For a signed-in customer the server runs the
  // SAME warranty/AMC/EW detection the booking runs, so a covered visit is
  // quoted ₹0 before confirming. There is no "coverage" field — the customer
  // can't declare coverage, and a guest's quote never includes it (Phase 4).
}
// response (customer view — no payout, no margin)
{
  "lines": [{
    "offeringId": "…", "offeringCode": "ELEC-FAN-INSTALL", "name": "Fan Installation",
    "quantity": 2, "unitPrice": 299.00, "baseAmount": 598.00,
    "discount": 60.00, "expressFee": 99.00, "taxableAmount": 637.00,
    "gstPercent": 18, "gstAmount": 114.66, "finalAmount": 751.66,
    "rateId": "…", "rateVersion": 1
  }],
  "totals": { "base": 598.00, "discount": 60.00, "expressFee": 99.00, "gst": 114.66, "final": 751.66 },
  "advanceAmount": 0,
  "coinsApplied": 0,
  "payableNow": 0,
  "payableAfterService": 751.66,
  "pricedAt": "2026-10-04T10:21:07.000Z"
}
```

Coins and the advance are settled per line (each line becomes its own booking): the
response's `advanceAmount` / `payableNow` is the sum of each line's `advanceAmount`.

Errors (in `error.code`): `400 OFFERING_NOT_BOOKABLE` (inactive / not rated / outside
window / not serviceable / a parent inactive), `400 VARIANT_REQUIRED` (variant-agnostic
offering, variant not picked; `details.variants` lists the choices), `400 VARIANT_MISMATCH`
(wrong variant, or a variant-specific offering exists; `details.offeringCode` names it),
`400 QUANTITY_OUT_OF_RANGE` (`details.minQty/maxQty`), `400 EXPRESS_NOT_AVAILABLE`,
`400 COUPON_INVALID`.

A flat coupon across several lines is allocated to lines in order until used up.
Coins need a signed-in customer (`optionalAuth`); the response gives `coinsToRedeem`
(the coin count) alongside `coinsApplied` (₹).

### Bookings (`/api/v1/bookings`)

`POST /bookings` body becomes:

```jsonc
{
  "offeringId": "…", "variantId": null, "quantity": 2, "isExpress": false,
  "requiredInfo": [{ "key": "ceiling_height", "value": "10 ft" }],
  "couponCode": null, "useCoins": false,
  "expectedFinalAmount": 705.64,        // what the customer was shown
  "brand": "…", "scheduledDate": "…", "timeSlot": { … }, "address": { … },
  "fullName": "…", "mobile": "…", "paymentMode": "after", "paymentMethod": "Cash",
  "purchaseDate": "…", "serialNo": "…", "applianceId": "…"
}
```

`category`, `productType`, `serviceSlug`, `serviceName`, `price`, `totalPrice` are **rejected** (strict
schema, 400). A stale `expectedFinalAmount` → `409 PRICE_CHANGED` with `error.details.quote` (the fresh
customer quote). Coins are redeemed at booking and refunded if creation fails.

### Super Admin (`/api/v1/super-admin/catalogue`) — Phase 3

| Method & path | Purpose |
|---|---|
| `GET/POST/PUT/PATCH …/categories[/:id]` | categories (with offering counts) + activate/deactivate |
| `GET/POST/PUT/PATCH …/product-types[/:id]` | |
| `GET/POST/PUT/PATCH …/variants[/:id]` | |
| `GET/POST/PUT/PATCH …/services[/:id]` | |
| `GET …/offerings?category=&bookingType=&active=&q=` | table with current rate, payout, margin % |
| `POST …/offerings` | create offering **with its initial rate** |
| `PUT …/offerings/:id` | content fields only — code, the combination (category/productType/variant/service/bookingType) and money are rejected (strict schema) |
| `PATCH …/offerings/:id/status` | activate / deactivate |
| `POST …/offerings/:id/rates` | new rate version `{ customerPrice?, spPayout?, expressFee?, expressSpIncentive?, effectiveFrom, reason }` |
| `GET …/offerings/:id/rates` | full history with diffs |
| `GET …/rate-changes?from=&to=` | platform-wide change log |
| `POST …/offerings/:id/duplicate` | clone as a starting point (e.g. 1 Ton from 1.5 Ton); copy starts inactive + DEMO-flagged |
| `GET …/categories/:id/structure` | product types → variants, services → options, inactive included |
| `GET …/suggest-code?category=&productType=&variant=&service=` | client-style code suggestion |
| `GET/POST/PUT/DELETE …/brands[/:id]` | catalogue brands (Phase 19) — name, categories, warranty months, active, order; audited |

Gated by `requireRole(SUPER_ADMIN)`. Duplicate combination / code / slug → `409` naming the existing row.

### Reports (`/api/v1/super-admin/reports`) — Phase 7

| Method & path | Purpose |
|---|---|
| `GET …/margin?from=&to=&groupBy=category\|offering\|partner\|day&coverage=paid\|covered\|all` | NCC gross service margin over completed bookings (by `Booking.completedAt`, IST days): revenue ex-GST (booking + add-on taxable), discounts, express fees, partner payouts, margin, margin %; GST and spare parts beside revenue. Covered visits in their own section |

Rate limits: `/catalog/quote`, `/catalog/search`, `/catalog/search/resolve` and
`/catalog/service-groups` share a 120/min/IP limiter.

---

## 7. Price consistency contract

The fix for "different price on different screens" (Req 15, Test 10):

1. **No customer screen does price arithmetic.** Every price shown comes from a
   `POST /catalog/quote` response held by `BookingFlow` and passed to the payment pages
   as `bookingMeta.quote` (Phase 4). While a re-quote loads, the previous total stays on
   screen dimmed and confirm is disabled.
2. The quote is re-requested whenever the selection changes (offering, qty,
   express, coupon, coins, payment mode). Screens only read `quote.*`.
3. `POST /bookings` sends `expectedFinalAmount`. The server re-prices with the same
   engine; if it differs (rate changed meanwhile) → `409 PRICE_CHANGED` with the new
   quote, and the app shows "Price updated to ₹X" before the customer confirms again.
4. Payment pages read the booking/quote, never `location.state.price` or `?price=`.
5. Booking success and booking details read `booking.commercial`.

## 8. Customer-visibility rules

- `spPayoutUnit`, `spPayoutTotal`, `expressSpIncentive`, `nccMargin`, rate `changes`/`reason` are
  **never** returned by customer endpoints. Quotes and offerings go through whitelist
  serializers (`commercialView.js`); bookings strip the payout/margin fields in
  `Booking.toJSON` (Phase 4), so no booking response anywhere carries them. Tests assert
  payout keys are absent from customer responses.
- The partner sees payout + customer amount (A10), never margin.
- Only super-admin sees margin.

## 9. File layout

```
backend/src/modules/catalog/
  category.model.js            (extended)
  productType.model.js         (repurposed)
  variant.model.js             (new)
  catalogService.model.js      (new)
  serviceOffering.model.js     (new)
  offeringRate.model.js        (new)
  money.js                     (new — paise helpers)
  dimension.schema.js          (new — shared { key, label } for variant/option dimensions)
  rateWriter.js                (new — createRateVersion / findLatestRate, Phase 1)
  offeringCode.js              (new — code suggestion, Phase 1)
  rateResolver.js              (new — scope/effective-date resolution, Phase 2)
  offeringPricing.js           (new — pure engine, §3, Phase 2)
  catalogErrors.js             (new — error codes, Phase 2)
  offeringBrowse.service.js    (new — bookability filter, category tree, offering detail, Phase 2)
  commercialView.js            (new — whitelist customer serializers, Phase 2)
  quote.service.js             (new — loads offering/rate/settings/coupon/coins, calls engine, Phase 2)
  catalog.routes.js            (customer: tree, offering, quote, search)
  catalogAdmin.routes.js       (new — super-admin, Phase 3)
  catalogAdmin.service.js      (new, Phase 3)
  catalogAdmin.validation.js   (new, Phase 3)
backend/src/modules/shared/servicePartnerPayout.js   (new, Phase 5: initialJobPayout / withAddOnPayout / computeJobBilling)
  catalog.validation.js        (extended)
backend/scripts/
  resetCatalogueData.js        (new — clean slate wipe, D1)
  seedMasterCatalogue.js       (new — client example offerings, D3)
frontend/src/
  lib/catalogueApi.js          (new — tree/offering/quote/search calls)
  lib/catalogueApi.js          (Phase 4 — tree / offering / quote + pickOffering)
  pages/BookingFlow.jsx        (Phase 4 — selection + quote state; hands `bookingMeta.quote` to payment pages)
  lib/catalogueAdminApi.js     (Phase 3)
  pages/super-admin/MasterCatalogue.jsx + components/super-admin/catalogue/*   (Phase 3)
```

## 10. Old → new mapping (what was deleted)

All done. The Phase 7 grep gate over `backend/src` and `frontend/src` returns nothing:
`ServiceCatalogItem | priceAddon | resolveBookedService | findProductTypeAddon | serviceProviderCommissionPercent | serviceProviderShare | BOOKING_CATALOG | bookingCatalog | advanceAmt = 199 | ?? 299 | || 299 | || 149`.

| Old | Replaced by | Removed in |
|---|---|---|
| `ServiceCatalogItem` model, its admin routes (`/catalog/categories/:key/services`, `/product-types`, `/admin`), `catalogSeedData.js`, `seedCatalogOnly.js` | `CatalogService` + `ServiceOffering`; `categorySeedData.js` (category visuals only) | Phase 7 |
| `ProductType.priceAddon` + `findProductTypeAddon()` | Per-combination offerings | Phase 4 |
| `resolveBookedService()` 4-source fuzzy lookup | `quote.service.js` by offering id | Phase 4 |
| `findCategoryOr404()` "any active category" fallback | Exact lookup, 404 otherwise | Phase 4 |
| `ServicePageConfig.catalog[].price`, `HomeTile.price` | Tile title resolved to the catalogue (`/catalog/search/resolve`) → live price | Phase 6 (unused) / Phase 7 (fields) |
| `CategoryBookingConfig.services` | Offering tree API | Phase 6 (unused) / Phase 7 (field) |
| `frontend/src/data/bookingCatalog.js` | Tree API | Phase 4 (prices) / Phase 7 (file) |
| `Booking.jsx` `?price=` path, `Payment.jsx` `state.price \|\| 299`, `advanceAmt = 199` | Quote; `/booking` is now a label → catalogue redirect | Phase 4 / 6 |
| `serviceProviderShare()` 30 % for paid bookings | `booking.commercial.spPayoutTotal` | Phase 5 (use) / Phase 7 (code) |
| `PlatformSettings.serviceProviderCommissionPercent` + Settings commission editor/simulator | Per-offering payout in the Master Catalogue | Phase 7 |
| Super-admin `ServiceCatalog.jsx` | `MasterCatalogue.jsx` | Phase 3 (route) / Phase 7 (file) |
| CMS tile / package price inputs in `CustomerAppCustomization.jsx` | Catalogue price shown by the app | Phase 7 |
