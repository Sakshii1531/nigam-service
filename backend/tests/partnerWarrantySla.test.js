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
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { startSla, applySlaTransition, evaluateSla, openStages } from '../src/modules/partner-warranty/claimSla.js';
import { runSlaSweep } from '../src/modules/partner-warranty/claimSla.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantySla');
const HOUR = 3600 * 1000;
const at = (base, hours) => new Date(new Date(base).getTime() + hours * HOUR);

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310900000 });
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
    [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, ServiceProvider, Job, User, AuditLog, Notification, PlatformSettings].map((m) =>
      m.deleteMany({}),
    ),
  ));

async function scenario() {
  const w = await kit.world();
  const [lg, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.customer(), kit.superAdmin()]);
  const claim = await kit.submitClaim(w, cust);
  return { w, lg, cust, admin, claim, doc: await WarrantyClaim.findById(claim.id) };
}

const noteCount = (user, title) => Notification.countDocuments({ recipient: user._id, title });

describe('Phase 9 — clock rules (pure)', () => {
  const t0 = new Date('2026-10-01T10:00:00Z');
  const hours = { approval: 24, assignment: 4, visit: 48, resolution: 168 };
  const fresh = () => {
    const claim = { status: 'Submitted', sla: {} };
    startSla(claim, hours, t0);
    return claim;
  };

  it('starts approval + resolution at submission', () => {
    const c = fresh();
    expect(c.sla.brandApprovalDueAt).toEqual(at(t0, 24));
    expect(c.sla.resolutionDueAt).toEqual(at(t0, 168));
    expect(openStages(c).map((s) => s.key)).toEqual(['brandApproval', 'resolution']);
  });

  it('warns at 80 % and breaches at 100 %, once each', () => {
    const c = fresh();
    expect(evaluateSla(c, at(t0, 19))).toEqual([]);
    expect(evaluateSla(c, at(t0, 19.3)).map((r) => [r.type, r.stage.key])).toEqual([['warning', 'brandApproval']]);
    c.sla.warnings = ['brandApproval'];
    expect(evaluateSla(c, at(t0, 20))).toEqual([]);
    expect(evaluateSla(c, at(t0, 24)).map((r) => [r.type, r.stage.key])).toEqual([['breach', 'brandApproval']]);
    c.sla.breaches = ['brandApproval'];
    expect(evaluateSla(c, at(t0, 30))).toEqual([]);
  });

  it('pauses while waiting on the customer and shifts the open deadlines on resume', () => {
    const c = fresh();
    applySlaTransition(c, 'Submitted', 'Info Requested', at(t0, 2));
    expect(evaluateSla(c, at(t0, 100))).toEqual([]); // paused
    applySlaTransition(c, 'Info Requested', 'Brand Review', at(t0, 12)); // 10 h paused
    expect(c.sla.pausedAt).toBeNull();
    expect(c.sla.brandApprovalDueAt).toEqual(at(t0, 34));
    expect(c.sla.resolutionDueAt).toEqual(at(t0, 178));
  });

  it('stops approval on the decision and starts assignment and visit on the way', () => {
    const c = fresh();
    applySlaTransition(c, 'Brand Review', 'Approved', at(t0, 5));
    expect(c.sla.met.brandApproval).toEqual(at(t0, 5));
    applySlaTransition(c, 'Approved', 'Job Created', at(t0, 5));
    expect(c.sla.assignmentDueAt).toEqual(at(t0, 9));
    applySlaTransition(c, 'Job Created', 'Partner Assigned', at(t0, 6));
    expect(c.sla.met.assignment).toEqual(at(t0, 6));
    expect(c.sla.visitDueAt).toEqual(at(t0, 54));
    // Skipping straight to "in progress" still stops the visit clock.
    applySlaTransition(c, 'Partner Assigned', 'Service In Progress', at(t0, 30));
    expect(c.sla.met.visit).toEqual(at(t0, 30));
    applySlaTransition(c, 'Service In Progress', 'Service Completed', at(t0, 40));
    expect(openStages(c)).toEqual([]);
  });

  it('a reassignment restarts the assignment clock and clears its old flags', () => {
    const c = fresh();
    applySlaTransition(c, 'Approved', 'Job Created', at(t0, 1));
    c.sla.breaches = ['assignment'];
    applySlaTransition(c, 'Partner Assigned', 'Job Created', at(t0, 20));
    expect(c.sla.assignmentDueAt).toEqual(at(t0, 24));
    expect(c.sla.breaches).toEqual([]);
    expect(c.sla.state).toBe('ok');
  });

  it('a reopen restarts approval and resolution', () => {
    const c = fresh();
    applySlaTransition(c, 'Brand Review', 'Rejected', at(t0, 3));
    applySlaTransition(c, 'Rejected', 'Brand Review', at(t0, 50));
    expect(c.sla.brandApprovalDueAt).toEqual(at(t0, 74));
    expect(c.sla.met.brandApproval).toBeNull();
    expect(c.sla.resolutionDueAt).toEqual(at(t0, 218));
  });
});

describe('Phase 9 — SLA snapshot at submission', () => {
  it('uses the brand\'s own hours, else the platform\'s (editable, merged), else the defaults', async () => {
    const w = await kit.world();
    await Brand.updateOne({ _id: w.lg._id }, { warrantySla: { approvalHours: 12 } });
    const admin = await kit.superAdmin();
    await api().put('/api/v1/super-admin/settings').set(bearer(admin.token)).send({ warrantySla: { visitHours: 10 } }).expect(200);
    const settings = await PlatformSettings.findOne();
    expect(settings.warrantySla.toObject()).toEqual({ approvalHours: 24, assignmentHours: 4, visitHours: 10, resolutionHours: 168 });

    const cust = await kit.customer();
    const claim = await kit.submitClaim(w, cust);
    const doc = await WarrantyClaim.findById(claim.id);
    expect(doc.sla.hours.toObject()).toEqual({ approval: 12, assignment: 4, visit: 10, resolution: 168 });
    expect(doc.sla.state).toBe('ok');
  });
});

describe('Phase 9 — the sweep', () => {
  it('warns the brand and admins at 80 % of the approval window, once', async () => {
    const s = await scenario();
    const r1 = await runSlaSweep({ now: at(s.doc.createdAt, 20) });
    expect(r1).toMatchObject({ warnings: 1, breaches: 0 });
    const r2 = await runSlaSweep({ now: at(s.doc.createdAt, 21) });
    expect(r2).toMatchObject({ warnings: 0, breaches: 0 });

    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.sla.state).toBe('warning');
    expect(saved.timeline.at(-1)).toMatchObject({ action: 'SLA_WARNING', visibility: 'brand' });
    expect(await noteCount(s.lg.user, 'Warranty Claim Awaiting Your Decision')).toBe(1);
    expect(await noteCount(s.admin.user, 'Warranty SLA at 80%')).toBe(1);
  });

  it('a missed approval deadline breaches and escalates — it never auto-approves', async () => {
    const s = await scenario();
    await runSlaSweep({ now: at(s.doc.createdAt, 25) });

    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.status).toBe('Submitted');
    expect(saved.sla.state).toBe('breached');
    expect(saved.flags).toMatchObject({ escalated: true, escalationReason: 'Brand approval SLA breached' });
    expect(saved.timeline.map((e) => e.action)).toEqual(expect.arrayContaining(['SLA_BREACHED', 'ESCALATED']));
    expect(await noteCount(s.lg.user, 'Approval Deadline Missed — Escalated')).toBe(1);
    expect(await noteCount(s.admin.user, 'Warranty SLA Breached')).toBe(1);

    const list = await api().get('/api/v1/super-admin/warranty-claims?slaState=breached').set(bearer(s.admin.token)).expect(200);
    expect(list.body.data.map((c) => c.id)).toEqual([s.claim.id]);
    expect(list.body.data[0].slaState).toBe('breached');
  });

  it('an approved claim\'s assignment clock breaches internally (the brand is not told)', async () => {
    const s = await scenario();
    await api().post(`/api/v1/brand/warranty-claims/${s.claim.id}/approve`).set(bearer(s.lg.token)).send({}).expect(200);
    const approved = await WarrantyClaim.findById(s.claim.id);
    expect(approved.sla.met.brandApproval).toBeInstanceOf(Date);
    expect(approved.sla.assignmentDueAt.getTime() - approved.sla.met.brandApproval.getTime()).toBeCloseTo(4 * HOUR, -3);

    await runSlaSweep({ now: at(approved.sla.assignmentDueAt, 0.1) });
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.sla.breaches).toEqual(['assignment']);
    expect(saved.timeline.at(-1)).toMatchObject({ action: 'SLA_BREACHED', visibility: 'internal' });
    expect(await noteCount(s.lg.user, 'Approval Deadline Missed — Escalated')).toBe(0);
    expect(saved.flags.escalated).toBe(false);
  });

  it('does nothing while the claim waits on the customer', async () => {
    const s = await scenario();
    await api()
      .post(`/api/v1/brand/warranty-claims/${s.claim.id}/request-info`)
      .set(bearer(s.lg.token))
      .send({ message: 'Please send the warranty card' })
      .expect(200);
    const r = await runSlaSweep({ now: at(s.doc.createdAt, 500) });
    expect(r).toMatchObject({ checked: 0, warnings: 0, breaches: 0 });
    expect((await WarrantyClaim.findById(s.claim.id)).sla.pausedAt).toBeInstanceOf(Date);
  });

  it('never shows SLA data to the customer', async () => {
    const s = await scenario();
    await runSlaSweep({ now: at(s.doc.createdAt, 25) });
    const mine = (await api().get(`/api/v1/partner-warranty/claims/${s.claim.id}`).set(bearer(s.cust.token)).expect(200)).body.data;
    const body = JSON.stringify(mine);
    for (const word of ['SLA', 'sla', 'breach', 'escalat']) expect(body).not.toContain(word);
  });
});

describe('Phase 9 — per-brand SLA summary', () => {
  it('reports open / warning / breached and on-time approval rates per brand', async () => {
    const s = await scenario();
    const other = await kit.customer();
    const late = await kit.submitClaim(s.w, other, { serialNumber: 'LATE-1' });
    const samsungClaim = await kit.submitClaim(s.w, other, { brandId: String(s.w.samsung._id), serialNumber: 'SS-1' });

    // LG: one decided on time, one decided late.
    await api().post(`/api/v1/brand/warranty-claims/${s.claim.id}/reject`).set(bearer(s.lg.token)).send({ reason: 'Not covered' }).expect(200);
    await WarrantyClaim.updateOne({ _id: late.id }, { 'sla.brandApprovalDueAt': new Date(Date.now() - HOUR) });
    await api().post(`/api/v1/brand/warranty-claims/${late.id}/reject`).set(bearer(s.lg.token)).send({ reason: 'Not covered' }).expect(200);
    // Samsung: still open and breached.
    await runSlaSweep({ now: at((await WarrantyClaim.findById(samsungClaim.id)).createdAt, 25) });

    const res = await api().get('/api/v1/super-admin/warranty-claims/sla-summary').set(bearer(s.admin.token)).expect(200);
    const byName = Object.fromEntries(res.body.data.map((r) => [r.brand.name, r]));
    expect(byName.Samsung).toMatchObject({ total: 1, open: 1, breached: 1, approval: { decided: 0, onTimePercent: null } });
    expect(byName.LG).toMatchObject({ total: 2, open: 0, breached: 0, approval: { decided: 2, onTimePercent: 50 } });
    expect(byName.LG.approval.avgHours).toBeLessThan(1);
    expect(res.body.data[0].brand.name).toBe('Samsung'); // breached first
  });
});
