# Brand CRM: client acceptance

The client's 22 Brand Panel / Brand CRM requirements, the phases that deliver
each one, and their status. A row turns ✅ only when the delivering phases' tests
pass. The Evidence column names the test files.

Status legend: ⬜ Not started · 🟨 Partial · ✅ Passing
Baseline (before Phase 1): [GAP-AUDIT.md](GAP-AUDIT.md)

| # | Requirement (client wording, short) | Phases | Status | Evidence |
|---|---|---|---|---|
| 1 | Centralised ticket system: one ticket type for every source, with master ID, source, customer, product, warranty, complaint, status, priority, SLA, assignee and full history | 1, 4, 6 | ✅ | Phase 1: one creator (`createTicket`) for every source; source, NCCW + brand ticket no, priority, SLA, registrant/owner, actor-stamped history (`brandCrmTicket.test.js`). Phase 6 unified queue/actions/search/filters/export verified (`brandCrmApproval.test.js`, 11 checks; browser `brandCrmQueue.spec.js`). |
| 2 | NCC App → Brand Panel: every customer/product/document field arrives automatically (incl. images/videos, preferred visit time and location); no re-entry | 1, 4 | ✅ | Phase 1: app tickets go through `createTicket`; videos allowed (≤ 2, ≤ 50 MB) (`brandCrmTicket` › videos). Phase 4: customer video uploads, preferred visit and confirmed service location reach ticket/partner/NCC views (`brandCrmRegistration.test.js`; browser `partnerWarranty.spec.js` completes acceptance, service and closure). |
| 3 | Brand approval: Pending Approval; Approve / Reject / Hold / Request Info / Request Document / Request Customer Contact; user + employee ID + date/time + remarks; rejection reason mandatory | 6 | ✅ | Coverage/goodwill/rejection/verification rules, pre-approval hold/resume, requested document kinds, CCE contact notification, employee actor and concurrent decision guards (`brandCrmApproval.test.js`; `brandCrmQueue.spec.js`). |
| 4 | Warranty and policy: configurable per brand; Product + Model + Serial + Purchase date → status (In / Verification Required / Out) → policy (covered/non-covered, parts, labour, visit charges, conditions) | 5 | ✅ | Brand-scoped versioned policies, serial registry, all reason codes, calendar expiry, original-version re-evaluation and audited overrides (`brandCrmWarrantyPolicy.test.js`, 17 checks; browser `brandCrmWarrantyPolicy.spec.js` covers editor/versioning/tester/registry/lookup/ticket badges). |
| 5 | CCE system: individual IDs, simultaneous work, auto Registered By / Assigned CCE / time; CCE cannot change pricing, policy, billing, roles or configuration | 2, 4, 9 | ✅ | Phase 2: individual logins with employee ID, CCE role template, CCE refused finance / pricing / users / settings by the server and hidden in the UI (`brandCrmRbac` › what each role can reach; browser `brandCrmRbac.spec.js`). Phase 1: registrant + owner on tickets. Phase 4: five-step registration, server-stamped source/registrant/owner, duplicate and rollback guards (`brandCrmRegistration.test.js`, browser `brandCrmRegistration.spec.js`). Phase 9: individual My Work, contact/callback ownership, actor-stamped activity and permission-scoped communication (`brandCrmCommunication.test.js`; browser `brandCrmCommunication.spec.js`). |
| 6 | Customer 360: search by mobile, no duplicates; details, products, warranty, previous/open complaints, service history, completed jobs, communication | 3 | ✅ | Phase 3: normalized mobile lookup, transactional customer membership, concurrent duplicate protection, editable shared identity, brand-scoped products/warranty estimate/tickets/closed jobs/communication, DB pagination and protected CSV (`brandCrmCustomer360.test.js`, 11 tests; browser `brandCrmCustomer360.spec.js`, 3 scenarios). Phase 5 now evaluates brand policies; Phase 9 adds contacts, reschedules and notification history to Customer 360, with duplicate notification rows suppressed. |
| 7 | Brand → NCC Super Admin: approval auto-creates/updates the NCC ticket, no duplicates, linked Brand Ticket ID ↔ NCC Ticket ID, Super Admin gets full information | 1, 6, 8 | ✅ | Phase 1: brands can no longer create NCC jobs directly; a job exists only after approval; brand ticket no ↔ NCCJ both on the ticket (`brandCrmTicket` › numbering, auto-approval). Phase 8 NCC stage filters, full allocation history and linked replacement jobs verified (`brandCrmJobStage.test.js`, `partnerWarrantyAdmin.test.js`). |
| 8 | Automatic partner allocation by pincode, category, expertise, availability, status, workload, SLA; Approved → Partner Finding → Offered → Accepted → Assigned → Service → Completed, reflected in Brand Panel | 8 | ✅ | Existing eligibility filters plus SLA/priority ranking, offers/declines/timeouts/withdrawals/failure and accepted-partner privacy verified (`brandCrmJobStage.test.js`, `partnerWarrantyAllocation.test.js`, `assignmentEngine.test.js`). |
| 9 | Complete live job status sync: Partner Assigned, Accepted, En Route, Reached, Diagnosis, Repair, Parts Required, Completed, Customer Confirmation, Closed | 8 | ✅ | Detailed stages, receipt/revisit loops, idempotent events/socket updates, confirmation/closure and customer projection verified (`brandCrmJobStage.test.js`, four-app browser `warrantyJourney.spec.js`). |
| 10 | Spare parts: Partner request → NCC/Brand approval → Dispatch → Received → Installed; Brand sees part, number, qty, ticket, technician, approval/dispatch/installation status | 10 | ✅ | Phase 10: separate brand/NCC approvals, policy payer and threshold, customer consent when payable, stock/procurement fulfillment, partner receipt/installation/photo, direct brand/ticket links, scoped queue/export and timestamped ticket history (`brandCrmParts.test.js`, 11 tests; browser `brandCrmParts.spec.js`). Paid-flow, stage, warranty completion and migration checks pass. |
| 11 | SLA and escalation: brand-wise Response / Allocation / First Visit / Resolution; remaining/breached; auto escalation with ticket, reason, priority, responsible, due time, status, resolution | 11 | ✅ | Five independent clocks, pause/resume and priority factors; L1 manager warning, L2 Quality/NCC breach, required resolution, queue countdown and audit coverage (`brandCrmSla.test.js`; scenario 5 in `brandCrmJourney.test.js`; browser `brandCrmEscalation.spec.js`). |
| 12 | WhatsApp backend-ready: Brand → Product → Complaint → Customer → Warranty/Invoice → Problem → Photos → Ticket; auto ID; same ticket in Brand Panel | 17 | ✅ | Authenticated brand/platform keys, scoped catalogue and upload endpoints, shared step validation, atomic idempotent creation through the unified ticket writer, safe tracking and brand queue visibility (`brandCrmIntake.test.js`, 13 checks; HTTP `brandCrmIntake.spec.js`; browser key management `brandCrmIntake.spec.js`; CLI simulator). |
| 13 | Toll-Free: search by mobile; existing → create from profile; new → create customer + complaint; source saved as Toll-Free; same workflow | 3, 4 | ✅ | Phases 3–4: exact mobile lookup, masked platform matches, atomic new customer + ticket, prefilled profile/product selection, Toll-Free source and shared ticket workflow (`brandCrmRegistration.test.js`, 12 tests; browser `brandCrmRegistration.spec.js`, 3 scenarios). |
| 14 | Timeline: created, contacted, CCE activity, approval, partner assigned, partner updates, reschedule, parts, escalation, completion, closure; each with user + date + time + action + remarks | 1, 8, 9, 10, 11 | ✅ | Actor-stamped creation/approval, allocation and every job stage, CCE contact/document/reschedule activity, all PART_* milestones, SLA escalation/resolution, completion and customer-confirmed closure are verified in order (`brandCrmCommunication.test.js`, `brandCrmParts.test.js`, `brandCrmSla.test.js`, scenario 1 in `brandCrmJourney.test.js`; browser `brandCrmJourney.spec.js`). |
| 15 | Call rates: Brand → Service → State → City; applicable rate auto-selected on completion | 12 | ✅ | Phase 12 dated geographic rates and frozen completed-job charges; `brandCrmRates.test.js`, `brandCrmCharges.test.js`, browser `brandCrmRates.spec.js`. |
| 16 | Billing and dues: completed calls × rate + approved parts/other + GST; completed calls, invoice value, pending, paid, overdue, payment history | 13 | ✅ | Phase 13 transactional multi-ticket invoices, frozen charges, paise totals, due-date ageing, receipts, monthly auto-drafts, billing profile and Finance access. `brandCrmBilling.test.js` (16 tests); browser `brandCrmBilling.spec.js`: two closed tickets → ₹708 issued → ₹100 receipt → ₹608 pending. |
| 17 | State/city report: State → City → calls → rate → amount; filters by date, state, city, service, product, status; export | 14 | ✅ | Brand-scoped aggregations, all common filters, city/state hierarchy, exact frozen-rate totals, CSV/XLSX export limits and formula protection (`brandCrmReports.test.js`; browser `brandCrmReports.spec.js`; Phase 19 screenshot `phase-19-10-state-city-report.png`). |
| 18 | Roles and departments: 9 suggested roles; module × action permissions (View / Create / Edit / Approve / Export); CCE blocked from Finance / Pricing / Users / Settings | 2 | ✅ | Phase 2: 9 role templates per brand; 20 modules × actions (view / create / edit / approve / export …) edited as a matrix; enforced on every brand API route (deny by default, router-walk test); departments on users and teams; guard rails (last Super Admin, no self role change); all role/user/team changes audited (`brandCrmRbac.test.js` 21 tests; browser `brandCrmRbac.spec.js`). |
| 19 | Audit log: every important action recorded (created, approved, priority changed, invoice generated…) | 1, 16 | ✅ | Append-only, actor-snapshotted coverage registry for ticket, customer, RBAC, policy, communication, parts, SLA, rates, billing, reports, settings and integrations; scoped UI and protected export (`brandCrmAudit.test.js`, browser `brandCrmAudit.spec.js`, Phase 19 journey audit assertions). |
| 20 | Ticket detail = single source of truth: ticket, customer, product, warranty, complaint, approval, NCC job, parts, activity, billing, closure | 7, 8, 10, 13 | ✅ | Phase 7 sectioned detail, protected/paginated activity, customer/appliance links, document/video viewer, live actions and browser print verified (`brandCrmTicketDetail.test.js`, `brandCrmTicketDetail.spec.js`). Phase 8 live NCC job stages, accepted partner, attempts, report/photos, confirmation, rating and closure verified (`brandCrmJobStage.test.js`, `warrantyJourney.spec.js`). Phase 10 populates linked parts, approvals, fulfillment, receipt/installation and timestamped actor history (`brandCrmParts.test.js`; `brandCrmParts.spec.js`). Phase 13 links the billing line to its invoice and adds frozen invoice details, dues and receipt history (`brandCrmBilling.test.js`, `brandCrmBilling.spec.js`). |
| 21 | Dashboard live KPIs (total, pending approval, approved, assigned, in progress, completed, escalated, SLA breached, billing, pending payment) + reports (source, product, state/city, SLA, resolution time, warranty, billing, partner) | 14, 15 | ✅ | One dashboard snapshot computes all ticket/SLA/billing KPIs with permission trimming, date filters, drill-down URLs and live socket refresh; all eight reports share filters and exports (`brandCrmDashboard.test.js`, `brandCrmReports.test.js`; browser `brandCrmDashboard.spec.js`, `brandCrmReports.spec.js`, Phase 19 screenshots 10–11). |
| 22 | Multi-brand: per-brand products, policy, catalogue, pricing, SLA, users, departments, billing rules; Brand A never sees Brand B's data | 2, 5, 12, 18 | ✅ | Phase 18 removed CRM name joins, stores indexed ObjectId ownership on tenant records, adds a request-context query guard, permission-filtered notification fan-out, isolated socket rooms and a Super Admin readiness checklist. The route registry covers all 154 Brand API operations; foreign ticket/customer and crafted-filter probes, notification isolation, socket isolation, model/index checks and three differently configured seeded brands are verified by `brandCrmIsolation.test.js`, `sockets.test.js` and the intake isolation suite. |

## End-to-end acceptance scenarios (Phase 19)

1. **NCC App.** A customer raises an LG AC claim with a video and a preferred
   slot. LG's Warranty Executive sees it in Pending Approval with warranty
   **In Warranty (Policy: LG AC Standard v1)**. They approve. The NCCJ job is
   created and the nearest LG-authorised AC partner accepts. The Brand Panel
   shows Partner Finding → Offered → Accepted → En Route → Reached →
   Diagnosis → Parts Required. The part is approved by LG and moves through
   Dispatched → Received → Installed. Then Repair → Completed → Customer
   Confirmation → Closed. A billing line is created at the Pune (Maharashtra)
   city rate. NCC Finance issues the monthly invoice, records a payment, and
   the LG Payments page shows it.
2. **Toll-Free, new customer.** A CCE searches a new mobile and gets "not
   found". They create the customer and the complaint (source Toll-Free,
   Registered By = CCE + employee ID). The ticket goes to Pending Approval and
   the Warranty Executive approves. The flow continues as in scenario 1.
3. **WhatsApp simulator.** An intake key creates a ticket with photos. It
   appears in the LG queue with source WhatsApp. A replay with the same
   Idempotency-Key returns the same ticket.
4. **Permissions.** A CCE gets 403 from the rates, billing, users and settings
   APIs and doesn't see those menus. The Warranty Executive can approve; the
   CCE cannot.
5. **SLA.** An approval SLA breach auto-creates an escalation to Brand Manager
   (L1) and then Quality (L2). Resolution requires a note. The audit log shows
   every step.
6. **Isolation.** Every Samsung user request for LG tickets, customers,
   invoices, reports, audit entries and users returns 404 or an empty result.

### Phase 19 sign-off evidence

| Scenario | Result | Automated evidence | Walkthrough evidence |
|---|---|---|---|
| 1. NCC App full lifecycle | ✅ | `brandCrmJourney.test.js` scenario 1; `warrantyJourney.spec.js` | `phase-19-02` through `phase-19-11` |
| 2. Toll-Free new customer | ✅ | `brandCrmJourney.test.js` scenario 2; `brandCrmRegistration.spec.js` | `phase-19-01-cce-registered.png` |
| 3. WhatsApp simulator | ✅ | `brandCrmJourney.test.js` scenario 3; `brandCrmJourney.spec.js` (API) | Queue/source verified over HTTP |
| 4. Permissions | ✅ | `brandCrmJourney.test.js` scenario 4; `brandCrmRbac.test.js` | `phase-19-12-cce-sidebar.png`, `phase-19-13-cce-forbidden.png` |
| 5. SLA escalation | ✅ | `brandCrmJourney.test.js` scenario 5; `brandCrmSla.test.js` | `brandCrmEscalation.spec.js` |
| 6. Multi-brand isolation | ✅ | `brandCrmJourney.test.js` scenario 6; `brandCrmIsolation.test.js` | `phase-19-14-foreign-brand-isolation.png` |

The Phase 19 browser journey uses independent Customer, CCE, Warranty
Executive, Brand Super Admin/Finance, Spare Parts, NCC Super Admin, Partner and
foreign-brand sessions. It proves the same ticket across each application and
records the screenshots above under `docs/brand-crm/screenshots/`.
