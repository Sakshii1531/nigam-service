# Phase 12 — Customer app wiring

**Status:** ⬜ Not started · **Layer:** Frontend · **Delivers:** #1, #7, #12, #13

## Goal
Same screens and flow the client approved, now driven entirely by the APIs.

## Tasks
- [ ] `PartnerWarranty.jsx` — groups from `GET /groups`; brand search box (client: "search brands") across all groups
- [ ] `SelectBrand.jsx` — brands from API (logoUrl, fallback initials); remove hardcoded `BRANDS_DATA` and inline SVG logos
- [ ] `SelectProduct.jsx`, `SelectIssue.jsx` — from API; remove `PRODUCTS_DATA` / `ISSUES_DATA`; URL params become IDs
- [ ] `RaiseWarrantyRequest.jsx` — real file pickers (invoice / warranty card / product photo / additional) using the upload API with progress + remove; address picker (saved addresses, pincode required); validation; submit to `POST /claims`; loading/error states; delete the random ID generator
- [ ] `TicketSuccess.jsx` — shows the server `humanId`
- [ ] New "My Warranty Claims" list (entry from Dashboard Partner Warranty + Profile)
- [ ] `TrackTicket.jsx`, `TicketDetails.jsx`, ServiceUpdates — from `/claims/:id` and `/track`; remove hardcoded 2024 timelines; live refresh on `warranty_claim:updated`
- [ ] Info-requested state: banner with the brand's message + upload + respond; notification CTA opens it
- [ ] Rating card only after `Closed`
- [ ] Skeletons consistent with Phase 23 of master-catalogue

## Acceptance
- `grep` finds no hardcoded brand/product/issue lists or `NCCW-2024` in `frontend/src/pages`.
- Full flow works against the dev API in the browser (verified with screenshots in the log).

## Implementation Log
_Filled in when the phase is done._
