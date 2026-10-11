# Brand CRM: architecture

The target design. Phase files reference sections here by number (§).
Decisions D1–D18 are in [README.md §3](README.md#3-decisions).

---

## §1 Module layout

The ticket core stays in `partner-warranty/`, extended in place. New
capabilities go into a new `brand-crm/` module so the brand-admin module does
not keep growing.

```
backend/src/modules/partner-warranty/          (existing, extended)
  warrantyClaim.model.js     + source, brandTicketNo, priority, customerSnapshot,
                               registeredBy, assignedCce, serviceType, preferredVisit,
                               warranty (policy result), coverageDecision, jobStage,
                               closure, contactRequests, billingLine           (§2)
  claimStatus.js             + brand hold; queue buckets                      (§3)
  claimTimeline.js           appendEvent takes an actor snapshot (§5); new actions
  claimDispatch.js           + jobStageFor(sr, job) and jobStage sync          (§4)
  ticketIntake.service.js    NEW: createTicket(input, ctx), the ONLY creator,
                               used by customer app, CCE, manual, intake API   (§2.3)

backend/src/modules/brand-crm/                  (NEW)
  permissions.js             permission catalogue + role templates             (§6)
  brandPermission.middleware.js  requireBrandPermission('tickets:approve')     (§6)
  customer360.service.js / .routes.js                                          (§7)
  warrantyPolicy.model.js / warrantyPolicy.service.js / productSerial.model.js (§8)
  ticketComm.service.js      contact logs, contact requests, reschedule        (§10)
  escalationEngine.js        SLA → Escalation records                          (§9)
  brandRate.model.js / rateResolver.js                                         (§12)
  billingLine.model.js / brandInvoice.model.js / brandPayment.model.js
  billing.service.js / billing.routes.js (brand) / adminBilling.routes.js      (§12)
  brandReports.service.js / .routes.js                                         (§14)
  brandAudit.routes.js                                                         (§13)
  apiKey.model.js / intakeAuth.middleware.js / intake.routes.js                (§11)
  brandTicket.routes.js      brand ticket queue + actions (supersedes
                             /brand/warranty-claims; that path is kept as an alias)
```

Route mounts (`backend/src/app.js`):

| Mount | Auth | Purpose |
|---|---|---|
| `/api/v1/brand/tickets` | brand user + permission | unified queue, create, detail, actions |
| `/api/v1/brand/warranty-claims` | same | **alias** of the above (existing frontend keeps working until Phase 6 switches) |
| `/api/v1/brand/customers` | brand + `customers:*` | Customer 360 (replaces the brandInsights aggregate) |
| `/api/v1/brand/warranty-policies` | brand + `warranty:*` | policy CRUD, serial registry import |
| `/api/v1/brand/rates` | brand + `rates:*` | BrandRate (replaces `/brand/rate-cards`) |
| `/api/v1/brand/billing` | brand + `billing:*` / `payments:view` | lines, invoices, dues, payments |
| `/api/v1/brand/reports` | brand + `reports:*` | all reports + export |
| `/api/v1/brand/audit-logs` | brand + `audit:view` | brand-scoped audit |
| `/api/v1/brand/api-keys` | brand + `integrations:manage` | intake keys |
| `/api/v1/super-admin/brand-billing` | super_admin | generate invoices, record payments, rates `partnerPayout` |
| `/api/v1/intake` | API key | external ticket intake (WhatsApp / CRM) |

---

## §2 The Ticket (`WarrantyClaim`, extended)

### §2.1 New and changed fields

```js
{
  // ── identity ──
  humanId,                          // NCCW-2026-000123 (unchanged, Master Ticket ID)
  brandTicketNo,                    // 'LG-2026-000045'; brand.ticketPrefix + per-brand yearly counter (D3)
  source: 'ncc_app' | 'toll_free' | 'brand_manual' | 'whatsapp' | 'api',   // required, immutable
  sourceRef: { externalId, channelMessageId, callId, apiKey: ObjectId },     // intake idempotency / trace

  // ── who ──
  customer: ObjectId<User>,         // unchanged; always a real customer User (D16)
  customerSnapshot: { name, phone, alternatePhone, email },   // as captured at registration
  registeredBy: ActorSnapshot | null,   // CCE / brand user; null → system (app, whatsapp, api)
  assignedCce:  { ...ActorSnapshot, assignedAt } | null,     // owner on the brand side

  // ── what ──
  brand, group, category, categoryKey, productName, productType,   // unchanged
  serviceType: 'repair' | 'installation' | 'demo' | 'preventive_maintenance' | 'inspection',  // default 'repair'
  issue: ObjectId<WarrantyIssue> | null, issueName,   // issue may be free text for CCE/intake (issue null)
  modelNumber, serialNumber, purchaseDate, remarks,   // unchanged (CCE may leave serial/purchase blank → Verification Required)
  priority: 'Low' | 'Normal' | 'High' | 'Critical',   // default 'Normal'
  preferredVisit: { date: 'YYYY-MM-DD', slot: 'morning'|'afternoon'|'evening'|null, notes },
  documents[].kind: + 'video' | 'service_report' | 'other'   (D17)
  address,                                            // unchanged; required for every source (allocation needs pincode)

  // ── warranty (replaces warrantyCheck; §8) ──
  warranty: {
    status: 'In Warranty' | 'Verification Required' | 'Out of Warranty',
    reasons: [String],              // why, e.g. 'SERIAL_NOT_IN_REGISTRY', 'NO_INVOICE', 'EXPIRED_2025-03-01'
    expiresOn, months,
    policy: { id, name, version, coverage: {...} },   // snapshot of the matched WarrantyPolicy
    verifiedBy: ActorSnapshot | null, verifiedAt, overrideNote,
  },
  coverageDecision: 'warranty' | 'goodwill' | null,   // set on approval (D7)

  // ── NCC job (§4) ──
  serviceRequest,                   // unchanged (NCCJ)
  jobStage, jobStageAt,             // detailed live stage
  allocation: { attempts: [{ serviceRequest, partner, partnerName, offeredAt,
                           outcome, resolvedAt, reason }] },

  // ── workflow extras ──
  contactRequests: [{ _id, reason, requestedBy: ActorSnapshot, requestedAt,
                      status: 'open'|'done'|'failed', outcome, doneBy, doneAt }],
  callbacks: [{ assignedTo, dueAt, remarks, createdBy: ActorSnapshot, notifiedAt, completedAt }],
  pendingReschedule: { date, slot, reason, status: 'pending'|'accepted'|'declined',
                       requestedBy: ActorSnapshot, requestedAt, respondedAt },
  firstCustomerContactAt,
  holdReason, heldBy,
  closure: {
    serviceReport: { summary, workDone, partsUsed: [{ name, partNumber, qty }], photos: [url] },
    customerConfirmedAt, confirmationMethod: 'app'|'otp'|'cce'|'auto',
    rating, feedback, closedAt,
  },
  billingLine: ObjectId<BillingLine> | null,

  // existing: status, statusBeforeHold, rejectionReason, rejectionCode, infoRequests, flags, sla, timeline, visit
}
```

New indexes: `{brand, source, createdAt}`, `{brand, 'customerSnapshot.phone'}`,
`{brand, brandTicketNo}` unique, `{brand, jobStage}`, `{'assignedCce.user', status}`.

### §2.2 `Brand` / `BrandSettings` additions
- `Brand.ticketPrefix` (2–6 uppercase letters/digits). A pre-validate hook derives it from the name (`Samsung` → `SAMS`, `Blue Star` → `BLUES`) and numbers clashes (`SAMS2`). Best-effort unique, not a DB index (as built, Phase 1).
- `Brand.billing: { gstin, legalName, billingAddress, gstPercent, paymentTermsDays: 30 }`.
- `BrandSettings.autoApproveSources: [source]` (D6), `partsApprovalThreshold`,
  `escalationMatrix` (§9), `cceAutoAssign: 'none'|'registrant'|'round_robin'`.

### §2.3 One creator: `ticketIntake.createTicket(input, ctx)`
`ctx = { source, actor: ActorSnapshot|null, apiKey?, idempotencyKey? }`. Steps, in one transaction:
1. Resolve or create the customer by phone (§7).
2. Validate brand coverage (category) and the address pincode.
3. Run the warranty policy (§8) and snapshot it.
4. Generate `brandTicketNo`.
5. Start SLA (§9).
6. `appendEvent(TICKET_CREATED)` with source and registrant.
7. Upsert the customer product into `OwnedAppliance` (§7).
8. Apply the approval routing rule (D6). If auto/one-step approved, call `approveAndCreateJob`.

The existing customer `createClaim` becomes a thin wrapper with `source: 'ncc_app'`.

---

## §3 Ticket status machine

The partner-warranty §3 machine is unchanged, with these additions:
- **Brand Hold:** a brand user with `tickets:approve` may move Submitted /
  Brand Review / Info Requested → **On Hold** with a mandatory reason, and
  resume it. Holding after approval stays NCC-only.
- **Reject** requires `rejectionCode` (`OUT_OF_WARRANTY`, `PHYSICAL_DAMAGE`,
  `NOT_COVERED`, `DUPLICATE`, `INVALID_DOCUMENTS`, `CUSTOMER_UNREACHABLE`,
  `OTHER`) plus a reason text (≥ 5 chars).

Queue buckets (Brand Panel tabs, computed server-side):

| Bucket | Statuses / condition |
|---|---|
| Pending Approval | Submitted, Brand Review |
| Awaiting Customer | Info Requested, or an open contact request |
| On Hold | On Hold |
| Approved / Allocating | Approved, Job Created with `jobStage` ∈ {Partner Finding, Job Offered, Allocation Failed} |
| In Service | Partner Assigned … Service Completed |
| Closed | Closed |
| Rejected / Cancelled | Rejected, Cancelled |
| Escalated (overlay) | `flags.escalated` or an open Escalation |
| SLA Breached (overlay) | `sla.breaches.length > 0` |

---

## §4 Detailed NCC job stage (`jobStage`, D11)

`PARTNER_FINDING · JOB_OFFERED · PARTNER_ASSIGNED (accepted) · VISIT_SCHEDULED ·
EN_ROUTE · REACHED · DIAGNOSIS · PARTS_REQUIRED · REPAIR · COMPLETED ·
CUSTOMER_CONFIRMATION · CLOSED`, plus `ALLOCATION_FAILED` and `CANCELLED`.

Verified Phase 8 mapping, evaluated in order (see the phase log for writer coverage):

| Inputs / condition | Stage |
|---|---|
| Claim Cancelled | CANCELLED |
| SR or claim Closed | CLOSED |
| SR Cancelled while claim remains active | ALLOCATION_FAILED |
| Not accepted, allocation failure flag | ALLOCATION_FAILED |
| Not accepted, provider offered | JOB_OFFERED |
| Not accepted, no provider | PARTNER_FINDING |
| SR Customer Confirmation | CUSTOMER_CONFIRMATION |
| SR Repair Completed; step repaircomplete, revisit_complete, billing, revisit_billing, revisit_payment, revisit_otp, awaitingpayment or completed | COMPLETED |
| Step ontheway or revisit_ontheway | EN_ROUTE |
| Step revisit_scheduled with a part order and no partReceivedAt | PARTS_REQUIRED |
| SR Spare Received or step revisit_arrived | REPAIR |
| SR Spare Required / Spare Ordered; step completed_pending, spare_part_required or revisit_scheduled | PARTS_REQUIRED |
| Step spareapproval, checked parts present | PARTS_REQUIRED |
| Step spareapproval, no checked parts | REPAIR |
| SR Diagnosis Done | DIAGNOSIS |
| SR Engineer Reached or step inspection | REACHED |
| SR Visit Scheduled / Reschedule / Customer NA | VISIT_SCHEDULED |
| Accepted, otherwise | PARTNER_ASSIGNED |

Revisit part-order approval alone does not mean receipt: `partReceivedAt` must
be stamped by Delivered/HandedOver before the detailed stage becomes Repair.
New and replacement jobs retain separate stage timestamps by SR ID.

Every change writes a timeline event `JOB_STAGE_CHANGED` (visibility `brand`),
sets `jobStageAt`, and emits `claim:updated` to `brand:{id}` and `admins`. The
coarse `status` sync (`claimStageForJob`) is unchanged, so the customer app is
unaffected.

---

## §5 Actor snapshot and the single writer

```js
ActorSnapshot = { kind: 'customer'|'brand'|'admin'|'partner'|'system'|'integration',
                  user: ObjectId|null, name, employeeId|null, roles: [String], department|null }
```
- `actorFromReq(req)` builds it from the user document (cached with the permission cache, §6).
- `appendEvent` stores the snapshot on the TimelineEvent and in `AuditLog`
  (`AuditLog` gains `brand`, `actor` (snapshot), `entityType`, `entityId`,
  `action`, `meta`).
- `recordAction(entity, { action, actor, note, meta, audit: true })` is the
  general helper for **non-ticket** entities (rates, invoices, users, roles,
  settings, policies). It writes `AuditLog` with `brand`.

New timeline actions:
- Creation: every source uses the existing `CLAIM_SUBMITTED` (with `meta.source`), so the partner-warranty notifications, domain events and webhooks keep working (as built, Phase 1)
- Tickets: `CCE_ASSIGNED`, `PRIORITY_CHANGED`, `WARRANTY_VERIFIED`, `WARRANTY_OVERRIDDEN`
- Contact: `CONTACT_REQUESTED`, `CUSTOMER_CONTACTED`
- Job: `RESCHEDULE_REQUESTED`, `RESCHEDULED`, `JOB_STAGE_CHANGED`
- Parts: `PART_REQUESTED`, `PART_APPROVED`, `PART_REJECTED`, `PART_DISPATCHED`, `PART_RECEIVED`, `PART_INSTALLED`
- Escalation and SLA: `ESCALATION_RAISED`, `ESCALATION_RESOLVED`, `SLA_WARNING`, `SLA_BREACHED`
- Billing and closure: `CHARGE_CAPTURED`, `INVOICED`, `CUSTOMER_CONFIRMED`, `RATED`

---

## §6 Permissions (D8, D9)

### §6.1 Catalogue
Key format `module:action`. `Permission` gains `scope: 'brand'|'platform'`.
Seeded from `brand-crm/permissions.js`, the one source of truth for keys,
labels and modules, also served to the UI.

| Module | Actions |
|---|---|
| dashboard | view |
| tickets | view, create, edit (notes, documents, reschedule, contact), assign (CCE), priority, approve (approve / reject / hold / request info / request contact), export |
| customers | view, create, edit, export |
| warranty | view, verify (override status), policy_edit |
| parts | view, approve |
| sla | view, edit |
| escalations | view, manage |
| rates | view, edit |
| billing | view, edit (raise / update invoices; added in Phase 2), export |
| payments | view |
| reports | view, export |
| users | view, edit |
| roles | manage |
| teams | edit |
| settings | view, edit |
| audit | view |
| catalog | view, edit |
| operations | view, edit (completion monitor, replacements, reverse logistics, documents) |
| engagement | view, edit (reviews, chat, academy, notifications) |
| integrations | manage (webhooks, API keys) |

### §6.2 Role templates
Created for every brand when the brand is created (and back-filled by a seed
step). The brand can edit them afterwards. ✔ = all actions of the module.

| Module | Super Admin | Manager | CCE | Warranty Exec | Service Ops | Spare Parts | Finance | Quality/Esc. | Viewer |
|---|---|---|---|---|---|---|---|---|---|
| dashboard | ✔ | ✔ | view | view | view | view | view | view | view |
| tickets | ✔ | ✔ | view, create, edit | view, edit, approve | view, edit, assign, priority | view | view | view, edit, priority | view |
| customers | ✔ | ✔ | view, create, edit | view | view | — | view | view | view |
| warranty | ✔ | view, verify | view | ✔ | view | view | — | view | view |
| parts | ✔ | ✔ | view | view | view | ✔ | view | view | view |
| sla / escalations | ✔ | ✔ | view | view | ✔ | view | — | ✔ | view |
| rates | ✔ | view | — | — | — | — | ✔ | — | — |
| billing / payments | ✔ | view | — | — | — | — | ✔ | — | — |
| reports | ✔ | ✔ | — | view | view | view | ✔ | ✔ | view |
| users / roles / teams | ✔ | view | — | — | — | — | — | — | — |
| settings / integrations | ✔ | view | — | — | — | — | — | — | — |
| audit | ✔ | view | — | — | — | — | view | view | — |
| catalog / operations / engagement | ✔ | ✔ | view | view | ✔ | view | — | view | view |

As built (Phase 2): brand keys are disjoint from the platform keys (`users:manage` and `teams:manage` are platform keys, so the brand side uses `users:edit` / `teams:edit`). `Permission.scope` marks brand keys, and a brand role can only hold those.

### §6.3 Enforcement

As built (Phase 2): one deny-by-default table, `brand-crm/brandAccess.js` `BRAND_ROUTE_RULES`, mounted at `/api/v1/brand` ahead of every brand router. Shared routes (reviews, exchange, service requests) use `requireBrandPermission` / `requireBrandPermissionIfBrand` directly.

- `requireBrandPermission(...keys)` runs after `requireAuth, requireBrandScope`.
  It loads the user's effective permissions (union of `assignedRoles`) from a
  60 s in-memory cache keyed by `userId`. The cache is busted on role or user
  change (same process) and by TTL (other processes). A suspended user is
  rejected. The guard also rejects tokens whose brand no longer matches the database user, or whose current role is no longer brand_admin.
- `GET /auth/me` returns `permissions`. The frontend `usePermissions()` gates
  the sidebar, routes (redirect to a 403 page) and buttons.
- Guard rails: you cannot remove the last active Brand Super Admin; you cannot
  edit your own roles; role and user changes are audited.

---

## §7 Customer 360

- **Identity:** the customer `User` (role `customer`) keyed by **phone**
  (normalised to 10 digits, +91 implied). Search is server-side:
  `GET /brand/customers/search?phone=`. It searches **platform-wide** by
  exact phone and returns `{ match: 'platform', customer: { id, name, maskedPhone } }` unless the
  customer is linked through BrandCustomer, a ticket, appliance or legacy job with this brand. That way the
  brand doesn't harvest another brand's customer data, but the CCE can still
  avoid creating a duplicate.
- **Brand relationship:** `BrandCustomer { brand, customer, createdBy }`, unique `{brand, customer}`, records explicit CRM membership even before a first ticket. Creating a customer writes User + relationship transactionally and audits after commit. Tickets, appliances and legacy jobs also establish read access through `isBrandCustomer`. Exact-phone lookup and duplicate POST never grant full profile access or create a relationship.
- **Products:** `OwnedAppliance` gains `brandRef: ObjectId<Brand>`
  (`brand` string kept for display). `createTicket` upserts by
  `(user, brandRef, serialNumber)`, or by `(user, brandRef, category, model)`
  when there is no serial. An indexed `identityKey` trims and lowercases serial,
  category and model values; the unique `{user, brandRef, identityKey}` index
  prevents concurrent duplicates. Ticket upserts fill only missing purchase
  date/invoice fields, and share the ticket transaction on replica sets.
- **Profile** `GET /brand/customers/:id` (brand-scoped):
  - customer details, addresses
  - products with this brand, warranty per product (§8)
  - tickets: open and closed, with status, jobStage and dates
  - completed jobs: partner, closure date, rating
  - communication history: non-internal contact logs from this brand’s tickets plus notifications scoped by both brand and recipient; exclude unscoped legacy notifications, §10
  - totals: tickets, open, completed, average TAT
- **Customer edits:** name, email, alternatePhone and addresses belong to shared platform User identity; allowlist fields and audit diffs. The Brand Panel must explain that edits update the shared profile. Phone remains immutable in brand endpoints.
- **Warranty:** Customer 360 uses the brand policy engine. Missing policy coverage requires verification; NCC AMC/EW cover must not change brand liability.
- **Export:** `GET /brand/customers?format=csv` requires an additional `customers:export` guard in the handler, not just the path-based `customers:view` rule.
- **Duplicate guard:** creating a customer with an existing phone returns 409
  with the existing id.

Phase 4 intake uses a caller-owned transaction for new User + BrandCustomer +
WarrantyClaim + OwnedAppliance and, on explicit approval, the NCC job. Effects
and dispatch run after commit. Staff missing model/serial/purchase date/invoice
requires verification; explicit approval of incomplete proof records goodwill.
Customer intake accepts a preferred date/slot within the next seven days and an
optional visit-address override. The partner offer, tracking and NCC detail
receive preferred scheduling separately from the confirmed visit.

---

## §8 Warranty policy

```js
WarrantyPolicy {
  brand, name, version, isActive,
  appliesTo: { category: ObjectId<Category>|null, productType: ObjectId|null,
               modelPattern: String|null },   // most specific wins: model > productType > category > brand default
  warrantyMonths, partsWarrantyMonths, labourWarrantyMonths,
  coverage: {
    coveredServices: [serviceType], nonCoveredServices: [serviceType],
    partsCovered: Boolean, labourCovered: Boolean,
    visitCharge: { payer: 'brand'|'customer'|'none', amount },
    excludedIssues: [ObjectId<WarrantyIssue>],
    conditions: String,            // free text shown to CCE / warranty exec
  },
  requireInvoice: Boolean, requireSerial: Boolean, requireSerialInRegistry: Boolean,
  effectiveFrom, effectiveTo,
}
ProductSerial { brand, serialNumber, modelNumber, category, manufacturedOn, soldOn, warrantyStartsOn }   // optional registry, CSV import
```

`evaluateWarranty({ brand, category, productType, model, serial, purchaseDate, hasInvoice, issue, serviceType })`
returns `{ status, reasons, expiresOn, months, policy }`:
- **Out of Warranty** when the expiry date has passed, the issue is excluded,
  or the service type is not covered.
- **Verification Required** when the purchase date is missing, a required
  invoice or serial is missing, the serial is not in the registry (when
  required), or no policy matches. The old `Brand.warrantyMonths` remains the
  fallback policy.
- **In Warranty** otherwise.

Re-run on document upload or info response. A Warranty Executive
(`warranty:verify`) can override the status with a note (`WARRANTY_OVERRIDDEN`).

---

## §9 SLA v2 and escalation

Stages, configured per brand (`Brand.warrantySla`) with platform defaults
(`PlatformSettings.warrantySla`):

| Stage | Starts | Stops | Pauses |
|---|---|---|---|
| response | created | first brand action (open / contact / decision, including staff registration) | Info Requested, On Hold |
| approval | created | approve / reject | Info Requested, On Hold |
| allocation (= assignment) | NCC job created | partner accepted | Info Requested, On Hold |
| firstVisit (= visit) | NCC job created | REACHED | Info Requested, On Hold |
| resolution | created | COMPLETED | Info Requested, On Hold |

Deadlines, met timestamps and breach facts are stored in the ticket snapshot.
Per-stage `state: on_track|warning|breached|met` and `remainingMs` are computed
at read time; `started` and `paused` distinguish clocks that have not started
or are frozen. Warning is at 80 %. Stored/API keys remain `assignment` and
`visit` for compatibility; the UI labels them Allocation and First visit.
Priority factors default to Critical 0.5, High 0.75, Normal 1, Low 1.5.
A priority change adjusts the original snapshot and open escalation deadlines
in one transaction, preserving elapsed time and completed-stage facts.

Escalation (`super-admin/escalation.model.js`, extended):
`warrantyClaim` ref (`serviceRequest` becomes optional), `slaStage`,
`level` (1, 2, 3), `reason`, `priority`, `responsible: { role, user }`,
`dueAt`, `status`, `resolution`, `resolvedBy`, `resolvedAt`,
`raisedBy: 'System Auto'|…`.

`BrandSettings.escalationMatrix` stores `warning:{role,level}`,
`breach:{role,level,platform}` and `escalationResponseHours` (default 4).
Role values are this brand's role template keys or custom role IDs.
Defaults are L1 Brand Manager at warning, L2 Quality/Escalation at breach,
with a platform record and NCC notifications at breach.

The sweep saves escalation records, SLA facts, flags and timeline entries in
the same transaction on replica-set deployments, then emits notifications,
audit and domain events after commit. A partial unique `openKey` index
enforces one open record per ticket, stage and scope. Assignment prefers the
assigned CCE's active team lead, otherwise rotates active role users using an
atomic counter. No available user leaves the record visibly Unassigned.

Brand endpoints support scoped filtering, manual raising, reassignment and
resolution with at least ten characters. Resolution records the actor and
history, closes the matching NCC/brand mirror and clears the ticket flag only
after all open records are resolved. NCC's desk uses the same resolution
workflow; its older flag-only de-escalate action refuses to bypass open records.

Configuration is audited through `/brand/settings/sla` and
`/brand/settings/escalation-matrix`, both requiring `sla:edit`.
Before release against existing data, preview and apply
`backend/scripts/backfillWarrantySla.js`. It adds response clocks and corrects
legacy visit outcomes while preserving the existing four deadlines. It does
not reprice or retroactively multiply those deadlines.

---

## §10 Communication

Implemented in Phase 9; see [the phase log](phase-9-communication-timeline.md)
for the verified API contract and provider configuration.

- Contact logs use CUSTOMER_CONTACTED with channel (`phone`, `sms`, `whatsapp`,
  `email`, `in_person`), direction, outcome, duration, callback time and optional
  contact request ID. Actor snapshots retain employee ID and role names.
- Contact requests close as done/failed after an explicit contact log. Contact
  stamps firstCustomerContactAt and response met, preserving all other clocks.
- Ticket callbacks are assigned to the contact logger. A minute sweep creates
  deduplicated reminders; successful contact completes already-due callbacks.
- My Work lists assigned tickets/contact requests, today's callbacks in India
  time, and tickets registered by the user awaiting information.
- Reschedule before acceptance updates preferredVisit. After acceptance, a
  pending proposal moves the SR to Reschedule and notifies partner/NCC. The
  existing partner respond-reschedule endpoint applies the slot on acceptance;
  rejection retains the previous confirmed slot and alerts NCC. Travel waits
  for the response. Request/response changes use the transaction helper.
- Click-to-call uses the existing Twilio client, a brand_user CallLog and a
  frozen actor. Signed terminal callbacks record one contact. Without configured
  Voice/public API origin, the endpoint returns the manual-logging fallback.
- CCE attachments re-evaluate pre-approval warranty against the saved policy;
  approved snapshots remain frozen.
- CUSTOMER_NOTIFIED records each accepted notification/channel once, through
  an atomic append that does not invalidate a concurrent business decision.
  Customer 360 combines these events without duplicate legacy inbox entries.

---

### Connected spare parts (Phase 10)

PartOrder links directly to WarrantyClaim, ServiceRequest and Brand ObjectId.
Brand and NCC decisions are independent; the brand desk approves cost and the
NCC desk fulfills stock/dispatch. Brand-paid line totals at or above the brand's
partsApprovalThreshold require brand approval (zero = all requests). Original
parts coverage/goodwill determines payer; customer-paid warranty parts require
explicit customer consent. Brand approvals never imply NCC approval.

PART_* events share the ticket timeline/audit writer and emit
PART_STATUS_CHANGED with part metadata. Actual receipt releases the revisit;
installation cannot reset an active visit, and repair completion waits for
installation. Brand ticket detail reads directly linked PartOrders. Billing
will consume these payer/approval snapshots in the later billing phase.

See [Phase 10](phase-10-spare-parts.md) for endpoint contracts, migration and
verification evidence.

## §11 Intake API (D15)

- `ApiKey { brand|null (platform key), name, prefix, hash (sha256), scopes: ['tickets:create','tickets:read','catalog:read','uploads:create'], lastUsedAt, revokedAt, createdBy }`.
  Keys also store `allowedSources` (WhatsApp/API), `rateLimit` (default 60/minute), and a throttled `lastUsedAt`. The secret is shown once.
- Header `Authorization: Bearer ncc_live_<prefix>_<secret>`.
  `Idempotency-Key` is required on POST `/tickets` and stored as `sourceRef.externalId`
  per key. A replay returns the same ticket.
- Endpoints:
  - `GET /intake/brands` (platform key: warranty-enabled brands)
  - `GET /intake/brands/:id/catalog` (categories, product types, issues)
  - `POST /intake/uploads` (multipart → url)
  - `POST /intake/tickets`: customer `{name, phone, …}`, product, issue (id or text), address, documents, preferredVisit, `source: 'whatsapp'|'api'`
  - `GET /intake/tickets/:ticketNo` (status, customer label, jobStage public subset)
- Rate limit per key. Every call is audited as an `integration` actor.
- The WhatsApp flow contract (Brand → Product → Complaint → Customer →
  Warranty/Invoice → Problem → Photos → Ticket) is documented in
  `INTAKE-API.md` with a step → endpoint table.

Implementation details and examples: [INTAKE-API.md](INTAKE-API.md).
`IntakeRequest` reserves a unique key ID + external ID and stores a canonical
body hash and committed response. A partial unique ticket source index is a
second guard. On replica-set MongoDB, identity/linkage, ticket/appliance and
response persist atomically; post-commit notifications use the existing effect
pipeline. Rate windows are persisted per key; local upload URLs are recorded
per integration. Tracking exposes only public status fields. Brand keys read
tickets created by that brand's keys, while platform keys read only their own.
API and WhatsApp always wait for approval (D6).

---

## §12 Rates and billing (D12–D14)

```js
BrandRate {
  brand, category: ObjectId<Category>, categoryKey, serviceType,
  state: String|null, city: String|null,          // null = applies to all
  brandRate: Number,                               // ₹ per completed call, ex-GST (brand-visible)
  partnerPayout: Number|null,                      // super-admin only (D13)
  visitOnlyRate: Number|null,                      // Q5
  effectiveFrom, effectiveTo, isActive,
}
unique: {brand, category, serviceType, state, city, effectiveFrom}
```
`resolveRate(brand, category, serviceType, state, city, at)` returns the
city match, else the state match, else the national match. If none is
found → `RATE_MISSING`: the line is created with rate 0 and flagged, and
Finance is notified.

```js
BillingLine {
  brand, ticket, serviceJob, ticketNo, jobNo, state, city, categoryKey, serviceType,
  coverageDecision, completedAt, closedAt,
  rate: { id, amount, matchedOn: 'city'|'state'|'national'|'missing' },
  parts: [{ partOrder, name, partNumber, qty, amount }],     // brand-approved, brand-payable parts
  otherCharges: [{ label, amount, addedBy }],               // NCC finance adjustments, audited
  subtotal, gstPercent, gstAmount, total,
  status: 'pending_closure'|'billable'|'invoiced'|'void', invoice, voidReason,
}
BrandInvoice {
  humanId: 'BINV-YYYY-######', brand, periodFrom, periodTo, lines: [ObjectId],
  callCount, subtotal, gstAmount, total, paidAmount, amountPaid, balance, // callCount/balance derived; amountPaid alias
  issuedAt, dueDate, status: 'draft'|'issued'|'partially_paid'|'paid'|'overdue'|'cancelled',
  lineSnapshots, billingProfile, issuer, activePeriodKey, createdBy, // printable HTML served on demand
}
BrandPayment { brand, invoice, amount, mode: 'neft'|'rtgs'|'bank_transfer'|'upi'|'cheque'|'cash'|'other', reference, receivedAt, recordedBy, note }
```
- **Overdue** = `issued|partially_paid` with `dueDate < now`, computed on
  read and also by a daily sweep that sets the status.
- **Brand Panel totals:**
  - total completed calls
  - invoice value
  - paid
  - pending
  - overdue
  - unbilled (billable lines not yet invoiced)
  - payment history

---

## §13 Audit

`AuditLog` gains `brand`, `actor` (snapshot), `action` (normalised
`entity.verb`, e.g. `ticket.approved`, `rate.updated`), `meta` (diff
`{field: [old, new]}`). Retention: forever, append-only.

`GET /brand/audit-logs?entityType&action&user&from&to&q` returns brand-scoped
entries only, with export.

---

## §14 Reports

All reports are brand-scoped and accept the common filters
`from, to, state, city, categoryKey, productType, serviceType, status, source`.
Each has `?format=csv|xlsx` export.

| Report | Rows |
|---|---|
| state-city-billing | State → City → calls → applicable rate(s) → amount (+ GST, total) |
| source | source → tickets, approved %, avg approval time |
| product | category / product type → tickets, warranty split, repeat-complaint % |
| sla | stage → met / warning / breached counts, breach % |
| resolution-time | avg / median / p90 created → completed, by category / city |
| warranty | In / Verification Required / Out, coverage decisions, rejection codes |
| billing | invoices, paid, pending, overdue, ageing buckets (0–30, 31–60, 61–90, 90+) |
| partner-performance | partner → jobs, completion %, avg TAT, SLA breach %, rating (partner name only; no payout) |

---

## §15 Events, notifications, realtime

- **Domain events** (outbox, existing `DomainEvent` + webhooks):
  - Existing CLAIM_* events are kept.
  - New: `TICKET_CREATED` (with source), `JOB_STAGE_CHANGED`,
    `PART_STATUS_CHANGED`, `SLA_BREACHED`, `ESCALATION_RAISED`,
    `ESCALATION_RESOLVED`, `INVOICE_ISSUED`, `PAYMENT_RECORDED`.
- **Notifications:**
  - CCE: assigned ticket, contact request.
  - Warranty Exec: new pending approval.
  - Responsible role: escalation.
  - Finance: invoice due / overdue, rate missing.
  - Spare Parts: part approval needed.
- **Realtime:**
  - Existing room `brand:{id}` and `admins`.
  - `claim:updated` carries `{status, jobStage, sla, flags}` so lists patch in
    place.
  - New `brand:billing_updated`, `brand:escalation_updated`.

---

## §16 As-built reconciliation (Phase 19)

The Phase 19 journey suites verified this document against the running HTTP and
browser applications. The implemented structure matches §§1–15, with these
intentional compatibility details:

- The master record and public wording are **Ticket**, while the persisted model
  and legacy-compatible API alias remain `WarrantyClaim` and
  `/brand/warranty-claims` as required by D2.
- Ticket creation emits the existing `CLAIM_CREATED` domain event with the
  intake source in its payload. It does not emit a second `TICKET_CREATED`
  event, which avoids duplicate webhook processing for existing clients.
- Customer confirmation records `CUSTOMER_CONFIRMED` on the visible timeline
  with `toStatus: Closed`; the outbox emits `CLAIM_CLOSED`. This keeps the actor
  action precise while preserving the established webhook contract.
- `/brand-admin/requests` remains a compatibility route to the CCE registration
  wizard. The operational queue is `/brand-admin/warranty-claims` / **All
  Tickets**, backed by the unified ticket endpoints.
- Finance mutations remain NCC-controlled. Brand Finance users see invoices,
  dues, payments, rate results and reports; Super Admin Finance drafts/issues
  invoices and records receipts.

No unresolved implementation deviation changes tenant isolation, billing
arithmetic, SLA behavior or the single-ticket workflow.
