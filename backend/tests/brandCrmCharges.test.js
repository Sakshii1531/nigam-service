import { Permission } from '../src/modules/auth/permission.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { PartOrder } from '../src/modules/service-provider/partOrder.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { setJobStage, saveClaim, appendEvent } from '../src/modules/partner-warranty/claimTimeline.js';
import { syncClaimFromJob } from '../src/modules/partner-warranty/claimDispatch.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { BrandRate } from '../src/modules/brand-crm/brandRate.model.js';
import { resolveRate } from '../src/modules/brand-crm/rateResolver.js';
import { coveredVisitRate } from '../src/modules/shared/serviceProviderEarnings.js';
let server;
const kit = brandCrmKit(() => server, {
  phoneStart: 9371210000
});
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmCharges'));
  await registerAllModels();
  await ensureIndexes();
  server = await listenOnLoopback(createApp());
});
afterAll(async () => {
  await awaitPendingDeliveries();
  await closeServer(server);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await awaitPendingDeliveries();
  invalidateBrandPermissions();
  await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({})));
});
const api = (m, p, u, body = {}) => kit.api()[m](`/api/v1${p}`).set(kit.bearer(u.token)).send(body);
async function world() {
  const w = await kit.world();
  const permission = await Permission.create({key:'billing:manage',scope:'platform'});
  const role = await Role.create({name:'NCC Finance',scope:'platform',permissions:[permission._id]});
  const owner = await kit.brandAdmin(w.lg),
    other = await kit.brandAdmin(w.samsung),
    cce = await kit.brandUser(w.lg, {
      templates: ['cce']
    }),
    admin = await kit.staff('super_admin', {assignedRoles:[role._id]});
  await City.create([{
    name: 'Pune',
    state: 'Maharashtra'
  }, {
    name: 'Mumbai',
    state: 'Maharashtra'
  }, {
    name: 'Indore',
    state: 'Madhya Pradesh'
  }]);
  return {
    ...w,
    owner,
    other,
    cce,
    admin
  };
}
const payload = w => ({
  category: String(w.ac._id),
  serviceType: 'repair',
  brandRate: 300,
  effectiveFrom: '2026-01-01T00:00:00Z'
});
async function ticket(w) {
  const c = await kit.createTicketAs(w.owner, kit.ticketInput(w, await kit.customer(), {
    address: {
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001'
    }
  }));
  const sr = await ServiceRequest.create({
    user: c.customer,
    brand: w.lg._id,
    category: 'AC',
    description: 'Warranty repair',
    status: 'Repair Completed',
    warrantyClaim: c._id
  });
  c.serviceRequest = sr._id;
  c.coverageDecision = 'goodwill';
  c.status = 'Service In Progress';
  c.jobStage = 'REPAIR';
  await c.save();
  return {
    c,
    sr
  };
}
async function complete(c) {
  setJobStage(c, 'COMPLETED');
  await saveClaim(c);
  return BillingLine.findById(c.billingLine);
}
describe('Phase 12 frozen billing lines', () => {
  it('captures exactly once with installed approved brand parts and paise GST, versions used rate without rewriting billing', async () => {
    const w = await world();
    await Brand.updateOne({
      _id: w.lg._id
    }, {
      $set: {
        'billing.gstPercent': 18
      }
    });
    const rate = (await api('post', '/brand/rates', w.owner, {
      ...payload(w),
      state: 'Maharashtra',
      city: 'Pune',
      brandRate: 450.01
    }).expect(200)).body.data;
    const {
        c,
        sr
      } = await ticket(w),
      sp = await kit.flow.partner(['AC'], 'Charges partner');
    for (const [name, payer, status, approval] of [['Installed covered', 'brand', 'Installed', 'Approved'], ['Customer part', 'customer', 'Installed', 'Approved'], ['Uninstalled', 'brand', 'Received', 'Approved'], ['Unapproved', 'brand', 'Installed', 'Pending']]) await PartOrder.create({
      brand: w.lg._id,
      warrantyClaim: c._id,
      serviceRequest: sr._id,
      serviceProvider: sp.serviceProvider._id,
      partName: name,
      payer,
      status,
      qty: 2,
      price: 10.01,
      orderSource: 'Partner Brand',
      approval: {
        brand: {
          status: approval
        }
      }
    });
    const line = await complete(c);
    expect(line).toMatchObject({
      status: 'pending_closure',
      rate: {
        amount: 450.01,
        matchedOn: 'city'
      },
      subtotal: 470.03,
      gstAmount: 84.61,
      total: 554.64
    });
    expect(line.parts).toHaveLength(1);
    await saveClaim(c);
    expect(await BillingLine.countDocuments()).toBe(1);
    expect(c.timeline.filter(e => e.action === 'CHARGE_CAPTURED')).toHaveLength(1);
    await api('patch', `/brand/rates/${rate.id}`, w.owner, {
      brandRate: 999
    }).expect(200);
    expect((await BillingLine.findById(line._id)).total).toBe(554.64);
    const d = (await api('get', `/brand/tickets/${c._id}`, w.owner).expect(200)).body.data;
    expect(d.billing.rate.amount).toBe(450.01);
    expect(JSON.stringify(d.billing)).not.toContain('partnerPayout');
  });
  it('marks Closed billable, voids on reopen, and captures a new line on the next completion', async () => {
    const w = await world();
    await api('post', '/brand/rates', w.owner, payload(w)).expect(200);
    let {
      c
    } = await ticket(w);
    const first = await complete(c);
    appendEvent(c, {
      action: 'JOB_COMPLETED',
      toStatus: 'Service Completed',
      actor: {
        kind: 'system'
      }
    });
    await saveClaim(c);
    appendEvent(c, {
      action: 'CLAIM_CLOSED',
      toStatus: 'Closed',
      actor: {
        kind: 'system'
      }
    });
    await saveClaim(c);
    expect((await BillingLine.findById(first._id)).status).toBe('billable');
    appendEvent(c, {
      action: 'REOPENED',
      toStatus: 'Job Created',
      actor: {
        kind: 'admin'
      },
      note: 'Repair failed'
    });
    await saveClaim(c);
    expect((await BillingLine.findById(first._id)).status).toBe('void');
    const second = await complete(c);
    expect(String(second._id)).not.toBe(String(first._id));
    expect(await BillingLine.countDocuments()).toBe(2);
  });
  it('flags a missing rate at zero and notifies only billing staff and NCC', async () => {
    const w = await world();
    const finance = await kit.brandUser(w.lg, {
        templates: ['finance']
      }),
      {
        c
      } = await ticket(w);
    const line = await complete(c);
    expect(line).toMatchObject({
      total: 0,
      rate: {
        amount: 0,
        matchedOn: 'missing'
      },
      flags: ['RATE_MISSING']
    });
    const notes = await Notification.find({
      warrantyClaim: c._id,
      title: 'Rate missing'
    }).lean();
    expect(notes.some(n => String(n.recipient) === String(finance.user._id))).toBe(true);
    expect(notes.some(n => String(n.recipient) === String(w.admin.user._id))).toBe(true);
    expect(notes.some(n => String(n.recipient) === String(w.cce.user._id))).toBe(false);
    expect(await coveredVisitRate({
      brand: w.lg._id,
      warrantyClaim: c._id
    })).toEqual({
      amount: 0,
      missing: true
    });
  });
  it('captures Customer NA visit only when configured and does not duplicate on repeated sync', async () => {
    const w = await world();
    await api('post', `/super-admin/brand-rates?brand=${w.lg._id}`, w.admin, {
      ...payload(w),
      visitOnlyRate: 75
    }).expect(200);
    const {
      c,
      sr
    } = await ticket(w);
    sr.status = 'Customer NA';
    await sr.save();
    await syncClaimFromJob(sr);
    await syncClaimFromJob(sr);
    const lines = await BillingLine.find({
      ticket: c._id
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      serviceType: 'visit_only',
      rate: {
        amount: 75
      },
      total: 88.5
    });
  });
  it('adds audited finance charges, rejects unauthorized and invoiced/void adjustments', async () => {
    const w = await world();
    await api('post', '/brand/rates', w.owner, payload(w)).expect(200);
    const {
        c
      } = await ticket(w),
      line = await complete(c),
      path = `/super-admin/billing-lines/${line._id}/charges`,
      charge = {
        label: 'Transport',
        amount: 12.34,
        reason: 'Approved remote visit'
      };
    await api('post', path, w.owner, charge).expect(403);
    const adjusted = (await api('post', path, w.admin, charge).expect(200)).body.data;
    expect(adjusted).toMatchObject({
      subtotal: 312.34,
      gstAmount: 56.22,
      total: 368.56
    });
    expect(adjusted.otherCharges).toHaveLength(1);
    await BillingLine.updateOne({
      _id: line._id
    }, {
      $set: {
        status: 'invoiced'
      }
    });
    await api('post', path, w.admin, charge).expect(409);
  });
  it('rolls back the partner step, request and claim when charge capture fails, then retries successfully', async () => {
    const w = await world();
    await api('post', '/brand/rates', w.owner, payload(w)).expect(200);
    const {
        c,
        sr
      } = await ticket(w),
      sp = await kit.flow.partner(['AC'], 'Atomic partner');
    sr.status = 'Diagnosis Done';
    sr.isAccepted = true;
    sr.serviceProvider = sp.serviceProvider._id;
    await sr.save();
    const job = await Job.create({
      serviceRequest: sr._id,
      serviceProvider: sp.serviceProvider._id,
      warrantyClaim: c._id,
      activeStep: 'inspection',
      type: 'Brand Warranty'
    });
    const spy = jest.spyOn(BillingLine, 'create').mockRejectedValueOnce(new Error('Capture unavailable'));
    try {
      await api('post', `/service-provider/jobs/${job._id}/repair-complete`, sp).expect(500);
    } finally {
      spy.mockRestore();
    }
    expect((await Job.findById(job._id)).activeStep).toBe('inspection');
    expect((await ServiceRequest.findById(sr._id)).status).toBe('Diagnosis Done');
    expect((await WarrantyClaim.findById(c._id)).jobStage).toBe('REPAIR');
    expect(await BillingLine.countDocuments()).toBe(0);
    await api('post', `/service-provider/jobs/${job._id}/repair-complete`, sp).expect(200);
    expect((await Job.findById(job._id)).activeStep).toBe('repaircomplete');
    expect((await ServiceRequest.findById(sr._id)).status).toBe('Repair Completed');
    expect(await BillingLine.countDocuments()).toBe(1);
  });
  it('voids captured charges on cancellation and refuses adjustments to the void line', async () => {
    const w=await world();await api('post','/brand/rates',w.owner,payload(w)).expect(200);
    const {c}=await ticket(w),line=await complete(c);
    appendEvent(c,{action:'CANCELLED',toStatus:'Cancelled',actor:{kind:'admin'},note:'Cancelled after inspection'});await saveClaim(c);
    const voided=await BillingLine.findById(line._id);expect(voided.status).toBe('void');expect(voided.activeKey).toBeUndefined();
    await api('post',`/super-admin/billing-lines/${line._id}/charges`,w.admin,{label:'Extra',amount:10,reason:'No longer payable'}).expect(409);
  });
  it('leaves unconfigured Customer NA visits uncharged and supersedes visit-only charges on a completed repair', async () => {
    const w=await world(),{c,sr}=await ticket(w);sr.status='Customer NA';await sr.save();await syncClaimFromJob(sr);expect(await BillingLine.countDocuments()).toBe(0);
    await api('post',`/super-admin/brand-rates?brand=${w.lg._id}`,w.admin,{...payload(w),visitOnlyRate:75}).expect(200);
    await syncClaimFromJob(sr);const visit=await BillingLine.findOne({ticket:c._id});expect(visit.serviceType).toBe('visit_only');
    const current=await WarrantyClaim.findById(c._id);const final=await complete(current);expect(final.serviceType).toBe('repair');expect(final.rate.amount).toBe(300);expect((await BillingLine.findById(visit._id)).status).toBe('void');
  });

});
