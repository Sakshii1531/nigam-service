# Phase 8 — Rates for Every Service (Full Catalogue Seed)

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 7 |

## Goal

Every category the app shows is bookable. Today only 8 of 39 categories have offerings, and the rest show "not available yet".
This phase seeds product types, services and offerings for every category, with random DEMO rates. The client replaces them from the admin, and they stay flagged ⚠ DEMO until then.

---

## Tasks

- [x] `scripts/masterCatalogueSeedData.js`: add the 31 categories without offerings, using the product-type and service names the app used before the catalogue (`catalogSeedData.js` in git history), so nothing the customer saw is renamed
- [x] Random but **deterministic** rates (seeded PRNG keyed on the offering code): the same seed always gives the same numbers, so tests and screenshots are stable. Customer price is rounded to ₹…9, payout 55–65 % of price, express on for repair-type services
- [x] Product-linked categories (Refrigerator, Microwave, Chimney, Air Cooler, and the extra AC / TV / WM / RO / Geyser types): one offering per (type × service); standalone categories (Plumber, Carpenter, cleaning, pest control…): one per service
- [x] Every seeded rate is `demo: true` → `needsRateReview`, with a DEMO badge in the admin
- [x] The 5 client rates from the brief are unchanged
- [x] Tests: every active category has ≥ 1 bookable offering; client rates unchanged; seed idempotent; all existing suites green

---

## Example

Before: Refrigerator → "This service isn't available yet". After: Refrigerator → Double Door → Gas Refilling → e.g. ₹1,149 (DEMO) → bookable, with a partner payout of ~₹690.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `686c217` | 39 categories · 211 offerings · 206 DEMO rates. Backend 706/706, e2e API 192 ✓ |

**How it's built**
- `scripts/catalogueExpansionData.js`: names only, taken from the pre-catalogue seed.
  - `NEW_CATEGORIES`: 31 categories, with product types, services and a reference price each.
  - `EXTENSIONS`: additions to the hand-built Washing Machine, Geyser, TV and RO.
- `scripts/catalogueExpansion.js` builds `FULL_CATALOGUE_SEED` from them. `seedMasterCatalogue()`, `seed.js` and every test seed it.
  - Rates come from `demoRate(code, base)`: a hash of the offering code seeds a PRNG, so the result is random but the same on every run.
  - Price = base × type factor × 0.85–1.35, ending in 9. Payout = 55–65 % of the price, rounded to ₹10. Express ₹99 / ₹50 is on except for visits and big jobs (shifting, renovation, painting…).
  - Units: product-linked services price per appliance ("per fridge"); cleaning, carpentry and plumbing items price per unit ("per bathroom", "per tap"); inspections are per visit; big jobs are per job.
- **Untouched:** AC (the client's own shape; Test 12 needs Window AC Gas Refilling and Deep Cleaning left unconfigured), Electrician, CCTV and Water Tank.
- The duplicate **"TV Installation"** category is set inactive, and its words were added to TV's keywords. It would otherwise compete with TV → Installation in search and in the category grid.

**Example** (seeded):

| Offering | Price | Payout | Unit |
|---|---|---|---|
| Single Door Refrigerator Repair | ₹629 | ₹390 | per fridge |
| Top Load Washing Machine Installation | ₹329 | ₹200 | per machine |
| Baffle Filter Chimney Deep Cleaning | ₹509 | — | per chimney |
| Tap & Mixer Repair / Replacement | ₹189 | ₹110 | per tap (max 6) |
| Home Shifting Service | ₹3,889 | ₹2,440 | per job, no express |

**Tests**
- New `backend/tests/fullCatalogueSeed.test.js`:
  - every active category has a bookable offering (38 checked through the tree API);
  - only the 5 client rates are not flagged for review;
  - Test 12 still holds;
  - generated rates are sane and deterministic;
  - the seed is idempotent.
- Updated for the fuller data: the admin list counts, the seed summary, the TV 55–65″ tree test (now checks installs only; LED repair happens to be ₹349), and resolve ("Refrigerator Repair" now resolves).

**Deviations from plan:** AC was not extended (see above). No OLED / QLED / Smart TV types were added, because a second "TV installation" group would compete with the client's "TV installation → LED TV" search example.

**Known gaps:** every generated rate is a placeholder for the client to replace. The admin table has a "DEMO rates" filter for finding them.
