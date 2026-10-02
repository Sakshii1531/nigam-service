# Phase 13 — Brand panel: Warranty Claims

**Status:** ✅ Done (2026-09-30) · **Layer:** Frontend · **Delivers:** #4, #6, #7, #12

## Tasks
- [x] Sidebar: **Warranty Claims** (new customer-claim queue) and **Parts Claims** (existing FOC list, renamed)
- [x] Queue page: status tabs with counts (New, In Review, Info Requested, Approved/In Service, Rejected, Closed), search, date/product/pincode filters, **decision deadline** ("due in 5h" / "overdue 2h"), live updates via the `brand:{id}` socket
- [x] Detail page: customer + product + issue + address, document viewer (image preview, PDF open), info-request thread, brand-visible timeline, linked job card (NCCJ, partner, status, visit)
- [x] Actions: Approve (confirm), Reject (reason textarea, required), Request More Information (message), internal note
- [x] Coverage settings page (Phase 2 API) and webhook settings page (Phase 10 API)
- [x] Remove the stub `updateClaimStatus` that shows "not saved"

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–13 uncommitted, as asked). With your go-ahead, the other project's dev server on port 5199 (ezoflife frontend) was stopped so the UI tests run on their standard ports.

### Screens
| Route | Screen |
|---|---|
| `/brand-admin/warranty-claims` | **Warranty Claims** queue — 5 KPI cards, 6 status tabs with live counts, search (ticket / serial / model / product / issue), product (from the brand's coverage), pincode and date filters; columns ticket, customer + phone, product · issue, location, system warranty check, submitted, **your decision (due in / overdue)**, status; 20 per page; refreshes live |
| `/brand-admin/warranty-claims/:id` | **Claim** — ticket, status, what the customer sees, decision deadline; **Approve** (optional remarks) / **Reject** (reason required, ≥ 5 chars) / **Request more information** in native `<dialog>`s; product & issue with the warranty estimate; documents (images open in a preview dialog, PDFs in a new tab; replies marked "Sent in reply"); information-request thread (asked → customer replied, live); history with "brand only" markers; customer & address; Service Job (NCCJ, status, technician, visit); internal note |
| `/brand-admin/warranty-settings` | **Warranty Settings** — listed-or-not banner (NCC decides), covered products (checkboxes over active categories), logo upload, NCC's approval deadline (read-only); CRM webhook: URL, on/off, events, **secret shown once** with copy, new secret, **send test** (result inline), recent deliveries |
| `/brand-admin/parts-claims` | **Parts Claims & Extended Warranty** — the old page's contents, now read-only: the fake Approve/Reject (which said "not saved") is replaced by "Awaiting NCC approval" / "Claim approved by NCC" |

Sidebar (Service & Operations): **Warranty Claims**, Warranty Verification, **Parts Claims**, **Warranty Settings**.

### Files
| File | Change |
|---|---|
| `frontend/src/pages/brand-admin/WarrantyClaims.jsx` | replaced — the customer-claim queue |
| `frontend/src/pages/brand-admin/WarrantyClaimDetail.jsx` | **new** |
| `frontend/src/pages/brand-admin/WarrantySettings.jsx` | **new** |
| `frontend/src/pages/brand-admin/PartsClaims.jsx` | **new** — the old page, read-only |
| `frontend/src/lib/brandWarrantyApi.js` | **new** — brand API + tab definitions |
| `frontend/src/lib/partnerWarrantyFormat.js` | `dueLabel` |
| `frontend/src/hooks/useWarrantyClaimLive.js` | takes the portal (customer / brand_admin / super_admin) |
| `frontend/src/components/brand-admin/Sidebar.jsx`, `frontend/src/App.jsx` | links + routes |
| `e2e/ui/brandWarranty.spec.js` | **new** browser test |

No backend changes were needed.

### Verification
- **Browser** (`e2e/ui/brandWarranty.spec.js`, standard UI config): queue shows only this brand's claim (another brand's is absent) with "New 1" and "due in 24h"; opening moves it to Brand Review; request more information → the customer's reply + photo appear **live**; an empty rejection is refused by the dialog; an internal note is marked brand-only and absent from the customer's API; approve → toast and the **NCCJ Service Job** appears; settings: coverage ticked, webhook save shows a 64-hex secret once, a dead endpoint's test reports "Test failed"; Parts Claims page loads. **Passed**, together with the Phase 12 customer test (**2/2**).
- Screenshots: `screenshots/phase-13-queue.png`, `phase-13-claim-approved.png`, `phase-13-settings.png`.
- ESLint clean on all new/changed brand files (one older warning in `Sidebar.jsx` line 44 predates this work); `vite build` succeeds.
