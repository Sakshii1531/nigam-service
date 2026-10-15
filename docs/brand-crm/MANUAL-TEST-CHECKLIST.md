# Customer Partner Warranty and Brand Panel manual test checklist

Use this checklist for local or staging acceptance. Record the tester, build,
database, date, ticket IDs, expected result, actual result and screenshots for
each scenario. A green automated run supports this walkthrough; it does not
replace checking the environment you plan to release.

This checklist covers the client’s Customer Partner Warranty flow and Brand
CRM flow, including their connected NCC Super Admin and service-partner steps.
Customer warranty here means **Partner Warranty**, not a purchased extended
warranty/AMC plan.

Follow sections 1–2 first. Run **3A** with a customer-created claim and **3B**
with a separate Brand-created complaint. Then complete the customer and Brand
Panel checks in **4A–4B**, the shared alternate paths in **4C**, and the fix
checks in section 5. For detailed click-by-click directions, keep
[WALKTHROUGH.md](WALKTHROUGH.md) open alongside this checklist.

| Test group | Main tester | What it proves |
|---|---|---|
| 3A and 4A | Customer, with Brand/NCC/Partner sessions | Customer intake, documents, automatic routing, information response, tracking, privacy and closure |
| 3B and 4B | Brand owner and individual staff, with NCC/Partner/Customer sessions | Brand registration, approval, customer history, operations, roles, pricing, billing and reports |
| 4C and 5 | Relevant roles | Alternate decisions, allocation failures, tenant isolation and repaired defects |

Use at least two brands, two customers and two eligible partners for isolation
and reassignment checks. Give each new complaint a distinct test serial, such
as `UAT-CUSTOMER-001` and `UAT-BRAND-001`; use the same serial only when testing
duplicate prevention. Repeat catalogue/policy/rate checks for each brand and
covered product. Record a test as **Blocked**, rather than Pass, if setup is
missing or you cannot complete an action.

## 1. Prepare the environment

- Use a separate local/staging test database. Brand invoice/payment and manual
  B2B2C partner settlement writes require
  MongoDB replica-set transactions; standalone MongoDB returns 503.
- Start the backend (`cd backend`, then `npm run dev`) and the frontend in
  another terminal (`cd frontend`, then `npm run dev`). Use the frontend URL
  Vite prints, normally `http://localhost:5173`.
- Frontend `VITE_API_BASE_URL` must point to this backend's `/api/v1`; backend
  `CORS_ORIGINS` must include the frontend origin.
- If creating a fresh demo database, run `npm run seed` inside `backend` only
  after checking its database configuration. The seed script deletes
  notifications, so do not use it against live application data.
- Use separate browser profiles for Brand Admin, Super Admin, Partner and
  Customer. Brand Admin and Super Admin have separate portal tokens and can
  coexist, but separate profiles make role testing clearer. Use another
  profile for a second brand or a restricted CCE account.
- Give the NCC Finance test user `billing:manage`. The Super Admin title by
  itself does not guarantee Brand Billing access.

### Fresh seeded accounts

These are the defaults in `backend/scripts/seed.js`. Existing users retain
their existing password; seeding does not reset it.

| Session | Login path | Identifier | Initial password |
|---|---|---|---|
| Brand Admin, Demo Brand | `/brand-admin/login` | `admin123@gmail.com` | `admin123` |
| NCC Super Admin | `/super-admin/login` | `admin123@gmail.com` | `admin123` |
| Second Brand Admin | `/brand-admin/login` | `admin2@gmail.com` | `admin123` |
| Partner | `/service-provider/login` | `9000000001` | `password123` |
| Customer | `/login` | `9876543210` | `password123` |

With local stub OTP, use the backend-logged code. `123456` is the non-production
default unless `MOCK_OTP_CODE` is explicitly configured differently. Use the
configured OTP delivery/code in staging.

## 2. Prepare one brand and a suitable partner

In NCC Super Admin:

- [ ] Open **Brands** and check that the test brand is active and its readiness
  checklist is complete.
- [ ] Enable brand warranty intake and the test category in **Warranty
  Catalogue**. Ensure at least one selectable complaint issue exists.
- [ ] In **Warranty Catalogue → Brands**, select the brand and its covered
  products. **Select all products** is available if it covers every active
  category. Enable customer listing and save. Repeat for each brand tested.
- [ ] In **Warranty Catalogue → Policies & Serials**, select that brand and
  create its approved warranty policy. **Brand default** applies across its
  covered products; category/type/model rules can override it. Import serials
  if registry validation is required. Existing brands need actual approved
  terms; restored login access alone does not configure warranty coverage.
- [ ] In **Brand Rates**, select that brand and configure both brand charges
  and partner payouts for the test product/service/location. Confirm effective
  dates. Catalogue policy/rate counts help identify missing setup, but one row
  does not prove complete coverage for every product or service area.
- [ ] Have an active partner with the matching category expertise, matching
  service area/pincode and availability **Available**. For the default demo
  partner, use Lucknow and a matching supported category, or explicitly change
  the partner's test service area.
- [ ] On the desktop Partner dashboard, check **Job availability**. Go online
  and allow browser location when prompted. NCC → **Service Provider Accounts**
  should show **Available** within about 10 seconds; go offline and verify
  **Offline** without reloading NCC. Search by name, ID, phone, email or skill.
  Availability is separate from the account's Active/Pending status.
- [ ] Check brand authorization. If active brand-authorized partners exist,
  allocation restricts offers to that authorized set.
- [ ] Confirm the Super Admin test user can open **Brand Billing**.

In Brand Admin:

- [ ] In **Warranty Settings**, configure a policy for the category/model,
  including warranty duration, required invoice/serial, covered service,
  labour/parts and any serial-registry requirement.
  If NCC configured it above, verify the same policy here instead of creating
  a duplicate. Check serial imports in **Warranty Settings → Serial Registry**.
- [ ] In **Call Rates & Charges**, configure an active rate for the same
  category/service and city/state as the complaint. Set an effective date
  before completion. Use a different national/state rate if testing precedence.
- [ ] Confirm GST, payment terms, SLA and the parts-approval threshold.
- [ ] In **Users & Roles**, create individual CCE, Warranty Executive, Spare
  Parts and Finance users with employee IDs. Preserve the Brand Super Admin.

Keep the Brand ticket detail open during partner actions. Changes should arrive
without manually refreshing the page.

## 3. Run both complete journeys

### 3A. Customer-originated Partner Warranty → Brand Panel → closure

Keep four separate sessions open. Start from the Customer panel and keep the
same master claim open in Brand and NCC once it is submitted. Use a product
inside the configured warranty period and an eligible partner's service area.

| ID | Session and exact action | Expected result / evidence |
|---|---|---|
| C01 | Customer: log in at `/login`; open **Partner Warranty** (`/partner-warranty`) | Warranty category groups, brand search and **My Warranty Claims** load from the configured catalogue |
| C02 | Type at least two characters into **Search brands**; choose the intended brand. Also check the appropriate category-group route | Enabled Active brand appears; disabled brands are unavailable; group results respect the group's product coverage |
| C03 | Select the product, then its complaint issue | Products belong to that brand's configured coverage; issues belong to the selected product; the request form identifies the correct brand/product/issue |
| C04 | Upload **Bill / Invoice**, **Warranty Card**, **Product Photo**, and any permitted additional proof/video | Wait for each upload to finish; files appear as attached; upload errors are visible; no file disappears when completing the other fields |
| C05 | Enter **Model Number**, **Serial Number**, **Purchase Date**, and **Description of Issue** | Values match the physical product and policy; purchase date is in the past; use the unique customer-flow serial recorded above |
| C06 | Choose a saved visit address or add a new one. Use **Use my live location**, allow permission, review the detected street/state/city/pincode, then **Choose / drag map pin** and confirm the exact doorway. Alternatively select a serviceable state/city and enter the street/pincode manually. Tick the visit-location confirmation; optionally choose preferred visit date/slot | Numeric coordinates and the confirmed address are retained. State/city choices come from active NCC service cities. A denied GPS permission shows an actionable message; an untouched default map centre cannot be confirmed as the customer's location. Preferred visit is a request, not a confirmed appointment |
| C07 | Click **Raise Ticket** once; record the success-page ticket number; open **My Warranty Claims** (`/partner-warranty/claims`) | One master claim appears under Active. ID uses the current year, e.g. `NCCW-2026-…` when tested in 2026; source is NCC App. Refresh/relogin retains it |
| C08 | NCC: open **Partner Warranty / Warranty Claims** and find the recorded number before Brand approval | Claim is already visible to NCC with matching brand, customer, product, issue, location, proof and submission time; no linked NCCJ service job yet |
| C09 | Brand: open **All Tickets / Pending Approval** or its warranty-claims queue; find that number and open its detail. Repeat the search in the second brand session | Correct brand receives it automatically, without forwarding or re-entry. Brand ticket number, customer/product/proof and preferred visit agree with Customer/NCC. Second brand cannot see it. It has not auto-approved |
| C10 | Brand: **Request More Information** with a specific request. Customer: open the same claim from My Warranty Claims, attach additional proof, enter a response and click **Send to brand** | Customer sees the request/status and notification; Brand receives the response and attachment on the same claim. No new master ticket is created; relevant warranty verification is re-evaluated |
| C11 | Brand Warranty Executive: review the proof and approve the claim using the valid coverage decision | Actor, time and remarks are recorded. One separate NCCJ service job links to the existing NCCW claim. Customer status advances; approval does not create another complaint |
| C12 | Partner: open the warranty offer and accept. Compare Customer tracking, Brand detail and NCC detail | Brand/product/issue/location and job ID match. Eligible partner is assigned; all three monitoring views update. Record the NCCJ number and partner name |
| C13 | Partner: schedule the visit, start travel, arrive and record diagnosis. Customer: open **Track this ticket** from claim detail | Confirmed appointment and accepted partner appear; tracking advances through visit/travel/service stages. Brand and NCC show corresponding stages live. Keep tracking open to check updates without refresh |
| C14 | Partner: request a part. Brand/NCC: perform the required approvals and dispatch. Partner: receive and install it | Shared ticket shows parts progression and responsible actors. Customer sees only customer-relevant updates/approvals, not internal notes or partner payout data |
| C15 | Partner: complete repair and required completion/billing steps; Customer supplies the completion OTP when requested | Service becomes completed and eligible for customer confirmation. Customer must not see a closed claim before its closure action; Brand's completion monitor contains the job |
| C16 | Customer: use completion confirmation in Track Ticket and submit a rating if offered | Claim becomes Closed in Customer, Brand and NCC; moves to Past in My Warranty Claims; closure and any rating persist after relogin |
| C17 | Brand/NCC: complete steps 11–14 in 3B below for this customer-originated claim | Frozen charges, invoice, receipts, reports and actor history reconcile to this claim. Billing is not limited to Brand-created complaints |
| C18 | Partner/NCC: complete steps 15–17 in 3B below for this claim | B2B2C earnings show the configured partner payout, separate manual settlement works once, and warranty earnings stay outside the withdrawable wallet |

Record Pass/Fail/Blocked for C01–C18 in section 7. If testing Request More
Information separately, run C10 on a second claim and retain the same-claim
response evidence. Do not count a different claim's response as a pass.

### 3B. Brand-originated complaint → service → billing and partner settlement

Create a **new** complaint with the Brand-flow serial. This proves Brand
registration as well as the customer-originated flow in 3A. For C17/C18, reuse
the customer-created claim instead of registering it again.

| Step | Perform | Expected result |
|---|---|---|
| 1. Register | Brand → Register Complaint → search mobile → choose an existing profile or create a new customer; enter product, address, issue, invoice/photos and preferred visit | One master NCCW ticket and one brand ticket number; source, Registered By, employee ID, CCE and time recorded |
| 2. Approval gate | Choose ordinary Register, not Register & Approve; open All Tickets/Pending Approval | Pending approval; no NCCJ service job before approval |
| 3. Review | Open customer, product, model, serial, purchase date, attachments and warranty result | Details match entry; no manual re-entry between screens |
| 4. Approve | Warranty Executive approves as Warranty; if the test has incomplete proof, use Goodwill with a justification | Approval actor/time/remarks recorded; linked NCCJ job created once |
| 5. NCC visibility | Super Admin → Brand Tickets → find the same master ticket | Matching customer, brand, warranty, address, SLA, approval and linked job IDs |
| 6. Allocation | Partner opens the offered job and accepts | Brand shows Finding/Offered/Assigned; partner identity appears after acceptance; no manual duplicate job creation |
| 7. Visit | Partner starts travel, arrives and records diagnosis | Brand/NCC show En Route → Reached → Diagnosis live; actor-stamped timeline grows |
| 8. Parts | Partner requests a part with number, price and quantity; Brand approves if required; NCC approves/dispatches; Partner receives and installs | Each independent approval and Dispatch → Received → Installed is visible on the same ticket |
| 9. Complete | Partner completes repair and the completion/billing steps; enter the customer's completion OTP when requested | Completed → Customer Confirmation; frozen billing line captured; Service Completion Monitor includes the job |
| 10. Confirm | Customer confirms completion and optionally rates | Closed in Brand, NCC and Customer views; closure/report/rating recorded; line becomes billable |
| 11. Invoice | NCC → Brand Billing → choose brand and a period containing the closure date → Draft → review → Issue | One invoice with the correct call rate, approved brand-payable parts, adjustments and GST; Brand Billing displays it |
| 12. Payment | NCC Finance records a partial receipt, then the remainder | Brand Payments shows history; paid and pending amounts update; fully settled invoice becomes paid |
| 13. Reports | Brand → Reports → State/City billing; filter to the test dates, service, state and city; export CSV/XLSX | Calls and billing reconcile to the completed ticket/invoice; downloaded files contain real matching rows |
| 14. Audit | Brand → Audit Log and ticket activity | Registration, approval, partner/parts updates, completion, closure, invoice and payment can be traced to actors/timestamps |
| 15. Partner earnings | Partner → Earnings → Invoice payout / B2B2C summary | Completed warranty job appears as unsettled with the configured partner payout; totals by brand/product match; warranty earnings do not increase the withdrawable balance |
| 16. Manual partner settlement | NCC → B2B2C Payouts → select partner and completed jobs → enter the actual test payment reference → settle | One settled Invoice payout links every selected job; jobs leave the unsettled worklist; partner summary/history updates and a notification/audit is recorded |
| 17. Settlement restrictions | Attempt to settle the same jobs again; check partner withdrawal | Repeat settlement is rejected without another payout; warranty earnings remain outside the withdrawable wallet |

Steps 15–17 are separate from the brand invoice and receipt in steps 11–12.
Use staging payment references for test settlements. Record both the brand's
invoice/receipt IDs and the partner's payout ID.

Partner and Customer sessions are required to prove onsite progress and customer
confirmation. The two administrative panels monitor/manage those actions; using
only those panels cannot establish the entire client journey.

### Billing example

With a ₹450 service rate, one installed approved brand-payable part at ₹120,
18% GST and no additional charges:

- Subtotal: ₹570
- GST: ₹102.60
- Invoice total: ₹672.60
- After a ₹200 receipt: paid ₹200, pending ₹472.60

Use the configured values for your actual test. A parts request alone is not a
billable installed part. Completion captures charges; closure makes them
billable. Monthly automation drafts invoices; NCC Finance still issues them
and records payments.

## 4. Customer, Brand Panel and shared scenario checks

### 4A. Customer warranty validation, tracking and privacy

Use disposable additional claims for reject/hold/cancel cases; do not reuse a
closed or rejected claim to prove the successful journey.

- [ ] **C-V01 — Required fields:** attempt submission without invoice, model,
  serial, purchase date, visit address or location confirmation. The form
  identifies the missing input and creates no claim. Warranty card/photo may
  be optional in the form; attach them in the main journey to verify delivery.
- [ ] **C-V02 — Invalid values:** try a future purchase date, invalid pincode
  and a preferred date outside the offered range. Correct the values and
  verify the form can then proceed; invalid attempts create no claim.
- [ ] **C-V03 — Upload errors:** use an unsupported/oversized file according
  to the displayed upload limits. Verify a visible error and the ability to
  replace it with a valid file. Do not submit while uploads are pending.
- [ ] **C-V04 — Duplicate product claim:** submit the same brand/serial while
  its original claim is open. Expect a duplicate message/reference, with no
  second master ticket or service job.
- [ ] **C-V05 — Catalogue isolation:** disable a test brand or remove a test
  product from its coverage in NCC. Refresh the customer catalogue; that
  choice must become unavailable. Restore test setup afterwards. Use an
  unsubmitted disposable form for stale-selection checks.
- [ ] **C-V06 — Customer ownership:** log in as Customer B and try Customer
  A's claim-detail and tracking URLs. Expect access denied/not found, with no
  A customer details, documents or timeline. My Warranty Claims contains only
  the logged-in customer's claims.
- [ ] **C-V07 — Internal-data privacy:** add an internal Brand/NCC note and
  settle a partner payout. Customer detail/tracking must not display internal
  remarks, rates/margins, partner payout amounts or internal audit data.
- [ ] **C-V08 — Info response:** request additional proof, respond as its
  customer and verify the same claim updates in Brand/NCC. Another customer
  cannot respond. A failed upload must not appear as successfully attached.
- [ ] **C-V09 — Rejection:** reject a fresh claim with a reason. Customer
  sees the rejection and customer-facing reason; no service job is created.
- [ ] **C-V10 — Hold/resume and rescheduling:** check the customer-visible
  status after a hold/resume and the confirmed visit after a reschedule.
  Preferred date alone must not override the partner's confirmed appointment.
- [ ] **C-V11 — Closure and persistence:** confirm completion only when the
  action becomes available. Refresh/relogin; Closed/Past, documents and the
  timeline remain correct. Repeating confirmation must not duplicate jobs,
  billing lines or rating records.
- [ ] **C-V12 — Notifications:** check in-app events for submission, info
  request, approval, assignment, visit and completion as applicable. Test
  actual SMS/WhatsApp/push delivery separately only with configured staging
  providers; an in-app notification alone does not prove external delivery.
- [ ] **C-V13 — Saved address add/edit:** open `/saved-addresses` or
  **Change location → Add new address / edit saved addresses**. Add an address
  using live GPS; verify state/city/pincode and readable street. Drag the map
  pin, confirm and save. Reload, edit again and verify the exact coordinates
  persisted. Change state/city manually and verify the old pin is cleared.
- [ ] **C-V14 — Location failure/coverage:** deny browser location permission.
  Verify the message and the manual city/map option. Only NCC's configured
  service states/cities may be selected. Check that the default map centre
  cannot be saved without selecting a pin. If reverse geocoding fails, verify
  stale details from the previous pin are not reused.
- [ ] **C-V15 — Pin propagation:** raise a new warranty claim with the saved
  pinned address. Compare customer claim, Brand/NCC detail and the accepted
  partner's navigation destination. Latitude/longitude must match the saved
  pin. Editing a saved address later does not silently rewrite an existing
  claim's submitted service-address snapshot.

### 4B. Brand Panel modules, roles and connected data

- [ ] **B01 — Access:** Brand Super Admin sees its intended menus. CCE,
  Warranty Executive, Operations, Spare Parts and Finance accounts see only
  their permitted actions. Test direct URLs/API access as well as menus.
- [ ] **B02 — Registration and Customer 360:** search an existing mobile,
  reuse the profile, create a new customer's complaint, and view both the
  Customer-originated and Brand-originated ticket histories with attachments.
  The employee ID and individual registering CCE are recorded.
- [ ] **B03 — Sources and queues:** test Toll-Free and Manual alongside NCC
  App intake; use the documented simulator for WhatsApp/API. Source filters,
  Pending Approval and All Tickets point to the same master records. Only
  explicitly configured eligible Toll-Free/Manual sources may auto-approve.
- [ ] **B04 — Policy and proof:** test an in-warranty product, an expired
  product and missing/required serial-registry proof. Verify the selected
  policy/version and verification result; changes to policies must not rewrite
  existing ticket snapshots. Overrides need permission and a justification.
- [ ] **B05 — Decisions:** approve, reject with reason, request information,
  hold/resume, set priority and record contact/callback on separate suitable
  tickets. Check actor/time/remarks and matching customer-visible updates.
- [ ] **B06 — Unified detail and live operations:** customer, product, proof,
  warranty, approval, linked job, accepted partner, visit, diagnosis, photos,
  parts, activity, closure and billing agree across the ticket sections.
  Partner updates arrive without manual refresh.
- [ ] **B07 — Parts and returns:** verify required approvals, dispatch,
  receipt/installation and a legitimate return's tracking/verification. A
  rejected or uninstalled request must not become a billable installed part.
  Foreign job/provider references are denied.
- [ ] **B08 — SLA and escalations:** check due time, warning/breach,
  responsible user, escalation level and a resolution note. A recorded Re-QC
  request remains pending until its escalation is resolved.
- [ ] **B09 — Rates:** test category/service and city → state → national
  precedence, effective dates and rate-edit permissions. Verify NCC's partner
  payout separately. A later price change must not change frozen job charges.
- [ ] **B10 — Billing and dues:** use both journey tickets to verify invoice
  lines, approved parts, adjustments, GST, due dates, partial/full receipts,
  pending/paid totals and payment history. Reject duplicate references and
  overpayment without changing balances.
- [ ] **B11 — Dashboard and reports:** compare source/product/location/SLA
  and billing totals with the recorded test tickets. Filter the exact test
  dates, state, city and service; exported rows must match the filters and
  include all matching pages, with no second-brand records.
- [ ] **B12 — Completion and documents:** check completion timestamp, rating,
  pending feedback/QC, pagination, CSV export and generated document preview,
  HTML download and Print / Save PDF. See section 5 for the detailed repairs.
- [ ] **B13 — Access management:** create a restricted role/user with an
  employee ID, change its permissions and verify effective access after
  reloading/relogging. Department/team and audit changes must be visible;
  retain a working Brand Super Admin account.
- [ ] **B14 — Brand isolation:** use Brand B to try Brand A's customer,
  ticket/job, invoices, receipts, reports, documents, replacements, returns,
  audit and settings. Expect no A data. NCC is permitted all-brand visibility.
- [ ] **B15 — NCC configuration scope:** edit policy/serial setup for Brand A
  in Super Admin and check it appears only in A. Brand B and its pricing,
  policy and users remain unchanged. Repeat using a different product scope.
- [ ] **B16 — Legacy provider skill:** use a qualified partner with the
  display-name skill `AC Repair` and a warranty job using catalogue key `AC`.
  Go online in its approved service area and verify the offer appears. A
  Refrigerator/Electrician-only partner must not qualify for AC warranty work.

### 4C. Shared alternate paths and restrictions

- [ ] **NCC App source:** Customer raises a Brand/Partner Warranty complaint
  with invoice, photo/video and preferred visit. Brand receives everything in
  Pending Approval, with source NCC App. It must not auto-approve.
- [ ] **Manual source:** Register a Brand Manual ticket; verify it uses the
  same queue, IDs, approval and lifecycle as Toll-Free.
- [ ] **Existing customer:** Register another complaint from the same mobile;
  reuse the customer profile and confirm both tickets in Customer 360.
- [ ] **Reject:** Rejection without reason is blocked. A valid rejection is
  recorded and creates no NCC job. A new approval attempt cannot silently
  resurrect the rejected ticket.
- [ ] **Hold/resume:** Put a pre-approval ticket on hold, check its history and
  paused SLA, then resume it.
- [ ] **Request information/document:** Request an invoice or additional
  information; customer sees the request, responds and Brand sees the response.
  Verify pre-approval warranty re-evaluation.
- [ ] **Contact/callback/reschedule:** Record contact, request a callback and
  reschedule. After partner acceptance, check the partner's accept/reject
  response and the confirmed slot in both panels.
- [ ] **No partner:** Temporarily make all suitable test partners unavailable.
  The ticket remains visible for allocation intervention rather than being
  falsely assigned. Restore availability and test retry.
- [ ] **Declined offer:** Partner declines an offer; the attempt/reason is
  recorded and another suitable partner is offered the job when available.
- [ ] **Parts controls:** Reject a part request; confirm it cannot be installed
  or billed as an approved part. Test a threshold that requires brand approval.
- [ ] **SLA:** Configure short test SLAs, create a ticket and leave it pending.
  Check near-breach/breach escalation, responsible user, due time and resolution
  note. The scheduler checks every five minutes; a page countdown alone is not
  proof that the escalation sweep ran.
- [ ] **Restricted CCE:** Log in as a CCE. Registration/communication works;
  approval, pricing, billing, users and settings are denied unless explicitly
  permitted. Check direct page URLs as well as hidden menus.
- [ ] **Second brand:** Log in as the second brand. Search the first brand's
  customer/ticket/invoice, try its ticket detail URL and check reports. No
  first-brand data should be exposed. NCC Super Admin may see both brands.
- [ ] **Rate precedence:** A city rate overrides the state/national rate.
  Change a rate after completion; already captured charges remain unchanged.
- [ ] **Payment errors:** Duplicate receipt references and overpayment are
  rejected without altering balances or creating extra receipts.
- [ ] **WhatsApp readiness:** Use Settings → Integrations and the documented
  intake API/simulator to create a WhatsApp ticket; replay its idempotency key
  and confirm one pending ticket. This verifies the backend, not a live bot.

## 5. Check the repaired areas

- [ ] Completion Monitor: today's India-date filter excludes older completions;
  displayed partner and completion time are correct; later edits do not change
  the completion date.
- [ ] Create more than 20 completions. Page through them; KPI totals cover the
  full search result and CSV includes every matching row, not just page one.
- [ ] Open a completed job, enter a Re-QC reason and submit. Check the saved
  escalation and pending-QC state. Resolve it and verify that the open review
  is cleared. The action requires `escalations:manage`.
- [ ] Replacement Approvals: export and open the real filtered CSV.
- [ ] Documents: generate, preview, download HTML and open Print / Save PDF.
  Choose the browser's PDF destination. After a later job change, the generated
  snapshot stays unchanged. Check that another brand cannot retrieve it.
- [ ] Missed-run billing recovery and injected auto-approval settings: run the
  automated billing/ticket regression tests below. Avoid altering system time
  or production data to simulate these cases manually.
- [ ] Linked-reference isolation: using a second-brand job ID, attempt a
  replacement creation as the first brand through the API. Expect 404. A
  partner unrelated to the selected job must be rejected. Verify the first
  brand's replacement list, CSV, returns and document views reveal no
  second-brand job/customer/partner information. Use the operations regression
  below to exercise inconsistent legacy records without inserting them into
  the manual-test database.
- [ ] Super Admin policy scope: select each test brand in **Policies & Serials**,
  create/version a policy and import serials. Only the selected brand should
  receive the changes. A Brand Admin must be denied the Super Admin endpoints.
- [ ] Payout failure recovery: run `partnerWarrantyPayout.test.js` below. It
  injects payout, job-update and audit failures and verifies full rollback,
  clean retry, overlapping-batch concurrency and transaction requirements.
  Do not interrupt a real database or payment to simulate these failures.

## 6. Automated verification

MongoDB must be running as a local replica set. Supply its actual URI/name;
the commands below assume `rs0` on port 27017. Use separate test databases.
Playwright starts its own backend/frontend test servers. Its setup/teardown
seed and delete test fixtures; do not point it at your manual walkthrough DB.

From `backend`, run the focused client acceptance/fix suite:

```sh
MONGODB_TEST_URI='mongodb://127.0.0.1:27017/nigam_care_test?replicaSet=rs0' npm test -- --runTestsByPath tests/brandCrmJourney.test.js tests/brandCrmOperations.test.js tests/brandCrmBilling.test.js tests/brandCrmTicket.test.js tests/brandCrmIntake.test.js tests/brandCrmRbac.test.js tests/brandAdmin.test.js tests/partnerWarrantyPayout.test.js tests/brandCrmWarrantyPolicy.test.js tests/partnerWarrantyCatalog.test.js --testTimeout=60000 --forceExit
```

From `e2e`, run the focused browser checks:

```sh
E2E_MONGODB_URI='mongodb://127.0.0.1:27017/nigam_care_e2e_ui?replicaSet=rs0' E2E_UI_PORT=5299 npm run test:ui -- adminWarranty.spec.js brandCrmJourney.spec.js brandCrmOperations.spec.js brandCrmQueue.spec.js partnerAppWarranty.spec.js warrantyJourney.spec.js --workers=1
```

For provider duty status and customer GPS/map-pin capture, run from `e2e`:

```sh
E2E_MONGODB_URI='mongodb://127.0.0.1:27017/nigam_care_e2e_location?replicaSet=rs0' E2E_UI_PORT=5299 npm run test:ui -- locationAvailability.spec.js partnerWarranty.spec.js --workers=1
```

The address integration test mocks Google SDK responses and device coordinates;
also manually check the real Google map and your browser's location permission.
See [provider/location fix evidence and retest steps](PROVIDER-LOCATION-FIXES-2026-10-15.md).

For the full repository regression, run these separately from their respective
directories:

```sh
# backend
MONGODB_TEST_URI='mongodb://127.0.0.1:27017/nigam_care_test?replicaSet=rs0' npm test -- --testTimeout=60000 --forceExit

# e2e: HTTP API suite
E2E_MONGODB_URI='mongodb://127.0.0.1:27017/nigam_care_e2e?replicaSet=rs0' npm test -- --workers=1

# e2e: browser suite
E2E_MONGODB_URI='mongodb://127.0.0.1:27017/nigam_care_e2e_ui?replicaSet=rs0' E2E_UI_PORT=5299 npm run test:ui -- --workers=1
```

Use a sufficiently high MongoDB file-descriptor limit on macOS. Large runs
have previously hit the default limit; a database crash is not evidence that
the application scenarios passed. Full browser suites also regenerate some
walkthrough screenshots in the repository; review those file changes.

## 7. Acceptance record

Copy this table into your test notes and add one row for every C01–C18,
C-V01–C-V15, B01–B16 and shared/fix scenario. An unchecked box is untested,
not a pass.

| Scenario ID | Tester / role | Brand / product | Expected result | Actual result | Pass / Fail / Blocked | NCCW / brand ticket / NCCJ | Invoice / receipt / partner payout | Screenshot / defect link |
|---|---|---|---|---|---|---|---|---|
| C01 | | | | | | | | |
| B01 | | | | | | | | |

Record build/commit, database/environment and test date once at the top of
the notes. Sign off customer intake/tracking and Brand Panel acceptance
separately; completing only one journey does not pass both flows.

For each scenario record: pass/fail, master ticket number, brand ticket number,
NCC job number, invoice number, payment reference, screenshots and any defect.
Check results after refreshing/relogging as well as during live updates.
Keep client confirmations Q1–Q5 separate from technical pass/fail results.
