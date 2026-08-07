import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The four finance modules (revenue / partner payouts / billing / gateway
// transactions) against the real running server. backend/tests/finance.test.js
// covers the same services in-process; this proves the routes are actually
// mounted and reachable over HTTP, which an in-process test cannot.

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function loginAndVerify(request, { role, identifier, password }) {
  await request.post('/api/v1/auth/login', { data: { role, identifier, password } });
  const code = await getOtpCode(request, identifier);
  const res = await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } });
  return (await res.json()).data.accessToken;
}

async function createSuperAdmin(request) {
  const email = `finance-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  const token = await loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
  return { email, token };
}

// /_dev/test-user always names the account 'E2E Test User' — it takes no name.
const TEST_USER_NAME = 'E2E Test User';

async function createCustomer(request) {
  const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const res = await request.post('/api/v1/_dev/test-user', {
    data: { role: 'customer', phone, password: 'password123' },
  });
  return (await res.json()).data;
}

test.describe('revenue', () => {
  test('derives net and margin server-side and reports a blended summary', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const source = `E2E Source ${randomUUID()}`;

    const createRes = await request.post('/api/v1/super-admin/revenue', {
      ...auth,
      data: { source, gross: 450000, partnerShare: 360000 },
    });
    expect(createRes.status()).toBe(201);
    const row = (await createRes.json()).data;
    expect(row.net).toBe(90000);
    expect(row.marginPercent).toBe(20);

    // Editing gross alone must recompute net, not leave the old figure behind.
    const updateRes = await request.put(`/api/v1/super-admin/revenue/${row.id}`, {
      ...auth,
      data: { gross: 900000 },
    });
    expect((await updateRes.json()).data.net).toBe(540000);

    const summaryRes = await request.get(`/api/v1/super-admin/revenue/summary?source=${encodeURIComponent(source)}`, auth);
    expect(summaryRes.status()).toBe(200);
    const summary = (await summaryRes.json()).data;
    expect(summary.gross).toBe(900000);
    expect(summary.net).toBe(540000);

    await request.delete(`/api/v1/super-admin/revenue/${row.id}`, auth);
  });

  test('rejects a partner share larger than gross', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.post('/api/v1/super-admin/revenue', {
      headers: { Authorization: `Bearer ${token}` },
      data: { source: `Bad ${randomUUID()}`, gross: 100, partnerShare: 500 },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('partner payouts', () => {
  test('settles a payout once, recording the amount and refusing a second settlement', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const cityRes = await request.post('/api/v1/super-admin/cities', {
      ...auth,
      data: { name: `Payout City ${randomUUID()}`, state: 'UP' },
    });
    const city = (await cityRes.json()).data;

    const partnerRes = await request.post('/api/v1/super-admin/service-partners', {
      ...auth,
      data: { name: `Payout Partner ${randomUUID()}`, city: city.id },
    });
    const partner = (await partnerRes.json()).data;

    const createRes = await request.post('/api/v1/super-admin/payouts', {
      ...auth,
      data: { partner: partner.id, balance: 42500 },
    });
    expect(createRes.status()).toBe(201);
    const payout = (await createRes.json()).data;
    expect(payout.status).toBe('Pending Approval');

    const accrueRes = await request.patch(`/api/v1/super-admin/payouts/${payout.id}/accrue`, {
      ...auth,
      data: { amount: 7500 },
    });
    expect((await accrueRes.json()).data.balance).toBe(50000);

    const payRes = await request.patch(`/api/v1/super-admin/payouts/${payout.id}/pay`, auth);
    const paid = (await payRes.json()).data;
    expect(paid.status).toBe('Paid');
    expect(paid.balance).toBe(0);
    expect(paid.lastPaidAmount).toBe(50000);

    // Paying twice would double-disburse.
    const secondPay = await request.patch(`/api/v1/super-admin/payouts/${payout.id}/pay`, auth);
    expect(secondPay.status()).toBe(409);
  });
});

test.describe('billing transactions', () => {
  test('settles a pending transaction and refuses to re-open it', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);

    const createRes = await request.post('/api/v1/super-admin/billing', {
      ...auth,
      data: { user: customer.id, amount: 1500, type: 'Service Fee', status: 'Pending', description: 'E2E fee' },
    });
    expect(createRes.status()).toBe(201);
    const txn = (await createRes.json()).data;
    // Populated, not a bare ObjectId — the billing table renders the name.
    expect(txn.user.name).toBe(TEST_USER_NAME);

    const settleRes = await request.patch(`/api/v1/super-admin/billing/${txn.id}/status`, {
      ...auth,
      data: { status: 'Paid' },
    });
    expect((await settleRes.json()).data.status).toBe('Paid');

    const reopenRes = await request.patch(`/api/v1/super-admin/billing/${txn.id}/status`, {
      ...auth,
      data: { status: 'Pending' },
    });
    expect(reopenRes.status()).toBe(409);
  });

  test('404s a transaction for an unknown user', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.post('/api/v1/super-admin/billing', {
      headers: { Authorization: `Bearer ${token}` },
      data: { user: '000000000000000000000000', amount: 10, type: 'Refund' },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe('gateway transactions', () => {
  test('refunds a successful charge, and never a failed or already-refunded one', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const customer = await createCustomer(request);

    const ref = `TXN-${randomUUID()}`;
    const createRes = await request.post('/api/v1/super-admin/transactions', {
      ...auth,
      data: { ref, customer: customer.id, amount: 1250, gateway: 'UPI' },
    });
    expect(createRes.status()).toBe(201);
    const txn = (await createRes.json()).data;
    expect(txn.status).toBe('Success');

    // The gateway ref is uniquely indexed — a replay must be a clean 409.
    const dupeRes = await request.post('/api/v1/super-admin/transactions', {
      ...auth,
      data: { ref, customer: customer.id, amount: 1250, gateway: 'UPI' },
    });
    expect(dupeRes.status()).toBe(409);

    const refundRes = await request.patch(`/api/v1/super-admin/transactions/${txn.id}/refund`, auth);
    expect((await refundRes.json()).data.status).toBe('Refunded');

    const secondRefund = await request.patch(`/api/v1/super-admin/transactions/${txn.id}/refund`, auth);
    expect(secondRefund.status()).toBe(409);

    const failedRes = await request.post('/api/v1/super-admin/transactions', {
      ...auth,
      data: { ref: `TXN-${randomUUID()}`, customer: customer.id, amount: 100, gateway: 'Card', status: 'Failed' },
    });
    const failed = (await failedRes.json()).data;
    // Nothing was collected, so there is nothing to send back.
    const refundFailed = await request.patch(`/api/v1/super-admin/transactions/${failed.id}/refund`, auth);
    expect(refundFailed.status()).toBe(400);
  });

  test('rejects an unknown gateway value', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const res = await request.get('/api/v1/super-admin/transactions?gateway=Bitcoin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('finance authorization', () => {
  test('every finance route is closed without a super-admin token', async ({ request }) => {
    for (const path of ['revenue', 'payouts', 'billing', 'transactions']) {
      const res = await request.get(`/api/v1/super-admin/${path}`);
      expect(res.status()).toBe(401);
    }
  });

  test('/summary resolves to the aggregate, not an id lookup', async ({ request }) => {
    const { token } = await createSuperAdmin(request);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    for (const path of ['revenue', 'payouts', 'billing', 'transactions']) {
      const res = await request.get(`/api/v1/super-admin/${path}/summary`, auth);
      expect(res.status()).toBe(200);
      expect((await res.json()).data.id).toBeUndefined();
    }
  });
});
