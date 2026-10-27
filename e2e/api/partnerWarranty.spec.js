import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/partner-warranty/*.routes.js over real HTTP — the
// client's Partner Warranty testing guide, step by step: Super Admin setup →
// customer claim (NCCW) → brand approve / reject / request info → automatic
// Service Job (NCCJ) offered to the matching partner → partner accepts and
// works the job → customer confirms → Closed, with the customer, brand and
// Super Admin views in sync, brand isolation, B2B2C payout and SLA views.
// Every fixture is created through the API (plus the NODE_ENV=test-only
// /_dev routes for accounts), and each test uses its own brand, city and
// partner so parallel workers never offer each other's jobs.

const YEAR = new Date().getFullYear();
const PDF = Buffer.from('%PDF-1.4\n%e2e warranty\n');
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function session(request, role, identifier) {
  const loginRes = await request.post('/api/v1/auth/login', { data: { role, identifier, password: 'password123' } });
  expect(loginRes.status()).toBe(200);
  if (role === 'customer' || role === 'service_provider') return (await loginRes.json()).data.accessToken;
  const code = (await (await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } })).json()).data.accessToken;
}

/** Calls the API as `token`, expects `status`, returns `data`. */
async function call(request, method, path, token, data, status = 200) {
  const res = await request[method](`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(data ? { data } : {}),
  });
  const body = await res.json();
  expect(res.status(), `${method.toUpperCase()} ${path} → ${JSON.stringify(body.error || body)}`).toBe(status);
  return body.data;
}

async function upload(request, token, name) {
  const res = await request.post('/api/v1/uploads', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name, mimeType: 'application/pdf', buffer: PDF } },
  });
  expect(res.status()).toBe(200);
  return { url: (await res.json()).data.url, name };
}

/** Guide Step 1: an active, warranty-enabled brand covering AC, its group and
 * issue, the brand's staff (plus a second brand's), one AC partner in the
 * customer's city, and a customer. */
async function setup(request) {
  const tag = randomUUID().slice(0, 8);
  const city = `PwCity${tag}`;

  const adminEmail = `pw-admin-${tag}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email: adminEmail, password: 'password123' } });
  const admin = await session(request, 'super_admin', adminEmail);

  const ac = (await call(request, 'get', '/super-admin/catalogue/categories', admin)).find((c) => c.key === 'AC');
  const brand = await call(request, 'post', '/super-admin/brands', admin, { name: `PW Brand ${tag}`, status: 'Active' }, 201);
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${brand.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const other = await call(request, 'post', '/super-admin/brands', admin, { name: `PW Other ${tag}`, status: 'Active' }, 201);
  await call(request, 'put', `/super-admin/warranty-catalog/brands/${other.id}`, admin, { warrantyEnabled: true, coverage: [ac.id] });
  const group = await call(request, 'post', '/super-admin/warranty-catalog/groups', admin, { name: `Aircare ${tag}`, slug: `pw-${tag}`, categories: [ac.id] }, 201);
  const issue = await call(request, 'post', '/super-admin/warranty-catalog/issues', admin, { category: ac.id, name: `Not Cooling ${tag}` }, 201);

  const staff = async (brandId, label) => {
    const email = `pw-${label}-${tag}@e2e.test`;
    await request.post('/api/v1/_dev/test-user', { data: { role: 'brand_admin', email, password: 'password123', brand: brandId } });
    return session(request, 'brand_admin', email);
  };
  const [brandAdmin, otherAdmin] = [await staff(brand.id, 'brand'), await staff(other.id, 'other')];

  const partnerPhone = uniquePhone();
  const sp = (await (await request.post('/api/v1/_dev/test-serviceProvider', {
    data: { phone: partnerPhone, password: 'password123', specs: ['AC'], serviceCityName: city, availability: 'Available' },
  })).json()).data;
  const partner = await session(request, 'service_provider', partnerPhone);

  const customerPhone = uniquePhone();
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone: customerPhone, password: 'password123' } });
  const customer = await session(request, 'customer', customerPhone);

  // Cancel any claim this test leaves open so its partner offer never lingers.
  const cleanup = async (claimId) => {
    await request.post(`/api/v1/super-admin/warranty-claims/${claimId}/cancel`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: { reason: 'e2e cleanup' },
    });
  };
  return { tag, city, ac, brand, other, group, issue, admin, brandAdmin, otherAdmin, partner, partnerId: sp.serviceProviderId, customer, cleanup };
}

/** Guide Step 2: browse group → brand → product → issue, upload the documents, submit. */
async function submitClaim(request, w, overrides = {}) {
  const groups = await call(request, 'get', '/partner-warranty/groups');
  expect(groups.map((g) => g.name)).toContain(w.group.name);
  const brands = await call(request, 'get', `/partner-warranty/brands?group=${w.group.slug}`);
  expect(brands.map((b) => b.id)).toContain(w.brand.id);
  const { products } = await call(request, 'get', `/partner-warranty/brands/${w.brand.id}/products?group=${w.group.slug}`);
  expect(products.map((p) => p.id)).toContain(w.ac.id);
  const { issues } = await call(request, 'get', `/partner-warranty/products/${w.ac.id}/issues`);
  expect(issues.map((i) => i.id)).toContain(w.issue.id);

  const [invoice, photo, card] = await Promise.all(['invoice.pdf', 'photo.pdf', 'warranty-card.pdf'].map((n) => upload(request, w.customer, n)));
  return call(request, 'post', '/partner-warranty/claims', w.customer, {
    brandId: w.brand.id,
    groupId: w.group.id,
    categoryId: w.ac.id,
    issueId: w.issue.id,
    modelNumber: 'LG-AC-2022',
    serialNumber: `SN-${w.tag}`,
    purchaseDate: new Date(Date.now() - 300 * 864e5).toISOString().slice(0, 10),
    remarks: 'AC not cooling at all',
    address: { house: '4 Civil Lines', city: w.city, state: 'RJ', pincode: '302001' },
    documents: [
      { kind: 'invoice', ...invoice },
      { kind: 'product_photo', ...photo },
      { kind: 'warranty_card', ...card },
    ],
    ...overrides,
  }, 201);
}

/** The same claim as the customer, the brand and Super Admin read it. */
async function expectStatus(request, w, id, status) {
  const [c, b, a] = await Promise.all([
    call(request, 'get', `/partner-warranty/claims/${id}`, w.customer),
    call(request, 'get', `/brand/warranty-claims/${id}`, w.brandAdmin),
    call(request, 'get', `/super-admin/warranty-claims/${id}`, w.admin),
  ]);
  expect([c.status, b.status, a.status]).toEqual([status, status, status]);
  return { customer: c, brand: b, admin: a };
}

test.describe('Partner Warranty — the testing guide, over the API', () => {
  test('submit → brand approves → NCCJ job → partner accepts and works it → customer confirms → Closed', async ({ request }) => {
    test.setTimeout(90_000);
    const w = await setup(request);

    // ── Step 2: customer submits ──
    const claim = await submitClaim(request, w);
    expect(claim.humanId).toMatch(new RegExp(`^NCCW-${YEAR}-\\d{6}$`));
    expect(claim.status).toBe('Submitted');
    expect(claim.documents.map((d) => d.kind)).toEqual(['invoice', 'product_photo', 'warranty_card']);
    const mine = await call(request, 'get', '/partner-warranty/claims', w.customer);
    expect(mine.find((c) => c.id === claim.id)).toBeTruthy();
    let track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
    expect(track).toMatchObject({ humanId: claim.humanId, statusLabel: 'Claim Submitted', partner: null, serviceJobId: null });

    // Super Admin sees every brand's claims; filters by brand.
    const adminRows = await call(request, 'get', `/super-admin/warranty-claims?brand=${w.brand.id}`, w.admin);
    expect(adminRows.find((r) => r.id === claim.id)).toMatchObject({ humanId: claim.humanId, status: 'Submitted' });

    // ── Step 3: only the claim's brand sees it ──
    const brandRows = await call(request, 'get', '/brand/warranty-claims', w.brandAdmin);
    expect(brandRows.map((r) => r.id)).toContain(claim.id);
    const otherRows = await call(request, 'get', '/brand/warranty-claims', w.otherAdmin);
    expect(otherRows.map((r) => r.id)).not.toContain(claim.id);
    await call(request, 'get', `/brand/warranty-claims/${claim.id}`, w.otherAdmin, undefined, 404);
    await call(request, 'post', `/brand/warranty-claims/${claim.id}/approve`, w.otherAdmin, { remarks: 'not mine' }, 404);

    // Option A — approve. ── Step 4: NCC creates the Service Job automatically ──
    await call(request, 'post', `/brand/warranty-claims/${claim.id}/approve`, w.brandAdmin, { remarks: 'Verified. In warranty.' });
    let v = await expectStatus(request, w, claim.id, 'Job Created');
    track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
    expect(track.statusLabel).toBe('Warranty Approved');
    expect(track.serviceJobId).toMatch(new RegExp(`^NCCJ-${YEAR}-\\d{6}$`));
    const jobNumber = track.serviceJobId;
    expect(v.admin.serviceJobs.find((j) => j.current)).toMatchObject({ humanId: jobNumber });

    // ── Step 5: the partner gets the warranty offer and accepts ──
    const offer = (await call(request, 'get', '/service-provider/jobs/available', w.partner)).find((o) => o.warranty?.jobId === jobNumber);
    expect(offer, 'warranty job offered to the matching partner').toBeTruthy();
    expect(offer.warranty).toMatchObject({ serviceLabel: 'Warranty Service', claimId: claim.humanId, brand: w.brand.name, customerPays: 0 });
    await call(request, 'post', `/service-provider/jobs/accept/${offer.id}`, w.partner, { type: 'NCC Paid Service' });
    v = await expectStatus(request, w, claim.id, 'Partner Assigned');
    track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
    expect(track.statusLabel).toBe('Partner Assigned');
    expect(track.partner?.name).toBeTruthy();

    // ── Step 6: service execution ──
    const job = (await call(request, 'get', '/service-provider/jobs/active', w.partner)).find((j) => j.warranty?.claimId === claim.humanId);
    expect(job).toBeTruthy();
    await call(request, 'post', `/service-provider/jobs/${job.id}/start-travel`, w.partner);
    await expectStatus(request, w, claim.id, 'Technician On Way');
    await call(request, 'post', `/service-provider/jobs/${job.id}/arrive`, w.partner);
    await expectStatus(request, w, claim.id, 'Service In Progress');
    await call(request, 'post', `/service-provider/jobs/${job.id}/diagnosis`, w.partner, { notes: 'Low gas' });
    await call(request, 'post', `/service-provider/jobs/${job.id}/spare-parts`, w.partner, { parts: [] });
    await call(request, 'post', `/service-provider/jobs/${job.id}/repair-complete`, w.partner);
    const billing = (await call(request, 'post', `/service-provider/jobs/${job.id}/billing`, w.partner)).billingEstimate;
    expect(billing).toMatchObject({ total: 0, amountToCollect: 0 });
    const otp = (await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer)).completionOtp;
    expect(otp).toBeTruthy();
    await call(request, 'post', `/service-provider/jobs/${job.id}/collect-payment`, w.partner, { paymentMethod: 'Cash', otp });
    await expectStatus(request, w, claim.id, 'Service Completed');

    // ── Step 7: customer confirms → Closed everywhere ──
    track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
    expect(track).toMatchObject({ statusLabel: 'Service Completed', canConfirm: true });
    await call(request, 'post', `/partner-warranty/claims/${claim.id}/confirm`, w.customer);
    v = await expectStatus(request, w, claim.id, 'Closed');

    // Timeline follows the guide's order.
    const path = v.admin.timeline.filter((e) => e.toStatus).map((e) => e.toStatus);
    expect(path).toEqual(['Approved', 'Job Created', 'Partner Assigned', 'Technician On Way', 'Service In Progress', 'Service Completed', 'Closed']);

    // ── B2B2C payout: partner sees it, Super Admin settles it once ──
    const payouts = await call(request, 'get', '/service-provider/warranty-jobs/payouts', w.partner);
    expect(payouts).toMatchObject({ jobs: 1 });
    const owed = await call(request, 'get', `/super-admin/b2b2c-payouts?brand=${w.brand.id}`, w.admin);
    expect(owed.map((r) => String(r.serviceProvider.id))).toContain(String(w.partnerId));
    const settle = { serviceProviderId: w.partnerId, jobIds: [job.id], reference: `UTR-${w.tag}` };
    await call(request, 'post', '/super-admin/b2b2c-payouts/settle', w.admin, settle);
    await call(request, 'post', '/super-admin/b2b2c-payouts/settle', w.admin, settle, 409);

    // ── SLA overview lists the brand ──
    const sla = await call(request, 'get', '/super-admin/warranty-claims/sla-summary', w.admin);
    expect(JSON.stringify(sla)).toContain(w.brand.name);
  });

  test('Option B — reject needs a reason, and the customer sees "Not Approved"', async ({ request }) => {
    const w = await setup(request);
    const claim = await submitClaim(request, w);
    await call(request, 'post', `/brand/warranty-claims/${claim.id}/reject`, w.brandAdmin, {}, 400);
    await call(request, 'post', `/brand/warranty-claims/${claim.id}/reject`, w.brandAdmin, {
      reason: 'Warranty expired',
      rejectionCode: 'OUT_OF_WARRANTY',
    });
    await expectStatus(request, w, claim.id, 'Rejected');
    const track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
    expect(track).toMatchObject({ statusLabel: 'Not Approved', rejectionReason: 'Warranty expired', serviceJobId: null });
  });

  test('Option C — request more info → customer replies with a document → back to brand review', async ({ request }) => {
    const w = await setup(request);
    const claim = await submitClaim(request, w);
    try {
      const question = 'Please upload a clearer photo of the serial number';
      await call(request, 'post', `/brand/warranty-claims/${claim.id}/request-info`, w.brandAdmin, { message: question });
      await expectStatus(request, w, claim.id, 'Info Requested');
      const track = await call(request, 'get', `/partner-warranty/claims/${claim.id}/track`, w.customer);
      expect(track).toMatchObject({ statusLabel: 'Action Needed: More Information', actionNeeded: true });

      const sticker = await upload(request, w.customer, 'serial.pdf');
      await call(request, 'post', `/partner-warranty/claims/${claim.id}/info-response`, w.customer, {
        message: 'Clearer photo attached',
        documents: [{ kind: 'additional', ...sticker }],
      });
      const v = await expectStatus(request, w, claim.id, 'Brand Review');
      expect(v.brand.infoRequests.at(-1)).toMatchObject({ message: question, response: 'Clearer photo attached' });
      expect(v.brand.documents.map((d) => d.kind)).toContain('additional');
    } finally {
      await w.cleanup(claim.id);
    }
  });
});
