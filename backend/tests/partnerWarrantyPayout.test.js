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
import { DomainEvent } from '../src/modules/partner-warranty/domainEvent.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { EarningsTally } from '../src/modules/service-provider/earningsTally.model.js';
import { Payout } from '../src/modules/service-provider/payout.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { RateCard } from '../src/modules/brand-admin/rateCard.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyPayout');

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9311100000 });
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
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, DomainEvent, ServiceRequest, ServiceProvider, EarningsTally, Payout, Job, RateCard, User, AuditLog, Notification].map(
      (m) => m.deleteMany({}),
    ),
  ));

/** LG pays ₹450 for AC work, Samsung ₹300 for refrigerators; one partner does both. */
async function setup() {
  const w = await kit.world();
  await Promise.all([
    RateCard.create({ brand: w.lg._id, category: 'AC', serviceType: 'Repair', laborRate: 450 }),
    RateCard.create({ brand: w.samsung._id, category: 'Refrigerator', serviceType: 'Repair', laborRate: 300 }),
  ]);
  const [lg, samsung, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.brandAdmin(w.samsung), kit.customer(), kit.superAdmin()]);
  const sp = await kit.flow.partner(['AC', 'Refrigerator'], 'Ravi Kumar');
  await ServiceProvider.updateOne(
    { _id: sp.serviceProvider._id },
    { serviceCityName: 'Indore', location: { latitude: 22.73, longitude: 75.87 }, payoutMethods: [{ type: 'upi', name: 'UPI', detail: 'ravi@upi', isPrimary: true }] },
  );
  return { w, lg, samsung, cust, admin, sp, auth: bearer(sp.token), spId: String(sp.serviceProvider._id) };
}

/** A warranty job submitted, approved, accepted and completed; returns its Job id. */
async function completedWarrantyJob(s, { brandAdmin = s.lg, overrides = {} } = {}) {
  const claim = await kit.submitClaim(s.w, s.cust, overrides);
  await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(brandAdmin.token)).send({}).expect(200);
  const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);
  const jobId = (await api().post(`/api/v1/service-provider/jobs/accept/${srId}`).set(s.auth).send({}).expect(200)).body.data.id;
  for (const step of ['start-travel', 'arrive']) await api().post(`/api/v1/service-provider/jobs/${jobId}/${step}`).set(s.auth).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`).set(s.auth).send({ notes: 'ok' }).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`).set(s.auth).send({ parts: [] }).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`).set(s.auth).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/billing`).set(s.auth).expect(200);
  const otp = (await ServiceRequest.findById(srId)).completionOtp;
  await api().post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`).set(s.auth).send({ paymentMethod: 'Cash', otp }).expect(200);
  return { jobId, claim };
}

const samsungFridge = (s) => ({
  brandAdmin: s.samsung,
  overrides: { brandId: String(s.w.samsung._id), categoryId: String(s.w.fridge._id), issueId: String(s.w.fridgeNoise._id), groupId: undefined },
});

const breakdown = async (s) => (await api().get('/api/v1/service-provider/earnings/breakdown').set(s.auth).expect(200)).body.data;

describe('Phase 11 — B2B2C earnings stay out of the withdrawable balance', () => {
  it('records the job as unsettled; counts it, but the partner cannot withdraw it', async () => {
    const s = await setup();
    const { jobId } = await completedWarrantyJob(s);

    const job = await Job.findById(jobId);
    expect(job.settlement.status).toBe('unsettled');
    expect(String(job.warrantyClaim)).toBeTruthy();

    const tally = await EarningsTally.findOne({ serviceProvider: s.spId });
    expect(tally).toMatchObject({ total: 0, today: 0, completedTotal: 1 });

    const d = await breakdown(s);
    expect(d.available).toBe(0);
    expect(d.split.invoice).toEqual({ amount: 0, jobs: 0 }); // not double-counted in the old invoice card
    expect(d.b2b2c).toMatchObject({ jobs: 1, amount: 450, pending: { jobs: 1, amount: 450 }, settled: { jobs: 0, amount: 0 }, settlement: 'manual' });
    expect(d.lifetimeEarned).toBe(450);

    await api().post('/api/v1/service-provider/earnings/payouts').set(s.auth).send({ amount: 450 }).expect(400);
    await api().post('/api/v1/service-provider/earnings/payouts').set(s.auth).send({ amount: 450, payoutType: 'Invoice' }).expect(400);
  });

  it('shows the partner totals by brand and by product, and the job list', async () => {
    const s = await setup();
    await completedWarrantyJob(s);
    await completedWarrantyJob(s, { overrides: { serialNumber: 'LG-2' } });
    await completedWarrantyJob(s, samsungFridge(s));

    const summary = (await api().get('/api/v1/service-provider/warranty-jobs/payouts').set(s.auth).expect(200)).body.data;
    expect(summary).toMatchObject({ jobs: 3, amount: 1200 });
    expect(summary.byBrand).toEqual([
      { brand: 'LG', jobs: 2, amount: 900, pending: 900 },
      { brand: 'Samsung', jobs: 1, amount: 300, pending: 300 },
    ]);
    expect(summary.byProduct).toEqual([
      { product: 'Air Conditioner', jobs: 2, amount: 900, pending: 900 },
      { product: 'Refrigerator', jobs: 1, amount: 300, pending: 300 },
    ]);

    const jobs = (await api().get('/api/v1/service-provider/warranty-jobs/payouts/jobs?status=unsettled').set(s.auth).expect(200)).body.data;
    expect(jobs).toHaveLength(3);
    expect(jobs[0]).toMatchObject({ jobId: expect.stringMatching(/^NCCJ-/), claimId: expect.stringMatching(/^NCCW-/), status: 'unsettled' });

    const recent = (await api().get('/api/v1/service-provider/earnings/recent').set(s.auth).expect(200)).body.data;
    expect(recent.every((r) => r.isB2B2C && r.settlementStatus === 'unsettled')).toBe(true);
  });
});

describe('Phase 11 — manual settlement by Super Admin', () => {
  it('lists what is owed per partner, settles a batch as one Invoice payout, and tells the partner', async () => {
    const s = await setup();
    const a = await completedWarrantyJob(s);
    const b = await completedWarrantyJob(s, samsungFridge(s));
    const A = bearer(s.admin.token);

    const owed = (await api().get('/api/v1/super-admin/b2b2c-payouts').set(A).expect(200)).body.data;
    expect(owed).toEqual([expect.objectContaining({ serviceProvider: expect.objectContaining({ name: 'Ravi Kumar' }), jobs: 2, amount: 750 })]);
    const lgOnly = (await api().get(`/api/v1/super-admin/b2b2c-payouts?brand=${s.w.lg._id}`).set(A).expect(200)).body.data;
    expect(lgOnly[0]).toMatchObject({ jobs: 1, amount: 450 });

    const completedAtBefore = (await Job.findById(a.jobId)).updatedAt.getTime();
    const res = await api()
      .post('/api/v1/super-admin/b2b2c-payouts/settle')
      .set(A)
      .send({ serviceProviderId: s.spId, jobIds: [a.jobId, b.jobId], reference: 'UTR-2026-0001', note: 'September batch' })
      .expect(200);
    expect(res.body.data).toMatchObject({ jobs: 2, amount: 750, reference: 'UTR-2026-0001' });

    const payout = await Payout.findById(res.body.data.payoutId);
    expect(payout.toObject()).toMatchObject({ payoutType: 'Invoice', status: 'Settled', baseAmount: 750, netAmount: 750, platformFee: 0, creditedTo: 'ravi@upi', transactionId: 'UTR-2026-0001' });
    const job = await Job.findById(a.jobId);
    expect(job.settlement).toMatchObject({ status: 'settled', reference: 'UTR-2026-0001' });
    expect(String(job.settlement.payout)).toBe(String(payout._id));
    expect(job.updatedAt.getTime()).toBe(completedAtBefore); // "completed at" isn't moved by settling

    const d = await breakdown(s);
    expect(d.b2b2c).toMatchObject({ pending: { jobs: 0, amount: 0 }, settled: { jobs: 2, amount: 750 } });
    expect(d).toMatchObject({ available: 0, paidOut: 750, lifetimeEarned: 750 });
    const partnerPayouts = (await api().get('/api/v1/service-provider/earnings/payouts').set(s.auth).expect(200)).body.data;
    expect(partnerPayouts.map((p) => [p.payoutType, p.netAmount])).toEqual([['Invoice', 750]]);

    expect(await Notification.countDocuments({ recipient: s.sp.serviceProvider.user, title: 'Warranty Job Payout Settled' })).toBe(1);
    expect(await AuditLog.countDocuments({ type: 'Finance', action: /B2B2C payout settled for Ravi Kumar: ₹750/ })).toBe(1);
    expect((await api().get('/api/v1/super-admin/b2b2c-payouts').set(A).expect(200)).body.data).toEqual([]);
  });

  it('refuses double payment, other partners\' jobs, ordinary jobs, unfinished jobs, and non-admins', async () => {
    const s = await setup();
    const a = await completedWarrantyJob(s);
    const A = bearer(s.admin.token);
    const settle = (body) => api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(A).send({ reference: 'UTR-1', ...body });

    await settle({ serviceProviderId: s.spId, jobIds: [a.jobId] }).expect(200);
    await settle({ serviceProviderId: s.spId, jobIds: [a.jobId] }).expect(409);

    const other = await kit.flow.partner(['AC'], 'Other');
    await settle({ serviceProviderId: String(other.serviceProvider._id), jobIds: [a.jobId] }).expect(400);

    const plainSr = await ServiceRequest.create({ user: s.cust.user._id, category: 'AC', status: 'Assigned', serviceProvider: s.spId, assignedAt: new Date() });
    const plain = (await api().post(`/api/v1/service-provider/jobs/accept/${plainSr.id}`).set(s.auth).send({}).expect(200)).body.data;
    await Job.updateOne({ _id: plain.id }, { activeStep: 'completed' });
    await settle({ serviceProviderId: s.spId, jobIds: [plain.id] }).expect(400);

    const claim = await kit.submitClaim(s.w, s.cust, { serialNumber: 'OPEN-1' });
    await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(s.lg.token)).send({}).expect(200);
    const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);
    const open = (await api().post(`/api/v1/service-provider/jobs/accept/${srId}`).set(s.auth).send({}).expect(200)).body.data;
    await settle({ serviceProviderId: s.spId, jobIds: [open.id] }).expect(400);

    await settle({ serviceProviderId: s.spId, jobIds: [a.jobId], reference: '' }).expect(400);
    await api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(bearer(s.lg.token)).send({ serviceProviderId: s.spId, jobIds: [a.jobId], reference: 'x12' }).expect(403);
    expect(await Payout.countDocuments()).toBe(1);
  });

  it('two admins settling the same job at once pay it once', async () => {
    const s = await setup();
    const a = await completedWarrantyJob(s);
    const second = await kit.superAdmin();
    const body = { serviceProviderId: s.spId, jobIds: [a.jobId], reference: 'UTR-RACE' };
    const results = await Promise.all([
      api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(bearer(s.admin.token)).send(body),
      api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(bearer(second.token)).send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await Payout.countDocuments()).toBe(1);
  });
});
