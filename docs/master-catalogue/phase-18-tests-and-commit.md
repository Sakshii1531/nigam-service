# Phase 18 — Browser Tests Updated, Everything Green, Commit

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phases 15–17 |

## Goal

The browser suite covers the new behaviour and every suite passes. The work is committed to `main`.

---

## Tasks

- [x] UI specs: finance route gone; brand-admin Payments / Dashboard show real sums; an admin uploads a category image and the AMC picker shows it; the declined-offer and Buy-page fixes stay covered
- [x] Backend, e2e API and e2e UI suites all green (UI twice in a row); build and lint clean
- [x] Phase logs, README, memory; commit to `main`

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `a08a6dc` | New `e2e/ui/platformCleanup.spec.js` (4 tests); every suite green |

**New browser tests** (`e2e/ui/platformCleanup.spec.js`)

| Test | Checks |
|---|---|
| the finance offer page no longer exists | `/finance/personal-loan` shows no finance offer or "pre-approved" text |
| Buy → Products & Accessories and All Appliances open | the two pages that used to be unreachable load, with store spare parts from admin Products |
| brand Payments and Dashboard show the brand's own invoice totals | a real invoice created for a fresh brand appears on both pages ("1 unpaid invoice", its amount); the old hardcoded figures are gone |
| an admin uploads a category picture and the AMC list shows it | Master Catalogue → Edit AC → Picture goes through `POST /uploads`, and the customer AMC appliance list shows that same image URL. The test puts the category back afterwards. |

The declined-offer fix is covered by the partner-jobs UI spec and a backend test (Phase 14). Client Tests 1, 4, 5, 6, 8 and 10 run in `masterCatalogue.spec.js`.

**Test output**
```
backend  $ npm test                 Test Suites: 47 passed · Tests: 726 passed
e2e      $ npx playwright test      194 passed (0 skipped)
e2e      $ npm run test:ui          44 passed (56.2s)  ·  rerun: 44 passed (56.8s)
frontend $ npm run build            ✓   (lint: 0 errors)
backend  $ eslint                   0 errors
```
