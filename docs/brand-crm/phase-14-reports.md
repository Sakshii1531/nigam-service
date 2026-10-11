# Phase 14: Reports: state/city call and billing + analytics + export

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §17, §21 (reports list) · **Depends on:** Phases 11–13

## Goal
The brand can see State → City → number of calls → applicable rate → total
amount, plus source, product, SLA, resolution-time, warranty, billing and
partner-performance reports. All reports are filterable by date, state, city,
service, product and status, and exportable to CSV and XLSX.

## Context: read first
- ARCHITECTURE §14 (report list + common filters).
- `brand-admin/brandInsights.service.js` `getBrandReports` (SR-based: category, top providers, sentiment, monthly). **Replace it.**
- `frontend/src/pages/brand-admin/Reports.jsx`, `frontend/src/lib/exportCsv.js`.
- Data: tickets (`WarrantyClaim`: source, warranty, SLA, jobStage, closure, coverageDecision, rejectionCode), `BillingLine`, `BrandInvoice`, `Review`.
- Check whether an XLSX library is already in `backend/package.json` (e.g. `exceljs`); if not, add `exceljs` and record it.

## Tasks

### Backend
- [x] `brand-crm/brandReports.service.js`: one function per report (§14 table), sharing `buildFilter(brandId, query)` (date field per report: `createdAt` for ticket reports, `completedAt` for billing). All aggregations run in Mongo with indexes. Verify with `explain()` on 10k seeded tickets and record the timings in the log.
  - `stateCityBilling`: group BillingLine by state → city: `calls`, distinct `rates[]` (amount + count), `subtotal`, `gst`, `total`; state subtotals; grand total. `status` filter = line status. `service` = categoryKey + serviceType.
  - `source`: tickets per source, approved %, rejected %, avg time-to-decision.
  - `product`: per category/productType: tickets, In/Verification/Out split, repeat complaints (same serial or appliance within 90 days) %.
  - `sla`: per stage: met / warning / breached, breach %, avg overrun.
  - `resolutionTime`: avg / median / p90 hours created → completed, by category and city (use `$percentile` if the Mongo version supports it, else compute in JS on the bounded set; record which).
  - `warranty`: status distribution, coverage decisions, rejection codes.
  - `billing`: per month: calls, invoiced, paid, pending, overdue, ageing buckets.
  - `partnerPerformance`: per partner (name only): jobs, completed %, avg TAT, first-visit SLA breach %, average rating, repeat-visit %.
- [x] Routes `/api/v1/brand/reports/:report` (`reports:view`) and `?format=csv|xlsx` (`reports:export`). File names `{brandPrefix}-{report}-{from}-{to}.{ext}`. Exports are streamed and capped at 100k rows (with a message beyond that).
- [x] Remove `/brand/reports` (old) and the `getBrandReports` code.
- [x] Export audit: `report.exported` with the filters.

### Brand Panel
- [x] `Reports.jsx` rewritten:
  - report picker (8 reports)
  - shared filter bar: date range presets + custom, state → city cascade (from the City master), service (category + service type), product type, status, source
  - each report gets a table plus one chart where useful. Follow the `dataviz` skill guidance for charts. **State/City** is an expandable state rows → city rows table with totals.
  - Export CSV / Excel buttons (per `can('reports:export')`)
  - URL query params keep the filters (shareable links)
- [x] Empty states and loading skeletons consistent with the existing pages.

### Tests
- [x] `backend/tests/brandCrmReports.test.js` (a seeded fixture with known numbers across two states, three cities, two rates, mixed SLA outcomes):
  - every report returns the exact expected numbers
  - every filter narrows correctly
  - CSV/XLSX export headers and row counts
  - Brand B data never included
  - CCE 403
  - Viewer can view but not export (per template)
- [x] `e2e/ui/brandCrmReports.spec.js`: state/city report expands Maharashtra → Pune with the right amount; the export downloads a file.

## Acceptance
- The State → City → calls → rate → amount report matches billing lines exactly.
- All eight reports filter by date, state, city, service, product and status, and export.

## Implementation Log
- Added eight tenant-scoped report functions and shared filters. Ticket cohorts use created dates; billing uses completion dates, with UTC exclusive ends. Financial sums use integer paise. Invoice receipt attribution uses differences of rounded frozen-line prefixes, preserving paise across filtered views.
- Product repeats search the previous 90 days independently of cohort dates, matching serial/category or linked appliance. A typed missing-appliance sentinel avoids an unindexed lookup; this reduced the initial 10k product benchmark from ~39 seconds to ~3.1 seconds.
- Resolution percentiles use MongoDB 7+ approximate `$percentile`; the bounded fallback uses exact linear interpolation. SLA handles paused, warning, met and breached stages; first-visit metrics also detect overdue stages before the sweep runs. Partner reports return names and brand-specific performance only.
- Added ExcelJS 4.4.0. CSV/XLSX serialization streams the bounded report rows; both formats require view + export permission, use brand-prefixed filenames and audit report/filter/row count. CSV neutralizes spreadsheet formulas. State/city rows and totals use separate Mongo cursors to avoid the facet document-size limit defeating the 100k row error.
- Replaced the legacy SR report endpoint/service and updated API examples. The UI includes all eight reports, URL filters, cascading City master filters, date presets, expandable state totals, tables, CSS bar charts, export permissions, empty states and loading skeletons. The unavailable `dataviz` skill was not used; native accessible bars fit the existing UI without a new chart dependency.
- Added 12 integration tests covering exact numbers, all filters, tenant/role isolation, both exports for all reports, audit records, CSV escaping, mixed rates, appliance repeats, paused/unswept SLA, percentile fallback and row overflow. Added a browser scenario with two real closed jobs: Maharashtra → Pune = ₹600 subtotal + ₹108 GST = ₹708, both downloads, all report switches and URL persistence.

### 10k query-plan benchmark

Reproduce with `BRAND_REPORT_BENCH_URI=mongodb://127.0.0.1:27018 node backend/scripts/benchmarkBrandReports.js`. The script refuses remote hosts and creates/drops only a random temporary database. MongoDB **7.0.41**, **10,000 cohort tickets + 10,000 other-brand tickets**, and **20,000 billing lines**, while regression tests were running. Local timings are measurements, not production latency guarantees. Raw summary: [phase-14-benchmark.json](phase-14-benchmark.json).

| Report | End-to-end ms | explain ms | Main index |
| --- | ---: | ---: | --- |
| State/city billing | 33 | 26 | brand + completedAt |
| Source | 68 | 32 | brand + createdAt |
| Product | 3134 | 2878 | brand + createdAt; serial/date and appliance lookups |
| SLA | 81 | 80 | brand + createdAt |
| Resolution | 33 | 31 | brand + createdAt |
| Warranty | 25 | 18 | brand + createdAt |
| Billing | 732 | 752 | brand + completedAt |
| Partner performance | 1379 | 1410 | brand + createdAt; job/review indexes |

Each primary cursor examined 10,000 documents/keys, excluding the other brand. State/city runs three grouped cursors; its explain column records the city cursor. All are checked by the script. Product lookups use `brand_1_serialNumber_1_createdAt_-1` and `brand_1_appliance_1`; no missing-identity job scan remains.

### Final validation

- Full backend regression: **78/78 suites, 1,104/1,104 tests passed**, each database suite isolated on disposable local replica sets.
- Final focused gate: report/RBAC/Brand Admin **3 suites, 90 tests passed**; final lookup optimization rechecked with **12/12 report integration tests**.
- Browser regression: **21/21 scenarios passed**, covering customer, Brand Panel, NCC, partner, parts, SLA, policy, communication, registration, billing and reports. [State/city screenshot](screenshots/phase-14-state-city.png) visually inspected.
- Brand Admin HTTP smoke: **5/5 passed**. Backend/frontend lint: **0 errors**, existing 8/153 warnings. Production frontend build passed with existing chunk-size warnings. `git diff --check` passed.
- Benchmark uses only temporary local data and cleans its own database. Test services are stopped after validation. No production data migration is required. Phase 15 remains unstarted.

