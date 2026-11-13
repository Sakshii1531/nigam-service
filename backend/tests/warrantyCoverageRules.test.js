import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { extendedWarrantyWindow } from '../src/modules/shared/brandWarranty.js';
import { seedTestCatalogue, clearCatalogue, offeringBooking } from './helpers/catalogue.js';
import { brandWarrantyAppliance } from './helpers/coverage.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

let app;
const { customer } = jobFlow(() => app);
const days = (n) => new Date(Date.now() + n * 86400000);

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('warranty_coverage_rules'));
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
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job, Brand, OwnedAppliance, ExtendedWarrantyOrder].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
});

const book = (token, body) => request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(body);

async function paidEw(user, appliance, extra = {}) {
  return ExtendedWarrantyOrder.create({
    user, appliance: appliance._id, applianceCategory: 'AC', brand: appliance.brand, modelNumber: appliance.modelNumber, price: 999, paid: true, paidAt: new Date(),
    status: 'Active', validFrom: days(-1), validTill: days(365), claimsTotal: 1, claimsRemaining: 1, ...extra,
  });
}

describe('an extended warranty plan cannot cover more bookings than it has claims', () => {
  it('counts open covered bookings against the allowance, and frees it again when one is cancelled', async () => {
    const cust = await customer();
    const appliance = await brandWarrantyAppliance({ user: cust.user._id, purchaseDate: days(-800) });
    const ew = await paidEw(cust.user._id, appliance);
    const covered = { applianceId: String(appliance._id), brand: 'LG', protection: { kind: 'extended-warranty', id: String(ew._id) }, coverageType: 'NCC Extended Warranty' };

    const first = await book(cust.token, await offeringBooking('AC-WINDOW-INSTALL', { userId: String(cust.user._id), ...covered }));
    expect(first.status).toBe(201);
    expect(first.body.data.booking.totalPrice).toBe(0);

    // One claim, already taken by an open booking: a second covered booking is refused...
    const second = await book(cust.token, await offeringBooking('AC-WINDOW-INSTALL', { userId: String(cust.user._id), ...covered }));
    expect(second.status).toBe(400);
    expect(second.body.error.message).toMatch(/exhausted/);
    // ...and without naming the plan, the same appliance is simply priced normally.
    const priced = await request(app).post('/api/v1/catalog/quote').set('Authorization', `Bearer ${cust.token}`)
      .send({ lines: [{ offeringId: (await offeringBooking('AC-WINDOW-INSTALL')).offeringId, quantity: 1 }], warranty: { brand: 'LG', applianceId: String(appliance._id) } }).expect(200);
    expect(priced.body.data.totals.final).toBeGreaterThan(0);

    // Cancelling the first booking gives the claim back.
    await request(app).post(`/api/v1/bookings/${first.body.data.booking.id}/cancel`).set('Authorization', `Bearer ${cust.token}`).send({ reason: 'test' }).expect(200);
    const again = await book(cust.token, await offeringBooking('AC-WINDOW-INSTALL', { userId: String(cust.user._id), ...covered }));
    expect(again.status).toBe(201);
    expect(again.body.data.booking.totalPrice).toBe(0);
  });
});

describe('an extended warranty extends the brand warranty instead of overlapping it', () => {
  it('starts when the brand warranty ends, or on purchase when that has passed', async () => {
    const bought = new Date('2026-01-16T00:00:00Z');
    const paid = new Date('2026-11-12T00:00:00Z');
    const fresh = await extendedWarrantyWindow({ brand: 'LG', purchaseDate: bought, months: 12, from: paid });
    expect(fresh.validFrom.toISOString().slice(0, 10)).toBe('2027-01-16'); // LG default 12-month warranty
    expect(fresh.validTill.toISOString().slice(0, 10)).toBe('2028-01-16');

    const old = await extendedWarrantyWindow({ brand: 'LG', purchaseDate: new Date('2024-01-01'), months: 12, from: paid });
    expect(old.validFrom).toEqual(paid);
    const unknown = await extendedWarrantyWindow({ brand: 'LG', purchaseDate: null, months: 24, from: paid });
    expect(unknown.validFrom).toEqual(paid);
  });

  it('does not cover (or use a claim) while the brand warranty is still running', async () => {
    const cust = await customer();
    const appliance = await brandWarrantyAppliance({ user: cust.user._id, purchaseDate: days(-100) });
    const ew = await paidEw(cust.user._id, appliance, { validFrom: days(265), validTill: days(630) });

    const res = await book(cust.token, await offeringBooking('AC-WINDOW-INSTALL', { userId: String(cust.user._id), applianceId: String(appliance._id), brand: 'LG', coverageType: 'Brand Warranty' }));
    expect(res.status).toBe(201);
    // The brand pays this one, not the customer's extended warranty.
    expect(res.body.data.booking.commercial.coverage.type).toBe('Brand Warranty');
    expect(res.body.data.serviceRequest.extendedWarrantyOrder).toBeNull();
    expect((await ExtendedWarrantyOrder.findById(ew._id)).claimsRemaining).toBe(1);
  });
});

describe('a free brand-warranty visit needs a brand to bill and proof of purchase', () => {
  const recentBooking = async (cust, extra) => offeringBooking('AC-WINDOW-INSTALL', { userId: String(cust.user._id), brand: 'LG', ...extra });

  it('is free for a partner brand appliance with its invoice on file', async () => {
    const cust = await customer();
    const appliance = await brandWarrantyAppliance({ user: cust.user._id });
    const body = await recentBooking(cust, { applianceId: String(appliance._id), coverageType: 'Brand Warranty' });
    expect(body.expectedFinalAmount).toBe(0);
    const res = await book(cust.token, body);
    expect(res.status).toBe(201);
    expect(res.body.data.serviceRequest.warranty).toBe('In Warranty');
  });

  it('is a paid visit when the purchase date is only typed in, the invoice is missing, or the brand is not a partner', async () => {
    const cust = await customer();
    await Brand.create({ name: 'LG', category: 'Appliances', status: 'Active' });
    const typed = await recentBooking(cust, { purchaseDate: days(-30).toISOString(), newAppliance: true });
    expect(typed.expectedFinalAmount).toBeGreaterThan(0);

    const noInvoice = await brandWarrantyAppliance({ user: cust.user._id, invoice: false });
    const quoted = await request(app).post('/api/v1/catalog/quote').set('Authorization', `Bearer ${cust.token}`)
      .send({ lines: [{ offeringId: typed.offeringId, quantity: 1 }], warranty: { brand: 'LG', applianceId: String(noInvoice._id) } }).expect(200);
    expect(quoted.body.data.totals.final).toBeGreaterThan(0);
    expect(quoted.body.data.coverageNote).toMatch(/purchase invoice/);

    const other = await brandWarrantyAppliance({ user: cust.user._id, brand: 'Unlisted Co', partner: false });
    const res = await book(cust.token, await recentBooking(cust, { applianceId: String(other._id), brand: 'Unlisted Co' }));
    expect(res.status).toBe(201);
    expect(res.body.data.booking.totalPrice).toBeGreaterThan(0);
    expect(res.body.data.serviceRequest.warranty).toBe('Out of Warranty');

    // My Appliances still shows the truth: the appliance is within its brand warranty.
    const shown = await request(app).get(`/api/v1/appliances/${other._id}`).set('Authorization', `Bearer ${cust.token}`).expect(200);
    expect(shown.body.data.warrantyStatus).toBe('In Warranty');
  });
});
