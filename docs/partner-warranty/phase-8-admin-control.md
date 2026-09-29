# Phase 8 — Super Admin control APIs

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #3, #14, #17

## Goal
Full visibility across all brands plus every manual override the client listed.

## Tasks
- [ ] `GET /super-admin/warranty-claims` — filters: brand, category, productType, status, date range, city, pincode, escalated, allocationFailed, slaState, q (ticket / job ID / customer phone / serial); columns: ticket, brand, customer, product, issue, location, date, status, assigned partner; status counts
- [ ] `GET /super-admin/warranty-claims/:id` — everything: all timeline events (incl. internal), audit rows, SLA, flags, documents, linked job (SR + Job + partner + dispatch history: declinedBy, assignedAt)
- [ ] Overrides (each requires `reason`, audited as actor `admin`):
  - `POST …/:id/approve` / `…/reject` on the brand's behalf
  - `POST …/:id/assign` `{ serviceProviderId }` — manual assign (uses existing `suggestServiceProviders` for the picker; `GET …/:id/partner-suggestions`)
  - `POST …/:id/reassign` `{ serviceProviderId?, reason }` — pull from the current partner (only before work started, or with `force` after, which cancels the old Job step cleanly) and assign next/named
  - `POST …/:id/status` `{ status, reason }` — admin-only transitions allowed by §3
  - `POST …/:id/escalate` / `…/de-escalate`
  - `POST …/:id/hold` / `…/resume`
  - `POST …/:id/cancel` — cancels the linked SR too
  - `POST …/:id/reopen` — Rejected/Closed/Cancelled → Brand Review or Job Created (new SR if the old one was cancelled)
  - `POST …/:id/notes` — internal note
- [ ] `SERVICE_REQUEST_STATUS` gains `On Hold` with transitions to/from active states, so a held claim also pauses its job
- [ ] Tests `partnerWarrantyAdmin.test.js`

## Acceptance
- Every action in #14 exists, requires a reason, and leaves an audit row with old/new status.
- Filters return correct subsets; a brand-admin token gets 403 on these routes.

## Implementation Log
_Filled in when the phase is done._
