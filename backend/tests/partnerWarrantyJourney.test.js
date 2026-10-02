import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'node:http';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { DomainEvent } from '../src/modules/partner-warranty/domainEvent.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { RateCard } from '../src/modules/brand-admin/rateCard.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { sweepExpiredAssignments } from '../src/modules/service-requests/serviceRequest.service.js';
import { runWebhookSweep, signPayload } from '../src/modules/partner-warranty/claimWebhooks.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

// docs/partner-warranty Phase 16 — the client's flow (#19), end to end, in
// order: Customer → Backend → Super Admin visibility → Brand → approval → auto
// job → network → partner → execution → 3-way sync, then events, audit,
// notifications and the manual B2B2C payout. Two brands (only LG's staff see
// LG's claim), three partners (reject → timeout → accept), one info request.
// One long scenario on purpose: each step depends on the one before.

const TEST_DB_URI = testDbUri('partnerWarrantyJourney');
const YEAR = new Date().getFullYear();

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9311500000 });
const { api, bearer } = kit;

/** A stand-in LG CRM on 127.0.0.1 recording each webhook delivery. */
function crmReceiver() {
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      received.push({ headers: req.headers, body });
      res.writeHead(200);
      res.end('ok');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, received, url: `http://127.0.0.1:${server.address().port}/ncc` })));
}

let crm;
beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  app = await listenOnLoopback(createApp());
  crm = await crmReceiver();
});

afterAll(async () => {
  await new Promise((r) => crm.server.close(r));
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

describe('Phase 16 — the client\'s Partner Warranty flow, end to end', () => {
  it('runs customer → admin → brand → job → network → partner → completion → payout, with all three views in sync', async () => {
    // ── Setup: two brands with staff, NCC, a customer, three Indore AC partners ──
    const w = await kit.world();
    await RateCard.create({ brand: w.lg._id, category: 'AC', serviceType: 'Repair', laborRate: 450 });
    const [lg, samsung, admin, cust] = await Promise.all([kit.brandAdmin(w.lg), kit.brandAdmin(w.samsung), kit.superAdmin(), kit.customer()]);
    // Three LG-authorized AC partners serving pincode 452001, and one nearer AC
    // partner who isn't LG-authorized — LG has authorized partners, so the job
    // must never reach him.
    const partners = {};
    for (const [name, km, authorized] of [['Asha', 1, true], ['Bilal', 3, true], ['Chetan', 5, true], ['Dev', 0.5, false]]) {
      const sp = await kit.flow.partner(['AC'], name);
      await ServiceProvider.updateOne(
        { _id: sp.serviceProvider._id },
        {
          serviceCityName: 'Indore',
          availability: 'Available',
          location: { latitude: 22.72 + km / 111, longitude: 75.86 },
          authorizedBrands: authorized ? [w.lg._id] : [],
          servicePincodes: authorized ? ['452001'] : [],
        },
      );
      partners[name] = { ...sp, id: String(sp.serviceProvider._id) };
    }
    const { secret } = (await api().put('/api/v1/brand/warranty-webhook').set(bearer(lg.token)).send({ url: crm.url, enabled: true }).expect(200)).body.data;

    // The three views of one claim, read the way each app reads them.
    const views = async (id) => {
      const [c, b, a] = await Promise.all([
        api().get(`/api/v1/partner-warranty/claims/${id}`).set(bearer(cust.token)).expect(200),
        api().get(`/api/v1/brand/warranty-claims/${id}`).set(bearer(lg.token)).expect(200),
        api().get(`/api/v1/super-admin/warranty-claims/${id}`).set(bearer(admin.token)).expect(200),
      ]);
      return { customer: c.body.data, brand: b.body.data, admin: a.body.data };
    };
    const expectInSync = async (id, status) => {
      const v = await views(id);
      expect([v.customer.status, v.brand.status, v.admin.status]).toEqual([status, status, status]);
      return v;
    };

    // ── 1. Customer submits → the backend creates a real NCCW claim ──
    const [invoice, photo] = await Promise.all([kit.upload(cust.token, 'invoice.pdf'), kit.upload(cust.token, 'photo.pdf')]);
    const claim = await kit.submitClaim(w, cust, {
      remarks: 'Warm air after ten minutes',
      documents: [
        { kind: 'invoice', url: invoice, name: 'invoice.pdf' },
        { kind: 'product_photo', url: photo, name: 'photo.pdf' },
      ],
    });
    expect(claim.documents.map((d) => d.kind)).toEqual(['invoice', 'product_photo']);
    expect(claim.humanId).toMatch(new RegExp(`^NCCW-${YEAR}-\\d{6}$`));
    expect(claim.status).toBe('Submitted');

    // ── 2. Super Admin sees it straight away, across brands ──
    const adminList = (await api().get('/api/v1/super-admin/warranty-claims?brand=' + w.lg._id).set(bearer(admin.token)).expect(200)).body;
    const row = adminList.data.find((r) => r.id === claim.id);
    // The client's columns: ticket, brand, customer, product, issue, location, date, status, partner.
    expect(row).toMatchObject({
      humanId: claim.humanId,
      brand: { name: 'LG' },
      customer: { name: cust.user.name },
      productName: 'Air Conditioner',
      issueName: 'Cooling Issue',
      location: { city: 'Indore', pincode: '452001' },
      status: 'Submitted',
      assignedPartner: null,
    });
    expect(row.createdAt).toBeTruthy();

    // ── 3. Only the claim's brand sees it ──
    const lgList = (await api().get('/api/v1/brand/warranty-claims').set(bearer(lg.token)).expect(200)).body.data;
    expect(lgList.map((r) => r.id)).toContain(claim.id);
    const samsungList = (await api().get('/api/v1/brand/warranty-claims').set(bearer(samsung.token)).expect(200)).body.data;
    expect(samsungList.map((r) => r.id)).not.toContain(claim.id);
    await api().get(`/api/v1/brand/warranty-claims/${claim.id}`).set(bearer(samsung.token)).expect(404);

    // ── 4. Brand asks for more information; the customer answers ──
    await api()
      .post(`/api/v1/brand/warranty-claims/${claim.id}/request-info`)
      .set(bearer(lg.token))
      .send({ message: 'Please send a photo of the serial sticker' })
      .expect(200);
    await expectInSync(claim.id, 'Info Requested');
    const sticker = await kit.upload(cust.token, 'sticker.pdf');
    await api()
      .post(`/api/v1/partner-warranty/claims/${claim.id}/info-response`)
      .set(bearer(cust.token))
      .send({ message: 'Sticker attached', documents: [{ kind: 'additional', url: sticker, name: 'sticker.pdf' }] })
      .expect(200);
    let v = await expectInSync(claim.id, 'Brand Review');
    expect(v.brand.infoRequests.at(-1)).toMatchObject({ message: 'Please send a photo of the serial sticker', response: 'Sticker attached' });

    // ── 5. Brand approves → NCC creates the Service Job → offered to the nearest partner ──
    await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(lg.token)).send({ remarks: 'Covered' }).expect(200);
    v = await expectInSync(claim.id, 'Job Created');
    const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);
    const sr = await ServiceRequest.findById(srId);
    expect(sr.humanId).toMatch(new RegExp(`^NCCJ-${YEAR}-\\d{6}$`));
    expect(sr.humanId).not.toBe(claim.humanId);
    expect(String(sr.serviceProvider)).toBe(partners.Asha.id);

    // ── 6. The network: Asha declines, Bilal lets it time out, Chetan accepts ──
    await api().post(`/api/v1/service-provider/jobs/reject/${srId}`).set(bearer(partners.Asha.token)).expect(200);
    expect(String((await ServiceRequest.findById(srId)).serviceProvider)).toBe(partners.Bilal.id);
    await ServiceRequest.updateOne({ _id: srId }, { assignedAt: new Date(Date.now() - 5 * 60 * 1000) });
    expect((await sweepExpiredAssignments()).passedOn).toBe(1);
    expect(String((await ServiceRequest.findById(srId)).serviceProvider)).toBe(partners.Chetan.id);

    // The partner sees a warranty offer (and only the assigned one does).
    const feed = (await api().get('/api/v1/service-provider/jobs/available').set(bearer(partners.Chetan.token)).expect(200)).body.data;
    expect(feed.find((o) => o.id === srId).warranty).toMatchObject({ serviceLabel: 'Warranty Service', jobId: sr.humanId, claimId: claim.humanId, brand: 'LG', customerPays: 0 });
    const auth = bearer(partners.Chetan.token);
    const job = (await api().post(`/api/v1/service-provider/jobs/accept/${srId}`).set(auth).send({ type: 'NCC Paid Service' }).expect(200)).body.data;
    expect(job).toMatchObject({ type: 'Brand Warranty', isD2C: false, estEarnings: 450 });
    v = await expectInSync(claim.id, 'Partner Assigned');
    expect(v.brand.serviceJob.partner).toMatchObject({ name: 'Chetan' });
    const current = v.admin.serviceJobs.find((j) => j.current);
    expect(current).toMatchObject({ humanId: sr.humanId, accepted: true, partner: { name: 'Chetan' } });
    expect(current.declinedBy).toEqual(expect.arrayContaining(['Asha', 'Bilal']));
    // Never offered to the nearer partner LG hasn't authorized; no fallback flag.
    expect(v.admin.timeline.some((e) => /Dev/.test(e.note || ''))).toBe(false);
    expect(v.admin.flags.unauthorizedFallback).toBe(false);

    // ── 7. Execution, each step reflected in all three views ──
    await api().post(`/api/v1/service-provider/warranty-jobs/${job.id}/schedule-visit`).set(auth).send({ date: tomorrow(), slot: '3 PM – 6 PM' }).expect(200);
    v = await expectInSync(claim.id, 'Visit Scheduled');
    expect(v.customer.visit).toEqual({ date: tomorrow(), slot: '3 PM – 6 PM' });

    await api().post(`/api/v1/service-provider/jobs/${job.id}/start-travel`).set(auth).expect(200);
    await expectInSync(claim.id, 'Technician On Way');
    await api().post(`/api/v1/service-provider/jobs/${job.id}/arrive`).set(auth).expect(200);
    await expectInSync(claim.id, 'Service In Progress');
    await api().post(`/api/v1/service-provider/jobs/${job.id}/diagnosis`).set(auth).send({ notes: 'Gas leak at flare nut' }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/spare-parts`).set(auth).send({ parts: [{ name: 'Flare Nut', price: 120, checked: true }] }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${job.id}/repair-complete`).set(auth).expect(200);
    const billing = (await api().post(`/api/v1/service-provider/jobs/${job.id}/billing`).set(auth).expect(200)).body.data.billingEstimate;
    expect(billing).toMatchObject({ total: 0, amountToCollect: 0, serviceProviderEarnings: 450 });

    const otp = (await api().get(`/api/v1/partner-warranty/claims/${claim.id}/track`).set(bearer(cust.token)).expect(200)).body.data.completionOtp;
    await api().post(`/api/v1/service-provider/jobs/${job.id}/collect-payment`).set(auth).send({ paymentMethod: 'Cash', otp }).expect(200);
    await expectInSync(claim.id, 'Service Completed');
    await api().post(`/api/v1/partner-warranty/claims/${claim.id}/confirm`).set(bearer(cust.token)).expect(200);
    v = await expectInSync(claim.id, 'Closed');
    expect(v.brand.serviceJob).toMatchObject({ status: 'Closed' });

    // "Rate your service" on the closed claim rates its job — once.
    const tracked = (await api().get(`/api/v1/partner-warranty/claims/${claim.id}/track`).set(bearer(cust.token)).expect(200)).body.data;
    expect(tracked.serviceRequestId).toBe(srId);
    const rating = { serviceRequestId: srId, serviceProviderRating: 5, platformRating: 4, comment: 'Quick fix' };
    const review = (await api().post('/api/v1/reviews/service-rating').set(bearer(cust.token)).send(rating).expect(201)).body.data;
    expect(String(review.serviceProvider)).toBe(partners.Chetan.id);
    await api().post('/api/v1/reviews/service-rating').set(bearer(cust.token)).send(rating).expect(409);

    // ── 8. The claim's history is the client's order ──
    const saved = await WarrantyClaim.findById(claim.id);
    expect(saved.timeline[0]).toMatchObject({ action: 'CLAIM_SUBMITTED' });
    const path = saved.timeline.filter((e) => e.toStatus).map((e) => e.toStatus);
    expect(path).toEqual([
      'Info Requested',
      'Brand Review',
      'Approved',
      'Job Created',
      'Partner Assigned',
      'Visit Scheduled',
      'Technician On Way',
      'Service In Progress',
      'Service Completed',
      'Closed',
    ]);
    // The customer never sees the dispatch history; the brand never sees NCC-internal events.
    const customerKinds = new Set(v.customer.timeline.map((e) => e.action));
    expect(customerKinds.has('PARTNER_OFFERED')).toBe(false);
    expect(v.admin.timeline.some((e) => e.note === 'Asha declined')).toBe(true);
    expect(v.admin.timeline.some((e) => e.note === 'Bilal did not respond in time')).toBe(true);

    // SLA: all four clocks set at submission and met along the way.
    expect(saved.sla.hours).toMatchObject({ approval: expect.any(Number), assignment: expect.any(Number), visit: expect.any(Number), resolution: expect.any(Number) });
    for (const stage of ['brandApproval', 'assignment', 'visit', 'resolution']) expect(saved.sla.met[stage]).toBeInstanceOf(Date);
    expect(saved.sla.state).toBe('ok');

    // ── 9. Audit: every status change, who made it ──
    const audit = await AuditLog.find({ entityType: 'WarrantyClaim', entityId: saved._id }).sort({ createdAt: 1, _id: 1 }).lean();
    const changes = audit.filter((a) => a.toStatus).map((a) => a.toStatus);
    expect(changes).toEqual(path);
    expect(String(audit.find((a) => a.toStatus === 'Info Requested').user)).toBe(String(lg.user._id));
    expect(String(audit.find((a) => a.toStatus === 'Approved').user)).toBe(String(lg.user._id));
    expect(String(audit.find((a) => a.toStatus === 'Closed').user)).toBe(String(cust.user._id));

    // ── 10. Events to the brand's CRM, signed, in order; Samsung gets nothing ──
    const events = await DomainEvent.find({ claim: saved._id }).sort({ createdAt: 1, _id: 1 }).lean();
    expect(events.map((e) => e.type)).toEqual([
      'CLAIM_CREATED',
      'CLAIM_INFO_REQUESTED',
      'CLAIM_APPROVED',
      'JOB_CREATED',
      'PARTNER_ASSIGNED',
      'JOB_STARTED',
      'JOB_COMPLETED',
      'CLAIM_CLOSED',
    ]);
    while ((await runWebhookSweep()).attempted > 0);
    const hits = crm.received.filter((h) => JSON.parse(h.body).claim?.ticket === claim.humanId);
    expect(hits.map((h) => h.headers['x-ncc-event'])).toEqual(events.map((e) => e.type));
    for (const h of hits) expect(h.headers['x-ncc-signature']).toBe(signPayload(secret, h.headers['x-ncc-timestamp'], h.body));
    expect(await DomainEvent.countDocuments({ brand: w.samsung._id })).toBe(0);

    // ── 11. Notifications reached the customer and the brand ──
    const titles = async (user) => (await Notification.find({ recipient: user._id, type: 'claims' }).sort({ createdAt: 1, _id: 1 })).map((n) => n.title);
    expect(await titles(cust.user)).toEqual(
      expect.arrayContaining(['Warranty Claim Submitted', 'Warranty Claim Approved', 'Technician Assigned', 'Visit Scheduled', 'Service Completed', 'Warranty Claim Closed']),
    );
    expect(await titles(lg.user)).toEqual(expect.arrayContaining(['New Warranty Claim', 'Claim Update: Warranty Claim Closed']));
    expect(await titles(samsung.user)).toEqual([]);

    // ── 12. B2B2C payout: not withdrawable, settled once by NCC ──
    const earnings = async () => (await api().get('/api/v1/service-provider/earnings/breakdown').set(auth).expect(200)).body.data;
    let e = await earnings();
    expect(e.available).toBe(0);
    expect(e.b2b2c).toMatchObject({ jobs: 1, amount: 450, pending: { jobs: 1, amount: 450 }, settlement: 'manual' });
    expect(e.b2b2c.byBrand).toEqual([expect.objectContaining({ brand: 'LG', amount: 450 })]);
    expect(e.b2b2c.byProduct).toEqual([expect.objectContaining({ product: 'Air Conditioner', amount: 450 })]);

    const owed = (await api().get('/api/v1/super-admin/b2b2c-payouts').set(bearer(admin.token)).expect(200)).body.data;
    expect(owed).toEqual([expect.objectContaining({ serviceProvider: expect.objectContaining({ name: 'Chetan' }), amount: 450 })]);
    const settle = { serviceProviderId: partners.Chetan.id, jobIds: [job.id], reference: 'UTR-JOURNEY-1' };
    await api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(bearer(admin.token)).send(settle).expect(200);
    await api().post('/api/v1/super-admin/b2b2c-payouts/settle').set(bearer(admin.token)).send(settle).expect(409);
    e = await earnings();
    expect(e.b2b2c).toMatchObject({ pending: { jobs: 0, amount: 0 }, settled: { jobs: 1, amount: 450 } });
    expect(e.available).toBe(0);
    expect((await Job.findById(job.id)).settlement).toMatchObject({ status: 'settled', reference: 'UTR-JOURNEY-1' });

    // The partners who passed earn nothing from this claim.
    for (const name of ['Asha', 'Bilal']) {
      const theirs = (await api().get('/api/v1/service-provider/warranty-jobs/payouts').set(bearer(partners[name].token)).expect(200)).body.data;
      expect(theirs).toMatchObject({ jobs: 0, amount: 0 });
    }
  });
});
