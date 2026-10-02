# Phase 4 — Brand review: approve / reject / request info

**Status:** ✅ Done (2026-09-29) · **Layer:** Backend · **Delivers:** #5, #6, #7, #17

## Goal
Each brand works its own queue and makes the warranty decision.

## Tasks
- [x] `GET /brand/warranty-claims?status=&q=&from=&to=&category=&pincode=` — only `brand = req.user.brand`; paginated; counts per status for tabs
- [x] `GET /brand/warranty-claims/:id` — full detail incl. documents, info requests, brand-visible timeline, linked job summary (partner name, status) once it exists; first open moves Submitted → Brand Review
- [x] `POST /brand/warranty-claims/:id/approve` `{ remarks? }` → Approved (Phase 5 hooks job creation here)
- [x] `POST /brand/warranty-claims/:id/reject` `{ reason }` — reason **required** (min 5 chars) → Rejected, `rejectionReason` set, customer notified with reason
- [x] `POST /brand/warranty-claims/:id/request-info` `{ message }` → Info Requested, customer notified (action CTA to the claim)
- [x] Brand-internal note: `POST /brand/warranty-claims/:id/notes` `{ note }` (visibility `brand`, never shown to customer)
- [x] Cross-brand access → 404 (not 403, to avoid confirming existence)
- [x] Concurrency: optimistic concurrency on `WarrantyClaim` + `saveClaim()` → 409, so double-clicks / two brand users can't both decide
- [x] Tests `partnerWarrantyBrand.test.js`

## Examples
```
POST /brand/warranty-claims/{id}/reject {}            → 400 "reason is required"
POST /brand/warranty-claims/{id}/reject { reason:'Physical damage not covered' } → Rejected
Samsung admin GET /brand/warranty-claims/{LG claim}  → 404
```

## Acceptance
- A brand sees only its own claims; all three actions work and are audited with actor + reason.
- Request-info → customer responds (Phase 3 endpoint) → brand sees new documents on the same claim.

## Implementation Log

**Done 2026-09-29.** Phases 1–3 were committed and pushed first (`30c1932`); Phase 4 is not committed yet.

### Endpoints (`/api/v1/brand/warranty-claims`, brand-admin token; brand taken from the token, never the request)
| Method + path | What |
|---|---|
| `GET /?status=&q=&from=&to=&category=&pincode=&page=&limit=&sort=` | own queue; `status` may be a comma list; `q` searches ticket / serial / model / product / issue; `meta.counts` = per-status totals of the whole queue (tab badges) |
| `GET /:id` | full claim (id or NCCW ticket). First open of a **Submitted** claim moves it to **Brand Review** (`BRAND_OPENED`, customer sees "Brand Verification") |
| `POST /:id/approve` `{ remarks? }` | → Approved; customer + super-admins notified. (Phase 5 hangs the Service Job off this.) |
| `POST /:id/reject` `{ reason }` | reason **required**, ≥ 5 chars → Rejected; reason stored and shown to the customer |
| `POST /:id/request-info` `{ message }` | → Info Requested; customer notified with an "Upload Now" link; a second request before the answer → 409 |
| `POST /:id/notes` `{ note }` | brand-only note (visibility `brand`) |

### What the brand sees
Customer name + phone, product, issue, model, serial, purchase date, remarks, the
system's warranty estimate, address, every document (answers linked to the
request they answered), the info-request thread, rejection reason, the linked
Service Job (Phase 5+), and all non-internal timeline events. Its own reviewers
and the customer appear by name; NCC staff/system appear as "NCC".

### Concurrency
`WarrantyClaim` now uses Mongoose **optimistic concurrency**. New
`saveClaim()` (claimTimeline.js) turns a version conflict into **409** and drops
the pending audit rows, so two reviewers deciding at once → exactly one decision,
one timeline event, one audit row (tested with parallel approve + reject).
Phase 3's service now saves through `saveClaim()` too.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/brandClaim.service.js` / `.validation.js` / `.routes.js` | **new** |
| `backend/src/modules/partner-warranty/claimTimeline.js` | `saveClaim()`; `recordAndSave` uses it |
| `backend/src/modules/partner-warranty/warrantyClaim.model.js` | `optimisticConcurrency: true` |
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` | saves via `saveClaim()` |
| `backend/src/modules/notifications/notification.service.js` | `warranty.info_requested`, `warranty.claim_approved`, `warranty.claim_rejected`, `warranty.claim_decided_admin` |
| `backend/src/app.js` | mounts the brand router |
| `backend/tests/helpers/partnerWarranty.js` | **new** — shared scenario kit for the remaining phases |
| `backend/tests/partnerWarrantyBrand.test.js` | **new** — 10 tests |

### Not done / noted
- Brand users are gated by brand scope only (no per-permission check such as "can approve") — no brand route in the app uses fine-grained permissions yet. Revisit if the client wants reviewer vs approver roles.

### Verification
- Partner warranty tests (Phases 1, 3, 4 together): **40/40 passed**.
- Full backend suite: **54 suites, 820 tests passed**.
- ⚠️ One earlier full run had **one** failure in `partnerWarrantyClaim.test.js` (Phase 3). I could not reproduce it: that file passed 6/6 runs alone and the next full run was fully green, and the failing run's summary did not include the error. Cause **not identified** — watch for it; if it recurs, capture the full output.
- ESLint clean.
