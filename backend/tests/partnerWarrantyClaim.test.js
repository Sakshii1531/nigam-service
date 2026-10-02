import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { ROLES } from '../src/config/constants.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { appendEvent } from '../src/modules/partner-warranty/claimTimeline.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { jobFlow } from './helpers/jobFlow.js';

const TEST_DB_URI = testDbUri('partnerWarrantyClaim');
const YEAR = new Date().getFullYear();
const HOUR = 3600 * 1000;

let app;
const flow = jobFlow(() => app, { phoneStart: 9310300000 });
const api = () => request(app);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
let emailSeq = 0;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  app = await listenOnLoopback(createApp());
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all(
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, User, AuditLog, Notification].map((m) => m.deleteMany({})),
  );
});

async function staffToken(role, extra = {}) {
  const email = `pw-claim-${emailSeq++}@test.local`;
  const user = await User.create({ role, name: `${role} ${emailSeq}`, email, passwordHash: await hashPassword('password123'), ...extra });
  return { user, token: await flow.loginAndVerify({ role, identifier: email }) };
}

async function customerWithAddress() {
  const { user, token } = await flow.customer();
  user.addresses.push({ house: '12 MG Road', city: 'Indore', state: 'MP', pincode: '452001', latitude: 22.72, longitude: 75.86 });
  await user.save();
  return { user, token, addressId: String(user.addresses[0]._id) };
}

async function upload(token, name = 'invoice.pdf') {
  const res = await api()
    .post('/api/v1/uploads')
    .set(bearer(token))
    .attach('file', Buffer.from('%PDF-1.4\n%test\n'), { filename: name, contentType: 'application/pdf' })
    .expect(200);
  return res.body.data.url;
}

async function world() {
  const [ac, fridge] = await Category.create([
    { key: 'AC', name: 'Air Conditioner' },
    { key: 'Refrigerator', name: 'Refrigerator' },
  ]);
  const group = await WarrantyGroup.create({ name: 'AirCare', slug: 'aircare', categories: [ac._id] });
  const [lg, samsung] = await Brand.create([
    { name: 'LG', status: 'Active', warrantyEnabled: true, coverage: [ac._id], warrantyMonths: 24, warrantySla: { approvalHours: 12 } },
    { name: 'Samsung', status: 'Active', warrantyEnabled: true, coverage: [ac._id, fridge._id] },
  ]);
  const [cooling, fridgeNoise] = await WarrantyIssue.create([
    { category: ac._id, name: 'Cooling Issue' },
    { category: fridge._id, name: 'Noise' },
  ]);
  return { ac, fridge, group, lg, samsung, cooling, fridgeNoise };
}

function claimBody(w, cust, overrides = {}) {
  return {
    brandId: String(w.lg._id),
    groupId: String(w.group._id),
    categoryId: String(w.ac._id),
    issueId: String(w.cooling._id),
    modelNumber: 'AS-Q18',
    serialNumber: 'LG123456',
    purchaseDate: new Date(Date.now() - 200 * 24 * HOUR).toISOString(),
    remarks: 'Blows warm air',
    addressId: cust.addressId,
    ...overrides,
  };
}

async function submit(w, cust, overrides = {}, expected = 201) {
  const invoice = overrides.documents ? null : await upload(cust.token);
  const body = claimBody(w, cust, { documents: [{ kind: 'invoice', url: invoice, name: 'invoice.pdf' }], ...overrides });
  return api().post('/api/v1/partner-warranty/claims').set(bearer(cust.token)).send(body).expect(expected);
}

describe('Phase 3 — submitting a claim', () => {
  it('creates an NCCW claim routed to the chosen brand, with the full record', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const before = Date.now();
    const res = await submit(w, cust);
    const view = res.body.data;

    expect(view.humanId).toMatch(new RegExp(`^NCCW-${YEAR}-\\d{6}$`));
    expect(view).toMatchObject({
      status: 'Submitted',
      statusLabel: 'Claim Submitted',
      actionNeeded: false,
      brand: { id: String(w.lg._id), name: 'LG' },
      productName: 'Air Conditioner',
      issueName: 'Cooling Issue',
      modelNumber: 'AS-Q18',
      serialNumber: 'LG123456',
      remarks: 'Blows warm air',
      address: { city: 'Indore', pincode: '452001' },
    });
    expect(view.documents).toHaveLength(1);
    expect(view.timeline).toEqual([expect.objectContaining({ action: 'CLAIM_SUBMITTED', by: 'customer' })]);

    // Stored side: routing key, warranty estimate, SLA from the brand's own 12 h.
    const saved = await WarrantyClaim.findById(view.id);
    expect(String(saved.brand)).toBe(String(w.lg._id));
    expect(String(saved.customer)).toBe(String(cust.user._id));
    expect(saved.categoryKey).toBe('AC');
    expect(saved.warrantyCheck).toMatchObject({ status: 'In Warranty', months: 24 });
    expect(saved.address.latitude).toBe(22.72);
    const due = saved.sla.brandApprovalDueAt.getTime() - before;
    expect(due).toBeGreaterThan(11.9 * HOUR);
    expect(due).toBeLessThan(12.1 * HOUR);

    expect(await AuditLog.countDocuments({ entityType: 'WarrantyClaim', entityId: saved._id })).toBe(1);
  });

  it('never shows the customer internal fields', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const view = (await submit(w, cust)).body.data;
    for (const key of ['flags', 'sla', 'warrantyCheck', 'customer', 'infoRequests', 'statusBeforeHold']) {
      expect(view).not.toHaveProperty(key);
    }
  });

  it('notifies the customer, that brand\'s users and super-admins — not other brands', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const lgAdmin = await staffToken(ROLES.BRAND_ADMIN, { brand: w.lg._id });
    const samsungAdmin = await staffToken(ROLES.BRAND_ADMIN, { brand: w.samsung._id });
    const superAdmin = await staffToken(ROLES.SUPER_ADMIN);

    const { id } = (await submit(w, cust)).body.data;

    const forCustomer = await Notification.find({ recipient: cust.user._id, title: 'Warranty Claim Submitted' });
    expect(forCustomer).toHaveLength(1);
    expect(forCustomer[0].cta.route).toBe(`/partner-warranty/claims/${id}`);
    const forLg = await Notification.find({ recipient: lgAdmin.user._id, title: 'New Warranty Claim' });
    expect(forLg).toHaveLength(1);
    expect(forLg[0].cta.route).toBe(`/brand-admin/warranty-claims/${id}`);
    expect(await Notification.countDocuments({ recipient: samsungAdmin.user._id })).toBe(0);
    expect(await Notification.countDocuments({ recipient: superAdmin.user._id, title: 'New Partner Warranty Claim' })).toBe(1);
  });

  it('accepts an inline address instead of a saved one', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const res = await submit(w, cust, { addressId: undefined, address: { house: 'Flat 3', city: 'Bhopal', pincode: '462001' } });
    expect(res.body.data.address).toMatchObject({ city: 'Bhopal', pincode: '462001' });
  });

  it('rejects incomplete or inconsistent submissions', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const url = await upload(cust.token, 'photo.pdf');
    const send = (overrides) =>
      api()
        .post('/api/v1/partner-warranty/claims')
        .set(bearer(cust.token))
        .send(claimBody(w, cust, { documents: [{ kind: 'invoice', url }], ...overrides }));

    // Invoice is required.
    expect((await send({ documents: [{ kind: 'product_photo', url }] })).status).toBe(400);
    // Evidence must be our own upload, not an arbitrary link.
    const external = await send({ documents: [{ kind: 'invoice', url: 'https://evil.example.com/inv.pdf' }] });
    expect(external.status).toBe(400);
    expect(external.body.error.message).toMatch(/uploaded through the app/);
    // Pincode, dates, addresses.
    expect((await send({ addressId: undefined, address: { city: 'X', pincode: '12' } })).status).toBe(400);
    expect((await send({ purchaseDate: new Date(Date.now() + 5 * 24 * HOUR).toISOString() })).status).toBe(400);
    expect((await send({ address: { pincode: '452001' } })).status).toBe(400); // both addressId and address
    expect((await send({ addressId: String(new mongoose.Types.ObjectId()) })).status).toBe(400);
    expect((await send({ serialNumber: '' })).status).toBe(400);
    // The brand must cover the product, and the issue must belong to it.
    const uncovered = await send({ categoryId: String(w.fridge._id), issueId: String(w.fridgeNoise._id) });
    expect(uncovered.status).toBe(400);
    expect(uncovered.body.error.message).toBe('LG does not accept warranty claims for Refrigerator');
    expect((await send({ issueId: String(w.fridgeNoise._id) })).status).toBe(400);

    expect(await WarrantyClaim.countDocuments()).toBe(0);
  });

  it('refuses a second open claim for the same brand + serial, but allows it once the first is closed', async () => {
    const w = await world();
    const cust = await customerWithAddress();
    const first = (await submit(w, cust)).body.data;

    const dup = await submit(w, cust, { serialNumber: 'lg123456' }, 409);
    expect(dup.body.error.details).toEqual({ existingClaim: first.humanId });

    // Same serial under another brand is a different product.
    await submit(w, cust, { brandId: String(w.samsung._id) }, 201);

    await WarrantyClaim.updateOne({ _id: first.id }, { status: 'Rejected' });
    await submit(w, cust, {}, 201);
  });

  it('is for customers only', async () => {
    const w = await world();
    const brandAdmin = await staffToken(ROLES.BRAND_ADMIN, { brand: w.lg._id });
    await api().get('/api/v1/partner-warranty/claims').set(bearer(brandAdmin.token)).expect(403);
    await api().get('/api/v1/partner-warranty/claims').expect(401);
  });
});

describe('Phase 3 — reading my claims', () => {
  it('lists and opens only my own claims, by id or ticket number', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const other = await customerWithAddress();
    const mine = (await submit(w, me)).body.data;
    const theirs = (await submit(w, other, { serialNumber: 'OTHER-1' })).body.data;

    const list = await api().get('/api/v1/partner-warranty/claims').set(bearer(me.token)).expect(200);
    expect(list.body.data.map((c) => c.humanId)).toEqual([mine.humanId]);
    expect(list.body.meta.total).toBe(1);

    await api().get(`/api/v1/partner-warranty/claims/${mine.id}`).set(bearer(me.token)).expect(200);
    const byTicket = await api().get(`/api/v1/partner-warranty/claims/${mine.humanId}`).set(bearer(me.token)).expect(200);
    expect(byTicket.body.data.id).toBe(mine.id);

    await api().get(`/api/v1/partner-warranty/claims/${theirs.id}`).set(bearer(me.token)).expect(404);
    await api().get(`/api/v1/partner-warranty/claims/${theirs.humanId}`).set(bearer(me.token)).expect(404);
  });

  it('filters open vs closed', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const a = (await submit(w, me)).body.data;
    await submit(w, me, { serialNumber: 'SECOND' });
    await WarrantyClaim.updateOne({ _id: a.id }, { status: 'Closed' });

    const open = await api().get('/api/v1/partner-warranty/claims?status=open').set(bearer(me.token)).expect(200);
    const closed = await api().get('/api/v1/partner-warranty/claims?status=closed').set(bearer(me.token)).expect(200);
    expect(open.body.data).toHaveLength(1);
    expect(closed.body.data.map((c) => c.id)).toEqual([a.id]);
  });
});

describe('Phase 3 — adding documents', () => {
  it('adds documents to an open claim and records it', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const claim = (await submit(w, me)).body.data;
    const url = await upload(me.token, 'card.pdf');

    const res = await api()
      .post(`/api/v1/partner-warranty/claims/${claim.id}/documents`)
      .set(bearer(me.token))
      .send({ documents: [{ kind: 'warranty_card', url }] })
      .expect(200);
    expect(res.body.data.documents.map((d) => d.kind)).toEqual(['invoice', 'warranty_card']);
    expect(res.body.data.timeline.map((e) => e.action)).toEqual(['CLAIM_SUBMITTED', 'DOCUMENT_ADDED']);
  });

  it('refuses documents on a closed claim', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const claim = (await submit(w, me)).body.data;
    await WarrantyClaim.updateOne({ _id: claim.id }, { status: 'Closed' });
    const url = await upload(me.token);
    await api()
      .post(`/api/v1/partner-warranty/claims/${claim.id}/documents`)
      .set(bearer(me.token))
      .send({ documents: [{ kind: 'additional', url }] })
      .expect(409);
  });
});

describe('Phase 3 — answering "request more information"', () => {
  /** Puts a claim where Phase 4's brand action will: Info Requested, with an internal note alongside. */
  async function askForInfo(claimId, brandUserId) {
    const claim = await WarrantyClaim.findById(claimId);
    const actor = { kind: 'brand', user: brandUserId, name: 'LG Reviewer' };
    claim.infoRequests.push({ message: 'Please upload a photo of the serial sticker', requestedBy: brandUserId });
    appendEvent(claim, { action: 'NOTE_ADDED', actor, note: 'Looks like a grey import', visibility: 'brand' });
    appendEvent(claim, { action: 'INFO_REQUESTED', toStatus: 'Info Requested', actor, note: 'Please upload a photo of the serial sticker' });
    await claim.save();
  }

  it('shows the request, takes the answer + photo, and hands the claim back to the brand', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const lgAdmin = await staffToken(ROLES.BRAND_ADMIN, { brand: w.lg._id });
    const claim = (await submit(w, me)).body.data;
    await askForInfo(claim.id, lgAdmin.user._id);

    const pending = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(me.token)).expect(200);
    expect(pending.body.data).toMatchObject({
      status: 'Info Requested',
      actionNeeded: true,
      infoRequest: { message: 'Please upload a photo of the serial sticker' },
    });
    // The brand's internal note stays internal.
    expect(pending.body.data.timeline.map((e) => e.action)).toEqual(['CLAIM_SUBMITTED', 'INFO_REQUESTED']);
    expect(JSON.stringify(pending.body.data)).not.toContain('grey import');
    expect(JSON.stringify(pending.body.data)).not.toContain('LG Reviewer');

    const photo = await upload(me.token, 'serial.pdf');
    const res = await api()
      .post(`/api/v1/partner-warranty/claims/${claim.id}/info-response`)
      .set(bearer(me.token))
      .send({ message: 'Here it is', documents: [{ kind: 'product_photo', url: photo }] })
      .expect(200);
    expect(res.body.data).toMatchObject({ status: 'Brand Review', statusLabel: 'Brand Verification', actionNeeded: false, infoRequest: null });

    const saved = await WarrantyClaim.findById(claim.id);
    expect(saved.infoRequests[0]).toMatchObject({ response: 'Here it is' });
    expect(saved.infoRequests[0].respondedAt).toBeInstanceOf(Date);
    expect(String(saved.documents[1].infoRequest)).toBe(String(saved.infoRequests[0]._id));
    expect(await Notification.countDocuments({ recipient: lgAdmin.user._id, title: 'Customer Sent More Information' })).toBe(1);
  });

  it('refuses an answer nobody asked for, or an empty one', async () => {
    const w = await world();
    const me = await customerWithAddress();
    const claim = (await submit(w, me)).body.data;
    await api().post(`/api/v1/partner-warranty/claims/${claim.id}/info-response`).set(bearer(me.token)).send({ message: 'hi' }).expect(409);

    await askForInfo(claim.id, new mongoose.Types.ObjectId());
    await api().post(`/api/v1/partner-warranty/claims/${claim.id}/info-response`).set(bearer(me.token)).send({}).expect(400);
  });
});
