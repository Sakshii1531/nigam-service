import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyBrand');

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310400000 });
const { api, bearer } = kit;

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

/** LG + Samsung admins, one customer, one LG claim. */
async function scenario() {
  const w = await kit.world();
  const [lg, samsung, cust] = await Promise.all([kit.brandAdmin(w.lg), kit.brandAdmin(w.samsung), kit.customer()]);
  const claim = await kit.submitClaim(w, cust);
  return { w, lg, samsung, cust, claim };
}

const claimUrl = (id, action = '') => `/api/v1/brand/warranty-claims/${id}${action ? `/${action}` : ''}`;

describe('Phase 4 — brand queue', () => {
  it('lists only the brand\'s own claims, with status counts for tabs', async () => {
    const { w, lg, samsung, cust, claim } = await scenario();
    await kit.submitClaim(w, cust, { brandId: String(w.samsung._id) });

    const mine = await api().get('/api/v1/brand/warranty-claims').set(bearer(lg.token)).expect(200);
    expect(mine.body.data.map((c) => c.humanId)).toEqual([claim.humanId]);
    expect(mine.body.data[0]).toMatchObject({
      status: 'Submitted',
      customer: { name: 'Test Customer' },
      productName: 'Air Conditioner',
      issueName: 'Cooling Issue',
      location: { city: 'Indore', pincode: '452001' },
      warrantyCheck: 'In Warranty',
    });
    expect(mine.body.meta.counts).toEqual({ Submitted: 1 });

    const theirs = await api().get('/api/v1/brand/warranty-claims').set(bearer(samsung.token)).expect(200);
    expect(theirs.body.data).toHaveLength(1);
    expect(theirs.body.data[0].humanId).not.toBe(claim.humanId);
  });

  it('filters by status, search, pincode and category', async () => {
    const { w, lg, claim } = await scenario();
    const other = await kit.customer({ pincode: '462001', city: 'Bhopal' });
    const second = await kit.submitClaim(w, other, { serialNumber: 'ZX-99' });
    await WarrantyClaim.updateOne({ _id: second.id }, { status: 'Rejected' });

    const get = (qs) => api().get(`/api/v1/brand/warranty-claims?${qs}`).set(bearer(lg.token)).expect(200);
    expect((await get('status=Submitted')).body.data.map((c) => c.id)).toEqual([claim.id]);
    expect((await get('status=Submitted,Rejected')).body.data).toHaveLength(2);
    expect((await get('q=zx-9')).body.data.map((c) => c.id)).toEqual([second.id]);
    expect((await get(`q=${claim.humanId}`)).body.data.map((c) => c.id)).toEqual([claim.id]);
    expect((await get('pincode=462001')).body.data.map((c) => c.id)).toEqual([second.id]);
    expect((await get('category=Refrigerator')).body.data).toHaveLength(0);
    // Counts ignore the filters — they are the tab badges.
    expect((await get('status=Submitted')).body.meta.counts).toEqual({ Submitted: 1, Rejected: 1 });
  });

  it('is for brand admins only', async () => {
    const { cust } = await scenario();
    await api().get('/api/v1/brand/warranty-claims').set(bearer(cust.token)).expect(403);
  });
});

describe('Phase 4 — brand opens a claim', () => {
  it('shows the full claim and moves a new one to Brand Review once', async () => {
    const { lg, cust, claim } = await scenario();

    const res = await api().get(claimUrl(claim.id)).set(bearer(lg.token)).expect(200);
    expect(res.body.data).toMatchObject({
      status: 'Brand Review',
      customerStatusLabel: 'Brand Verification',
      serialNumber: claim.serialNumber,
      remarks: 'Blows warm air',
      warrantyCheck: { status: 'In Warranty', months: 24 },
      customer: { name: 'Test Customer' },
    });
    expect(res.body.data.documents).toHaveLength(1);
    expect(res.body.data.timeline.map((e) => e.action)).toEqual(['CLAIM_SUBMITTED', 'BRAND_OPENED']);

    // Opening again doesn't add another event.
    await api().get(claimUrl(claim.humanId)).set(bearer(lg.token)).expect(200);
    expect((await WarrantyClaim.findById(claim.id)).timeline).toHaveLength(2);

    // The customer sees "Brand Verification".
    const mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(mine.body.data.statusLabel).toBe('Brand Verification');
  });

  it('returns 404 for another brand\'s claim — by id or ticket', async () => {
    const { samsung, claim } = await scenario();
    await api().get(claimUrl(claim.id)).set(bearer(samsung.token)).expect(404);
    await api().get(claimUrl(claim.humanId)).set(bearer(samsung.token)).expect(404);
    await api().post(claimUrl(claim.id, 'approve')).set(bearer(samsung.token)).send({}).expect(404);
    expect((await WarrantyClaim.findById(claim.id)).status).toBe('Submitted');
  });
});

describe('Phase 4 — decisions', () => {
  it('approves, notifying the customer and super-admins, with an audit row', async () => {
    const { lg, cust, claim } = await scenario();
    const admin = await kit.superAdmin();

    const res = await api().post(claimUrl(claim.id, 'approve')).set(bearer(lg.token)).send({ remarks: 'Serial verified' }).expect(200);
    // Approval hands straight on to the Service Job (Phase 5); the Approved step is in the history.
    expect(res.body.data.status).toBe('Job Created');
    expect(res.body.data.timeline.map((e) => e.toStatus)).toContain('Approved');

    const customerNote = await Notification.findOne({ recipient: cust.user._id, title: 'Warranty Claim Approved' });
    expect(customerNote.message).toMatch(/LG approved/);
    expect(await Notification.countDocuments({ recipient: admin.user._id, title: 'Warranty Claim Approved' })).toBe(1);

    const audit = await AuditLog.findOne({ entityId: claim.id, toStatus: 'Approved' });
    expect(audit).toMatchObject({ fromStatus: 'Submitted', reason: 'Serial verified', type: 'Warranty' });
    expect(String(audit.user)).toBe(String(lg.user._id));

    // Decided claims can't be decided again.
    await api().post(claimUrl(claim.id, 'reject')).set(bearer(lg.token)).send({ reason: 'Changed my mind' }).expect(409);
  });

  it('rejects only with a reason, and the customer sees it', async () => {
    const { lg, cust, claim } = await scenario();
    await api().post(claimUrl(claim.id, 'reject')).set(bearer(lg.token)).send({}).expect(400);
    await api().post(claimUrl(claim.id, 'reject')).set(bearer(lg.token)).send({ reason: 'no' }).expect(400);
    expect((await WarrantyClaim.findById(claim.id)).status).toBe('Submitted');

    await api()
      .post(claimUrl(claim.id, 'reject'))
      .set(bearer(lg.token))
      .send({ reason: 'Physical damage is not covered' })
      .expect(200);

    const mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(mine.body.data).toMatchObject({ status: 'Rejected', statusLabel: 'Not Approved', rejectionReason: 'Physical damage is not covered' });
    const note = await Notification.findOne({ recipient: cust.user._id, title: 'Warranty Claim Not Approved' });
    expect(note.message).toContain('Physical damage is not covered');
  });

  it('lets only one of two simultaneous decisions win', async () => {
    const { lg, claim } = await scenario();
    const second = await kit.brandAdmin({ _id: (await WarrantyClaim.findById(claim.id)).brand });

    const [a, b] = await Promise.all([
      api().post(claimUrl(claim.id, 'approve')).set(bearer(lg.token)).send({}),
      api().post(claimUrl(claim.id, 'reject')).set(bearer(second.token)).send({ reason: 'Duplicate of an old ticket' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);

    const saved = await WarrantyClaim.findById(claim.id);
    const decisions = saved.timeline.filter((e) => ['CLAIM_APPROVED', 'CLAIM_REJECTED'].includes(e.action));
    expect(decisions).toHaveLength(1);
    expect(await AuditLog.countDocuments({ entityId: claim.id, toStatus: { $in: ['Approved', 'Rejected'] } })).toBe(1);
  });
});

describe('Phase 4 — request more information (end to end with the customer)', () => {
  it('asks, the customer answers with a photo, and the brand sees it on the same claim', async () => {
    const { lg, cust, claim } = await scenario();

    await api().post(claimUrl(claim.id, 'request-info')).set(bearer(lg.token)).send({ message: 'hi' }).expect(400);
    await api()
      .post(claimUrl(claim.id, 'request-info'))
      .set(bearer(lg.token))
      .send({ message: 'Please upload a photo of the serial sticker' })
      .expect(200);
    // A second request before the customer answers is refused.
    await api().post(claimUrl(claim.id, 'request-info')).set(bearer(lg.token)).send({ message: 'And the box too please' }).expect(409);

    const asked = await Notification.findOne({ recipient: cust.user._id, title: 'Action Needed on Your Warranty Claim' });
    expect(asked.message).toContain('serial sticker');
    expect(asked.cta.route).toBe(`/partner-warranty/claims/${claim.id}`);

    const photo = await kit.upload(cust.token, 'sticker.pdf');
    await api()
      .post(`/api/v1/partner-warranty/claims/${claim.id}/info-response`)
      .set(bearer(cust.token))
      .send({ message: 'Attached', documents: [{ kind: 'product_photo', url: photo }] })
      .expect(200);

    const seen = await api().get(claimUrl(claim.id)).set(bearer(lg.token)).expect(200);
    expect(seen.body.data.status).toBe('Brand Review');
    expect(seen.body.data.infoRequests).toEqual([
      expect.objectContaining({ message: 'Please upload a photo of the serial sticker', response: 'Attached' }),
    ]);
    const answered = seen.body.data.documents.find((d) => d.infoRequest);
    expect(answered).toMatchObject({ kind: 'product_photo', url: photo, infoRequest: seen.body.data.infoRequests[0].id });

    // …and can now decide.
    await api().post(claimUrl(claim.id, 'approve')).set(bearer(lg.token)).send({}).expect(200);
  });
});

describe('Phase 4 — internal notes', () => {
  it('keeps brand notes away from the customer', async () => {
    const { lg, cust, claim } = await scenario();
    await api().post(claimUrl(claim.id, 'notes')).set(bearer(lg.token)).send({ note: 'Dealer says grey import' }).expect(200);

    const brandView = await api().get(claimUrl(claim.id)).set(bearer(lg.token)).expect(200);
    const note = brandView.body.data.timeline.find((e) => e.action === 'NOTE_ADDED');
    expect(note).toMatchObject({ note: 'Dealer says grey import', brandOnly: true });

    const mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(JSON.stringify(mine.body.data)).not.toContain('grey import');
  });
});
