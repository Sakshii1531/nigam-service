# Phase 16: Audit log coverage + brand audit page

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §19 · **Depends on:** Phases 1–13

## Goal
Every important action is recorded (who, employee ID, what, when, old → new,
reason), and authorised brand users can search the brand's audit log. Nothing
important changes without a record.

## Context: read first
- ARCHITECTURE §5, §13.
- `super-admin/auditLog.model.js` (Phase 1 added `brand`, `actor`, `meta`); `shared/auditLog.js` (`logAudit`, `recordAction`).
- Modules still without audit at baseline: **all of `brand-admin/`** (catalog, academy, documents, replacement approvals, returns, settings, chat, escalations, teams…).
- Super Admin audit page (`/super-admin/audit-logs`).

## Tasks

### Coverage
- [x] Build an **audit coverage matrix**: list every mutating brand route (from the Phase 2 route→permission table) and every Super Admin action on brand data. Mark each as audited ✅ / added in this phase / intentionally not audited (with a reason, e.g. a chat message body). Put the matrix in the Implementation Log.
- [x] Add `recordAction` to every unaudited mutating brand route. Entity types:
  - ticket, customer, policy, serial_import, rate, billing_line, invoice, payment
  - escalation, user, role, team, settings, webhook, api_key
  - catalog_item, document, replacement, return, academy_item
- [x] Normalised action names `entity.verb` (e.g. `ticket.priority_changed`, `invoice.generated`, `role.permissions_changed`). Ticket timeline actions map to audit actions (one table in code).
- [x] Field diffs in `meta.changes` for updates (`{ field: [old, new] }`; secrets and passwords are never logged, only `"changed"`).
- [x] Login and security events for brand users: login success/failure, password change, role change effective, suspended (`auth.*`).
- [x] An Express middleware safety net (`auditMutations`) on `/api/v1/brand/*`: if a mutating request succeeds (2xx) and the handler wrote no audit row in that request (tracked via `res.locals.audited`), log a generic `http.mutation` row with method, path and the actor. It also warns in the test environment, so missing coverage shows up in tests.

### API and UI
- [x] `GET /api/v1/brand/audit-logs?entityType&entityId&action&userId&from&to&q&page` (`audit:view`) returns the brand-scoped entries (`brand = req.user.brand`) only, with actor snapshots and diffs. `?format=csv` export (`audit:view`; audited as `audit.exported`).
- [x] Ticket detail Activity: a "Show audit entries" toggle for `audit:view` users (adds non-timeline audit rows, e.g. field diffs).
- [x] New `pages/brand-admin/AuditLog.jsx` (`/brand-admin/audit-log`, under Administration in the sidebar):
  - filter bar
  - table (time, user + employee ID + role, action, entity link, old → new, reason)
  - expandable diff
  - export
- [x] Super Admin audit page: add brand + actor columns and a brand filter.

### Tests
- [x] `backend/tests/brandCrmAudit.test.js`:
  - one representative action per entity type writes the exact action name, actor employeeId and diff
  - passwords and secrets never appear in `meta`
  - the safety net catches an unaudited route (a temporary test route)
  - brand-scoped read: LG never sees Samsung rows
  - CCE 403
  - export writes `audit.exported`
- [x] `e2e/ui/brandCrmAudit.spec.js`: a manager changes priority → the audit page shows it with the old/new value and employee ID.

## Acceptance
- The coverage matrix has no unexplained gaps.
- The client's examples (CCE created ticket, Warranty Executive approved, Manager changed priority, Finance generated invoice) all appear with user, employee ID and time.

## Implementation Log
- Added a brand-scoped audit API with validated entity, action, actor, date, literal text and pagination filters. Reads and streamed CSV export require `audit:view`; export records `audit.exported`, escapes formulas and quotes, and stops on disconnect. Added brand/time and brand/entity indexes.
- Added the Audit log page under Administration with URL-backed filters, paging, actor snapshots, employee IDs, entity links, expandable field diffs and CSV download. Ticket Activity has a permission-gated audit table, including field diffs and non-timeline audit entries. Super Admin's log viewer now supports brand filtering and shows the brand and actor snapshot.
- Added explicit request adapters for legacy unaudited handlers. Each adapter names an entity/action and compares persisted before/after data; response bodies and credential values are not copied into audit metadata. Existing domain writers remain responsible for ticket, billing, rate, policy, customer, role, user and team workflows.
- Added request-local audit tracking with AsyncLocalStorage. The safety net awaits a generic `http.mutation` record before a successful JSON response only when no writer ran; it warns in tests. Failed requests and read-only previews/dry runs do not create generic mutation rows. Existing transaction-backed financial operations retain audit writes in the same transaction.
- Added one complete timeline-to-audit action table (`ticketAuditActions.js`). Timeline names remain unchanged for notifications and webhooks; audit mirrors use normalized `ticket.verb` names and retain `meta.timelineAction`, visibility and field diffs. Added priority, CCE assignment, warranty verification, policy, invoice/payment and billing-line diffs. Existing normalized non-ticket action names and entity model identifiers remain compatible; API entity aliases accept user-facing names.
- Added brand security events for password failures, OTP failures, completed login, password changes, effective role changes and suspension. Password success alone does not mean login success: success is recorded only after OTP verification and session issuance. Unknown-account failures are platform-only, without an identifier or guessed tenant. Credential changes are represented by `changed`.
- AuditLog schema redaction protects nested metadata for both shared helpers and direct model writers. Explicit platform-only `brand: null` rows stay platform-only, including partner payout changes. Brand audit search/export excludes internal ticket events. Historic WarrantyClaim audit mirrors without a visibility marker remain in the platform audit; historic brand-visible events remain available in ticket Activity. No visibility is guessed for legacy rows and no production backfill runs automatically.
- Legacy request adapters append after a successful domain write, before returning 2xx; they do not retrofit transactions into existing legacy services. An audit-storage failure returns an error, but a previously committed legacy write may already have taken effect. Native transactional billing/rate writes retain their stronger rollback guarantees.
- [Verified audit page screenshot](screenshots/phase-16-audit-log.png).

### Brand route coverage matrix

Generated from the Phase 2 `BRAND_ROUTE_RULES` table and checked for unexplained gaps in the audit test. “Existing” means a native domain writer; “Added” means an explicit Phase 16 adapter. Serial/rate import dry runs are intentionally read-only; applied imports record counts and domain changes.

| Method | Route under `/api/v1/brand` | Coverage | Writer / reason |
|---|---|---|---|
| POST | `/api-keys` | ✅ Native (Phase 17) | api_key.created; safe field diff, no secret |
| PATCH | `/api-keys/:id` | ✅ Native (Phase 17) | api_key.updated |
| POST | `/api-keys/:id/revoke` | ✅ Native (Phase 17) | api_key.revoked |
| POST | `/tickets/:id/contacts` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/call` | ✅ Added | ticket.call_started |
| POST | `/tickets/:id/reschedule` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/documents` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/warranty-policies` | ✅ Existing | Policy service recordAction; serial import counts only |
| PUT | `/warranty-policies/:id` | ✅ Existing | Policy service recordAction; serial import counts only |
| DELETE | `/warranty-policies/:id` | ✅ Existing | Policy service recordAction; serial import counts only |
| POST | `/warranty-policies/test` | Read-only | Input evaluation; no persisted mutation |
| POST | `/warranty-policies/serials/import` | ✅ Existing | Policy service recordAction; serial import counts only |
| POST | `/tickets/:id/warranty/override` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| PATCH | `/tickets/:id/product` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/approve` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/reject` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/hold` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/resume` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/request-info` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/request-contact` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/priority` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/notes` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/confirm-on-behalf` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/preview-warranty` | Read-only | Input evaluation; no persisted mutation |
| POST | `/tickets` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/tickets/:id/assign-cce` | ✅ Existing | Ticket single writer (timeline → normalized audit) |
| POST | `/warranty-claims/:id/approve` | ✅ Existing | Legacy ticket aliases use the same single writer |
| POST | `/warranty-claims/:id/reject` | ✅ Existing | Legacy ticket aliases use the same single writer |
| POST | `/warranty-claims/:id/request-info` | ✅ Existing | Legacy ticket aliases use the same single writer |
| POST | `/warranty-claims/:id/notes` | ✅ Existing | Legacy ticket aliases use the same single writer |
| POST | `/customers` | ✅ Existing | Customer service recordAction |
| PATCH | `/customers/:id` | ✅ Existing | Customer service recordAction |
| POST | `/customers/:id/addresses` | ✅ Existing | Customer service recordAction |
| POST | `/actions/notify-customer` | ✅ Added | customer.notified |
| PUT | `/warranty-coverage` | ✅ Added | settings.coverage_changed |
| POST | `/parts/:id/approve` | ✅ Existing | Part decisions mirror into the ticket audit |
| POST | `/parts/:id/reject` | ✅ Existing | Part decisions mirror into the ticket audit |
| PATCH | `/part-orders/:id` | ✅ Added | part.updated |
| POST | `/escalations` | ✅ Added | escalation.created |
| PATCH | `/escalations/:id` | ✅ Added | escalation.updated |
| POST | `/escalations/:id/resolve` | ✅ Added | escalation.resolved |
| PATCH | `/escalations/:id/status` | ✅ Added | escalation.status_changed |
| POST | `/rates` | ✅ Existing | Rate transaction audit |
| POST | `/rates/import` | ✅ Existing | Rate transaction audit |
| POST | `/rates/:id/deactivate` | ✅ Existing | Rate transaction audit |
| PATCH | `/rates/:id` | ✅ Existing | Rate transaction audit |
| PUT | `/billing/billing-profile` | ✅ Existing | Billing profile recordAction |
| POST | `/actions/amc/:id/renewal-reminder` | ✅ Added | subscription.renewal_reminded |
| POST | `/actions/amc/:id/visits` | ✅ Added | subscription.visit_scheduled |
| POST | `/replacement-approvals` | ✅ Added | replacement.created |
| PATCH | `/replacement-approvals/:id/status` | ✅ Added | replacement.status_changed |
| POST | `/returns` | ✅ Added | return.created |
| PATCH | `/returns/:id` | ✅ Added | return.updated |
| POST | `/documents` | ✅ Added | document.generated |
| POST | `/catalog/master-services` | ✅ Added | catalog_item.created |
| PUT | `/catalog/master-services/:id` | ✅ Added | catalog_item.updated |
| DELETE | `/catalog/master-services/:id` | ✅ Added | catalog_item.deleted |
| POST | `/catalog/sub-brands` | ✅ Added | catalog_item.created |
| PUT | `/catalog/sub-brands/:id` | ✅ Added | catalog_item.updated |
| DELETE | `/catalog/sub-brands/:id` | ✅ Added | catalog_item.deleted |
| POST | `/catalog/sub-brands/:id/products` | ✅ Added | catalog_item.created |
| PUT | `/catalog/products/:id` | ✅ Added | catalog_item.updated |
| DELETE | `/catalog/products/:id` | ✅ Added | catalog_item.deleted |
| POST | `/academy/guides` | ✅ Added | academy_item.created |
| DELETE | `/academy/guides/:id` | ✅ Added | academy_item.deleted |
| POST | `/academy/courses` | ✅ Added | academy_item.created |
| PUT | `/academy/courses/:id` | ✅ Added | academy_item.updated |
| DELETE | `/academy/courses/:id` | ✅ Added | academy_item.deleted |
| POST | `/roles` | ✅ Existing | Role service recordAction |
| PUT | `/roles/:id` | ✅ Existing | Role service recordAction |
| DELETE | `/roles/:id` | ✅ Existing | Role service recordAction |
| POST | `/users` | ✅ Existing | User service recordAction + auth events |
| PUT | `/users/:id` | ✅ Existing | User service recordAction + auth events |
| POST | `/teams` | ✅ Existing | Team service recordAction |
| PUT | `/teams/:id` | ✅ Existing | Team service recordAction |
| DELETE | `/teams/:id` | ✅ Existing | Team service recordAction |
| POST | `/teams/:id/members` | ✅ Existing | Team service recordAction |
| DELETE | `/teams/:id/members/:userId` | ✅ Existing | Team service recordAction |
| PUT | `/settings/sla` | ✅ Existing | SLA settings recordAction |
| PUT | `/settings/escalation-matrix` | ✅ Existing | Matrix recordAction |
| PUT | `/settings` | ✅ Added | settings.updated |
| PUT | `/warranty-webhook` | ✅ Added | webhook.updated |
| POST | `/warranty-webhook/test` | ✅ Added | webhook.tested |

### Super Admin actions on brand data

| Method | Route under `/api/v1/super-admin` | Phase 16 audit adapter |
|---|---|---|
| POST | `/brands` | `brand.created` |
| PUT | `/brands/:id` | `brand.updated` |
| DELETE | `/brands/:id` | `brand.deleted` |
| POST | `/brand-admins` | `user.created` |
| PUT | `/brand-admins/:id` | `user.updated` |
| PATCH | `/users/:id/status` | `user.status_changed` |
| DELETE | `/users/:id` | `user.deleted` |
| PATCH | `/brand-admins/:id/temporary-password` | `auth.password_reset` |
| PUT | `/warranty-catalog/brands/:id` | `settings.coverage_changed` |
| PATCH | `/part-orders/:id` | `part.updated` |
| POST | `/escalations` | `escalation.created` |
| PATCH | `/escalations/:id/assign` | `escalation.assign_changed` |
| PATCH | `/escalations/:id/status` | `escalation.status_changed` |
| PATCH | `/escalations/:id/priority` | `escalation.priority_changed` |

| Mutating route family | Existing writer / scope |
|---|---|
| `/warranty-claims/:id/*` (approve/reject/info/notes/assignment/reassignment/replacement/hold/resume/status/reopen/cancel/SLA reset) | Ticket single writer; normalized action + snapshot. Internal actions remain platform-only in audit search. |
| `/brand-rates` POST, PATCH `/:id`, POST `/import`, POST `/:id/deactivate` | Rate transaction audit; import summary. Partner payout changes use explicit platform-only rows. |
| `/brand-billing/invoices` POST, POST `/:id/issue`, `/:id/cancel`, `/:id/payments` | Transactional invoice/payment audit with actor and diffs. |
| `/brand-billing/billing-profile` PUT; `/brand-billing/brands/:id/terms` PUT | Billing identity/terms transaction audit and diff. |
| `/brand-billing/lines/:id/charges` POST; `/billing-lines/:id/charges` POST | Transactional billing-line charge audit and diff. |
| `/warranty-webhooks/deliveries/:id/retry` POST | `webhook.retried`, owning brand and actor snapshot. |
| `/warranty-catalog/groups`, `/warranty-catalog/issues`, `/warranty-catalog/service-providers/:id` | Existing platform catalog/eligibility audits enriched with actor snapshots. These are shared definitions or multi-brand partner eligibility, not one tenant's records. |
| `/warranty-registrations/:id/verification` PATCH | Existing consumer extended-warranty verification audit; consumer plan purchases have no CRM tenant owner and remain platform-only. |
| `/b2b2c-payouts/*`, partner earnings/settlement | Existing platform finance audits; partner payouts remain outside brand audit. |
| `/catalogue/*`, shared plans/settings/CMS/commerce | Platform-owned shared data, not brand CRM tenant records; existing platform audit behavior retained. |

### Intentional exclusions and boundaries

- POST warranty previews/policy tests and serial/rate import dry runs evaluate input without changing business data. Default settings/template materialization on GET is idempotent initialization, not a staff edit.
- `/chat/*` message send/read/delivery lifecycle and `/notifications/*` read/preferences are shared personal communication surfaces outside `/brand/*`. Message bodies are intentionally excluded from the business audit; their native message/notification records retain delivery and read state. Ticket contacts and customer notification actions are audited without copying message bodies.
- Auth address/payment-method CRUD belongs to the signed-in person's account, outside brand CRM data. Session refresh/OTP issuance are operational authentication state; completed/failed sign-in and credential changes are the audited security decisions.
- Phase 17 adds native API-key create/update/revoke audits (and list events), with secret values excluded. Platform-key management stays platform-owned; intake creation/replay events are scoped to the ticket brand when known. New `/brand/*` writes remain deny-by-default for permissions and have the audit safety net.
- Stored historic free-text platform actions are not rewritten. Newly normalized ticket audits can be searched by their normalized action; earlier timeline names stay available in ticket Activity.

### Validation

- All **80 backend suites / 1,122 tests** passed using disposable replica-set databases, combining the full run with final focused reruns. The first run exposed an audit-matrix parameter-name mismatch and an old assertion filtering by unnormalized action text; both were corrected and rechecked. Final focused coverage: six suites / 78 tests, plus the seven-test warranty-job suite and ten audit acceptance cases.
- **19 Brand CRM browser scenarios** passed. A sequential six-scenario cross-portal run (audit, brand, partner app, customer, Super Admin, full warranty journey) passed. The partner scheduling scenario initially failed during a parallel shared-fixture run, then passed in isolation and in the sequential full cross-portal group; no application change was needed for that test race.
- The audit browser scenario verifies manager priority changes, expanded old/new values, employee ID, ticket audit details, CSV download, CCE rejection and Super Admin brand filtering. The full-page screenshot was visually inspected.
- **5/5 Brand Admin API smoke tests** passed. Frontend production build passed with the existing large-bundle warning. Backend lint has zero errors / eight existing warnings; frontend lint has zero errors / 153 existing warnings. `git diff --check` passed.
- Final audit acceptance rerun: **10/10 passed**, including suspended-account verification failure; final audit browser rerun passed after preserving the Super Admin type filter.
- Validation used disposable local databases. No production migration or automatic historic audit rewrite runs. Phase 17 remains unstarted.
