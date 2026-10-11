import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { BrandInvoice } from '../src/modules/brand-crm/brandInvoice.model.js';
import { PartOrder } from '../src/modules/service-provider/partOrder.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { getBrandDashboard } from '../src/modules/brand-crm/brandDashboard.service.js';
import { issueInvoice, recordPayment } from '../src/modules/brand-crm/billing.service.js';
import { emitClaimUpdated } from '../src/modules/partner-warranty/claimTimeline.js';
import { setIO } from '../src/sockets/io.js';
import { updateBrandEscalation, createBrandEscalation } from '../src/modules/brand-admin/brandEscalation.service.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
let server;
const kit = brandCrmKit(() => server, {
  phoneStart: 9371510000
});
const id = () => new mongoose.Types.ObjectId();
const from = new Date('2026-08-08'),
  to = new Date('2026-08-15'),
  now = new Date('2026-08-14T12:00:00Z');
const previous = new Date('2026-08-03');
const permissions = new Set(['dashboard:view', 'tickets:view', 'billing:view', 'parts:view', 'escalations:view']);
const user = w => ({
  id: w.owner.user.id,
  brand: w.lg._id,
  permissions: [...permissions]
});
const dashboard = w => getBrandDashboard(user(w), {
  from,
  to
}, {
  now,
  permissions
});
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmDashboard'));
  await registerAllModels();
  await ensureIndexes();
  server = await listenOnLoopback(createApp());
});
afterAll(async () => {
  await awaitPendingDeliveries();
  await closeServer(server);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await awaitPendingDeliveries();
  invalidateBrandPermissions();
  await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({})));
});
afterEach(() => setIO(null));
async function fixture() {
  const w = await kit.world();
  w.owner = await kit.brandAdmin(w.lg);
  const tickets = [];
  for (let i = 0; i < 8; i++) tickets.push({
    _id: id(),
    brand: w.lg._id,
    customer: id(),
    createdAt: new Date('2026-08-10'),
    categoryKey: i === 7 ? 'Refrigerator' : 'AC',
    source: i % 2 ? 'ncc_app' : 'toll_free',
    status: ['Submitted', 'Brand Review', 'Approved', 'Partner Assigned', 'Service In Progress', 'Service Completed', 'Closed', 'Submitted'][i],
    jobStage: [null, null, 'PARTNER_FINDING', 'PARTNER_ASSIGNED', 'REPAIR', 'COMPLETED', 'CLOSED', null][i],
    address: {
      state: i === 7 ? 'MP' : 'Maharashtra',
      city: 'Pune'
    },
    productName: 'Test AC',
    timeline: i === 2 ? [{
      action: 'CLAIM_APPROVED',
      at: new Date('2026-08-11')
    }] : [],
    sla: {
      hours: {
        response: 2
      },
      met: {},
      breaches: []
    },
    warranty: {
      status: 'In Warranty'
    },
    contactRequests: [],
    callbacks: []
  });
  tickets[1].contactRequests = [{
    status: 'open',
    reason: 'Call'
  }]; // Not pending approval.
  tickets[0].assignedCce = {
    user: w.owner.user._id
  };
  tickets[4].sla.breaches = ['response'];
  tickets[7].sla.responseDueAt = new Date(+now + 600000);
  tickets[6].closedAt = new Date('2026-08-13');
  await WarrantyClaim.collection.insertMany([...tickets, {
    ...tickets[0],
    _id: id(),
    createdAt: previous
  }, {
    ...tickets[2],
    _id: id(),
    createdAt: previous,
    timeline: [{
      action: 'CLAIM_APPROVED',
      at: previous
    }]
  }, {
    ...tickets[4],
    _id: id(),
    brand: w.samsung._id
  }]);
  await Escalation.collection.insertMany([{
    _id: id(),
    brand: w.lg._id,
    scope: 'brand',
    status: 'Open',
    createdAt: new Date('2026-08-11'),
    warrantyClaim: tickets[4]._id
  }, {
    _id: id(),
    brand: w.samsung._id,
    scope: 'brand',
    status: 'Open',
    createdAt: from
  }, {
    _id: id(),
    brand: w.lg._id,
    scope: 'platform',
    status: 'Open',
    createdAt: from
  }]);
  await PartOrder.collection.insertMany([{
    _id: id(),
    brand: w.lg._id,
    warrantyClaim: tickets[0]._id,
    status: 'Pending',
    approval: {
      required: ['brand'],
      brand: {
        status: 'Pending'
      }
    }
  }, {
    _id: id(),
    brand: w.lg._id,
    warrantyClaim: tickets[0]._id,
    status: 'Dispatched'
  }, {
    _id: id(),
    brand: w.lg._id,
    warrantyClaim: tickets[0]._id,
    status: 'Installed',
    installedAt: new Date('2026-08-12')
  }, {
    _id: id(),
    brand: w.samsung._id,
    warrantyClaim: id(),
    status: 'Dispatched'
  }]);
  await BillingLine.collection.insertMany([{
    _id: id(),
    brand: w.lg._id,
    status: 'billable',
    total: 118,
    completedAt: new Date('2026-08-12')
  }, {
    _id: id(),
    brand: w.samsung._id,
    status: 'billable',
    total: 9999,
    completedAt: from
  }]);
  const invoice = (brand, issuedAt, total, paidAmount) => ({
    _id: id(),
    brand,
    issuedAt,
    total,
    subtotal: total,
    gstAmount: 0,
    paidAmount,
    status: 'issued',
    dueDate: new Date('2026-08-12'),
    periodFrom: from,
    periodTo: to,
    createdAt: previous,
    lineSnapshots: [],
    lines: []
  });
  await BrandInvoice.collection.insertMany([invoice(w.lg._id, new Date('2026-08-12'), 1000, 250), invoice(w.lg._id, previous, 500, 500), invoice(w.samsung._id, from, 9999, 0)]);
  return {
    ...w,
    tickets
  };
}
const api = (w, path = '/brand/dashboard?from=2026-08-08&to=2026-08-15') => kit.api().get('/api/v1' + path).set(kit.bearer(w.owner.token));
it('returns exact KPIs, previous comparisons, real distributions, parts, billing and own queues', async () => {
  const w = await fixture(),
    d = await dashboard(w);
  expect(Object.fromEntries(Object.entries(d.kpis).map(([k, v]) => [k, v.value]))).toEqual({
    total: 8,
    pendingApproval: 2,
    approved: 1,
    assigned: 1,
    inProgress: 1,
    completed: 2,
    escalated: 1,
    slaBreached: 1,
    totalBilling: 1000,
    pendingPayment: 750,
    unbilled: 118
  });
  expect(d.kpis.total).toMatchObject({
    previous: 2,
    deltaPct: 300
  });
  expect(d.kpis.totalBilling).toMatchObject({
    previous: 500,
    deltaPct: 100
  });
  expect(d.kpis.assigned.deltaPct).toBeNull();
  expect(d.slaSnapshot).toEqual({
    onTrack: 5,
    warning: 1,
    breached: 1
  });
  expect(d.parts).toEqual({
    awaitingApproval: 1,
    inTransit: 1,
    installed: 1
  });
  expect(d.billing.pending).toBe(750);
  expect(d.queues.assigned).toBe(2);
  expect(d.bySource).toEqual([{
    name: 'ncc_app',
    value: 4
  }, {
    name: 'toll_free',
    value: 4
  }]);
  expect(d.byProduct[0]).toMatchObject({
    name: 'AC',
    value: 7,
    pct: 87.5
  });
  expect(d.byState[0]).toMatchObject({
    name: 'Maharashtra',
    value: 7
  });
  expect(d.trend).toHaveLength(7);
  expect(d.trend.reduce((a, r) => a + r.created, 0)).toBe(8);
  expect(d.trend.reduce((a, r) => a + r.closed, 0)).toBe(1);
});
it('permission-trims financial payload and queues on the server', async () => {
  const w = await fixture();
  const cce = await kit.brandUser(w.lg, {
    templates: ['cce']
  });
  const r = await kit.api().get('/api/v1/brand/dashboard?from=2026-08-08&to=2026-08-15').set(kit.bearer(cce.token)).expect(200);
  expect(r.body.data.kpis.total.value).toBe(8);
  expect(r.body.data.billing).toBeUndefined();
  for (const key of ['totalBilling', 'pendingPayment', 'unbilled']) expect(r.body.data.kpis[key]).toBeUndefined();
  const restricted = await getBrandDashboard(user(w), {
    from,
    to
  }, {
    now,
    permissions: new Set(['dashboard:view'])
  });
  expect(restricted.queues).toBeUndefined();
  expect(restricted.parts).toBeUndefined();
  expect(restricted.recent).toBeUndefined();
  expect(restricted.kpis.total.link).toBeNull();
});
it('drill-down queue filters exactly match dashboard stage and approval counts', async () => {
  const w = await fixture(),
    d = await dashboard(w);
  for (const key of ['total', 'pendingApproval', 'approved', 'assigned', 'inProgress', 'completed']) {
    const path = d.kpis[key].link.replace('/brand-admin/tickets', '/api/v1/brand/tickets');
    const r = await kit.api().get(path).set(kit.bearer(w.owner.token)).expect(200);
    expect(r.body.meta.total).toBe(d.kpis[key].value);
  }
  const live = await getBrandDashboard(user(w), {from,to}, {permissions});
  const slaPath = live.kpis.slaBreached.link.replace('/brand-admin/tickets','/api/v1/brand/tickets');
  const slaRows = await kit.api().get(slaPath).set(kit.bearer(w.owner.token)).expect(200);
  expect(slaRows.body.meta.total).toBe(live.kpis.slaBreached.value);
  const billingPath = d.kpis.totalBilling.link.replace('/brand-admin/invoices', '/api/v1/brand/billing/invoices');
  const invoices = await kit.api().get(billingPath.replace('tab=invoices&', '')).set(kit.bearer(w.owner.token)).expect(200);
  expect(invoices.body.data).toHaveLength(1);
  expect(invoices.body.data[0].total).toBe(1000);
  await BrandInvoice.create({brand:w.lg._id,periodFrom:from,periodTo:to,subtotal:100,gstAmount:0,total:100,paidAmount:100,status:'paid',issuedAt:new Date('2026-08-12'),dueDate:to});
  const pendingPath=d.kpis.pendingPayment.link.replace('/brand-admin/invoices','/api/v1/brand/billing/invoices').replace('tab=invoices&','');
  const pending=await kit.api().get(pendingPath).set(kit.bearer(w.owner.token)).expect(200);
  expect(pending.body.data).toHaveLength(1);expect(pending.body.data[0].balance).toBe(750);
  await Escalation.collection.insertOne({_id:id(),brand:w.lg._id,scope:'brand',status:'Open',createdAt:previous,warrantyClaim:w.tickets[0]._id});
  const escalations=await kit.api().get(d.kpis.escalated.link.replace('/brand-admin/escalations','/api/v1/brand/escalations')).set(kit.bearer(w.owner.token)).expect(200);
  expect(escalations.body.meta.total).toBe(1);

});
it('dates are exclusive, approvals use event dates, and long trends use Monday weeks', async () => {
  const w = await fixture();
  await WarrantyClaim.collection.insertOne({
    ...w.tickets[2],
    _id: id(),
    createdAt: previous,
    timeline: [{
      action: 'CLAIM_APPROVED',
      at: new Date('2026-08-09')
    }]
  });
  await WarrantyClaim.collection.insertOne({
    ...w.tickets[0],
    _id: id(),
    createdAt: to
  });
  const d = await dashboard(w);
  expect(d.kpis.total.value).toBe(8);
  expect(d.kpis.approved.value).toBe(2);
  const weekly = await getBrandDashboard(user(w), {
    from: '2026-07-01',
    to: '2026-09-01'
  }, {
    now,
    permissions
  });
  expect(weekly.period.unit).toBe('week');
  expect(weekly.trend.every(r => new Date(r.date).getUTCDay() === 1)).toBe(true);
  expect(weekly.trend.reduce((sum, r) => sum + r.created, 0)).toBe(12);
});
it('tenant isolation, empty data, validation and unprivileged access', async () => {
  const w = await fixture();
  await api(w).expect(200);
  await api(w, '/brand/dashboard?from=bad').expect(400);
  await api(w, '/brand/dashboard?from=2026-09-01&to=2026-08-01').expect(400);
  await api(w, '/brand/dashboard?from=2020-01-01&to=2026-01-01').expect(400);
  await api(w, '/brand/dashboard?brand=other').expect(400);
  const empty = {
    lg: {
      _id: id()
    }
  };
  const d = await getBrandDashboard({
    ...user(w),
    brand: empty.lg._id
  }, {
    from,
    to
  }, {
    now,
    permissions
  });
  expect(d.kpis.total.value).toBe(0);
  expect(d.byProduct).toEqual([]);
  expect(d.trend.every(r => r.created === 0 && r.closed === 0)).toBe(true);
  const denied = await kit.brandUser(w.lg);
  await kit.api().get('/api/v1/brand/dashboard').set(kit.bearer(denied.token)).expect(403);
  await kit.api().get('/api/v1/brand/dashboard').expect(401);
});
it('paused clocks do not accrue new breaches and historical breach facts remain visible', async () => {
  const w = await fixture();
  await WarrantyClaim.collection.updateOne({
    _id: w.tickets[7]._id
  }, {
    $set: {
      'sla.responseDueAt': new Date('2026-08-01'),
      'sla.pausedAt': new Date('2026-08-01')
    }
  });
  const d = await dashboard(w);
  expect(d.slaSnapshot).toEqual({
    onTrack: 6,
    warning: 0,
    breached: 1
  });
});
it('claim and escalation invalidations are sent only to the owning brand', async () => {
  const w = await fixture();
  const pushes = [];
  setIO({
    to: room => ({
      emit: (event, payload) => pushes.push({
        room,
        event,
        payload
      })
    })
  });
  const brand = id();
  emitClaimUpdated({
    _id: id(),
    brand,
    customer: id(),
    status: 'Approved'
  }, [{
    action: 'CLAIM_APPROVED',
    visibility: 'brand'
  }]);
  expect(pushes.filter(p => p.event === 'claim:updated')).toHaveLength(1);
  expect(pushes.find(p => p.event === 'claim:updated').room).toBe(`brand:${brand}`);
  emitClaimUpdated({
    _id: id(),
    brand,
    status: 'Approved'
  }, [{
    action: 'ESCALATION_RAISED',
    visibility: 'brand'
  }]);
  expect(pushes.find(p => p.event === 'brand:escalation_updated').room).toBe(`brand:${brand}`);
  pushes.length = 0;
  const escalation = await Escalation.findOne({ brand: w.lg._id, scope: 'brand' });
  await updateBrandEscalation(w.lg._id, escalation._id, { status: 'Under Review' }, w.owner.user.id);
  expect(pushes).toEqual([{ room: `brand:${w.lg._id}`, event: 'brand:escalation_updated', payload: { id: String(escalation._id) } }]);
  pushes.length = 0;
  await expect(updateBrandEscalation(w.samsung._id, escalation._id, { status: 'Open' }, w.owner.user.id)).rejects.toThrow('Escalation not found');
  expect(pushes).toEqual([]);
  const serviceRequest = id();
  await ServiceRequest.collection.insertOne({ _id: serviceRequest, brand: w.lg._id });
  const legacy = await createBrandEscalation(w.lg._id, { serviceRequest, reason: 'Legacy escalation refresh' }, w.owner.user.id);
  expect(pushes.filter(p => p.event === 'brand:escalation_updated')).toEqual([{ room: `brand:${w.lg._id}`, event: 'brand:escalation_updated', payload: { id: String(legacy._id) } }]);
});
it('billing invalidations follow committed writes and are absent on rejected writes', async () => {
  const w = await fixture(),
    pushes = [];
  setIO({
    to: room => ({
      emit: (event, payload) => pushes.push({
        room,
        event,
        payload
      })
    })
  });
  const inv = await BrandInvoice.create({
    brand: w.lg._id,
    periodFrom: from,
    periodTo: to,
    subtotal: 100,
    gstAmount: 0,
    total: 100,
    status: 'draft'
  });
  await issueInvoice(inv.id, undefined, {
    now
  });
  expect(pushes).toEqual([{
    room: `brand:${w.lg._id}`,
    event: 'brand:billing_updated',
    payload: {
      brand: String(w.lg._id)
    }
  }]);
  await expect(issueInvoice(inv.id, undefined, {
    now
  })).rejects.toThrow('Only a draft');
  expect(pushes).toHaveLength(1);
  await recordPayment(inv.id, {
    amount: 20,
    reference: 'DASH-PAY',
    mode: 'bank_transfer'
  }, undefined, {
    now
  });
  expect(pushes).toHaveLength(2);
  const rollback = await BrandInvoice.create({brand:w.lg._id,periodFrom:from,periodTo:to,subtotal:50,gstAmount:0,total:50,status:'draft'});
  const spy=jest.spyOn(AuditLog,'create').mockRejectedValue(new Error('Audit failure'));
  try { await expect(issueInvoice(rollback.id,undefined,{now})).rejects.toThrow('Audit failure'); }
  finally {spy.mockRestore();}
  expect((await BrandInvoice.findById(rollback.id)).status).toBe('draft');expect(pushes).toHaveLength(2);

});
