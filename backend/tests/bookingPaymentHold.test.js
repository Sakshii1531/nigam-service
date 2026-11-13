import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { expireUnpaidBookings, settleBookingAdvance } from '../src/modules/booking/booking.service.js';
import { reconcilePendingPayments, settleCapturedEntity } from '../src/modules/payments-wallet/paymentSettlement.service.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { seedSimpleOffering, offeringBooking, clearCatalogue } from './helpers/catalogue.js';

const TEST_DB_URI = testDbUri('bookingPaymentHold');
let app;

async function login({ role, identifier }) {
  const res = await request(app).post('/api/v1/auth/login').send({ role, identifier, password: 'password123' }).expect(200);
  return res.body.data.accessToken;
}

async function seedCustomer(phone = '9400000001') {
  await User.create({ role: ROLES.CUSTOMER, phone, name: 'Pay Customer', passwordHash: await hashPassword('password123') });
  return login({ role: ROLES.CUSTOMER, identifier: phone });
}

async function seedPartner(phone = '9500000001') {
  const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name: 'Pay Partner', passwordHash: await hashPassword('password123') });
  const serviceProvider = await ServiceProvider.create({ user: user._id, name: 'Pay Partner', phone, status: 'Active', availability: 'Available', specs: ['AC'] });
  return { serviceProvider, token: await login({ role: ROLES.SERVICE_PROVIDER, identifier: phone }) };
}

async function seedAdvanceBooking(token) {
  const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
  await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
  await seedSimpleOffering({ categoryKey: 'AC', price: 1000 });
  const res = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send(await offeringBooking('TEST-REPAIR', { paymentMode: 'advance', paymentMethod: 'UPI' }))
    .expect(201);
  return res.body.data;
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
    ProductType.deleteMany({}),
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Payment.deleteMany({}),
  ]);
});

describe('an unpaid online advance is not dispatched', () => {
  it('holds the booking: no partner is assigned and none can see or accept it until the advance is paid', async () => {
    const { serviceProvider, token: partnerToken } = await seedPartner();
    const token = await seedCustomer();
    const { booking, serviceRequest, serviceProvider: assigned, razorpay } = await seedAdvanceBooking(token);

    expect(razorpay.orderId).toBeTruthy();
    expect(assigned).toBeNull();
    expect(booking.serviceProvider).toBeNull();
    expect(serviceRequest.status).toBe('New');
    const held = await ServiceRequest.findById(serviceRequest.id);
    expect(held.paymentHold).toBe(true);
    expect((await Booking.findById(booking.id)).paymentExpiresAt).toBeTruthy();

    // The partner's feed is empty and a direct accept is refused.
    const feed = await request(app).get('/api/v1/service-provider/jobs/available').set('Authorization', `Bearer ${partnerToken}`).expect(200);
    expect(feed.body.data).toHaveLength(0);
    await request(app).post(`/api/v1/service-provider/jobs/accept/${serviceRequest.id}`).set('Authorization', `Bearer ${partnerToken}`).send({}).expect(409);

    // Paying releases it to the partner.
    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_hold_1' });
    await request(app).post(`/api/v1/bookings/${booking.id}/verify-payment`).set('Authorization', `Bearer ${token}`).send({ razorpayPaymentId: 'pay_hold_1', razorpaySignature: signature }).expect(200);

    const released = await ServiceRequest.findById(serviceRequest.id);
    expect(released.paymentHold).toBe(false);
    expect(released.status).toBe('Assigned');
    expect(String(released.serviceProvider)).toBe(String(serviceProvider._id));
    const paid = await Booking.findById(booking.id);
    expect(paid.advancePaid).toBe(true);
    expect(paid.paymentExpiresAt).toBeNull();
    expect(String(paid.serviceProvider)).toBe(String(serviceProvider._id));
  });

  it('a pay-after booking is still dispatched immediately', async () => {
    const { serviceProvider } = await seedPartner();
    const token = await seedCustomer();
    const category = await Category.create({ key: 'AC', name: 'AC', color: '#0D47A1' });
    await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
    await seedSimpleOffering({ categoryKey: 'AC', price: 1000 });
    const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(await offeringBooking('TEST-REPAIR', { paymentMode: 'after' })).expect(201);
    expect(res.body.data.serviceRequest.status).toBe('Assigned');
    expect(res.body.data.booking.serviceProvider).toBe(serviceProvider.id);
  });

  it('cancels a booking whose advance is never paid, and fails its payment', async () => {
    await seedPartner();
    const token = await seedCustomer();
    const { booking, serviceRequest } = await seedAdvanceBooking(token);

    // Not yet due: nothing happens.
    expect((await expireUnpaidBookings()).expired).toBe(0);

    await Booking.updateOne({ _id: booking.id }, { $set: { paymentExpiresAt: new Date(Date.now() - 1000) } });
    expect((await expireUnpaidBookings()).expired).toBe(1);

    expect((await Booking.findById(booking.id)).status).toBe('Cancelled');
    expect((await ServiceRequest.findById(serviceRequest.id)).status).toBe('Cancelled');
    expect((await Payment.findOne({ targetType: 'booking', targetId: booking.id })).status).toBe('Failed');
  });
});

describe('payment arrives without the customer\'s browser', () => {
  it('settles an advance exactly once however many sources report it, and the browser can still confirm after', async () => {
    const { serviceProvider } = await seedPartner();
    const token = await seedCustomer();
    const { booking, razorpay } = await seedAdvanceBooking(token);

    const payment = await Payment.findOne({ targetType: 'booking', targetId: booking.id });
    // Razorpay's webhook reports the capture first...
    const entity = { id: 'pay_wh_1', order_id: razorpay.orderId, status: 'captured', amount: razorpay.amount, currency: 'INR', method: 'upi' };
    expect(await settleCapturedEntity(entity)).toBe(true);
    // ...a duplicate delivery / the sweep finds nothing left to do...
    expect(await settleCapturedEntity(entity)).toBe(false);
    const again = await settleBookingAdvance(payment, 'pay_wh_1');
    expect(again.settled).toBe(false);

    expect((await Booking.findById(booking.id)).advancePaid).toBe(true);
    expect(String((await Booking.findById(booking.id)).serviceProvider)).toBe(String(serviceProvider._id));
    expect(await Payment.countDocuments({ targetType: 'booking', targetId: booking.id, status: 'Success' })).toBe(1);

    // ...and the customer's browser, arriving late with the same payment, still gets a clean 200.
    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_wh_1' });
    await request(app).post(`/api/v1/bookings/${booking.id}/verify-payment`).set('Authorization', `Bearer ${token}`).send({ razorpayPaymentId: 'pay_wh_1', razorpaySignature: signature }).expect(200);
    // A different payment id for the same booking is refused.
    const other = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_other' });
    await request(app).post(`/api/v1/bookings/${booking.id}/verify-payment`).set('Authorization', `Bearer ${token}`).send({ razorpayPaymentId: 'pay_other', razorpaySignature: other }).expect(409);
  });

  it('rejects a webhook whose amount does not match what the customer was asked to pay', async () => {
    await seedPartner();
    const token = await seedCustomer();
    const { booking, razorpay } = await seedAdvanceBooking(token);
    const entity = { id: 'pay_wh_bad', order_id: razorpay.orderId, status: 'captured', amount: razorpay.amount - 100, currency: 'INR', method: 'upi' };
    expect(await settleCapturedEntity(entity)).toBe(false);
    expect((await Booking.findById(booking.id)).advancePaid).toBe(false);
  });

  it('refunds money that arrives after the booking was already cancelled', async () => {
    await seedPartner();
    const token = await seedCustomer();
    const { booking, razorpay } = await seedAdvanceBooking(token);
    await Booking.updateOne({ _id: booking.id }, { $set: { paymentExpiresAt: new Date(Date.now() - 1000) } });
    await expireUnpaidBookings();
    // The expiry marked the Payment Failed, so make it Pending again to model a payment
    // that was still in flight when we gave up (the gateway captured it afterwards).
    await Payment.updateOne({ targetType: 'booking', targetId: booking.id }, { $set: { status: 'Pending' } });

    const entity = { id: 'pay_late_1', order_id: razorpay.orderId, status: 'captured', amount: razorpay.amount, currency: 'INR', method: 'card' };
    expect(await settleCapturedEntity(entity)).toBe(true);

    const payment = await Payment.findOne({ targetType: 'booking', targetId: booking.id });
    expect(payment.status).toBe('Refunded');
    expect(payment.refundError).toBeNull();
    const after = await Booking.findById(booking.id);
    expect(after.status).toBe('Cancelled');
    expect(after.advancePaid).toBe(false);

    // The customer's own late confirmation is told the truth, not "paid".
    const signature = signForTesting({ orderId: razorpay.orderId, paymentId: 'pay_late_1' });
    await request(app).post(`/api/v1/bookings/${booking.id}/verify-payment`).set('Authorization', `Bearer ${token}`).send({ razorpayPaymentId: 'pay_late_1', razorpaySignature: signature }).expect(409);
  });

  it('the reconciliation sweep is a safe no-op when the gateway is not configured', async () => {
    await seedPartner();
    const token = await seedCustomer();
    await seedAdvanceBooking(token);
    await Payment.updateMany({}, { $set: { createdAt: new Date(Date.now() - 10 * 60 * 1000) } });
    const result = await reconcilePendingPayments();
    expect(result.settled).toBe(0);
  });
});
