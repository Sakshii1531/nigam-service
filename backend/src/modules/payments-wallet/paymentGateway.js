import { randomUUID } from 'node:crypto';

// Behind an interface so a real gateway client (Razorpay — inferred from the
// super-admin settings field `razorpayKey`; confirm before wiring the real one)
// drops in later without touching order.service.js. The frontend's payment
// screens (CardPayment.jsx/UpiPayment.jsx/NetBankingPayment.jsx) are pure UI
// simulation today — there's no existing contract to match beyond "eventually
// returns success/failure and a gateway reference."
const gateways = {
  stub: {
    async charge({ amount, method }) {
      // Every charge "succeeds" — this is a placeholder for local dev/testing
      // until a real gateway is configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET).
      return { success: true, gatewayRef: `STUB-${method.toUpperCase()}-${randomUUID()}`, amount };
    },
  },
};

export async function chargePayment({ amount, method }) {
  // Always 'stub' for now — swap based on env.razorpay.keyId once a real client exists.
  return gateways.stub.charge({ amount, method });
}
