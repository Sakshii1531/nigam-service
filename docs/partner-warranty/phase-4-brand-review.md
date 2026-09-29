# Phase 4 — Brand review: approve / reject / request info

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #5, #6, #7, #17

## Goal
Each brand works its own queue and makes the warranty decision.

## Tasks
- [ ] `GET /brand/warranty-claims?status=&q=&from=&to=&productType=&pincode=` — only `brand = req.user.brand`; paginated; counts per status for tabs
- [ ] `GET /brand/warranty-claims/:id` — full detail incl. documents, info requests, brand-visible timeline, linked job summary (partner name, status) once it exists; first open moves Submitted → Brand Review
- [ ] `POST /brand/warranty-claims/:id/approve` `{ remarks? }` → Approved (Phase 5 hooks job creation here)
- [ ] `POST /brand/warranty-claims/:id/reject` `{ reason }` — reason **required** (min 5 chars) → Rejected, `rejectionReason` set, customer notified with reason
- [ ] `POST /brand/warranty-claims/:id/request-info` `{ message }` → Info Requested, customer notified (action CTA to the claim)
- [ ] Brand-internal note: `POST /brand/warranty-claims/:id/notes` `{ note }` (visibility `brand`, never shown to customer)
- [ ] Cross-brand access → 404 (not 403, to avoid confirming existence)
- [ ] Concurrency: decisions use a conditional update on current status so double-clicks / two brand users can't approve twice
- [ ] Tests `partnerWarrantyBrand.test.js`

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
_Filled in when the phase is done._
