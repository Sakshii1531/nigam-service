import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import http from 'node:http';
import crypto from 'node:crypto';
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
import { Job } from '../src/modules/service-provider/job.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { runWebhookSweep, signPayload } from '../src/modules/partner-warranty/claimWebhooks.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyEvents');
const MIN = 60 * 1000;

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9311000000 });
const { api, bearer } = kit;

/** A stand-in brand CRM on 127.0.0.1 that records requests and answers with `reply.status`. */
function crmReceiver() {
  const received = [];
  const reply = { status: 200 };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      received.push({ headers: req.headers, body });
      res.writeHead(reply.status, reply.status === 302 ? { Location: 'http://127.0.0.1:1/' } : {});
      res.end('ok');
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, received, reply, url: `http://127.0.0.1:${server.address().port}/ncc` })),
  );
}

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
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, DomainEvent, ServiceRequest, ServiceProvider, Job, User, AuditLog, Notification].map((m) =>
      m.deleteMany({}),
    ),
  ));

async function base() {
  const w = await kit.world();
  const [lg, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.customer(), kit.superAdmin()]);
  const sp = await kit.flow.partner(['AC'], 'Ravi Kumar');
  await ServiceProvider.updateOne({ _id: sp.serviceProvider._id }, { serviceCityName: 'Indore', location: { latitude: 22.73, longitude: 75.87 } });
  return { w, lg, cust, admin, sp };
}

const tomorrow = () => new Date(Date.now() + 24 * 60 * MIN).toISOString().slice(0, 10);
const titles = async (user, type = 'claims') => (await Notification.find({ recipient: user._id, type }).sort({ createdAt: 1, _id: 1 })).map((n) => n.title);

/** Submit → approve → accept → schedule → travel → arrive → complete → collect → confirm. */
async function fullJourney(s) {
  const claim = await kit.submitClaim(s.w, s.cust);
  await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(s.lg.token)).send({}).expect(200);
  const srId = String((await WarrantyClaim.findById(claim.id)).serviceRequest);
  const auth = bearer(s.sp.token);
  const jobId = (await api().post(`/api/v1/service-provider/jobs/accept/${srId}`).set(auth).send({}).expect(200)).body.data.id;
  await api().post(`/api/v1/service-provider/warranty-jobs/${jobId}/schedule-visit`).set(auth).send({ date: tomorrow(), slot: 'Morning' }).expect(200);
  for (const step of ['start-travel', 'arrive']) await api().post(`/api/v1/service-provider/jobs/${jobId}/${step}`).set(auth).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'ok' }).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [] }).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`).set(auth).expect(200);
  await api().post(`/api/v1/service-provider/jobs/${jobId}/billing`).set(auth).expect(200);
  const otp = (await api().get(`/api/v1/partner-warranty/claims/${claim.id}/track`).set(bearer(s.cust.token)).expect(200)).body.data.completionOtp;
  await api().post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`).set(auth).send({ paymentMethod: 'Cash', otp }).expect(200);
  await api().post(`/api/v1/partner-warranty/claims/${claim.id}/confirm`).set(bearer(s.cust.token)).expect(200);
  return claim;
}

describe('Phase 10 — notifications for every party', () => {
  it('customer, brand and admin hear about the stages the matrix says — once, and no generic duplicates', async () => {
    const s = await base();
    await fullJourney(s);

    expect(await titles(s.cust.user)).toEqual([
      'Warranty Claim Submitted',
      'Warranty Claim Approved',
      'Technician Assigned',
      'Visit Scheduled',
      'Technician On the Way',
      'Service Completed',
      'Warranty Claim Closed',
    ]);
    expect(await titles(s.lg.user)).toEqual([
      'New Warranty Claim',
      'Claim Update: Technician Assigned',
      'Claim Update: Visit Scheduled',
      'Claim Update: Technician On the Way',
      'Claim Update: Service Completed',
      'Claim Update: Warranty Claim Closed',
    ]);
    const adminTitles = await titles(s.admin.user);
    expect(adminTitles).toEqual(expect.arrayContaining(['New Partner Warranty Claim', 'Warranty Claim Approved', 'Warranty: Technician Assigned', 'Warranty: Service Completed']));
    expect(adminTitles).not.toContain('Warranty: Visit Scheduled');

    // The generic job notifications stay off for warranty jobs (₹0, and "assigned" at offer time).
    const generic = await Notification.find({ recipient: s.cust.user._id, type: { $ne: 'claims' } }).lean();
    expect(generic.map((n) => n.title)).toEqual([]);

    const onTheWay = await Notification.findOne({ recipient: s.cust.user._id, title: 'Technician On the Way' });
    expect(onTheWay.message).toMatch(/Ravi is on the way/);
    const completed = await Notification.findOne({ recipient: s.cust.user._id, title: 'Service Completed' });
    expect(completed.cta).toMatchObject({ label: 'Confirm Service' });
  });
});

describe('Phase 10 — domain events', () => {
  it('records CLAIM_CREATED … CLAIM_CLOSED for the journey (skipped while the brand has no webhook)', async () => {
    const s = await base();
    const claim = await fullJourney(s);
    const events = await DomainEvent.find({ claim: claim.id }).sort({ createdAt: 1, _id: 1 });
    expect(events.map((e) => e.type)).toEqual(['CLAIM_CREATED', 'CLAIM_APPROVED', 'JOB_CREATED', 'PARTNER_ASSIGNED', 'JOB_STARTED', 'JOB_COMPLETED', 'CLAIM_CLOSED']);
    expect(new Set(events.map((e) => e.status))).toEqual(new Set(['skipped']));

    const closed = events.at(-1).payload;
    expect(closed).toMatchObject({
      type: 'CLAIM_CLOSED',
      claim: { ticket: claim.humanId, status: 'Closed', product: 'Air Conditioner', issue: 'Cooling Issue', customer: { name: 'Test Customer' }, address: { pincode: '452001' } },
      serviceJob: { id: expect.stringMatching(/^NCCJ-/), status: 'Closed' },
      partner: { name: 'Ravi Kumar' },
    });
    expect(closed.id).toBe(String(events.at(-1)._id));
  });

  it('rejection, info request and cancellation have their own events, with the brand-visible reason', async () => {
    const s = await base();
    const a = await kit.submitClaim(s.w, s.cust);
    await api().post(`/api/v1/brand/warranty-claims/${a.id}/request-info`).set(bearer(s.lg.token)).send({ message: 'Send the warranty card' }).expect(200);
    const b = await kit.submitClaim(s.w, s.cust);
    await api().post(`/api/v1/brand/warranty-claims/${b.id}/reject`).set(bearer(s.lg.token)).send({ reason: 'Burn marks' }).expect(200);
    await api().post(`/api/v1/super-admin/warranty-claims/${a.id}/cancel`).set(bearer(s.admin.token)).send({ reason: 'Customer withdrew' }).expect(200);

    const types = async (id) => (await DomainEvent.find({ claim: id }).sort({ createdAt: 1, _id: 1 })).map((e) => [e.type, e.payload.note]);
    expect(await types(a.id)).toEqual([['CLAIM_CREATED', null], ['CLAIM_INFO_REQUESTED', 'Send the warranty card'], ['CLAIM_CANCELLED', 'Customer withdrew']]);
    expect(await types(b.id)).toEqual([['CLAIM_CREATED', null], ['CLAIM_REJECTED', 'Burn marks']]);
  });
});

describe('Phase 10 — brand CRM webhooks', () => {
  let crm;
  beforeEach(async () => {
    crm = await crmReceiver();
  });
  afterEach(() => new Promise((r) => crm.server.close(r)));

  const configure = (s, body) => api().put('/api/v1/brand/warranty-webhook').set(bearer(s.lg.token)).send(body);

  it('issues the signing secret once, then delivers signed events', async () => {
    const s = await base();
    const res = await configure(s, { url: crm.url, enabled: true }).expect(200);
    const { secret } = res.body.data;
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
    const read = (await api().get('/api/v1/brand/warranty-webhook').set(bearer(s.lg.token)).expect(200)).body.data;
    expect(read).toMatchObject({ url: crm.url, enabled: true, hasSecret: true });
    expect(read).not.toHaveProperty('secret');

    const claim = await kit.submitClaim(s.w, s.cust);
    expect((await DomainEvent.findOne({ claim: claim.id })).status).toBe('pending');
    expect(await runWebhookSweep()).toMatchObject({ attempted: 1, delivered: 1 });

    const [hit] = crm.received;
    expect(hit.headers['x-ncc-event']).toBe('CLAIM_CREATED');
    expect(hit.headers['x-ncc-signature']).toBe(signPayload(secret, hit.headers['x-ncc-timestamp'], hit.body));
    // …which is exactly what a receiver computes (WEBHOOKS.md).
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(`${hit.headers['x-ncc-timestamp']}.${hit.body}`).digest('hex')}`;
    expect(hit.headers['x-ncc-signature']).toBe(expected);
    const payload = JSON.parse(hit.body);
    expect(payload).toMatchObject({ type: 'CLAIM_CREATED', claim: { ticket: claim.humanId } });
    expect(hit.headers['x-ncc-delivery']).toBe(payload.id);

    const event = await DomainEvent.findOne({ claim: claim.id });
    expect(event).toMatchObject({ status: 'delivered', attempts: 1 });
  });

  it('only sends the events the brand subscribed to', async () => {
    const s = await base();
    await configure(s, { url: crm.url, enabled: true, events: ['CLAIM_REJECTED'] }).expect(200);
    const claim = await kit.submitClaim(s.w, s.cust);
    await api().post(`/api/v1/brand/warranty-claims/${claim.id}/reject`).set(bearer(s.lg.token)).send({ reason: 'Not covered' }).expect(200);
    await runWebhookSweep();
    expect(crm.received.map((r) => r.headers['x-ncc-event'])).toEqual(['CLAIM_REJECTED']);
  });

  it('retries with backoff, gives up after 6 attempts and tells admins; an admin retry re-sends', async () => {
    const s = await base();
    await configure(s, { url: crm.url, enabled: true }).expect(200);
    crm.reply.status = 500;
    const claim = await kit.submitClaim(s.w, s.cust);

    let now = new Date();
    await runWebhookSweep({ now });
    let event = await DomainEvent.findOne({ claim: claim.id });
    expect(event).toMatchObject({ status: 'pending', attempts: 1, lastError: 'HTTP 500' });
    expect(event.nextAttemptAt.getTime() - now.getTime()).toBe(1 * MIN);

    // Too early: nothing happens.
    await runWebhookSweep({ now: new Date(now.getTime() + 30 * 1000) });
    expect((await DomainEvent.findOne({ claim: claim.id })).attempts).toBe(1);

    for (const wait of [1, 5, 30, 120, 720]) {
      now = new Date(now.getTime() + wait * MIN + 1000);
      await runWebhookSweep({ now });
    }
    event = await DomainEvent.findOne({ claim: claim.id });
    expect(event).toMatchObject({ status: 'failed', attempts: 6 });
    expect(event.deliveries).toHaveLength(6);
    expect(await Notification.countDocuments({ recipient: s.admin.user._id, title: 'Brand Webhook Delivery Failed' })).toBe(1);

    crm.reply.status = 200;
    const retried = await api().post(`/api/v1/super-admin/warranty-webhooks/deliveries/${event.id}/retry`).set(bearer(s.admin.token)).expect(200);
    expect(retried.body.data.status).toBe('delivered');

    const log = await api().get(`/api/v1/super-admin/warranty-webhooks/deliveries?brand=${s.w.lg._id}`).set(bearer(s.admin.token)).expect(200);
    expect(log.body.data[0]).toMatchObject({ type: 'CLAIM_CREATED', status: 'delivered', brand: 'LG', claimTicket: claim.humanId });
    await api().get('/api/v1/super-admin/warranty-webhooks/deliveries').set(bearer(s.lg.token)).expect(403);
  });

  it('treats a redirect as a failure (a redirect could point anywhere)', async () => {
    const s = await base();
    await configure(s, { url: crm.url, enabled: true }).expect(200);
    crm.reply.status = 302;
    await kit.submitClaim(s.w, s.cust);
    await runWebhookSweep();
    expect((await DomainEvent.findOne({})).lastError).toBe('HTTP 302');
  });

  it('test ping reports success and failure', async () => {
    const s = await base();
    await configure(s, { url: crm.url, enabled: true }).expect(200);
    const ok = await api().post('/api/v1/brand/warranty-webhook/test').set(bearer(s.lg.token)).expect(200);
    expect(ok.body.data).toMatchObject({ status: 'delivered', httpStatus: 200 });
    expect(crm.received.at(-1).headers['x-ncc-event']).toBe('PING');

    await new Promise((r) => crm.server.close(r));
    const down = await api().post('/api/v1/brand/warranty-webhook/test').set(bearer(s.lg.token)).expect(200);
    expect(down.body.data.status).toBe('failed');
    expect(down.body.data.error).toBeTruthy();
    crm = await crmReceiver(); // for afterEach
  });

  it('validates the configuration', async () => {
    const s = await base();
    await configure(s, { url: 'not a url' }).expect(400);
    await configure(s, { url: 'ftp://crm.example.com/hook' }).expect(400);
    await configure(s, { enabled: true }).expect(400); // no URL yet
    await configure(s, { events: ['NOT_AN_EVENT'] }).expect(400);
    await configure(s, { secret: 'mine' }).expect(400); // secrets are issued, never chosen

    const first = (await configure(s, { url: crm.url }).expect(200)).body.data.secret;
    expect((await configure(s, { enabled: true }).expect(200)).body.data.secret).toBeUndefined();
    const rotated = (await configure(s, { rotateSecret: true }).expect(200)).body.data.secret;
    expect(rotated).toMatch(/^[a-f0-9]{64}$/);
    expect(rotated).not.toBe(first);
  });
});
