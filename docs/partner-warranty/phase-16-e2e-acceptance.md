# Phase 16 — End-to-end verification + acceptance

**Status:** ✅ Done (commit awaiting go-ahead) · **Layer:** All · **Delivers:** #19 and sign-off for all

## Tasks
- [x] Backend journey test `partnerWarrantyJourney.test.js` running the CLIENT-ACCEPTANCE scenario end to end (two brands, three partners, reject + timeout + accept, info request, completion, events, audit, payout)
- [x] Playwright spec in `e2e/` across customer, brand, admin and partner apps
- [x] Manual browser walkthrough with screenshots in `screenshots/`
- [x] CLIENT-ACCEPTANCE.md: every row ✅ with evidence links
- [x] Remove dead code: mock data, the stub brand approval, unused `WARRANTY_TICKET` comment
- [ ] Commit to `main` (on the user's go-ahead)

## Implementation Log
**Done 2026-10-02 (uncommitted — committing waits for the user's go-ahead).**

### Backend journey — `backend/tests/partnerWarrantyJourney.test.js`

One ordered scenario, the client's flow (#19) and the acceptance scenario in CLIENT-ACCEPTANCE.md. At every stage it asserts that the customer, brand (LG) and Super Admin APIs report the **same status**.

1. **Setup.**
   - Two brands, LG and Samsung, each with staff.
   - NCC staff, and a customer with a saved Indore 452001 address.
   - Three LG-authorized AC partners for 452001, at 1, 3 and 5 km: Asha, Bilal, Chetan.
   - A nearer (0.5 km) AC partner, Dev, who is **not** LG-authorized.
   - An LG RateCard paying ₹450, and LG's CRM webhook pointing at a local receiver.
2. **The customer submits** with an invoice and a product photo → `NCCW-{year}-######`, status Submitted.
3. **The Super Admin list** shows it at once, with the client's columns: ticket, brand, customer, product, issue, location, date, status, no partner.
4. **Brand isolation.** It's in LG's queue. Samsung's queue doesn't show it, and Samsung's GET of it returns 404.
5. **Info request.** LG asks for more information → Info Requested in all three views. The customer replies with a document → Brand Review, and LG sees the reply.
6. **Approval.** LG approves → Job Created, and a separate `NCCJ-{year}-######` job is offered to **Asha**: the nearest authorized partner, never Dev.
7. **The network.** Asha rejects → Bilal. Bilal times out (sweep) → Chetan. Chetan accepts while sending the old app's `type: 'NCC Paid Service'`; the job is still Brand Warranty, ₹450.
   - Partner Assigned in all three views.
   - The brand sees Chetan.
   - The admin job history lists Asha and Bilal as passed.
   - Dev never appears, and there's no fallback flag.
8. **Execution.** Each of these is checked in all three views:
   - schedule visit → Visit Scheduled, with the slot;
   - travel → Technician On Way;
   - arrive → Service In Progress;
   - diagnosis, parts, repair and billing give total ₹0 / collect ₹0 / partner ₹450;
   - collect with the customer's OTP → Service Completed;
   - the customer confirms → Closed.
9. **Rating.** "Rate your service" rates the claim's job once; a second rating returns 409.
10. **History** is exactly the client's order: CLAIM_SUBMITTED, then Info Requested → Brand Review → Approved → Job Created → Partner Assigned → Visit Scheduled → Technician On Way → Service In Progress → Service Completed → Closed.
    - The customer never sees dispatch events.
    - The admin timeline records "Asha declined" and "Bilal did not respond in time".
11. **SLA.** All four clocks are set at submission and met; the state is ok.
12. **Audit.** One audit row per status change, in the same order. The info request and approval are attributed to LG's user, the close to the customer.
13. **Events and webhooks.** CLAIM_CREATED, CLAIM_INFO_REQUESTED, CLAIM_APPROVED, JOB_CREATED, PARTNER_ASSIGNED, JOB_STARTED, JOB_COMPLETED and CLAIM_CLOSED, delivered to LG's CRM in that order, each HMAC-signed. Samsung has none.
14. **Notifications.** The customer and LG got theirs; Samsung got none.
15. **Payout.**
    - Chetan's withdrawable balance stays ₹0. B2B2C shows ₹450 pending, by brand (LG) and by product (Air Conditioner).
    - NCC's owed list shows Chetan ₹450.
    - Settling once succeeds; a second settle returns 409.
    - Afterwards Chetan shows ₹450 settled and the job carries the reference.
    - Asha and Bilal have no B2B2C earnings.

### Cross-app browser test — `e2e/ui/warrantyJourney.spec.js`

One claim across four apps, each in its own browser (customer and partner on a 390×844 phone; brand and NCC at 1440×900):

1. The customer raises it through the real screens.
2. NCC's open claims list shows it **without a reload**.
3. The brand opens it from its queue, sees the documents, and approves with remarks.
4. The partner's phone pops up the warranty offer: Warranty Service, NCCJ ID, claim ID, ₹0 · paid by NCC. They accept.
5. The customer's Track Ticket shows the technician live.
6. The partner schedules the visit; the customer's tracker moves to Visit Scheduled with the slot, live.
7. The on-site steps run over the API (their screens are covered by the job-flow specs). The customer reads the completion code, then closes the claim.
8. The customer taps **Rate your service**. Submitting without a rating is refused; they rate and submit.
9. The brand's page and NCC's detail page show Closed, the NCCJ job and the audit trail (11 rows).
10. NCC settles the B2B2C payout in its Payouts screen. The partner's Earnings → InvoicePayout shows it settled with the reference.

Screenshots (the walkthrough): `screenshots/phase-16-01-customer-submitted.png` … `phase-16-10-partner-settled.png`.

### Fixes found while verifying

- **Visit scheduler status name (Phase 15 bug).** The scheduler's allowed statuses said "Technician On The Way", but the status is "Technician On Way", so the scheduler would vanish while the technician was travelling.
- **Raw visit dates.** Notes and screens showed "2026-10-03". `visitLabel()` (backend `claimStatus.js`) and `formatVisit()` (frontend `partnerWarrantyFormat.js`) now give "Sat, 3 Oct 2026, 9 AM – 12 PM" in the timeline notes, the job's status note, and the brand and NCC detail pages.
- **"Rate your service" couldn't rate.** On a closed claim it linked to the claim's details page, which has no rating form. It now opens Rate Service for the claim's job: the track response gains `serviceRequestId`, the customer's own job.
- **Rate Service mock data.** In `RateService.jsx`:
  - The fake `NCCW-2024-000123` fallback ticket is gone; opened without a service, the page says so.
  - "Add a tip for Rahul" now uses the technician's name, or "your technician".
  - An unrated submit is refused; it used to send 5 stars.
  - A failed submit shows the error ("already rated" for 409); it used to show "submitted successfully".
  - The star buttons now have accessible names.
- **E2E port.** `playwright.ui.config.js` takes `E2E_UI_PORT` (default 5199). Another project's Vite server held 5199, and `reuseExistingServer` silently tested that app instead.

### Dead code

- The old frontend mock catalogue, browser-generated ticket IDs, the fixed 2024 timelines and the stub `updateClaimStatus` were removed in Phases 12–13.
- The last mock leftovers removed here:
  - Rate Service's fake ticket;
  - the Brand Warranty card's `LG-IN-8842` / `15 Jan 2027` (Phase 15);
  - the "Rahul" tip label.
- `ID_PREFIXES.WARRANTY_TICKET` is **not** dead: it is the `NCCW` prefix the claim model uses. It was kept and its comment is accurate.

### Verification (2026-10-02)

- **Backend:** all 62 suites pass, including the 13 partner-warranty suites (171 tests) and the new journey.
  - The single in-band run hit a Node **heap out-of-memory** after 60 suites.
  - The two suites it didn't reach (`partnerWarrantyCatalog`, `partnerWarrantyModel`) pass on their own.
  - The OOM is the whole suite accumulating in one `--runInBand` process, not a test failure. Splitting the run, or `--workerIdleMemoryLimit`, would avoid it.
- **Browser** (`playwright.ui.config.js`, `E2E_UI_PORT=5299`): all **57** tests in `e2e/ui` pass. The 8 warranty and partner-job specs also pass together in parallel and serially.
- **API** (`playwright.config.js`): all **195** pass.
- **Frontend:** `vite build` passes; ESLint shows no errors in the changed files.

### Not done

- **Commit to `main`:** waiting for the user's go-ahead (they asked for no commits after Phases 1–3).
