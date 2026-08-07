import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/technician/job.model.js';
import { EarningsTally } from '../src/modules/technician/earningsTally.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { Conversation } from '../src/modules/chat/conversation.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('fullJourney');

let app;

async function loginAndVerify({ role, identifier, password }) {
  await request(app).post('/api/v1/auth/login').send({ role, identifier, password }).expect(200);
  const code = readOtpCode(identifier);
  const res = await request(app).post('/api/v1/auth/otp/verify').send({ role, identifier, code }).expect(200);
  return res.body.data.accessToken;
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
    Technician.deleteMany({}),
    Category.deleteMany({}),
    ProductType.deleteMany({}),
    ServiceCatalogItem.deleteMany({}),
    Booking.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Job.deleteMany({}),
    EarningsTally.deleteMany({}),
    Payment.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Conversation.deleteMany({}),
  ]);
});

describe('Phase 10 — the real customer journey end to end: browse -> book -> technician completes -> pay -> review', () => {
  it('walks the entire flow through real HTTP calls against every layer, asserting the side effects at each step', async () => {
    // 1. Seed catalog + a real technician who will win auto-assignment.
    const category = await Category.create({ key: 'AC', name: 'AC', color: '#000' });
    await ProductType.create({ category: category._id, slug: 'split', name: 'Split AC' });
    await ServiceCatalogItem.create({ category: category._id, slug: 'repair', name: 'Repair', price: 999 });

    const techUser = await User.create({ role: ROLES.TECHNICIAN, phone: '9199999001', name: 'Journey Tech', passwordHash: await hashPassword('password123') });
    const technician = await Technician.create({ user: techUser._id, name: 'Journey Tech', phone: '9199999001', status: 'Active', availability: 'Available', specs: ['AC'] });

    await User.create({ role: ROLES.CUSTOMER, phone: '9199999002', name: 'Journey Customer', passwordHash: await hashPassword('password123') });

    const customerToken = await loginAndVerify({ role: ROLES.CUSTOMER, identifier: '9199999002', password: 'password123' });
    const techToken = await loginAndVerify({ role: ROLES.TECHNICIAN, identifier: '9199999001', password: 'password123' });

    // 2. Browse the catalog (public read).
    const catalogRes = await request(app).get('/api/v1/catalog/categories').expect(200);
    expect(catalogRes.body.data.some((c) => c.key === 'AC')).toBe(true);

    // 3. Book — auto-assigns the technician, fires notifications, opens no
    // conversation yet (that happens on job acceptance).
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ category: 'AC', serviceSlug: 'repair', address: { city: 'Lucknow' }, fullName: 'Journey Customer', mobile: '9199999002' })
      .expect(201);
    const { booking, serviceRequest } = bookingRes.body.data;
    expect(booking.totalPrice).toBe(999);
    expect(serviceRequest.status).toBe('Assigned');

    const notifsAfterBooking = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(notifsAfterBooking.body.data.some((n) => n.type === 'created')).toBe(true);
    expect(notifsAfterBooking.body.data.some((n) => n.type === 'assigned')).toBe(true);

    // 4. Technician accepts — auto-creates the chat conversation.
    const acceptRes = await request(app)
      .post(`/api/v1/tech/jobs/accept/${serviceRequest.id}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({})
      .expect(200);
    const jobId = acceptRes.body.data.id;

    const convoRes = await request(app).get('/api/v1/chat/conversations').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(convoRes.body.data).toHaveLength(1);

    // 5. Full job lifecycle to completion.
    await request(app).post(`/api/v1/tech/jobs/${jobId}/start-travel`).set('Authorization', `Bearer ${techToken}`).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/arrive`).set('Authorization', `Bearer ${techToken}`).expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/diagnosis`).set('Authorization', `Bearer ${techToken}`).send({ notes: 'Gas leak' }).expect(200);
    await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/spare-parts`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ parts: [{ name: 'Gas Refill', price: 300, checked: true }] })
      .expect(200);
    await request(app).post(`/api/v1/tech/jobs/${jobId}/repair-complete`).set('Authorization', `Bearer ${techToken}`).expect(200);
    const billingRes = await request(app).post(`/api/v1/tech/jobs/${jobId}/billing`).set('Authorization', `Bearer ${techToken}`).expect(200);
    const { total: billedTotal } = billingRes.body.data.billingEstimate;

    const payRes = await request(app)
      .post(`/api/v1/tech/jobs/${jobId}/collect-payment`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ paymentMethod: 'Cash' })
      .expect(200);
    expect(payRes.body.data.job.activeStep).toBe('completed');
    expect(payRes.body.data.payment.amount).toBeCloseTo(billedTotal, 2);

    const srAfterPayment = await request(app).get(`/api/v1/service-requests/${serviceRequest.id}`).set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(srAfterPayment.body.data.status).toBe('Customer Confirmation');

    const notifsAfterPayment = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(notifsAfterPayment.body.data.some((n) => n.type === 'payment')).toBe(true);
    expect(notifsAfterPayment.body.data.some((n) => n.type === 'completed')).toBe(true);

    const tally = await EarningsTally.findOne({ technician: technician._id });
    expect(tally.total).toBeGreaterThan(0);

    // 6. Customer leaves a review.
    const reviewRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceRequest: serviceRequest.id, rating: 5, comment: 'Fixed it fast!', tags: ['On time', 'Professional'] })
      .expect(201);
    expect(reviewRes.body.data.technician).toBe(technician.id);

    // 7. The technician's public review list reflects it.
    const techReviewsRes = await request(app).get(`/api/v1/reviews/technicians/${technician.id}`).expect(200);
    expect(techReviewsRes.body.data).toHaveLength(1);
    expect(techReviewsRes.body.data[0].rating).toBe(5);

    // 8. A second review attempt on the same request is rejected — one review per job.
    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceRequest: serviceRequest.id, rating: 1 })
      .expect(409);
  });
});
