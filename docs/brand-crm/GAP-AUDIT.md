# Gap audit: Brand Panel vs client flow (baseline, 2026-10-06)

This is the state of the code **before Phase 1**, checked against the client's
22-section Brand CRM brief. It is kept as the baseline. Don't update it as
phases land; progress is tracked in [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md).

Legend: ✅ present · 🟨 partial · ❌ missing

## The core problem: two complaint systems

| | Warranty Claims (`NCCW-YYYY-######`) | Brand complaints (`SR-####`) |
|---|---|---|
| Source | NCC Customer App → Partner Warranty | Brand Panel → Register Complaint |
| Model | `backend/src/modules/partner-warranty/warrantyClaim.model.js` | `backend/src/modules/service-requests/serviceRequest.model.js` |
| Brand approval | ✅ approve / reject (reason) / request info / notes | ❌ none; it is directly an NCC job |
| SLA, audit, actor timeline | ✅ (`claimSla.js`, `claimTimeline.js`) | ❌ the SR timeline is `{stepLabel, done, timestamp, description}` with no actor |
| Allocation | ✅ right after approval (`claimJob.service.js` → `assignServiceProvider`), warranty-aware filters | 🟨 not dispatched at creation. Picked up only by `autoAssignPendingRequests` when a partner comes online (`serviceRequest.service.js` ~L589) or by manual assignment. **No address, pincode or location captured**, so allocation is location-blind. |
| Brand Panel screen | `WarrantyClaims.jsx` / `WarrantyClaimDetail.jsx` (live via `useWarrantyClaimLive`) | `Requests.jsx` (All Complaints; side panel only, no live refresh) |
| Counted in Dashboard, Reports, Customers | ❌ (until approved and an NCCJ SR exists) | ✅ (`brandInsights.service.js` aggregates `ServiceRequest` only) |

Also: customer B2C bookings that carry a brand create `ServiceRequest { brand }`
(`booking.service.js` ~L232), so they appear in the brand's All Complaints too.

The Brand Panel pages call real APIs; no mock data was found. The gaps are in
the models and enforcement.

## Section by section

| § | Requirement | State | What exists | What is missing |
|---|---|---|---|---|
| 1 | Central ticket system | 🟨 | IDs (NCCW/NCCJ/SR), status, priority (SR), warranty, assigned partner | One master ticket; a `source` field (none on any model); SLA and actor history on brand complaints |
| 2 | NCC App → Brand Panel | 🟨 | Customer + address snapshot, brand, category, product type, issue, model, serial, purchase date, invoice / warranty card / photos, remarks, warranty estimate | **Videos.** `fileUpload.js` allows png, jpeg, webp and pdf only, 10 MB. **Customer's preferred visit time and location.** `claim.visit` is set by the partner. |
| 3 | Brand approval | 🟨 | Approve; reject with mandatory reason (≥ 5 chars); request info, which also serves as a document request; brand notes; optimistic concurrency (409) | Brand **Hold** (admin only today); **Request Customer Contact**; **Employee ID** (no such field); permission check on who may approve |
| 4 | Warranty and policy | 🟨 | `Brand.warrantyMonths` + `warrantyEngine.js` (In/Out); claim `warrantyCheck` estimate In/Out/Unknown; Warranty Verification lookup by serial or phone on `OwnedAppliance` (`brandInsights.lookupBrandWarranty`) | Product/model-level policy; covered/non-covered services; parts and labour coverage; visit charges; conditions; "Verification Required" status; serial registry |
| 5 | CCE system | ❌ | Individual logins (separate `User` docs) | All brand users are `role: 'brand_admin'`; no Registered By / Assigned CCE; **`requirePermission` (`middleware/auth.js`) is used by no brand route** |
| 6 | Customer 360 | 🟨 | `GET /brand/customers`: aggregate of SRs (complaint counts, categories, warranty flag) | Warranty claims excluded; `complaintsList: []` hardcoded empty (`Customers.jsx`); no products, service history or communication history; search filters a fully loaded list in the browser |
| 7 | Brand → Super Admin | 🟨 | Claim approval → NCCJ job, 1:1, idempotent; Super Admin Partner Warranty module | Brand complaints bypass approval; `brandTicketNo` exists but is never generated; billing data absent |
| 8 | Automatic allocation | 🟨 | Warranty jobs: pincode/radius/city, skill, brand authorisation, availability (filters); distance, workload, rating, tier (rank); 60 s offer → next; allocation-failed flag (`assignmentEngine.js`, `claimDispatch.js`) | Brand complaints: no dispatch at creation, no location; allocation stages (Partner Finding / Offered) not shown to the brand |
| 9 | Job status sync | 🟨 | Claim stages Partner Assigned → Visit Scheduled → Technician On Way → Service In Progress → Service Completed → Closed, live | Reached, Diagnosis, Repair, Parts Required and Customer Confirmation are collapsed (`claimDispatch.claimStageForJob`). All Complaints has no live updates. |
| 10 | Spare parts | 🟨 | `PartOrder` (partName, sku, qty, price, orderSource, status Pending → Approved → Ready / Handed Over / Dispatched → Delivered / Rejected, customerApprovalStatus); brand Part Requests page (`/brand/part-orders`) | Received and **Installed** statuses; link to ticket; brand approval step distinct from NCC's; parts section on ticket detail |
| 11 | SLA and escalation | 🟨 | Claim SLA approval / assignment / visit / resolution, per-brand hours (`Brand.warrantySla`), 80 % warning, breach, approval breach → `flags.escalated` | Response SLA; SLA on brand complaints; automatic `Escalation` records. The model is manual-only and has no dueAt, resolution or responsible person. |
| 12 | WhatsApp-ready | ❌ | Outbound WhatsApp notifications (Twilio); outgoing claim webhooks | Inbound intake API; API keys ("API keys not built" in partner-warranty acceptance) |
| 13 | Toll-Free registration | 🟨 | `RegisterComplaint.jsx` 5-step wizard, mobile search | Searches only customers who already raised a request with this brand; **cannot create a new customer**; no source; no address; no approval |
| 14 | Activity timeline | 🟨 | Claim timeline with actor kind and name, time, action, note, visibility | Customer-contacted and call logs; reschedule, parts and escalation events; anything on brand complaints. `CallLog` is SR-linked partner ↔ customer only. |
| 15 | Call rates | 🟨 | `RateCard { brand, category, serviceType, laborRate, partsMarkupPercent }`; used for partner payout (`serviceProviderEarnings.coveredVisitEarnings`) | State and city; any link to brand billing |
| 16 | Brand billing | 🟨 | `Invoice` (customer-facing, manual create); paid/pending/overdue (fixed 30 days) on Dashboard and Payments | Auto billing on completion; calls × rate + parts + GST; brand → NCC payment history |
| 17 | State/city report | ❌ | Reports by category, top providers, sentiment, monthly; date filter; CSV | State → City → calls → rate → amount; filters by state, city, service, product, status |
| 18 | Role and department access | 🟨 | Brand roles CRUD with permission keys (`brandRole.service.js`); Teams with department enum Field Service / QA / Remote Support / Installation | Enforcement; module × action matrix; 9 role templates (only "Brand Admin" seeded, and it has empty permissions when created by Super Admin); Finance / Spare Parts / Warranty departments |
| 19 | Audit log | 🟨 | `AuditLog` with entity and from/to/reason; written by claims and some Super Admin actions (`shared/auditLog.js`) | **No brand-admin module writes audit entries**; no brand-facing audit page; `AuditLog` has no `brand` field |
| 20 | Ticket detail | 🟨 | Brand claim detail: product and issue, documents, info requests, history, customer, service job, internal note | SLA, parts, billing, closure (service report, confirmation, rating); brand complaints have only a side panel |
| 21 | Dashboard | 🟨 | Real aggregates from SR, Invoice and Escalation | Pending Approval, Approved, SLA Breached; source / state / SLA / resolution-time / warranty reports |
| 22 | Multi-brand | ✅ mostly | Brand id taken from the token on every brand route; claim isolation tested; per-brand SLA, coverage, rate cards, roles, catalog | Name-regex joins: parts `Claim.brand` is a string, `OwnedAppliance.brand` is a string; single-number warranty policy |

## Key files (for orientation)

**Backend: tickets and jobs**
- `backend/src/modules/partner-warranty/`
  - `warrantyClaim.model.js`, `claimStatus.js`, `claimTimeline.js`
  - `warrantyClaim.service.js` (customer create, info response, confirm)
  - `brandClaim.service.js` (brand queue and decisions)
  - `adminClaim.service.js` (Super Admin overrides)
  - `claimJob.service.js` (approval → NCCJ job), `claimDispatch.js` (allocation hooks, job → claim sync)
  - `claimSla.js`, `claimSla.service.js`
  - `claimEvents` / `claimWebhooks.service.js`, `domainEvent.model.js`
- `backend/src/modules/service-requests/serviceRequest.*`: NCC job record; brand create branch in `serviceRequest.routes.js` `POST /`
- `backend/src/modules/shared/assignmentEngine.js`: ranking and filters

**Backend: brand panel, auth and supporting models**
- `backend/src/modules/brand-admin/*`: insights (dashboard, reports, customers, part orders, payments), invoices, rate cards, roles, users, teams, escalations, settings
- `backend/src/middleware/auth.js`: `requireAuth`, `requireBrandScope`, `requirePermission`
- `backend/src/modules/auth/user.model.js`, `role.model.js`, `permission.model.js`; `backend/scripts/seed.js` (PERMISSIONS)
- `backend/src/modules/service-provider/partOrder.model.js`, `job.service.js` (`requestSparePart`)
- `backend/src/modules/super-admin/escalation.model.js`, `auditLog.model.js`, `brand.model.js`, `platformSettings.model.js`, `brandAdmin.service.js`

**Frontend**
- `frontend/src/pages/brand-admin/*`; `frontend/src/components/brand-admin/Sidebar.jsx`
- `frontend/src/lib/brandWarrantyApi.js`, `adminWarrantyApi.js`, `partnerWarrantyApi.js`; `frontend/src/hooks/useWarrantyClaimLive.js`
- `frontend/src/pages/super-admin/partner-warranty/*`
