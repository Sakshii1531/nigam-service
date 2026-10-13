# Brand Panel client requirements review — 13 October 2026

## Follow-up fixes

All four findings below have been addressed in a follow-up implementation.
The original findings are retained as the record of what was reviewed.

| Finding | Resolution |
|---|---|
| F1: placeholder controls | Real completion/replacement CSV exports with report-export permission and audit; persisted Re-QC escalations with escalation-management permission; snapshotted documents with actual HTML download and browser Print / Save PDF |
| F2: completion monitoring | Recorded completion timestamps, India-day filters, database search and full aggregate KPIs, pagination, correct partner names, socket refresh and periodic resync |
| F3: missed invoice runs | Automatic catch-up of every due unbilled month, idempotent drafting, retry after failure and deduplicated NCC Finance alerts |
| F4: source approval invariant | Automatic approval restricted to Toll-Free/Manual in schema and runtime; NCC App/WhatsApp/API always await approval, including legacy injected settings |

Validation: seven targeted backend suites / 142 tests passed, including the
six client journeys and new operations/recovery/approval regressions. Lint and
frontend production build passed. The operations and unified-queue browser
checks both passed (**2 tests**). Operations/RBAC were rerun after final
permission wiring (**26 tests**, included in the 142-test total). See the
follow-up log in `phase-19-e2e-acceptance.md` for verification details.

The five business defaults still require client confirmation. No deployment or
client sign-off is claimed by these fixes.

## Original review verdict

The main Brand CRM workflow is implemented and connected in the current source.
The panel is substantially aligned with the client's 22 requirements, but should
not be described as completely accepted: some visible operations remain
placeholders, completion monitoring can misreport data, automatic monthly
invoicing has a recovery gap, and five business decisions still await client
confirmation.

This is an independent review of the supplied client brief, implementation,
acceptance tests and local browser behavior. It is not client sign-off or a
verification of the deployed environment. No application behavior was changed.

## Connected flow

NCC App / CCE / Toll-Free / Manual / WhatsApp intake API → shared
`createTicket` writer → master NCCW ID and brand ticket number → verification
and approval → linked NCCJ service request → automatic partner offers and
acceptance → travel / diagnosis / repair / parts → completion → customer
confirmation and closure → brand billing line → NCC Finance invoice and receipt
→ Brand Panel dues, dashboard and reports.

Important operational details:

- WhatsApp is backend-ready through authenticated intake endpoints; a production
  chatbot is outside this implementation, consistent with the brief.
- Rates are frozen at completion. Billing lines become billable at closure.
  Monthly automation creates drafts; NCC Finance issues invoices and records
  receipts. Brand Finance views the results.
- Authorized staff can use Register & Approve for staff intake. Configured
  auto-approval also exists. These shortcuts should be explicitly accepted if
  the client expects a separate human approval for every complaint.
- The operational ticket detail page has the connected customer, warranty, job,
  parts, activity, billing and closure information. The older completion and
  document screens have separate issues listed below.

## Findings

### F1 — Medium: visible operations report success without performing work

`frontend/src/pages/brand-admin/ServiceCompletionMonitor.jsx:124` shows
“Completion report exported!” without producing a file; line 204 shows a Re-QC
success message without persisting a request.

`frontend/src/pages/brand-admin/LetterDocumentCenter.jsx:89` and line 90 only
display print/download messages. The row actions at lines 252–253 do the same.
`ReplacementApprovals.jsx:121` also has a message-only export button.

Impact: users believe an operational action occurred when nothing was exported,
printed or submitted. This prevents describing the entire existing panel as
fully functional. These are separate from the working unified ticket CSV export
and ticket-summary print action.

Recommendation: implement the operation and show success after completion, or
remove/disable the control with truthful wording until supported.

### F2 — Medium: completion monitor has incorrect filtering and incomplete totals

In `ServiceCompletionMonitor.jsx`:

- Line 72 returns the normal search result for “Completed Today”; it never
  compares completion dates.
- Line 25 labels `updatedAt` as the completion time; later edits can change it.
- Line 24 stores the partner as `serviceProvider`, while lines 159 and 195 read
  `provider`, leaving the partner blank.
- Lines 50–64 fetch only once, so this screen does not refresh with live job
  updates.
- Line 54 requests the default page and discards pagination metadata. The backend
  `listBrandCompletions` uses pagination, with a default limit of 20. The KPIs at
  lines 82–86 therefore describe the loaded page rather than all completed jobs;
  older rows have no pagination control.

Impact: operational users can see wrong daily results, a blank assigned partner,
stale status and understated totals as volumes grow. This affects the client's
fully interconnected/scalable panel objective and completion visibility.

Recommendation: use the actual completion timestamp, server-side date filters
and aggregate totals, retain pagination, fix the field name, and subscribe to
ticket/job updates.

### F3 — Medium: monthly invoice drafting has no missed-run recovery

`backend/src/modules/brand-crm/billing.service.js:458` returns unless today is
the configured UTC drafting day. Lines 459–467 select only the previous month's
closed billable lines. If the service is unavailable for that drafting day,
restarting the next day does not catch up. On the next scheduled month the
missed period is outside the selection window. On-demand NCC Finance drafting
remains available.

Impact: a missed scheduler day can leave completed/closed calls unbilled until
someone notices and drafts the missed period manually. This is a resilience gap
in the automatic billing step, rather than a billing arithmetic error.

Recommendation: track completed billing periods and idempotently catch up all
due undrafted periods, with visible failure alerts.

### F4 — Low: approval source invariant is not enforced consistently

`ticketIntake.service.js:264` excludes WhatsApp/API from automatic approval but
does not exclude NCC App. `brandSettings.model.js:24` allows `ncc_app` in
`autoApproveSources`. If that value is set by a seed, script or direct database
update, an in-warranty NCC App complaint can bypass human Pending Approval.
The ordinary settings update API currently does not expose this field, and its
default is an empty array, so this is a latent configuration edge case.

Impact: this contradicts both the brief's NCC App Pending Approval flow and
README decision D6, which says NCC App always waits for approval.

Recommendation: allow automatic approval only for Toll-Free and Manual sources
in both the schema and the decision function; retain an NCC App regression test.

## Requirement-by-requirement assessment

“Implemented” below means source paths and existing test coverage were traced;
it does not imply production verification or client approval.

| Client section | Assessment | Evidence / qualification |
|---|---|---|
| 1. Central tickets | Implemented | Shared ticket writer, source, IDs, SLA, ownership and history; unified queue |
| 2. App integration | Implemented, configuration edge | App uses shared writer and carries product/documents/visit details; F4 |
| 3. Approval | Implemented | Permission-guarded approve/reject/hold/info/doc/contact actions; browser queue check |
| 4. Warranty policy | Implemented | Brand policies, serial registry, evaluator, coverage and overrides |
| 5. Individual CCEs | Implemented | Individual users, employee snapshots, assigned CCE and server permissions |
| 6. Customer 360 | Implemented | Normalized mobile lookup, brand membership, product/ticket/service/communication views |
| 7. NCC connection | Implemented | Approval creates linked service job; no separate manual job registration |
| 8. Automatic allocation | Implemented | Eligibility by skill, area, availability/status; authorization, workload and SLA-aware ranking |
| 9. Status sync | Implemented core; older screen partial | Detailed claim/job sync and sockets; completion monitor issues in F2 |
| 10. Parts | Implemented; approval rule pending confirmation | Linked requests, separate approvals, dispatch/receipt/install; Q4 |
| 11. SLA/escalation | Implemented | Brand clocks, warning/breach sweep, responsibility and resolution records |
| 12. WhatsApp readiness | Implemented | API keys, catalogue/uploads, idempotent intake; actual bot deferred as requested |
| 13. Toll-Free registration | Implemented | Search existing customer or create customer and ticket, source/CCE stamped |
| 14. Timeline | Implemented | Actor-stamped intake, decisions, communication, job, parts and escalation events |
| 15. Call rates | Implemented; rate ownership pending confirmation | Geographic resolver and frozen job charges; Q2 |
| 16. Billing/dues | Implemented with recovery gap | Automatic lines, invoices, GST, receipts and ageing; F3 and Q3/Q5 |
| 17. Reports/export | Implemented core | Filtered state/city and other reports with CSV/XLSX; older auxiliary exports in F1 |
| 18. Roles/departments | Implemented | Nine templates, action permissions, server guard and frontend access gates |
| 19. Audit | Implemented | Actor snapshots, mutation coverage, scoped audit views and exports |
| 20. Ticket detail | Implemented | Connected ticket/customer/product/warranty/approval/job/parts/activity/billing/closure sections |
| 21. Dashboard | Implemented core | Actual ticket, SLA and billing aggregates; completion monitor is separate, F2 |
| 22. Multi-brand | Implemented | ObjectId tenant ownership, route guards, scoped reports/notifications and isolation tests |

## Business decisions still awaiting the client

The repository itself lists these as unanswered defaults, not agreed requirements:

1. Customer-paid B2C bookings remain outside the Brand Panel.
2. Both permitted brand staff and NCC Super Admin can edit call rates.
3. Monthly invoice auto-drafting plus on-demand NCC Finance drafting.
4. Brand approval for brand-paid parts at/above a threshold; NCC approval also
   handles fulfillment. The implementation includes goodwill-paid parts.
5. Customer-unavailable visits use a configured visit-only rate; otherwise no
   charge is generated.

See `README.md` decisions D5–D7/D14 and questions Q1–Q5. These do not make the
core implementation invalid, but they prevent unconditional client sign-off.

## Validation performed

- Reviewed the supplied client brief, `CLIENT-ACCEPTANCE.md`, architecture and
  Phase 19 claims against implementation paths and test assertions.
- Local Playwright `brandCrmQueue.spec.js`: **1 passed**. Covers source filters,
  hold/resume, document request, customer visibility, goodwill approval,
  rejection, socket-driven queue update, CSV download and legacy-route redirect.
- Backend: **24 selected suites / 308 tests passed across the main and recovery
  runs**, including all six `brandCrmJourney.test.js` scenarios. Selection:
  `brandCrm|brandEscalation|partnerWarrantyAllocation|assignmentEngine`.
  The transaction-capable main run passed 22 suites / 269 tests; MongoDB hit
  its macOS open-file limit and interrupted Foundation Fixes and Isolation.
  After restarting the isolated replica set with a higher file limit, those
  two suites passed all 39 tests. This is aggregate coverage from split runs,
  not a claim that one uninterrupted run passed. The final main/recovery
  commands used `--testTimeout=60000 --forceExit`.
- Initial sandbox/database setup attempts timed out; a standalone database
  attempt also failed transaction-dependent checks. Those attempts are not
  counted as application regressions or passing verification.
- `git diff --check` passed. Only this report was added; no existing application
  source or historical acceptance evidence was edited.
- Local test databases are isolated from application data. Billing mutations
  require a MongoDB replica set; standalone MongoDB deliberately returns 503.
- The full repository backend/API/browser suites were not rerun. No complete
  browser walkthrough of every role/screen or production
  environment audit was performed. The Phase 19 browser journey itself uses HTTP
  calls for many partner/parts/finance transitions and reloads some pages, so
  its existence alone does not prove every corresponding UI control or live
  transition works.

## Acceptance recommendation

Accept the implemented central workflow subject to successful current journey
checks. Keep full-panel client acceptance open until F1–F3 are addressed, F4 is
guarded, and the client confirms the business defaults. Historical aggregate
test counts and checked boxes in Phase 19 should not substitute for current
verification or the client's approval.
