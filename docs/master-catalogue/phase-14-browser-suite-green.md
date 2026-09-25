# Phase 14 — Browser Test Suite Fully Green

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phases 8–13 |

## Goal

`npm run test:ui` passes completely, including the 11 specs that were failing before the catalogue work began.

---

## Tasks

- [x] Triage each failing spec: product bug → fix the app; stale test → update it to the current screen; flaky → make it deterministic
- [x] cityChange ×2, serviceProviderJobs ×3, serviceProviderLogin (email mode), searchingPartner pop-up ×2, bookingDetails ×2, cancelBooking
- [x] Specs touched by Phases 8–13 updated
- [x] Full run green twice in a row (no flakes)

---

## Example

`npm run test:ui` → all passed, 0 failed.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | see git log | `npm run test:ui` **40 / 40 passed, twice in a row** (was 29 passed · 11 failed). API e2e 194 passed, **0 skipped** (was 1 skipped). Backend 720 / 720 |

Each failure was traced to a cause before anything was changed. Two were **app bugs**, which were fixed in the app; the rest were **tests written for screens that have since been redesigned**, which were updated to the current screens.

| Spec | Cause | Fix |
|---|---|---|
| serviceProviderJobs › declining the pop-up releases the job | **App bug.** Declining a *direct* offer put the job back in the open pool, but the open feed only excluded partners who had declined *open* offers, so the same partner immediately got the job back. | `listAvailableJobs` now excludes anyone in `declinedBy` (both kinds of decline). The partner's message changed from "job is now open to all service providers" to "we're finding another partner". New backend regression test in `serviceProviderJob.test.js`. |
| masterCatalogue › Test 4 (₹349 never appears) | **Seed collision** (from Phase 8). The random DEMO rate for LED TV Repair came out at exactly ₹349, the client's 32″ install price, and showed on the 55–65″ screen. | Reference price nudged (LED TV Repair is now ₹429). New guard test: no TV offering except the 32″ install costs ₹349. The UI suite's global setup now resets the catalogue before seeding, so seed changes always reach it. |
| serviceProviderLogin › email mode | The test used `not.toHaveText` on an error line that the app removes once the email is valid | `not.toBeVisible()` (as the phone test already did) |
| serviceProviderJobs › dashboard shows real data | The dashboard no longer has a rating block | Checks the real counts on the dashboard, and "No ratings yet" on the History page, where the rating now lives |
| serviceProviderJobs › accept → history | Accepting now keeps the partner on the dashboard with the job under *Active Jobs* (deliberate) | Expects "1 Active jobs" + "Start Job" instead of a redirect |
| cityChange ×2 | Copy renamed: "Service City" → "Service Territory", dialog "Request Territory Transfer", "Pending Admin Approval", new approve/reject messages and placeholder | Test strings updated |
| searchingPartner › search-ended pop-up ×2 | "Try again" split into **Search Again** and **Create New Booking** | Checks both buttons; *Create New Booking* returns to `/book/AC` |
| bookingDetails › list → details | The whole booking card opens details; "Details" is a label, not a button | Taps the card |
| bookingDetails › searching screen | The "Stage … / 15:00" timer was replaced by a stage heading | Checks the stage heading |
| cancelBooking › from the bookings list | Cancelling moved from the list card to the booking details page (redesign in `59e50d0`) | Opens the booking, then Cancel Booking, reason, confirm, Cancelled tab |
| api/notifications › mark one read *(skipped)* | Needed `POST /_dev/test-notification`, which was never built | Added (test environment only, auth required), so the spec now really runs |

**Test output**
```
e2e      $ npm run test:ui        40 passed (39.2s)   ·   rerun: 40 passed (40.0s)
e2e      $ npx playwright test    194 passed (6.8s)   (0 skipped)
backend  $ npm test               Test Suites: 47 passed · Tests: 720 passed
frontend $ npm run build          ✓
```

**Deviations from plan:** none.
