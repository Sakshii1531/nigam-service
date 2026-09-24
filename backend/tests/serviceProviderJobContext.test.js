import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { seedSimpleOffering, offeringBooking, clearCatalogue } from './helpers/catalogue.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('serviceProviderJobContext');

let app;
let phoneCounter = 9500000000;
function nextPhone() {
  return String(phoneCounter++);
}

async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedCatalog() {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await seedSimpleOffering({ categoryKey: category.key, price: 1000 });
  await seedSimpleOffering({ categoryKey: category.key, code: 'TEST-FOAM-WASH', serviceName: 'AC Foam Wash', price: 399, payout: 200 });
  await SparePartCatalog.create({ name: 'Capacitor 45 MFD', category: 'AC', costPrice: 300, markupPercent: 20, stock: 10 });
  return category;
}

async function seedServiceProvider() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name: 'Test Service Provider', passwordHash: await hashPassword('password123') });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Test Service Provider', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  const token = await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone, password: 'password123' });
  return { serviceProvider, token };
}

async function seedCustomer() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
  const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
  return { user, token };
}

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await clearCatalogue();
  await Promise.all([
    User.deleteMany({}),
    ServiceProvider.deleteMany({}),
    Category.deleteMany({}),
    ServiceCatalogItem.deleteMany({}),
    SparePartCatalog.deleteMany({}),
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Job.deleteMany({}),
    OwnedAppliance.deleteMany({}),
  ]);
});

describe('GET /service-provider/jobs/:id/context', () => {
  it('returns the real appliance, category catalog, and this appliance\'s past completed-job history', async () => {
    await seedCatalog();
    const { serviceProvider, token: providerToken } = await seedServiceProvider();
    const { user: customer, token: custToken } = await seedCustomer();

    const appliance = await OwnedAppliance.create({
      user: customer._id,
      category: 'AC',
      brand: 'Voltas',
      model: '1.5 Ton Inverter',
      serialNumber: 'VLT18GN123348X',
      purchaseDate: new Date('2023-01-12'),
    });

    // A prior, already-completed job on this same appliance — the history this
    // endpoint should surface (not a job the current provider is touching).
    const priorSr = await ServiceRequest.create({
      user: customer._id,
      category: 'AC',
      appliance: appliance._id,
      description: 'Routine wet cleaning',
    });
    await Job.create({
      serviceRequest: priorSr._id,
      serviceProvider: serviceProvider._id,
      type: 'NCC Paid Service',
      activeStep: 'completed',
      diagnosis: { notes: 'Cleaned condenser coil, no leaks found.' },
      spareParts: [{ name: 'Capacitor 45 MFD', price: 450, checked: true, source: 'manual' }],
    });

    // The current, in-progress job on the same appliance.
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${custToken}`)
      .send(await offeringBooking('TEST-REPAIR', { applianceId: String(appliance._id) }))
      .expect(201);
    const srId = bookingRes.body.data.serviceRequest.id;

    const acceptRes = await request(app)
      .post(`/api/v1/service-provider/jobs/accept/${srId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({})
      .expect(200);
    const jobId = acceptRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/service-provider/jobs/${jobId}/context`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(res.body.data.appliance).toMatchObject({
      brand: 'Voltas',
      model: '1.5 Ton Inverter',
      serialNumber: 'VLT18GN123348X',
      warrantyStatus: 'Out of Warranty', // purchased 2023-01-12, no AMC/EW, brand warranty long expired
    });

    const addonNames = res.body.data.addonServices.map((s) => s.name);
    expect(addonNames).toContain('AC Foam Wash');

    const partNames = res.body.data.spareParts.map((p) => p.name);
    expect(partNames).toContain('Capacitor 45 MFD');

    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.history[0]).toMatchObject({
      complaint: 'Routine wet cleaning',
      notes: 'Cleaned condenser coil, no leaks found.',
      serviceProviderName: 'Test Service Provider',
    });
    expect(res.body.data.history[0].partsReplaced).toEqual([{ name: 'Capacitor 45 MFD', price: 450 }]);
  });

  it('rejects access to another provider\'s job context', async () => {
    await seedCatalog();
    const { token: providerToken } = await seedServiceProvider();
    const { token: otherProviderToken } = await seedServiceProvider();
    const { token: custToken } = await seedCustomer();

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${custToken}`)
      .send(await offeringBooking('TEST-REPAIR'))
      .expect(201);
    const srId = bookingRes.body.data.serviceRequest.id;

    const acceptRes = await request(app)
      .post(`/api/v1/service-provider/jobs/accept/${srId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({})
      .expect(200);
    const jobId = acceptRes.body.data.id;

    await request(app)
      .get(`/api/v1/service-provider/jobs/${jobId}/context`)
      .set('Authorization', `Bearer ${otherProviderToken}`)
      .expect(403);
  });
});
