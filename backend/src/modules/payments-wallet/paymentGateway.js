import { randomUUID, createHmac } from 'node:crypto';
import Razorpay from 'razorpay';
import { env, isProd } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Real gateway: Razorpay (user-confirmed choice). No legitimate gateway lets a
// server "charge" a customer with zero interaction — card/UPI/netbanking all
// require the customer to complete the payment themselves (Razorpay's
// Checkout.js), which is why this module only ever does two things: create an
// Order for the frontend to open Checkout against, and verify the signature
// Checkout returns afterward. There is no third "just charge this amount"
// function — order.service.js and job.service.js each split their payment
// step into initiate (createRazorpayOrder) + confirm (verifyRazorpaySignature)
// instead of the old single synchronous chargePayment() call.
export const isRazorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);

let client = null;
function getClient() {
  if (!client) client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return client;
}

// Dev/test fallback signing secret — never used when isRazorpayConfigured (a
// real deployment always has a real key_secret). Exists so the create-order ->
// verify-signature round trip is exercised by real HMAC computation in tests
// without needing live Razorpay credentials, rather than a `return true` bypass
// that would let a signature-verification bug hide behind an untested branch.
const DEV_STUB_SECRET = 'dev-only-razorpay-stub-secret-never-used-in-production';

function signingSecret() {
  return isRazorpayConfigured ? env.razorpay.keySecret : DEV_STUB_SECRET;
}

/**
 * Creates a Razorpay Order — the customer completes payment against this via
 * Checkout.js on the frontend; nothing is charged yet. `amount` is in rupees
 * (converted to paise here, matching Razorpay's API).
 */
export async function createRazorpayOrder({ amount, receipt, notes }) {
  if (!isRazorpayConfigured) {
    if (isProd) throw new ApiError(500, 'Razorpay is not configured — cannot accept online payments in production');
    return { id: `order_stub_${randomUUID()}`, amount: Math.round(amount * 100), currency: 'INR', receipt };
  }
  return getClient().orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt,
    notes,
  });
}

/**
 * HMAC-SHA256("<razorpay_order_id>|<razorpay_payment_id>") using the account's
 * key_secret (never sent to the client) — this is what actually proves a
 * payment is real, per Razorpay's documented Checkout.js verification flow.
 * The order id passed in must come from the server's own records (the
 * Payment document created at initiate time), never trusted from the client,
 * or a signature from an unrelated real payment could be replayed here.
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const expected = createHmac('sha256', signingSecret()).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
}

/** Test/dev-only — computes the same signature a real successful Checkout.js
 * callback would carry, so the create -> verify round trip is testable without
 * real Razorpay credentials. Never used by application code, only tests. */
export function signForTesting({ orderId, paymentId }) {
  return createHmac('sha256', signingSecret()).update(`${orderId}|${paymentId}`).digest('hex');
}
