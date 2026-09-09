import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/service provider/*.routes.js end-to-end — the Phase 6
// exit criterion ("simulate a full job lifecycle via API calls... and assert
// EarningsTally/AMCVisit/Claim side effects fire correctly").
//
// AMC subscriptions and non-booking ServiceRequests have no real HTTP surface
// yet (that purchase/raise-a-complaint flow is deliberately deferred — see
// DATA_MODEL.md's Phase 6 addendum), so this spec uses the NODE_ENV=test-only
// /_dev/test-amc-subscription and /_dev/test-service-request fixture routes
// (backend/src/modules/shared/dev.routes.js) to get real documents to link
// against, same reasoning as the existing /_dev/test-service provider fixture.

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

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

async function createCustomer(request) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123' } });
  const { id } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { id, phone, token };
}

async function createServiceProvider(request, { specs, availability = 'Available' }) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-serviceProvider', {
    data: { phone, password: 'password123', specs, availability },
  });
  const { serviceProviderId } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'service_provider', identifier: phone, password: 'password123' });
  return { phone, serviceProviderId, token };
}

/** category/service/service provider all scoped to one random key, same isolation reasoning as booking.spec.js. */
async function setupD2cFixture(request, { price = 1000 } = {}) {
  const categoryKey = `E2E-Tech-${randomUUID()}`;

  const adminEmail = `service-provider-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const adminToken = await loginAndVerify(request, { role: 'super_admin', identifier: adminEmail, password: 'password123' });

  await request.post('/api/v1/catalog/categories', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { key: categoryKey, name: categoryKey },
  });
  await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { slug: 'repair', name: 'Repair', price },
  });

  const provider = await createServiceProvider(request, { specs: [categoryKey] });
  const customer = await createCustomer(request);
  return { categoryKey, provider, customer };
}

async function acceptedD2cJob(request) {
  const { categoryKey, provider, customer } = await setupD2cFixture(request);
  const bookingRes = await request.post('/api/v1/bookings', {
    headers: { Authorization: `Bearer ${customer.token}` },
    data: { category: categoryKey, serviceSlug: 'repair' },
  });
  const { serviceRequest } = (await bookingRes.json()).data;

  const acceptRes = await request.post(`/api/v1/service-provider/jobs/accept/${serviceRequest.id}`, {
    headers: { Authorization: `Bearer ${provider.token}` },
    data: {},
  });
  const job = (await acceptRes.json()).data;
  return { jobId: job.id, srId: serviceRequest.id, provider, customer };
}

test.describe('serviceProvider job lifecycle — D2C', () => {
  test('walks the full accept -> ... -> collect-payment flow, driving the ServiceRequest and crediting earnings', async ({ request }) => {
    const { jobId, srId, provider } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    await request.post(`/api/v1/service-provider/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`, { ...auth, data: { notes: 'Gas leak found' } });
    const sparePartsRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`, {
      ...auth,
      data: { parts: [{ name: 'Gas Refill Kit', price: 500, checked: true }] },
    });
    expect((await sparePartsRes.json()).data.activeStep).toBe('spareapproval');

    await request.post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`, auth);
    const billingRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/billing`, auth);
    const { billingEstimate } = (await billingRes.json()).data;
    expect(billingEstimate.serviceCharge).toBe(1000);
    expect(billingEstimate.sparePartsTotal).toBe(500);

    const payRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`, { ...auth, data: { paymentMethod: 'Cash' } });
    expect(payRes.status()).toBe(200);
    const payBody = (await payRes.json()).data;
    expect(payBody.job.activeStep).toBe('completed');
    expect(payBody.payment.status).toBe('Success');

    const srRes = await request.get(`/api/v1/service-requests/${srId}`, auth);
    expect((await srRes.json()).data.status).toBe('Customer Confirmation');

    const earningsRes = await request.get('/api/v1/service-provider/earnings/summary', auth);
    const earnings = (await earningsRes.json()).data;
    expect(earnings.total).toBe(billingEstimate.serviceProviderEarnings);
    expect(earnings.completedTotal).toBe(1);
  });

  test('collecting payment with a real gateway method (UPI) awaits Razorpay Checkout confirmation before completing the job', async ({ request }) => {
    const { jobId, srId, provider } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    await request.post(`/api/v1/service-provider/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`, { ...auth, data: {} });
    await request.post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`, { ...auth, data: { parts: [] } });
    await request.post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/billing`, auth);

    const initiateRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`, { ...auth, data: { paymentMethod: 'UPI' } });
    expect(initiateRes.status()).toBe(200);
    const initiateBody = (await initiateRes.json()).data;
    expect(initiateBody.job.activeStep).toBe('awaitingpayment');
    expect(initiateBody.razorpay.orderId).toBeTruthy();

    // Job hasn't completed yet — still awaiting the customer's Checkout.js confirmation.
    const srMidway = await request.get(`/api/v1/service-requests/${srId}`, auth);
    expect((await srMidway.json()).data.status).not.toBe('Customer Confirmation');

    const signRes = await request.post('/api/v1/_dev/razorpay-sign', {
      data: { orderId: initiateBody.razorpay.orderId, paymentId: 'pay_e2e_job_test' },
    });
    const { signature } = (await signRes.json()).data;

    const verifyRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/verify-payment`, {
      ...auth,
      data: { razorpayPaymentId: 'pay_e2e_job_test', razorpaySignature: signature },
    });
    expect(verifyRes.status()).toBe(200);
    const verifyBody = (await verifyRes.json()).data;
    expect(verifyBody.job.activeStep).toBe('completed');
    expect(verifyBody.payment.status).toBe('Success');

    const srRes = await request.get(`/api/v1/service-requests/${srId}`, auth);
    expect((await srRes.json()).data.status).toBe('Customer Confirmation');
  });

  test('rejects an out-of-order action (billing before repair-complete) with 400', async ({ request }) => {
    const { jobId, provider } = await acceptedD2cJob(request);
    const res = await request.post(`/api/v1/service-provider/jobs/${jobId}/billing`, {
      headers: { Authorization: `Bearer ${provider.token}` },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects a serviceProvider accessing a job that is not theirs', async ({ request }) => {
    const { jobId } = await acceptedD2cJob(request);
    const other = await createServiceProvider(request, { specs: ['Other'] });
    const res = await request.get(`/api/v1/service-provider/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('serviceProvider job lifecycle — AMC-covered', () => {
  async function acceptedAmcJob(request) {
    const provider = await createServiceProvider(request, { specs: ['Refrigerator'] });
    const customer = await createCustomer(request);

    const subRes = await request.post('/api/v1/_dev/test-amc-subscription', {
      data: { customerId: customer.id, brand: 'LG', visitsTotal: 4 },
    });
    const { id: amcSubscriptionId } = (await subRes.json()).data;

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.id, serviceProviderId: provider.serviceProviderId, category: 'Refrigerator' },
    });
    const { id: srId } = (await srRes.json()).data;

    const acceptRes = await request.post(`/api/v1/service-provider/jobs/accept/${srId}`, {
      headers: { Authorization: `Bearer ${provider.token}` },
      data: { type: 'AMC Visit', amcSubscriptionId },
    });
    const job = (await acceptRes.json()).data;
    return { jobId: job.id, srId, provider, amcSubscriptionId };
  }

  test('auto-raises a FOC claim for checked spare parts and bills the customer nothing for them', async ({ request }) => {
    const { jobId, provider } = await acceptedAmcJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    await request.post(`/api/v1/service-provider/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`, { ...auth, data: { notes: 'Compressor issue' } });
    await request.post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`, {
      ...auth,
      data: { parts: [{ name: 'Compressor Unit', price: 1500, checked: true }] },
    });

    const claimsRes = await request.get('/api/v1/service-provider/claims', auth);
    const claims = (await claimsRes.json()).data;
    expect(claims).toHaveLength(1);
    expect(claims[0].amount).toBe(1500);
    expect(claims[0].claimType).toBe('Warehouse Order');

    await request.post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`, auth);
    const billingRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/billing`, auth);
    const { billingEstimate } = (await billingRes.json()).data;
    expect(billingEstimate.sparePartsTotal).toBe(0);
    expect(billingEstimate.total).toBe(0);
  });

  test('decrements AMCSubscription.visitsRemaining and marks the visit Completed on payment collection', async ({ request }) => {
    const { jobId, provider, amcSubscriptionId } = await acceptedAmcJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    await request.post(`/api/v1/service-provider/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`, { ...auth, data: {} });
    await request.post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`, { ...auth, data: { parts: [] } });
    await request.post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`, auth);
    await request.post(`/api/v1/service-provider/jobs/${jobId}/billing`, auth);

    const before = await (await request.get(`/api/v1/_dev/amc-subscription/${amcSubscriptionId}`)).json();
    expect(before.data.visitsRemaining).toBe(4);

    const payRes = await request.post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`, { ...auth, data: {} });
    expect(payRes.status()).toBe(200);

    const after = await (await request.get(`/api/v1/_dev/amc-subscription/${amcSubscriptionId}`)).json();
    expect(after.data.visitsRemaining).toBe(3);
    expect(after.data.visitNumber).toBe(2);

    const earningsRes = await request.get('/api/v1/service-provider/earnings/summary', auth);
    expect((await earningsRes.json()).data.total).toBe(150); // flat covered-visit rate
  });
});

test.describe('serviceProvider claims module', () => {
  test('raises a manual claim and reads it back, but not another serviceProvider\'s claim', async ({ request }) => {
    const serviceProviderA = await createServiceProvider(request, { specs: ['AC'] });
    const serviceProviderB = await createServiceProvider(request, { specs: ['AC'] });

    const raiseRes = await request.post('/api/v1/service-provider/claims', {
      headers: { Authorization: `Bearer ${serviceProviderA.token}` },
      data: { brand: 'LG Partner Warranty', claimType: 'Brand', item: 'Fan Blade', amount: 250, reason: 'Damaged in transit' },
    });
    expect(raiseRes.status()).toBe(201);
    const claimId = (await raiseRes.json()).data.id;

    const forbidden = await request.get(`/api/v1/service-provider/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${serviceProviderB.token}` },
    });
    expect(forbidden.status()).toBe(403);
  });
});

test.describe('earnings + payouts', () => {
  test('rejects a payout that exceeds the earned balance', async ({ request }) => {
    const { provider } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    await request.post('/api/v1/service-provider/profile/payout-methods', { ...auth, data: { type: 'upi', upiId: 'provider@upi', isPrimary: true } });
    const res = await request.post('/api/v1/service-provider/earnings/payouts', { ...auth, data: { amount: 999999 } });
    expect(res.status()).toBe(400);
  });
});

test.describe('visit fee for a job the serviceProvider could not complete', () => {
  test('credits the fee once over real HTTP and refuses a second credit', async ({ request }) => {
    const { jobId, provider } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${provider.token}` } };

    const before = (await (await request.get('/api/v1/service-provider/earnings/breakdown', auth)).json()).data;

    const first = await request.post(`/api/v1/service-provider/earnings/visit-fee/${jobId}`, { ...auth, data: {} });
    expect(first.status()).toBe(200);
    const credit = (await first.json()).data;
    expect(credit.credited).toBe(true);
    expect(credit.amount).toBeGreaterThan(0);

    const second = await request.post(`/api/v1/service-provider/earnings/visit-fee/${jobId}`, { ...auth, data: {} });
    expect(second.status()).toBe(200);
    expect((await second.json()).data).toMatchObject({ credited: false, alreadyCredited: true });

    // The service provider's real balance moved by exactly one fee, not two.
    const after = (await (await request.get('/api/v1/service-provider/earnings/breakdown', auth)).json()).data;
    expect(after.lifetimeEarned - before.lifetimeEarned).toBe(credit.amount);
  });

  test('rejects a job belonging to another serviceProvider', async ({ request }) => {
    const { jobId } = await acceptedD2cJob(request);
    const other = await createServiceProvider(request, { specs: ['AC'] });

    const res = await request.post(`/api/v1/service-provider/earnings/visit-fee/${jobId}`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: {},
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('serviceProvider AI assistant', () => {
  test('refuses rather than fabricating when no model key is configured, and is serviceProvider-only', async ({ request }) => {
    const { provider } = await acceptedD2cJob(request);
    const customer = await createCustomer(request);

    const res = await request.post('/api/v1/service-provider/assistant', {
      headers: { Authorization: `Bearer ${provider.token}` },
      data: { messages: [{ role: 'user', content: 'What spare parts do I have?' }] },
    });
    // 200 if the deployment has ANTHROPIC_API_KEY set, 503 if not — never a
    // fabricated answer, and never a 404/500.
    expect([200, 503]).toContain(res.status());
    if (res.status() === 200) expect((await res.json()).data.reply).toBeTruthy();

    const asCustomer = await request.post('/api/v1/service-provider/assistant', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { messages: [{ role: 'user', content: 'hello' }] },
    });
    expect(asCustomer.status()).toBe(403);
  });
});
