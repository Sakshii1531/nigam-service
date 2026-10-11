# Phase 15: Dashboard on live ticket data

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §21 · **Depends on:** Phases 6, 8, 11, 13, 14

## Goal
Keep the current dashboard look, but make every card and chart read the
unified ticket, job and billing data in real time. KPIs:
- Total Complaints
- Pending Approval
- Approved
- Assigned
- In Progress
- Completed
- Escalated
- SLA Breached
- Total Billing
- Pending Payment

## Context: read first
- `brand-admin/brandInsights.service.js` `getBrandDashboard` (~L267; SR-based statuses, `Invoice`, parts `Claim` by **name regex**, `Escalation`). **Replace it.**
- `frontend/src/pages/brand-admin/Dashboard.jsx` (keep the layout; swap the data).
- ARCHITECTURE §3 (buckets), §4 (jobStage), §12 (billing summary), §14 (report functions to reuse).

## Tasks

### Backend
- [x] `GET /api/v1/brand/dashboard?from&to` (`dashboard:view`), reusing the Phase 14 report functions and the Phase 13 `brandSummary`. Returns:
  - `kpis`:
    - `total`
    - `pendingApproval` (bucket)
    - `approved` (approved in range)
    - `assigned` (jobStage PARTNER_ASSIGNED / VISIT_SCHEDULED)
    - `inProgress` (EN_ROUTE … REPAIR)
    - `completed` (COMPLETED / CUSTOMER_CONFIRMATION / CLOSED)
    - `escalated` (open escalations)
    - `slaBreached` (open tickets with a breach)
    - `totalBilling` (invoiced value in range)
    - `pendingPayment` (balance on issued / partially paid / overdue)
    - `unbilled`
  - each KPI with `{ value, previous, deltaPct }` against the previous equal period
  - `trend`: tickets created vs closed per day (range ≤ 31 days) or per week
  - `bySource`, `byProduct` (top 8), `byState` (top 10)
  - `slaSnapshot` (on track / warning / breached of open tickets)
  - `queues`: my pending items (Phase 9 my-work counts) for the current user
  - `parts`: awaiting brand approval, in transit, installed in range
  - `billing`: Phase 13 summary
- [x] Remove the old dashboard aggregations and their dependency on `Claim` brand-name matching.
- [x] Each KPI exposes a `link` (queue filter / report URL) so the UI can drill down.
- [x] Realtime: the dashboard listens to `claim:updated`, `brand:billing_updated` and `brand:escalation_updated` and refetches (debounced 2 s).

### Brand Panel
- [x] `Dashboard.jsx`:
  - map the existing cards to the 10 KPIs + Unbilled
  - charts to trend / source / product / state
  - SLA snapshot donut
  - my-work strip
  - date range selector (Today / 7 d / 30 d / This month / Custom)
  - every card clickable to its filtered queue or report
  - remove anything still hardcoded (check `Dashboard.jsx` for literal numbers or labels)
- [x] Cards hidden per permission (billing cards need `billing:view`).

### Tests
- [x] `backend/tests/brandCrmDashboard.test.js` (fixture with known counts):
  - each KPI exact
  - previous-period delta
  - permission-trimmed payload for a CCE (no billing)
  - cross-brand isolation
- [x] `e2e/ui/brandCrmDashboard.spec.js`: approving a ticket in another browser updates Pending Approval / Approved without reload; clicking SLA Breached opens the filtered queue.

## Acceptance
- All ten KPIs and the listed charts come from real data and update live.
- No hardcoded values remain on the dashboard.

## Implementation Log
- Replaced the legacy dashboard and brand-name/partner-stock parts summaries with `brandDashboard.service.js`, using WarrantyClaim, tenant-keyed warranty PartOrder and Escalation, Phase 14 source reports, Phase 13 billing summary and Phase 9 My Work counts.
- Added all eleven KPIs, equal preceding-period comparisons (null delta without a prior baseline), validated UTC exclusive ranges (seven-day default; 366-day maximum), daily/weekly densified created-versus-closed trends, top-eight category and top-ten state charts, SLA snapshot, own-work strip, recent unified tickets and current/in-range part summaries.
- Permission trimming runs on the server: no financial KPI or billing summary without billing:view, and no own-work/recent/parts payload without corresponding view permissions. UI hides financial cards and inaccessible drill-down links/actions.
- Documented cohort semantics in the UI: current status/stage/SLA within creation cohorts; approvals by approval-event date; escalations by raised date; issued invoice value and current balance by issue date. Current queue counts are independent of reporting dates. These comparisons do not claim historical state reconstruction.
- Shared stage/SLA/approval query expressions with validated dashboardKpi queue filters. Queue filters now initialize from drill-down URLs. Billing accepts explicit issue-date and outstanding filters, preserving its default created-date list behavior; escalation links carry matching raised dates. Added matching indexes.
- Added a debounced Socket.IO dashboard subscription (2 seconds), reconnect resync and minute SLA clock refresh. Claim approvals and escalations emit owning-brand invalidations, including ordinary escalation edits and legacy service-request escalations after commit; existing warranty changes also trigger refresh. Billing writes emit brand-only invalidations after successful commit. Preserved the existing single job-stage event contract.
- Kept the card/chart/sidebar styling and replaced all legacy dashboard data. Added working date presets/custom filters, accessible trend data, source/product/state bars, SLA donut, real recent complaints, parts/financial panels and permission-aware quick actions. No new frontend dependency.
- Eight fixture integration tests cover every KPI, previous deltas, independent approval dates, exclusive boundaries, weekly bins, permission trimming, tenant isolation, exact queue/billing/escalation drill-downs, paused SLA, event scoping, and absence of billing events after rejection/transaction rollback. Updated legacy dashboard tests to expect unified-ticket data.
- Added a two-browser scenario: approving in one session updates Pending Approval/Approved in the other without reload; SLA Breached navigates to its filtered queue; Today filters and CCE financial hiding are verified. [Dashboard screenshot](screenshots/phase-15-dashboard.png).

### Final validation

- Full backend regression: **79/79 suites, 1,112 tests passed**, using isolated disposable replica-set databases.
- Final dashboard/escalation check after the refresh fix: **2 suites, 9 tests passed**, including ordinary edits, cross-brand rejection and legacy escalation creation. Final dashboard/communication check: **2 suites, 24 tests passed**.
- Full Brand CRM browser regression: **22/22 scenarios passed**. Final dashboard visual scenario passed again; the full-page screenshot was inspected.
- Brand Admin API smoke: **5/5 passed**.
- Backend lint: zero errors, eight existing warnings. Frontend lint: zero errors, 153 existing warnings. Production build passed with the existing bundle-size warning. `git diff --check` passed.
- No production data migration is required. Validation used disposable local test data. Phase 16 remains unstarted.

