import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { appendEvent, saveClaim } from '../src/modules/partner-warranty/claimTimeline.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
let server; const kit = brandCrmKit(() => server, { phoneStart: 9360700000 });
beforeAll(async () => { await mongoose.connect(testDbUri('brandCrmTicketDetail')); await registerAllModels(); await ensureIndexes(); server = await listenOnLoopback(createApp()); });
afterAll(async () => { await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { invalidateBrandPermissions(); await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({}))); });
async function world() { const w = await kit.world(); const owner = await kit.brandAdmin(w.lg), other = await kit.brandAdmin(w.samsung), customer = await kit.customer(); const c = await kit.createTicketAs(owner, kit.ticketInput(w, customer)); return { ...w, owner, other, customer, c }; }
const get = (u, path) => kit.api().get(`/api/v1/brand/tickets${path}`).set(kit.bearer(u.token));
const sections = ['ticket', 'customer', 'product', 'warranty', 'complaint', 'approval', 'job', 'parts', 'billing', 'closure', 'activity'];
describe('Phase 7 ticket detail', () => {
  it('opens Submitted once, records first response, exposes complete section contract and scoped customer link', async () => {
    const w = await world(), d = (await get(w.owner, `/${w.c.id}`).expect(200)).body.data;
    expect(Object.keys(d)).toEqual(sections); expect(d.ticket).toMatchObject({ status: 'Brand Review', source: 'toll_free', priority: 'Normal' });
    expect(d.ticket.firstBrandActionAt).toBeTruthy(); expect(d.ticket.registeredBy.user).toBe(w.owner.user.id); expect(d.customer.profileUrl).toBe(`/brand-admin/customers/${w.customer.user.id}`); expect(d.job).toBeNull(); expect(d.product.applianceId).toBeTruthy();
    await get(w.owner, `/${w.c.id}`).expect(200); const c = await WarrantyClaim.findById(w.c.id); expect(c.timeline.filter(e => e.action === 'BRAND_OPENED')).toHaveLength(1);
    await get(w.other, `/${w.c.id}`).expect(404); await get(w.other, `/${w.c.id}/activity`).expect(404);
  });
  it('excludes NCC-only events and filters and paginates newest brand-visible activity', async () => {
    const w = await world(); appendEvent(w.c, { action: 'NOTE_ADDED', actor: { kind: 'admin', name: 'Private Admin' }, note: 'NCC secret', visibility: 'internal' });
    appendEvent(w.c, { action: 'NOTE_ADDED', actor: { kind: 'brand', name: 'Reviewer', employeeId: 'WE-07' }, note: 'Brand note', visibility: 'brand' }); await saveClaim(w.c);
    const r = await get(w.owner, `/${w.c.id}/activity?type=notes&limit=1`).expect(200);
    expect(r.body.meta.total).toBe(1); expect(r.body.data[0]).toMatchObject({ note: 'Brand note', type: 'notes', by: { employeeId: 'WE-07' } });
    const d = (await get(w.owner, `/${w.c.id}`).expect(200)).body.data; expect(JSON.stringify(d)).not.toContain('NCC secret'); expect(JSON.stringify(d)).not.toContain('Private Admin');
    await get(w.owner, `/${w.c.id}/activity?type=invalid`).expect(400);
  });
  it('shows approval and job sections, hides offered partner identity, reveals accepted partner details and retains legacy view', async () => {
    const w = await world(), p = await ServiceProvider.create({ user: new mongoose.Types.ObjectId(), name: 'Assigned Partner', phone: '9360799999' });
    await kit.api().post(`/api/v1/brand/tickets/${w.c.id}/approve`).set(kit.bearer(w.owner.token)).send({ coverageDecision: 'goodwill', remarks: 'Customer relationship gesture' }).expect(200);
    const c = await WarrantyClaim.findById(w.c.id); await ServiceRequest.findByIdAndUpdate(c.serviceRequest, { serviceProvider: p._id, isAccepted: false });
    let d = (await get(w.owner, `/${c.id}`).expect(200)).body.data; expect(Object.keys(d)).toEqual(sections); expect(d.approval).toMatchObject({ decision: 'approved', coverageDecision: 'goodwill' }); expect(d.job.partner).toBeNull();
    await ServiceRequest.findByIdAndUpdate(c.serviceRequest, { isAccepted: true }); d = (await get(w.owner, `/${c.id}`).expect(200)).body.data; expect(d.job.partner.name).toBe('Assigned Partner');
    const legacy = await kit.api().get(`/api/v1/brand/warranty-claims/${c.id}`).set(kit.bearer(w.owner.token)).expect(200); expect(legacy.body.data.humanId).toBe(c.humanId);
    c.status = 'Closed'; c.closedAt = new Date(); await c.save(); d = (await get(w.owner, `/${c.id}`).expect(200)).body.data; expect(Object.keys(d)).toEqual(sections); expect(d.closure.closedAt).toBeTruthy();
  });
});
