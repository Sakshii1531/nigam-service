# Phase 12 — Customer app wiring

**Status:** ✅ Done (2026-09-30) · **Layer:** Frontend · **Delivers:** #1, #7, #12, #13

## Goal
Same screens and flow the client approved, now driven entirely by the APIs.

## Tasks
- [x] `PartnerWarranty.jsx` — groups from `GET /groups`; brand search box (client: "search brands") across all groups
- [x] `SelectBrand.jsx` — brands from API (logoUrl, fallback initials); remove hardcoded `BRANDS_DATA` and inline SVG logos
- [x] `SelectProduct.jsx`, `SelectIssue.jsx` — from API; remove `PRODUCTS_DATA` / `ISSUES_DATA`; URL params become IDs
- [x] `RaiseWarrantyRequest.jsx` — real file pickers (invoice / warranty card / product photo / additional) using the upload API with progress + remove; address picker (saved addresses, pincode required); validation; submit to `POST /claims`; loading/error states; delete the random ID generator
- [x] `TicketSuccess.jsx` — shows the server `humanId`
- [x] New "My Warranty Claims" list — entry from the Partner Warranty page (Dashboard / Profile untouched: Dashboard.jsx has your uncommitted changes)
- [x] `TrackTicket.jsx`, `TicketDetails.jsx`, ServiceUpdates — from `/claims/:id` and `/track`; remove hardcoded 2024 timelines; live refresh on `warranty_claim:updated`
- [x] Info-requested state: banner with the brand's message + upload + respond; notification CTA opens it
- [x] Rating card only after `Closed`
- [x] Skeletons from `components/common/Skeleton` (master-catalogue Phase 23)

## Acceptance
- `grep` finds no hardcoded brand/product/issue lists or `NCCW-2024` in `frontend/src/pages`.
- Full flow works against the dev API in the browser (verified with screenshots in the log).

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–12 uncommitted, as asked).

### Screens (same approved layout, now on the real APIs)
| Route | Screen | What changed |
|---|---|---|
| `/partner-warranty` | Partner Warranty | groups from the API (with brand counts; empty groups disabled), **brand search** across all groups, "My Warranty Claims" entry |
| `/partner-warranty/brands/:group` | Select Brand | brands from the API with uploaded logo or initials; inline filter when > 6 |
| `/partner-warranty/products/:group/:brandId` | Select Product | the brand's covered categories (`group = all` from search) |
| `/partner-warranty/issues/:group/:brandId/:categoryId` | Select Issue | issues from the API |
| `/partner-warranty/raise-request/…` | Raise Warranty Request | real uploads (bill **required**, warranty card, product photo, up to 6 extra; images or PDF ≤ 10 MB, progress, remove), model / serial / purchase date **required**, remarks, **saved-address picker or a new address** (6-digit pincode), duplicate-serial message linking to the existing ticket, login prompt when signed out |
| `/partner-warranty/ticket-success` | Ticket Success | the server's NCCW ticket; refresh → claim list |
| `/partner-warranty/claims` | **new** My Warranty Claims | Active / Past tabs, status pills, live refresh |
| `/partner-warranty/claims/:id` | Claim Details | details, documents (open / add more), **respond to "more information"** (message + files), rejection reason, update history, **rating card once closed** |
| `/partner-warranty/claims/:id/track` | Track Ticket | stage list from `/track`, status explanation, "action needed" banner, technician card (name, rating, call) once accepted, visit slot, **completion code** only while it's needed, **"Service done — close my claim"**, "Rate your service" once closed; live refresh |

Old mock addresses (`/track-ticket`, `/ticket-details`, `/service-updates`) redirect to the claim list; `ServiceUpdates.jsx` (mock) deleted. No brand / product / issue list or `NCCW-2024` is hardcoded anywhere (checked with grep).

### Shared pieces
`components/partner-warranty/ui.jsx` (header, brand logo, status pill, stage timeline, document tile / chip / add button, error note), `lib/partnerWarrantyApi.js` (API + claim-document upload), `lib/partnerWarrantyFormat.js`, `hooks/useWarrantyClaimLive.js` (socket `warranty_claim:updated` → refetch).

### Forms (modern-web-guidance: required-field-feedback, accessible-error-announcement)
Native `required` / `pattern` / `max` so the browser blocks an incomplete submit and focuses the first problem; errors styled with Tailwind's `user-invalid:` variant (red border **and** a text message, never colour alone); `aria-invalid` kept in step on blur/input; submit button stays enabled. File inputs are real `<input type=file>` behind labels (keyboard-reachable, focus ring). The invoice requirement (not expressible natively) shows its own inline error.

### Backend changes found by the browser test
1. **Confirm button never appeared** until a reload: collecting payment moves the job to Customer Confirmation but leaves the claim at Service Completed, so no update was pushed. `syncClaimFromJob` now pushes `warranty_claim:updated` whenever the job moves without moving the claim (backend test added).
2. The **completion code stayed on screen** after the partner had used it — hidden once the job is at Customer Confirmation.
3. Customer view gains `serviceRequestId` (the rating card submits against it).

### Verification
- **Browser (Playwright, real backend + Vite on a local test DB)** — `e2e/ui/partnerWarranty.spec.js`, passing: browse group → brand → product → issue; submit refused without the invoice; upload; submit → `NCCW-2026-…`; Track Ticket shows the brand's info request **live, without reload**; reply with a file → Brand Verification; brand approves → live "assigning a technician"; partner accepts → technician card; on the way → in progress; completion code read off the screen and used; confirm button appears live; close → "closed", code hidden, "Rate your service"; claim listed under Past. Screenshots: `screenshots/phase-12-*.png`.
- Run note: another project's dev server holds port 5199 on this machine, so the spec was run through a throw-away copy of `playwright.ui.config.js` on ports 4211 / 5299 (not committed). In Phase 13, after the port was freed (with your go-ahead), it passed unchanged on the standard `playwright.ui.config.js`.
- Backend partner warranty tests: **129/129**. Frontend ESLint clean on all changed files; `vite build` succeeds.

### Open question for you
Help & Support → "Raise Support Ticket" navigated into the old warranty mock form with a fake path. There is no general support-ticket backend, so it now lands on the form's "choose the issue first" screen, whose button goes to the Partner Warranty start. Decide what that card should do (general support ticket vs. warranty) — `HelpSupport.jsx` is unchanged.
