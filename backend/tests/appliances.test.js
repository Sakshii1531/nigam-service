import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { ExtendedWarrantyPlan } from '../src/modules/warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { Claim } from '../src/modules/warranty-amc-exchange/claim.model.js';
import { ExchangeBaseValue } from '../src/modules/warranty-amc-exchange/exchangeBaseValue.model.js';
import { ExchangeRequest } from '../src/modules/warranty-amc-exchange/exchangeRequest.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Membership } from '../src/modules/rewards-loyalty/membership.model.js';
import { UserMembership } from '../src/modules/rewards-loyalty/userMembership.model.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { Order } from '../src/modules/buy-commerce/order.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('appliances');

let app;
let counter = 9600000000;
const nextPhone = () => String(counter++);
const nextEmail = () => `appliance-admin-${counter++}@test.local`;

async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
}

async function seedCustomer() {
  const phone = nextPhone();
  const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Appliance Owner', passwordHash: await hashPassword('password123') });
  const token = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' });
  return { user, token };
}

async function seedSuperAdmin() {
  const email = nextEmail();
  await User.create({ role: ROLES.SUPER_ADMIN, email, name: 'Super Admin', passwordHash: await hashPassword('password123'), status: 'Active' });
  return loginAndVerify({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' });
}

/** A purchase date `months` ago, so warranty assertions don't depend on today. */
function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
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
  await Promise.all([
    User.deleteMany({}),
    Brand.deleteMany({}),
    OwnedAppliance.deleteMany({}),
    ExtendedWarrantyPlan.deleteMany({}),
    ExtendedWarrantyOrder.deleteMany({}),
    SparePartCatalog.deleteMany({}),
    Claim.deleteMany({}),
    ExchangeBaseValue.deleteMany({}),
    ExchangeRequest.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Category.deleteMany({}),
    ProductType.deleteMany({}),
    ServiceCatalogItem.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Membership.deleteMany({}),
    UserMembership.deleteMany({}),
    Notification.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    Escalation.deleteMany({}),
    AMCPlan.deleteMany({}),
    AMCSubscription.deleteMany({}),
  ]);
});

describe('customer appliance registry', () => {
  it('registers an appliance and derives its warranty from the recorded purchase date', async () => {
    const { token } = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/appliances')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', brand: 'Voltas', modelNumber: 'MSQ18', serialNumber: 'SN-1', purchaseDate: monthsAgo(6) })
      .expect(201);

    expect(res.body.data.warrantyStatus).toBe('In Warranty');
    // 12-month brand warranty from a 6-month-old purchase is still in the future.
    expect(new Date(res.body.data.warrantyExpiresOn).getTime()).toBeGreaterThan(Date.now());
  });

  it('reports an appliance bought two years ago as out of warranty', async () => {
    const { token } = await seedCustomer();
    const res = await request(app)
      .post('/api/v1/appliances')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', brand: 'LG', serialNumber: 'SN-OLD', purchaseDate: monthsAgo(24) })
      .expect(201);

    expect(res.body.data.warrantyStatus).toBe('Out of Warranty');
  });

  it('returns a null expiry when no purchase date was recorded, rather than inventing one', async () => {
    const { token } = await seedCustomer();
    const res = await request(app)
      .post('/api/v1/appliances')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC', brand: 'LG', serialNumber: 'SN-NODATE' })
      .expect(201);

    expect(res.body.data.warrantyExpiresOn).toBeNull();
    expect(res.body.data.warrantyStatus).toBe('Out of Warranty');
  });

  it('re-registering the same serial updates the record instead of duplicating it', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post('/api/v1/appliances').set(auth).send({ category: 'AC', brand: 'LG', serialNumber: 'SN-DUP', purchaseDate: monthsAgo(3) }).expect(201);
    await request(app).post('/api/v1/appliances').set(auth).send({ category: 'AC', brand: 'LG', modelNumber: 'CORRECTED', serialNumber: 'SN-DUP', purchaseDate: monthsAgo(3) }).expect(201);

    const list = await request(app).get('/api/v1/appliances').set(auth).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].modelNumber).toBe('CORRECTED');
  });

  it('looks an appliance up by model + serial, and reports not-found without erroring', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/v1/appliances').set(auth).send({ category: 'AC', modelNumber: 'M1', serialNumber: 'S1', purchaseDate: monthsAgo(2) }).expect(201);

    const hit = await request(app).get('/api/v1/appliances/lookup?modelNumber=M1&serialNumber=S1').set(auth).expect(200);
    expect(hit.body.data.found).toBe(true);
    expect(hit.body.data.appliance.serialNumber).toBe('S1');

    const miss = await request(app).get('/api/v1/appliances/lookup?serialNumber=NOPE').set(auth).expect(200);
    expect(miss.body.data).toMatchObject({ found: false, appliance: null });

    await request(app).get('/api/v1/appliances/lookup').set(auth).expect(400);
  });

  it("never exposes another customer's appliance", async () => {
    const owner = await seedCustomer();
    const other = await seedCustomer();

    const created = await request(app)
      .post('/api/v1/appliances')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ category: 'AC', serialNumber: 'SN-PRIVATE', purchaseDate: monthsAgo(1) })
      .expect(201);

    await request(app)
      .get(`/api/v1/appliances/${created.body.data.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);

    const otherLookup = await request(app)
      .get('/api/v1/appliances/lookup?serialNumber=SN-PRIVATE')
      .set('Authorization', `Bearer ${other.token}`)
      .expect(200);
    expect(otherLookup.body.data.found).toBe(false);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/v1/appliances').expect(401);
  });
});

describe('extended warranty is priced by the server, not the client', () => {
  it('charges the catalogue price and duration regardless of what the request says', async () => {
    const { token } = await seedCustomer();
    const plan = await ExtendedWarrantyPlan.create({ name: '2-Year Pack', durationYears: 2, price: 1399, claimsTotal: 3 });

    const res = await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${token}`)
      // A tampered client posting its own price must not be believed.
      .send({ plan: plan.id, category: 'AC', brand: 'LG', amountPaid: 1, planDurationYears: 99 })
      .expect(201);

    expect(res.body.data.order.price).toBe(1399);
    expect(res.body.data.order.claimsTotal).toBe(3);
    const years = new Date(res.body.data.order.validTill).getFullYear() - new Date().getFullYear();
    expect(years).toBe(2);
  });

  it('404s when the plan does not exist rather than falling back to a default price', async () => {
    const { token } = await seedCustomer();
    await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: new mongoose.Types.ObjectId().toString(), category: 'AC' })
      .expect(404);
  });

  it("refuses to attach a policy to another customer's appliance", async () => {
    const owner = await seedCustomer();
    const attacker = await seedCustomer();
    const plan = await ExtendedWarrantyPlan.create({ name: '1-Year Pack', durationYears: 1, price: 799 });
    const appliance = await OwnedAppliance.create({ user: owner.user._id, category: 'AC' });

    await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ plan: plan.id, appliance: appliance.id, category: 'AC' })
      .expect(404);
  });

  it('lists only active plans to customers', async () => {
    const { token } = await seedCustomer();
    await ExtendedWarrantyPlan.create([
      { name: 'Live', durationYears: 1, price: 799 },
      { name: 'Retired', durationYears: 1, price: 499, isActive: false },
    ]);

    const res = await request(app)
      .get('/api/v1/warranty-amc/extended-warranty/plans')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.map((p) => p.name)).toEqual(['Live']);
  });

  it('is super-admin only to manage', async () => {
    const { token: custToken } = await seedCustomer();
    await request(app)
      .post('/api/v1/super-admin/extended-warranty-plans')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ name: 'Sneaky', durationYears: 1, price: 0 })
      .expect(403);

    const adminToken = await seedSuperAdmin();
    const created = await request(app)
      .post('/api/v1/super-admin/extended-warranty-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Gold', durationYears: 2, price: 1399, features: ['Priority booking'] })
      .expect(201);
    expect(created.body.data.price).toBe(1399);
  });
});

describe('public brand list', () => {
  it('returns only active brands, without the admin-only fields', async () => {
    await Brand.create([
      { name: 'LG', category: 'Appliances', status: 'Active' },
      { name: 'Unapproved Co', category: 'Appliances', status: 'Pending' },
    ]);

    const res = await request(app).get('/api/v1/catalog/brands').expect(200);
    expect(res.body.data.map((b) => b.name)).toEqual(['LG']);
  });
});

describe('spare-part catalogue supply fields', () => {
  it('persists supplier and re-order threshold, and derives status from the threshold', async () => {
    const adminToken = await seedSuperAdmin();
    const auth = { Authorization: `Bearer ${adminToken}` };

    const created = await request(app)
      .post('/api/v1/super-admin/spare-parts')
      .set(auth)
      .send({ name: 'Compressor', costPrice: 1000, markupPercent: 20, stock: 3, reorderThreshold: 10, supplier: 'Nigam Spares Ltd', leadTimeDays: 4 })
      .expect(201);

    expect(created.body.data.supplier).toBe('Nigam Spares Ltd');
    expect(created.body.data.retailPrice).toBe(1200);
    // 3 units against a threshold of 10 is Low Stock, not In Stock.
    expect(created.body.data.status).toBe('Low Stock');

    const updated = await request(app)
      .put(`/api/v1/super-admin/spare-parts/${created.body.data.id}`)
      .set(auth)
      .send({ stock: 50, leadTimeDays: 2 })
      .expect(200);
    expect(updated.body.data.status).toBe('In Stock');
    expect(updated.body.data.leadTimeDays).toBe(2);

    await request(app).delete(`/api/v1/super-admin/spare-parts/${created.body.data.id}`).set(auth).expect(200);
    expect(await SparePartCatalog.countDocuments()).toBe(0);
  });
});

describe('POST /uploads', () => {
  it('stores an authenticated customer upload and returns its URL', async () => {
    const { token } = await seedCustomer();

    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake invoice'), { filename: 'invoice.pdf', contentType: 'application/pdf' })
      .expect(200);

    expect(res.body.data.url).toBeTruthy();
    expect(res.body.data.name).toBe('invoice.pdf');
  });

  it('rejects an unauthenticated upload and a request with no file', async () => {
    await request(app)
      .post('/api/v1/uploads')
      .attach('file', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' })
      .expect(401);

    const { token } = await seedCustomer();
    await request(app).post('/api/v1/uploads').set('Authorization', `Bearer ${token}`).expect(400);
  });
});

describe('super-admin claim decisions', () => {
  it('persists an approval and returns the raiser, so the console shows a real name', async () => {
    const { user } = await seedCustomer();
    const adminToken = await seedSuperAdmin();
    const auth = { Authorization: `Bearer ${adminToken}` };

    const claim = await Claim.create({
      raisedByModel: 'User',
      raisedBy: user._id,
      brand: 'LG Partner Warranty',
      claimType: 'Extended Warranty',
      item: 'Compressor',
      amount: 4200,
      reason: 'Cooling failure within cover',
    });

    const list = await request(app).get('/api/v1/super-admin/claims').set(auth).expect(200);
    expect(list.body.data[0].raisedBy.name).toBe('Appliance Owner');
    expect(list.body.data[0].status).toBe('Pending Approval');

    await request(app)
      .patch(`/api/v1/super-admin/claims/${claim.id}/status`)
      .set(auth)
      .send({ status: 'Approved' })
      .expect(200);

    // The decision survives a reload — it used to live only in browser state.
    const after = await Claim.findById(claim.id);
    expect(after.status).toBe('Approved');
  });

  it('rejects an unknown status and a non-admin caller', async () => {
    const { user, token: custToken } = await seedCustomer();
    const adminToken = await seedSuperAdmin();
    const claim = await Claim.create({ raisedByModel: 'User', raisedBy: user._id, item: 'Fan motor', amount: 900 });

    await request(app)
      .patch(`/api/v1/super-admin/claims/${claim.id}/status`)
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ status: 'Maybe' })
      .expect(400);

    await request(app)
      .patch(`/api/v1/super-admin/claims/${claim.id}/status`)
      .set({ Authorization: `Bearer ${custToken}` })
      .send({ status: 'Approved' })
      .expect(403);
  });
});

describe('exchange trade-in base values', () => {
  it('is admin-managed and readable by a signed-in customer', async () => {
    const adminToken = await seedSuperAdmin();
    const { token: custToken } = await seedCustomer();

    const created = await request(app)
      .post('/api/v1/exchange/base-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'Mobile', brand: 'Apple', model: 'iPhone 14', baseValue: 25000 })
      .expect(200);
    expect(created.body.data.baseValue).toBe(25000);

    // Editing the same make/model updates the row rather than duplicating it.
    await request(app)
      .post('/api/v1/exchange/base-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'Mobile', brand: 'Apple', model: 'iPhone 14', baseValue: 22000 })
      .expect(200);
    expect(await ExchangeBaseValue.countDocuments()).toBe(1);

    const listed = await request(app)
      .get('/api/v1/exchange/base-values?category=Mobile')
      .set('Authorization', `Bearer ${custToken}`)
      .expect(200);
    expect(listed.body.data[0].baseValue).toBe(22000);
  });

  it('reports an unpriced model as not-found instead of quoting a fallback', async () => {
    const { token } = await seedCustomer();
    const res = await request(app)
      .get('/api/v1/exchange/base-values/lookup?category=Mobile&brand=Nokia&model=3310')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toMatchObject({ found: false, baseValue: null });
  });

  it('matches the make and model case-insensitively but not as a prefix', async () => {
    const adminToken = await seedSuperAdmin();
    const { token } = await seedCustomer();
    await request(app)
      .post('/api/v1/exchange/base-values')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'Mobile', brand: 'Apple', model: 'iPhone 14', baseValue: 25000 })
      .expect(200);

    const exact = await request(app)
      .get('/api/v1/exchange/base-values/lookup?category=Mobile&brand=apple&model=IPHONE 14')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(exact.body.data.found).toBe(true);

    // "iPhone 14 Pro" is a different device and must not inherit this price.
    const prefix = await request(app)
      .get('/api/v1/exchange/base-values/lookup?category=Mobile&brand=Apple&model=iPhone 14 Pro')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(prefix.body.data.found).toBe(false);
  });

  it('refuses writes from a customer', async () => {
    const { token } = await seedCustomer();
    await request(app)
      .post('/api/v1/exchange/base-values')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Mobile', brand: 'Apple', model: 'iPhone 14', baseValue: 999999 })
      .expect(403);
  });
});

describe('booking advance is actually charged', () => {
  it('creates a Razorpay order for an advance booking and only marks it paid on a valid signature', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };

    const category = await Category.create({ key: 'AC-PAY', name: 'AC-PAY', color: '#0D47A1' });
    await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
    await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 1000 });

    const res = await request(app)
      .post('/api/v1/bookings')
      .set(auth)
      .send({ category: 'AC-PAY', serviceSlug: 'repair', paymentMode: 'advance', paymentMethod: 'UPI' })
      .expect(201);

    const { booking, razorpay } = res.body.data;
    expect(booking.advanceAmount).toBeGreaterThan(0);
    expect(booking.advancePaid).toBe(false);
    expect(razorpay.orderId).toBeTruthy();

    // A forged signature must not mark the advance paid.
    await request(app)
      .post(`/api/v1/bookings/${booking.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'pay_fake', razorpaySignature: 'not-a-real-signature' })
      .expect(400);
    expect((await Booking.findById(booking.id)).advancePaid).toBe(false);

    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_real' });
    await request(app)
      .post(`/api/v1/bookings/${booking.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'pay_real', razorpaySignature: signature })
      .expect(200);

    expect((await Booking.findById(booking.id)).advancePaid).toBe(true);
    const payment = await Payment.findOne({ targetType: 'booking', targetId: booking.id });
    expect(payment.status).toBe('Success');
  });

  it('creates no gateway order for a pay-after booking', async () => {
    const { token } = await seedCustomer();
    const category = await Category.create({ key: 'AC-AFTER', name: 'AC-AFTER', color: '#0D47A1' });
    await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
    await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 1000 });

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'AC-AFTER', serviceSlug: 'repair', paymentMode: 'after' })
      .expect(201);

    expect(res.body.data.razorpay).toBeNull();
    expect(await Payment.countDocuments({ targetType: 'booking' })).toBe(0);
  });
});

describe('memberships', () => {
  it('prices from the catalogue and only activates once the signature verifies', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const plan = await Membership.create({ name: 'Gold Plan', price: 999, tierRank: 2, benefits: ['10% off'] });

    const before = await request(app).get('/api/v1/memberships/me').set(auth).expect(200);
    expect(before.body.data).toBeNull();

    const purchase = await request(app)
      .post('/api/v1/memberships/purchase')
      .set(auth)
      .send({ planId: plan.id, paymentMethod: 'UPI' })
      .expect(201);

    const { membership, razorpay } = purchase.body.data;
    expect(membership.status).toBe('Pending Payment');
    expect(membership.pricePaid).toBe(999);

    // Unpaid means not a member.
    const during = await request(app).get('/api/v1/memberships/me').set(auth).expect(200);
    expect(during.body.data).toBeNull();

    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_mem' });
    await request(app)
      .post(`/api/v1/memberships/${membership.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'pay_mem', razorpaySignature: signature })
      .expect(200);

    const after = await request(app).get('/api/v1/memberships/me').set(auth).expect(200);
    expect(after.body.data.membership.name).toBe('Gold Plan');
  });

  it('refuses a second membership while one is active', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const plan = await Membership.create({ name: 'Silver Plan', price: 499, tierRank: 1 });

    const purchase = await request(app).post('/api/v1/memberships/purchase').set(auth).send({ planId: plan.id }).expect(201);
    const { membership, razorpay } = purchase.body.data;
    await request(app)
      .post(`/api/v1/memberships/${membership.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'p1', razorpaySignature: signForTesting({ orderId: razorpay.orderId, paymentId: 'p1' }) })
      .expect(200);

    await request(app).post('/api/v1/memberships/purchase').set(auth).send({ planId: plan.id }).expect(409);
  });

  it("refuses to verify another customer's membership", async () => {
    const owner = await seedCustomer();
    const attacker = await seedCustomer();
    const plan = await Membership.create({ name: 'Gold Plan', price: 999, tierRank: 2 });

    const purchase = await request(app)
      .post('/api/v1/memberships/purchase')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ planId: plan.id })
      .expect(201);

    await request(app)
      .post(`/api/v1/memberships/${purchase.body.data.membership.id}/verify-payment`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ razorpayPaymentId: 'p', razorpaySignature: 'x' })
      .expect(403);
  });

  it('reports an expired membership as no longer active', async () => {
    const { user, token } = await seedCustomer();
    const plan = await Membership.create({ name: 'Gold Plan', price: 999, tierRank: 2 });
    await UserMembership.create({
      user: user._id,
      membership: plan._id,
      pricePaid: 999,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'Active',
    });

    const res = await request(app).get('/api/v1/memberships/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data).toBeNull();
  });

  it('lists plans without authentication but requires it to buy', async () => {
    await Membership.create({ name: 'Gold Plan', price: 999, tierRank: 2 });
    const res = await request(app).get('/api/v1/memberships/plans').expect(200);
    expect(res.body.data).toHaveLength(1);

    await request(app).post('/api/v1/memberships/purchase').send({ planId: res.body.data[0].id }).expect(401);
  });
});

describe('GET /notifications/:id', () => {
  it('returns the notification and does not shadow the literal routes beside it', async () => {
    const { user, token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };

    // A `/:id` route declared before these would swallow them.
    await request(app).get('/api/v1/notifications/preferences').set(auth).expect(200);

    const notification = await Notification.create({
      recipient: user._id,
      type: 'created',
      title: 'Booking confirmed',
      message: 'Your AC service is booked.',
    });

    const res = await request(app).get(`/api/v1/notifications/${notification.id}`).set(auth).expect(200);
    expect(res.body.data.title).toBe('Booking confirmed');
  });

  it("refuses another customer's notification", async () => {
    const owner = await seedCustomer();
    const other = await seedCustomer();
    const notification = await Notification.create({
      recipient: owner.user._id,
      type: 'created',
      title: 'Private',
    });

    await request(app)
      .get(`/api/v1/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
  });
});

describe('super-admin order administration', () => {
  async function seedOrder(userId, status = 'Placed') {
    const product = await Product.create({ category: 'AC', name: 'Split AC', price: 30000, stock: 5 });
    return Order.create({
      user: userId,
      items: [{ product: product._id, name: product.name, price: product.price, quantity: 1 }],
      subtotal: 30000,
      total: 30000,
      status,
    });
  }

  it('lists every order, not just the admin\'s own', async () => {
    const customer = await seedCustomer();
    const adminToken = await seedSuperAdmin();
    await seedOrder(customer.user._id);

    // The console used to call the customer-scoped GET /orders, which filters
    // on the caller's own id — an admin saw nothing.
    const mine = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${adminToken}`);
    const admin = await request(app).get('/api/v1/super-admin/orders').set('Authorization', `Bearer ${adminToken}`).expect(200);

    expect(admin.body.data).toHaveLength(1);
    expect(admin.body.data[0].user.name).toBe('Appliance Owner');
    expect(mine.body.data || []).toHaveLength(0);
  });

  it('records the real tracking details when an order ships', async () => {
    const customer = await seedCustomer();
    const adminToken = await seedSuperAdmin();
    const order = await seedOrder(customer.user._id);

    const res = await request(app)
      .patch(`/api/v1/super-admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Shipped', trackingNumber: 'BD1234567', courierPartner: 'BlueDart' })
      .expect(200);

    expect(res.body.data.status).toBe('Shipped');
    expect(res.body.data.trackingNumber).toBe('BD1234567');
    expect(res.body.data.courierPartner).toBe('BlueDart');
  });

  it('refuses to move an order backwards or reopen a delivered one', async () => {
    const customer = await seedCustomer();
    const adminToken = await seedSuperAdmin();
    const auth = { Authorization: `Bearer ${adminToken}` };

    const shipped = await seedOrder(customer.user._id, 'Shipped');
    await request(app).patch(`/api/v1/super-admin/orders/${shipped.id}/status`).set(auth).send({ status: 'Placed' }).expect(400);

    const delivered = await seedOrder(customer.user._id, 'Delivered');
    await request(app).patch(`/api/v1/super-admin/orders/${delivered.id}/status`).set(auth).send({ status: 'Shipped' }).expect(409);
  });

  it('is super-admin only', async () => {
    const customer = await seedCustomer();
    await request(app).get('/api/v1/super-admin/orders').set('Authorization', `Bearer ${customer.token}`).expect(403);
  });
});

describe('escalation priority', () => {
  it('persists a priority change independently of status', async () => {
    const adminToken = await seedSuperAdmin();
    const auth = { Authorization: `Bearer ${adminToken}` };
    const customer = await seedCustomer();

    const sr = await ServiceRequest.create({
      user: customer.user._id,
      category: 'AC',
      description: 'Escalated job',
      requestMode: 'B2C',
    });
    const escalation = await Escalation.create({ scope: 'platform', serviceRequest: sr._id, reason: 'Repeat visit' });

    const res = await request(app)
      .patch(`/api/v1/super-admin/escalations/${escalation.id}/priority`)
      .set(auth)
      .send({ priority: 'High' })
      .expect(200);

    expect(res.body.data.priority).toBe('High');
    // The status is untouched — the console's "Escalate" button changes only priority.
    expect(res.body.data.status).toBe('Open');
    expect((await Escalation.findById(escalation.id)).priority).toBe('High');
  });

  it('rejects a priority outside the schema', async () => {
    const adminToken = await seedSuperAdmin();
    const customer = await seedCustomer();
    const sr = await ServiceRequest.create({ user: customer.user._id, category: 'AC', description: 'x', requestMode: 'B2C' });
    const escalation = await Escalation.create({ scope: 'platform', serviceRequest: sr._id });

    await request(app)
      .patch(`/api/v1/super-admin/escalations/${escalation.id}/priority`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 'Urgent' })
      .expect(400);
  });
});

describe('warranty and AMC purchases are charged', () => {
  it('creates a gateway order for a policy and only marks it paid on a valid signature', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const plan = await ExtendedWarrantyPlan.create({ name: '1-Year', durationYears: 1, price: 799, claimsTotal: 2 });

    const res = await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set(auth)
      .send({ plan: plan.id, category: 'AC', brand: 'LG' })
      .expect(201);

    const { order, razorpay } = res.body.data;
    expect(order.paid).toBe(false);
    expect(razorpay.orderId).toBeTruthy();

    await request(app)
      .post(`/api/v1/warranty-amc/extended-warranty/orders/${order.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'p', razorpaySignature: 'forged' })
      .expect(400);
    expect((await ExtendedWarrantyOrder.findById(order.id)).paid).toBe(false);

    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_ew' });
    await request(app)
      .post(`/api/v1/warranty-amc/extended-warranty/orders/${order.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'pay_ew', razorpaySignature: signature })
      .expect(200);

    expect((await ExtendedWarrantyOrder.findById(order.id)).paid).toBe(true);
    expect((await Payment.findOne({ targetType: 'extended_warranty' })).status).toBe('Success');
  });

  it('charges an AMC subscription at the plan price', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const plan = await AMCPlan.create({ name: 'Annual Protection Plan', tier: 'Gold', price: 2499, visitsTotal: 4 });

    const res = await request(app)
      .post('/api/v1/warranty-amc/amc/subscriptions')
      .set(auth)
      .send({ plan: plan.id, brand: 'LG', model: 'Double Door' })
      .expect(201);

    const { subscription, razorpay } = res.body.data;
    expect(subscription.paid).toBe(false);
    expect(razorpay.amount).toBe(2499 * 100);

    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_amc' });
    await request(app)
      .post(`/api/v1/warranty-amc/amc/subscriptions/${subscription.id}/verify-payment`)
      .set(auth)
      .send({ razorpayPaymentId: 'pay_amc', razorpaySignature: signature })
      .expect(200);

    expect((await AMCSubscription.findById(subscription.id)).paid).toBe(true);
  });

  it("refuses to verify another customer's policy payment", async () => {
    const owner = await seedCustomer();
    const attacker = await seedCustomer();
    const plan = await ExtendedWarrantyPlan.create({ name: '1-Year', durationYears: 1, price: 799 });

    const res = await request(app)
      .post('/api/v1/warranty-amc/extended-warranty/orders')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ plan: plan.id, category: 'AC' })
      .expect(201);

    const { order, razorpay } = res.body.data;
    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_x' });

    await request(app)
      .post(`/api/v1/warranty-amc/extended-warranty/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ razorpayPaymentId: 'pay_x', razorpaySignature: signature })
      .expect(403);
    expect((await ExtendedWarrantyOrder.findById(order.id)).paid).toBe(false);
  });
});

describe('super-admin user list counts', () => {
  it('returns real appliance and service counts per customer', async () => {
    const withHistory = await seedCustomer();
    const withoutHistory = await seedCustomer();
    const adminToken = await seedSuperAdmin();

    await OwnedAppliance.create([
      { user: withHistory.user._id, category: 'AC' },
      { user: withHistory.user._id, category: 'Refrigerator' },
    ]);
    await ServiceRequest.create({
      user: withHistory.user._id,
      category: 'AC',
      description: 'Past job',
      requestMode: 'B2C',
    });

    const res = await request(app)
      .get('/api/v1/super-admin/users?role=customer')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const busy = res.body.data.find((u) => u.id === withHistory.user.id);
    const quiet = res.body.data.find((u) => u.id === withoutHistory.user.id);

    // Both columns used to read zero for everyone — they were never returned.
    expect(busy.appliancesCount).toBe(2);
    expect(busy.servicesCount).toBe(1);
    expect(quiet.appliancesCount).toBe(0);
    expect(quiet.servicesCount).toBe(0);

    // Still no password material in the payload.
    expect(busy.passwordHash).toBeUndefined();
  });
});

describe('exchange credit only applies after inspection', () => {
  async function seedProduct(price = 30000) {
    return Product.create({ category: 'AC', name: 'Split AC', price, stock: 10 });
  }

  it('refuses an un-inspected trade-in rather than discounting the order', async () => {
    const { user, token } = await seedCustomer();
    const product = await seedProduct();

    const exchange = await ExchangeRequest.create({
      user: user._id,
      category: 'Mobile',
      brand: 'Apple',
      model: 'iPhone 14',
      estimatedValue: 25000,
      baseValue: 25000,
      status: 'Pending Inspection',
    });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId: exchange.id, paymentMethod: 'Cash' })
      .expect(400);
    expect(res.body.error.message).toMatch(/inspection/i);

    // No order was created, so no discount leaked through.
    expect(await Order.countDocuments()).toBe(0);
  });

  it('applies the stored valuation once inspection is approved, and only once', async () => {
    const { user, token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const product = await seedProduct(30000);

    const exchange = await ExchangeRequest.create({
      user: user._id,
      category: 'Mobile',
      brand: 'Apple',
      model: 'iPhone 14',
      estimatedValue: 25000,
      baseValue: 25000,
      status: 'Inspection Approved',
    });

    const first = await request(app)
      .post('/api/v1/orders')
      .set(auth)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId: exchange.id, paymentMethod: 'Cash' })
      .expect(201);

    // The discount is the server's stored valuation, not anything the client sent.
    expect(first.body.data.exchangeDiscount).toBe(25000);
    expect(first.body.data.total).toBe(5000);

    // The same trade-in cannot be spent twice.
    await request(app)
      .post('/api/v1/orders')
      .set(auth)
      .send({ items: [{ productId: product.id, quantity: 1 }], exchangeRequestId: exchange.id, paymentMethod: 'Cash' })
      .expect(400);
  });
});

describe('AMC plan catalogue', () => {
  it('is served to customers and prices the subscription from it', async () => {
    const { token } = await seedCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const plan = await AMCPlan.create({ name: 'Gold AMC', tier: 'Gold', price: 2499, visitsTotal: 4 });
    await AMCPlan.create({ name: 'Retired AMC', tier: 'Silver', price: 99, visitsTotal: 1, isActive: false });

    const listed = await request(app).get('/api/v1/warranty-amc/amc/plans').set(auth).expect(200);
    // Only live plans are offered.
    expect(listed.body.data.map((p) => p.name)).toEqual(['Gold AMC']);

    const res = await request(app)
      .post('/api/v1/warranty-amc/amc/subscriptions')
      .set(auth)
      .send({ plan: plan.id, brand: 'LG' })
      .expect(201);

    // The visit allowance and the charge both come from the plan.
    expect(res.body.data.subscription.visitsTotal).toBe(4);
    expect(res.body.data.razorpay.amount).toBe(2499 * 100);
  });
});
