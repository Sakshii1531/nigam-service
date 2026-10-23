# NCC AMC and Shield purchases

## Configuration

- Manage active appliance categories and their offered brands in Super Admin → Product Categories. The customer purchase screens use `/catalog/brands?category=...`; no fallback brands are offered.
- Manage AMC and extended-warranty plans in Super Admin → Plans. Set category (or any appliance), price, service allowance, duration, benefits, active status, maximum appliance age and whether an invoice is required. A blank maximum age means no age limit. Plans without a service allowance cannot be purchased through checkout.
- Configure Razorpay credentials and capture settings for the deployed backend. Production refuses to create payment orders without credentials. A valid signature alone does not activate a purchase: payment must be captured against its recorded gateway order, amount and currency.

## Customer journey

Buy → AMC or NCC Shield → category → actual plan → select or register an appliance → upload/select its invoice → review → payment → saved protection details. Product model, brand eligibility, purchase age and invoice ownership are checked on the server. The customer can resume an unpaid checkout after a refresh and can check captured payment status if the gateway callback was interrupted.

Checkout uses a customer-owned UUID and transaction to prevent duplicate purchases on retries. The payment order is reused. Price, duration, benefits and allowance are recorded when checkout is prepared; later plan edits do not replace purchased terms. Validity starts when payment is confirmed. Free plans activate without fabricating a gateway payment.

The selected invoice is copied privately into the checkout record (maximum 10 MB). The customer and super admin can retrieve it through an authenticated endpoint, including after the original My Appliances attachment is removed. This is purchase evidence, retained with the purchase rather than a public file URL. Super Admin → Warranty Verification supports this invoice viewer. Existing verification rules remain in place: rejected Shield policies cannot cover service requests; pending invoice verification remains separate from paid coverage.

## Service requests

Protection details identify the covered unit, allowance, benefits and history. Schedule service carries the selected policy and appliance into normal booking, where eligibility is checked again and the actual policy is named beside the discount. Confirming creates a booking and service request for NCC operations/ASM and eligible local provider allocation. Completed covered work consumes the allowance; cancellation does not. Partner-brand claims retain their separate brand approval process.

## Compatibility and checks

Existing policy records and legacy purchase endpoints remain supported. Purchases made through the new customer UI use `/warranty-amc/checkouts`; old payment endpoints delegate to the same confirmation service for these records. Historical purchases without snapshots continue using their existing recorded data.

Regression coverage: `backend/tests/protectionCheckout.test.js`, `protectionDetails.test.js`, `appliances.test.js`, `plansAdmin.test.js`, plus `e2e/ui/protectionPurchase.spec.js` and `protectionPlans.spec.js`. Browser tests simulate only the external Razorpay interface, using the isolated test server and actual order/signature verification APIs; they do not charge real customers. Frontend CI includes both purchase kinds.
