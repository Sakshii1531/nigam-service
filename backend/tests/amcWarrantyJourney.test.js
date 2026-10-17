import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyPlan } from '../src/modules/warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { EarningsTally } from '../src/modules/service-provider/earningsTally.model.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { seedSimpleOffering } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';

let app;
const flow = jobFlow(() => app, { phoneStart: 9381700000 });
const call = (method, path, token, body) => request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body);
beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('amcWarrantyJourney'));
  await ensureIndexes();
  app = createApp().listen(0);
}, 60000);
afterAll(async () => {
  await awaitPendingDeliveries();
  if (app) await new Promise(resolve => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await awaitPendingDeliveries();
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
});

describe('paid AMC and extended-warranty lifecycle', () => {
  it.each(['amc', 'extended-warranty'])('%s: purchase, payment, coverage, two completed visits, history, and allowance exhaustion', async kind => {
    const offering = await seedSimpleOffering({ categoryKey: 'AC', price: 500 });
    const customer = await flow.customer();
    const partner = await flow.partner(['AC']);
    const appliance = (await call('post', '/appliances', customer.token, {
      category: 'AC', brand: 'Catalogue Manufacturer', modelNumber: 'UNIT-1', serialNumber: 'SERIAL-1',
      purchaseDate: new Date(Date.now() - 4 * 365 * 864e5).toISOString(),
    }).expect(201)).body.data;
    const plan = kind === 'amc'
      ? await AMCPlan.create({ name: 'AC Silver', tier: 'Silver', applianceCategory: 'AC', price: 999, visitsTotal: 2, durationMonths: 6 })
      : await ExtendedWarrantyPlan.create({ name: 'AC Shield', applianceCategory: 'AC', price: 1499, claimsTotal: 2, durationYears: 2 });
    const basePath = kind === 'amc' ? '/warranty-amc/amc/subscriptions' : '/warranty-amc/extended-warranty/orders';
    const result = (await call('post', basePath, customer.token, {
      plan: plan.id, appliance: appliance.id, category: 'AC', brand: appliance.brand, model: 'UNIT-1', modelName: 'UNIT-1',
      amountPaid: 1, visitsTotal: 100, claimsTotal: 100,
    }).expect(201)).body.data;
    const policy = result.subscription || result.order;
    expect(result.razorpay.amount).toBe(plan.price * 100);
    expect(policy.paid).toBe(false);
    const quoteBody = { lines: [{ offeringId: offering.id, quantity: 1 }], warranty: { brand: appliance.brand, applianceId: appliance.id } };
    const quote = async () => (await call('post', '/catalog/quote', customer.token, quoteBody).expect(200)).body.data;
    expect((await quote()).totals.final).toBe(500);
    const paymentId = `pay_${kind}`;
    const verifyBody = { razorpayPaymentId: paymentId, razorpaySignature: signForTesting({ orderId: result.razorpay.orderId, paymentId }) };
    await call('post', `${basePath}/${policy.id}/verify-payment`, customer.token, verifyBody).expect(200);
    // A retried gateway callback must acknowledge the same verified purchase.
    await call('post', `${basePath}/${policy.id}/verify-payment`, customer.token, verifyBody).expect(200);
    expect((await quote()).totals.final).toBe(0);
    const listed = (await call('get', basePath, customer.token).expect(200)).body.data;
    expect(listed.find(item => item.id === policy.id).paid).toBe(true);
    if (kind === 'amc') expect(listed[0].plan.name).toBe('AC Silver');

    const policyModel = kind === 'amc' ? AMCSubscription : ExtendedWarrantyOrder;
    const remaining = async () => {
      const saved = await policyModel.findById(policy.id);
      return kind === 'amc' ? saved.visitsRemaining : saved.claimsRemaining;
    };
    for (let visit = 1; visit <= 2; visit += 1) {
      const bookingResult = (await call('post', '/bookings', customer.token, {
        offeringId: offering.id, quantity: 1, expectedFinalAmount: 0,
        brand: appliance.brand, applianceId: appliance.id, paymentMode: 'after',
      }).expect(201)).body.data;
      const { booking, serviceRequest } = bookingResult;
      expect(booking.totalPrice).toBe(0);
      expect(bookingResult.razorpay).toBeFalsy();
      const job = (await call('post', `/service-provider/jobs/accept/${serviceRequest.id}`, partner.token, {}).expect(200)).body.data;
      expect(job.type).toBe(kind === 'amc' ? 'AMC Visit' : 'NCC Extended Warranty');
      expect(kind === 'amc' ? job.amc.planName : job.ew.planName).toBe(plan.name);
      for (const action of ['start-travel', 'arrive']) await call('post', `/service-provider/jobs/${job.id}/${action}`, partner.token, {}).expect(200);
      await call('post', `/service-provider/jobs/${job.id}/diagnosis`, partner.token, { notes: 'Scheduled covered repair' }).expect(200);
      await call('post', `/service-provider/jobs/${job.id}/spare-parts`, partner.token, { parts: [{ name: 'Covered capacitor', price: 500, checked: true }] }).expect(200);
      await call('post', `/service-provider/jobs/${job.id}/repair-complete`, partner.token, {}).expect(200);
      const billing = (await call('post', `/service-provider/jobs/${job.id}/billing`, partner.token, {}).expect(200)).body.data.billingEstimate;
      expect(billing.total).toBe(0);
      expect(billing.amountToCollect).toBe(0);
      expect(billing.sparePartsTotal).toBe(0);
      await call('post', `/service-provider/jobs/${job.id}/collect-payment`, partner.token, { otp: 'invalid' }).expect(400);
      expect(await remaining()).toBe(3 - visit);
      const completion = { otp: booking.completionOtp, paymentMethod: 'Cash' };
      await call('post', `/service-provider/jobs/${job.id}/collect-payment`, partner.token, completion).expect(200);
      expect(await remaining()).toBe(2 - visit);
      // A network retry must not consume a second visit/claim or credit earnings twice.
      await call('post', `/service-provider/jobs/${job.id}/collect-payment`, partner.token, completion).expect(200);
      expect(await remaining()).toBe(2 - visit);
      expect(await Payment.countDocuments({ targetType: 'job', targetId: job.id, status: 'Success' })).toBe(1);
      const tally = await EarningsTally.findOne({ serviceProvider: partner.serviceProvider._id });
      expect(tally.completedTotal).toBe(visit);
      const bookings = (await call('get', '/bookings', customer.token).expect(200)).body.data;
      expect(bookings.find(item => item.id === booking.id).status).toBe('Completed');
      if (kind === 'amc') {
        const history = (await call('get', `/service-provider/jobs/${job.id}/amc-history`, partner.token).expect(200)).body.data;
        expect(history.subscription.planName).toBe('AC Silver');
        expect(history.visits).toHaveLength(visit);
        expect(history.visits.every(item => item.status === 'Completed')).toBe(true);
      }
    }
    expect((await quote()).totals.final).toBe(500);
    const updated = (await call('get', `/appliances/${appliance.id}`, customer.token).expect(200)).body.data;
    expect(updated.warrantyStatus).toBe('Out of Warranty');
  });
});
