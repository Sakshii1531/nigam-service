import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { fulfillWarrantyParts } from './helpers/warrantyParts.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { BrandRate } from '../src/modules/brand-crm/brandRate.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { BrandInvoice } from '../src/modules/brand-crm/brandInvoice.model.js';
import { BrandPayment } from '../src/modules/brand-crm/brandPayment.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { ApiKey } from '../src/modules/brand-crm/apiKey.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { runSlaSweep } from '../src/modules/partner-warranty/claimSla.service.js';
import * as billing from '../src/modules/brand-crm/billing.service.js';

let server;
const kit = brandCrmKit(() => server, { phoneStart: 9381900000 });
const api = (method, path, user, body = {}) => kit.api()[method](`/api/v1${path}`).set(kit.bearer(user.token)).send(body);

beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmJourney'));
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
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
});

async function baseWorld() {
  const world = await kit.world();
  return {
    ...world,
    owner: await kit.brandAdmin(world.lg),
    samsungOwner: await kit.brandAdmin(world.samsung),
    admin: await kit.superAdmin(),
    customer: await kit.customer()
  };
}

async function acceptedJob(world, claim) {
  const partner = await kit.flow.partner(['AC'], 'Acceptance Partner');
  await ServiceProvider.updateOne({ _id: partner.serviceProvider._id }, {
    serviceCityName: 'Indore',
    availability: 'Available',
    authorizedBrands: [world.lg._id],
    servicePincodes: ['452001'],
    location: { latitude: 22.72, longitude: 75.86 }
  });
  await api('post', `/brand/tickets/${claim.id}/approve`, world.owner, {
    coverageDecision: 'warranty',
    remarks: 'Covered by the active policy'
  }).expect(200);
  const saved = await WarrantyClaim.findById(claim.id);
  const job = (await api('post', `/service-provider/jobs/accept/${saved.serviceRequest}`, partner).expect(200)).body.data;
  return { partner, job };
}

describe('Phase 19 client acceptance journeys', () => {
  it('1. NCC App completes approval, partner, parts, closure, exact billing, invoice and payment with every view in sync', async () => {
    const world = await baseWorld();
    await City.create({ name: 'Indore', state: 'MP', status: 'Active' });
    await BrandRate.create({
      brand: world.lg._id,
      category: world.ac._id,
      serviceType: 'repair',
      state: 'MP',
      city: 'Indore',
      brandRate: 600,
      partnerPayout: 450,
      effectiveFrom: new Date('2026-01-01')
    });
    const video = await kit.upload(world.customer.token, 'visit-video.pdf');
    const claim = await kit.submitClaim(world, world.customer, {
      preferredVisit: { date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), slot: 'afternoon' },
      documents: [
        { kind: 'invoice', url: video, name: 'invoice.pdf' },
        { kind: 'video', url: '/uploads/acceptance-video.mp4', name: 'acceptance-video.mp4' }
      ]
    });
    const { partner, job } = await acceptedJob(world, claim);
    for (const step of ['start-travel', 'arrive']) await api('post', `/service-provider/jobs/${job.id}/${step}`, partner).expect(200);
    await api('post', `/service-provider/jobs/${job.id}/diagnosis`, partner, { notes: 'Fan motor failed' }).expect(200);
    await api('post', `/service-provider/jobs/${job.id}/spare-parts`, partner, {
      parts: [{ name: 'Fan Motor', sku: 'FM-19', price: 120, qty: 1, checked: true }]
    }).expect(200);
    await fulfillWarrantyParts(kit, {
      jobId: job.id,
      claimId: claim.id,
      partner,
      brand: world.owner,
      admin: world.admin,
      customer: world.customer
    });
    await api('post', `/service-provider/jobs/${job.id}/repair-complete`, partner).expect(200);
    await api('post', `/service-provider/jobs/${job.id}/billing`, partner).expect(200);
    const tracked = (await api('get', `/partner-warranty/claims/${claim.id}/track`, world.customer).expect(200)).body.data;
    await api('post', `/service-provider/jobs/${job.id}/collect-payment`, partner, { paymentMethod: 'Cash', otp: tracked.completionOtp }).expect(200);
    await api('post', `/partner-warranty/claims/${claim.id}/confirm`, world.customer).expect(200);

    const [customerView, brandView, adminView] = await Promise.all([
      api('get', `/partner-warranty/claims/${claim.id}`, world.customer).expect(200),
      api('get', `/brand/tickets/${claim.id}`, world.owner).expect(200),
      api('get', `/super-admin/warranty-claims/${claim.id}`, world.admin).expect(200)
    ]);
    expect([customerView.body.data.status, brandView.body.data.ticket.status, adminView.body.data.status]).toEqual(['Closed', 'Closed', 'Closed']);
    expect(brandView.body.data.parts[0]).toMatchObject({ status: 'Installed', partNumber: 'FM-19' });

    const line = await BillingLine.findOne({ brand: world.lg._id, ticket: claim.id });
    expect(line).toMatchObject({ status: 'billable', subtotal: 720, gstPercent: 18, gstAmount: 129.6, total: 849.6 });
    const closedAt = new Date(line.closedAt);
    const invoice = await billing.draftInvoice(world.lg._id, {
      periodFrom: new Date(closedAt.getTime() - 86400000),
      periodTo: new Date(closedAt.getTime() + 86400000)
    });
    await billing.issueInvoice(invoice._id);
    await billing.recordPayment(invoice._id, { amount: 100, mode: 'bank_transfer', reference: 'PHASE19-UTR' });
    expect(await BrandInvoice.findById(invoice._id)).toMatchObject({ status: 'partially_paid', total: 849.6, paidAmount: 100 });
    expect(await BrandPayment.countDocuments({ brand: world.lg._id, invoice: invoice._id })).toBe(1);

    const saved = await WarrantyClaim.findById(claim.id);
    const actions = saved.timeline.map(row => row.action);
    for (const action of ['CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'JOB_CREATED', 'PARTNER_ASSIGNED', 'PART_REQUESTED', 'PART_DISPATCHED', 'PART_INSTALLED', 'JOB_COMPLETED', 'CUSTOMER_CONFIRMED']) {
      expect(actions.indexOf(action)).toBeGreaterThan(-1);
    }
    expect(actions.indexOf('CLAIM_SUBMITTED')).toBeLessThan(actions.indexOf('CLAIM_APPROVED'));
    expect(actions.indexOf('PART_REQUESTED')).toBeLessThan(actions.indexOf('PART_INSTALLED'));
    expect(saved.sla.state).toBe('ok');
    expect(await AuditLog.countDocuments({ brand: world.lg._id, entityId: saved._id })).toBeGreaterThanOrEqual(5);
  });

  it('2. Toll-Free creates a new customer once and stamps source, CCE and employee ID', async () => {
    const world = await baseWorld();
    const cce = await kit.brandUser(world.lg, { templates: ['cce'], employeeId: 'CCE-019', name: 'Acceptance CCE' });
    const phone = '9381900999';
    const body = {
      newCustomer: { name: 'Toll Free Customer', phone },
      source: 'toll_free',
      categoryId: world.ac.id,
      issueId: world.cooling.id,
      remarks: 'Not cooling on a toll-free call',
      address: { house: '19 Acceptance Road', city: 'Indore', state: 'MP', pincode: '452001' },
      product: {}
    };
    const created = (await api('post', '/brand/tickets', cce, body).expect(201)).body.data;
    const claim = await WarrantyClaim.findById(created.id);
    expect(claim).toMatchObject({ source: 'toll_free', status: 'Submitted' });
    expect(claim.registeredBy).toMatchObject({ name: 'Acceptance CCE', employeeId: 'CCE-019' });
    expect(claim.assignedCce).toMatchObject({ employeeId: 'CCE-019' });
    await api('post', '/brand/tickets', cce, { ...body, remarks: 'A second complaint for the same customer' }).expect(409);
    expect(await User.countDocuments({ role: 'customer', phone })).toBe(1);
    const search = (await api('get', `/brand/customers/search?phone=${phone}`, cce).expect(200)).body.data;
    expect(search.match).toBe('brand');
  });

  it('3. WhatsApp intake replay returns one pending ticket with photos in the brand queue', async () => {
    const world = await baseWorld();
    const key = (await api('post', '/brand/api-keys', world.owner, {
      name: 'Phase 19 WhatsApp',
      scopes: ['catalog:read', 'uploads:create', 'tickets:create', 'tickets:read'],
      allowedSources: ['whatsapp']
    }).expect(201)).body.data;
    const body = {
      brandId: world.lg.id,
      categoryId: world.ac.id,
      issueId: world.cooling.id,
      source: 'whatsapp',
      customer: { name: 'WhatsApp Acceptance', phone: '9381900888' },
      remarks: 'Warm air reported in WhatsApp',
      address: { house: '19 Bot Street', city: 'Indore', state: 'MP', pincode: '452001' },
      documents: [{ kind: 'product_photo', url: 'https://example.com/ac.jpg' }]
    };
    const post = () => kit.api().post('/api/v1/intake/tickets').set(kit.bearer(key.secret)).set('Idempotency-Key', 'phase-19-message').send(body);
    const first = await post().expect(201);
    const replay = await post().expect(200);
    expect(replay.body.data).toEqual(first.body.data);
    expect(await WarrantyClaim.countDocuments({ source: 'whatsapp' })).toBe(1);
    const queue = (await api('get', '/brand/tickets?source=whatsapp', world.owner).expect(200)).body.data;
    expect(queue.map(row => row.humanId)).toContain(first.body.data.ticketNo);
    expect(await ApiKey.findById(key.id)).toMatchObject({ name: 'Phase 19 WhatsApp' });
  });

  it('4. CCE is denied finance, rates, users, settings and approval while Warranty Executive can approve', async () => {
    const world = await baseWorld();
    const cce = await kit.brandUser(world.lg, { templates: ['cce'], employeeId: 'CCE-DENIED' });
    const warranty = await kit.brandUser(world.lg, { templates: ['warranty_executive'], employeeId: 'WAR-019' });
    const claim = await kit.submitClaim(world, world.customer);
    await api('get', '/brand/rates', cce).expect(403);
    await api('get', '/brand/billing/invoices', cce).expect(403);
    await api('get', '/brand/users', cce).expect(403);
    await api('put', '/brand/settings', cce, { website: 'https://denied.example' }).expect(403);
    await api('post', `/brand/tickets/${claim.id}/approve`, cce, { coverageDecision: 'warranty', remarks: 'Should fail' }).expect(403);
    await api('post', `/brand/tickets/${claim.id}/approve`, warranty, { coverageDecision: 'warranty', remarks: 'Warranty verified' }).expect(200);
  });

  it('5. SLA breach escalates L1 to Brand Manager and L2 to Quality, requires resolution notes and is audited', async () => {
    const world = await baseWorld();
    const manager = await kit.brandUser(world.lg, { templates: ['brand_manager'], employeeId: 'MGR-019' });
    const quality = await kit.brandUser(world.lg, { templates: ['quality_escalation'], employeeId: 'QA-019' });
    const claim = await kit.submitClaim(world, world.customer);
    const now = new Date();
    await WarrantyClaim.updateOne({ _id: claim.id }, { $set: {
      'sla.responseDueAt': new Date(now.getTime() - 120000),
      'sla.brandApprovalDueAt': new Date(now.getTime() + 86400000),
      'sla.resolutionDueAt': new Date(now.getTime() + 604800000)
    } });
    await runSlaSweep({ now });
    const rows = await Escalation.find({ warrantyClaim: claim.id, scope: 'brand' }).sort({ level: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ level: 2, status: 'Open' });
    expect(String(rows[0].responsible.user)).toBe(String(quality.user._id));
    await api('post', `/brand/escalations/${rows[0].id}/resolve`, manager, { resolution: 'short' }).expect(400);
    await api('post', `/brand/escalations/${rows[0].id}/resolve`, quality, { resolution: 'Customer contacted and approval owner assigned' }).expect(200);
    expect(await AuditLog.exists({ brand: world.lg._id, entityId: rows[0]._id, action: 'escalation.resolved' })).toBeTruthy();
  });

  it('6. Samsung cannot read LG tickets, customers, invoices, reports, audits or users', async () => {
    const world = await baseWorld();
    const claim = await kit.submitClaim(world, world.customer);
    await api('get', `/brand/tickets/${claim.id}`, world.samsungOwner).expect(404);
    await api('get', `/brand/customers/${world.customer.user.id}`, world.samsungOwner).expect(404);
    expect((await api('get', '/brand/tickets', world.samsungOwner).expect(200)).body.data).toEqual([]);
    expect((await api('get', '/brand/reports/state-city-billing', world.samsungOwner).expect(200)).body.data.rows).toEqual([]);
    const audits = (await api('get', '/brand/audit-logs', world.samsungOwner).expect(200)).body.data;
    expect(JSON.stringify(audits)).not.toContain(claim.id);
    expect(JSON.stringify(audits)).not.toContain(world.owner.user.email);
    const users = (await api('get', '/brand/users', world.samsungOwner).expect(200)).body.data;
    expect(JSON.stringify(users)).not.toContain(world.owner.user.email);
    expect(await BillingLine.countDocuments({ brand: world.samsung._id, ticket: claim.id })).toBe(0);
    expect(await ServiceRequest.countDocuments({ brand: world.samsung._id, warrantyClaim: claim.id })).toBe(0);
  });
});
