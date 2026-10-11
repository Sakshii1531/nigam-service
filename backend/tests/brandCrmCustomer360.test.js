import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { User } from '../src/modules/auth/user.model.js';
import { BrandCustomer } from '../src/modules/brand-crm/brandCustomer.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { upsertTicketAppliance, registerAppliance } from '../src/modules/service-requests/ownedAppliance.service.js';
import { resetTransactionSupportCache } from '../src/utils/transaction.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { readOtpCode } from './helpers/otp.js';
let server;
const kit = brandCrmKit(() => server, { phoneStart: 9340300000 });
const get = (u, path) => kit.api().get(`/api/v1/brand/customers${path}`).set(kit.bearer(u.token));
const send = (u, method, path, body) => kit.api()[method](`/api/v1/brand/customers${path}`).set(kit.bearer(u.token)).send(body);
const input = (overrides = {}) => ({ name: 'Asha', phone: '9876543210', ...overrides });
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmCustomer360'));
  await registerAllModels(); await ensureIndexes();
  server = await listenOnLoopback(createApp());
});
afterAll(async () => { await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({})));
  invalidateBrandPermissions(); resetTransactionSupportCache(); jest.restoreAllMocks();
});
async function world() {
  const w = await kit.world();
  return { ...w, cce: await kit.brandUser(w.lg, { templates: ['cce'], employeeId: 'CCE-03' }),
    viewer: await kit.brandUser(w.lg, { templates: ['viewer'] }), other: await kit.brandAdmin(w.samsung), owner: await kit.brandAdmin(w.lg) };
}

describe('Phase 3 — customer identity and permissions', () => {
  it('creates a customer with an immediate brand profile, audits both writes and supports OTP login', async () => {
    const w = await world();
    const res = await send(w.cce, 'post', '', input({ phone: '+91 98765 43210', alternatePhone: '09876543211', address: { house: '12 MG Road', city: 'Indore', state: 'MP', pincode: '452001' } })).expect(201);
    const c = res.body.data;
    expect(c.phone).toBe('9876543210'); expect(c.alternatePhone).toBe('9876543211'); expect(c.humanId).toMatch(/^CUST-/); expect(c.passwordHash).toBeUndefined();
    expect((await get(w.cce, `/${c.id}`).expect(200)).body.data.customer.addresses[0].city).toBe('Indore');
    expect(await BrandCustomer.countDocuments({ brand: w.lg._id, customer: c.id })).toBe(1);
    expect(await AuditLog.findOne({ action: 'customer.created', entityId: c.id })).toMatchObject({ actor: expect.objectContaining({ employeeId: 'CCE-03' }) });
    expect(await AuditLog.countDocuments({ action: 'customer.linked' })).toBe(1);
    await kit.api().post('/api/v1/auth/otp/send').send({ role: 'customer', identifier: c.phone }).expect(200);
    await kit.api().post('/api/v1/auth/otp/verify').send({ role: 'customer', identifier: c.phone, code: readOtpCode(c.phone) }).expect(200);
  });

  it('returns the same brand match for normalized phone variants and none for an unknown phone', async () => {
    const w = await world(); const c = (await send(w.cce, 'post', '', input()).expect(201)).body.data;
    for (const phone of ['9876543210', '+91 98765 43210', '09876543210']) {
      const res = await get(w.cce, `/search?phone=${encodeURIComponent(phone)}`).expect(200);
      expect(res.body.data.match).toBe('brand'); expect(res.body.data.customer.id).toBe(c.id);
    }
    expect((await get(w.cce, '/search?phone=9000000000').expect(200)).body.data).toEqual({ match: 'none' });
    await get(w.cce, '/search?phone=invalid').expect(400);
  });

  it('reveals only a masked platform match and never links on lookup or duplicate creation', async () => {
    const w = await world(); const c = (await send(w.other, 'post', '', input({ email: 'private@test.com' })).expect(201)).body.data;
    const found = (await get(w.cce, '/search?phone=9876543210').expect(200)).body.data;
    expect(found).toEqual({ match: 'platform', customer: { id: c.id, name: 'Asha', maskedPhone: '******3210' } });
    const duplicate = await send(w.cce, 'post', '', input({ phone: '+91 98765 43210' })).expect(409);
    expect(duplicate.body.error.details.existingId).toBe(c.id);
    expect(await BrandCustomer.exists({ brand: w.lg._id, customer: c.id })).toBeNull();
    await get(w.cce, `/${c.id}`).expect(404);
    await send(w.cce, 'patch', `/${c.id}`, { name: 'Overwrite' }).expect(404);
    await send(w.cce, 'post', `/${c.id}/addresses`, { house: 'X', city: 'X', state: 'X', pincode: '452001' }).expect(404);
  });

  it('handles concurrent normalized duplicate creates with one user/link and 409 existingId', async () => {
    const w = await world();
    const responses = await Promise.all([send(w.cce, 'post', '', input()), send(w.cce, 'post', '', input({ phone: '+91 98765 43210' }))]);
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    const id = responses.find(r => r.status === 201).body.data.id;
    expect(responses.find(r => r.status === 409).body.error.details.existingId).toBe(id);
    expect(await User.countDocuments({ role: 'customer', phone: '9876543210' })).toBe(1);
    expect(await BrandCustomer.countDocuments({ customer: id })).toBe(1);
  });

  it('rolls back a new user if creating its brand relationship fails', async () => {
    const w = await world();
    jest.spyOn(BrandCustomer, 'create').mockRejectedValueOnce(new Error('simulated relationship failure'));
    await send(w.cce, 'post', '', input()).expect(500);
    expect(await User.exists({ role: 'customer', phone: '9876543210' })).toBeNull();
    expect(await AuditLog.countDocuments({ action: 'customer.created' })).toBe(0);
  });

  it('allows CCE edits/addresses but denies phone and privilege changes and Viewer mutations', async () => {
    const w = await world(); const c = (await send(w.cce, 'post', '', input()).expect(201)).body.data;
    await send(w.cce, 'patch', `/${c.id}`, { name: 'New Asha', alternatePhone: '+91 90000 00000', email: 'asha@test.com' }).expect(200);
    await send(w.cce, 'post', `/${c.id}/addresses`, { house: '13 MG Road', city: 'Indore', state: 'MP', pincode: '452001' }).expect(201);
    const profile = (await get(w.viewer, `/${c.id}`).expect(200)).body.data;
    expect(profile.customer.name).toBe('New Asha'); expect(profile.customer.addresses).toHaveLength(1);
    for (const body of [{ phone: '9000000000' }, { role: 'brand_admin' }, { assignedRoles: [] }]) await send(w.cce, 'patch', `/${c.id}`, body).expect(400);
    await send(w.viewer, 'post', '', input()).expect(403); await send(w.viewer, 'patch', `/${c.id}`, { name: 'Forbidden' }).expect(403);
    expect((await AuditLog.findOne({ action: 'customer.updated' })).meta.changes.name).toEqual(['Asha', 'New Asha']);
  });
});

describe('Phase 3 — profile, list, export and products', () => {
  it('assembles scoped tickets/products/completed jobs and excludes private communications', async () => {
    const w = await world(); const customer = await kit.customer();
    const ticket = await kit.createTicketAs(w.cce, kit.ticketInput(w, customer));
    const partnerUser = await kit.staff('service_provider');
    const partner = await ServiceProvider.create({ user: partnerUser.user._id, name: 'Trusted Partner' });
    const sr = await ServiceRequest.create({ user: customer.user._id, brand: w.lg._id, category: 'AC', serviceProvider: partner._id, warrantyClaim: ticket._id, status: 'Closed' });
    // Direct fixtures model completed stage data from future phases.
    await WarrantyClaim.updateOne({ _id: ticket._id }, { status: 'Closed', closedAt: new Date(), serviceRequest: sr._id, 'closure.rating': 5,
      $push: { timeline: { action: 'CUSTOMER_CONTACTED', actor: { kind: 'brand', name: 'CCE' }, visibility: 'brand', note: 'Public contact' } } });
    const second = await kit.createTicketAs(w.cce, kit.ticketInput(w, customer));
    await WarrantyClaim.updateOne({ _id: second._id }, { $push: { timeline: { action: 'CUSTOMER_CONTACTED', actor: { kind: 'admin' }, visibility: 'internal', note: 'Secret internal' } } });
    await Notification.create([{ recipient: customer.user._id, brand: w.samsung._id, title: 'Other brand', type: 'claims' }, { recipient: customer.user._id, title: 'Legacy private', type: 'claims' }]);
    await get(w.other, `/${customer.user._id}`).expect(404);
    const profile = (await get(w.cce, `/${customer.user._id}`).expect(200)).body.data;
    expect(profile.products).toHaveLength(2); expect(profile.tickets).toHaveLength(2);
    expect(profile.completedJobs[0]).toMatchObject({ partnerName: 'Trusted Partner', rating: 5 });
    expect(profile.stats).toMatchObject({ total: 2, open: 1, completed: 1 });
    expect(profile.communication.some(c => c.note === 'Public contact')).toBe(true);
    expect(JSON.stringify(profile.communication)).not.toMatch(/Other brand|Legacy private|Secret internal/);
    // A linked execution job is not counted twice in the list.
    const listed = (await get(w.cce, '').expect(200)).body.data[0];
    expect(listed.totalTickets).toBe(2); expect(listed.openTickets).toBe(1);
  });

  it('searches and paginates before returning DB results with stable counts', async () => {
    const w = await world();
    for (let i = 0; i < 4; i++) await send(w.cce, 'post', '', input({ name: `Person ${i}`, phone: `987654321${i}` })).expect(201);
    const spy = jest.spyOn(BrandCustomer, 'aggregate');
    const first = (await get(w.cce, '?limit=2&page=1&q=Person').expect(200)).body;
    const second = (await get(w.cce, '?limit=2&page=2&q=Person').expect(200)).body;
    expect(first.meta.total).toBe(4); expect(first.data).toHaveLength(2); expect(second.data).toHaveLength(2);
    expect(first.data.map(c => c.id).filter(id => second.data.some(c => c.id === id))).toHaveLength(0);
    expect((await get(w.cce, `?q=${first.data[0].humanId}`).expect(200)).body.data).toHaveLength(1);
    expect((await get(w.cce, '?q=9876543210').expect(200)).body.data).toHaveLength(1);
    const pipeline = spy.mock.calls[0][0];
    expect(pipeline.some(stage => stage.$match?.$or)).toBe(true);
    expect(pipeline.at(-1).$facet.items).toEqual(expect.arrayContaining([{ $skip: 0 }, { $limit: 2 }]));
  });

  it('requires export permission and escapes quotes and spreadsheet formula cells', async () => {
    const w = await world(); await send(w.cce, 'post', '', input({ name: '=HYPERLINK("bad")' })).expect(201);
    await get(w.viewer, '?format=csv').expect(403); await get(w.cce, '?format=csv').expect(403);
    const csv = await get(w.owner, '?format=csv').expect(200);
    expect(csv.headers['content-type']).toContain('text/csv'); expect(csv.text).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv.headers['content-disposition']).toContain('brand-customers.csv');
  });

  it('matches appliances alone by brand reference and leaves NCC paid cover out of estimates', async () => {
    const w = await world(); const c = await kit.customer();
    await OwnedAppliance.create({ user: c.user._id, brand: 'LG', brandRef: w.lg._id, category: 'AC', model: 'Solo', warrantyStatus: 'AMC' });
    expect((await get(w.cce, `/search?phone=${c.user.phone}`).expect(200)).body.data.match).toBe('brand');
    expect((await get(w.cce, `/${c.user._id}`).expect(200)).body.data.products[0].warranty.status).toBe('Verification Required');
  });

  it('preserves invoice/purchase details across repeated case-normalized product upserts', async () => {
    const w = await world(); const c = await kit.customer();
    const ticket = await kit.createTicketAs(w.cce, kit.ticketInput(w, c, { serialNumber: ' Keep-1 ', documents: [{ kind: 'invoice', url: 'https://example.test/original.pdf' }] }));
    const before = await OwnedAppliance.findOne({ user: c.user._id });
    await Promise.all([' keep-1 ', 'KEEP-1'].map(serialNumber => upsertTicketAppliance({ ...ticket.toObject(), serialNumber, purchaseDate: new Date(), documents: [{ kind: 'invoice', url: 'https://example.test/new.pdf' }] }, w.lg)));
    expect(await OwnedAppliance.countDocuments({ user: c.user._id })).toBe(1);
    const after = await OwnedAppliance.findOne({ user: c.user._id });
    expect(after.purchaseDate.toISOString()).toBe(before.purchaseDate.toISOString()); expect(after.invoiceFileUrl).toBe('https://example.test/original.pdf');
    const noSerial = { ...ticket.toObject(), serialNumber: null, modelNumber: ' Model-2 ', documents: [] };
    await Promise.all([upsertTicketAppliance(noSerial, w.lg), upsertTicketAppliance({ ...noSerial, modelNumber: 'MODEL-2' }, w.lg)]);
    expect(await OwnedAppliance.countDocuments({ user: c.user._id })).toBe(2);
    await registerAppliance(c.user._id, { brand: w.lg.name, category: ticket.categoryKey, modelNumber: ' model-2 ' });
    expect(await OwnedAppliance.countDocuments({ user: c.user._id })).toBe(2);
  });
});
