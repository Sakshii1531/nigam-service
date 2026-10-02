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
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { autoAssignPendingRequests } from '../src/modules/service-requests/serviceRequest.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyAdmin');

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310800000 });
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

beforeEach(() =>
  Promise.all(
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, ServiceProvider, Job, User, AuditLog, Notification].map((m) =>
      m.deleteMany({}),
    ),
  ));

let seq = 0;
async function partner({ name = `Tech ${seq++}`, availability = 'Available', km = 2 } = {}) {
  const sp = await kit.flow.partner(['AC'], name);
  await ServiceProvider.updateOne(
    { _id: sp.serviceProvider._id },
    { serviceCityName: 'Indore', availability, location: { latitude: 22.72 + km / 111, longitude: 75.86 } },
  );
  return { ...sp, id: String(sp.serviceProvider._id), name };
}

async function scenario() {
  const w = await kit.world();
  const [lg, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.customer(), kit.superAdmin()]);
  const claim = await kit.submitClaim(w, cust);
  return { w, lg, cust, admin, claim };
}

const A = (s) => bearer(s.admin.token);
const adminUrl = (claim, path = '') => `/api/v1/super-admin/warranty-claims/${claim.id}${path ? `/${path}` : ''}`;
const brandApprove = (s) => api().post(`/api/v1/brand/warranty-claims/${s.claim.id}/approve`).set(bearer(s.lg.token)).send({}).expect(200);
const detail = async (s) => (await api().get(adminUrl(s.claim)).set(A(s)).expect(200)).body.data;
const currentSr = async (s) => ServiceRequest.findById((await WarrantyClaim.findById(s.claim.id)).serviceRequest);

describe('Phase 8 — all-brand list and detail', () => {
  it('lists every brand\'s claims with the client\'s columns, filters and counts; admins only', async () => {
    const s = await scenario();
    const ravi = await partner({ name: 'Ravi' });
    await brandApprove(s);
    const other = await kit.customer({ pincode: '462001', city: 'Bhopal' });
    const samsungClaim = await kit.submitClaim(s.w, other, { brandId: String(s.w.samsung._id), serialNumber: 'SS-777' });

    const all = await api().get('/api/v1/super-admin/warranty-claims').set(A(s)).expect(200);
    expect(all.body.data).toHaveLength(2);
    const lgRow = all.body.data.find((c) => c.id === s.claim.id);
    expect(lgRow).toMatchObject({
      humanId: s.claim.humanId,
      brand: { name: 'LG' },
      customer: { name: 'Test Customer' },
      productName: 'Air Conditioner',
      issueName: 'Cooling Issue',
      location: { city: 'Indore', pincode: '452001' },
      status: 'Job Created',
      assignedPartner: { id: ravi.id, name: 'Ravi' },
      serviceJob: { humanId: expect.stringMatching(/^NCCJ-/) },
      slaState: 'ok',
    });
    expect(all.body.meta.counts).toEqual({ 'Job Created': 1, Submitted: 1 });

    const get = async (qs) => (await api().get(`/api/v1/super-admin/warranty-claims?${qs}`).set(A(s)).expect(200)).body.data.map((c) => c.id);
    expect(await get(`brand=${s.w.samsung._id}`)).toEqual([samsungClaim.id]);
    expect(await get('status=Job Created')).toEqual([s.claim.id]);
    expect(await get('pincode=462001')).toEqual([samsungClaim.id]);
    expect(await get('city=indore')).toEqual([s.claim.id]);
    expect(await get('category=AC')).toHaveLength(2);
    expect(await get('q=ss-777')).toEqual([samsungClaim.id]);
    expect(await get(`q=${lgRow.serviceJob.humanId}`)).toEqual([s.claim.id]); // by Service Job ID
    expect(await get(`q=${other.user.phone}`)).toEqual([samsungClaim.id]); // by customer phone
    expect(await get('allocationFailed=true')).toEqual([]);

    await api().get('/api/v1/super-admin/warranty-claims').set(bearer(s.lg.token)).expect(403);
  });

  it('shows everything on the detail: internal events, audit trail, dispatch history, payout', async () => {
    const s = await scenario();
    const first = await partner({ name: 'First', km: 1 });
    await partner({ name: 'Second', km: 3 });
    await brandApprove(s);
    const sr = await currentSr(s);
    await api().post(`/api/v1/service-provider/jobs/reject/${sr.id}`).set(bearer(first.token)).expect(200);

    const d = await detail(s);
    expect(d.timeline.map((e) => e.visibility)).toContain('internal');
    expect(d.timeline.find((e) => e.note === 'First declined')).toBeTruthy();
    expect(d.audit.length).toBeGreaterThanOrEqual(4);
    expect(d.audit[1]).toMatchObject({ toStatus: 'Approved', by: { role: 'brand_admin' } });
    expect(d.serviceJobs).toHaveLength(1);
    expect(d.serviceJobs[0]).toMatchObject({ current: true, partner: { name: 'Second' }, declinedBy: ['First'], accepted: false });
    expect(d.warrantyCheck.status).toBe('In Warranty');
  });
});

describe('Phase 8 — deciding on the brand\'s behalf', () => {
  it('approves (customer sees a normal approval; the reason stays internal) and needs a reason', async () => {
    const s = await scenario();
    await api().post(adminUrl(s.claim, 'approve')).set(A(s)).send({}).expect(400);
    const d = (await api().post(adminUrl(s.claim, 'approve')).set(A(s)).send({ reason: 'LG unresponsive for 3 days' }).expect(200)).body.data;
    expect(d.status).toBe('Job Created');

    const mine = (await api().get(`/api/v1/partner-warranty/claims/${s.claim.id}`).set(bearer(s.cust.token)).expect(200)).body.data;
    expect(mine.timeline.map((e) => e.status)).toContain('Approved');
    expect(JSON.stringify(mine)).not.toContain('unresponsive');
    const brandView = (await api().get(`/api/v1/brand/warranty-claims/${s.claim.id}`).set(bearer(s.lg.token)).expect(200)).body.data;
    expect(brandView.timeline.find((e) => e.note?.includes('unresponsive'))).toMatchObject({ by: { kind: 'admin', name: 'NCC' } });
    expect(await AuditLog.countDocuments({ entityId: s.claim.id, reason: /unresponsive/ })).toBe(1);
  });

  it('rejects with the reason shown to the customer', async () => {
    const s = await scenario();
    await api().post(adminUrl(s.claim, 'reject')).set(A(s)).send({ reason: 'Product is out of warranty' }).expect(200);
    const mine = (await api().get(`/api/v1/partner-warranty/claims/${s.claim.id}`).set(bearer(s.cust.token)).expect(200)).body.data;
    expect(mine).toMatchObject({ status: 'Rejected', rejectionReason: 'Product is out of warranty' });
    await api().post(adminUrl(s.claim, 'approve')).set(A(s)).send({ reason: 'x oops' }).expect(409);
  });
});

describe('Phase 8 — assignment controls', () => {
  it('manual assignment when automatic allocation failed — even an offline partner', async () => {
    const s = await scenario();
    await brandApprove(s);
    expect((await WarrantyClaim.findById(s.claim.id)).flags.allocationFailed).toBe(true);
    const offline = await partner({ name: 'Off Duty', availability: 'Offline' });

    const suggestions = (await api().get(adminUrl(s.claim, 'partner-suggestions')).set(A(s)).expect(200)).body.data;
    expect(suggestions.map((p) => p.name)).toEqual(['Off Duty']);

    await api().post(adminUrl(s.claim, 'assign')).set(A(s)).send({ serviceProviderId: offline.id }).expect(400); // reason required
    const d = (await api().post(adminUrl(s.claim, 'assign')).set(A(s)).send({ serviceProviderId: offline.id, reason: 'Called him, he is going' }).expect(200)).body.data;
    expect(d.assignedPartner.name).toBe('Off Duty');
    expect(d.flags.allocationFailed).toBe(false);
    expect(d.timeline.find((e) => e.action === 'MANUAL_ASSIGNMENT')).toMatchObject({ visibility: 'internal', note: 'Off Duty: Called him, he is going' });

    // Once accepted, "assign" is refused — that's a reassignment.
    const sr = await currentSr(s);
    await api().post(`/api/v1/service-provider/jobs/accept/${sr.id}`).set(bearer(offline.token)).send({}).expect(200);
    await api().post(adminUrl(s.claim, 'assign')).set(A(s)).send({ serviceProviderId: offline.id, reason: 'again' }).expect(409);
  });

  it('reassigns before acceptance — to a named partner, or the next eligible one', async () => {
    const s = await scenario();
    const first = await partner({ name: 'First', km: 1 });
    const second = await partner({ name: 'Second', km: 3 });
    const third = await partner({ name: 'Third', km: 5 });
    await brandApprove(s);
    expect(String((await currentSr(s)).serviceProvider)).toBe(first.id);

    await api().post(adminUrl(s.claim, 'reassign')).set(A(s)).send({ serviceProviderId: third.id, reason: 'Customer asked for Third' }).expect(200);
    expect(String((await currentSr(s)).serviceProvider)).toBe(third.id);

    await api().post(adminUrl(s.claim, 'reassign')).set(A(s)).send({ reason: 'Third is on leave' }).expect(200);
    const sr = await currentSr(s);
    expect([first.id, second.id]).toContain(String(sr.serviceProvider));
    expect(sr.declinedBy.map(String)).toContain(third.id);
  });

  it('after acceptance, only with force: the old job is cancelled and the claim gets a new NCCJ job', async () => {
    const s = await scenario();
    const first = await partner({ name: 'First', km: 1 });
    const second = await partner({ name: 'Second', km: 3 });
    await brandApprove(s);
    const oldSr = await currentSr(s);
    const accepted = await api().post(`/api/v1/service-provider/jobs/accept/${oldSr.id}`).set(bearer(first.token)).send({}).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${accepted.body.data.id}/start-travel`).set(bearer(first.token)).expect(200);
    expect((await WarrantyClaim.findById(s.claim.id)).status).toBe('Technician On Way');

    await api().post(adminUrl(s.claim, 'reassign')).set(A(s)).send({ reason: 'No-show' }).expect(409);
    const d = (await api()
      .post(adminUrl(s.claim, 'reassign'))
      .set(A(s))
      .send({ serviceProviderId: second.id, reason: 'First did not reach customer', force: true })
      .expect(200)).body.data;

    expect(d.status).toBe('Job Created');
    expect(d.serviceJobs).toHaveLength(2);
    expect(d.serviceJobs[0]).toMatchObject({ humanId: oldSr.humanId, status: 'Cancelled', jobStep: 'cancelled', current: false });
    expect(d.serviceJobs[1]).toMatchObject({ current: true, partner: { name: 'Second' } });
    expect(d.serviceJobs[1].humanId).not.toBe(oldSr.humanId);
    expect((await ServiceProvider.findById(first.id)).activeJobsCount).toBe(0);

    // The old partner can't carry on with the cancelled job, and it can't move the claim.
    await api().post(`/api/v1/service-provider/jobs/${accepted.body.data.id}/arrive`).set(bearer(first.token)).expect(400);
    expect((await WarrantyClaim.findById(s.claim.id)).status).toBe('Job Created');

    const mine = (await api().get(`/api/v1/partner-warranty/claims/${s.claim.id}`).set(bearer(s.cust.token)).expect(200)).body.data;
    expect(mine.timeline.at(-1)).toMatchObject({ action: 'REASSIGNED', note: 'We are arranging a new service partner for you' });
    expect(JSON.stringify(mine)).not.toContain('did not reach');
  });
});

describe('Phase 8 — status, escalation, hold, cancel, reopen, notes', () => {
  it('changes status within the rules and sends dedicated moves to their own action', async () => {
    const s = await scenario();
    const sp = await partner();
    await brandApprove(s);
    await api().post(`/api/v1/service-provider/jobs/accept/${(await currentSr(s)).id}`).set(bearer(sp.token)).send({}).expect(200);

    await api().post(adminUrl(s.claim, 'status')).set(A(s)).send({ status: 'Rejected', reason: 'x no' }).expect(400);
    await api().post(adminUrl(s.claim, 'status')).set(A(s)).send({ status: 'Submitted', reason: 'x no' }).expect(400);
    const d = (await api().post(adminUrl(s.claim, 'status')).set(A(s)).send({ status: 'Service Completed', reason: 'Partner app offline, confirmed by phone' }).expect(200)).body.data;
    expect(d.status).toBe('Service Completed');
    expect(d.audit.at(-1)).toMatchObject({ fromStatus: 'Partner Assigned', toStatus: 'Service Completed', reason: 'Partner app offline, confirmed by phone' });
  });

  it('escalates (brand told), filters by it, de-escalates', async () => {
    const s = await scenario();
    await api().post(adminUrl(s.claim, 'escalate')).set(A(s)).send({ reason: 'Customer called 3 times' }).expect(200);
    await api().post(adminUrl(s.claim, 'escalate')).set(A(s)).send({ reason: 'again' }).expect(409);
    expect(await Notification.countDocuments({ recipient: s.lg.user._id, title: 'Warranty Claim Escalated by NCC' })).toBe(1);
    const list = await api().get('/api/v1/super-admin/warranty-claims?escalated=true').set(A(s)).expect(200);
    expect(list.body.data.map((c) => c.id)).toEqual([s.claim.id]);

    const d = (await api().post(adminUrl(s.claim, 'de-escalate')).set(A(s)).send({ reason: 'Resolved on call' }).expect(200)).body.data;
    expect(d.flags.escalated).toBe(false);
  });

  it('hold pulls an unaccepted offer and blocks re-dispatch; resume dispatches again', async () => {
    const s = await scenario();
    await partner({ name: 'Ravi' });
    await brandApprove(s);
    expect((await currentSr(s)).serviceProvider).not.toBeNull();

    const held = (await api().post(adminUrl(s.claim, 'hold')).set(A(s)).send({ reason: 'Customer travelling this week' }).expect(200)).body.data;
    await api().post(adminUrl(s.claim, 'hold')).set(A(s)).send({ reason: 'again' }).expect(409);
    expect(held).toMatchObject({ status: 'On Hold', statusBeforeHold: 'Job Created' });
    expect((await currentSr(s)).serviceProvider).toBeNull();
    await autoAssignPendingRequests();
    expect((await currentSr(s)).serviceProvider).toBeNull();

    const resumed = (await api().post(adminUrl(s.claim, 'resume')).set(A(s)).send({ reason: 'Customer back' }).expect(200)).body.data;
    expect(resumed.status).toBe('Job Created');
    expect(resumed.assignedPartner.name).toBe('Ravi');
  });

  it('resume catches up with what an accepted job did during the hold', async () => {
    const s = await scenario();
    const sp = await partner();
    await brandApprove(s);
    const job = (await api().post(`/api/v1/service-provider/jobs/accept/${(await currentSr(s)).id}`).set(bearer(sp.token)).send({}).expect(200)).body.data;
    await api().post(adminUrl(s.claim, 'hold')).set(A(s)).send({ reason: 'Parts shortage at brand' }).expect(200);

    await api().post(`/api/v1/service-provider/jobs/${job.id}/start-travel`).set(bearer(sp.token)).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/arrive`).set(bearer(sp.token)).expect(200);
    expect((await WarrantyClaim.findById(s.claim.id)).status).toBe('On Hold');

    const resumed = (await api().post(adminUrl(s.claim, 'resume')).set(A(s)).send({ reason: 'Parts arrived' }).expect(200)).body.data;
    expect(resumed.status).toBe('Service In Progress');
  });

  it('cancels claim and job together, telling customer and brand', async () => {
    const s = await scenario();
    await partner();
    await brandApprove(s);
    const d = (await api().post(adminUrl(s.claim, 'cancel')).set(A(s)).send({ reason: 'Duplicate of an earlier ticket' }).expect(200)).body.data;
    expect(d.status).toBe('Cancelled');
    expect(d.serviceJobs[0].status).toBe('Cancelled');
    expect(await Notification.countDocuments({ title: 'Warranty Claim Cancelled', recipient: { $in: [s.cust.user._id, s.lg.user._id] } })).toBe(2);
    expect(d.flags.allocationFailed).toBe(false); // the job's cancellation didn't raise a false alarm
    await api().post(adminUrl(s.claim, 'cancel')).set(A(s)).send({ reason: 'again' }).expect(409);
    expect(await Notification.countDocuments({ title: 'Warranty Claim Cancelled' })).toBe(2); // not sent twice
  });

  it('reopens: rejected → back to the brand; closed → a new Service Job', async () => {
    const s = await scenario();
    await api().post(`/api/v1/brand/warranty-claims/${s.claim.id}/reject`).set(bearer(s.lg.token)).send({ reason: 'No invoice seal' }).expect(200);
    await api().post(adminUrl(s.claim, 'reopen')).set(A(s)).send({ reason: 'x', to: 'Job Created' }).expect(400);
    const back = (await api().post(adminUrl(s.claim, 'reopen')).set(A(s)).send({ reason: 'Customer sent sealed invoice' }).expect(200)).body.data;
    expect(back).toMatchObject({ status: 'Brand Review', rejectionReason: null });
    await brandApprove(s); // the brand can decide again

    await WarrantyClaim.updateOne({ _id: s.claim.id }, { status: 'Closed' });
    await ServiceRequest.updateOne({ warrantyClaim: s.claim.id }, { status: 'Closed' });
    await partner({ name: 'Revisit Tech' });
    const again = (await api().post(adminUrl(s.claim, 'reopen')).set(A(s)).send({ reason: 'Same fault returned', to: 'Job Created' }).expect(200)).body.data;
    expect(again.status).toBe('Job Created');
    expect(again.serviceJobs).toHaveLength(2);
    expect(again.serviceJobs[1]).toMatchObject({ current: true, partner: { name: 'Revisit Tech' } });
  });

  it('keeps admin notes internal', async () => {
    const s = await scenario();
    await api().post(adminUrl(s.claim, 'notes')).set(A(s)).send({ note: 'Brand SPOC is Mr. Rao' }).expect(200);
    const brandView = (await api().get(`/api/v1/brand/warranty-claims/${s.claim.id}`).set(bearer(s.lg.token)).expect(200)).body.data;
    expect(JSON.stringify(brandView)).not.toContain('Mr. Rao');
    // (the brand opening it added its own event after the note)
    expect((await detail(s)).timeline.find((e) => e.action === 'NOTE_ADDED')).toMatchObject({ note: 'Brand SPOC is Mr. Rao', visibility: 'internal' });
  });
});

describe('Client audit fixes — Category filter and partner notifications', () => {
  it('filters by Category (the warranty group) and shows it on each row (client #3)', async () => {
    const s = await scenario();
    const ungrouped = await kit.submitClaim(s.w, s.cust, { groupId: undefined });
    const res = await api().get(`/api/v1/super-admin/warranty-claims?group=${s.w.group._id}`).set(A(s)).expect(200);
    expect(res.body.data.map((c) => c.id)).toEqual([s.claim.id]);
    expect(res.body.data[0].category).toEqual({ id: String(s.w.group._id), name: 'AirCare' });
    const all = (await api().get('/api/v1/super-admin/warranty-claims').set(A(s)).expect(200)).body.data;
    expect(all.find((c) => c.id === ungrouped.id).category).toBeNull();
    await api().get('/api/v1/super-admin/warranty-claims?group=not-an-id').set(A(s)).expect(400);
  });

  it('tells the partner when a job is offered, taken away, held, resumed or cancelled (client #16)', async () => {
    const s = await scenario();
    const ravi = await partner({ name: 'Ravi', km: 1 });
    const asha = await partner({ name: 'Asha', km: 3 });
    const inbox = async (p) => {
      const user = (await ServiceProvider.findById(p.id).select('user').lean()).user;
      return (await Notification.find({ recipient: user, type: 'jobs' }).sort({ createdAt: 1, _id: 1 }).lean()).map((n) => ({ title: n.title, message: n.message }));
    };

    await brandApprove(s);
    const sr = await currentSr(s);
    expect(await inbox(ravi)).toEqual([{ title: 'New Warranty Job', message: expect.stringContaining(`LG Air Conditioner — Cooling Issue in Indore 452001. Job ${sr.humanId}`) }]);

    // Taken from Ravi before he answered; Asha is offered it.
    await api().post(adminUrl(s.claim, 'reassign')).set(A(s)).send({ serviceProviderId: asha.id, reason: 'Ravi is slow to respond' }).expect(200);
    expect((await inbox(ravi)).at(-1)).toEqual({ title: 'Warranty Job Withdrawn', message: expect.stringContaining('NCC has given it to another partner') });
    expect((await inbox(asha)).map((n) => n.title)).toEqual(['New Warranty Job']);

    // Asha accepts; hold → don't visit; resume → back on; cancel → no visit needed.
    await api().post(`/api/v1/service-provider/jobs/accept/${sr.id}`).set(bearer(asha.token)).send({}).expect(200);
    await api().post(adminUrl(s.claim, 'hold')).set(A(s)).send({ reason: 'Customer travelling' }).expect(200);
    expect((await inbox(asha)).at(-1)).toEqual({ title: 'Warranty Job On Hold', message: expect.stringContaining("Please don't visit until NCC resumes it") });
    await api().post(adminUrl(s.claim, 'resume')).set(A(s)).send({ reason: 'Customer back' }).expect(200);
    expect((await inbox(asha)).at(-1).title).toBe('Warranty Job Resumed');
    await api().post(adminUrl(s.claim, 'cancel')).set(A(s)).send({ reason: 'Duplicate claim' }).expect(200);
    expect((await inbox(asha)).at(-1)).toEqual({ title: 'Warranty Job Withdrawn', message: expect.stringContaining('the warranty claim was cancelled') });

    // NCC's own reasons stay internal.
    const all = [...(await inbox(ravi)), ...(await inbox(asha))].map((n) => n.message).join(' ');
    for (const reason of ['slow to respond', 'travelling', 'Duplicate']) expect(all).not.toContain(reason);
  });
});
