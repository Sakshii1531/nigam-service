# Brand CRM walkthrough: complaint to payment

This is a click-by-click walkthrough for checking one complaint across the
Brand Panel, NCC Super Admin, Partner App and Customer App. Keep the same ticket
open in both administrative panels and compare it after every action.

The shorter acceptance checklist and automated test commands are in
[MANUAL-TEST-CHECKLIST.md](MANUAL-TEST-CHECKLIST.md).

## Super Admin setup for all brands and products

Complete this setup before testing with real accounts. The controls work for
any brand; the two accounts checked on 15 October still need their actual
warranty terms and approved charges entered.

1. Log in to **NCC Super Admin**. In **Warranty Catalogue**, configure **Groups**
   and **Issues** for every product customers should be able to select. A
   covered product with no active issues cannot complete the claim form.
   Open **Warranty Catalogue → Brands**
   (`/super-admin/partner-warranty/catalogue?tab=brands`). Click the intended
   brand. Use **Select all products** if it covers every active catalogue
   product, or tick only its covered products. Enable **List this brand in the
   customer app’s Partner Warranty**, then **Save**. Repeat for each brand.
2. Open **Policies & Serials** in Warranty Catalogue. Select the brand and
   click **New policy**. Choose **Brand default** to cover all products in
   that brand's coverage, or choose a category/type/model for a narrower rule.
   Enter the approved warranty months, parts/labour coverage, covered services,
   exclusions, proof/serial requirements and visit charges, then **Save policy**.
   A more specific product/type/model policy takes precedence over the default.
   **New version** preserves the terms already snapshotted on existing tickets.
3. If serial-registry validation is required, switch to **Serial Registry**,
   select a CSV, **Preview import**, fix errors and **Import valid serials**.
   The selected brand owns these serials. NCC can prepare policy/serial setup
   for a Pending brand before activating it.
4. Open **Brand Rates** (`/super-admin/brand-rates`). Select the same brand.
   Configure approved brand charges and partner payouts for every relevant
   product/service, plus state/city overrides and effective dates. CSV import
   supports preparing multiple rate rows. A policy is not a price table.
5. In **Brands**, configure the brand's billing/GST/payment terms and review
   its readiness checklist. Configure **Partner Eligibility** and **Warranty
   SLA** from the Partner Warranty menus for the intended service area.
6. Return to **Warranty Catalogue → Brands**. Current policy/rate counts show
   missing setup at a glance; a nonzero count alone does not establish that
   every product, service or geographic area has a matching rule.
7. Use the customer panel to select each enabled brand/product and submit a
   claim. Confirm it appears in NCC and only the selected brand. Continue the
   approval → linked job → partner → closure → billing walkthrough below.

Brand owners can still manage their own policy/serial setup under **Warranty
Settings**, prices under **Call Rates & Charges**, and access under **Roles &
Permissions**, **Users** and **Teams**. NCC manages platform-side partner
eligibility and manual B2B2C settlement. Brand invoice receipts and partner
settlement remain separate; warranty earnings are not withdrawable wallet funds.

Use the actual approved business values. This walkthrough does not prescribe
one warranty duration, price or GST treatment for every brand/product.

## Before starting: resolve the existing-account access restriction

The screenshot showing **Access restricted** and an empty sidebar means the
login succeeded, but the account has no effective permissions for these pages.
It is not evidence that the password is wrong.

On 13 October 2026, database inspection confirmed that the reported account
had a pre-CRM **Brand Admin** role with no permissions. The existing demo
Brand Admin had obsolete permission keys.

A targeted repair is prepared in
`backend/scripts/repairLegacyBrandAdmin.js` and verified by the 22-test RBAC
suite. It previews by default, requires both an email and expected brand ID,
refuses roleless/custom/restricted staff and foreign-brand references, and
records an audit entry when assigning the owner role.

**Current state:** following explicit user approval, the targeted repair was
applied on 13 October 2026 to the reported account within its own brand and the
demo account within Demo Brand. Both resolve **Brand Super Admin**, all **43
Brand CRM permissions**, and one audited role-repair entry each. Other staff
accounts were not assigned owner roles.

After the approved repair:

1. Sign out of the Brand Panel.
2. Allow up to 60 seconds for a running backend's permission cache to expire.
3. Sign back in with the same account and password.
4. Check that the sidebar contains Dashboard, Complaint Management, Service &
   Operations, Finance & Billing and Administration.
5. Open Dashboard and Register Complaint. The owner account should have access.

For any other account, inspect its intended role before changing access. CCE,
Finance, Viewer and other restricted roles must retain their intended limits.
Do not disable access checks to hide this screen.

## Where to manage access after signing in

| Purpose | Panel and navigation | Path |
|---|---|---|
| Add brand staff, assign roles/departments, activate/suspend staff | Brand → Administration → User & Role Management → Users | `/brand-admin/users` |
| Create/edit a brand role's module/action permissions | Same screen → Roles & permissions | `/brand-admin/users` |
| Organize departments, teams and team leads | Brand → Administration → Teams & Departments | `/brand-admin/teams` |
| Review role/user changes | Brand → Administration → Audit Log | `/brand-admin/audit-log` |
| Create/manage a brand's administrator login, brand assignment, status and temporary password | Super Admin → Brand Administrators | `/super-admin/brand-administrators` |
| Configure platform role permissions, including Manage Billing | Super Admin → Roles & Permissions | `/super-admin/roles` |

### Change a brand staff member's access

1. Sign in as the restored Brand Super Admin.
2. Open **Administration → User & Role Management → Users**.
3. Find the staff member and click the pencil **Edit** action. To create one,
   use **Add user** and enter their name, employee ID, department, sign-in email,
   phone and initial password.
4. Select the intended role checkboxes, such as Customer Care Executive,
   Warranty Executive, Service Operations, Spare Parts, Finance or Viewer.
5. Click **Save** (or **Add user** for a new account).
6. Have the staff member sign out/back in; allow up to 60 seconds for another
   running backend process's permission cache to expire.
7. Verify both the visible menus and direct page URLs using that staff login.

### Change what a role permits

1. On **User & Role Management**, switch to **Roles & permissions**.
2. Open **Edit** for the intended role, or **New role** for a custom role.
3. Check the applicable module/action boxes: View, Create, Edit, Approve,
   Export and other module-specific actions.
4. Click **Save role**.
5. Verify the result using an account assigned that role.

Role changes affect all users assigned that role. If someone has multiple roles,
their granted permissions combine. Departments organize staff; role permissions
determine access. Brand Super Admin always has every brand permission, users
cannot edit their own role assignments, and the last active Brand Super Admin
is protected from removal.

Brand staff permissions are managed in the Brand Panel. Super Admin's **Roles &
Permissions** screen manages platform roles; **Brand Administrators** manages
the brand-login accounts rather than the granular brand permission matrix.

## 1. Open four separate sessions

Use four browser profiles or different browsers. Separate profiles prevent
testing the wrong identity accidentally, especially when checking restrictions.

Assuming the frontend runs at `http://localhost:5173`, open the paths below on
that origin. Replace the origin with the URL printed by your frontend server.

| Session | Login path | Fresh seeded identifier | Initial password |
|---|---|---|---|
| Brand Admin | `/brand-admin/login` | `admin123@gmail.com` | `admin123` |
| NCC Super Admin | `/super-admin/login` | `admin123@gmail.com` | `admin123` |
| Partner | `/service-provider/login` | `9000000001` | `password123` |
| Customer | `/login` | `9876543210` | `password123` |

These are seed defaults, not password resets. Existing accounts can have
different passwords. If using your own Brand Admin login, use its own brand
throughout; do not mix its tickets, rates or policies with Demo Brand.

For local stub OTP, use the backend-logged code or the configured local test
code. The non-production default is `123456` unless `MOCK_OTP_CODE` overrides
it. Use the configured OTP provider in staging.

**Check:** all four sessions open the correct portal with the expected identity.

## 2. Check the environment and test brand

Use a separate local/staging test database. Invoice and receipt writes require
MongoDB replica-set transactions; standalone MongoDB returns 503.

If the app is not already running, start `npm run dev` inside `backend`, then
`npm run dev` inside `frontend` in another terminal. Check that the frontend API
origin points to this backend and that backend CORS allows the frontend origin.
Do not run seed/reset scripts against your existing application database just
to follow this walkthrough: the seed script clears notifications.

In **Super Admin**:

1. Open **Brands**.
2. Locate the brand belonging to your Brand Admin session.
3. Confirm that the brand is **Active** and review its readiness checklist.
4. Open **Warranty Catalogue**.
5. Enable warranty intake and include **AC** in the brand's coverage.
6. Ensure an AC complaint issue exists and is selectable.
7. Confirm that the NCC Finance test user has `billing:manage` and can open
   **Brand Billing**.

**Check:** this brand can accept AC complaints, and the required finance screen
is available. An NCC Super Admin title alone does not guarantee finance access.

## 3. Prepare an eligible partner

In **Super Admin → Service Providers**:

1. Open the intended test partner. The seeded partner is Rahul Sharma.
2. Confirm **Active** status.
3. Confirm **AC** is among the partner's skills.
4. Confirm the partner serves the complaint's city/pincode.
5. Check brand authorization: when active brand-authorized partners exist,
   allocation restricts offers to that authorized set.

In the **Partner dashboard**, choose **Go Online (Accept Jobs)** if offline.
Confirm the partner is **Available** rather than Busy or Offline.

For the default seeded partner, use **Lucknow, Uttar Pradesh**, unless its
service area has been changed. Use a pincode actually served by that partner.

**Check:** a suitable partner is active, available and geographically eligible.
If no suitable partner exists, the expected result is allocation intervention,
not a successful assignment.

## 4. Configure warranty and pricing

In **Brand Admin → Warranty Settings**:

1. Open or create the policy matching AC and the test model/product type.
2. Set an appropriate warranty duration.
3. Check whether invoice, serial number or serial-registry proof is required.
4. Ensure repair is covered and check labour/parts coverage.
5. Save the policy.

In **Call Rates & Charges**, create or verify this active rate:

| Field | Example |
|---|---|
| Category | AC |
| Service type | `repair` |
| State | Uttar Pradesh |
| City | Lucknow |
| Brand call rate | ₹450 |
| Effective date | Before the test completion |

Use the geography configured for your actual partner if it differs. Check GST
and payment terms. The arithmetic later in this walkthrough assumes **18% GST**.
For a parts test requiring brand approval, set the parts-approval threshold to
**0**, meaning all brand-payable requests require that approval.

**Check:** policy, rate, service and geography match the complaint you will create.

## 5. Search the customer

In **Brand Admin → Register Complaint**:

1. The registration wizard starts at **Search**.
2. Enter `9876543210` in **Mobile number** if using the seeded customer.
3. Click **Find customer**.
4. If the brand already knows the customer, select the existing profile.
5. If shown **Existing NCC customer, new to [brand]**, reuse that customer and
   supply the visit address/product. Do not create a second account.
6. Click **Continue**.

To test a genuinely new customer separately, use a test number you control. The
wizard should show **No customer found. Create their account with this ticket.**
Enter the name and continue.

**Check:** mobile lookup determines whether an existing identity should be reused.

## 6. Enter address and product

At **Customer and address**:

1. Select an existing visit address or **Enter a visit address**.
2. Enter House / street, City, State and a six-digit Pincode.
3. Example house/street: `12 Test Road`.
4. Use Lucknow/Uttar Pradesh only if that matches the prepared partner/rate.
5. Click **Next**.

At **Product**:

1. Select **Product category → AC**.
2. Select **Service type → repair**.
3. Select the relevant product type if present.
4. Choose an existing registered product or add a new one.
5. Enter the model number, unique serial number such as `QA-AC-001`, and a recent
   purchase date within the configured warranty period.
6. If serial-registry verification is required, use a registered test serial.
7. Click **Next**.

**Check:** customer, visit address, product and warranty proof all correspond.

## 7. Enter the complaint and review it

At **Complaint**:

1. Select the issue, such as a cooling fault; use **Other** if appropriate.
2. Set **Priority → Normal** for the first journey.
3. In **Description**, enter `AC is running but does not cool the room.`
4. Optionally select a preferred visit date, slot and notes.
5. Under **Source**, select **Toll-Free**.
6. Upload a test **Bill / Invoice** and **Product Photo**. Add a warranty card
   or video if testing those attachments.
7. Wait for uploads to finish, then click **Review ticket**.

At **Review**, verify customer, address, product, source, issue, documents and
the warranty result. Missing proof may legitimately show verification required;
do not treat incomplete proof as verified warranty.

**Check:** every field matches your input and uploaded documents open correctly.

## 8. Register and verify the approval gate

1. Click ordinary **Register**. For this scenario, leave **Register & Approve**
   for a separate shortcut test.
2. In **Ticket registered successfully**, record the **Master ticket** and
   **Brand ticket** numbers.
3. Confirm the result says **Pending Approval**.
4. Click **View ticket**.
5. Check source, Registered By, employee ID, assigned CCE, creation time and SLA.

**Check:** there is one master ticket, and there is no NCCJ service job before
approval. Keep the master ticket number for every following search.

## 9. Approve the complaint

In **Brand Admin → Pending Approval**:

1. Open the recorded ticket.
2. Review the customer, location, model, serial, purchase date and attachments.
3. Check the warranty/policy result.
4. Click **Approve**.
5. Choose warranty coverage if verified. If intentionally testing incomplete or
   non-covered proof, choose **Goodwill — brand pays** and give a justification.
6. Enter meaningful approval remarks and click **Approve claim**.
7. Record the linked **NCCJ job number**.

**Check:** approval actor, employee ID, date/time and remarks are recorded. One
linked job is created and allocation begins; no manual duplicate registration
in NCC is needed.

## 10. Compare the ticket in Super Admin

In **Super Admin → Brand Tickets**:

1. Search for the recorded master ticket.
2. Open it.
3. Compare brand, customer, address, product, warranty, approval and SLA with
   Brand Admin.
4. Compare the master ticket, brand ticket and NCCJ job numbers.
5. Inspect allocation attempts and current job stage.

**Check:** both panels refer to the same complaint and linked job. Leave both
detail pages open while progressing the Partner App.

## 11. Accept and visit the customer

In the **Partner session**:

1. Find the offered job and open it.
2. Check the ticket/job numbers.
3. Click **Accept Job**.
4. Check the customer, product, address and documents now available to the
   accepted partner.
5. Follow the active-job travel and arrival controls.
6. Record the diagnosis.

After each action, watch the Brand and NCC ticket detail without reloading.

**Check:** Finding/Offered → Assigned/Accepted → En Route → Reached → Diagnosis
appears with new timeline entries. The administrative panels do not replace the
partner's onsite actions; a Partner session is necessary for this part.

## 12. Request and approve a spare part

In the Partner job's **Warranty spare parts** section:

1. Click **Request spare part**.
2. Enter these example values:

| Field | Value |
|---|---|
| Part name | Fan Motor |
| Part number | `QA-FM-001` |
| Quantity | 1 |
| Unit price | ₹120 |
| Part source | Partner Brand |

3. Click **Submit part request**.
4. Check that the Brand ticket shows **Parts Required**.

In **Brand Admin → Spare Parts Management → Part Requests**:

1. Open **Awaiting brand approval**.
2. Find the request using its ticket/part number.
3. Check name, number, quantity, price, technician and payer.
4. Click **Approve**, enter remarks, then **Confirm approve**.

**Check:** Brand approval is Approved. NCC approval remains independent. For the
example bill, the installed part must be brand-payable under policy/goodwill.

## 13. Fulfill, receive and install

In **Super Admin → Part Requests**:

1. Find the same part request.
2. Confirm any required Brand approval is complete.
3. Approve the NCC request.
4. For procurement, use **Mark Dispatched** and the delivery controls when
   applicable. For warehouse stock, the workflow uses **Ready to Hand Over →
   Handed Over** instead.

In the **Partner job**:

1. Click **Mark part received** when the part is physically received in the
   test workflow.
2. Click **Mark installed** after installation; upload a photo if required.
3. Follow any revisit travel/arrival steps before final repair completion.

**Check:** the same ticket records independent approvals and fulfillment,
Received and Installed milestones. A dispatched part is not yet installed.

## 14. Complete service and obtain customer confirmation

In the **Partner job**:

1. Complete the repair and submit the service report/photos as required.
2. Follow the remaining completion/billing screens.
3. Enter the customer's completion OTP when requested.
4. For the covered warranty/goodwill repair, verify customer payable is ₹0.
   The brand's call rate is not a charge to collect from the customer.

In the **Customer session**:

1. Open the complaint and its tracker.
2. Review the completion status.
3. Confirm completion.
4. Submit a rating/feedback if available.

**Check:** Brand/NCC/Customer show Completed → Customer Confirmation → Closed.
Service evidence, confirmation and closure are recorded. Completion captures
charges; closure makes the line billable.

## 15. Draft and issue the brand invoice

In **Super Admin → Brand Billing**:

1. Select the same brand.
2. Check that the closed call appears in the unbilled/billable lines.
3. Set **Period from** before the closure timestamp.
4. Set **Period before (exclusive)** after closure, for example tomorrow.
5. Click **Draft invoice**.
6. Inspect the call, rate, installed approved brand-payable parts and GST.
7. Record the invoice number.
8. Click **Issue invoice**.

With the example rate/part, 18% GST and no additional charges:

| Calculation | Expected |
|---|---:|
| Service rate | ₹450 |
| Approved installed brand-payable part | ₹120 |
| Subtotal | ₹570 |
| GST | ₹102.60 |
| Invoice total | **₹672.60** |

Use configured amounts if they differ. In **Brand Admin → Invoices & Billing →
Invoices**, locate the same invoice.

**Check:** invoice identity, call count, line items and totals agree in both
panels. Monthly automation creates drafts; NCC Finance still issues invoices.

## 16. Record and reconcile payments

In **Super Admin → Brand Billing**, open the invoice:

1. Click **Record payment**.
2. Enter **Amount (₹) → 200**.
3. Select the applicable payment mode.
4. Enter a unique reference such as `QA-PAYMENT-001`.
5. Click **Save**.

In **Brand Admin → Payments/Billing**:

1. Check paid amount **₹200**.
2. Check pending amount **₹472.60** for the example invoice.
3. Open payment history and check the reference.

Record the remaining ₹472.60 in NCC with another unique reference.

**Check:** the invoice is paid, balance is ₹0, and both receipts remain visible.
The Partner App's completion step is separate from NCC's brand payment receipt.

## 17. Check reports, audit and repaired controls

### Reports and dashboard

1. Brand → **Reports → State/City billing**.
2. Select the test dates, service, state and city.
3. Reconcile call count and amount with the closed ticket/invoice.
4. Download and open CSV/XLSX.
5. Open Dashboard and check the relevant completed/billing/payment KPIs.
   A paid invoice may cease contributing to pending-payment totals.

### Activity and audit

1. Open the ticket's activity history and **Audit Log**.
2. Trace registration, approval, allocation, partner updates, parts, completion,
   confirmation, closure, invoicing and receipt recording.
3. Confirm actor, employee ID where applicable, timestamp and remarks.

### Completion monitoring and Re-QC

1. Open **Service Completion Monitor → Completed Today**.
2. Check partner, recorded completion time and the completed job.
3. Export CSV and inspect its content.
4. Open job details, enter a Re-QC reason and submit.
5. Check the saved request in **Escalations** and the pending-QC state.
6. Resolve the escalation with a meaningful note.

Re-QC requires `escalations:manage`; exports require `reports:export`. On a
larger test dataset, create over 20 completions, page through them and verify
that KPIs/export cover all matching jobs, not just the current page.

### Documents and replacement export

1. In **Letter & Document Center**, select the job and document type.
2. Click **Generate Document Preview**.
3. Check customer, brand, job and recorded status.
4. Use **Download document (HTML)** and open the downloaded file.
5. Use **Print / Save PDF**, then choose the browser's PDF destination.
6. After a later job edit, check that the generated snapshot remains unchanged.
7. In **Replacement Approvals**, export a filtered CSV and inspect the file.

**Check:** downloads contain data, print controls invoke printing, and Re-QC
actually persists rather than merely showing a success message.

## 18. Check alternate paths on separate tickets

| Scenario | Action | Expected |
|---|---|---|
| NCC App source | Customer submits Brand/Partner Warranty complaint with proof and preferred visit | Same central ticket; Pending Approval; no automatic approval |
| Manual source | Register with Manual Entry | Same IDs, queue and lifecycle; source correctly recorded |
| Existing mobile | Register another complaint from the same customer profile | One customer, multiple linked complaints |
| Reject | Try without a reason, then provide reason code/remarks | Missing reason blocked; valid rejection recorded; no NCC job |
| Hold/resume | Hold a pre-approval ticket, then resume | History and SLA pause/resume recorded |
| Request document/info | Request invoice/info; customer responds | Request visible to customer; response and pre-approval warranty re-evaluation visible to Brand |
| No eligible partner | Make suitable test partners unavailable | Allocation failure/intervention visible, no false assignment |
| Offer declined | Partner declines an offer | Attempt/reason recorded; another eligible partner considered |
| Parts rejected | Reject a part request | No installation/billing as an approved installed part |
| SLA | Configure short test clocks and leave a ticket pending | Warning/breach escalation with responsible/due time; resolution requires a note |
| CCE restrictions | Use individual CCE login and direct finance/settings URLs | Allowed registration/communication; prohibited actions denied |
| Brand isolation | Log in as a second brand and try the first brand's IDs | No first-brand ticket, customer, invoice or report data |
| Rate freezing | Change pricing after completing a job | Captured completed-job charges stay unchanged |
| Payment validation | Try duplicate reference and overpayment | Rejected without corrupting balance/history |

The SLA escalation sweep runs every five minutes. Monthly invoice recovery and
legacy injected auto-approval settings are also covered by automated billing/
ticket regressions; use those tests rather than changing system time or live
data. WhatsApp backend readiness is tested through the documented intake
API/simulator; a production chatbot is a separate integration.

## Record the result

| Item | Record |
|---|---|
| Tester / date / build / environment | |
| Brand and customer | |
| Master ticket number | |
| Brand ticket number | |
| NCC job number | |
| Invoice number | |
| Payment references | |
| Failed step / screenshot / actual behavior | |

The main flow passes when IDs remain linked, panels agree, updates and history
are present, and billing/payments/reports reconcile after refresh and re-login.
Record technical results separately from the client's outstanding Q1–Q5
business-rule confirmations.
