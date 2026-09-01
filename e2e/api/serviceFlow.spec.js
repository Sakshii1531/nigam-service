import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The parts of the service flow that had no coverage at all: a technician
// rejecting an assignment, spare part requests actually reaching an approver,
// the revisit that a part approval schedules, how work is shared between more
// than one technician, and collecting a booking advance successfully (only the
// forged-signature case was covered before).
//
// Same /_dev fixture routes as technician.spec.js — they only mount under
// NODE_ENV=test.

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

async function createSuperAdmin(request) {
  const email = `flow-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  return loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
}

/** A category nobody else's spec can match, so ranking here is deterministic. */
async function isolatedCategory(request, { price = 1000 } = {}) {
  const categoryKey = `E2E-Flow-${randomUUID()}`;
  const adminToken = await createSuperAdmin(request);
  await request.post('/api/v1/catalog/categories', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { key: categoryKey, name: categoryKey },
  });
  await request.post(`/api/v1/catalog/categories/${categoryKey}/services`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { slug: 'repair', name: 'Repair', price },
  });
  return { categoryKey, adminToken };
}

async function book(request, customer, categoryKey, extra = {}) {
  const res = await request.post('/api/v1/bookings', {
    headers: { Authorization: `Bearer ${customer.token}` },
    data: { category: categoryKey, serviceSlug: 'repair', ...extra },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

test.describe('technician rejects an assignment', () => {
  test('releases the request, records the rejection, and frees the customer booking', async ({ request }) => {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const tech = await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);

    const { serviceRequest, booking, technician } = await book(request, customer, categoryKey);
    expect(serviceRequest.status).toBe('Assigned');
    expect(technician.id).toBe(tech.technicianId);

    const rejectRes = await request.post(`/api/v1/tech/jobs/reject/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: {},
    });
    expect(rejectRes.status()).toBe(200);

    const srRes = await request.get(`/api/v1/service-requests/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sr = (await srRes.json()).data;
    // Released from the decliner. Not asserted as null: the engine treats any
    // available technician as a candidate, so a technician belonging to another
    // spec running in parallel may legitimately have picked it up already —
    // which is the behaviour we want, just not something a test can pin down.
    expect(String(sr.technician?.id ?? sr.technician ?? '')).not.toBe(tech.technicianId);
    // Wording is the service's to choose (it reads "Declined by technician — …");
    // what matters is that the decline is recorded on the timeline at all.
    expect(sr.timeline.some((t) => /(declined|rejected) by technician/i.test(t.description || ''))).toBe(true);

    // The customer must stop seeing the technician who is not coming.
    const bkRes = await request.get(`/api/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(String((await bkRes.json()).data.technician ?? '')).not.toBe(tech.technicianId);

    // And it must be gone from the decliner's own feed.
    const feedRes = await request.get('/api/v1/tech/jobs/available', {
      headers: { Authorization: `Bearer ${tech.token}` },
    });
    expect((await feedRes.json()).data.some((s) => s.id === serviceRequest.id)).toBe(false);
  });

  test('will not hand the request straight back to the technician who declined it', async ({ request }) => {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const tech = await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);
    const { serviceRequest } = await book(request, customer, categoryKey);

    await request.post(`/api/v1/tech/jobs/reject/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: {},
    });

    // Auto-assign must never land back on the decliner. It either finds nobody
    // (409) or picks somebody else — both are correct, handing it back is not.
    const retry = await request.patch(`/api/v1/service-requests/${serviceRequest.id}/assign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {},
    });
    if (retry.status() === 200) {
      const reassigned = (await retry.json()).data;
      expect(String(reassigned.technician?.id ?? reassigned.technician)).not.toBe(tech.technicianId);
    } else {
      expect(retry.status()).toBe(409);
    }
  });

  test('rejects a request that is not yours, and one already accepted', async ({ request }) => {
    const { categoryKey } = await isolatedCategory(request);
    const mine = await createTechnician(request, { specs: [categoryKey] });
    const stranger = await createTechnician(request, { specs: ['SomethingElse'] });
    const customer = await createCustomer(request);
    const { serviceRequest } = await book(request, customer, categoryKey);

    const notYours = await request.post(`/api/v1/tech/jobs/reject/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${stranger.token}` },
      data: {},
    });
    expect(notYours.status()).toBe(403);

    await request.post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${mine.token}` },
      data: {},
    });
    const tooLate = await request.post(`/api/v1/tech/jobs/reject/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${mine.token}` },
      data: {},
    });
    expect(tooLate.status()).toBe(409);
  });
});

test.describe('more than one technician', () => {
  test('a rejected request is handed to the other available technician', async ({ request }) => {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const first = await createTechnician(request, { specs: [categoryKey] });
    const second = await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);

    const { serviceRequest, technician } = await book(request, customer, categoryKey);
    const assigned = technician.id === first.technicianId ? first : second;
    const other = assigned === first ? second : first;

    const rejectRes = await request.post(`/api/v1/tech/jobs/reject/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${assigned.token}` },
      data: {},
    });
    expect(rejectRes.status()).toBe(200);
    // Handed straight over rather than left sitting in the queue.
    expect((await rejectRes.json()).data.reassignedTo).toBeTruthy();

    const srRes = await request.get(`/api/v1/service-requests/${serviceRequest.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sr = (await srRes.json()).data;
    expect(sr.status).toBe('Assigned');
    expect(String(sr.technician.id ?? sr.technician)).toBe(other.technicianId);
  });

  test('workload spreads across technicians instead of stacking on the top-ranked one', async ({ request }) => {
    const { categoryKey } = await isolatedCategory(request);
    const a = await createTechnician(request, { specs: [categoryKey] });
    const b = await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);

    const assignees = [];
    for (let i = 0; i < 4; i += 1) {
      const { technician } = await book(request, customer, categoryKey);
      assignees.push(technician.id);
    }

    // Assigned-but-unaccepted work counts toward the workload score, so four
    // bookings must not all land on whoever happened to rank first.
    expect(new Set(assignees).size).toBe(2);
    const forA = assignees.filter((id) => id === a.technicianId).length;
    const forB = assignees.filter((id) => id === b.technicianId).length;
    expect(Math.abs(forA - forB)).toBeLessThanOrEqual(1);
  });

  test('an offline technician is never auto-assigned but can still be picked by an admin', async ({ request }) => {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const offline = await createTechnician(request, { specs: [categoryKey], availability: 'Offline' });
    const customer = await createCustomer(request);

    const { serviceRequest, technician } = await book(request, customer, categoryKey);
    // Whoever auto-assign picked, it cannot have been the offline technician.
    // (It may pick an available technician from a spec running alongside this
    // one — the engine considers any available technician a candidate.)
    expect(String(technician?.id ?? '')).not.toBe(offline.technicianId);

    // The console still offers them, so a manual override is possible.
    const suggestRes = await request.get(`/api/v1/service-requests/${serviceRequest.id}/technician-suggestions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const shortlist = (await suggestRes.json()).data;
    const row = shortlist.find((t) => t.id === offline.technicianId);
    expect(row).toBeTruthy();
    expect(row.availability).toBe('Offline');

    const assignRes = await request.patch(`/api/v1/service-requests/${serviceRequest.id}/assign`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { technician: offline.technicianId },
    });
    expect(assignRes.status()).toBe(200);
  });

  test('coming online drains requests left unassigned', async ({ request }) => {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const tech = await createTechnician(request, { specs: [categoryKey], availability: 'Offline' });
    const customer = await createCustomer(request);

    // Created directly so it starts unassigned: booking would run auto-assign
    // immediately, and an available technician from a parallel spec could take
    // it before this test ever gets to the part it is checking.
    const srRes = await request.post('/api/v1/_dev/test-service-request', {
      data: { customerId: customer.id, category: categoryKey },
    });
    const srId = (await srRes.json()).data.id;

    const before = await request.get(`/api/v1/service-requests/${srId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect((await before.json()).data.status).toBe('New');

    const onlineRes = await request.patch('/api/v1/tech/profile/availability', {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { availability: 'Available' },
    });
    expect(onlineRes.status()).toBe(200);
    expect((await onlineRes.json()).data.autoAssigned.assignedCount).toBeGreaterThan(0);

    // The backlog sweep ran, so the request is no longer sitting unassigned.
    const after = await request.get(`/api/v1/service-requests/${srId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sr = (await after.json()).data;
    expect(sr.status).toBe('Assigned');
    expect(sr.technician).toBeTruthy();
  });
});

test.describe('spare part request reaches an approver', () => {
  /** Drives a job to the point where a spare part is needed. */
  async function jobAwaitingPart(request) {
    const { categoryKey, adminToken } = await isolatedCategory(request);
    const tech = await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);
    const { serviceRequest } = await book(request, customer, categoryKey);
    const auth = { headers: { Authorization: `Bearer ${tech.token}` } };

    const acceptRes = await request.post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`, { ...auth, data: {} });
    const jobId = (await acceptRes.json()).data.id;
    await request.post(`/api/v1/tech/jobs/${jobId}/start-travel`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/arrive`, auth);
    await request.post(`/api/v1/tech/jobs/${jobId}/diagnosis`, { ...auth, data: { notes: 'needs a part' } });
    await request.post(`/api/v1/tech/jobs/${jobId}/spare-parts`, {
      ...auth,
      data: { parts: [{ name: 'Compressor', price: 3200, checked: true }], additionalServices: [] },
    });
    return { jobId, srId: serviceRequest.id, tech, customer, adminToken, auth };
  }

  test('a request raised against a job reaches the NCC queue', async ({ request }) => {
    const { jobId, tech, adminToken } = await jobAwaitingPart(request);

    const poRes = await request.post('/api/v1/tech/inventory/part-orders', {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { job: jobId, partName: 'Compressor', qty: 1, price: 3200, orderSource: 'NCC Warehouse' },
    });
    expect(poRes.status()).toBe(201);
    const partOrder = (await poRes.json()).data;
    // The job link is what ties the order to a customer's request — without it
    // the order belongs to nobody and no console can see it.
    expect(partOrder.job).toBeTruthy();

    const queueRes = await request.get('/api/v1/super-admin/part-orders?limit=200', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(queueRes.status()).toBe(200);
    expect((await queueRes.json()).data.some((p) => p.id === partOrder.id)).toBe(true);
  });

  test('approving it schedules the revisit and advances the request', async ({ request }) => {
    const { jobId, srId, tech, adminToken } = await jobAwaitingPart(request);
    const poRes = await request.post('/api/v1/tech/inventory/part-orders', {
      headers: { Authorization: `Bearer ${tech.token}` },
      data: { job: jobId, partName: 'Compressor', qty: 1, price: 3200, orderSource: 'NCC Warehouse' },
    });
    const partOrder = (await poRes.json()).data;

    const apprRes = await request.patch(`/api/v1/super-admin/part-orders/${partOrder.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'Approved', scheduledDate: '2026-09-01', timeSlot: '10:00 AM - 01:00 PM' },
    });
    expect(apprRes.status()).toBe(200);

    const jobRes = await request.get(`/api/v1/tech/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${tech.token}` },
    });
    const job = (await jobRes.json()).data;
    expect(job.activeStep).toBe('revisit_scheduled');
    expect(job.revisit.status).toBe('Scheduled');
    expect(job.revisit.timeSlot).toBe('10:00 AM - 01:00 PM');

    const srRes = await request.get(`/api/v1/service-requests/${srId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect((await srRes.json()).data.status).toBe('Spare Received');
  });

  test('the technician can finish the revisit and get paid for it', async ({ request }) => {
    const { jobId, srId, tech, customer, adminToken, auth } = await jobAwaitingPart(request);
    const poRes = await request.post('/api/v1/tech/inventory/part-orders', {
      ...auth,
      data: { job: jobId, partName: 'Compressor', qty: 1, price: 3200, orderSource: 'NCC Warehouse' },
    });
    const partOrder = (await poRes.json()).data;
    await request.patch(`/api/v1/super-admin/part-orders/${partOrder.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'Approved' },
    });

    // The return visit reuses the ordinary endpoints; the server aliases them
    // into the revisit branch.
    const travel = await request.post(`/api/v1/tech/jobs/${jobId}/start-travel`, auth);
    expect((await travel.json()).data.activeStep).toBe('revisit_ontheway');
    const arrive = await request.post(`/api/v1/tech/jobs/${jobId}/arrive`, auth);
    expect((await arrive.json()).data.activeStep).toBe('revisit_arrived');
    const done = await request.post(`/api/v1/tech/jobs/${jobId}/repair-complete`, auth);
    expect((await done.json()).data.activeStep).toBe('revisit_complete');

    const billing = await request.post(`/api/v1/tech/jobs/${jobId}/billing`, auth);
    expect(billing.status()).toBe(200);
    expect((await billing.json()).data.activeStep).toBe('revisit_billing');

    const pay = await request.post(`/api/v1/tech/jobs/${jobId}/collect-payment`, { ...auth, data: { paymentMethod: 'Cash' } });
    expect(pay.status()).toBe(200);
    expect((await pay.json()).data.job.activeStep).toBe('completed');

    const srRes = await request.get(`/api/v1/service-requests/${srId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect((await srRes.json()).data.status).toBe('Customer Confirmation');

    // The customer's booking has to close out too, not sit on Upcoming.
    const bkRes = await request.get('/api/v1/bookings?limit=1&sort=-createdAt', {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect((await bkRes.json()).data[0].status).toBe('Completed');
  });

  test('is closed to anyone who is not a super admin', async ({ request }) => {
    const { tech } = await jobAwaitingPart(request);
    const res = await request.get('/api/v1/super-admin/part-orders', {
      headers: { Authorization: `Bearer ${tech.token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('booking advance payment', () => {
  test('a verified signature marks the advance paid', async ({ request }) => {
    const { categoryKey } = await isolatedCategory(request);
    await createTechnician(request, { specs: [categoryKey] });
    const customer = await createCustomer(request);
    const auth = { headers: { Authorization: `Bearer ${customer.token}` } };

    const { booking, razorpay } = await book(request, customer, categoryKey, {
      paymentMode: 'advance',
      paymentMethod: 'UPI',
    });
    expect(booking.advanceAmount).toBeGreaterThan(0);
    expect(booking.advancePaid).toBe(false);
    expect(razorpay.orderId).toBeTruthy();

    const signRes = await request.post('/api/v1/_dev/razorpay-sign', {
      data: { orderId: razorpay.orderId, paymentId: 'pay_e2e_advance' },
    });
    const { signature } = (await signRes.json()).data;

    const verifyRes = await request.post(`/api/v1/bookings/${booking.id}/verify-payment`, {
      ...auth,
      data: { razorpayPaymentId: 'pay_e2e_advance', razorpaySignature: signature },
    });
    expect(verifyRes.status()).toBe(200);
    const verified = (await verifyRes.json()).data;
    expect(verified.booking.advancePaid).toBe(true);
    expect(verified.payment.status).toBe('Success');

    const reread = await request.get(`/api/v1/bookings/${booking.id}`, auth);
    expect((await reread.json()).data.advancePaid).toBe(true);
  });
});
