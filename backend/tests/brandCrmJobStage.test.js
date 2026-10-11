import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { PartOrder } from '../src/modules/service-provider/partOrder.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { DomainEvent } from '../src/modules/partner-warranty/domainEvent.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';
import { rankServiceProviders } from '../src/modules/shared/assignmentEngine.js';
import { jobStageFor, syncJobStage } from '../src/modules/partner-warranty/claimDispatch.js';
import { sweepExpiredAssignments } from '../src/modules/service-requests/serviceRequest.service.js';
import { setIO } from '../src/sockets/io.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
let server; const kit = brandCrmKit(() => server, { phoneStart: 9360800000 });
beforeAll(async () => { await mongoose.connect(testDbUri('brandCrmJobStage')); await registerAllModels(); await ensureIndexes(); server = await listenOnLoopback(createApp()); });
afterAll(async () => { await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { invalidateBrandPermissions(); await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({}))); });
afterEach(() => setIO(null));
async function world() { const w = await kit.world(), owner = await kit.brandAdmin(w.lg), other = await kit.brandAdmin(w.samsung), customer = await kit.customer(); const c = await kit.createTicketAs(owner, kit.ticketInput(w, customer)); return { ...w, owner, other, customer, c }; }
const get = (u, path) => kit.api().get(`/api/v1/brand/tickets${path}`).set(kit.bearer(u.token));
const action = (u, id, path, data = {}) => kit.api().post(`/api/v1/brand/tickets/${id}/${path}`).set(kit.bearer(u.token)).send(data);
const saved = w => WarrantyClaim.findById(w.c.id);
async function approve(w) { await action(w.owner, w.c.id, 'approve', { coverageDecision: 'goodwill', remarks: 'Customer relationship gesture' }).expect(200); w.sr = await ServiceRequest.findById((await saved(w)).serviceRequest); }
async function partner(name, at = 22.73) { const p = await kit.flow.partner(['AC'], name); await ServiceProvider.findByIdAndUpdate(p.serviceProvider._id, { serviceCityName: 'Indore', location: { latitude: at, longitude: 75.87 }, rating: 4.5 }); return p; }
async function accept(w, p) { w.p = p; w.job = (await kit.api().post(`/api/v1/service-provider/jobs/accept/${w.sr.id}`).set(kit.bearer(p.token)).send({}).expect(200)).body.data; }
const step = (w, path, data = {}) => kit.api().post(`/api/v1/service-provider/jobs/${w.job.id}/${path}`).set(kit.bearer(w.p.token)).send(data).expect(200);
async function complete(w) { await step(w, 'start-travel'); await step(w, 'arrive'); await step(w, 'diagnosis', { notes: 'Fault diagnosed' }); await step(w, 'spare-parts', { parts: [] }); const url = await kit.upload(w.customer.token); await step(w, 'repair-complete', { notes: 'Repair completed and tested', workDone: 'Replaced faulty capacitor and tested cooling', photos: [url] }); await step(w, 'billing'); const sr = await ServiceRequest.findById(w.sr.id); await step(w, 'collect-payment', { paymentMethod: 'Cash', otp: sr.completionOtp }); return url; }
describe('Phase 8 verified mapping', () => {
  it.each([
    ['New', null, false, false, 'PARTNER_FINDING'], ['Assigned', null, false, false, 'JOB_OFFERED'],
    ['New', null, false, true, 'ALLOCATION_FAILED'], ['Engineer Accepted', 'assigned', true, false, 'PARTNER_ASSIGNED'],
    ['Visit Scheduled', 'assigned', true, false, 'VISIT_SCHEDULED'], ['Visit Scheduled', 'ontheway', true, false, 'EN_ROUTE'],
    ['Engineer Reached', 'inspection', true, false, 'REACHED'], ['Diagnosis Done', 'inspection', true, false, 'DIAGNOSIS'],
    ['Spare Ordered', 'completed_pending', true, false, 'PARTS_REQUIRED'], ['Spare Received', 'revisit_scheduled', true, false, 'REPAIR'],
    ['Spare Received', 'revisit_ontheway', true, false, 'EN_ROUTE'], ['Engineer Reached', 'revisit_arrived', true, false, 'REPAIR'],
    ['Repair Completed', 'repaircomplete', true, false, 'COMPLETED'], ['Customer Confirmation', 'completed', true, false, 'CUSTOMER_CONFIRMATION'],
    ['Closed', 'completed', true, false, 'CLOSED'], ['Cancelled', 'cancelled', true, false, 'ALLOCATION_FAILED'],
  ])('%s / %s → %s', (status, activeStep, isAccepted, failed, expected) => {
    expect(jobStageFor({ status, isAccepted, serviceProvider: status === 'Assigned' ? 'provider' : null }, { activeStep }, { flags: { allocationFailed: failed } })).toBe(expected);
  });
});
describe('Phase 8 real job lifecycle', () => {
  it('records initial finding and allocation failure with brand-visible stage and domain event', async () => {
    const w = await world(); await approve(w); const c = await saved(w); expect(c.jobStage).toBe('ALLOCATION_FAILED');
    expect(c.timeline.filter(e => e.action === 'JOB_STAGE_CHANGED').map(e => e.meta.stage)).toEqual(['PARTNER_FINDING', 'ALLOCATION_FAILED']);
    expect(await DomainEvent.countDocuments({ claim: c._id, type: 'JOB_STAGE_CHANGED' })).toBe(2);
    const d = (await get(w.owner, `/${c.id}`).expect(200)).body.data; expect(d.job.allocation.failed).toBe(true);
  });
  it('keeps declined/timed-out partners anonymous and records accepted attempt, filters stages across both queues', async () => {
    const w = await world(), a = await partner('Private First', 22.721), b = await partner('Private Second', 22.73), p = await partner('Accepted Partner', 22.74); await approve(w);
    expect((await saved(w)).jobStage).toBe('JOB_OFFERED');
    await kit.api().post(`/api/v1/service-provider/jobs/reject/${w.sr.id}`).set(kit.bearer(a.token)).send({ reason: 'Unavailable' }).expect(200);
    await ServiceRequest.findByIdAndUpdate(w.sr.id, { assignedAt: new Date(Date.now() - 120000) }); await sweepExpiredAssignments();
    await accept(w, p); const c = await saved(w); expect(c.jobStage).toBe('PARTNER_ASSIGNED'); expect(c.allocation.attempts.map(a => a.outcome)).toEqual(['declined', 'timeout', 'accepted']);
    const d = (await get(w.owner, `/${c.id}`).expect(200)).body.data; expect(d.job.allocation.attempts.map(a => a.partner.name)).toEqual(['Partner 1', 'Partner 2', 'Accepted Partner']);
    expect(JSON.stringify(d)).not.toContain('Private First'); expect(JSON.stringify(d)).not.toContain('Private Second');
    expect((await get(w.owner, '?jobStage=PARTNER_ASSIGNED').expect(200)).body.data[0].id).toBe(c.id);
    expect((await get(w.other, '?jobStage=PARTNER_ASSIGNED').expect(200)).body.data).toEqual([]);
  });
  it('syncs every step once, copies completion evidence, OTP/app confirmation and rating without customer stage leakage', async () => {
    const w = await world(), p = await partner('Service Partner'); await approve(w); await accept(w, p);
    const pushes = []; setIO({ to: room => ({ emit: (event, payload) => pushes.push({ room, event, payload }) }) });
    const checkpoints = [['start-travel', 'EN_ROUTE'], ['arrive', 'REACHED'], ['diagnosis', 'DIAGNOSIS'], ['spare-parts', 'REPAIR']];
    for (const [path, stage] of checkpoints) {
      const before = (await saved(w)).timeline.filter(e => e.action === 'JOB_STAGE_CHANGED').length;
      const start = pushes.length; await step(w, path, path === 'diagnosis' ? { notes: 'Fault diagnosed' } : path === 'spare-parts' ? { parts: [] } : {});
      let c = await saved(w); expect(c.jobStage).toBe(stage); expect(c.timeline.filter(e => e.action === 'JOB_STAGE_CHANGED')).toHaveLength(before + 1);
      expect(pushes.slice(start).filter(p => p.room === `brand:${w.lg.id}` && p.event === 'claim:updated')).toHaveLength(1);
      await syncJobStage(w.sr.id); c = await saved(w); expect(c.timeline.filter(e => e.action === 'JOB_STAGE_CHANGED')).toHaveLength(before + 1);
    }
    const url = await kit.upload(w.customer.token); await step(w, 'repair-complete', { notes: 'Repair tested', workDone: 'Capacitor replaced', photos: [url] }); expect((await saved(w)).jobStage).toBe('COMPLETED');
    await step(w, 'billing'); const sr = await ServiceRequest.findById(w.sr.id); await step(w, 'collect-payment', { paymentMethod: 'Cash', otp: sr.completionOtp });
    let c = await saved(w); expect(c.jobStage).toBe('CUSTOMER_CONFIRMATION'); expect(c.closure.confirmationMethod).toBe('otp'); expect(c.closure.serviceReport.workDone).toBe('Capacitor replaced'); expect(c.documents.filter(d => d.kind === 'service_report').map(d => d.url)).toEqual([url]);
    const customer = await kit.api().get(`/api/v1/partner-warranty/claims/${c.id}`).set(kit.bearer(w.customer.token)).expect(200); expect(JSON.stringify(customer.body.data)).not.toContain('jobStage');
    expect(pushes.filter(p => p.room === `user:${w.customer.user.id}`).every(p => !('jobStage' in p.payload))).toBe(true);
    await kit.api().post(`/api/v1/partner-warranty/claims/${c.id}/confirm`).set(kit.bearer(w.customer.token)).expect(200);
    c = await saved(w); expect(c.jobStage).toBe('CLOSED'); expect(c.closure.confirmationMethod).toBe('app'); expect(c.closure.closedAt).toBeTruthy();
    await kit.api().post('/api/v1/reviews/service-rating').set(kit.bearer(w.customer.token)).send({ serviceId: w.sr.id, serviceProviderRating: 4, platformRating: 5, rating: 5, comment: 'Cooling restored' }).expect(201);
    c = await saved(w); expect(c.closure).toMatchObject({ rating: 5, feedback: 'Cooling restored' }); expect(c.timeline.at(-1).action).toBe('RATED');
  });
  it('requires post-completion contact evidence for CCE confirmation and enforces permissions and brand scope', async () => {
    const w = await world(), p = await partner('Service Partner'), viewer = await kit.brandUser(w.lg, { templates: ['viewer'] }); await approve(w); await accept(w, p); await complete(w);
    const body = { method: 'cce', remarks: 'Customer confirmed by telephone' };
    await action(viewer, w.c.id, 'confirm-on-behalf', body).expect(403); await action(w.other, w.c.id, 'confirm-on-behalf', body).expect(404); await action(w.owner, w.c.id, 'confirm-on-behalf', body).expect(409);
    await action(w.owner, w.c.id, 'notes', { note: 'Called customer: cooling restored, customer confirms completion' }).expect(200);
    await action(w.owner, w.c.id, 'confirm-on-behalf', body).expect(200); const c = await saved(w); expect(c.closure.confirmationMethod).toBe('cce'); expect(c.jobStage).toBe('CLOSED'); await action(w.owner, c.id, 'confirm-on-behalf', body).expect(409);
  });
  it('parts received and revisit steps sync while ordinary forward stages cannot regress', async () => {
    const w = await world(), p = await partner('Service Partner'); await approve(w); await accept(w, p); await step(w, 'start-travel'); await step(w, 'arrive'); await step(w, 'diagnosis', { notes: 'Part required' });
    await step(w, 'request-part', { partName: 'Capacitor', price: 100, qty: 1, orderSource: 'Partner Brand' }); expect((await saved(w)).jobStage).toBe('PARTS_REQUIRED');
    const order = await PartOrder.findOne({ job: w.job.id });
    await kit.api().post(`/api/v1/brand/parts/${order.id}/approve`).set(kit.bearer(w.owner.token)).send({remarks:'Approved required part'}).expect(200);
    const admin = await kit.superAdmin();
    for (const status of ['Approved','Dispatched','Delivered']) {
      await kit.api().patch(`/api/v1/super-admin/part-orders/${order.id}`).set(kit.bearer(admin.token)).send({status}).expect(200);
      expect((await saved(w)).jobStage).toBe('PARTS_REQUIRED');
    }
    await step(w, `parts/${order.id}/received`);expect((await saved(w)).jobStage).toBe('REPAIR');
    await step(w, 'start-travel'); expect((await saved(w)).jobStage).toBe('EN_ROUTE'); await step(w, 'arrive'); expect((await saved(w)).jobStage).toBe('REPAIR');
  });
  it('withdraws pending offers on NCC hold and retries on resume without exposing identity', async () => {
    const w = await world(), p = await partner('Private Offered Partner'); await approve(w);
    const admin = await kit.superAdmin(), path = `/api/v1/super-admin/warranty-claims/${w.c.id}`;
    await kit.api().post(`${path}/hold`).set(kit.bearer(admin.token)).send({reason:'Customer asked to wait'}).expect(200);
    let c = await saved(w); expect(c.allocation.attempts[0].outcome).toBe('withdrawn'); expect(c.jobStage).toBe('PARTNER_FINDING');
    await kit.api().post(`${path}/resume`).set(kit.bearer(admin.token)).send({reason:'Customer is available again'}).expect(200);
    c = await saved(w); expect(c.allocation.attempts).toHaveLength(2); expect(c.jobStage).toBe('JOB_OFFERED');
    await accept(w,p); const detail = (await get(w.owner,`/${c.id}`).expect(200)).body.data;
    expect(detail.job.allocation.attempts[0].partner.name).toBe('Partner 1'); expect(detail.job.allocation.attempts[1].partner.name).toBe('Private Offered Partner');
  });
  it('Critical and near-deadline warranty ranking favor proximity while preserving eligibility filters', async () => {
    const w = await world(), near = await partner('Near', 22.721), far = await partner('Far', 22.80); await ServiceProvider.findByIdAndUpdate(near.serviceProvider._id, { activeJobsCount: 5 });
    await AssignmentWeighting.create({ proximityPercent: 0, skillPercent: 0, ratingPercent: 0, workloadPercent: 100 });
    const args = { category: 'AC', city: 'Indore', latitude: 22.72, longitude: 75.87, warranty: { brand: w.lg._id, pincode: '452001' } };
    expect((await rankServiceProviders(args))[0].serviceProvider.id).toBe(far.serviceProvider.id);
    expect((await rankServiceProviders({ ...args, urgency: { priority: 'Critical' } }))[0].serviceProvider.id).toBe(near.serviceProvider.id);
    expect((await rankServiceProviders({ ...args, urgency: { priority: 'Normal', remainingMs: 1000, windowMs: 10000 } }))[0].serviceProvider.id).toBe(near.serviceProvider.id);
    await ServiceProvider.findByIdAndUpdate(near.serviceProvider._id, { availability: 'Offline' }); expect((await rankServiceProviders({ ...args, urgency: { priority: 'Critical' } }))[0].serviceProvider.id).toBe(far.serviceProvider.id);
  });
});
