import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { io as connectSocket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSockets } from '../src/sockets/index.js';
import { setIO } from '../src/sockets/io.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { jobFlow } from './helpers/jobFlow.js';
import { seedSimpleOffering, offeringBooking } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { reconcileCancelledBookings } from '../src/modules/booking/booking.service.js';
import { LiveTracking } from '../src/modules/super-admin/liveTracking.model.js';

let server, sockets;
const clients = [];
const flow = jobFlow(() => server, { phoneStart: 9381900000 });
const api = (method, path, token, body) => request(server)[method](`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body);
const event = (socket, name) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { socket.off(name, receive); reject(new Error(`No ${name} event`)); }, 5000);
  function receive(payload) { clearTimeout(timeout); resolve(payload); }
  socket.once(name, receive);
});
beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('bookingCancellation'));
  await ensureIndexes();
  server = await listenOnLoopback(createApp());
  sockets = initSockets(server);
}, 60000);
afterAll(async () => {
  clients.forEach(socket => socket.disconnect());
  await awaitPendingDeliveries();
  await new Promise(resolve => sockets.close(resolve));
  setIO(null);
  await closeServer(server);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  clients.splice(0).forEach(socket => socket.disconnect());
  await awaitPendingDeliveries();
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  await seedSimpleOffering({ categoryKey: 'AC', code: 'CANCEL-REPAIR', price: 299 });
});
async function fixture(accepted = true) {
  const provider = await flow.partner(['AC']);
  const customer = await flow.customer();
  const created = (await api('post', '/bookings', customer.token, await offeringBooking('CANCEL-REPAIR')).expect(201)).body.data;
  const job = accepted ? (await api('post', `/service-provider/jobs/accept/${created.serviceRequest.id}`, provider.token, {}).expect(200)).body.data : null;
  return { provider, customer, job, ...created };
}

describe('customer cancellation reaches the assigned provider', () => {
  it.each([false, true])('cancels an assigned booking (accepted=%s), removes it from active jobs, and notifies an offline provider exactly once', async accepted => {
    const { provider, customer, job, booking, serviceRequest } = await fixture(accepted);
    if (accepted) {
      await api('post', `/service-provider/jobs/${job.id}/start-travel`, provider.token).expect(200);
      await api('post', `/service-provider/jobs/${job.id}/arrive`, provider.token).expect(200);
      await LiveTracking.updateOne({ job: job.id }, { $set: { serviceProvider: provider.serviceProvider._id, status: 'Repairing' } }, { upsert: true });
    }
    await ServiceProvider.updateOne({ _id: provider.serviceProvider._id }, { availability: 'Offline' });
    // Deliberately do not join the instant feed: offline providers still
    // receive cancellation through their authenticated user room.
    const socket = connectSocket(`http://127.0.0.1:${server.address().port}`, { auth: { token: provider.token }, transports: ['websocket'], forceNew: true });
    clients.push(socket);
    await event(socket, 'connect');
    const cancelled = event(socket, 'job:cancelled');
    const notification = event(socket, 'notification:new');
    const reason = 'Changed my mind';
    await api('post', `/bookings/${booking.id}/cancel`, customer.token, { reason }).expect(200);
    expect(await cancelled).toMatchObject({ bookingId: booking.id, serviceRequestId: serviceRequest.id, status: 'Cancelled', reason });
    expect(await notification).toMatchObject({ title: 'Job cancelled by customer', recipient: String(provider.serviceProvider.user) });
    expect((await ServiceRequest.findById(serviceRequest.id)).status).toBe('Cancelled');
    if (accepted) {
      expect((await Job.findById(job.id)).activeStep).toBe('cancelled');
      expect((await LiveTracking.findOne({ job: job.id })).status).toBe('Cancelled');
      await api('post', `/service-provider/jobs/${job.id}/start-travel`, provider.token).expect(400);
      const history = (await api('get', '/service-provider/jobs/history?status=cancelled', provider.token).expect(200)).body.data;
      expect(history.items.some(item => item.id === job.id)).toBe(true);
    }
    expect((await api('get', '/service-provider/jobs/active', provider.token).expect(200)).body.data).toEqual([]);
    expect((await ServiceProvider.findById(provider.serviceProvider._id)).activeJobsCount).toBe(0);
    expect((await api('get', '/service-provider/jobs/summary', provider.token).expect(200)).body.data.inProgressJobs).toBe(0);
    await api('post', `/bookings/${booking.id}/cancel`, customer.token, { reason }).expect(200);
    expect(await Notification.countDocuments({ recipient: provider.serviceProvider.user, title: 'Job cancelled by customer' })).toBe(1);
    if (!accepted) {
      await api('post', `/service-provider/jobs/accept/${serviceRequest.id}`, provider.token, {}).expect(409);
      expect(await Job.countDocuments({ serviceRequest: serviceRequest.id })).toBe(0);
    }
  });

  it('hides legacy active jobs with cancelled parents and prevents further work', async () => {
    const { provider, job, booking, serviceRequest } = await fixture();
    await Booking.updateOne({ _id: booking.id }, { status: 'Cancelled' });
    await ServiceRequest.updateOne({ _id: serviceRequest.id }, { status: 'Cancelled' });
    expect((await api('get', '/service-provider/jobs/active', provider.token).expect(200)).body.data).toEqual([]);
    await api('post', `/service-provider/jobs/${job.id}/start-travel`, provider.token).expect(400);
  });

  it.each([false, true])('repairs legacy cancelled bookings in the database (missing booking link=%s) and moves requests into cancelled filters', async missingLink => {
    const { provider, customer, job, booking, serviceRequest } = await fixture();
    await Booking.updateOne({ _id: booking.id }, { $set: { status: 'Cancelled', cancellationReason: 'Legacy cancellation', ...(missingLink ? { serviceRequest: null } : {}) } });
    await LiveTracking.updateOne({ job: job.id }, { $set: { serviceProvider: provider.serviceProvider._id, status: 'On the way' } }, { upsert: true });
    await reconcileCancelledBookings();
    expect((await ServiceRequest.findById(serviceRequest.id)).status).toBe('Cancelled');
    expect((await Booking.findById(booking.id)).serviceRequest.toString()).toBe(serviceRequest.id);
    expect((await Job.findById(job.id)).activeStep).toBe('cancelled');
    expect((await LiveTracking.findOne({ job: job.id })).status).toBe('Cancelled');
    expect((await ServiceProvider.findById(provider.serviceProvider._id)).activeJobsCount).toBe(0);
    const cancelled = (await api('get', '/service-requests?status=Cancelled', customer.token).expect(200)).body.data;
    expect(cancelled.some(item => item.id === serviceRequest.id && item.job.activeStep === 'cancelled')).toBe(true);
    await reconcileCancelledBookings();
    expect(await Notification.countDocuments({ recipient: provider.serviceProvider.user, title: 'Job cancelled by customer' })).toBe(1);
    expect((await ServiceRequest.findById(serviceRequest.id)).timeline.filter(step => step.stepLabel === 'Cancelled')).toHaveLength(1);
  });

  it('rejects stale provider writes that would resurrect a cancelled job or service request', async () => {
    const { customer, job, booking, serviceRequest } = await fixture();
    const staleJob = await Job.findById(job.id);
    const staleRequest = await ServiceRequest.findById(serviceRequest.id);
    await api('post', `/bookings/${booking.id}/cancel`, customer.token, { reason: 'Cancelled mid-job' }).expect(200);
    staleJob.activeStep = 'ontheway';
    staleRequest.status = 'Engineer Reached';
    await expect(staleJob.save()).rejects.toMatchObject({ name: 'VersionError' });
    await expect(staleRequest.save()).rejects.toMatchObject({ name: 'VersionError' });
    expect((await Job.findById(job.id)).activeStep).toBe('cancelled');
    expect((await ServiceRequest.findById(serviceRequest.id)).status).toBe('Cancelled');
  });
});
