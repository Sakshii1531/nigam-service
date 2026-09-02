import { apiRequest } from './apiClient';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loads Checkout.js once; resolves when the global is available. */
function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load the payment gateway.')));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the payment gateway.'));
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Checkout for an order the server already created, then posts
 * the result back for signature verification.
 *
 * The screens that use this used to navigate straight to the success page
 * without any charge, so a booking or purchase was recorded as paid when no
 * money had moved.
 *
 * @param razorpay  the { orderId, amount, currency, keyId } block the create
 *                  endpoint returned. Null means nothing to collect (a free or
 *                  cash-on-site job) — the caller should treat that as success.
 * @param verifyPath the endpoint that verifies the signature, e.g.
 *                  `/bookings/<id>/verify-payment`.
 * @returns the verify endpoint's response data.
 */
export async function payWithRazorpay({ razorpay, verifyPath, name, description, prefill = {} }) {
  if (!razorpay?.orderId) {
    throw new Error('The server did not return a payment order to pay against.');
  }
  if (!razorpay.keyId) {
    throw new Error('Payments are not configured on this server.');
  }

  await loadCheckoutScript();

  const result = await new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: razorpay.keyId,
      order_id: razorpay.orderId,
      amount: razorpay.amount,
      currency: razorpay.currency || 'INR',
      name: name || 'Nigam Care',
      description: description || 'Appliance Purchase',
      prefill: {
        name: prefill.name || 'Customer',
        email: prefill.email || 'customer@example.com',
        contact: prefill.contact || prefill.phone || '9876543210',
      },
      handler: (response) => resolve(response),
      modal: {
        // Treated as a failure, not a success — an abandoned checkout has not paid.
        ondismiss: () => reject(new Error('Payment was cancelled before it completed.')),
      },
    });
    checkout.on('payment.failed', (response) => {
      reject(new Error(response?.error?.description || 'The payment was declined.'));
    });
    checkout.open();
  });

  const verified = await apiRequest(verifyPath, {
    method: 'POST',
    auth: true,
    body: {
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    },
  });
  return verified;
}
