# Client Acceptance Tracker

Two views: the client's **12 test cases** (what they will actually try) and all **28
requirements** from the brief. Update the Status column at the end of each phase.

Status: ❌ Fails today · 🟨 Partly works · ✅ Passes (verified) — with the phase + how it was verified.

Prices below are **before GST**. With GST 18% added on top (D2), the checkout total is
shown in brackets.

---

## A. The 12 client tests

| # | Test | How we verify | Expected | Closed in | Status |
|---|---|---|---|---|---|
| 1 | Split AC Installation → ₹1,499 | AC → Split AC → 1.5 Ton → Installation | Service price ₹1,499 (checkout ₹1,768.82); partner ₹900 | P2 (API), P4 (app) | ✅ `clientAcceptance.test.js` › “Test 1: Split AC Installation → ₹1,499” + `e2e/ui/masterCatalogue.spec.js` |
| 2 | Window AC Installation → ₹599 | AC → Window AC → Installation | ₹599 (₹706.82); partner ₹350 | P2, P4 | ✅ `clientAcceptance.test.js` › “Test 2: Window AC Installation → ₹599” |
| 3 | LED TV 32" Installation → ₹349 | TV → LED TV → 32 inch → Installation | ₹349 (₹411.82); partner ₹200 | P2, P4 | ✅ `clientAcceptance.test.js` › “Test 3: LED TV 32" Installation → ₹349” |
| 4 | LED TV 55–65" Installation → ₹799 | TV → LED TV → 55–65 inch → Installation | ₹799 (₹942.82); **₹349 never appears** | P2, P4 | ✅ `clientAcceptance.test.js` › “Test 4: LED TV 55–65" Installation → ₹799 (₹349 never appears)” + `e2e/ui/masterCatalogue.spec.js` |
| 5 | Fan Installation — standalone, no product | Electrical → Fan Installation | No product step shown; bookable; ₹299/fan | P4 | ✅ `clientAcceptance.test.js` › “Test 5: Fan Installation — standalone, no product” + `e2e/ui/masterCatalogue.spec.js` |
| 6 | Water Tank Cleaning — optional tank size | Cleaning → Water Tank Cleaning → pick size | Each size shows its own price; booking stores the chosen size | P4 | ✅ `clientAcceptance.test.js` › “Test 6: Water Tank Cleaning — optional tank size” + `e2e/ui/masterCatalogue.spec.js` |
| 7 | Electrician Consultation — standalone | Electrical → Electrician Consultation | Bookable per visit, qty fixed at 1 | P4 | ✅ `clientAcceptance.test.js` › “Test 7: Electrician Consultation — standalone” |
| 8 | Customer price change ≠ payout change | Admin: 799 → 899 on TV 55–65" | New bookings ₹899, partner still ₹450; history shows the change with reason | P3 (admin), P5 (partner) | ✅ `clientAcceptance.test.js` › “Test 8: Customer price change ≠ payout change” + `e2e/ui/masterCatalogue.spec.js` |
| 9 | Quantity × price and × payout | Fan ×2 | Customer ₹598 (₹705.64), partner ₹360 | P2 (API), P5 (payout) | ✅ `clientAcceptance.test.js` › “Test 9: Quantity × price and × payout” |
| 10 | Same final price Service Selection → Payment | Walk every screen, every entry point | Identical `final` everywhere; matches booking record | P4, P6 | ✅ `clientAcceptance.test.js` › “Test 10: Same final price Service Selection → Payment” + `e2e/ui/masterCatalogue.spec.js` |
| 11 | Old booking keeps original price & payout | Book at ₹799 → admin changes to ₹899 → reopen old booking | Old booking still ₹799 / ₹450 and rate v1 | P4 | ✅ `clientAcceptance.test.js` › “Test 11: Old booking keeps original price & payout” |
| 12 | Unconfigured combination cannot be booked | Deactivate Window AC Gas Refilling; also call API directly | Option not shown; API returns 400 `OFFERING_NOT_BOOKABLE` | P2, P4 | ✅ `clientAcceptance.test.js` › “Test 12: Unconfigured combination cannot be booked” |

Automated in Phase 7: `backend/tests/clientAcceptance.test.js` runs all 12 through the real
HTTP API (tree → quote → booking → partner job → billing → payment, and the admin API for
price changes), and `e2e/ui/masterCatalogue.spec.js` walks Tests 1, 4, 5, 6, 10 (customer)
and 8 (admin) in the browser. Earlier per-phase evidence (browser walkthroughs, phase
tests) is in each phase's Implementation Log.

---

## B. All 28 requirements

| Req | Summary | Where it's built | Status |
|---|---|---|---|
| 1 | Single master catalogue; no hardcoded frontend prices | P1 models, P4 flow, P6 entry points, P7 delete `bookingCatalog.js` | ✅ booking flow (P4), every customer entry point (P6); `ServiceCatalogItem`, `bookingCatalog.js`, the old price editor, commission % and CMS price fields deleted (P7 grep gate empty) |
| 2 | Product-linked offerings (AC types × services) | P1, P2, P4 | ✅ (P1–P4) |
| 3 | TV size-based pricing | P1 variants, P4 variant step | ✅ (P1–P4) |
| 4 | Reusable for any product/variant (WM, fridge, RO, geyser, wifi camera) | P1 `variantDimension` — data, no code per product | ✅ model/data-driven (P1); new products via admin (P3) |
| 5 | Standalone services, product optional | P1 `STANDALONE`, P4 flow skips product step, P19 no brand step | ✅ (P4); a standalone booking never asks for or stores a brand; product-linked bookings pick from admin-managed catalogue brands (P19, `catalogueBrands.test.js`) |
| 6 | Offering = bookable job with unique code | P1 `ServiceOffering.code` | ✅ every booking is one offering, code on the snapshot (P4) |
| 7 | Fixed partner payout, not % commission | P1 rate, P5 payout engine | ✅ fixed payout per offering, frozen per job (P5) |
| 8 | Payout configured per offering | P1, P3 | ✅ (P3 + P5) |
| 9 | Price change doesn't move payout | P1 rate carry-forward, P3 UI | ✅ (P1 + P3) |
| 10 | Quantity × price and × payout, backend-validated | P2 engine min/max, P5 | ✅ qty × price and × payout, backend-validated (P2–P5) |
| 11 | Configurable pricing unit | P1 `pricingUnit` + `unitLabel` | ✅ (P1 model, P3 editor) |
| 12 | Optional attributes for standalone services | P1 service variants, P4 option step | ✅ (P4 tank-size options) |
| 13 | Express fee + optional partner incentive | P1 rate fields, P2 engine, P4 toggle, P5 payout | ✅ fee charged (P4) + partner incentive credited (P5) |
| 14 | GST config + full breakdown, backend-calculated | P2 engine, P3 per-offering override | ✅ GST shown on every booking screen and in booking details (P4) |
| 15 | Price consistent across all screens | P4 quote-driven flow, P6 entry points | ✅ main flow (P4) + every entry point (P6 matrix) |
| 16 | App sends offering + options + qty; backend does all maths | P2 quote, P4 booking | ✅ (P2 + P4) |
| 17 | Invalid combinations hidden and blocked | P2 tree API, P4 booking validation | ✅ (P2 + P4) |
| 18 | Full commercial snapshot on booking | P4 `Booking.commercial` | ✅ full snapshot (P4) |
| 19 | Super Admin Master Catalogue module | P3 | ✅ (P3) |
| 20 | All offering fields (28 listed) | P1 model, P3 editor | ✅ (P1 + P3 editor) |
| 21 | Search & discovery | P6 | ✅ `GET /catalog/search` (client's 6 example queries tested) + Dashboard/Categories search UI |
| 22 | Both flows share one booking engine; product optional | P4 | ✅ one engine for both flows (P4) |
| 23 | Partner app shows service, variant, instructions, payout | P5 | ✅ service line, size, qty, express, answers, instructions, collect amount, fixed payout (P5); add-on UI not browser-verified |
| 24 | NCC gross margin reporting, hidden from customer | P7 report, ARCHITECTURE §8 | ✅ `GET /super-admin/reports/margin` + Revenue → Service Margin (`marginReport.test.js`); never in customer or partner responses |
| 25 | Location/pincode override — future-ready | P1 rate `scope`, P2 resolver (no UI yet) | ✅ seam proven end to end — CITY and PINCODE rates in quote, tree and booking snapshot (`locationPricing.test.js`); admin UI deferred by design, steps in ARCHITECTURE §4 |
| 26 | Audit history for price/payout | P1 rate `changes`, P3 history view | ✅ stored (P1) + history & change log in admin (P3) |
| 27 | The 12 tests pass | P7 acceptance suite | ✅ 12/12 (`clientAcceptance.test.js`) + 6 browser walks |
| 28 | One engine, one catalogue, many types | whole plan | ✅ one catalogue (the only price source left), one pricing engine for bookings and add-ons, one booking engine for product-linked and standalone |
