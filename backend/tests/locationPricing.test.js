import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { seedTestCatalogue, clearCatalogue, offeringBooking } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// Location pricing seam (client Req 25, docs/master-catalogue Phase 7 §7.3).
// There is no admin UI for it yet, but the data model, resolver, quote and
// booking snapshot already handle a CITY or PINCODE rate: the most specific
// scope wins (PINCODE → CITY → DEFAULT). This proves it end to end.

const TEST_DB_URI = testDbUri('location_pricing');
let app;
let fan;
const flow = jobFlow(() => app, { phoneStart: 9300700000 });

const quoteFan = async (location) =>
  (
    await request(app)
      .post('/api/v1/catalog/quote')
      .send({ lines: [{ offeringId: String(fan._id), quantity: 1 }], location })
      .expect(200)
  ).body.data;

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(TEST_DB_URI);
  await ensureIndexes();
  app = createApp().listen(0);
  await clearCatalogue();
  await seedTestCatalogue();
  fan = await ServiceOffering.findOne({ code: 'ELEC-FAN-INSTALL' });

  // Fan Installation in Jaipur: ₹279 to the customer, ₹170 to the partner
  // (default everywhere else: ₹299 / ₹180). A new scope's first version needs
  // every amount.
  await createRateVersion(
    fan._id,
    { customerPrice: 27900, spPayout: 17000, expressFee: 9900, expressSpIncentive: 5000 },
    { scope: { type: 'CITY', value: 'Jaipur' } },
  );
  // And one Jaipur pincode cheaper still.
  await createRateVersion(
    fan._id,
    { customerPrice: 25900, spPayout: 16000, expressFee: 9900, expressSpIncentive: 5000 },
    { scope: { type: 'PINCODE', value: '302017' } },
  );
});

afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('location rate overrides', () => {
  it('a Jaipur quote uses the CITY rate; Delhi and no location use DEFAULT', async () => {
    expect((await quoteFan({ city: 'Jaipur' })).lines[0].unitPrice).toBe(279);
    expect((await quoteFan({ city: 'jaipur' })).lines[0].unitPrice).toBe(279); // case-insensitive
    expect((await quoteFan({ city: 'Delhi' })).lines[0].unitPrice).toBe(299);
    expect((await quoteFan(undefined)).lines[0].unitPrice).toBe(299);
  });

  it('a PINCODE rate beats the CITY rate', async () => {
    expect((await quoteFan({ city: 'Jaipur', pincode: '302017' })).lines[0].unitPrice).toBe(259);
    expect((await quoteFan({ city: 'Jaipur', pincode: '302001' })).lines[0].unitPrice).toBe(279);
  });

  it('the category tree shows the local price', async () => {
    const tree = (await request(app).get('/api/v1/catalog/categories/Electrician/tree?city=Jaipur').expect(200)).body.data;
    expect(tree.offerings.find((o) => o.code === 'ELEC-FAN-INSTALL').customerPrice).toBe(279);
  });

  it('a Jaipur booking snapshots the CITY rate and its payout', async () => {
    const cust = await flow.customer();
    const body = await offeringBooking('ELEC-FAN-INSTALL', {
      userId: String(cust.user._id),
      requiredInfo: [{ key: 'fan_type', value: 'Ceiling' }],
      address: { house: '1 MI Road', city: 'Jaipur', pincode: '302001' },
    });
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust.token}`).send(body).expect(201);
    expect(res.body.data.booking.commercial).toMatchObject({ unitPrice: 279, rate: { scope: 'CITY' } });

    const saved = await Booking.findById(res.body.data.booking.id).lean();
    expect(saved.commercial).toMatchObject({ unitPrice: 279, spPayoutUnit: 170, spPayoutTotal: 170, finalAmount: 329.22 });
  });
});
