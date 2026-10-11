import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { readOtpCode } from './helpers/otp.js';
import { normalisePhone } from '../src/modules/shared/phone.js';
import { User } from '../src/modules/auth/user.model.js';
import { BrandCustomer } from '../src/modules/brand-crm/brandCustomer.model.js';
import { isBrandCustomer } from '../src/modules/brand-crm/brandCustomer.service.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { registerAppliance, updateAppliance } from '../src/modules/service-requests/ownedAppliance.service.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { estimateBrandWarranty } from '../src/modules/shared/brandWarrantyEstimate.js';

let server;
const kit = brandCrmKit(() => server, { phoneStart: 9330300000 });
const get = (staff, path) => kit.api().get(`/api/v1${path}`).set(kit.bearer(staff.token));

beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmFoundationFixes'));
  await registerAllModels();
  await ensureIndexes();
  server = await listenOnLoopback(createApp());
});
afterAll(async () => {
  await closeServer(server);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  invalidateBrandPermissions();
});

describe('Brand CRM readiness fixes', () => {
  it('rejects an old token on restricted, universal and shared routes after HTTP brand reassignment', async () => {
    const w = await kit.world();
    const owner = await kit.brandAdmin(w.lg);
    const admin = await kit.superAdmin();
    await get(owner, '/brand/customers').expect(200); // prime cache
    await kit.api().put(`/api/v1/super-admin/brand-admins/${owner.user._id}`)
      .set(kit.bearer(admin.token)).send({ brand: String(w.samsung._id) }).expect(200);
    for (const path of ['/brand/customers', '/brand/settings', '/service-requests']) {
      await get(owner, path).expect(401);
    }
    const token = await kit.flow.loginAndVerify({ role: 'brand_admin', identifier: owner.user.email });
    await get({ token }, '/brand/customers').expect(200);
  });

  it('rejects an old brand token after the database role changes', async () => {
    const w = await kit.world();
    const owner = await kit.brandAdmin(w.lg);
    await User.updateOne({ _id: owner.user._id }, { role: 'customer' });
    invalidateBrandPermissions(owner.user._id);
    await get(owner, '/brand/settings').expect(401);
  });

  it('normalizes supported phone forms and rejects malformed values', () => {
    for (const phone of ['9876543210', '+91 98765 43210', '09876543210', ' 98765 43210 ']) {
      expect(normalisePhone(phone)).toBe('9876543210');
    }
    for (const phone of ['+1 9876543210', '987654321', 'abc9876543210', '919876543210']) {
      expect(() => normalisePhone(phone)).toThrow();
    }
  });

  it('lets a customer with an unknown password sign in by OTP using phone variants', async () => {
    const customer = await User.create({ name: 'CCE customer', role: 'customer', phone: '9876543210', passwordHash: 'unusable' });
    await kit.api().post('/api/v1/auth/otp/send').send({ role: 'customer', identifier: '+91 98765 43210' }).expect(200);
    const code = readOtpCode('9876543210');
    const res = await kit.api().post('/api/v1/auth/otp/verify').send({ role: 'customer', identifier: '09876543210', code }).expect(200);
    expect(String(res.body.data.user.id)).toBe(String(customer._id));
    expect(res.body.data.user.passwordHash).toBeUndefined();
    await kit.api().post('/api/v1/auth/otp/verify').send({ role: 'customer', identifier: '9876543210', code }).expect(400);
  });

  it('rejects OTP requests and pending OTP verification for suspended customers', async () => {
    const customer = await User.create({ name: 'Customer', role: 'customer', phone: '9876543210', passwordHash: 'unusable' });
    await kit.api().post('/api/v1/auth/otp/send').send({ role: 'customer', identifier: customer.phone }).expect(200);
    const code = readOtpCode(customer.phone);
    await User.updateOne({ _id: customer._id }, { status: 'Suspended' });
    await kit.api().post('/api/v1/auth/otp/send').send({ role: 'customer', identifier: customer.phone }).expect(403);
    await kit.api().post('/api/v1/auth/otp/verify').send({ role: 'customer', identifier: customer.phone, code }).expect(403);
  });

  it('does not create a duplicate through signup with a prefixed phone', async () => {
    await User.create({ name: 'Customer', role: 'customer', phone: '9876543210', passwordHash: 'unusable' });
    await kit.api().post('/api/v1/auth/signup/check').send({
      name: 'Customer', phone: '+91 98765 43210', email: 'new@test.com', password: 'password123', confirmPassword: 'password123', address: 'Home',
    }).expect(409);
    expect(await User.countDocuments({ role: 'customer' })).toBe(1);
  });

  it('recognizes an explicit relationship without a ticket and keeps it unique and isolated', async () => {
    const w = await kit.world();
    const customer = await kit.customer();
    expect(await isBrandCustomer(w.lg._id, customer.user._id)).toBe(false);
    await BrandCustomer.create({ brand: w.lg._id, customer: customer.user._id });
    expect(await isBrandCustomer(w.lg._id, customer.user._id)).toBe(true);
    expect(await isBrandCustomer(w.samsung._id, customer.user._id)).toBe(false);
    await expect(BrandCustomer.create({ brand: w.lg._id, customer: customer.user._id })).rejects.toMatchObject({ code: 11000 });
  });

  it('permits contact for ticket-only customers and records notification provenance without allowing another brand', async () => {
    const w = await kit.world();
    const customer = await kit.customer();
    const owner = await kit.brandAdmin(w.lg);
    const other = await kit.brandAdmin(w.samsung);
    const ticket = await kit.createTicketAs(owner, kit.ticketInput(w, customer));
    const submitted = await Notification.findOne({ recipient: customer.user._id, warrantyClaim: ticket._id });
    expect(String(submitted.brand)).toBe(String(w.lg._id));
    const body = { userId: String(customer.user._id), title: 'Contact', body: 'Please call us' };
    await kit.api().post('/api/v1/brand/actions/notify-customer').set(kit.bearer(owner.token)).send(body).expect(201);
    const sent = await Notification.findOne({ title: 'Contact' });
    expect(String(sent.brand)).toBe(String(w.lg._id));
    await kit.api().post('/api/v1/brand/actions/notify-customer').set(kit.bearer(other.token)).send(body).expect(403);
  });

  it('resolves appliance brand references on registration and clears them when the name changes', async () => {
    const w = await kit.world();
    const customer = await kit.customer();
    const appliance = await registerAppliance(customer.user._id, { category: 'AC', brand: ' lg ', serialNumber: 'REF-1' });
    expect(String(appliance.brandRef)).toBe(String(w.lg._id));
    await updateAppliance(customer.user._id, appliance.id, { brand: 'Unknown maker' });
    expect((await OwnedAppliance.findById(appliance.id)).brandRef).toBeNull();
  });

  it('estimates brand cover consistently for unknown, valid and expired purchase dates', async () => {
    await kit.world();
    expect((await estimateBrandWarranty('LG')).status).toBe('Verification Required');
    expect((await estimateBrandWarranty('LG', 'invalid')).status).toBe('Verification Required');
    expect((await estimateBrandWarranty('LG', new Date())).status).toBe('In Warranty');
    expect((await estimateBrandWarranty('LG', new Date('2000-01-01'))).status).toBe('Out of Warranty');
  });
});
