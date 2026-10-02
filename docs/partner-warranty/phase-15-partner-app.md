# Phase 15 — Partner app: warranty jobs + B2B2C payout

**Status:** ✅ Done · **Layer:** Frontend · **Delivers:** #11, #20

## Tasks
- [x] Incoming offer card for warranty jobs: "Warranty Service" badge, brand, product, issue, area/pincode, NCCJ job ID, visit details, payout; accept / reject with the 60 s countdown
- [x] Active job (`BrandWarrantyOverview`): brand, model, serial, issue, customer documents (invoice/photos) viewable, claim ID; ₹0 customer collection messaging
- [x] Visit scheduling step feeds the claim's visit slot (Phase 7)
- [x] Earnings → Invoice Payout: B2B2C total, jobs count, by brand and by product; "Settled manually by NCC" — no request button for Invoice
- [x] Job history filter "Warranty (B2B2C)"

## Implementation Log
**Done 2026-09-30 (uncommitted).**

**Backend**

- `warrantyJobInfo(claim, sr, { forAssignedPartner })` (`claimDispatch.js`):
  - Every warranty block now carries `customerPays: 0`.
  - Only the partner the job is assigned to (job context) also gets the customer's `documents` (kind, url, name), `purchaseDate`, `remarks` and `claimStatus`.
  - The offer feed still shows nothing beyond what's needed to decide.
- `listActiveJobs` returns each job with its `warranty` block, so the partner app's job cards show the real brand, product and issue.
- Job history accepts `type=b2b2c` (jobs with a `warrantyClaim`).
- **Bug fix:** `acceptJob` let the client's `type` override the server's inference. The partner app sent `'NCC Paid Service'` for warranty offers, because a warranty SR has no booking. So a warranty job accepted in the app was stored as a paid D2C job (`isD2C: true`).
  - The server now always types a job with a `warrantyClaim` as `Brand Warranty`.
  - `partnerWarrantyJob.test.js` now accepts with `type: 'NCC Paid Service'` and asserts `Brand Warranty`.
  - The API-only tests never sent a type, which is why this was missed.

**Frontend (partner app)**

- `ServiceProviderContext.withWarranty()` lays the server's warranty block over offers and active jobs. Without it a warranty offer showed as "NCC Paid Service", brand "Brand", at "Customer Address". It sets:
  - type Brand Warranty;
  - brand, product, issue, model and serial;
  - claim and NCCJ IDs;
  - area and pincode;
  - price ₹0;
  - the visit slot.
- The dispatch pop-up (`Dashboard.jsx`) keeps the 60s countdown and accept/decline. For a warranty offer it adds:
  - a **Warranty Service** chip and the NCCJ ID;
  - brand + product as the title;
  - issue, warranty claim ID, area · pincode;
  - "₹0 · paid by NCC";
  - "You schedule the visit after accepting".
- New `job-flows/PartnerWarrantyJob.jsx`:
  - `PartnerWarrantyDetails`: claim/job IDs, model, serial, purchase date, area, the customer's note, the customer's documents (images as thumbnails, PDFs as links), and "Customer pays ₹0 … NCC pays you ₹X, settled manually".
  - `WarrantyVisitScheduler`: date (not in the past) plus one of four slots, saved via `POST /service-provider/warranty-jobs/:jobId/schedule-visit`; shows the saved slot with a "Change" option. It's shown only while the claim is Partner Assigned, Visit Scheduled or Technician On Way.
  - Both appear on the Assigned step (before "Start Trip"). The details also replace the old Brand Warranty mock card on the details screen.
- Removed mock values:
  - `LG-IN-8842`, "LG Warranty Call" (which linked to a fake ticket), `15 Jan 2027` and "In Warranty" from ActiveJob's Brand Warranty card;
  - the same fallbacks, plus "Noise from freezer compartment", from `BrandWarrantyOverview`.
  - Unknown values now read "Not recorded".
- Earnings → InvoicePayout gets a new `components/service-provider/B2b2cPayoutPanel.jsx`:
  - total earned, pending and settled;
  - totals by brand and by product;
  - each job with "Awaiting NCC settlement" or "Settled {date} · {reference}";
  - a "Settled manually by NCC" pill, and no request button.
  - The settlement shows in Recent Payouts as "NCC settlement · {reference}" instead of "Job Direct".
- Service History has a new **Warranty (B2B2C)** filter chip; B2B2C jobs are labelled "Warranty (B2B2C)" and titled by product and issue.
- **Bug fix (all job types):** after accepting from the pop-up, `Dashboard` called `selectJobForDetails(job.id)` with the offer's service-request id, taken from a stale `jobs` closure. This overwrote the new job id that `acceptJob` had just set, so opening the job straight away fell back to the "Pick up where you left off" picker. `acceptJob` now returns `{ ok, jobId }` and the dashboard selects that.
- **Robustness:** `useWarrantyClaimLive` now also refetches whenever its socket (re)connects. An update sent before the socket joined its rooms was lost, and screens could stay on a stale status. The customer spec caught this under parallel load.
- **Phase 14 follow-up:** Super Admin → B2B2C Payouts disables "Record settlement" until the partner's job list has loaded. Clicking earlier said "Tick at least one job".

**Verification**

- Backend: the partner-warranty suites plus `appliances` pass, 170/170. `partnerWarrantyAllocation` checks:
  - no documents on the offer;
  - documents and purchase date in the job context;
  - warranty info in `/jobs/active`;
  - `history?type=b2b2c` returning only the warranty job.
- Frontend: `vite build` passes; ESLint shows 0 errors and no new warnings.
- Browser: the new `e2e/ui/partnerAppWarranty.spec.js` (390×844) covers:
  1. The warranty offer pop-up with every client field.
  2. Accepting, then Start Job.
  3. Scheduling the visit (the date is required); the claim becomes Visit Scheduled with that slot.
  4. The customer's invoice link and note, and the ₹0 message; `LG-IN-8842` is gone.
  5. After the job is done: InvoicePayout B2B2C totals by brand and product, "Awaiting NCC settlement" and no buttons.
  6. After Super Admin settles: "Settled · UTR" and "NCC settlement · UTR" in Recent Payouts.
  7. History → Warranty (B2B2C) lists the job.
- The partner warranty, brand, Super Admin, partner-app and existing `serviceProviderJobs` specs pass together: 7/7, several times in parallel and serially.
- Screenshots: `screenshots/phase-15-offer.png`, `phase-15-assigned.png`, `phase-15-earnings.png`.

**Notes**

- The e2e `ac` category is named "AC", so product names read "AC" in the screenshots; real claims carry the catalogue's product name.
- "Start Job" on the dashboard sometimes shows the accepted-jobs picker first (before the context has loaded the job). That is existing behaviour; the spec handles both paths.
