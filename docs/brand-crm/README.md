# NCC Brand Panel / Brand CRM: implementation plan

This folder is both the plan and the progress record for turning the Brand Panel
into the brand's **After-Sales Command Centre**. One centralised ticket system
feeds every source: the NCC App, Toll-Free/CCE, Brand Manual entry, WhatsApp and
API. Every ticket follows the same workflow through brand approval, NCC Super
Admin, automatic partner allocation, service, parts, completion, billing,
payment and reports.

The plan is written so **any new chat can pick up the next phase without the
conversation that produced it**. Start with [§6 How to resume](#6-how-to-resume-in-a-new-chat).

| File | What it is |
|---|---|
| [README.md](README.md) | This page: goal, decisions, phase index and status, working rules, how to resume |
| [GAP-AUDIT.md](GAP-AUDIT.md) | What existed on 2026-10-06, before Phase 1, for each of the client's 22 sections, with file references |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Target data model, ticket and job-stage machines, permissions catalogue, SLA, billing, intake API, events |
| [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md) | The client's 22 requirements mapped to phases, with pass/fail status and evidence |
| [USER-GUIDE.md](USER-GUIDE.md) | Role-by-role operating guide for the Brand Panel and connected NCC/Partner workflows |
| [WALKTHROUGH.md](WALKTHROUGH.md) | Detailed click-by-click registration → approval → partner → parts → closure → billing → payment walkthrough, including legacy-login troubleshooting |
| [MANUAL-TEST-CHECKLIST.md](MANUAL-TEST-CHECKLIST.md) | Manual acceptance scenarios, expected results and automated verification commands |
| [PROVIDER-LOCATION-FIXES-2026-10-15.md](PROVIDER-LOCATION-FIXES-2026-10-15.md) | Desktop provider availability, NCC status refresh, customer GPS/address/map-pin capture and warranty skill matching |
| [FOUR-PANEL-CLIENT-REVIEW-2026-10-15.md](FOUR-PANEL-CLIENT-REVIEW-2026-10-15.md) | Review against both client briefs: four-panel journeys, confirmed defects, actual brand readiness and acceptance matrix |
| `phase-N-*.md` | One file per phase: context, scope, tasks, API examples, acceptance, and an **Implementation Log** filled in when the phase is done |

Related: [`docs/partner-warranty/`](../partner-warranty/README.md) is the B2B2C
warranty flow (16 phases, done). This plan **builds on it**: its
`WarrantyClaim` becomes the master ticket for every source.

---

## 1. The target flow

```
 NCC Customer App ─┐
 Toll-Free (CCE) ──┤                         ┌──────────── Brand Panel ────────────┐
 Brand Manual ─────┼──▶ Central Ticket ──────▶ Pending Approval → Verify warranty │
 WhatsApp bot ─────┤   NCCW-2026-000123       │ Approve / Reject / Hold / Request… │
 Brand CRM API ────┘   + Brand Ticket No      └──────────────┬─────────────────────┘
                       (source, CCE, SLA)                    ▼ approve
                                              NCC Job NCCJ-2026-000456 (Super Admin)
                                                             ▼
                                   Automatic partner allocation (pincode · skill ·
                                   brand authorisation · availability · workload · SLA)
                                                             ▼
          Partner Finding → Offered → Accepted → En Route → Reached → Diagnosis
          → Repair → (Parts Required → Approved → Dispatched → Received → Installed)
          → Completed → Customer Confirmation → Closed
                                                             ▼ (live, every stage)
                        Brand Panel status · Customer App · Super Admin
                                                             ▼
          Billing line (rate: Brand → Service → State → City) + parts + GST
                                                             ▼
               Brand invoice → dues → payments → reports and analytics
```

**One ticket entity, one workflow.** Every source creates a `WarrantyClaim`
document, shown in every UI as a **Ticket**, through one service function. The
`ServiceRequest` (NCCJ) is only ever the NCC **job** created when a ticket is
approved. No source creates a `ServiceRequest` directly any more.

---

## 2. Where we start

Full detail: [GAP-AUDIT.md](GAP-AUDIT.md). In short:

- **Two parallel complaint systems exist.** NCC App claims (`WarrantyClaim`) have
  approval, SLA, timeline, audit, allocation and live sync. Brand-registered
  complaints (`ServiceRequest`) skip approval, record no source, CCE, address or
  SLA, and are not dispatched on creation.
- **Brand permissions are stored but never enforced.** Every brand user can do
  everything.
- **Missing entirely:**
  - warranty policy (coverage rules)
  - state/city rates
  - automatic brand billing
  - state/city reports
  - an intake API for WhatsApp
  - Customer 360 history
  - new-customer creation
  - a brand audit page
- **Dashboard, reports and customers** read only `ServiceRequest`, so pending
  approvals are invisible on them.

---

## 3. Decisions

These are the defaults chosen. Change any of them **before** its phase starts,
and update ARCHITECTURE.md to match.

| # | Decision | Consequence |
|---|---|---|
| D1 | **Clean slate.** The app is not live. | No data migration of existing brand `ServiceRequest` complaints, old `Invoice` rows or old `RateCard` rows. Seeds and fixtures are rewritten. |
| D2 | **Master ticket = the existing `WarrantyClaim` collection**, called "Ticket" in every UI and in this plan. | No new collection, no rename. It reuses the status machine, timeline, audit, SLA, job link, allocation and sync from partner-warranty. Model and file names stay `warrantyClaim*` / `claim*`. |
| D3 | **IDs.** Master Ticket ID = `NCCW-YYYY-######` (platform-unique). Brand Ticket No = `{brand.ticketPrefix}-YYYY-######` (per-brand counter). NCC Job ID = `NCCJ-YYYY-######`. | All three are shown together on every ticket screen and in exports. The client's "Brand Ticket ID ↔ NCC Ticket ID" maps to Brand Ticket No ↔ NCCJ. |
| D4 | **Brand-registered complaints no longer create a `ServiceRequest`.** The brand branch of `POST /service-requests` is removed. | `RegisterComplaint.jsx` creates a ticket. The old "All Complaints" (`Requests.jsx`) is replaced by the unified ticket queue. |
| D5 | **Customer-paid B2C bookings stay NCC jobs, not brand tickets.** | They leave the Brand Panel complaint list. See Open question Q1. |
| D6 | **Approval routing per source.** NCC App, WhatsApp and API tickets always go to Pending Approval. A Toll-Free or Manual ticket goes to Pending Approval, unless its creator holds `tickets.approve` and chooses "Register & Approve" (recorded as two timeline events), or the brand setting `autoApproveSources` lists that source. | One workflow, with an optional one-step path for authorised staff. |
| D7 | **Coverage decision on approval.** The options are `warranty` (policy-covered) and `goodwill` (outside policy, brand pays anyway). Out-of-warranty without goodwill is a **Reject** with reason code `OUT_OF_WARRANTY`, and the customer app offers a paid booking. | Billing knows who pays. Both options bill the brand. |
| D8 | **Permissions are enforced server-side**, module × action (`tickets.approve`, `billing.view`…). They are resolved from the database per request through a 60 s cache, so revoking access takes effect at once. The UI hides menus and buttons only as a convenience. | Every brand route gets a permission guard (Phase 2). |
| D9 | **Brand Super Admin = owner.** The brand admin created by NCC Super Admin gets the "Brand Super Admin" role template with every permission. A brand must always keep at least one active Brand Super Admin. | No lock-out. |
| D10 | **`employeeId` lives on `User`** for brand staff, unique per brand. Timeline and audit events store an **actor snapshot**: `{ user, name, employeeId, roles }`. | "User + Employee ID + Date/Time + Remarks" on every decision. |
| D11 | **The detailed NCC job stage is a separate field (`jobStage`) from the ticket `status`.** | The customer app keeps its 9-stage tracker. The Brand Panel and Super Admin see the full 13-stage live job stage. |
| D12 | **`BrandRate` replaces `RateCard`.** The key is Brand → Category + Service Type → State → City. The most specific active row wins (city > state > national). The rate is snapshotted when the job completes. | Later rate edits never change lines already billed. |
| D13 | **Partner payout stays separate from the brand rate.** A `BrandRate` row holds `brandRate` (what the brand pays NCC, visible to the brand) and `partnerPayout` (what NCC pays the partner, Super Admin only). `coveredVisitEarnings` reads `partnerPayout`. | The brand never sees the partner payout, and the partner never sees the brand rate. |
| D14 | **Billing lifecycle.** A `BillingLine` is created at **Service Completed** and becomes billable at **Closed**. It is voided if the ticket is reopened or cancelled. NCC (Super Admin Finance) generates a `BrandInvoice` per brand per period. GST is added on top, using the brand's GST %, else `PlatformSettings.defaultGstPercent` (18). Due date = issue date + `brand.billing.paymentTermsDays` (default 30). NCC Finance records payments. | Billing becomes automatic. The old customer-facing brand `Invoice` screen is retired from the Brand Panel. |
| D15 | **The WhatsApp bot itself is out of scope.** We build an authenticated **Intake API** (per-brand and platform API keys, idempotency, media upload, catalogue lookups) that a bot or brand CRM can call, plus docs and a simulator test. | "Backend ready for WhatsApp". |
| D16 | **Customers created by a CCE** are `User { role: 'customer', phone, name }` with a random unusable password hash. They sign in later using the customer login screen’s "Sign in with OTP" option and see their tickets in the app. Phase 3 also creates a unique BrandCustomer relationship so their profile is accessible before a first ticket. Phone + role is already unique. | No duplicate customers. Search is by phone first. |
| D17 | **Videos are allowed on tickets**: mp4/webm/mov, ≤ 50 MB each, ≤ 2 per ticket. They use a separate upload limit from images and PDFs (10 MB). | Meets "Images/videos". |
| D18 | **The plan lives in repo markdown.** Do one phase at a time, ideally one phase per chat. Every phase ships tests. | Same workflow as `docs/partner-warranty/` and `docs/master-catalogue/`. |

### Open questions for the client
These don't block the start. Each has a default and is listed in the phase that depends on it.

| # | Question | Default until answered | Phase |
|---|---|---|---|
| Q1 | Should customer-paid bookings of a brand's product show (read-only) in the Brand Panel? | No | 6 |
| Q2 | Who may edit call rates: the brand, NCC, or both? | Both: brand users with `rates.edit`, plus Super Admin. Every change is audited. | 12 |
| Q3 | Billing period: monthly, or on demand? | Monthly auto-draft on the 1st, plus on-demand generation by NCC Finance | 13 |
| Q4 | Do warranty-covered parts need brand approval, NCC approval, or both? | Brand approval when the policy says parts are covered and the part price is ≥ the brand's `partsApprovalThreshold`. Otherwise NCC approval only. | 10 |
| Q5 | Does the brand pay for a visit where the customer was not available? | Yes, at the `visitOnly` service-type rate if one is configured, else ₹0 | 12 |

---

## 4. Phase index

Phases are **vertical slices**: backend, Brand Panel UI, Super Admin, apps and
tests together, so each phase can be demoed and is self-contained for a new
chat. Order follows dependencies.

| # | Phase | Layer | Client § | Status |
|---|---|---|---|---|
| 1 | [Unified ticket foundation](phase-1-unified-ticket.md) | Backend | 1, 7, 14, 19 | ✅ |
| 2 | [Brand RBAC: roles, departments, permission enforcement](phase-2-brand-rbac.md) | Full stack | 5, 18 | ✅ |
| 3 | [Customer 360 and mobile search](phase-3-customer-360.md) | Full stack | 6, 13 | ✅ |
| 4 | [Multi-channel ticket registration (CCE / Toll-Free / Manual) + intake fields](phase-4-ticket-registration.md) | Full stack | 1, 2, 5, 13 | ✅ |
| 5 | [Warranty policy engine and verification](phase-5-warranty-policy.md) | Full stack | 4 | ✅ |
| 6 | [Approval workflow v2 + unified ticket queue](phase-6-approval-and-queue.md) | Full stack | 1, 3, 7 | ✅ |
| 7 | [Ticket detail page: single source of truth](phase-7-ticket-detail.md) | Full stack | 20 | ✅ |
| 8 | [Live NCC job-stage sync, allocation visibility, closure](phase-8-job-stage-sync.md) | Full stack | 8, 9, 20 | ✅ |
| 9 | [Communication and activity timeline](phase-9-communication-timeline.md) | Full stack | 5, 14 | ✅ |
| 10 | [Spare parts connection](phase-10-spare-parts.md) | Full stack + Partner app | 10 | ✅ |
| 11 | [SLA v2 and automatic escalation](phase-11-sla-escalation.md) | Full stack | 11 | ✅ |
| 12 | [Call rates v2 (Brand → Service → State → City) + charge capture](phase-12-call-rates.md) | Full stack | 15 | ✅ |
| 13 | [Brand billing, invoices, dues and payments](phase-13-brand-billing.md) | Full stack | 16 | ✅ |
| 14 | [Reports: state/city call and billing + analytics + export](phase-14-reports.md) | Full stack | 17, 21 | ✅ |
| 15 | [Dashboard on live ticket data](phase-15-dashboard.md) | Full stack | 21 | ✅ |
| 16 | [Audit log coverage + brand audit page](phase-16-audit-log.md) | Full stack | 19 | ✅ |
| 17 | [Intake API + WhatsApp-ready backend](phase-17-intake-api.md) | Backend + docs | 12 | ✅ |
| 18 | [Multi-brand hardening and isolation suite](phase-18-multi-brand.md) | Backend + tests | 22 | ✅ |
| 19 | [End-to-end verification and client acceptance](phase-19-e2e-acceptance.md) | All | all | ✅ |

Status legend: ⬜ Not started · 🟨 In progress · ✅ Done

**Dependencies:**
- 1 → everything.
- 2 before any phase that adds brand routes; its guard is used from Phase 3 on.
- 3 → 4 → 5 → 6 → 7.
- 8 to 11 each need 6.
- 12 → 13 → 14 → 15.
- 16 to 18 can run after 13.
- 19 is last.

---

## 5. Working rules for every phase

1. **Read before coding:** this README, the phase file, the ARCHITECTURE.md
   sections it cites, and the previous phase's Implementation Log.
2. **Tick tasks** in the phase file as they are done. Fill its **Implementation
   Log** (files, endpoints, decisions taken, deviations, test output) in the
   same change.
3. **Update** this README's status table and [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md).
   If the design moved, update [ARCHITECTURE.md](ARCHITECTURE.md).
4. **Tests:**
   - Backend: Jest tests in `backend/tests/brandCrm*.test.js`, against the
     **local test DB** (`tests/helpers/testDb.js`), never the Atlas DB in
     `backend/.env`. Reuse and extend `tests/helpers/partnerWarranty.js`, plus a
     new `tests/helpers/brandCrm.js` from Phase 1.
   - UI: Playwright specs in `e2e/ui/brandCrm*.spec.js`. Run them with
     `E2E_UI_PORT=5299` because another local Vite app holds 5199.
   - Start MongoDB first if Jest `beforeAll` times out. Run the backend suite
     once with `--forceExit`. Random 401/404/timeouts are environmental (port
     clash, load): rerun before you debug.
5. **The full backend suite must stay green** at the end of each phase.
   Partner-warranty suites especially must not regress.
6. **Never hardcode** brand names, prices, rates, SLA hours, GST, roles or
   statuses in the UI. Everything comes from the API or configuration.
7. **Every state change** goes through the single writer (`recordAction` /
   `appendEvent`, Phase 1), so the timeline, audit and events can never be
   skipped.
8. **Every new `/api/v1/brand/*` route needs a rule** in `backend/src/modules/brand-crm/brandAccess.js` (`BRAND_ROUTE_RULES`). Without one it is refused (deny by default) and `brandCrmRbac.test.js` fails. Every new Brand Panel page needs an entry in `frontend/src/lib/brandAccess.js`. Audit writes use `actorFromReq(req)` + `recordAction` (Phase 2).
9. **Commit only on the user's explicit go-ahead.** The working tree may hold
   other people's uncommitted work. Stage only this phase's files.

---

## 6. How to resume in a new chat

Paste this into a new chat (replace N):

> Continue the Brand CRM plan in `docs/brand-crm/`. Read `README.md` (decisions
> + working rules), `ARCHITECTURE.md`, `phase-N-*.md`, and the Implementation Log
> of phase N-1. Then implement phase N exactly as specified, tick its tasks, fill
> its Implementation Log, update the README status table and CLIENT-ACCEPTANCE.md,
> and run the tests listed in the phase. Don't commit until I say so.

If a phase was left half-done, its file shows 🟨 and unticked tasks. The
Implementation Log says what was in progress. Run `git status` / `git diff`
to see uncommitted work before continuing.
