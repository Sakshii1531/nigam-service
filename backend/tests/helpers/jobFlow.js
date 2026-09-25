import request from 'supertest';
import { User } from '../../src/modules/auth/user.model.js';
import { ServiceProvider } from '../../src/modules/service-provider/serviceProvider.model.js';
import { ServiceRequest } from '../../src/modules/service-requests/serviceRequest.model.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { ROLES } from '../../src/config/constants.js';
import { offeringBooking } from './catalogue.js';
import { readOtpCode } from './otp.js';

// A catalogue booking walked through the real HTTP API: customer books →
// partner accepts → travels → diagnoses → (add-ons / parts) → bills →
// collects. Shared by the payout, margin-report and client-acceptance tests.
export function jobFlow(getApp, { phoneStart = 9300100000 } = {}) {
  let phoneSeq = phoneStart;
  const nextPhone = () => String(phoneSeq++);
  const api = () => request(getApp());

  async function loginAndVerify({ role, identifier }) {
    await api().post('/api/v1/auth/login').send({ role, identifier, password: 'password123' }).expect(200);
    const res = await api().post('/api/v1/auth/otp/verify').send({ role, identifier, code: readOtpCode(identifier) }).expect(200);
    return res.body.data.accessToken;
  }

  async function partner(specs, name = 'Test Partner') {
    const phone = nextPhone();
    const user = await User.create({ role: ROLES.SERVICE_PROVIDER, phone, name, passwordHash: await hashPassword('password123') });
    const serviceProvider = await ServiceProvider.create({ user: user._id, name, phone, status: 'Active', availability: 'Available', specs });
    return { serviceProvider, token: await loginAndVerify({ role: ROLES.SERVICE_PROVIDER, identifier: phone }) };
  }

  async function customer() {
    const phone = nextPhone();
    const user = await User.create({ role: ROLES.CUSTOMER, phone, name: 'Test Customer', passwordHash: await hashPassword('password123') });
    return { user, token: await loginAndVerify({ role: ROLES.CUSTOMER, identifier: phone }) };
  }

  /** Books `code`, has the partner accept it, and walks it to diagnosis. */
  async function jobToBilling(code, { specs, sp: givenPartner, bookingOptions = {}, beforeWork } = {}) {
    const sp = givenPartner || (await partner(specs));
    const cust = await customer();
    const body = await offeringBooking(code, { userId: String(cust.user._id), ...bookingOptions });
    const booked = await api().post('/api/v1/bookings').set('Authorization', `Bearer ${cust.token}`).send(body).expect(201);
    const { booking, serviceRequest, razorpay } = booked.body.data;

    const auth = { Authorization: `Bearer ${sp.token}` };
    const accepted = await api().post(`/api/v1/service-provider/jobs/accept/${serviceRequest.id}`).set(auth).send({}).expect(200);
    const jobId = accepted.body.data.id;

    if (beforeWork) await beforeWork({ jobId, auth, booking, razorpay, custToken: cust.token });
    await api().post(`/api/v1/service-provider/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${jobId}/arrive`).set(auth).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'ok' }).expect(200);
    return { jobId, auth, sp, cust, booking, serviceRequest, accepted: accepted.body.data };
  }

  /** Adds a catalogue add-on by code (as the partner does on site); `category` lists another category's offerings. */
  async function addAddOn({ jobId, auth }, code, { quantity = 1, category } = {}) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const list = await api().get(`/api/v1/service-provider/jobs/${jobId}/addon-offerings${query}`).set(auth).expect(200);
    const offering = list.body.data.find((o) => o.code === code);
    if (!offering) throw new Error(`addAddOn: ${code} not offered on this job`);
    return (await api().post(`/api/v1/service-provider/jobs/${jobId}/addons`).set(auth).send({ offeringId: offering.id, quantity }).expect(200)).body.data;
  }

  async function billAndCollect({ jobId, auth, serviceRequest, parts = [] }) {
    await api().post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`).set(auth).send({ parts }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${jobId}/repair-complete`).set(auth).expect(200);
    const billing = (await api().post(`/api/v1/service-provider/jobs/${jobId}/billing`).set(auth).expect(200)).body.data.billingEstimate;
    const sr = await ServiceRequest.findById(serviceRequest.id).populate('booking');
    const paid = await api()
      .post(`/api/v1/service-provider/jobs/${jobId}/collect-payment`)
      .set(auth)
      .send({ paymentMethod: 'Cash', otp: sr.booking.completionOtp })
      .expect(200);
    return { billing, payment: paid.body.data.payment };
  }

  return { loginAndVerify, partner, customer, jobToBilling, addAddOn, billAndCollect };
}
