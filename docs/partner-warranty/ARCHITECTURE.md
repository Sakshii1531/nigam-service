# Partner Warranty — Architecture

Target design for the B2B2C warranty workflow. Phase files reference sections
here by number (§).

---

## §1 Module layout

```
backend/src/modules/partner-warranty/
  warrantyClaim.model.js        WarrantyClaim (NCCW)
  warrantyGroup.model.js        ElectroCare / BathCare … (customer-facing groups)
  warrantyIssue.model.js        issues per category (optional per-ProductType override)
  claimStatus.js                status enum, transition table, customer labels
  claimTimeline.js              appendEvent() — the single writer of timeline/audit
  warrantyCatalog.service.js    groups → brands → products → issues (public reads + admin CRUD)
  warrantyClaim.service.js      create, customer reads, add documents, respond to info request
  brandClaim.service.js         brand-scoped list/detail/approve/reject/request-info
  adminClaim.service.js         all-brand list/filters/detail + override actions
  claimJob.service.js           approval → Service Job; SR/Job → claim status sync
  claimSla.service.js           deadline computation + sweep
  claimEvents.service.js        domain event outbox + webhook delivery sweep
  *.routes.js / *.validation.js customer, brand, admin, public routers
```

Mounted in `app.js`:

| Mount | Auth | Router |
|---|---|---|
| `/api/v1/partner-warranty` | public reads, customer writes | catalogue + customer claims |
| `/api/v1/brand/warranty-claims` | `brand_admin` (scoped to `req.user.brand`) | brand queue |
| `/api/v1/super-admin/warranty-claims` | `super_admin` | all claims + overrides |
| `/api/v1/super-admin/warranty-catalog` | `super_admin` | groups, issues, brand coverage |
| `/api/v1/brand/warranty-coverage` | `brand_admin` | the brand's own coverage + logo |

---

## §2 Data model

### WarrantyClaim (`humanId` = `NCCW-{YYYY}-{######}`, yearly counter)

```js
{
  humanId,                        // NCCW-2026-000159 (plugin, dynamic year)
  customer:  ObjectId<User>,
  brand:     ObjectId<Brand>,      // routing key — never a free-text name
  group:     ObjectId<WarrantyGroup>,
  category:  ObjectId<Category>,   categoryKey: 'AC',           // the "Product" step; skill key for allocation
  productName: 'Air Conditioner',                                // category name snapshot
  productType: ObjectId<ProductType> | null,                     // optional refinement (Split / Window)
  issue:     ObjectId<WarrantyIssue>, issueName: 'Cooling Issue',
  modelNumber, serialNumber, purchaseDate, remarks,
  warrantyCheck: { status: 'In Warranty'|'Out of Warranty'|'Unknown', months, expiresOn },
  documents: [{ kind: 'invoice'|'warranty_card'|'product_photo'|'additional',
                url, name, uploadedBy: ObjectId<User>, uploadedAt, infoRequestId }],
  address:   { name, house, landmark, city, state, pincode, latitude, longitude },  // snapshot
  status,                         // §3
  statusBeforeHold,               // restored on resume
  rejectionReason,
  infoRequests: [{ _id, message, requestedBy, requestedAt,
                   response, respondedAt, documentIds: [] }],
  serviceRequest: ObjectId<ServiceRequest> | null,   // the Service Job (NCCJ)
  flags: { escalated, escalatedAt, escalationReason,
           allocationFailed, unauthorizedFallback },
  sla: {                          // §7
    brandApprovalDueAt, assignmentDueAt, visitDueAt, resolutionDueAt,
    warnings: [String], breaches: [String]
  },
  timeline: [TimelineEvent],       // §4 — doubles as the per-claim audit trail
  closedAt, cancelledAt
}
indexes: {brand,status,createdAt}, {customer,createdAt}, {status,createdAt},
         {'address.pincode'}, {serialNumber, brand}
```

### TimelineEvent (embedded)

```js
{ at, action: 'CLAIM_SUBMITTED'|'STATUS_CHANGED'|'INFO_REQUESTED'|'DOCUMENT_ADDED'|…,
  fromStatus, toStatus,
  actor: { kind: 'customer'|'brand'|'admin'|'partner'|'system', user, name },
  note,                                        // reason / remarks
  visibility: 'customer'|'brand'|'internal' }  // customer sees 'customer' only
```

### WarrantyGroup

`{ name: 'ElectroCare', slug, tagline, imageUrl, categories: [ObjectId<Category>], sortOrder, isActive }`

**Customer's "Product" step = a Master Catalogue `Category`** (AC, Refrigerator,
Washing Machine…). Many categories have no product types, and the client's
flow picks the appliance, not its sub-type; a brand's `coverage` is therefore a
list of categories. A group shows a brand when `brand.coverage ∩ group.categories ≠ ∅`.

### WarrantyIssue

`{ category: ObjectId<Category>, productType: ObjectId<ProductType> | null, name: 'Cooling Issue', icon, sortOrder, isActive }`
(`productType: null` = a category-level issue, used for product types that have none of their own.)

### Changes to existing models

| Model | Added |
|---|---|
| `Brand` | `logoUrl`, `warrantyEnabled` (bool), `coverage: [ObjectId<Category>]`, `warrantySla: { approvalHours, assignmentHours, visitHours, resolutionHours }`, `webhook: { url, secret, enabled, events: [] }` |
| `ServiceProvider` | `authorizedBrands: [ObjectId<Brand>]`, `servicePincodes: [String]`, `serviceRadiusKm: Number` |
| `ServiceRequest` | `warrantyClaim: ObjectId<WarrantyClaim>`, `requestMode` gains `'B2B2C'`, `pincode` |
| `Job` | nothing new — `type: 'Brand Warranty'` already exists |
| `ID_PREFIXES / ID_SCHEMES` | `SERVICE_JOB: 'NCCJ'` → `{ digits: 6, dateSegment: 'YYYY', separator: '-' }` |
| `AuditLog` | `entityType`, `entityId`, `fromStatus`, `toStatus`, `reason`, type `'Warranty'` |
| new `DomainEvent` | outbox, §8 |

---

## §3 Claim status machine

```
Submitted ──(brand opens)──▶ Brand Review ──▶ Info Requested ──(customer responds)──▶ Brand Review
    │                           │
    │                           ├──▶ Rejected  (reason required)      ──(admin reopen)──▶ Brand Review
    │                           └──▶ Approved ──(auto, same op)──▶ Job Created
    └──(brand approves/rejects directly, without opening first) ─┘

Job Created ──▶ Partner Assigned ──▶ Visit Scheduled ──▶ Technician On Way
            ──▶ Service In Progress ──▶ Service Completed ──▶ Closed

Any non-terminal ──▶ On Hold ──(resume)──▶ statusBeforeHold   (claim-level; the job keeps its own status — Phase 8)
Any non-terminal ──▶ Cancelled                Closed/Cancelled ──(admin reopen)──▶ Brand Review | Job Created
```

Terminal: `Closed`, `Cancelled`, `Rejected` (reopen is an admin override).

**Customer-facing labels** (Track Ticket): Submitted → "Claim Submitted",
Brand Review → "Brand Verification", Info Requested → "Action needed: upload
documents", Approved/Job Created → "Warranty Approved", Partner Assigned,
Visit Scheduled, Technician On Way, Service In Progress, Service Completed,
Closed, Rejected ("Not approved: {reason}"), On Hold ("On hold"), Cancelled.

---

## §4 Timeline = audit trail

`claimTimeline.appendEvent(claim, {...})` is the **only** code that changes
`claim.status`. It validates the transition against §3, pushes a TimelineEvent,
writes an `AuditLog` row (who, what, when, old, new, reason) and enqueues the
domain event (§8) — all before the single `claim.save()`.

---

## §5 Service Job creation (on approval)

```
brand approves claim ──▶ in a transaction:
   ServiceRequest.create({
     humanId: generateHumanId('NCCJ'),     // NCCJ-2026-000842
     user: claim.customer, brand: claim.brand, warrantyClaim: claim._id,
     category: claim.categoryKey, model, serialNo, description: issue + remarks,
     warranty: 'In Warranty', requestMode: 'B2B2C', attachments: document urls,
     zone: address.city, pincode, customerLocation: {lat,lng}, slaDueAt })
   claim.serviceRequest = sr._id ; status Approved → Job Created
after commit ──▶ assignServiceProvider(sr, null)   (existing dispatch, §6 filters)
```

The partner's `Job` (type `Brand Warranty`) is created by the existing
`acceptJob` when the partner accepts, exactly as for every other request.

---

## §6 Allocation for warranty jobs

`rankServiceProviders` gains a `warranty` context `{ brand, pincode }`:

| Criterion | Rule |
|---|---|
| Status / availability | Active + Available (existing) |
| Skill | **hard** — `specs` must contain `categoryKey` (D7) |
| Brand eligibility | **hard** when the brand has ≥1 authorized partner (D6) |
| Service area | **hard** — `servicePincodes` contains pincode, **or** GPS distance ≤ `serviceRadiusKm` (default 25 km), **or** (neither configured) city match |
| Distance | ranking (existing, nearest first) |
| Workload | ranking (existing) |
| Rating / tier | ranking; `tier` adds a bonus (Senior SP > SP > TSP) |

Offer cascade (existing): offer → accept / decline / 60 s timeout → next.
**New:** when the eligible list is exhausted, the request is *not* dropped into
the city-wide open pool; instead `claim.flags.allocationFailed = true`, the
claim gets an internal timeline event, and Super Admin is notified for manual
assignment. When a new eligible partner comes online, `autoAssignPendingRequests`
retries it and clears the flag.

---

## §7 SLA

Deadlines computed from `Brand.warrantySla`, falling back to platform defaults
(approval 24 h, assignment 4 h, visit 48 h, resolution 168 h):

| Stage | Starts | Met when |
|---|---|---|
| Brand approval | Submitted | Approved / Rejected |
| Partner assignment | Job Created | Partner Assigned |
| Visit | Partner Assigned | Technician On Way / In Progress |
| Resolution | Submitted | Service Completed |

A sweep (every 5 min, `server.js`) marks `warning` at 80 % of the window and
`breach` at 100 %, once each, with an internal timeline event, an admin
notification, and (approval stage) escalation. Paused while `On Hold`.

**As built (Phase 9):** hours are **snapshotted** on the claim at submission
(`sla.hours`: brand → PlatformSettings.warrantySla → built-in), so edits never
move existing deadlines. Clocks start/stop inside `appendEvent`
(`applySlaTransition`): approval + resolution start at submission; assignment
(re)starts at Job Created; visit starts at Partner Assigned and is met at
On Way / In Progress or later. The clock pauses while **On Hold or Info
Requested** (waiting on the customer) and every open deadline shifts by the
paused time. A reassignment or reopen restarts the relevant clocks (old flags
cleared; history stays in timeline + audit). `sla.state` ∈ ok / warning /
breached drives the admin list. Brand-approval warning/breach events are
brand-visible and notify the brand; the others are internal.

---

## §8 Domain events + webhooks

`DomainEvent { type, claim, brand, payload, createdAt, deliveries: [{ attempt, status, httpStatus, at }], deliveredAt }`

Types: `CLAIM_CREATED, CLAIM_APPROVED, CLAIM_REJECTED, CLAIM_INFO_REQUESTED,
JOB_CREATED, PARTNER_ASSIGNED, JOB_STARTED, JOB_COMPLETED, CLAIM_CLOSED`.

Written by `appendEvent` (§4). A sweep delivers undelivered events to
`brand.webhook.url` when enabled and subscribed: `POST` JSON, header
`X-NCC-Signature: sha256=HMAC(secret, body)`, `X-NCC-Event`, idempotency key =
event id; retry with backoff (1 m, 5 m, 30 m, 2 h, 12 h), then give up and flag.

---

## §9 Status sync (single choke point)

`claimJob.syncClaimFromJob(serviceRequestId)` is called after
`transitionStatus`, `assignServiceProvider`, `declineAssignment`, `acceptJob`
and job-step changes. It maps (SR status, Job step) → claim status:

| Service Job state | Claim status |
|---|---|
| SR New / Assigned (not accepted) | Job Created |
| SR Engineer Accepted | Partner Assigned |
| SR Visit Scheduled, job step `assigned` | Visit Scheduled |
| job step `ontheway` / `revisit_ontheway` | Technician On Way |
| SR Engineer Reached … Spare Received | Service In Progress |
| SR Repair Completed / Customer Confirmation | Service Completed |
| SR Closed | Closed |
| SR Cancelled | claim stays, `allocationFailed` + admin alert |

Only forward moves are applied (a revisit does not drag the claim backwards
past In Progress). Each applied move emits sockets to `user:{customer}`,
`brand:{brandId}` and `admins`, plus the §10 notification (Phase 10).

**Built in Phase 7:** the sync runs from `transitionStatus` (every SR status
change) and after every partner job step (`simpleTransition`), because "on the
way" to an already-scheduled visit changes no SR status. Visit slot:
`POST /service-provider/warranty-jobs/:jobId/schedule-visit`. Closing: the SR
stops at Customer Confirmation after payment; `POST /partner-warranty/claims/:id/confirm`
(customer) closes job + claim, and `autoCloseCompletedClaims()` (hourly from
server.js) closes them 72 h after completion if nobody confirms. Socket event
`warranty_claim:updated` `{ id, humanId, status, customerStatusLabel, updatedAt }`;
brand-admin sockets join `brand:{brandId}`, super-admins `admins`.

---

## §10 Notifications matrix

| Event | Customer | Brand (own users only) | Partner | Super Admin |
|---|---|---|---|---|
| Claim submitted | ✔ | ✔ | | ✔ |
| Info requested | ✔ (action) | | | |
| Customer responded | | ✔ | | |
| Approved | ✔ | | | ✔ |
| Rejected | ✔ (with reason) | | | ✔ |
| Job offered | | | ✔ (existing) | |
| Partner assigned | ✔ | ✔ | | ✔ |
| Visit scheduled / on the way | ✔ | ✔ | | |
| Service completed | ✔ | ✔ | | ✔ |
| Closed | ✔ | ✔ | | |
| Allocation failed / SLA warning / breach / escalation | | breach only | | ✔ |

Brand notifications target that brand's users (`User.brand = claim.brand`),
never the `Brands` broadcast role.

---

## §11 B2B2C payout

Warranty job payout = brand RateCard (`coveredVisitEarnings`), frozen on the
Job at accept. Earnings summary gets a separate `b2b2c` bucket (Job type
`Brand Warranty` with a linked claim) with totals **by brand and by product
category**. Partners cannot self-request an Invoice payout; Super Admin records
the manual settlement.

---

## §12 Customer data exposure

The customer projection of a claim contains: humanId, brand name/logo,
product, issue, model, serial, purchase date, remarks, own documents, address,
customer-facing status label, customer-visible timeline events, open info
request, and — once assigned — partner first name, photo, rating and visit
slot. It never contains: internal/brand-only events, flags, SLA, allocation
data, payout, or partner phone before assignment.
