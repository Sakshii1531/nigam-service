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
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { seedTestCatalogue, clearCatalogue, offeringBooking } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { testDbUri } from './helpers/testDb.js';

// The inspection photos are "Required for verification" in the partner app.
// The server used to treat them as optional, so a partner could skip them.

let app;
const { partner, customer } = jobFlow(() => app);

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('inspection_photos'));
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
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job, Payment].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
});

async function jobAtInspection() {
  const sp = await partner(['TV']);
  const cust = await customer();
  const booked = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust.token}`).send(await offeringBooking('TV-LED-32-INSTALL')).expect(201);
  const auth = { Authorization: `Bearer ${sp.token}` };
  const accepted = await request(app).post(`/api/v1/service-provider/jobs/accept/${booked.body.data.serviceRequest.id}`).set(auth).send({}).expect(200);
  const jobId = accepted.body.data.id;
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/start-travel`).set(auth).expect(200);
  await request(app).post(`/api/v1/service-provider/jobs/${jobId}/arrive`).set(auth).expect(200);
  return { jobId, auth };
}

const leave = ({ jobId, auth }) => request(app).post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`).set(auth).send({ parts: [], additionalServices: [] });

describe('inspection photos are enforced on the server', () => {
  it('will not leave the inspection with no photos, or with only one of the two', async () => {
    const job = await jobAtInspection();
    await request(app).post(`/api/v1/service-provider/jobs/${job.jobId}/diagnosis`).set(job.auth).send({ notes: 'Looks fine' }).expect(200);

    const none = await leave(job).expect(400);
    expect(JSON.stringify(none.body)).toMatch(/product photo and the serial-number photo/i);

    await request(app).post(`/api/v1/service-provider/jobs/${job.jobId}/diagnosis`).set(job.auth).send({ photos: { product: 'https://example.test/p.jpg' } }).expect(200);
    await leave(job).expect(400);
  });

  it('moves on once the product and serial photos are saved (they can be added one at a time)', async () => {
    const job = await jobAtInspection();
    await request(app).post(`/api/v1/service-provider/jobs/${job.jobId}/diagnosis`).set(job.auth).send({ photos: { product: 'https://example.test/p.jpg' } }).expect(200);
    await request(app).post(`/api/v1/service-provider/jobs/${job.jobId}/diagnosis`).set(job.auth).send({ photos: { serial: 'https://example.test/s.jpg' } }).expect(200);
    await leave(job).expect(200);
  });
});

describe('a scheduled visit cannot be started before its day', () => {
  async function bookedFor(daysAhead) {
    const sp = await partner(['TV']);
    const cust = await customer();
    const scheduledDate = new Date(Date.now() + daysAhead * 24 * 3600 * 1000).toISOString();
    const booked = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust.token}`)
      .send(await offeringBooking('TV-LED-32-INSTALL', { scheduledDate, timeSlot: { date: 'Later', time: 'Morning' } })).expect(201);
    const auth = { Authorization: `Bearer ${sp.token}` };
    const accepted = await request(app).post(`/api/v1/service-provider/jobs/accept/${booked.body.data.serviceRequest.id}`).set(auth).send({}).expect(200);
    return { jobId: accepted.body.data.id, auth };
  }

  it('refuses "start trip" for a visit booked days from now, and allows it on the day', async () => {
    const future = await bookedFor(3);
    const res = await request(app).post(`/api/v1/service-provider/jobs/${future.jobId}/start-travel`).set(future.auth).expect(409);
    expect(JSON.stringify(res.body)).toMatch(/You can start the trip on that day/);

    const today = await bookedFor(0);
    await request(app).post(`/api/v1/service-provider/jobs/${today.jobId}/start-travel`).set(today.auth).expect(200);
  });
});
