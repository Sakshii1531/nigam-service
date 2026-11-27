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
import { EarningsTally } from '../src/modules/service-provider/earningsTally.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { SparePartCatalog } from '../src/modules/super-admin/sparePartCatalog.model.js';
import { seedTestCatalogue, clearCatalogue } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { brandWarrantyAppliance } from './helpers/coverage.js';
import { testDbUri } from './helpers/testDb.js';

// The client's case: the partner is at the customer for one appliance (here
// an AC under brand warranty, so the customer pays nothing for it), and the
// customer asks them to also service another appliance. The partner adds that
// appliance's service, asks the customer to approve a spare part's price,
// fits it only after approval, and one final bill covers both appliances.

const TEST_DB_URI = testDbUri('extra_appliance');
let app;
const { jobToBilling, addAddOn, customer } = jobFlow(() => app, { phoneStart: 9300700000 });
const api = () => request(app);

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
  await Promise.all([User, ServiceProvider, Booking, ServiceRequest, Job, EarningsTally, Payment, SparePartCatalog].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
});

const warrantyAcJob = () =>
  jobToBilling('AC-WINDOW-INSTALL', {
    specs: ['AC'],
    bookingOptions: { coverageType: 'Brand Warranty' },
    prepareBooking: async (cust) => ({ brand: 'LG', applianceId: String((await brandWarrantyAppliance({ user: cust.user._id }))._id) }),
  });

const customerBooking = async (flow) =>
  (await api().get(`/api/v1/bookings/${flow.booking.id}`).set('Authorization', `Bearer ${flow.cust.token}`).expect(200)).body.data;

const answer = (flow, partId, approve, token = flow.cust.token) =>
  api().post(`/api/v1/bookings/${flow.booking.id}/extra-parts/${partId}/respond`).set('Authorization', `Bearer ${token}`).send({ approve });

describe('extra appliance on the same visit', () => {
  it('warranty AC + an RO the customer adds: part approved in the app, one bill for both, paid in cash', async () => {
    const flow = await warrantyAcJob();

    const types = (await api().get(`/api/v1/service-provider/jobs/${flow.jobId}/extra-appliance-types`).set(flow.auth).expect(200)).body.data;
    expect(types.map((t) => t.key)).toContain('RO Water Purifier');
    expect(types.map((t) => t.key)).not.toContain('AC');

    // The RO service: RO Inspection, Rs.199 + 18% GST.
    await addAddOn(flow, 'RO-INSPECT', { category: 'RO Water Purifier' });

    // A catalogue part is priced by the catalogue, whatever the app sends.
    const membrane = await SparePartCatalog.create({ name: 'RO Membrane 80 GPD', category: 'RO Water Purifier', costPrice: 1000, markupPercent: 0, stock: 5 });
    const catalog = (await api().get(`/api/v1/service-provider/jobs/${flow.jobId}/extra-part-catalog?category=RO%20Water%20Purifier`).set(flow.auth).expect(200)).body.data;
    expect(catalog).toEqual([expect.objectContaining({ id: membrane.id, name: 'RO Membrane 80 GPD', price: 1000 })]);

    const requested = await api()
      .post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`)
      .set(flow.auth)
      .send({ categoryKey: 'RO Water Purifier', partCatalogId: membrane.id, unitPrice: 1 })
      .expect(200);
    expect(requested.body.data.part).toMatchObject({ name: 'RO Membrane 80 GPD', unitPrice: 1000, totalAmount: 1180, status: 'Pending' });
    const partId = requested.body.data.part._id || requested.body.data.part.id;

    // The customer sees it waiting for their answer.
    const before = await customerBooking(flow);
    expect(before.extraWork.pendingApprovals).toEqual([expect.objectContaining({ id: partId, name: 'RO Membrane 80 GPD', amount: 1180, appliance: 'RO Water Purifier' })]);
    expect(before.extraWork.appliances[0]).toMatchObject({ key: 'RO Water Purifier', services: [expect.objectContaining({ name: 'RO Inspection', amount: 234.82 })] });

    // No bill until the customer answers.
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/spare-parts`).set(flow.auth).send({ parts: [] }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/repair-complete`).set(flow.auth).expect(200);
    const blocked = await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/billing`).set(flow.auth).expect(409);
    expect(blocked.body.error.message).toMatch(/Waiting for the customer to approve RO Membrane 80 GPD/);

    // Only this customer can answer, and only once.
    const stranger = await customer();
    await answer(flow, partId, true, stranger.token).expect(403);
    await answer(flow, partId, true).expect(200);
    await answer(flow, partId, false).expect(409);

    // AC under warranty = Rs.0; RO service 234.82 + membrane 1180.
    const billing = (await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/billing`).set(flow.auth).expect(200)).body.data.billingEstimate;
    expect(billing).toMatchObject({ serviceCharge: 0, additionalServicesTotal: 234.82, extraPartsTotal: 1180, total: 1414.82, amountToCollect: 1414.82 });
    expect(billing.lines).toEqual([
      expect.objectContaining({ group: 'Window AC', kind: 'service', amount: 0, covered: true }),
      expect.objectContaining({ group: 'RO Water Purifier', kind: 'service', label: 'RO Inspection', amount: 234.82 }),
      expect.objectContaining({ group: 'RO Water Purifier', kind: 'part', label: 'RO Membrane 80 GPD', amount: 1180 }),
    ]);

    const sr = await ServiceRequest.findById(flow.serviceRequest.id).populate('booking');
    const paid = await api()
      .post(`/api/v1/service-provider/jobs/${flow.jobId}/collect-payment`)
      .set(flow.auth)
      .send({ paymentMethod: 'Cash', otp: sr.booking.completionOtp })
      .expect(200);
    expect(paid.body.data.payment).toMatchObject({ amount: 1414.82, method: 'Cash', status: 'Success' });

    // The customer's booking shows the same itemised bill.
    const after = await customerBooking(flow);
    expect(after.status).toBe('Completed');
    expect(after.finalBill).toMatchObject({ total: 1414.82 });
    expect(after.finalBill.lines.map((l) => l.group)).toEqual(['Window AC', 'RO Water Purifier', 'RO Water Purifier']);
  });

  it('a declined part is never billed and the visit carries on; online payment asks for the full amount', async () => {
    const flow = await warrantyAcJob();

    // A part needs its appliance's service first, and the booked appliance uses the normal parts step.
    const early = await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`).set(flow.auth).send({ categoryKey: 'RO Water Purifier', name: 'Filter', unitPrice: 300 }).expect(409);
    expect(early.body.error.message).toMatch(/Add the RO Water Purifier service first/);
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`).set(flow.auth).send({ categoryKey: 'AC', name: 'Capacitor', unitPrice: 300 }).expect(400);

    await addAddOn(flow, 'RO-INSPECT', { category: 'RO Water Purifier' });
    const sent = await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`).set(flow.auth).send({ categoryKey: 'RO Water Purifier', name: 'Pre-filter', unitPrice: 300, quantity: 2 }).expect(200);
    expect(sent.body.data.part).toMatchObject({ unitPrice: 300, quantity: 2, totalAmount: 708, status: 'Pending' });

    const declined = await answer(flow, sent.body.data.part._id || sent.body.data.part.id, false).expect(200);
    expect(declined.body.data.status).not.toBe('Cancelled');
    expect(declined.body.data.extraWork.appliances[0].parts[0]).toMatchObject({ status: 'Declined' });

    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/spare-parts`).set(flow.auth).send({ parts: [] }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/repair-complete`).set(flow.auth).expect(200);
    const billing = (await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/billing`).set(flow.auth).expect(200)).body.data.billingEstimate;
    expect(billing).toMatchObject({ extraPartsTotal: 0, total: 234.82 });
    expect(billing.lines.filter((l) => l.kind === 'part')).toHaveLength(0);

    // Extra work closes with the bill.
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`).set(flow.auth).send({ categoryKey: 'RO Water Purifier', name: 'Tap', unitPrice: 100 }).expect(409);

    const sr = await ServiceRequest.findById(flow.serviceRequest.id).populate('booking');
    const online = await api()
      .post(`/api/v1/service-provider/jobs/${flow.jobId}/collect-payment`)
      .set(flow.auth)
      .send({ paymentMethod: 'UPI', otp: sr.booking.completionOtp })
      .expect(200);
    expect(online.body.data.razorpay).toMatchObject({ amount: 23482 });
  });

  it('a paid booking keeps its own parts flow and adds the extra appliance on top', async () => {
    const flow = await jobToBilling('AC-WINDOW-INSTALL', { specs: ['AC'] });
    await addAddOn(flow, 'RO-INSPECT', { category: 'RO Water Purifier' });
    const sent = await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/extra-parts`).set(flow.auth).send({ categoryKey: 'RO Water Purifier', name: 'Pre-filter', unitPrice: 300 }).expect(200);
    await answer(flow, sent.body.data.part._id || sent.body.data.part.id, true).expect(200);

    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/spare-parts`).set(flow.auth).send({ parts: [{ name: 'Capacitor', price: 200, checked: true }] }).expect(200);
    await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/repair-complete`).set(flow.auth).expect(200);
    const billing = (await api().post(`/api/v1/service-provider/jobs/${flow.jobId}/billing`).set(flow.auth).expect(200)).body.data.billingEstimate;
    // 706.82 booked AC + 236 AC capacitor + 234.82 RO service + 354 RO pre-filter
    expect(billing).toMatchObject({ serviceCharge: 706.82, sparePartsTotal: 236, additionalServicesTotal: 234.82, extraPartsTotal: 354, total: 1531.64 });
    expect(billing.lines.map((l) => [l.group, l.kind, l.amount])).toEqual([
      ['Window AC', 'service', 706.82],
      ['Window AC', 'part', 236],
      ['RO Water Purifier', 'service', 234.82],
      ['RO Water Purifier', 'part', 354],
    ]);

    const context = (await api().get(`/api/v1/service-provider/jobs/${flow.jobId}/context`).set(flow.auth).expect(200)).body.data;
    expect(context.extraWork.appliances).toEqual([expect.objectContaining({ key: 'RO Water Purifier', parts: [expect.objectContaining({ name: 'Pre-filter', status: 'Approved', amount: 354 })] })]);
  });
});
