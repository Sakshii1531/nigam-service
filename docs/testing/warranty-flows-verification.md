# AMC and warranty flow verification — 17 October 2026

Verification uses isolated local test databases on a MongoDB replica set, the real Express API, and the customer/admin/brand/partner React applications in Chromium. Production data was not changed.

| Flow | Verified behavior |
| --- | --- |
| AMC | Admin catalogue plans and AC brands; Silver selection; checkout cancellation and verified payment; retained invoice, installation date and pincode; profile plan, benefits and visit allowance; covered quotes/bookings; correct partner job type; covered parts and zero service billing; completion OTP; one allowance deduction per completed visit; retried completion; visit history; exhausted allowance returning to paid pricing. |
| Extended warranty | New appliance registration and existing appliance lookup; category-specific brands and packs; server-owned price/duration/claims; verified payment and payment retries; recorded plan name and expiry; explicit appliance selection when the customer owns two ACs; covered quote/booking; completed repairs; claim deductions and exhaustion. |
| Partner brand warranty | Customer submission/documents; brand isolation and permissions; approval, rejection and information requests; admin visibility; partner dispatch, decline, timeout and acceptance; scheduling and rescheduling; diagnosis; parts approval, customer consent, fulfillment and installation; revisits; OTP completion and customer sign-off; synced statuses, audit trail, notifications, webhook signatures, SLA and manual settlement. |
| Cross-flow checks | Unpaid/expired coverage, wrong categories and appliances, another customer's appliance, exhausted visits/claims, inactive plans, generic-plan discovery, invalid signatures/OTP, duplicate approval/settlement attempts. |

Backend verification passed **322 tests across 23 suites**, plus **17 focused admin tests across 2 suites** (100 unrelated admin tests were excluded by the name filter). The live-server Playwright API run passed **31 tests**. The final Chromium run passed **8 browser journeys**, including the expanded invoice, profile-benefits and multiple-appliance checks. The frontend production build and changed-file lint checks pass with no lint errors; existing lint and bundle-size warnings remain.

The verification found and corrected:

- Profile's hardcoded Gold fallback, incorrect saved checkout brand, and the Benefits action opening rewards instead of the purchased plan.
- Coverage depending on a partner-brand account, instead of matching the purchased appliance/brand/category; inconsistent coverage checks between appliance status, quote and booking.
- Extended-warranty registration unwrapping an already-unwrapped API response, packs shown for the wrong category, and incorrect plan/expiry display.
- Missing AMC visit history due to reading the subscription reference from the wrong job field.
- Non-idempotent purchase verification and sequential job-completion retries; retries now retain one payment, one deduction and one earnings credit.
- AMC invoice/date/pincode being collected but discarded, and duplicate checkout clicks while a purchase is processing.
- A job-save hook updating the partner warranty claim halfway through a parts action on standalone MongoDB, causing an optimistic-concurrency conflict.
- Any-appliance plans disappearing from appliance selection when no category-specific plan existed. Generic plans now include active catalogue product categories.

Razorpay Checkout is simulated in the browser tests. Orders, purchase records and HMAC signature verification use the real backend test gateway. No real card/UPI charge, external SMS/push delivery or production deployment was performed. Transactional approval and settlement checks require replica-set MongoDB; standalone settlement remains refused by design.

Existing production purchases with incorrect saved brand/category or missing payment confirmation need separate data reconciliation; these tests do not rewrite historical records.

To reproduce, use an isolated local test replica set via `MONGODB_TEST_URI` (backend) and `E2E_MONGODB_URI` (Playwright), then run:

```sh
# In backend/
npm test -- --testTimeout=60000 --testPathPattern='amcWarrantyJourney|partnerWarranty|smartWarranty|warrantyEngine|plansAdmin|appliances|serviceProviderJob|brandCrmParts|brandCrmWarrantyPolicy|brandCrmBilling|brandCrmJourney'
npm test -- --testTimeout=60000 --runTestsByPath tests/superAdmin.test.js tests/brandAdmin.test.js --testNamePattern='AMC|warranty|Warranty|claim|Claim'

# In e2e/
npm test -- appliances.spec.js smartWarranty.spec.js partnerWarranty.spec.js serviceProvider.spec.js --workers=1
RAZORPAY_KEY_ID=rzp_test_e2e_stub npm run test:ui -- amcExtendedWarranty.spec.js warrantyJourney.spec.js partnerWarranty.spec.js brandWarranty.spec.js adminWarranty.spec.js partnerAppWarranty.spec.js --workers=1
```
