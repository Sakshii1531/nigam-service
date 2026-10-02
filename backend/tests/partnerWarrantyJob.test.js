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
import { RateCard } from '../src/modules/brand-admin/rateCard.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { createServiceJobForClaim, dispatchServiceJob } from '../src/modules/partner-warranty/claimJob.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyJob');
const YEAR = new Date().getFullYear();

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310500000 });
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
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, ServiceProvider, Job, RateCard, User, AuditLog, Notification].map(
      (m) => m.deleteMany({}),
    ),
  );
});

/** An AC partner in Indore, online, near the customer's saved address. */
async function indorePartner(name = 'Ravi AC Tech') {
  const sp = await kit.flow.partner(['AC'], name);
  await ServiceProvider.updateOne(
    { _id: sp.serviceProvider._id },
    { serviceCityName: 'Indore', serviceStateName: 'MP', location: { latitude: 22.73, longitude: 75.87 } },
  );
  return sp;
}

async function scenario() {
  const w = await kit.world();
  const [lg, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.customer(), kit.superAdmin()]);
  const claim = await kit.submitClaim(w, cust);
  return { w, lg, cust, admin, claim };
}

const approve = (lg, claim, body = {}) =>
  api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(lg.token)).send(body);

describe('Phase 5 — approval creates the Service Job', () => {
  it('creates a separate NCCJ job linked both ways, carrying the claim\'s details', async () => {
    const { w, lg, claim } = await scenario();
    await indorePartner();

    const res = await approve(lg, claim, { remarks: 'OK' }).expect(200);
    expect(res.body.data.status).toBe('Job Created');
    expect(res.body.data.serviceJob.humanId).toMatch(new RegExp(`^NCCJ-${YEAR}-\\d{6}$`));

    const saved = await WarrantyClaim.findById(claim.id);
    const sr = await ServiceRequest.findById(saved.serviceRequest);
    expect(sr.humanId).not.toBe(saved.humanId);
    expect(String(sr.warrantyClaim)).toBe(claim.id);
    expect(sr.toObject()).toMatchObject({
      requestMode: 'B2B2C',
      warranty: 'In Warranty',
      category: 'AC',
      model: 'AS-Q18',
      serialNo: claim.serialNumber,
      zone: 'Indore',
      pincode: '452001',
      customerLocation: { latitude: 22.72, longitude: 75.86 },
      invoiceAvailable: true,
    });
    expect(String(sr.brand)).toBe(String(w.lg._id));
    expect(String(sr.user)).toBe(String(saved.customer));
    expect(sr.description).toBe('Warranty: Air Conditioner — Cooling Issue. Blows warm air');
    expect(sr.attachments).toHaveLength(1);

    expect(saved.timeline.map((e) => [e.action, e.toStatus])).toEqual([
      ['CLAIM_SUBMITTED', null],
      ['CLAIM_APPROVED', 'Approved'],
      ['JOB_CREATED', 'Job Created'],
      ['PARTNER_OFFERED', null], // Phase 6: internal dispatch history
    ]);
    const audit = await AuditLog.find({ entityId: saved._id }).sort({ createdAt: 1, _id: 1 });
    expect(audit.map((a) => a.toStatus)).toEqual([null, 'Approved', 'Job Created', null]);

    // The brand isn't told about a "new brand warranty claim" for its own approval.
    expect(await Notification.countDocuments({ recipient: lg.user._id, title: 'Brand Warranty Claim' })).toBe(0);
  });

  it('offers the job to the nearest eligible partner straight away', async () => {
    const { lg, claim } = await scenario();
    const sp = await indorePartner();

    await approve(lg, claim).expect(200);
    const saved = await WarrantyClaim.findById(claim.id);
    const sr = await ServiceRequest.findById(saved.serviceRequest);
    expect(sr.status).toBe('Assigned');
    expect(String(sr.serviceProvider)).toBe(String(sp.serviceProvider._id));
    expect(saved.flags.allocationFailed).toBe(false);
  });

  it('flags the claim for Super Admin when nobody is available — once', async () => {
    const { lg, cust, admin, claim } = await scenario();

    await approve(lg, claim).expect(200);
    const saved = await WarrantyClaim.findById(claim.id);
    expect((await ServiceRequest.findById(saved.serviceRequest)).status).toBe('New');
    expect(saved.flags.allocationFailed).toBe(true);
    expect(saved.timeline.at(-1)).toMatchObject({ action: 'ALLOCATION_FAILED', visibility: 'internal' });

    const alerts = await Notification.find({ recipient: admin.user._id, title: 'Warranty Job Needs Manual Assignment' });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toMatch(new RegExp(`^NCCJ-${YEAR}-\\d{6} \\(${claim.humanId}, LG Air Conditioner, 452001\\)`));

    // A retry that also finds nobody doesn't alert again.
    await dispatchServiceJob(claim.id);
    expect(await Notification.countDocuments({ recipient: admin.user._id, title: 'Warranty Job Needs Manual Assignment' })).toBe(1);

    // Internal: neither customer nor brand sees it.
    const mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(mine.body.data.timeline.map((e) => e.action)).not.toContain('ALLOCATION_FAILED');
    const brandView = await api().get(`/api/v1/brand/warranty-claims/${claim.id}`).set(bearer(lg.token)).expect(200);
    expect(brandView.body.data.timeline.map((e) => e.action)).not.toContain('ALLOCATION_FAILED');
  });

  it('never creates a second job for the same claim', async () => {
    const { lg, claim } = await scenario();
    await approve(lg, claim).expect(200);
    const saved = await WarrantyClaim.findById(claim.id);

    const again = await createServiceJobForClaim(saved);
    expect(String(again._id)).toBe(String(saved.serviceRequest));
    // Even if the link on the claim were lost.
    saved.serviceRequest = null;
    const found = await createServiceJobForClaim(saved);
    expect(String(found._id)).toBe(String(again._id));
    expect(await ServiceRequest.countDocuments({ warrantyClaim: claim.id })).toBe(1);
  });

  it('two simultaneous approvals create exactly one job', async () => {
    const { w, lg, claim } = await scenario();
    const second = await kit.brandAdmin(w.lg);

    const results = await Promise.all([approve(lg, claim), approve(second, claim)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await ServiceRequest.countDocuments({ warrantyClaim: claim.id })).toBe(1);
    const saved = await WarrantyClaim.findById(claim.id);
    expect(saved.timeline.filter((e) => e.action === 'CLAIM_APPROVED')).toHaveLength(1);
    expect(saved.timeline.filter((e) => e.action === 'JOB_CREATED')).toHaveLength(1);
  });

  it('a rejected claim never gets a job', async () => {
    const { lg, claim } = await scenario();
    await api().post(`/api/v1/brand/warranty-claims/${claim.id}/reject`).set(bearer(lg.token)).send({ reason: 'Not covered' }).expect(200);
    await approve(lg, claim).expect(409);
    expect(await ServiceRequest.countDocuments({ warrantyClaim: claim.id })).toBe(0);
  });
});

describe('Phase 5 — the partner works the warranty job', () => {
  it('runs as a Brand Warranty job paid from the brand RateCard, free to the customer', async () => {
    const { w, lg, cust, claim } = await scenario();
    await RateCard.create({ brand: w.lg._id, category: 'AC', serviceType: 'Repair', laborRate: 450 });
    const sp = await indorePartner();
    await approve(lg, claim).expect(200);
    const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);

    // No OTP for the customer before a partner has accepted.
    let mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(mine.body.data.completionOtp).toBeNull();

    const auth = bearer(sp.token);
    // The partner app used to send 'NCC Paid Service' for warranty offers; the
    // server must not let that turn a warranty job into a paid one.
    const accepted = await api().post(`/api/v1/service-provider/jobs/accept/${srId}`).set(auth).send({ type: 'NCC Paid Service' }).expect(200);
    const job = accepted.body.data;
    expect(job).toMatchObject({ type: 'Brand Warranty', isPartner: true, isD2C: false, estEarnings: 450 });

    await api().post(`/api/v1/service-provider/jobs/${job.id}/start-travel`).set(auth).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/arrive`).set(auth).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/diagnosis`).set(auth).send({ notes: 'Gas leak at flare nut' }).expect(200);
    await api()
      .post(`/api/v1/service-provider/jobs/${job.id}/spare-parts`)
      .set(auth)
      .send({ parts: [{ name: 'Flare Nut', price: 120, checked: true }] })
      .expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/repair-complete`).set(auth).expect(200);
    const billing = (await api().post(`/api/v1/service-provider/jobs/${job.id}/billing`).set(auth).expect(200)).body.data.billingEstimate;
    expect(billing).toMatchObject({ serviceCharge: 0, sparePartsTotal: 0, total: 0, amountToCollect: 0, serviceProviderEarnings: 450 });

    // The customer reads the completion OTP from their claim and hands it over.
    mine = await api().get(`/api/v1/partner-warranty/claims/${claim.id}`).set(bearer(cust.token)).expect(200);
    expect(mine.body.data.completionOtp).toMatch(/^\d{4}$/);
    await api()
      .post(`/api/v1/service-provider/jobs/${job.id}/collect-payment`)
      .set(auth)
      .send({ paymentMethod: 'Cash', otp: mine.body.data.completionOtp })
      .expect(200);

    expect((await Job.findById(job.id)).activeStep).toBe('completed');
    expect((await ServiceRequest.findById(srId)).status).toBe('Customer Confirmation');

    // The brand sees who is doing the job on its claim.
    const brandView = await api().get(`/api/v1/brand/warranty-claims/${claim.id}`).set(bearer(lg.token)).expect(200);
    expect(brandView.body.data.serviceJob).toMatchObject({ status: 'Customer Confirmation', partner: { name: 'Ravi AC Tech' } });
  });
});
