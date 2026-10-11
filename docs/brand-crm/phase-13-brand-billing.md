# Phase 13: Brand billing, invoices, dues and payments

**Status:** ✅ Complete · **Layer:** Full stack (Brand Panel + Super Admin finance) · **Delivers:** client §16, §20 (Billing section) · **Depends on:** Phase 12

## Goal
Completed jobs automatically build the brand's bill:

> Completed calls × applicable rate + approved parts / other charges + GST

NCC Finance issues invoices per brand per period and records payments. The
Brand Panel shows:
- total completed calls
- invoice value
- pending, paid and overdue amounts
- payment history

## Context: read first
- ARCHITECTURE §12 (`BrandInvoice`, `BrandPayment`, overdue rule); README D14, Q3.
- Phase 12 `BillingLine` + `charges.service.js`.
- Current (to retire from the Brand Panel):
  - `brand-admin/invoice.model.js` (customer-facing, manual), `invoice.service.js`, `/brand/invoices`
  - `brandInsights` `brandInvoiceSummary` (fixed 30-day overdue), `getBrandPaymentsSummary`, `listBrandPendingDues`
  - Frontend `Invoices.jsx`, `Payments.jsx`
- Super Admin finance pages (`billingTransaction`, `revenue`, `gatewayTransaction` modules): find where NCC finance lives in the Super Admin sidebar and add Brand Billing there.
- `shared/idGenerator.js` (add `BRAND_INVOICE: 'BINV'` yearly scheme like NCCW).
- `PlatformSettings` (add `brandInvoiceDay: 1`, `brandInvoiceAutoDraft: true`); `Brand.billing` (Phase 1 field set: `gstin`, `legalName`, `billingAddress`, `gstPercent`, `paymentTermsDays`).

## Tasks

### Backend
- [x] `brand-crm/brandInvoice.model.js`, `brandPayment.model.js` (§12); `ID_SCHEMES` `BINV-YYYY-######`.
- [x] `brand-crm/billing.service.js`:
  - `draftInvoice(brandId, { periodFrom, periodTo, actor })` collects `billable` lines with `closedAt` in the period that are not yet invoiced, computes totals (sum of line subtotals, GST, total), creates a `draft`, and marks the lines `invoiced`. **Transaction:** a line can never be on two active invoices (per-brand transactional lock, conditional line ownership update and optimistic version increment; see the index correction below).
  - `issueInvoice(id, actor)`: draft → issued, `issuedAt`, `dueDate = issuedAt + paymentTermsDays`. Generates a PDF (simple HTML → PDF if a library exists in the repo; otherwise a printable HTML endpoint, recorded as a deviation). Emits `INVOICE_ISSUED`. Notifies brand Finance users.
  - `cancelInvoice(id, reason)`: draft/issued with no payments → cancelled; lines go back to `billable`.
  - `recordPayment(invoiceId, { amount, mode, reference, receivedAt, note }, actor)`: amount ≤ balance; status → `partially_paid` / `paid`; `PAYMENT_RECORDED` event; brand notified.
  - `refreshOverdue()`: a daily sweep plus on-read computation: `issued|partially_paid` with `dueDate < now` → `overdue`.
  - `brandSummary(brandId, { from, to })` returns:
    - `completedCalls` (billing lines, non-void, in range)
    - `unbilledAmount` (pending_closure + billable)
    - `invoiceValue`, `paid`, `pending`, `overdue`
    - `overdueCount`
    - ageing buckets
- [x] Monthly auto-draft (Q3 default): on `brandInvoiceDay`, draft the previous month for every brand that has billable lines. The sweep is idempotent (one draft per brand per period). Notify NCC Finance to review and issue.
- [x] Brand routes `/api/v1/brand/billing`:
  - `GET /summary` (`billing:view`)
  - `GET /lines?status&state&city&from&to&q` (`billing:view`)
  - `GET /invoices` / `GET /invoices/:id` (with lines) / `GET /invoices/:id/pdf` (`billing:view`)
  - `GET /payments` (`payments:view`)
  - `GET /export?type=lines|invoices|payments` (`billing:export`)
  - `GET /billing-profile`, `PUT /billing-profile` (`settings:edit`; gstin, legal name, billing address)
- [x] Super Admin routes `/api/v1/super-admin/brand-billing` (`billing:manage` platform permission):
  - lines across brands
  - draft / issue / cancel invoice
  - record payment
  - brand billing terms (`paymentTermsDays`, `gstPercent`)
  - ageing report

  Every action is audited (`invoice.drafted|issued|cancelled`, `payment.recorded`).
- [x] Ticket detail `billing` gets `invoice: { humanId, status, issuedAt }` and line status.
- [x] Remove the brand `Invoice` create/update routes and `brandInsights` invoice/payment summaries (clean slate). Keep the `Invoice` model only if customer-facing code still uses it. Check with grep and record the outcome.

### Brand Panel
- [x] `Invoices.jsx` → **Billing**:
  - summary cards (Completed calls, Invoice value, Paid, Pending, Overdue, Unbilled)
  - tabs Unbilled lines / Invoices / Payments
  - invoice detail drawer with lines (ticket no, date, state/city, service, rate, parts, GST, total) and PDF download
  - export
- [x] `Payments.jsx` → payment history (date, invoice, amount, mode, reference) + dues ageing.
- [x] Settings → **Billing profile** (GSTIN, legal name, address; payment terms read-only).

### Super Admin
- [x] New **Brand Billing** page:
  - brand selector
  - unbilled lines
  - Draft invoice for a period
  - review → Issue
  - Record payment dialog
  - ageing table across brands
  - per-line "Add charge" (Phase 12)

### Tests
- [x] `backend/tests/brandCrmBilling.test.js`:
  - draft picks only billable lines in the period
  - concurrent drafts never double-bill a line
  - totals = Σ(rate + parts + other) + GST
  - issue sets dueDate from terms
  - partial then full payment → status transitions; overpayment → 400
  - overdue after the due date (clock injection)
  - cancel returns lines to billable
  - monthly auto-draft is idempotent
  - brand sees only its own invoices; brand Finance can view, a CCE gets 403
  - the summary matches the lines
  - audit rows written
- [x] `e2e/ui/brandCrmBilling.spec.js`: two closed tickets → Super Admin drafts + issues → brand Billing shows the invoice → Super Admin records a partial payment → brand shows Pending and the payment history.

## Acceptance
- Completed calls flow into invoices automatically, with GST.
- Pending, paid and overdue are correct, and the payment history is visible to the brand.
- No line can be billed twice.

## Implementation Log
Implemented on 2026-10-10.

- Added `BrandInvoice` / `BrandPayment`, yearly `BINV-YYYY-######` IDs, atomic drafting / issuing / cancelling / receipt recording, integer-paise totals, due-date ageing, audits and transactional in-app notifications / webhook outbox events. Receipts reject overpayment, duplicate references for the same brand/mode, future dates and dates before the invoice issue day. NEFT, RTGS, bank transfer, UPI, cheque, cash and other modes are supported.
- Financial writes require replica-set/sharded MongoDB transactions. A standalone returns 503 instead of risking partial money writes. Per-brand locking and line ownership/version checks serialize drafts and prevent charge edits racing with invoicing. Billing identity and NCC terms changes also use the same lock and atomic audits.
- Invoice line snapshots are frozen at draft; billing identity, issuer and payment terms are frozen at issue. Cancelled invoices retain their original details when released lines are changed or redrafted. Only unpaid drafts/issued/overdue invoices can be cancelled. Invoice responses derive call count and balance; `paidAmount` is the persisted receipt total (`amountPaid` is also returned for architecture compatibility).
- Monthly drafts run at boot and hourly on the configured UTC day (1–28, default 1), for the previous UTC calendar month. The active brand/period key makes repeated manual/scheduled drafting idempotent. NCC Finance receives a review notification. Overdue states refresh in this sweep and compute immediately on reads.
- Date filters and invoice periods use `[from, to)` in UTC: the start is included and the end excluded. Drafts select `closedAt`; line/summary call filters select `completedAt`; invoice-value summaries select `issuedAt`; invoice lists select `createdAt`; receipts select `receivedAt`. Draft/cancelled invoices are excluded from issued-value and dues totals. Unbilled includes pending closure and billable lines. Missing-rate flags remain visible during NCC review.
- Added brand-scoped billing / receipt / CSV / profile APIs and platform `billing:manage` NCC APIs. Brand billing readers cannot retrieve receipt details without `payments:view`. Filters are validated, client clocks ignored, CSV formula prefixes neutralized and printable content escaped.
- Brand Billing now has six live cards, unbilled/invoice/receipt tabs, invoice review drawer, exports and ageing. Payments shows brand receipts and dues; Settings contains editable identity with read-only terms. NCC Finance has a brand selector, drafts, issue/cancel, receipt entry, charge additions, terms and cross-brand ageing. Dashboard financial totals now use issued brand invoices and actual due dates.
- Retired all four manual `brand-admin/invoice.*` files and `/brand/invoices`, plus `brandInsights` fixed-30-day invoice/payment summary and pending-dues routes. A source/script search found no customer-facing consumer of that model; commerce product invoices render from orders independently. Existing legacy collection data is untouched. Reset scripts now clear the new billing models when explicitly invoked. Existing customer-collection / partner-payout APIs remain separate from brand invoice receipts.

**Plan corrections / deviations**

1. A unique index on the scalar `BillingLine.invoice` would permit only one line per invoice. Each line already has one invoice owner; conditional updates inside the per-brand transaction enforce exclusive ownership, while allowing multi-ticket invoices. The brand/period key has a partial unique index for draft idempotence.
2. No server PDF renderer is installed. `/invoices/:id/pdf` serves escaped printable HTML (`text/html`), with **Print / Save PDF** in the UI; it does not mislabel HTML as a PDF. Issued billing and charge details are immutable snapshots. No renderer dependency or external document service was added.
3. Overdue and monthly eligibility sweeps run hourly, including at boot, to recover restarts on the configured day; overdue is also computed on every read.

**Validation**

- `brandCrmBilling.test.js`: 16 scenarios, including real concurrent drafts/payments, rollback on audit failure, all money transitions, cancellation/redraft snapshots, monthly idempotence, tenant/RBAC checks, validated filters, receipt visibility, HTML escaping and billing profile/terms.
- Final focused gate: 4 suites / 103 tests passed (billing, brand administration, RBAC and Phase 12 charge capture).
- Browser billing journey: two real approved/allocated/repaired/confirmed/closed tickets → ₹708 invoice → issue → ₹100 receipt → ₹608 pending, receipt history, invoice list and billing-profile editing. Screenshots: `screenshots/phase-13-brand-billing.png`, `screenshots/phase-13-ncc-billing.png`.
- Full backend regression: **77 suites / 1,093 tests passed**, combining the isolated full run (1,091 tests) with the final focused run containing two additional billing cases. Every suite is green.
- Browser regression: **20 scenarios passed** across Brand CRM and the four-app warranty journey; the final billing rerun also passed after the invoice-list correction, including billing-profile saving.
- Running HTTP API regression: **5 Brand Admin scenarios passed**, including tenant isolation and refusal of retired manual invoice creation.
- Frontend production build passed; frontend/backend lint have no errors (existing repository warnings remain). Screenshots reviewed for Brand and NCC billing.

**Next:** Phase 14 — state/city reporting and analytics. Phase 14 has not been started.

