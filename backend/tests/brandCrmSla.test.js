import { backfillWarrantySla } from '../src/modules/brand-crm/slaMigration.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Team } from '../src/modules/brand-admin/team.model.js';
import { DomainEvent } from '../src/modules/partner-warranty/domainEvent.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { startSla, applySlaTransition, slaStages, changeSlaPriority, evaluateSla } from '../src/modules/partner-warranty/claimSla.js';
import { setJobStage } from '../src/modules/partner-warranty/claimTimeline.js';
import { runSlaSweep } from '../src/modules/partner-warranty/claimSla.service.js';
let server; const kit = brandCrmKit(() => server, { phoneStart: 9371100000 });
const HOUR = 3600000, t0 = new Date('2026-10-01T00:00:00Z'), at = h => new Date(+t0 + h * HOUR);
beforeAll(async () => { await mongoose.connect(testDbUri('brandCrmSla')); await registerAllModels(); await ensureIndexes(); server = await listenOnLoopback(createApp()); });
afterAll(async () => { await awaitPendingDeliveries(); await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await awaitPendingDeliveries(); invalidateBrandPermissions(); await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({}))); });
const api = (method, path, u, body = {}) => kit.api()[method](`/api/v1${path}`).set(kit.bearer(u.token)).send(body);
async function world() {
  const w = await kit.world(), owner = await kit.brandAdmin(w.lg), other = await kit.brandAdmin(w.samsung),
    cce = await kit.brandUser(w.lg, { templates: ['cce'] }), manager = await kit.brandUser(w.lg, { templates: ['brand_manager'], name: 'SLA Manager' }),
    quality = await kit.brandUser(w.lg, { templates: ['quality_escalation'], name: 'SLA Quality' }), admin = await kit.superAdmin(), customer = await kit.customer();
  const c = await kit.submitClaim(w, customer);
  await WarrantyClaim.updateOne({ _id: c.id }, { $set: { 'sla.responseDueAt': at(2), 'sla.brandApprovalDueAt': at(24), 'sla.resolutionDueAt': at(168) } });
  return { ...w, owner, other, cce, manager, quality, admin, customer, c };
}
describe('Phase 11 SLA v2', () => {
  it('freezes all five clocks while paused, and preserves elapsed time on resume', () => {
    const c = { status: 'Submitted', priority: 'Normal' };
    startSla(c, { response: 2, approval: 24, assignment: 4, visit: 48, resolution: 168 }, t0);
    applySlaTransition(c, 'Submitted', 'Info Requested', at(1));
    expect(evaluateSla(c, at(300))).toEqual([]);
    expect(slaStages(c, at(300))[0]).toMatchObject({ remainingMs: HOUR, paused: true });
    applySlaTransition(c, 'Info Requested', 'Brand Review', at(5));
    expect(c.sla.responseDueAt).toEqual(at(6));
    applySlaTransition(c, 'Brand Review', 'On Hold', at(5.5));
    applySlaTransition(c, 'On Hold', 'Brand Review', at(7));
    expect(c.sla.responseDueAt).toEqual(at(7.5));
  });
  it('applies priority factors and adjusts open deadlines without restarting elapsed time', () => {
    const c = { priority: 'Critical', status: 'Submitted' };
    startSla(c, { response: 2, approval: 24, assignment: 4, visit: 48, resolution: 168 }, t0);
    expect(c.sla.responseDueAt).toEqual(at(1));
    expect(c.sla.brandApprovalDueAt).toEqual(at(12));
    c.priority = 'Low'; changeSlaPriority(c);
    expect(c.sla.responseDueAt).toEqual(at(3)); expect(c.sla.hours.resolution).toBe(252);
  });
  it('stops response on first open and never rewrites that timestamp', async () => {
    const w = await world();
    let detail = (await api('get', `/brand/tickets/${w.c.id}`, w.owner).expect(200)).body.data;
    const response = detail.ticket.sla.stages.find(s => s.key === 'response');
    expect(response.state).toBe('met'); expect(response.metAt).toBe(detail.ticket.firstBrandActionAt);
    detail = (await api('get', `/brand/tickets/${w.c.id}`, w.owner).expect(200)).body.data;
    expect(detail.ticket.firstBrandActionAt).toBe(response.metAt);
    expect((await WarrantyClaim.findById(w.c.id)).sla.met.response.toISOString()).toBe(response.metAt);
  });
  it('keeps first visit running during scheduling and travel, stops at REACHED', async () => {
    const w = await world(), c = await WarrantyClaim.findById(w.c.id);
    applySlaTransition(c, 'Approved', 'Job Created', t0);
    applySlaTransition(c, 'Job Created', 'Partner Assigned', at(0.5));
    applySlaTransition(c, 'Partner Assigned', 'Visit Scheduled', at(1));
    applySlaTransition(c, 'Visit Scheduled', 'Technician On Way', at(2));
    expect(c.sla.met.visit).toBeFalsy();
    setJobStage(c, 'EN_ROUTE');
    expect(c.sla.met.visit).toBeFalsy();
    setJobStage(c, 'REACHED'); expect(c.sla.met.visit).toBeInstanceOf(Date);
  });
  it('creates one L1 warning, promotes to L2 and NCC on breach, notifies roles, and is idempotent concurrently', async () => {
    const w = await world();
    await runSlaSweep({ now: at(1.7) });
    let e = await Escalation.findOne({ warrantyClaim: w.c.id, scope: 'brand', slaStage: 'response' });
    expect(e).toMatchObject({ level: 1, raisedBy: 'System Auto', reason: 'Response SLA near breach' });
    expect(String(e.responsible.user)).toBe(String(w.manager.user._id)); expect(e.dueAt).toEqual(at(6));
    expect(await Notification.countDocuments({ recipient: w.manager.user._id, title: 'SLA escalation · L1' })).toBe(1);
    await Promise.all([runSlaSweep({ now: at(2.1) }), runSlaSweep({ now: at(2.1) })]);
    expect(await Escalation.countDocuments({ warrantyClaim: w.c.id })).toBe(2);
    e = await Escalation.findById(e.id); expect(e.level).toBe(2); expect(String(e.responsible.user)).toBe(String(w.quality.user._id));
    expect(await Notification.countDocuments({ recipient: w.quality.user._id, title: 'SLA escalation · L2' })).toBe(1);
    expect(await Notification.countDocuments({ recipient: w.admin.user._id, title: 'SLA escalation · L2' })).toBe(1);
    await runSlaSweep({ now: at(2.2) }); expect(await Escalation.countDocuments({ warrantyClaim: w.c.id })).toBe(2);
    expect(await DomainEvent.countDocuments({ claim: w.c.id, type: 'ESCALATION_RAISED' })).toBe(3);
    const c = await WarrantyClaim.findById(w.c.id);
    expect(c.sla.breachFacts.response).toEqual(at(2.1)); expect(c.flags.escalated).toBe(true);
  });
  it('routes to the assigned CCE team lead before round-robin role users', async () => {
    const w = await world();
    await Team.create({ brand: w.lg.id, name: 'Response team', department: 'Customer Care', lead: w.owner.user._id, members: [w.cce.user._id] });
    await WarrantyClaim.updateOne({ _id: w.c.id }, { $set: { assignedCce: { user: w.cce.user._id, kind: 'brand', name: 'CCE' } } });
    await runSlaSweep({ now: at(1.7) });
    expect(String((await Escalation.findOne({ warrantyClaim: w.c.id })).responsible.user)).toBe(String(w.owner.user._id));
  });
  it('requires a resolution, preserves facts, resolves the NCC mirror and clears the flag only after all stages resolve', async () => {
    const w = await world(); await runSlaSweep({ now: at(25) });
    const es = await Escalation.find({ warrantyClaim: w.c.id, scope: 'brand' }); expect(es).toHaveLength(2);
    await api('post', `/brand/escalations/${es[0].id}/resolve`, w.owner, { resolution: 'short' }).expect(400);
    await api('patch', `/brand/escalations/${es[0].id}/status`, w.owner, { status: 'Resolved' }).expect(400);
    await api('post', `/brand/escalations/${es[0].id}/resolve`, w.owner, { resolution: 'Customer contacted and next action agreed' }).expect(200);
    expect((await WarrantyClaim.findById(w.c.id)).flags.escalated).toBe(true);
    await api('post', `/brand/escalations/${es[1].id}/resolve`, w.owner, { resolution: 'Approval reviewed and action owner confirmed' }).expect(200);
    const c = await WarrantyClaim.findById(w.c.id);
    expect(c.flags.escalated).toBe(false); expect(c.sla.breaches).toContain('response'); expect(c.sla.breachFacts.response).toBeTruthy();
    expect(await Escalation.countDocuments({ warrantyClaim: c.id, status: { $ne: 'Resolved' } })).toBe(0);
    const e = await Escalation.findById(es[0].id); expect(e.resolvedBy.name).toBe(w.owner.user.name); expect(e.openKey).toBeUndefined();
    await api('post', `/brand/escalations/${e.id}/resolve`, w.owner, { resolution: 'Duplicate resolution is refused' }).expect(409);
  });
  it('scopes manual escalation, reassignment and filters; rejects foreign users and unauthorized CCE actions', async () => {
    const w = await world();
    const e = (await api('post', '/brand/escalations', w.owner, { warrantyClaim: w.c.id, reason: 'Repeated unsuccessful customer callbacks' }).expect(201)).body.data;
    await api('post', '/brand/escalations', w.owner, { warrantyClaim: w.c.id, reason: 'Duplicate open manual escalation' }).expect(409);
    await api('patch', `/brand/escalations/${e.id}`, w.owner, { responsibleUserId: String(w.other.user._id) }).expect(400);
    await api('patch', `/brand/escalations/${e.id}`, w.owner, { responsibleUserId: String(w.quality.user._id), note: 'Quality team to investigate' }).expect(200);
    const list = (await api('get', '/brand/escalations?responsible=me&stage=manual&level=1', w.quality).expect(200)).body;
    expect(list.meta.total).toBe(1);
    await api('post', `/brand/escalations/${e.id}/resolve`, w.other, { resolution: 'Foreign brand resolution attempt' }).expect(404);
    await api('post', '/brand/escalations', w.other, { warrantyClaim: w.c.id, reason: 'Foreign ticket' }).expect(404);
    await api('post', '/brand/escalations', w.cce, { warrantyClaim: w.c.id, reason: 'Forbidden action' }).expect(403);
    expect((await api('get', '/brand/escalations', w.other).expect(200)).body.data).toEqual([]);
  });
  it('edits five validated targets and matrix under sla:edit and recalculates priority using the creation snapshot', async () => {
    const w = await world();
    const settings = (await api('get', '/brand/settings/sla', w.owner).expect(200)).body.data;
    expect(settings.responseHours).toBe(2);
    const updated = { ...settings, responseHours: 4, priorityFactor: { Critical: 0.5, High: 0.75, Normal: 1, Low: 2 } };
    await api('put', '/brand/settings/sla', w.cce, updated).expect(403);
    await api('put', '/brand/settings/sla', w.owner, { ...updated, responseHours: 0 }).expect(400);
    await api('put', '/brand/settings/sla', w.owner, updated).expect(200);
    await api('post', `/brand/tickets/${w.c.id}/priority`, w.owner, { priority: 'Low', remarks: 'Lower urgency confirmed' }).expect(200);
    expect((await WarrantyClaim.findById(w.c.id)).sla.hours.response).toBe(4);
    const config = (await api('get', '/brand/settings/escalation-matrix', w.owner).expect(200)).body.data;
    await api('put', '/brand/settings/escalation-matrix', w.cce, config.matrix).expect(403);
    await api('put', '/brand/settings/escalation-matrix', w.owner, { ...config.matrix, warning: { level: 1, role: 'foreign-role' } }).expect(400);
    await api('put', '/brand/settings/escalation-matrix', w.owner, config.matrix).expect(200);
    expect((await Brand.findById(w.lg.id)).warrantySla.responseHours).toBe(4);
  });
  it('computes warning and breached queue states before the sweep, with a countdown and isolated filters', async () => {
    const w = await world();
    await WarrantyClaim.updateOne({ _id: w.c.id }, { $set: { 'sla.responseDueAt': new Date(Date.now() - 60000), 'sla.brandApprovalDueAt': new Date(Date.now() + 24 * HOUR), 'sla.resolutionDueAt': new Date(Date.now() + 168 * HOUR) } });
    const rows = (await api('get', '/brand/tickets?slaState=breached', w.owner).expect(200)).body.data;
    expect(rows).toHaveLength(1); expect(rows[0].sla).toMatchObject({ state: 'breached', nextStage: 'Response' });
    expect(rows[0].sla.remainingMs).toBeLessThan(0);
    expect((await api('get', '/brand/tickets?slaState=breached', w.other).expect(200)).body.data).toEqual([]);
  });
  it('NCC can resolve a mirrored escalation with a recorded resolution and the brand flag follows', async () => {
    const w = await world(); await runSlaSweep({ now: at(2.1) });
    const e = await Escalation.findOne({ warrantyClaim: w.c.id, scope: 'platform' });
    const second = await kit.superAdmin();
    await api('patch', `/super-admin/escalations/${e.id}/assign`, w.admin, { managerId: String(second.user._id) }).expect(200);
    expect(String((await Escalation.findById(e.id)).responsible.user)).toBe(String(second.user._id));
    await api('patch', `/super-admin/escalations/${e.id}/status`, w.admin, { status: 'Resolved' }).expect(400);
    await api('patch', `/super-admin/escalations/${e.id}/status`, w.admin, { status: 'Resolved', resolution: 'NCC contacted brand and confirmed the next action' }).expect(200);
    expect((await WarrantyClaim.findById(w.c.id)).flags.escalated).toBe(false);
    expect((await Escalation.findById(e.id)).resolvedBy.kind).toBe('admin');
  });
  it('upgrades legacy clocks in dry-run/apply mode without moving four existing deadlines; upgrade is idempotent', async () => {
    const w = await world(), original = await WarrantyClaim.findById(w.c.id);
    await WarrantyClaim.updateOne({ _id: w.c.id }, { $unset: { 'sla.version': 1, 'sla.hours.response': 1, 'sla.responseDueAt': 1 } });
    expect(await backfillWarrantySla()).toMatchObject({ matched: 1, updated: 0 });
    expect(await backfillWarrantySla({ dryRun: false })).toMatchObject({ matched: 1, updated: 1 });
    expect(await backfillWarrantySla({ dryRun: false })).toMatchObject({ matched: 0, updated: 0 });
    const c = await WarrantyClaim.findById(w.c.id);
    expect(c.sla.hours.response).toBe(2); expect(c.sla.brandApprovalDueAt).toEqual(original.sla.brandApprovalDueAt);
    expect(c.sla.resolutionDueAt).toEqual(original.sla.resolutionDueAt);
  });

  it('uses custom factors from plain brand objects at intake and rotates active role users across tickets', async () => {
    const w = await world();
    await Brand.updateOne({ _id: w.lg.id }, { $set: { 'warrantySla.responseHours': 4, 'warrantySla.priorityFactor.High': 0.25 } });
    const brand = await Brand.findById(w.lg.id).lean();
    const custom = await kit.createTicketAs(w.owner, kit.ticketInput(w, w.customer, { brand, priority: 'High' }));
    expect(custom.sla.hours.response).toBe(1); expect(custom.sla.hours.approval).toBe(6);
    const secondManager = await kit.brandUser(w.lg, { templates: ['brand_manager'], name: 'Second Manager' });
    const secondTicket = await kit.submitClaim(w, w.customer, { serialNumber: 'ROTATION-11' });
    await WarrantyClaim.updateOne({ _id: secondTicket.id }, { $set: { 'sla.responseDueAt': at(2), 'sla.brandApprovalDueAt': at(24), 'sla.resolutionDueAt': at(168) } });
    await runSlaSweep({ now: at(1.7) });
    const es = await Escalation.find({ scope: 'brand', slaStage: 'response' });
    expect(es).toHaveLength(2);
    expect(new Set(es.map(e => String(e.responsible.user)))).toEqual(new Set([String(w.manager.user._id), String(secondManager.user._id)]));
  });

  it('keeps open escalation priority and due time aligned when ticket priority changes', async () => {
    const w = await world(); await runSlaSweep({ now: at(1.7) });
    const e = await Escalation.findOne({ warrantyClaim: w.c.id, scope: 'brand' });
    expect(e.dueAt).toEqual(at(6));
    await api('post', `/brand/tickets/${w.c.id}/priority`, w.owner, { priority: 'High', remarks: 'Higher urgency after review' }).expect(200);
    const changed = await Escalation.findById(e.id);
    expect(changed.priority).toBe('High'); expect(changed.dueAt).toEqual(at(5.5));
    expect(changed.history.at(-1).action).toBe('priority_changed');
  });

});
