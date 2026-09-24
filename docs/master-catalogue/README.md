# Master Service & Offering Catalogue — Implementation Plan

This folder is the plan **and** the progress record for rebuilding NCC's service
catalogue, pricing and partner payout around a single **Master Service & Offering
Catalogue**. It is updated at the end of every phase — open the phase file to see
exactly what was built, where, and how it was verified.

| File | What it is |
|---|---|
| [README.md](README.md) | This page — goal, decisions, phase index + status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Target data model, pricing formula, APIs, old → new mapping |
| [CLIENT-ACCEPTANCE.md](CLIENT-ACCEPTANCE.md) | The client's 12 test cases + all 28 requirements, mapped to phases, with pass/fail status |
| `phase-N-*.md` | One file per phase: scope, tasks, examples, acceptance, and an **Implementation Log** filled in when the phase is done |

---

## 1. The goal in one picture

```
PRODUCT-LINKED                                   STANDALONE
Category → Product Type → Variant → Service      Category → Service → Option (optional)
  AC     →  Split AC    → 1.5 Ton → Installation   Electrical → Fan Installation
                   \                                     /
                    \                                   /
                     ▼                                 ▼
               ┌──────────────────────────────────────────┐
               │            SERVICE OFFERING              │  ← the only bookable thing
               │  code: AC-SPLIT-15T-INSTALL              │
               │  rate: customer ₹1,499 · partner ₹900    │  ← versioned, audited
               │  unit, min/max qty, express, GST, ...    │
               └──────────────────────────────────────────┘
                                  │
                                  ▼
                    Pricing Engine (backend only)
             base · discount · express · GST · final · payout
                                  │
                   ┌──────────────┼──────────────────┐
                   ▼              ▼                  ▼
             Customer App   Booking snapshot   Partner App / Reports
          (renders quote)   (frozen forever)   (payout, NCC margin)
```

**One booking engine + one master catalogue + many service types.** No price,
payout or service list is hardcoded in any frontend.

---

## 2. Decisions already made

| # | Decision | Consequence |
|---|---|---|
| D1 | **Clean slate** — the app is not live | Existing bookings/jobs/catalog test data are wiped. No backward-compatibility layer for old bookings. Old pricing sources are deleted, not migrated. |
| D2 | **GST is added on top** | Customer sees `₹1,499` as the service price and `₹1,499 + ₹269.82 GST = ₹1,768.82` at checkout. Every screen shows the same breakdown. |
| D3 | **Seed with the client's example rates** | Offerings from the client brief are seeded with their stated price/payout. Offerings without a stated rate are seeded with clearly-marked **DEMO** rates for the admin to replace. |
| D4 | **Plan lives in repo markdown** | This folder. Each phase file gets an Implementation Log when done. |
| D5 | Offering = exact combination | Price is never `service price + product addon`. Every bookable combination is its own offering with its own price and payout. |
| D6 | Partner payout is a **fixed amount per offering** | The global `serviceProviderCommissionPercent` (30%) is removed from paid-booking earnings. |
| D7 | Price/payout live in an **append-only, versioned rate table** | Gives audit history, effective dates, catalogue version on bookings, and future city/pincode overrides from one mechanism. |
| D8 | Money is computed in **paise (integers)** inside the engine | No floating-point drift; API returns rupees with 2 decimals. |

## 3. Working assumptions (confirm or correct — each is cheap to change now, expensive later)

| # | Assumption | Default we build | Affects phase |
|---|---|---|---|
| A1 | Coupon discount is absorbed by NCC | Discount lowers customer price; **partner payout unchanged** | 2 |
| A2 | Wallet coins are a payment method, not a discount | Coins reduce *amount payable* after GST; GST is on the pre-coin amount | 2, 4 |
| A3 | "Instant / ASAP" booking **is** Express | Express fee applies to ASAP bookings. If an offering has express disabled, ASAP is not offered for it | 2, 4 |
| A4 | Express fee is **per booking**, not per unit | 2 fans express = 2 × ₹299 + 1 × ₹99 | 2 |
| A5 | Warranty / AMC / Extended-Warranty covered visits | Customer pays ₹0, **partner still earns the offering's fixed payout**. Brand RateCard stays for billing brands, not for partner pay | 5 |
| A6 | On-site extra work | Partner adds it by picking **catalogue offerings** (priced + payout from catalogue). Spare parts stay free-form and earn the partner ₹0 (current rule) | 5 |
| A7 | Offering code | Auto-suggested from names (`AC-SPLIT-15T-INSTALL`), editable until first save, **immutable after** | 1, 3 |
| A8 | Services are scoped to a category | "Installation" under AC and "Installation" under TV are separate service rows | 1 |
| A9 | Price change with a future effective date | Allowed. A booking is priced at the rate active **when the booking is created**, not on the visit date | 1, 2 |
| A10 | Partner sees customer amount | Only the amount to collect on site (pay-after-service) and the booking total. Never the margin | 5 |

---

## 4. Phases

Each phase ends with the app in a working, testable state. Phases 1–3 are
additive (nothing existing breaks). Phase 4 is the cut-over.

| Phase | Name | Delivers | Client tests closed | Est. | Status |
|---|---|---|---|---|---|
| 1 | [Catalogue data model + seed](phase-1-data-model.md) | New models, rate versioning, wipe + seed scripts | — (foundation) | 4–5 d | ✅ Done 2026-09-24 |
| 2 | [Pricing engine + Quote & Browse APIs](phase-2-pricing-engine.md) | One backend calculator, `/catalog/quote`, offering tree API, location-override seam | 1, 2, 3, 4, 9 (API level) | 5–6 d | ✅ Done 2026-09-24 |
| 3 | [Super Admin — Master Catalogue module](phase-3-admin-catalogue.md) | Full CRUD, rate changes with reason + history, activate/deactivate | 8 (admin side) | 7–9 d | ✅ Done 2026-09-24 |
| 4 | [Booking engine cut-over + customer booking flow](phase-4-booking-cutover.md) | Offering-based `createBooking`, full snapshot, BookingFlow/Payment/Success driven by quote | 5, 6, 7, 10, 11, 12 | 8–10 d | ✅ Done 2026-09-24 |
| 5 | [Fixed payout engine + Service Partner app](phase-5-payout-partner-app.md) | Payout from snapshot, on-site add-ons from catalogue, partner screens | 8, 9 (payout side) | 5–6 d | ✅ Done 2026-09-24 |
| 6 | [Discovery — search + all entry points](phase-6-discovery-entry-points.md) | Offering search, home/service pages/dashboards routed into offerings, URL-price path removed | 10 (every entry point) | 5–6 d | ⬜ Not started |
| 7 | [NCC margin reporting + legacy cleanup + acceptance suite](phase-7-reporting-cleanup.md) | Margin report, old models/code deleted, 12-test automated suite | all, re-verified | 5–6 d | ⬜ Not started |

**Total: ~39–48 developer-days** (≈ 8–10 weeks for one full-stack developer).

Status legend: ⬜ Not started · 🟨 In progress · ✅ Done · ⏸ Blocked

### Dependency order

```
Phase 1 ──► Phase 2 ──┬──► Phase 3 (admin)   ─┐
                      └──► Phase 4 (cut-over) ─┼──► Phase 5 (payout) ──► Phase 6 ──► Phase 7
                                               │
            (Phase 3 and 4 can run in parallel with two developers)
```

---

## 5. How to check a phase

1. Open the phase file → **Status** at the top.
2. **Tasks** — every checkbox is ticked when done, with the file it landed in.
3. **Worked examples** — the exact request/response or screen behaviour to try yourself.
4. **Acceptance** — the commands/tests that prove it; results pasted in the log.
5. **Implementation Log** (bottom) — date, commits, what changed vs the plan and why, known gaps.

## 6. Glossary

| Term | Meaning |
|---|---|
| **Category** | Top-level group shown to customers: AC, TV, Electrical, Cleaning, RO… |
| **Product Type** | An appliance kind inside a category: Split AC, Window AC, LED TV |
| **Variant** | Size / capacity / configuration: 1.5 Ton, 55–65 inch, 1001–2000 L. Belongs to a Product Type (product-linked) or to a Service (standalone option) |
| **Service** | The work: Installation, Repair, Fan Installation, Water Tank Cleaning |
| **Service Offering** | The exact bookable job = (product type?, variant?, service). Has a unique code |
| **Rate** | One version of an offering's commercial numbers: customer price, partner payout, express fee, express incentive, GST override, effective dates |
| **Quote** | The engine's calculated breakdown for a selection; what every customer screen renders |
| **Commercial snapshot** | The frozen quote saved on a booking at creation time |
| **SP / Partner** | Service Partner = technician (same entity at NCC) |
