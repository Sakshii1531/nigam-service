# Customer protection plans and service requests

Account → AMC Plan (or an existing protection membership) now opens a full, refreshable plan detail route: `/protection-plans/amc/:id` or `/protection-plans/extended-warranty/:id`. `/buy/my-warranty` remains a supported entry to the protection list. The list shows the actual purchased plan name, recorded category/brand/model, expiry, payment/coverage state and remaining allowance. It no longer substitutes a generic comprehensive plan or water-purifier benefits.

The detail page shows the recorded covered appliance, plan benefits, validity, allowance used/remaining, previous and ongoing service requests and recorded AMC visit tasks/notes. A purchase without a linked saved appliance displays its recorded brand/category/model and explains the limitation; it does not label every appliance in the customer's registry as covered. Removing a saved appliance does not silently transfer its protection to another unit. Service history uses explicit policy references and ownership, not category matching. History also includes older jobs explicitly linked to the policy even if their service request predates policy references, while retaining customer ownership checks. History is paginated in batches of 100. Legacy AMC visit records are displayed separately (latest 100); the purchase's allowance counter remains authoritative.

## As a customer

1. Open the purchased plan and choose **Schedule AMC service** or **Schedule warranty service**. Optionally describe the issue.
2. Choose the applicable catalogue service, date and address. Review the covering plan name, order number and covered amount before confirming. The requested policy is checked again by the server; an expired, unpaid, exhausted, foreign or mismatched policy is refused instead of replaced by a different policy.
3. Confirm the booking. The server saves a real Booking and ServiceRequest. It appears in Bookings and in the plan's service history; NCC super-admin operations and the area's ASM can see the request. This is the existing NCC service workflow, not a separate customer financial-claim approval queue.
4. NCC uses its existing service-area, category and eligibility rules to match a technician. Track the real assignment and service status in Bookings. An instant search follows the existing 30-minute search/expiry rules; no two-hour acceptance promise or fabricated appointment is shown.
5. The allowance decreases when the covered job is completed through the existing job lifecycle. Cancelling a booking does not consume an allowance. Spare parts or excluded work can require separate approval/quotation.

Partner-brand warranty uses the separate Partner Warranty module: choose the brand, submit the issue/evidence, the brand reviews the ticket (or requests more information), and after approval NCC arranges the service. It remains a brand ticket in the brand panel and a warranty claim in super-admin. It is not redirected into the AMC flow.

## Coverage identification and safety

`catalog/quote` now includes a customer-safe `coverageSource` (kind, purchase ID, plan name and human order number). The booking page names AMC, NCC extended warranty or manufacturer coverage in the breakdown and in an always-visible coverage panel. Without an explicitly chosen purchase the existing priority remains extended warranty → AMC → manufacturer warranty. Choosing a policy for a service request deliberately pins that policy; only one unit/line is accepted. New service requests retain only the policy reference actually used.

All detail/history requests require an authenticated customer and an owned purchase. History excludes private completion OTPs and payout metadata. Older service requests that accidentally referenced both policies are filtered against the actual booking coverage type.

The old client-only claim form and random `NCC-CLM` success ticket have been removed. Legacy claim/detail URLs return customers to their purchased plans to select the actual purchase. No historical fake tickets are created or migrated.

Benefits are taken from the existing admin-managed AMC plan or the extended warranty order's saved coverage; no new contractual cover is invented. Existing invoice verification, eligibility, pricing, assignment and job-completion rules remain in place. The backend still determines actual service coverage; the personal warranty dates in My Appliances do not grant free service.

## Checks

- `backend/tests/protectionDetails.test.js`: ownership, safe plan/history responses, lifecycle states, selected-policy enforcement, named coverage, real booking/cancellation and history pagination.
- `e2e/ui/protectionPlans.spec.js`: account-to-detail navigation without a popup, refreshable plan data, real mobile coverage panel, explicit AMC selection with an active extended warranty, persisted issue/booking, visibility to NCC operations, cancellation/history and responsive plan cards.
- Frontend CI runs protection, appliance and GST browser journeys. Backend CI's four Jest shards include the protection integration tests.
