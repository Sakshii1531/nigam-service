# Service provider onboarding implementation plan

Status: core journey implemented. See [the implementation notes](README.md) for current behavior, configuration, verification and release-one scope. This document retains the broader design and follow-on requirements.

## 1. Agreed business flow

A provider applies, submits documents and requests service categories. Their area's ASM reviews the documents, contacts them manually, conducts an interview and approves only the categories demonstrated in that interview. The application then moves to super admin for final approval. Approval activates the provider account for the next onboarding steps, but does not grant access to jobs.

After final approval, the provider buys one or more kits inside the provider app, supplies shipping details and completes payment. Super admin processes and ships the order. **Jobs unlock only after successful payment and verified receipt of at least one qualifying onboarding kit.** Buying an optional kit does not satisfy this requirement.

Confirmed decisions:

- Super admin may conduct the interview when the area's ASM is unavailable. This is an explicit, audited exception with a mandatory reason; final approval is still a separate action.
- Existing active providers remain eligible through a recorded legacy exemption. New applicants follow the complete process. The migration must not invent interviews, kit orders or payments for legacy providers.
- ASM and super admin can inspect the complete journey. ASM access is restricted to their area.

Example: a provider requests AC, CCTV, washing machine, bathroom and electrical work. ASM approves AC and washing machine. Super admin confirms those two categories. After payment and verified kit receipt, the provider can receive AC and washing machine jobs only. The other three remain visible as requested but not approved.

## 2. Findings in the current repository

| Existing component | Current behavior | Required change |
| --- | --- | --- |
| `serviceProviderRegistration.routes.js` and provider `Apply.jsx` | Public multipart application; Aadhaar front/back uploads; selected service labels go directly into `specs`; creates Pending/Offline provider and Pending user | Separate requested categories from approved categories; authenticate applicants into a restricted onboarding workspace; validate required documents server-side |
| `adminServiceProvider.service.js` and `.routes.js` | ASM and super admin share the generic status endpoint; either can set Active; approval marks pending KYC checks Verified | Replace approval with explicit interview and final-review transitions; make document decisions independent |
| `auth.service.js` | Provider status is copied into User status during identifier lookup; Pending users cannot log in | Separate permission to sign in from permission to work; remove the status-copy behavior for onboarding accounts |
| `serviceProvider.service.js` and `.validation.js` | Provider may update `specs`; online toggle checks only Active | Remove self-editing of approved work categories; add authoritative eligibility checks |
| `assignmentEngine.js` | Active/Available filter; ordinary jobs can still rank a generalist without the exact category; warranty matching is stricter | Require approved category and onboarding eligibility for every job type, before scoring |
| Job service, manual assignment and instant-booking socket gateway | Separate paths can offer/assign/accept jobs | Enforce the same eligibility rule in every path, including direct API/socket calls |
| ASM directory and provider directory | Area relationship is derived from City; fallback free-text city matching exists | Resolve applications to a canonical service area, preserve routing history and expose unallocated applications to super admin |
| `buy-commerce` and admin Orders | Customer products, order status, stock and payment patterns already exist | Reuse infrastructure where appropriate, but introduce provider-only kit catalog and orders |
| Payment gateway helper and frontend `razorpayCheckout.js` | Gateway order creation and checkout-signature verification exist | Reuse helpers; implement kit-specific settlement, callback recovery, idempotency and delivery gating |
| Notifications and AuditLog | Existing stored notifications, sockets and actor-stamped audit records | Add onboarding, interview, kit fulfilment and activation events |

Important current gaps: the registration backend does not enforce both Aadhaar files as required; PAN/background statuses exist although this registration route uploads only Aadhaar; approval currently turns pending document statuses into Verified automatically. The new implementation must not present an unreviewed or unsubmitted document as verified.

## 3. Separate account access, qualification and job eligibility

Do not overload `status = Active` to mean all three things.

1. **Authentication:** an identity-verified applicant can sign in to their own application, document resubmission, status, notifications and help pages. Suspension still blocks access according to the existing security policy.
2. **Qualification:** ASM interview and super-admin final approval determine which categories they may perform. Final approval can set the ServiceProvider record Active, while availability remains Offline.
3. **Dispatch eligibility:** the provider may receive or accept work only after all onboarding requirements are met.

Recommended rule for new applicants:

```text
eligibleForNewJobs =
  account is not suspended
  AND provider operational status is Active
  AND required documents are verified
  AND current interview revision is approved
  AND super admin approved that same revision
  AND approved categories are non-empty
  AND a qualifying kit has settled payment and verified receipt
  AND no active onboarding restriction exists

eligibleForThisJob =
  eligibleForNewJobs
  AND job category belongs to approved categories
  AND existing area, warranty-brand and service-area rules pass

eligibleForAutomaticOffers = eligibleForThisJob AND availability is Available
```

A valid legacy exemption satisfies the new onboarding qualification and kit gate for the migrated population, including the new document checklist and review revisions. It preserves their historical approval without inventing document verification or interview records. It does not override operational status, suspension, service-area rules, category authorization or availability.

Keep a queryable eligibility projection on ServiceProvider for fast shortlist filtering, with a reason code, policy version and revision. Maintain it through one domain service. Recheck current authoritative state when claiming/accepting work; a JWT, cached frontend state or projected boolean alone must not grant access.

Receipt verification makes the provider eligible but leaves them Offline. They deliberately choose Go Online. The app shows “You're ready to receive jobs—go online” after activation.

## 4. Application and interview lifecycle

Use a review lifecycle separate from kit order/payment state:

| Review state | Owner/action | Provider experience |
| --- | --- | --- |
| Draft | Provider completes profile/documents | Continue application |
| ASM review | Submission is routed to area's ASM and visible to super admin | Application submitted; waiting for contact |
| Interview scheduled | ASM records date, contact attempt and instructions | Interview details visible |
| Changes requested | Reviewer specifies missing documents/details | Correct and resubmit |
| ASM rejected | ASM records interview outcome and reason | Rejection reason and support/reapplication route |
| Super-admin review | ASM passes interview with an explicit category list | Interview passed; final approval pending |
| Super-admin rejected | Super admin records rejection or returns it to ASM | Reason and next action visible |
| Approved | Super admin approves the exact reviewed revision | Buy onboarding kit |

Derive subsequent journey labels from the approved application and kit facts: Kit required → Payment pending → Paid/processing → Shipped → Receipt verification required → Ready for jobs. Keep suspension as an operational restriction, rather than changing a shipping or payment record.

Rules:

- Submission must contain an active service city, at least one active catalog category and all required documents.
- Record every requested category as Approved, Not approved or Reassessment needed. Passing requires at least one approved category. Store reviewer, interview time, method, notes and decision reason.
- Approvals use canonical Category IDs. Display names are snapshots for history, not authorization values.
- ASM approves a subset of the requested categories. Additional categories require a documented reassessment rather than being added through profile editing.
- Super admin may confirm or reduce the ASM-approved set. Increasing it requires returning to interview/reassessment, including when super admin performs the interview exception.
- Final approval must reference the interview and document revision reviewed. Changed documents or categories invalidate a pending stale approval.
- Rejections and requests for changes are separate decisions. Define a resubmission path; do not erase previous attempts.
- The manual contact/interview happens outside the app. The app records its scheduling, contact attempts and result; video calling is not required for the first release.
- Applications without a resolvable area/ASM remain in an “Unallocated” super-admin queue. Notify operations; never silently lose them or grant approval by default.
- The super-admin interview exception requires an explicit action and reason. The same super admin may subsequently give final approval, as agreed, but both events are recorded.

## 5. Data model

### ServiceProvider changes

- `approvedCategoryIds`: authoritative categories the provider may work in.
- `onboardingId`, `onboardingPolicyVersion` and a queryable `dispatchEligibility` projection with blocking reason, revision and timestamps.
- Preserve `status` and `availability` as operational fields. Avoid expanding their meaning with kit shipping states.
- `legacyExemption`: source migration, effective timestamp, reason and authorizing release/actor; write-once through a controlled migration, never a public request field.
- Existing `specs` becomes a compatibility projection of approved categories while callers migrate. Providers cannot write it.

### ProviderOnboarding

One current application aggregate per provider, with versioned review attempts:

- Provider reference; review state; policy version; submission/revision timestamps.
- Requested categories and original label snapshots.
- Service area, assigned ASM, routing history and reassignment reason.
- Document records: type, private storage reference, revision, submitted time, reviewer, decision and reason.
- Interview attempts: schedule/contact attempts, actor, method, outcome, per-category decisions, notes and any super-admin exception reason.
- Final review: actor, decision, reason and exact approved interview/document revision.
- Qualifying kit evidence references, activated time and current blocking reasons.
- Optimistic revision for concurrent/stale review detection.

### ProviderKit

A dedicated provider-only catalog:

- SKU, name, description, images, contents and optional kit type/category tags.
- Selling price, currency, shipping charge rule, applicable tax configuration and stock/reservations.
- `qualifiesForOnboarding`, active/published state, display order and catalog revision.
- Historical orders keep the product description, price and qualification flag captured at purchase. Later catalog edits must not rewrite them.

Initial policy: any one qualifying onboarding kit unlocks all interview-approved categories. Category tags help discovery; they do not silently add a separate per-category kit requirement. Additional kits are optional and never add work categories.

### ProviderKitOrder and fulfilment records

- Owner User and ServiceProvider IDs; unique human-readable order ID; checkout idempotency key.
- Multiple line items with kit ID, immutable SKU/name/price/qualification snapshots, quantity and line totals.
- Recipient name, phone and validated structured address snapshot; provider may choose a different shipping address from their service area.
- Server-calculated subtotal, shipping, tax and total.
- Payment reference/state, reservation expiry, cancellation/refund facts.
- Fulfilment records that associate shipped and received quantities with specific lines. This supports partial shipments without treating the whole cart as delivered.
- Courier, tracking reference, packed/shipped times, receipt-verification state and audit history.

Extend Payment's target-type enum with `provider_kit_order`. Reuse the payment ledger and gateway helpers, not the customer order ownership or product visibility rules.

Use separate payment and fulfilment states. Suggested payment states: Pending, Paid, Failed, Refund pending, Refunded. Suggested fulfilment states: Unfulfilled, Processing, Packed, Shipped, Delivered awaiting verification, Receipt verified, Cancelled, Returned. Represent partial fulfilment through line/shipment facts and derive the parent label.

### Onboarding events

Append-only events with provider/application/order references, actor and role, action, timestamp, reason, before/after changes and correlation/idempotency key. Use the existing audit infrastructure for traceability; store/query journey events without exposing private internal interview notes in the provider-facing response.

## 6. Provider app changes

Extend the existing Apply screen and add a persistent onboarding workspace:

1. **Apply:** personal details, verified contact, canonical service area, requested categories, document checklist and submission.
2. **My onboarding:** completed/current/next steps, assigned manager contact where configured, interview schedule, requested versus approved categories and actionable rejection/resubmission messages.
3. **Verification:** real per-document decisions. Remove the fallback that treats pending documents as verified just because the provider is Active.
4. **Kit shop:** visible only inside the provider app; available for purchase after final approval. Show qualifying kits clearly, optional kits separately, stock and final pricing.
5. **Cart/checkout:** select multiple kits/quantities, recipient name/phone/address, review item/shipping/tax totals, then existing online checkout UX.
6. **Kit orders:** payment recovery, order status, courier/tracking, delivery issue reporting and receipt-code entry.
7. **Ready state:** approved categories and Go Online action. Before eligibility, show the exact blocking step instead of an empty jobs screen or a generic “inactive” error.

Route guards and navigation use a server-provided capability summary, for example `canEditApplication`, `canBuyKits`, `canViewOwnOrders`, `canReceiveJobs`, `blockingReasons`. These control presentation; corresponding backend checks remain mandatory.

Pending applicants may access onboarding, their own documents, notifications and support. Finally approved providers awaiting kits may additionally access kit purchasing and their own kit orders. Existing provider settings, job, earnings and inventory routes require an explicit capability policy; removing the login block must not accidentally expose every provider endpoint.

## 7. ASM and super-admin experience

### ASM

- Onboarding queue for their current area, with stages, age, requested categories, document status and interview schedule.
- Provider detail with application, documents, contact attempts and interview form.
- Approve/reject each requested category and submit interview outcome.
- Pass to super admin; request changes; reject with reason.
- Read-only visibility of final approval, kit order/payment/delivery/receipt and job eligibility.
- Journey timeline and filters for Interview pending, Final approval pending, Kit not purchased, Paid awaiting shipment, Receipt pending and Ready.

ASM cannot give final approval, change kit prices, mark payments paid, fulfil shipments or bypass the kit requirement.

### Super admin

Under the existing service-provider/agent administration navigation, add:

- **Provider onboarding:** all applicants; area/ASM/stage filters; unallocated queue; final review and audited interview exception.
- **Kit catalog:** create multiple kits, publish/deactivate, set prices/contents/stock and onboarding qualification.
- **Kit orders:** payment-confirmed work queue, packing, courier/tracking, shipping, delivery issues, returns/refunds and receipt-verification exceptions.
- **Provider journey:** a detail tab on the existing provider directory showing every review, approved category, kit purchase and activation event, including legacy exemptions.

Replace the existing one-click “Approve Partner” buttons for new applicants with stage-specific actions. Administrative creation and generic status changes must follow the same lifecycle; creating an Active provider or reactivating one cannot bypass onboarding.

Operational suspension/reactivation remains separate from initial qualification. Reactivation reevaluates eligibility; it does not manufacture a completed interview or kit purchase.

## 8. Kit payment, shipping and receipt verification

### Checkout and payment

- Prepaid online payment for the initial release; no COD, Cash, wallet/coin shortcut or user-supplied “paid” flag for onboarding kits.
- Calculate totals and qualifying items on the server. Require positive-priced qualifying kits initially; a free-kit exception would need a separate explicit policy.
- Reserve stock atomically for a short, configurable checkout window. Release expired/failed reservations exactly once.
- Gateway calls happen outside database transactions. Use an idempotent checkout record and recovery states for network failures between external calls and persistence.
- The browser success callback alone does not settle an order. Verify the signature against the server-owned gateway order and confirm captured/settled payment, amount and currency through the payment integration.
- Add a verified payment webhook and recovery/reconciliation path for app closure or missing callbacks. Existing warranty webhooks are a different integration and are not a payment webhook.
- Browser callback, webhook and reconciliation converge on one settlement function. Duplicate events must not decrement stock twice or create duplicate orders/activation events.
- Paid orders enter the fulfilment queue. Unpaid checkout attempts remain visible for diagnostics but are not shippable.
- A late captured payment after reservation expiry requires stock reacquisition or a recorded refund/manual-resolution path. Do not silently oversell or activate the provider.

### Recommended receipt verification

Use a random, shipment-bound one-time receipt code packed inside the parcel:

1. Packing generates the code and a printable insert for that shipment. Store a hash; if printing requires temporary plaintext, encrypt it, restrict access and remove it after packing.
2. Provider APIs, notifications and invoices never disclose the code before receipt.
3. Super admin records courier/tracking and ships the paid kit. Admin-marked delivery alone does not grant eligibility.
4. The signed-in order owner enters the code after receiving the parcel. A valid code can verify receipt of that shipped parcel even if manual courier status is late.
5. Check shipment ownership, shipped state, paid order, returned/cancelled quantities, code validity and attempt limits. Record verified quantities and timestamp atomically; consume the code once.
6. If at least one qualifying paid kit is now verified, reevaluate eligibility and send the ready notification.

A missing/damaged code goes to “Delivery verification help.” Super admin may record a verification exception with evidence and a mandatory reason; ASM cannot. Never use a fixed universal code or a bare “I received it” checkbox as the only proof.

For a multi-kit order, receipt of one qualifying kit is sufficient. Optional or unreceived lines remain in fulfilment. Returning/refunding all qualifying kits removes new-job eligibility unless another valid qualifying kit or the agreed legacy exemption remains. Preserve existing work/history and raise an operations decision for work already underway; do not automatically cancel customer jobs because a kit is returned.

Manual courier and tracking entry is sufficient for release one. Automated courier integration can follow later.

## 9. API and backend enforcement plan

Proposed routes; final naming should follow existing router conventions:

| Audience | Proposed operations |
| --- | --- |
| Provider | Existing registration; `GET /service-provider/onboarding`; edit draft/resubmit; protected document upload/download; requested-category reassessment |
| ASM/super admin | List/get onboarding; record contact; schedule/complete interview; request changes/reject; super-admin-only final decision and interview exception |
| Provider | `GET /service-provider/kits`; server quote; create/list/get `/service-provider/kit-orders`; verify/retry payment; verify shipment receipt; report delivery issue |
| Super admin | Kit CRUD/stock; list/get kit orders; fulfilment transitions; tracking updates; refund/return handling; audited receipt exception |
| Gateway | Signature-verified payment webhook feeding the same kit settlement service |

Use named domain transitions instead of accepting arbitrary status patches. Define a complete role/area/state permission matrix and return useful conflict reasons for out-of-order or stale actions.

Add one shared eligibility service and apply it to:

- Online/availability toggle and coming-online backlog assignment.
- Automatic ranking, manual provider suggestions and manual assignment.
- Available-job feeds, targeted offers and their notifications.
- REST acceptance and instant-booking socket acceptance, before claiming a booking.
- Socket feed subscription and subsequent broadcasts when eligibility changes.
- All ordinary, AMC, extended-warranty and partner-brand warranty jobs.
- Category-specific add-on offerings where the provider performs additional work outside the original job category.

The existing instant socket acceptance path directly claims a Booking; it must delegate to the guarded acceptance domain operation rather than retain an independent bypass. Notification and cancellation sockets should stay available to authenticated providers even when new-job offer access is blocked.

Remove `specs` and approved-category fields from self-service write schemas. A provider may request more categories, but only review actions grant them. Preserve warranty brand authorization, geographic limits, availability and capacity rules as additional constraints.

Concurrency: review submission/final approval, kit settlement, receipt confirmation and eligibility changes need expected revisions and idempotency keys. Dispatch acceptance and eligibility revocation must share a transaction/version barrier, so an acceptance cannot commit using eligibility that was revoked concurrently.

Use required MongoDB transactions for payment/stock/receipt/activation writes across collections. The existing transaction helper supports `required: true`; financially significant paths must not silently fall back to unrelated writes on a standalone database. Tests need an isolated replica set.

## 10. Notifications, ownership and exceptions

Emit stored notifications and live updates after successful commits:

- Application submitted → area's ASM and super admin.
- Interview scheduling/changes requested/outcome → provider; interview pass → final-approval queue.
- Final approval → provider, with a Buy onboarding kit action; do not say “you can now receive jobs.”
- Payment confirmed → provider and super-admin fulfilment queue.
- Shipped/delivery action required → provider; updated journey visible to ASM.
- Receipt verified/ready → provider and area manager; availability remains Offline.
- Failed payment, delivery issue, rejection or restriction → relevant owner and next action.

Each decision records actor identity/role, timestamp, reason and reviewed revision. Area reassignment preserves historical actors while current access follows the provider's authorized service area. A shipping address does not change their assigned ASM or service territory.

Handle unavailable ASM, incomplete documents, zero approved categories, concurrent reviews, duplicate applications, out-of-stock kits, abandoned checkout, shipment loss, partial delivery, receipt-code retries and refunds as explicit states with recovery actions.

KYC files require authorized access and protected storage/downloads. Reuse existing file infrastructure only after verifying it meets this access requirement; public upload URLs alone must not grant access to identity documents. Internal interview notes, verification codes and payment secrets never enter general provider/customer responses.

## 11. Migration and rollout

1. Add models/fields/indexes and capability/eligibility services behind a policy flag. Deploy compatible reads before enabling new writes.
2. Run a dry-run inventory of providers by status, area, specialties, documents and active assignments. Map known legacy specialization labels to canonical categories; list unresolved mappings for review rather than approving extra categories by inference.
3. Record the agreed legacy exemption for providers Active at the controlled cutover. Snapshot existing approved scope; retain actual document/payment history without fabricating verification.
4. Existing Pending applications enter ASM review with their submitted documents and requested categories preserved. Inactive providers remain inactive; future reactivation requires explicit evaluation.
5. Publish at least one qualifying kit with stock, price and shipping configuration. Configure payment recovery, receipt-code packing and manager permissions before enforcement is enabled.
6. Pilot the full process in one area with real operational staff and payment test mode. Verify manual contact, packing and delivery-code handling as well as software screens.
7. Enable the new signup policy and enforce its gates across all assignment paths together. Refresh/revoke stale offer subscriptions and pending assignments that no longer qualify.
8. Monitor conversion and blocked-job reason counts; expand rollout. Rollback may pause new onboarding or fall back to status-only views, but must not remove enforcement for applicants who have not completed the mandatory steps.

Legacy exemption is migration-only, not a checkbox any admin can grant to future applicants. If an unknown legacy category cannot be mapped safely, flag it for operations; do not silently authorize every catalog category.

## 12. Delivery work packages

| Package | Deliverable | Exit condition |
| --- | --- | --- |
| 1. Domain and migration design | State transitions, category mapping, permissions, schema/index definitions, legacy dry-run | Agreed lifecycle and no ambiguous authorization fields |
| 2. Restricted applicant access | Signup validation, onboarding login/capabilities, document resubmission and area routing | Pending applicant can track progress but cannot obtain jobs |
| 3. Interview and final approval | ASM queue/form, category decisions, super-admin final review, exception and timeline | Two approvals are enforced; approved category scope cannot be self-expanded |
| 4. Provider kit catalog | Admin creation/stock/pricing and provider-only browsing | Kits are unavailable through customer browsing/search/checkout APIs |
| 5. Checkout and settlement | Multi-kit cart, address, server quote, reservations, payment verification/webhook/recovery | Exactly one settlement per payment; paid orders ready for fulfilment |
| 6. Fulfilment and receipt | Admin order operations, packing code, tracking, partial shipments and verification help | Verified paid qualifying receipt produces one readiness event |
| 7. Dispatch cutover | Shared gate across ranking/manual assignment/feed/socket/acceptance/add-ons | No onboarding or category bypass through any entry point |
| 8. Operational rollout | Migration, pilot, dashboards, regression tests and runbook | Existing active providers continue working; new applicants follow the complete flow |

Build the eligibility service in package 1 and wire guards as the dependent paths are developed. Do not ship the new onboarding UI as complete before package 7. Packages 4–6 may be developed alongside review screens after the shared model and permission contracts are fixed; integration follows their dependency order.

## 13. Test and acceptance plan

### API/domain tests

- Required documents/categories/area validation; duplicate submission and correct ASM routing.
- Applicant can authenticate and read only permitted own data; unrelated roles and other providers cannot access applications or kit orders.
- ASM cannot read another area's applicant, issue final approval or fulfil orders.
- Interview approves two out of five categories; rejected categories never become active specializations.
- Missing/failed interview, unverified documents, stale review revision and zero approved categories block final approval.
- Audited super-admin interview exception follows the same category rules.
- Generic status changes, admin-created providers and self-service profile updates cannot bypass onboarding.
- Final approval without kit, payment without shipment, and admin-marked delivery without provider receipt verification all block jobs.
- Kit totals are server-calculated; customers cannot browse/order provider-only kits by direct API calls.
- Stock races, checkout retries/expiry, failed/late payment, signature mismatch, wrong amount/currency, duplicate callback/webhook and app closure recovery.
- Wrong-owner/code, unshipped order, failed payment, expired/replayed code and brute-force limits do not verify receipt.
- Partial delivery: optional kit first does not unlock jobs; first paid qualifying kit does; outstanding items remain pending.
- Refund/return/restriction reevaluates eligibility correctly and preserves history.
- REST, socket, manual and automatic assignment enforce identical readiness/category rules, including AMC and warranty jobs.
- Concurrent receipt verification or acceptance/revocation cannot double-activate or assign ineligible work.
- Legacy exemption is idempotent, auditable, unforgeable and unavailable to new applicants.

### Browser journeys

1. Provider signup → ASM interview with two of five categories approved → super-admin final approval → multi-kit checkout → admin shipping → provider receipt code → Go Online → allowed job appears.
2. Each intermediate screen explains why jobs are blocked; reloading/logging in preserves progress.
3. Rejection/document resubmission/reinterview and stale final-review handling.
4. Missing ASM → audited super-admin interview exception → normal final approval and kit process.
5. Failed checkout retry; app closure after payment; partial shipment; wrong receipt code; delivery help.
6. Existing active provider retains access through recorded legacy status; suspended provider remains blocked.
7. Customer app never displays kit products; ASM sees journey but cannot edit commercial fulfilment facts.

Retain and adapt existing adminServiceProvider, authentication, provider job, ASM-area, assignment, AMC/EW and partner-warranty tests. Old tests asserting “ASM can set Active and work starts immediately” must be replaced with tests of the new business contract.

### Release acceptance

The release is complete only when the full journey is visible to provider/ASM/super admin; both approvals and approved category scope are enforced; only paid and receipt-verified qualifying kits unlock new jobs; all dispatch entry points respect the same rule; existing active providers are preserved by the agreed migration; and failed payments/delivery issues have tested recovery paths.

## 14. Defaults and follow-up decisions

Confirmed: receipt-based activation, recorded super-admin interview fallback and legacy exemption for existing active providers.

Recommended release-one defaults: prepaid online kits, one qualifying kit required, optional additional kits, manual courier/tracking entry, parcel receipt code, and no automatic kit-refund cancellation of ongoing customer jobs.

Before implementation of the affected package, operations should supply the required-document checklist, kit contents/prices/stock/shipping charges, return/refund policy, receipt-code validity/support rules and any geography finer than the current City-based ASM assignment. These are configuration/business inputs, not reasons to leave the lifecycle architecture undefined.

Enhancements after release one: courier API integration, more complex kit bundles, category-specific kit requirements, interview reassessment campaigns and additional payment methods. Each must preserve the same approval and eligibility boundaries.
