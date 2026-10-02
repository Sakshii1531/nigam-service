import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
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
import { transitionStatus } from '../src/modules/service-requests/serviceRequest.service.js';
import { syncClaimFromJob } from '../src/modules/partner-warranty/claimDispatch.js';
import { autoCloseCompletedClaims } from '../src/modules/partner-warranty/partnerWarrantyJob.service.js';
import { setIO } from '../src/sockets/io.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';
import { visitLabel } from '../src/modules/partner-warranty/claimStatus.js';

const TEST_DB_URI = testDbUri('partnerWarrantySync');
const HOUR = 3600 * 1000;

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310700000 });
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

afterEach(() => setIO(null));

const tomorrow = () => new Date(Date.now() + 24 * HOUR).toISOString().slice(0, 10);

/** Approved LG claim offered to Ravi (Indore, AC). */
async function approvedClaim() {
  const w = await kit.world();
  const [lg, cust] = await Promise.all([kit.brandAdmin(w.lg), kit.customer()]);
  const sp = await kit.flow.partner(['AC'], 'Ravi Kumar');
  await ServiceProvider.updateOne({ _id: sp.serviceProvider._id }, { serviceCityName: 'Indore', location: { latitude: 22.73, longitude: 75.87 }, rating: 4.6 });
  const claim = await kit.submitClaim(w, cust);
  await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(lg.token)).send({}).expect(200);
  const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);
  return { w, lg, cust, sp, claim, srId, auth: bearer(sp.token) };
}

const statusOf = async (claimId) => (await WarrantyClaim.findById(claimId)).status;
const track = (s) => api().get(`/api/v1/partner-warranty/claims/${s.claim.id}/track`).set(bearer(s.cust.token)).expect(200);
const accept = async (s) => (await api().post(`/api/v1/service-provider/jobs/accept/${s.srId}`).set(s.auth).send({}).expect(200)).body.data.id;
const step = (s, jobId, path, body) => api().post(`/api/v1/service-provider/jobs/${jobId}/${path}`).set(s.auth).send(body || {}).expect(200);

describe('Phase 7 — the claim follows the Service Job', () => {
  it('walks every stage, visible to customer, brand and admin, and closes on the customer\'s confirmation', async () => {
    const s = await approvedClaim();
    expect(await statusOf(s.claim.id)).toBe('Job Created');

    const jobId = await accept(s);
    expect(await statusOf(s.claim.id)).toBe('Partner Assigned');

    await api()
      .post(`/api/v1/service-provider/warranty-jobs/${jobId}/schedule-visit`)
      .set(s.auth)
      .send({ date: tomorrow(), slot: '10 AM – 12 PM' })
      .expect(200);
    expect(await statusOf(s.claim.id)).toBe('Visit Scheduled');

    await step(s, jobId, 'start-travel');
    expect(await statusOf(s.claim.id)).toBe('Technician On Way');
    await step(s, jobId, 'arrive');
    expect(await statusOf(s.claim.id)).toBe('Service In Progress');
    await step(s, jobId, 'diagnosis', { notes: 'Gas leak' });
    await step(s, jobId, 'spare-parts', { parts: [] });
    expect(await statusOf(s.claim.id)).toBe('Service In Progress');
    await step(s, jobId, 'repair-complete');
    expect(await statusOf(s.claim.id)).toBe('Service Completed');

    await step(s, jobId, 'billing');
    const beforePay = (await track(s)).body.data;
    expect(beforePay.canConfirm).toBe(false); // job not closed out by the partner yet
    await step(s, jobId, 'collect-payment', { paymentMethod: 'Cash', otp: beforePay.completionOtp });
    expect(await statusOf(s.claim.id)).toBe('Service Completed');

    const ready = (await track(s)).body.data;
    expect(ready.canConfirm).toBe(true);
    const confirmed = await api().post(`/api/v1/partner-warranty/claims/${s.claim.id}/confirm`).set(bearer(s.cust.token)).expect(200);
    expect(confirmed.body.data.status).toBe('Closed');
    expect((await ServiceRequest.findById(s.srId)).status).toBe('Closed');

    // The customer's history reads as the client's sequence, with partner-facing notes.
    // (Approved straight from Submitted — the brand never opened it first.)
    const customerView = confirmed.body.data.timeline.filter((e) => e.status).map((e) => [e.status, e.note]);
    expect(customerView).toEqual([
      ['Approved', null],
      ['Job Created', expect.stringMatching(/^Service Job NCCJ-/)],
      ['Partner Assigned', 'Ravi will handle your service'],
      ['Visit Scheduled', `Visit on ${visitLabel(tomorrow(), '10 AM – 12 PM')}`],
      ['Technician On Way', 'Ravi is on the way'],
      ['Service In Progress', null],
      ['Service Completed', null],
      ['Closed', 'Customer confirmed the service'],
    ]);

    // The brand sees the same claim status.
    const brandView = await api().get(`/api/v1/brand/warranty-claims/${s.claim.id}`).set(bearer(s.lg.token)).expect(200);
    expect(brandView.body.data.status).toBe('Closed');
    expect(brandView.body.data.visit).toEqual({ date: tomorrow(), slot: '10 AM – 12 PM' });
  });

  it('marks the visit stage passed when the partner heads out without scheduling', async () => {
    const s = await approvedClaim();
    const jobId = await accept(s);
    await step(s, jobId, 'start-travel');
    expect(await statusOf(s.claim.id)).toBe('Technician On Way');

    const stages = (await track(s)).body.data.stages;
    const byKey = Object.fromEntries(stages.map((st) => [st.key, st]));
    expect(byKey.visit).toMatchObject({ state: 'done', at: null });
    expect(byKey.onTheWay).toMatchObject({ state: 'current' });
    expect(byKey.inProgress.state).toBe('pending');
  });

  it('never moves a claim backwards (a revisit, a repeated status)', async () => {
    const s = await approvedClaim();
    const jobId = await accept(s);
    await step(s, jobId, 'start-travel');
    await step(s, jobId, 'arrive');
    expect(await statusOf(s.claim.id)).toBe('Service In Progress');

    // A revisit takes the job back to Visit Scheduled.
    await ServiceRequest.updateOne({ _id: s.srId }, { status: 'Visit Scheduled' });
    expect(await syncClaimFromJob(s.srId)).toBeNull();
    expect(await statusOf(s.claim.id)).toBe('Service In Progress');
  });

  it('a cancelled Service Job flags the claim for Super Admin instead of changing it', async () => {
    const s = await approvedClaim();
    await ServiceRequest.updateOne({ _id: s.srId }, { status: 'New', serviceProvider: null });
    await transitionStatus(s.srId, 'Cancelled', { description: 'test' });
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.status).toBe('Job Created');
    expect(saved.flags.allocationFailed).toBe(true);
  });
});

describe('Phase 7 — Track Ticket', () => {
  it('shows stages, and the partner card + OTP only once a partner has accepted', async () => {
    const s = await approvedClaim();

    let t = (await track(s)).body.data;
    expect(t.stages.map((st) => [st.label, st.state])).toEqual([
      ['Claim Submitted', 'done'],
      ['Brand Verification', 'done'],
      ['Warranty Approved', 'current'],
      ['Partner Assigned', 'pending'],
      ['Visit Scheduled', 'pending'],
      ['Technician On Way', 'pending'],
      ['Service In Progress', 'pending'],
      ['Service Completed', 'pending'],
      ['Closed', 'pending'],
    ]);
    expect(t.stages[0].at).toBeTruthy();
    // Offered but not accepted → no partner details, no OTP.
    expect(t.partner).toBeNull();
    expect(t.completionOtp).toBeNull();

    await accept(s);
    t = (await track(s)).body.data;
    expect(t.partner).toMatchObject({ name: 'Ravi Kumar', rating: 4.6 });
    expect(t.partner.phone).toMatch(/^\d{10}$/);
    expect(t.completionOtp).toMatch(/^\d{4}$/);
    expect(t.serviceJobId).toMatch(/^NCCJ-/);
    // Nothing internal: no dispatch history, payout or flags.
    const body = JSON.stringify(t);
    for (const word of ['Offered to', 'payout', 'estEarnings', 'allocationFailed', 'flags']) expect(body).not.toContain(word);
  });

  it('ends a rejected claim at "Not Approved" with the reason', async () => {
    const w = await kit.world();
    const [lg, cust] = await Promise.all([kit.brandAdmin(w.lg), kit.customer()]);
    const claim = await kit.submitClaim(w, cust);
    await api().get(`/api/v1/brand/warranty-claims/${claim.id}`).set(bearer(lg.token)).expect(200);
    await api().post(`/api/v1/brand/warranty-claims/${claim.id}/reject`).set(bearer(lg.token)).send({ reason: 'Burn marks on PCB' }).expect(200);

    const t = (await api().get(`/api/v1/partner-warranty/claims/${claim.id}/track`).set(bearer(cust.token)).expect(200)).body.data;
    expect(t.stages.map((st) => [st.label, st.state])).toEqual([
      ['Claim Submitted', 'done'],
      ['Brand Verification', 'done'],
      ['Not Approved', 'current'],
    ]);
    expect(t.rejectionReason).toBe('Burn marks on PCB');
  });
});

describe('Phase 7 — confirming and closing', () => {
  async function completedJob() {
    const s = await approvedClaim();
    const jobId = await accept(s);
    await step(s, jobId, 'start-travel');
    await step(s, jobId, 'arrive');
    await step(s, jobId, 'diagnosis', { notes: 'ok' });
    await step(s, jobId, 'spare-parts', { parts: [] });
    await step(s, jobId, 'repair-complete');
    return { ...s, jobId };
  }

  it('refuses a confirmation before the partner has closed out the job, or from someone else', async () => {
    const s = await completedJob();
    await api().post(`/api/v1/partner-warranty/claims/${s.claim.id}/confirm`).set(bearer(s.cust.token)).expect(409);
    const stranger = await kit.customer();
    await api().post(`/api/v1/partner-warranty/claims/${s.claim.id}/confirm`).set(bearer(stranger.token)).expect(404);
  });

  it('closes completed claims nobody confirmed after 72 hours', async () => {
    const s = await completedJob();
    await step(s, s.jobId, 'billing');
    const otp = (await track(s)).body.data.completionOtp;
    await step(s, s.jobId, 'collect-payment', { paymentMethod: 'Cash', otp });

    expect((await autoCloseCompletedClaims()).closed).toBe(0); // too soon
    const later = await autoCloseCompletedClaims({ now: new Date(Date.now() + 73 * HOUR) });
    expect(later.closed).toBe(1);

    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.status).toBe('Closed');
    expect(saved.timeline.at(-1)).toMatchObject({ action: 'CLAIM_CLOSED', note: 'Closed automatically — not confirmed within 72 hours of completion' });
    expect((await ServiceRequest.findById(s.srId)).status).toBe('Closed');
  });
});

describe('Phase 7 — scheduling the visit', () => {
  it('reschedules with a customer-visible event; refuses past dates, other partners and non-warranty jobs', async () => {
    const s = await approvedClaim();
    const jobId = await accept(s);
    const url = `/api/v1/service-provider/warranty-jobs/${jobId}/schedule-visit`;

    await api().post(url).set(s.auth).send({ date: tomorrow(), slot: 'Morning' }).expect(200);
    await api().post(url).set(s.auth).send({ date: tomorrow(), slot: 'Evening' }).expect(200);
    const mine = await api().get(`/api/v1/partner-warranty/claims/${s.claim.id}`).set(bearer(s.cust.token)).expect(200);
    expect(mine.body.data.visit).toEqual({ date: tomorrow(), slot: 'Evening' });
    expect(mine.body.data.timeline.at(-1).note).toBe(`Visit moved to ${visitLabel(tomorrow(), 'Evening')}`);

    await api().post(url).set(s.auth).send({ date: '2020-01-01', slot: 'x' }).expect(400);
    const other = await kit.flow.partner(['AC'], 'Other');
    await api().post(url).set(bearer(other.token)).send({ date: tomorrow(), slot: 'x' }).expect(404);

    const plainSr = await ServiceRequest.create({ user: s.cust.user._id, category: 'AC', status: 'Assigned', serviceProvider: s.sp.serviceProvider._id, assignedAt: new Date() });
    const plainJob = await api().post(`/api/v1/service-provider/jobs/accept/${plainSr.id}`).set(s.auth).send({}).expect(200);
    await api()
      .post(`/api/v1/service-provider/warranty-jobs/${plainJob.body.data.id}/schedule-visit`)
      .set(s.auth)
      .send({ date: tomorrow(), slot: 'x' })
      .expect(400);
  });
});

describe('Phase 12 fix — a job change that leaves the claim status alone still reaches open screens', () => {
  it('collecting payment (job → Customer Confirmation) pushes an update so the customer can confirm', async () => {
    const s = await approvedClaim();
    const jobId = await accept(s);
    for (const path of ['start-travel', 'arrive']) await step(s, jobId, path);
    await step(s, jobId, 'diagnosis', { notes: 'ok' });
    await step(s, jobId, 'spare-parts', { parts: [] });
    await step(s, jobId, 'repair-complete');
    await step(s, jobId, 'billing');
    const otp = (await track(s)).body.data.completionOtp;

    const sent = [];
    setIO({ to: (room) => ({ emit: (event, payload) => sent.push({ room, event, payload }) }) });
    await step(s, jobId, 'collect-payment', { paymentMethod: 'Cash', otp });
    expect(await statusOf(s.claim.id)).toBe('Service Completed'); // unchanged…
    expect(sent.some((m) => m.event === 'warranty_claim:updated' && m.room === `user:${s.cust.user._id}`)).toBe(true); // …but pushed

    const after = (await track(s)).body.data;
    expect(after.canConfirm).toBe(true);
    expect(after.completionOtp).toBeNull(); // used — no longer shown
  });
});

describe('Phase 7 — live updates', () => {
  it('tells the customer, that brand and admins — and keeps brand-only changes from the customer', async () => {
    const s = await approvedClaim();
    const sent = [];
    setIO({ to: (room) => ({ emit: (event, payload) => sent.push({ room, event, payload }) }) });

    await accept(s);
    const rooms = sent.filter((m) => m.event === 'warranty_claim:updated').map((m) => m.room);
    expect(rooms).toEqual(expect.arrayContaining([`user:${s.cust.user._id}`, `brand:${s.w.lg._id}`, 'admins']));
    const update = sent.find((m) => m.event === 'warranty_claim:updated' && m.room === 'admins').payload;
    expect(update).toMatchObject({ id: s.claim.id, humanId: s.claim.humanId, customerStatusLabel: 'Partner Assigned' });
    expect(Object.keys(update).sort()).toEqual(['customerStatusLabel', 'humanId', 'id', 'status', 'updatedAt']);

    sent.length = 0;
    await api().post(`/api/v1/brand/warranty-claims/${s.claim.id}/notes`).set(bearer(s.lg.token)).send({ note: 'internal' }).expect(200);
    const noteRooms = sent.filter((m) => m.event === 'warranty_claim:updated').map((m) => m.room);
    expect(noteRooms).toEqual(expect.arrayContaining([`brand:${s.w.lg._id}`, 'admins']));
    expect(noteRooms).not.toContain(`user:${s.cust.user._id}`);
  });
});
