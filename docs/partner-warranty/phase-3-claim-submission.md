# Phase 3 — Claim submission + customer APIs

**Status:** ✅ Done (2026-09-29) · **Layer:** Backend · **Delivers:** #1, #2, #5, #7 (customer side), #13 (API)

## Goal
The customer's "Submit Claim" creates a real `WarrantyClaim`, routed to the
chosen brand by `brand_id` automatically, and the customer can list, track and
top up documents on it.

## Tasks
- [x] `POST /partner-warranty/claims` (customer): `{ brandId, groupId, categoryId, productTypeId?, issueId, modelNumber, serialNumber, purchaseDate, remarks, addressId | address, documents: [{ kind, url, name }] }`
  - validates brand is active + warranty-enabled + covers the category; issue belongs to that category
  - requires ≥1 `invoice` document (warranty card / product photo optional but supported)
  - document URLs must come from our upload service (Cloudinary host or local `/uploads/`), not arbitrary links
  - snapshots the address (pincode required, lat/lng if known)
  - warranty check via `brandWarrantyMonths` + purchase date → `warrantyCheck` (informational; brand decides)
  - duplicate guard: an open claim with the same brand + serial → 409 with the existing ticket ID
  - status `Submitted`, timeline `CLAIM_SUBMITTED`, SLA deadlines stamped (brand approval + resolution, brand hours or platform defaults; Phase 9 adds the rest)
  - notifies the brand's users + Super Admin (targeted, §10)
- [x] `GET /partner-warranty/claims` (mine, paginated) and `GET /partner-warranty/claims/:id` — customer projection (§12), 404 for someone else's claim
- [x] `POST /partner-warranty/claims/:id/documents` — add documents while not terminal
- [x] `POST /partner-warranty/claims/:id/info-response` — `{ message, documents }` answers the open info request; Info Requested → Brand Review (Phase 4 creates the request)
- [x] Upload path: reuse `POST /api/v1/uploads` (existing) — confirm customers may call it; restrict mime/size as today
- [x] Tests `partnerWarrantyClaim.test.js`

## Example
```
POST /partner-warranty/claims  (customer token)
{ brandId: LG, categoryId: ac, issueId: cooling, modelNumber: 'AS-Q18', serialNumber: 'LG123',
  purchaseDate: '2025-11-02', remarks: 'Blows warm air', addressId: …,
  documents: [{ kind:'invoice', url:'https://res.cloudinary.com/…/inv.pdf' }] }
→ 201 { id, humanId: 'NCCW-2026-000001', status: 'Submitted', statusLabel: 'Claim Submitted', … }
```

## Acceptance
- Claim appears in LG's scope (brand = LG ObjectId) with no manual step.
- Another customer gets 404 on it; the customer projection hides internal fields.
- Missing invoice / pincode / uncovered category → 400 with a clear message.

## Implementation Log

**Done 2026-09-29.** Not committed yet.

### Endpoints (`/api/v1/partner-warranty/claims`, customer token only)
| Method + path | What |
|---|---|
| `POST /` | submit — returns the customer view with the NCCW ticket |
| `GET /?status=open\|closed&page=&limit=` | my claims, newest first |
| `GET /:id` | one claim — `:id` is the id **or** the NCCW ticket; someone else's → 404 |
| `POST /:id/documents` | add documents (not on Closed / Cancelled / Rejected) |
| `POST /:id/info-response` | answer the brand's open request (message and/or documents) → back to Brand Review |

### Rules enforced on submit
- Brand active + warranty-enabled + covers the category; issue belongs to that category (`resolveSelection`, Phase 2).
- Model number, serial number, purchase date required; purchase date not in the future.
- At least one `invoice` document; every document URL must be **our own upload** (`isOwnUploadUrl`: Cloudinary under our cloud name, or `/uploads/…` outside production) — customers upload through the existing `POST /api/v1/uploads` first.
- Address: a saved `addressId` **or** an inline address (not both); 6-digit pincode required; lat/lng kept when known.
- One open claim per brand + serial (case-insensitive) → 409 with `details.existingClaim`. A different brand, or after the first claim is closed/rejected, is allowed.
- `warrantyCheck` = purchase date + brand warranty months (partner brand → catalogue brand → 12). Stored for the brand; **not** shown to the customer (the brand decides).
- SLA: `brandApprovalDueAt` and `resolutionDueAt` from the brand's `warrantySla` or defaults (24 h / 168 h).
- Timeline `CLAIM_SUBMITTED` + AuditLog row.
- Notifications: customer ("Warranty Claim Submitted"), **that brand's users only** ("New Warranty Claim"), super-admins ("New Partner Warranty Claim"); each with a deep link from `claimLinks.js`.

### Customer view (ARCHITECTURE §12)
Built field-by-field (`toCustomerView`), so new model fields stay hidden until added on purpose.
Shows: ticket, status + label, `actionNeeded`, brand name/logo, product, issue, model, serial, purchase date, remarks, address, documents, the open info request, rejection reason, visit, Service Job ID, and only `customer`-visibility timeline events with the actor's **role** (never a reviewer's name).
Hides: flags, SLA, warranty estimate, info-request history, brand/internal notes.

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` | **new** — create, list, get, add documents, info response, customer projection |
| `backend/src/modules/partner-warranty/warrantyClaim.validation.js` / `warrantyClaim.routes.js` | **new** |
| `backend/src/modules/partner-warranty/claimSla.js` | **new** — `WARRANTY_SLA_DEFAULTS`, `slaHours`, `dueAt` (Phase 9 builds on it) |
| `backend/src/modules/partner-warranty/claimLinks.js` | **new** — deep-link paths for customer / brand / admin apps (Phases 12–14 must match) |
| `backend/src/modules/shared/fileUpload.js` | `isOwnUploadUrl()` |
| `backend/src/modules/notifications/notification.service.js` | templates `warranty.claim_submitted`, `warranty.new_claim_brand`, `warranty.new_claim_admin`, `warranty.info_provided` |
| `backend/src/app.js` | mounts the customer router |
| `backend/tests/partnerWarrantyClaim.test.js` | **new** — 13 tests over HTTP, including real file uploads |

### Known limitation
The duplicate-serial check is a read-then-write: two submissions of the same
serial in the same instant could both pass. MongoDB partial indexes can't
express "status not terminal", so closing this fully needs a separate lock
key; noted for Phase 16 hardening rather than done now.

### Verification
- `tests/partnerWarrantyClaim.test.js`: **13/13 passed**.
- Full backend suite: **53 suites, 810 tests passed**. (One earlier full run hung and failed 3 files on hook timeouts right after I killed a run mid-way — a leftover lock in the local MongoDB. Re-run cleanly: all green.)
- ESLint clean.
