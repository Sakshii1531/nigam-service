import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/technician/*.routes.js end-to-end — the Phase 6
// exit criterion ("simulate a full job lifecycle via API calls... and assert
// EarningsTally/AMCVisit/Claim side effects fire correctly").
//
// AMC subscriptions and non-booking ServiceRequests have no real HTTP surface
// yet (that purchase/raise-a-complaint flow is deliberately deferred — see
// DATA_MODEL.md's Phase 6 addendum), so this spec uses the NODE_ENV=test-only
// /_dev/test-amc-subscription and /_dev/test-service-request fixture routes
// (backend/src/modules/shared/dev.routes.js) to get real documents to link
// against, same reasoning as the existing /_dev/test-technician fixture.

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

async function createTechnician(request, { specs, availability = 'Available' }) {
  const phone = uniquePhone();
  const createRes = await request.post('/api/v1/_dev/test-technician', {
    data: { phone, password: 'password123', specs, availability },
  });
  const { technicianId } = (await createRes.json()).data;
  const token = await loginAndVerify(request, { role: 'technician', identifier: phone, password: 'password123' });
  return { phone, technicianId, token };
}

/** category/service/technician all scoped to one random key, same isolation reasoning as booking.spec.js. */
async function setupD2cFixture(request, { price = 1000 } = {}) {
  const categoryKey = `E2E-Tech-${randomUUID()}`;

  const adminEmail = `tech-admin-${randomUUID()}@e2e.test`;
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

  const tech = await createTechnician(request, { specs: [categoryKey] });
  const customer = await createCustomer(request);
  return { categoryKey, tech, customer };
}

async function acceptedD2cJob(request) {
  const { categoryKey, tech, customer } = await setupD2cFixture(request);
  const bookingRes = await request.post('/api/v1/bookings', {
    headers: { Authorization: `Bearer ${customer.token}` },
    data: { category: categoryKey, serviceSlug: 'repair' },
  });
  const { serviceRequest } = (await bookingRes.json()).data;

  const acceptRes = await request.post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`, {
    headers: { Authorization: `Bearer ${tech.token}` },
    data: {},
  });
  const job = (await acceptRes.json()).data;
  return { jobId: job.id, srId: serviceRequest.id, tech, customer };
}

test.describe('technician job lifecycle — D2C', () => {
  test('walks the full accept -> ... -> collect-payment flow, driving the ServiceRequest and crediting earnings', async ({ request }) => {
    const { jobId, srId, tech } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${tech.token}` } };

    await request.post(`/api/v1/tech/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/diagnosis`, { ...auth, data: { notes: 'Gas leak found' } });
    const sparePartsRes = await request.post(`/api/v1/tech/jobs/${jobId}/spare-parts`, {
      ...auth,
      data: { parts: [{ name: 'Gas Refill Kit', price: 500, checked: true }] },
    });
    expect((await sparePartsRes.json()).data.activeStep).toBe('spareapproval');

    await request.post(`/api/v1/tech/jobs/${jobId}/repair-complete`, auth);
    const billingRes = await request.post(`/api/v1/tech/jobs/${jobId}/billing`, auth);
    const { billingEstimate } = (await billingRes.json()).data;
    expect(billingEstimate.serviceCharge).toBe(1000);
    expect(billingEstimate.sparePartsTotal).toBe(500);

    const payRes = await request.post(`/api/v1/tech/jobs/${jobId}/collect-payment`, { ...auth, data: { paymentMethod: 'Cash' } });
    expect(payRes.status()).toBe(200);
    const payBody = (await payRes.json()).data;
    expect(payBody.job.activeStep).toBe('completed');
    expect(payBody.payment.status).toBe('Success');

    const srRes = await request.get(`/api/v1/service-requests/${srId}`, auth);
    expect((await srRes.json()).data.status).toBe('Customer Confirmation');

    const earningsRes = await request.get('/api/v1/tech/earnings/summary', auth);
    const earnings = (await earningsRes.json()).data;
    expect(earnings.total).toBe(billingEstimate.technicianEarnings);
    expect(earnings.completedTotal).toBe(1);
  });

  test('rejects an out-of-order action (billing before repair-complete) with 400', async ({ request }) => {
    const { jobId, tech } = await acceptedD2cJob(request);
    const res = await request.post(`/api/v1/tech/jobs/${jobId}/billing`, {
      headers: { Authorization: `Bearer ${tech.token}` },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects a technician accessing a job that is not theirs', async ({ request }) => {
    const { jobId } = await acceptedD2cJob(request);
    const other = await createTechnician(request, { specs: ['Other'] });
    const res = await request.get(`/api/v1/tech/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('technician job lifecycle — AMC-covered', () => {
  async function acceptedAmcJob(request) {
    const tech = await createTechnician(request, { specs: ['Refrigerator'] });
    const customer = await createCustomer(request);

    const subRes = await request.post('/api/v1/_dev/test-amc-subscription', {
      data: { customerId: customer.id, brand: 'LG', visitsTotal: 4 },
    });
    const { id: amcSubscriptionId } = (await subRes.json()).data;

    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.id, technicianId: tech.technicianId, category: 'Refrigerator' },
    });
    const { id: srId } = (await srRes.json()).data;

    const acceptRes = await request.post(`/api/v1/tech/jobs/accept/${srId}`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { type: 'AMC Visit', amcSubscriptionId },
    });
    const job = (await acceptRes.json()).data;
    return { jobId: job.id, srId, tech, amcSubscriptionId };
  }

  test('auto-raises a FOC claim for checked spare parts and bills the customer nothing for them', async ({ request }) => {
    const { jobId, tech } = await acceptedAmcJob(request);
    const auth = { headers: { Authorization: `Bearer ${tech.token}` } };

    await request.post(`/api/v1/tech/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/diagnosis`, { ...auth, data: { notes: 'Compressor issue' } });
    await request.post(`/api/v1/tech/jobs/${jobId}/spare-parts`, {
      ...auth,
      data: { parts: [{ name: 'Compressor Unit', price: 1500, checked: true }] },
    });

    const claimsRes = await request.get('/api/v1/tech/claims', auth);
    const claims = (await claimsRes.json()).data;
    expect(claims).toHaveLength(1);
    expect(claims[0].amount).toBe(1500);
    expect(claims[0].claimType).toBe('Warehouse Order');

    await request.post(`/api/v1/tech/jobs/${jobId}/repair-complete`, auth);
    const billingRes = await request.post(`/api/v1/tech/jobs/${jobId}/billing`, auth);
    const { billingEstimate } = (await billingRes.json()).data;
    expect(billingEstimate.sparePartsTotal).toBe(0);
    expect(billingEstimate.total).toBe(0);
  });

  test('decrements AMCSubscription.visitsRemaining and marks the visit Completed on payment collection', async ({ request }) => {
    const { jobId, tech, amcSubscriptionId } = await acceptedAmcJob(request);
    const auth = { headers: { Authorization: `Bearer ${tech.token}` } };

    await request.post(`/api/v1/tech/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/diagnosis`, { ...auth, data: {} });
    await request.post(`/api/v1/tech/jobs/${jobId}/spare-parts`, { ...auth, data: { parts: [] } });
    await request.post(`/api/v1/tech/jobs/${jobId}/repair-complete`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/billing`, auth);

    const before = await (await request.get(`/api/v1/_dev/amc-subscription/${amcSubscriptionId}`)).json();
    expect(before.data.visitsRemaining).toBe(4);

    const payRes = await request.post(`/api/v1/tech/jobs/${jobId}/collect-payment`, { ...auth, data: {} });
    expect(payRes.status()).toBe(200);

    const after = await (await request.get(`/api/v1/_dev/amc-subscription/${amcSubscriptionId}`)).json();
    expect(after.data.visitsRemaining).toBe(3);
    expect(after.data.visitNumber).toBe(2);

    const earningsRes = await request.get('/api/v1/tech/earnings/summary', auth);
    expect((await earningsRes.json()).data.total).toBe(150); // flat covered-visit rate
  });
});

test.describe('technician claims module', () => {
  test('raises a manual claim and reads it back, but not another technician\'s claim', async ({ request }) => {
    const techA = await createTechnician(request, { specs: ['AC'] });
    const techB = await createTechnician(request, { specs: ['AC'] });

    const raiseRes = await request.post('/api/v1/tech/claims', {
      headers: { Authorization: `Bearer ${techA.token}` },
      data: { brand: 'LG Partner Warranty', claimType: 'Brand', item: 'Fan Blade', amount: 250, reason: 'Damaged in transit' },
    });
    expect(raiseRes.status()).toBe(201);
    const claimId = (await raiseRes.json()).data.id;

    const forbidden = await request.get(`/api/v1/tech/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${techB.token}` },
    });
    expect(forbidden.status()).toBe(403);
  });
});

test.describe('earnings + payouts', () => {
  test('rejects a payout that exceeds the earned balance', async ({ request }) => {
    const { tech } = await acceptedD2cJob(request);
    const auth = { headers: { Authorization: `Bearer ${tech.token}` } };

    await request.post('/api/v1/tech/profile/payout-methods', { ...auth, data: { type: 'upi', upiId: 'tech@upi', isPrimary: true } });
    const res = await request.post('/api/v1/tech/earnings/payouts', { ...auth, data: { amount: 999999 } });
    expect(res.status()).toBe(400);
  });
});
