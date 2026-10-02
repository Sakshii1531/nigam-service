# Partner Warranty (B2B2C) — Implementation Plan

This folder is the plan **and** the progress record for turning the customer
app's Partner Warranty screens into a complete **B2B2C Warranty + After-Sales
Service workflow**. It is updated at the end of every phase — open a phase file
to see exactly what was built, where, and how it was verified.

| File | What it is |
|---|---|
| [README.md](README.md) | This page — goal, audit summary, decisions, phase index + status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Target data model, status machine, APIs, sync rules, events |
| [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md) | The client's 20 requirements mapped to phases, with pass/fail status |
| [WEBHOOKS.md](WEBHOOKS.md) | For brand CRM developers: events, payload, signature verification, retries |
| `phase-N-*.md` | One file per phase: scope, tasks, examples, acceptance, and an **Implementation Log** filled in when the phase is done |

---

## 1. The goal in one picture

```
Customer App ── submit claim ──▶ NCC Backend ── WarrantyClaim NCCW-2026-000159
                                     │   (Super Admin sees every claim, all brands)
                                     ▼
                         routed by claim.brand (ObjectId)
                                     ▼
                           LG Brand Panel queue
                  Approve │ Reject (reason) │ Request more info ◀─▶ customer uploads
                          ▼
            automatic Service Job  NCCJ-2026-000842  (ServiceRequest, linked 1:1)
                          ▼
           NCC Service Network — eligibility filter + ranking
   (pincode/radius · distance · skill · brand authorization · availability · load · tier)
                          ▼
          offer → accept ✔ / reject ✘ / 60 s timeout ⏱ → next partner
          (all exhausted → "Allocation Failed" → Super Admin manual assign)
                          ▼
       Partner executes: On Way → In Progress → Completed → Closed
                          ▼
   every change → claim status + timeline → Customer / Brand / Super Admin (socket + notification)
                          ▼
          domain events (CLAIM_CREATED … CLAIM_CLOSED) → outbox → brand CRM webhooks
```

**Two separate entities, linked:** `WarrantyClaim` (NCCW, owned by the brand
decision) and the Service Job (`ServiceRequest` + `Job`, NCCJ, owned by the
service network). The claim is the customer's and brand's view; the job is the
network's execution record.

---

## 2. Audit summary (as of 2026-09-29, before Phase 1)

| Area | Found |
|---|---|
| Customer funnel | Screens only. Categories, brands, products and issues hardcoded; upload buttons inert; ticket ID generated in the browser (`'NCCW-2024-' + random`) — nothing is sent to the backend. Track/Detail pages show a fixed May-2024 timeline. |
| Warranty claim entity | Does not exist. The existing `Claim` model is a **spare-part reimbursement** claim (amount, free-text brand) and is not reused for this. |
| Brand panel | `/brand-admin/warranty-claims` shows parts claims; Approve/Reject deliberately do nothing; page is not in the sidebar. |
| Super Admin | No warranty-claims module. "NCC Shield (Warranty)" is the parts-claim list. |
| Dispatch | **Reusable**: offer → accept / decline / 60 s timeout → next, a 15 s restart-safe sweep, auto-assign when a partner comes online. **Missing**: brand authorization, pincode/service area, strict skill, tier; exhaustion leaves the job unnoticed in an open pool. |
| IDs | `generateHumanId` already supports `NCCW-{current year}-######`; unused. No NCCJ scheme. |
| Notifications | `brand.warranty_claim` is broadcast to **every** brand (cross-brand leak). |
| Audit / SLA / webhooks | AuditLog has no entity/old/new/reason; one `slaDueAt` field, no breach checks; no outgoing webhooks. |
| Payout | Invoice bucket lumps Brand Warranty + EW + AMC; no brand/product breakdown; partners can self-request invoice payouts. |
| Bug | Parts claims from Brand Warranty jobs are saved with brand label `"Brand Warranty Claim"`, so the brand panel's name lookup never shows them. |

---

## 3. Decisions (defaults chosen — change any before its phase starts)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Clean slate** — app not live | No migration of old parts claims; old Partner Warranty mock data is deleted from the frontend. |
| D2 | **New `partner-warranty` backend module** | `WarrantyClaim` is a new collection. The parts-reimbursement `Claim` stays as-is (renamed "Parts Claims" in UIs). |
| D3 | **Service Job = `ServiceRequest` + `Job`** | No third job entity. A warranty job's `ServiceRequest.humanId` is `NCCJ-YYYY-######` instead of `SR-####`, so every existing screen, dispatch path and partner flow keeps working. |
| D4 | **Customer catalogue comes from partner brands (`Brand`) + Master Catalogue categories/product types** | Warranty groups (ElectroCare, BathCare…) are admin-managed; each brand declares which product types it covers; issues are admin-managed per product type. Nothing hardcoded in the app. |
| D5 | **Claim status machine enforced server-side** | Illegal moves return 400; every move writes a timeline event (who, from, to, reason, visibility). |
| D6 | **Brand-authorized partners** | A partner can hold `authorizedBrands`. If a brand has **at least one** authorized partner, only those are eligible for its jobs; if it has none, skill-qualified partners are used and the claim is flagged `unauthorizedFallback` for the admin. |
| D7 | **Skill is a hard filter for warranty jobs** | A partner without the product's category in `specs` is never offered a warranty job. |
| D8 | **Brand approval SLA breach escalates; it never auto-approves** | Super Admin can approve/reject on the brand's behalf (recorded as such). |
| D9 | **Warranty jobs are free to the customer** | Partner payout = brand RateCard (existing `coveredVisitEarnings`); settled **manually** via Invoice payout. |
| D10 | **Customer sees a filtered view** | Customer API projects only customer-visible timeline events and fields; no internal notes, brand remarks marked internal, partner payout, or allocation data. |
| D11 | **CRM integration via transactional outbox** | Events are written in the same operation as the state change, delivered later by a sweep with HMAC signature and retry. |
| D12 | **Plan lives in repo markdown**, one phase at a time, tests per phase | Same workflow as `docs/master-catalogue/`. |

---

## 4. Phase index

Backend first (the client asked for backend/database/API before screens),
then the four frontends, then end-to-end verification.

| # | Phase | Layer | Status |
|---|---|---|---|
| 1 | [Groundwork: data model, IDs, status machine, bug fixes](phase-1-data-model.md) | Backend | ✅ Done |
| 2 | [Warranty catalogue: groups, brand coverage, issues](phase-2-warranty-catalogue.md) | Backend | ✅ Done |
| 3 | [Claim submission + customer APIs](phase-3-claim-submission.md) | Backend | ✅ Done |
| 4 | [Brand review: approve / reject / request info](phase-4-brand-review.md) | Backend | ✅ Done |
| 5 | [Approval → automatic Service Job](phase-5-job-creation.md) | Backend | ✅ Done |
| 6 | [Warranty-aware partner allocation](phase-6-allocation.md) | Backend | ✅ Done |
| 7 | [Status sync + tracking + realtime](phase-7-status-sync.md) | Backend | ✅ Done |
| 8 | [Super Admin control APIs](phase-8-admin-control.md) | Backend | ✅ Done |
| 9 | [SLA engine](phase-9-sla.md) | Backend | ✅ Done |
| 10 | [Notifications matrix + domain events + webhooks](phase-10-events-webhooks.md) | Backend | ✅ Done |
| 11 | [B2B2C payout (manual, product-wise)](phase-11-payout.md) | Backend | ✅ Done |
| 12 | [Customer app wiring](phase-12-customer-app.md) | Frontend | ✅ Done |
| 13 | [Brand panel: Warranty Claims](phase-13-brand-panel.md) | Frontend | ✅ Done |
| 14 | [Super Admin: Partner Warranty module](phase-14-super-admin.md) | Frontend | ✅ Done |
| 15 | [Partner app: warranty jobs + B2B2C payout](phase-15-partner-app.md) | Frontend | ✅ Done |
| 16 | [End-to-end verification + acceptance](phase-16-e2e-acceptance.md) | All | ✅ Done (commit pending go-ahead) |

Status legend: ⬜ Not started · 🟨 In progress · ✅ Done

## 5. Working rules for every phase

1. Tick the phase's tasks and fill its **Implementation Log** (files, decisions, test output) in the same change.
2. Update this table and [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md).
3. If the design moves, update [ARCHITECTURE.md](ARCHITECTURE.md).
4. Backend phases ship with Jest tests (`backend/tests/partnerWarranty*.test.js`) against the local test DB — never the Atlas DB in `backend/.env`.
5. The full backend suite must stay green at the end of each phase.
