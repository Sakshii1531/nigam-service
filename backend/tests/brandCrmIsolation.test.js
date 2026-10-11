import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { auditContext } from '../src/modules/shared/auditContext.js';
import { BRAND_ROUTE_RULES, ruleFor } from '../src/modules/brand-crm/brandAccess.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { BrandInvoice } from '../src/modules/brand-crm/brandInvoice.model.js';
import { BrandPayment } from '../src/modules/brand-crm/brandPayment.model.js';
import { BrandRate } from '../src/modules/brand-crm/brandRate.model.js';
import { WarrantyPolicy } from '../src/modules/brand-crm/warrantyPolicy.model.js';
import { ProductSerial } from '../src/modules/brand-crm/productSerial.model.js';
import { ApiKey } from '../src/modules/brand-crm/apiKey.model.js';
import { PartOrder } from '../src/modules/service-provider/partOrder.model.js';
import { Team } from '../src/modules/brand-admin/team.model.js';
import { BrandSettings } from '../src/modules/brand-admin/brandSettings.model.js';
import { MasterService } from '../src/modules/brand-admin/masterService.model.js';
import { SubBrand } from '../src/modules/brand-admin/subBrand.model.js';
import { BrandProduct } from '../src/modules/brand-admin/brandProduct.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Claim } from '../src/modules/warranty-amc-exchange/claim.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { ExchangeRequest } from '../src/modules/warranty-amc-exchange/exchangeRequest.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { emitToBrand } from '../src/modules/notifications/notification.service.js';
import { SUPER_ADMIN_TEMPLATE } from '../src/modules/brand-crm/permissions.js';

const TEST_DB_URI = testDbUri('brandCrmIsolation');
let app;
let expressApp;
const kit = brandCrmKit(() => app, { phoneStart: 9381800000 });
const { api, bearer } = kit;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  expressApp = createApp();
  app = await listenOnLoopback(expressApp);
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

const get = (user, path) => api().get(`/api/v1${path}`).set(bearer(user.token));

function hasIndex(Model, field) {
  return Model.schema.path(field)?.options?.index === true
    || Model.schema.indexes().some(([keys]) => Object.prototype.hasOwnProperty.call(keys, field));
}

describe('Phase 18 model and query hardening', () => {
  it.each([
    WarrantyClaim, BillingLine, BrandInvoice, BrandPayment, BrandRate,
    WarrantyPolicy, ProductSerial, ApiKey, PartOrder, Team, BrandSettings,
    MasterService, SubBrand, BrandProduct, Role, User, Escalation, AuditLog,
  ])('%s stores its tenant as an indexed ObjectId', (Model) => {
    expect(Model.schema.path('brand')?.instance).toBe('ObjectId');
    expect(hasIndex(Model, 'brand')).toBe(true);
  });

  it.each([Claim, OwnedAppliance, AMCSubscription, ExtendedWarrantyOrder, ExchangeRequest])(
    '%s stores its legacy brand join as an indexed ObjectId',
    (Model) => {
      expect(Model.schema.path('brandRef')?.instance).toBe('ObjectId');
      expect(hasIndex(Model, 'brandRef')).toBe(true);
    },
  );

  it('throws for an unscoped guarded query in a brand request and permits the exact tenant', async () => {
    const brand = new mongoose.Types.ObjectId();
    await expect(auditContext.run({ brandScope: String(brand) }, async () => WarrantyPolicy.find({ isActive: true }).lean()))
      .rejects.toThrow(/requires brand/);
    await expect(auditContext.run({ brandScope: String(brand) }, async () => WarrantyPolicy.find({ brand, isActive: true }).lean()))
      .resolves.toEqual([]);
  });
});

describe('Phase 18 route and data isolation', () => {
  it('classifies every mounted brand route for collection or foreign-resource isolation', () => {
    const mountOf = (layer) => layer.regexp.source.replace(/^\^/, '').replace(/\\\/\?\(\?=\\\/\|\$\)$/i, '').replace(/\\\//g, '/');
    const mounted = [];
    for (const layer of expressApp._router.stack) {
      if (layer.name !== 'router' || !layer.handle?.stack) continue;
      const mount = mountOf(layer);
      if (!mount.startsWith('/api/v1/brand')) continue;
      for (const row of layer.handle.stack) {
        if (!row.route) continue;
        for (const method of Object.keys(row.route.methods)) mounted.push([method.toUpperCase(), `${mount}${row.route.path === '/' ? '' : row.route.path}`]);
      }
    }
    const table = mounted.map(([method, fullPath]) => {
      const path = fullPath.replace('/api/v1/brand', '') || '/';
      return { method, path, rule: ruleFor(method, path), strategy: path.includes(':') ? 'foreign-resource' : 'tenant-collection' };
    });
    expect(table.length).toBeGreaterThan(100);
    expect(table.filter((row) => !row.rule || !row.strategy)).toEqual([]);
    expect(new Set(table.map((row) => `${row.method} ${row.path}`)).size).toBe(table.length);
    expect(BRAND_ROUTE_RULES.length).toBe(table.length);
  });

  it('never returns Samsung ticket or customer data to LG, including crafted brand filters', async () => {
    const w = await kit.world();
    const lgOwner = await kit.brandUser(w.lg, { employeeId: 'LG-OWNER', templates: [SUPER_ADMIN_TEMPLATE] });
    const samsungCce = await kit.brandUser(w.samsung, { employeeId: 'SAM-CCE', templates: ['cce'] });
    const samsungCustomer = await kit.customer();
    const samsungTicket = await kit.createTicketAs(samsungCce, kit.ticketInput(w, samsungCustomer, { brand: w.samsung.toObject() }));

    await get(lgOwner, `/brand/tickets/${samsungTicket.id}`).expect(404);
    await get(lgOwner, `/brand/warranty-claims/${samsungTicket.id}`).expect(404);
    await get(lgOwner, `/brand/customers/${samsungCustomer.user.id}`).expect(404);

    const queue = await get(lgOwner, `/brand/tickets?brand=${w.samsung.id}&q=${encodeURIComponent(samsungTicket.humanId)}`).expect(200);
    expect(JSON.stringify(queue.body.data)).not.toContain(samsungTicket.humanId);
    const dashboard = await get(lgOwner, `/brand/dashboard?brand=${w.samsung.id}`).expect(400);
    expect(JSON.stringify(dashboard.body)).not.toContain(samsungTicket.humanId);
  });

  it('fans out only to active users of the ObjectId tenant who hold the event permission', async () => {
    const w = await kit.world();
    const viewer = await kit.brandUser(w.lg, { employeeId: 'LG-VIEW', templates: ['viewer'] });
    const unprivileged = await kit.brandUser(w.lg, { employeeId: 'LG-NONE', templates: [] });
    const other = await kit.brandUser(w.samsung, { employeeId: 'SAM-VIEW', templates: ['viewer'] });

    expect(await emitToBrand('warranty.new_claim_brand', w.lg._id, { humanId: 'ISO-1', productName: 'AC', issueName: 'Cooling' })).toBe(1);
    expect(await Notification.countDocuments({ recipient: viewer.user._id })).toBe(1);
    expect(await Notification.countDocuments({ recipient: unprivileged.user._id })).toBe(0);
    expect(await Notification.countDocuments({ recipient: other.user._id })).toBe(0);
    expect(await emitToBrand('warranty.new_claim_brand', 'LG', {})).toBe(0);
  });
});

describe('Phase 18 brand readiness', () => {
  it('reports missing configuration, then becomes ready after every item is configured', async () => {
    const w = await kit.world();
    const admin = await kit.superAdmin();
    await kit.brandUser(w.lg, { employeeId: 'LG-OWNER', templates: [SUPER_ADMIN_TEMPLATE] });

    const initial = await get(admin, `/super-admin/brands/${w.lg.id}/readiness`).expect(200);
    expect(initial.body.data.ready).toBe(false);
    expect(initial.body.data.missing).toEqual(expect.arrayContaining(['rates', 'billingProfile']));

    await Brand.updateOne({ _id: w.lg._id }, { $set: { 'billing.gstin': '23AAAAA0000A1Z5', warrantyEnabled: true } });
    await BrandRate.create({
      brand: w.lg._id, category: w.ac._id, categoryKey: w.ac.key, serviceType: 'repair',
      brandRate: 900, partnerPayout: 600, effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    const ready = await get(admin, `/super-admin/brands/${w.lg.id}/readiness`).expect(200);
    expect(ready.body.data.ready).toBe(true);
    expect(ready.body.data.missing).toEqual([]);
  });

  it('runs a differently configured third brand end to end without exposing its ticket', async () => {
    const w = await kit.world();
    const voltas = await Brand.create({
      name: 'Voltas Isolation', status: 'Active', warrantyEnabled: true, coverage: [w.ac._id],
      warrantySla: { responseHours: 3, approvalHours: 9, assignmentHours: 5, visitHours: 30, resolutionHours: 96 },
      billing: { gstin: '23BBBBB0000B1Z6', legalName: 'Voltas Isolation Ltd' },
    });
    await WarrantyPolicy.create({
      brand: voltas._id, policyKey: new mongoose.Types.ObjectId(), name: 'Voltas 18 month AC',
      warrantyMonths: 18, requireInvoice: false, requireSerial: true,
      appliesTo: { category: w.ac._id },
      coverage: { coveredServices: ['repair'], partsCovered: true, labourCovered: true },
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    await BrandRate.create({
      brand: voltas._id, category: w.ac._id, categoryKey: w.ac.key, serviceType: 'repair',
      brandRate: 1100, partnerPayout: 720, effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    });
    const voltasOwner = await kit.brandUser(voltas, { employeeId: 'VOLTAS-OWNER', templates: [SUPER_ADMIN_TEMPLATE] });
    const lgOwner = await kit.brandUser(w.lg, { employeeId: 'LG-OWNER', templates: [SUPER_ADMIN_TEMPLATE] });
    const customer = await kit.customer();
    const ticket = await kit.createTicketAs(
      voltasOwner,
      kit.ticketInput(w, customer, { brand: voltas.toObject(), serialNumber: 'VOLTAS-ISO-18' }),
    );

    expect(ticket.brandTicketNo).toMatch(/^VOLT/);
    await get(voltasOwner, `/brand/tickets/${ticket.id}`).expect(200);
    await get(lgOwner, `/brand/tickets/${ticket.id}`).expect(404);
    const admin = await kit.superAdmin();
    const readiness = await get(admin, `/super-admin/brands/${voltas.id}/readiness`).expect(200);
    expect(readiness.body.data).toMatchObject({ ready: true, missing: [] });
  });
});
