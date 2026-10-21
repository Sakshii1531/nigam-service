# Provider onboarding

The implemented journey is:

Application and Aadhaar upload → area ASM interview/category decisions → super-admin final approval → provider kit checkout → captured payment → packing/shipping → parcel receipt-code verification → eligible for jobs → provider chooses Go Online.

## Screens

| Portal | Page |
| --- | --- |
| Provider | `/service-provider/onboarding` — status, requested/approved categories, documents, resubmission, timeline |
| Provider | `/service-provider/kits` — provider-only kits, multi-item checkout, order history, payment recovery, receipt code and delivery help |
| Super admin / ASM | `/super-admin/provider-onboarding` — area-scoped applications and full provider journey |
| Super admin | `/super-admin/provider-kits` — kit contents, qualification flag, selling price, shipping and stock |
| Super admin | `/super-admin/provider-kit-orders` — payment, packing insert, courier/tracking, receipt exceptions and full refunds |

These pages are linked in the admin sidebar and the provider profile. The old Pending-provider approval/rejection buttons now open onboarding review.

## Release-one rules

- Aadhaar front/back and a recorded background review are required. PAN is not represented as verified unless actually reviewed; additional document requirements can be added after operations supplies its checklist.
- Applicant login is enabled, but work access stays blocked. Requested categories never populate active `specs`.
- ASM must record a decision/reason for every requested category and approve at least one category to pass the interview.
- Super admin may confirm or reduce the interview-approved set. Adding a category requires reassessment.
- A super admin conducting the ASM interview must record an exception reason. Final approval is a separate action.
- Kit prices are tax-inclusive; shipping is configured per kit. Online prepaid checkout only. No customer-store kits, COD or user-supplied totals.
- Multiple kits can be purchased in one order. Release one fulfils the order in one parcel; split shipments and partial refunds are not supported.
- One paid qualifying onboarding kit, with verified receipt, enables all approved service categories. Optional kits do not enable jobs or grant categories.
- Marking Delivered does not unlock jobs. The provider must enter the parcel code, or super admin must record an evidenced receipt exception.
- Readiness does not switch availability on automatically.
- Refunding the only qualifying kit blocks new work. Other paid/verified qualifying kits and valid legacy exemptions remain effective. Existing jobs/history are retained.

## Setup and operations

1. Use a MongoDB replica set. Registration, review, checkout/stock, payment settlement, receipt activation and refund transitions use transactions; financial operations refuse a standalone deployment.
2. Configure the existing `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Payments must be captured before fulfilment. The frontend uses the existing Razorpay checkout helper; the backend verifies signature, order, amount, currency and captured state.
3. Set `PROVIDER_KIT_WEBHOOK_SECRET` and register `/api/v1/provider-kit-payment-webhook` with the gateway for `payment.captured` and `refund.processed`. The webhook validates the original request-body signature. Provider order screens also offer payment recovery for missing browser callbacks; admin order screens offer refund recovery.
4. Configure Cloudinary for production identity-document storage. New Aadhaar uploads use authenticated assets and authorization-scoped, short-lived signed download links. Public uploads are not used for new KYC documents. Local development stores encrypted documents in ignored `backend/.private-kyc/`; optionally set `PROVIDER_KYC_DIR` and a stable `PROVIDER_KYC_KEY`.
5. Set a stable `PROVIDER_RECEIPT_KEY` for packing-code encryption. A strong existing JWT secret is the fallback. Do not rotate this key while unshipped packing inserts still need printing without planning regeneration/support handling.
6. Publish at least one qualifying, positive-priced kit and configure stock/shipping. Kit price changes do not change existing order snapshots. Stale stock edits are rejected after reservations change availability.
7. Give the area's ASM `techs:view` and `techs:manage`. Applications are scoped by canonical City. Unknown/inactive service cities are rejected at signup so applications cannot silently land in the wrong area. A configured city without an ASM remains visible to super admin, who can use the recorded interview exception.
8. Pack the receipt-code insert inside the paid parcel before Mark Shipped. Plaintext packing codes are available only to super admin while Packed, and are removed from storage when shipped. Provider responses never expose the code/hash.
9. Wrong receipt codes are rate-limited with a 15-minute lock after five failures. Delivery help creates a manager-visible notification and order event.
10. Pending checkout reservations expire after 30 minutes and are released by the existing dispatch sweep. Late captured payments become PaymentReview and can be refunded by super admin; they never activate the provider.

A gateway failure during refund initiation leaves RefundPending rather than blindly retrying a financial request. Check refund status through the reconciliation action and, when no gateway refund is found, investigate the gateway record before taking further action.

## Migration

Server startup records a legacy exemption for existing Active providers with no onboarding policy version. It moves old Pending applications into ASM review, retaining their documents and valid category mappings, and enables restricted applicant login. Obsolete category labels are recorded in the timeline and move the applicant to Changes Requested for correction. Migration is idempotent. The legacy exemption and pending migration writes are recorded/transactional; no kit payments or interviews are fabricated.

Both public and admin production creation paths write policy version 1. New applicants cannot request or inherit legacy status through an API. Direct activation is blocked until the named review transitions are completed. Existing providers' active categories remain their recorded specialties; no generalist access is inferred.

Review the existing records before rollout; unresolved old category labels need correction and resubmission. Inactive accounts remain inactive.

## Backend boundaries

- `modules/provider-onboarding`: lifecycle, kit catalog/orders, payments, receipt verification, refunds, private KYC and eligibility.
- Shared eligibility is used by online availability, provider ranking, manual assignment, job feeds and acceptance, instant socket acceptance and new-provider add-ons.
- New open-offer notifications are dispatched only to eligible providers in the matching category/area. Cancellation and onboarding notifications remain available separately.
- New-provider acceptance and receipt/refund eligibility changes serialize on the provider record. Review revisions reject stale decisions.
- Customer commerce remains separate; kit orders reuse the Payment ledger with target type `provider_kit_order`.

## Verification

Backend coverage is in `backend/tests/providerOnboarding.test.js`; browser coverage is in `e2e/ui/providerOnboarding.spec.js`. They exercise the full journey, category restrictions, area access, document review, duplicate settlement, stock/expiry, webhook validation, receipt ownership/lockout, refunds and legacy exemption.

Verified locally on 19 October 2026:

- All 13 dedicated onboarding integration tests passed, including paid delivery activation, category restrictions, ASM scope, stock concurrency, refunds/payment callback replays and legacy migration.
- All 14 assignment ranking tests passed after replacing the previous generalist fallback contract with category authorization.
- Existing booking (42 tests), admin provider (25 tests) and provider job (46 tests) suites passed in focused runs.
- Focused AMC/extended-warranty lifecycle, partner warranty journey/allocation (19 allocation tests) and cancellation suites passed.
- All 9 browser tests passed across onboarding, provider jobs and cancellation. Desktop and mobile screenshots were inspected.
- Frontend production build passed. Backend/frontend lint reported no errors; existing warnings remain.

The complete backend suite is **not certified green**. The initial long process reached Node's heap limit after 42 suites; a smaller follow-up batch encountered database connection/setup timeouts during system pauses. Focused onboarding, assignment and booking reruns passed. Do not treat the interrupted broad run as a successful full regression.

Browser tests stub the external payment widget and use the real backend signature-verification path. They do not submit live charges, real courier shipments or production identity documents.

See [the implementation plan](IMPLEMENTATION_PLAN.md) for the original design and follow-on scope, including split shipments, configurable additional document requirements and reassessment campaigns.
