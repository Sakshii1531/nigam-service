# Phase 14 — Super Admin: Partner Warranty module

**Status:** ✅ Done · **Layer:** Frontend · **Delivers:** #3, #4, #14, #15

## Tasks
- [x] Sidebar group **Partner Warranty**: Claims, SLA Overview, Catalogue (groups/issues/brand coverage), B2B2C Payouts, Webhook Logs
- [x] Claims list: columns ticket, brand, customer, product, issue, location, date, status, assigned partner, SLA badge; filters brand, category, product, status, date, city/pincode, escalated, allocation failed; CSV export; live updates
- [x] Claim detail: full timeline (internal events marked), audit log, documents, linked job (dispatch history: offered/declined/timeout), SLA per stage
- [x] Action bar: approve/reject on behalf, assign / reassign (suggestion picker with score breakdown + availability), change status, escalate, hold/resume, cancel, reopen, note — all with a reason modal
- [x] "Needs attention" view: allocation failed + SLA breached + escalated
- [x] Partner edit screen: authorized brands, service pincodes, radius
- [x] Rename existing "NCC Shield (Warranty)" to "Parts Claims" to avoid confusion

## Implementation Log
**Done 2026-09-30 (uncommitted).**

Screens (`frontend/src/pages/super-admin/partner-warranty/`, routes under `/super-admin/partner-warranty/*`):

- **Claims.jsx** has four views, each with a count: all, allocation failed, SLA breached and escalated. "Needs attention" is the three non-"all" views.
  - Filters: brand, product, status, city, pincode, from/to and free-text search (ticket, NCCJ job, serial, customer).
  - Columns: ticket, brand, customer, product · issue, location, date, status, assigned partner, flags.
  - CSV export and live updates via `warranty_claim:updated` on the `admins` room.
- **ClaimDetail.jsx** has an action bar with approve/reject on behalf, assign, reassign (with `force` after acceptance), change status, escalate/de-escalate, hold/resume, cancel, reopen and note.
  - Every action goes through `ReasonDialog`: a native `<dialog>` with a required reason, so an empty submit is blocked by the browser.
  - Assign and reassign use a partner picker built from the dispatch suggestions (score breakdown, availability).
  - The page also shows:
    - the SLA table for the four stages;
    - service jobs with offered/declined/timed-out history and payout;
    - the timeline, with each event labelled Customer, Brand or Internal;
    - the audit trail, documents, info requests, and customer and product details.
- **SlaOverview.jsx** shows per-brand SLA state (on time / warning / breached) and an editor for the platform default hours.
- **Catalogue.jsx** has tabs for groups, issues per product, and brand coverage.
- **PartnerEligibility.jsx** lets you search partners and edit authorized brands, service pincodes and radius.
- **Payouts.jsx** lists what is owed per partner. Pick a partner, tick jobs and record the settlement with a transfer reference.
- **WebhookLog.jsx** lists deliveries with brand/status filters, per-attempt detail and a retry for failed/skipped deliveries.

Supporting code:

- `lib/adminWarrantyApi.js`
- `components/super-admin/partner-warranty/{AdminShell,ReasonDialog}.jsx`

Sidebar changes:

- New **PARTNER WARRANTY** group, with a Warranty Claims badge for the allocation-failed count.
- "NCC Shield (Warranty)" is renamed to **Parts Claims**.

**Verification**

- `vite build` passes; ESLint is clean on the new files.
- `e2e/ui/adminWarranty.spec.js` (Playwright UI config) passes. As Super Admin it:
  1. Opens the allocation-failed view.
  2. Opens the stuck claim.
  3. Escalates it.
  4. Tries Hold with an empty reason and is refused, then holds with a reason.
  5. Resumes. Re-dispatch still finds nobody online, so the claim shows "No partner found" again.
  6. Assigns an offline partner via the picker.
  7. After the partner completes the job over the API, settles the payout with a UTR.
  8. Authorizes the partner for the brand and two pincodes, and checks this through the API.
  9. Adds a catalogue issue, edits the SLA defaults, and opens the webhook log.
- The customer and brand specs still pass alongside it (3/3).
- Screenshots: `screenshots/phase-14-claims-attention.png`, `screenshots/phase-14-claim-detail.png`.

**Notes**

- Hold withdraws an unaccepted offer, and Resume re-dispatches (Phase 8 design). An admin who assigns someone and then holds the claim must assign again if nobody eligible is online.
- The e2e teardown purges users and brands but not `warrantyclaims`, so claims from earlier runs appear in the e2e DB with empty brand/customer cells. This only affects test data.
