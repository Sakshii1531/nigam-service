# Phase 23 — Skeleton Loaders and Partial Loading (Customer & Service-Provider Apps)

| | |
|---|---|
| **Status** | ✅ Done (2026-09-26) |
| **Depends on** | — |

## Goal

Every screen in the customer app and the service-provider app works like this:
- a section shows its real content the moment **its own** data arrives;
- a section still waiting shows a skeleton shaped like its content;
- one slow request never blanks the page, and nothing shows a bare spinner or "Loading…" text.

## The rule, and the kit

`frontend/src/components/common/Skeleton.jsx`:
- **Primitives:** `Skeleton`, `SkeletonText`, `InlineValue` (a number still loading inside a sentence or stat).
- **Section shapes:** `SkeletonCardRow`, `SkeletonHeading`, `SkeletonIconGrid`, `SkeletonBanner`, `SkeletonList`, `SkeletonCards`, `SkeletonStats`, `SkeletonKeyValues`, `SkeletonForm`, `SkeletonDetail`, `SkeletonProfileHeader`.
- **`LoadingSection`:** skeleton while loading, content otherwise; announces "Loading …" to screen readers (`role="status"`, `aria-busy`).
- **`SkeletonScreen`:** a whole-page skeleton, only for pages that show one thing (a booking, a job, a product, a notification).
- The pulse only runs for users who allow motion.

`frontend/src/hooks/useApiData.js`: one section's data with `loading` true only until the first answer. A later `reload()` keeps the current data on screen instead of flashing skeletons.

`frontend/src/components/common/PageSkeleton.jsx`: the router's fallback while a page's code downloads. It is shaped like the app you are in (customer, service provider or console) and replaces the full-screen spinner.

---

## Tasks

- [x] **Customer home:** banners, category chips, Our Services, Brands & Offers, Most Booked, Appliance repair & service, Spare Parts and Stories each load and show a skeleton independently. Before, the bundled fallback lists flashed first and were then swapped out.
- [x] **Customer pages:**
  - **Page skeletons** instead of a spinner: booking details, the booking flow's first load, product details, notification detail.
  - **List skeletons:** Appliance services, Notifications, Saved addresses, Payment methods, Wishlist (both pages), FAQs, Notification settings, Refer & earn, Rewards missions, Chat history, Buy Product.
  - **Per-section skeletons:**
    - Profile: bookings count, plan and wishlist count, now requested in parallel. They used to load one after another.
    - AMC: appliances and plans.
    - Extend Warranty: categories, brands, registered appliances and packs. Four requests that used to wait for each other.
    - Buy: popular products, spare parts and warranty appliances.
    - Also: cleaning prices, the refrigerator price, About NCC, the serviceable-cities count, docs.
- [x] **Service-provider context:** inventory, claims and earnings used to load one after another behind the job list. They now load in parallel with their own flags: `inventoryLoading`, `claimsLoading`, `earningsLoading`.
- [x] **Service-provider pages:**
  - **Dashboard:** stats and the earnings strip; job cards already had skeletons.
  - **Schedule:** appointments and totals.
  - **Inventory, Raise Part Request:** parts and claims.
  - **Earnings:** figures, trend chart and payout history.
  - **Recent Earnings, Earning Detail, Service History** summary.
  - **Announcements, Academy, Skills & Certifications, Notifications.**
  - **Verification, Payout Settings, Analytics**, Profile specialisation, Personal info territory, Settings toggles.
  - **Active Job:** opened directly or after a reload, it shows a skeleton while jobs load, instead of "no active job".
- [x] **Bugs found on the way:**
  - Extend Warranty's brand picker was always empty (`brandRes.data` on an array).
  - Exchange crashed calling `.toLocaleString()` on the product price before it loaded.
  - AMC said "Loading AMC plans…" forever when an appliance has no plans.
  - Profile showed "0 bookings" and "No active plan" before loading.
  - Settings toggles showed "on" before the real preference arrived.
  - The Buy page read only the first 100 products and filtered spare parts on the device, so spare parts vanished once the store passed 100 products. It now asks for them by category.
  - `seed:home` now also replaces home tiles whose service no longer exists (e.g. after a catalogue reset).
- [x] **Tests:** UI `skeletons.spec.js` (3). Each test holds back one API and checks that the rest of the page is already rendered while only that section shows its skeleton, which is then replaced by real content.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-26 | _pending_ | Skeleton kit, route skeleton, per-section loading across both apps; 6 loading bugs fixed |

**Test output**
```
backend  $ npm test                 Test Suites: 50 passed · Tests: 757 passed
e2e      $ npx playwright test      195 passed
e2e      $ npm run test:ui          52 passed (45.0s)  ·  rerun: 52 passed (47.0s)
frontend $ npm run build            ✓   (lint: 0 errors; warnings unchanged)
```

**Not in scope**: the super-admin and brand-admin consoles keep their own loaders. They only get the console-shaped route skeleton.
