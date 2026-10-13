import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { BrandInvoice } from '../src/modules/brand-crm/brandInvoice.model.js';
import { BrandPayment } from '../src/modules/brand-crm/brandPayment.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { DomainEvent } from '../src/modules/partner-warranty/domainEvent.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { totalCharges, addOtherCharge } from '../src/modules/brand-crm/charges.service.js';
import * as billing from '../src/modules/brand-crm/billing.service.js';
let server;
const kit = brandCrmKit(() => server, {
  phoneStart: 9371310000
});
const period = {
  periodFrom: new Date('2026-08-01'),
  periodTo: new Date('2026-09-01')
};
const issued = new Date('2026-09-01T12:00:00Z');
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmBilling'));
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
const api = (m, p, u, body) => kit.api()[m](`/api/v1${p}`).set(kit.bearer(u.token)).send(body);
async function world() {
  const w = await kit.world();
  const permission = await Permission.create({
    key: 'billing:manage',
    scope: 'platform'
  });
  const role = await Role.create({
    name: 'Finance',
    scope: 'platform',
    permissions: [permission._id]
  });
  return {
    ...w,
    owner: await kit.brandAdmin(w.lg),
    other: await kit.brandAdmin(w.samsung),
    finance: await kit.brandUser(w.lg, {
      templates: ['finance']
    }),
    cce: await kit.brandUser(w.lg, {
      templates: ['cce']
    }),
    admin: await kit.staff('super_admin', {
      assignedRoles: [role._id]
    }),
    deniedAdmin: await kit.superAdmin()
  };
}
async function line(w, extra = {}) {
  return BillingLine.create(totalCharges({
    brand: w.lg._id,
    ticket: new mongoose.Types.ObjectId(),
    ticketNo: `NCCW-${new mongoose.Types.ObjectId()}`,
    closedAt: new Date('2026-08-15'),
    completedAt: new Date('2026-08-14'),
    status: 'billable',
    state: 'MP',
    city: 'Indore',
    rate: {
      amount: 100.01,
      matchedOn: 'national'
    },
    parts: [{
      name: 'Filter',
      amount: 20.02
    }],
    otherCharges: [{
      label: 'Travel',
      amount: 10.03
    }],
    gstPercent: 18,
    ...extra
  }));
}
async function invoice(w) {
  await line(w);
  return billing.draftInvoice(w.lg._id, period);
}
const pay = (amount, reference = 'BANK-001') => ({
  amount,
  mode: 'bank_transfer',
  reference
});
describe('Phase 13 transactional brand billing', () => {
  it('collects only closed billable in-period lines and sums stored paise totals', async () => {
    const w = await world();
    const a = await line(w);
    const b = await line(w);
    await line(w, {
      status: 'pending_closure'
    });
    await line(w, {
      closedAt: period.periodTo
    });
    await line(w, {
      brand: w.samsung._id
    });
    const inv = await billing.draftInvoice(w.lg._id, period);
    expect(inv.humanId).toMatch(/^BINV-\d{4}-\d{6}$/);
    expect(inv.lines).toHaveLength(2);
    expect(inv.subtotal).toBe(260.12);
    expect(inv.gstAmount).toBe(46.82);
    expect(inv.total).toBe(306.94);
    expect(await BillingLine.countDocuments({
      invoice: inv._id,
      status: 'invoiced'
    })).toBe(2);
    expect(inv.lineSnapshots.map(l => String(l._id))).toEqual([String(a._id), String(b._id)]);
  });
  it('concurrent same and overlapping periods never double-bill', async () => {
    const w = await world();
    await line(w);
    await line(w);
    const same = await Promise.all([billing.draftInvoice(w.lg._id, period), billing.draftInvoice(w.lg._id, period)]);
    expect(String(same[0]._id)).toBe(String(same[1]._id));
    expect(await BrandInvoice.countDocuments()).toBe(1);
    await expect(billing.draftInvoice(w.lg._id, {
      periodFrom: '2026-07-01',
      periodTo: '2026-10-01'
    })).rejects.toMatchObject({
      statusCode: 400
    });
  });
  it('rejects empty and reversed periods', async () => {
    const w = await world();
    await expect(billing.draftInvoice(w.lg._id, period)).rejects.toMatchObject({
      statusCode: 400
    });
    await expect(billing.draftInvoice(w.lg._id, {
      periodFrom: period.periodTo,
      periodTo: period.periodFrom
    })).rejects.toMatchObject({
      statusCode: 400
    });
  });
  it('issues with current terms and freezes profile and original charges', async () => {
    const w = await world();
    await Brand.updateOne({
      _id: w.lg._id
    }, {
      $set: {
        'billing.paymentTermsDays': 7,
        'billing.legalName': 'LG Limited'
      }
    });
    const draft = await invoice(w);
    const inv = await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    expect(inv.dueDate).toEqual(new Date('2026-09-08T12:00:00Z'));
    expect(inv.billingProfile.legalName).toBe('LG Limited');
    await Brand.updateOne({
      _id: w.lg._id
    }, {
      $set: {
        'billing.legalName': 'Changed'
      }
    });
    await expect(addOtherCharge(draft.lines[0], {
      user: w.admin.user._id
    }, {
      label: 'Extra',
      amount: 1,
      reason: 'Test'
    })).rejects.toMatchObject({
      statusCode: 409
    });
    expect((await billing.getInvoice(inv._id, w.lg._id)).billingProfile.legalName).toBe('LG Limited');
    expect(await DomainEvent.countDocuments({
      type: 'INVOICE_ISSUED'
    })).toBe(1);
  });
  it('records partial then full payment; rejects overpayments and cancellation with receipts', async () => {
    const w = await world();
    const draft = await invoice(w);
    await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    const a = await billing.recordPayment(draft._id, pay(50), undefined, {
      now: issued
    });
    expect(a.invoice.status).toBe('partially_paid');
    expect(a.invoice.balance).toBe(103.47);
    await expect(billing.recordPayment(draft._id, pay(104, 'BANK-002'), undefined, {
      now: issued
    })).rejects.toMatchObject({
      statusCode: 400
    });
    await expect(billing.cancelInvoice(draft._id, 'Mistake')).rejects.toMatchObject({
      statusCode: 409
    });
    const b = await billing.recordPayment(draft._id, pay(103.47, 'BANK-003'), undefined, {
      now: issued
    });
    expect(b.invoice.status).toBe('paid');
    expect(b.invoice.balance).toBe(0);
    expect(await BrandPayment.countDocuments()).toBe(2);
    expect(await DomainEvent.countDocuments({
      type: 'PAYMENT_RECORDED'
    })).toBe(2);
  });
  it('rejects duplicate references, invalid dates and payment on drafts', async () => {
    const w = await world();
    const draft = await invoice(w);
    await expect(billing.recordPayment(draft._id, pay(10))).rejects.toMatchObject({
      statusCode: 409
    });
    await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    await billing.recordPayment(draft._id, pay(10), undefined, {
      now: issued
    });
    await expect(billing.recordPayment(draft._id, pay(10), undefined, {
      now: issued
    })).rejects.toMatchObject({
      statusCode: 409
    });
    await expect(billing.recordPayment(draft._id, {
      ...pay(1, 'date'),
      receivedAt: '2027-01-01'
    }, undefined, {
      now: issued
    })).rejects.toMatchObject({
      statusCode: 400
    });
    expect(await BrandPayment.countDocuments()).toBe(1);
  });
  it('serializes competing payments to prevent over-collection', async () => {
    const w = await world();
    const draft = await invoice(w);
    await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    const results = await Promise.allSettled([billing.recordPayment(draft._id, pay(100, 'A'), undefined, {
      now: issued
    }), billing.recordPayment(draft._id, pay(100, 'B'), undefined, {
      now: issued
    })]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await BrandInvoice.findById(draft._id)).paidAmount).toBe(100);
  });
  it('computes overdue on read and sweep; partial late receipt remains overdue', async () => {
    const w = await world();
    const draft = await invoice(w);
    await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    const now = new Date('2026-10-10');
    expect(billing.invoiceView(await BrandInvoice.findById(draft._id), now).status).toBe('overdue');
    await billing.refreshOverdue({
      now
    });
    expect((await BrandInvoice.findById(draft._id)).status).toBe('overdue');
    expect((await billing.recordPayment(draft._id, pay(1), undefined, {
      now
    })).invoice.status).toBe('overdue');
  });
  it('cancels, releases charges, permits redraft and preserves cancelled history', async () => {
    const w = await world();
    const draft = await invoice(w);
    const original = draft.total;
    await billing.cancelInvoice(draft._id, 'Wrong period');
    expect((await BillingLine.findById(draft.lines[0])).status).toBe('billable');
    await addOtherCharge(draft.lines[0], {
      user: w.admin.user._id
    }, {
      label: 'Extra',
      amount: 10,
      reason: 'Reviewed'
    });
    const next = await billing.draftInvoice(w.lg._id, period);
    expect(String(next._id)).not.toBe(String(draft._id));
    expect((await billing.getInvoice(draft._id, w.lg._id)).lineSnapshots[0].total).toBe(original);
    expect(await AuditLog.countDocuments({
      action: 'invoice.cancelled'
    })).toBe(1);
  });
  it('auto-drafts the previous month once and respects enable/day settings', async () => {
    const w = await world();
    await line(w);
    await PlatformSettings.create({
      brandInvoiceDay: 2,
      brandInvoiceAutoDraft: true
    });
    expect(await billing.monthlyAutoDraft({
      now: new Date('2026-09-01')
    })).toHaveLength(0);
    await billing.monthlyAutoDraft({
      now: new Date('2026-09-02')
    });
    await billing.monthlyAutoDraft({
      now: new Date('2026-09-02')
    });
    expect(await BrandInvoice.countDocuments()).toBe(1);
    await PlatformSettings.updateOne({}, {
      $set: {
        brandInvoiceAutoDraft: false
      }
    });
    await line(w);
    expect(await billing.monthlyAutoDraft({
      now: new Date('2026-09-02')
    })).toHaveLength(0);
  });
  it('catches up multiple missed months after an outage without drafting periods before their due day or duplicating invoices', async () => {
    const w = await world();
    await PlatformSettings.create({ brandInvoiceDay: 2 });
    await line(w, { closedAt: new Date('2026-07-15') });
    await line(w); // August
    await line(w, { closedAt: new Date('2026-09-15') });
    expect(await billing.monthlyAutoDraft({ now: new Date('2026-10-01') })).toHaveLength(2);
    expect(await billing.monthlyAutoDraft({ now: new Date('2026-10-01') })).toHaveLength(0);
    expect(await billing.monthlyAutoDraft({ now: new Date('2026-10-03') })).toHaveLength(1);
    expect(await billing.monthlyAutoDraft({ now: new Date('2026-10-04') })).toHaveLength(0);
    const invoices = await BrandInvoice.find().sort({ periodFrom: 1 });
    expect(invoices.map(i => i.periodFrom.toISOString().slice(0, 10))).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
    expect(await BillingLine.countDocuments({ status: 'billable' })).toBe(0);
  });
  it('alerts NCC Finance once about a failed automatic draft and retries it on the next sweep', async () => {
    const w = await world();
    await line(w);
    const create = jest.spyOn(BrandInvoice, 'create').mockRejectedValue(new Error('Simulated drafting outage'));
    try {
      for (let i = 0; i < 2; i++) {
        expect((await billing.monthlyAutoDraft({ now: new Date('2026-09-03') }))[0].error).toBe('Simulated drafting outage');
      }
    } finally { create.mockRestore(); }
    expect(await Notification.countDocuments({ recipient: w.admin.user._id, title: 'Automatic brand invoice needs attention' })).toBe(1);
    expect(await billing.monthlyAutoDraft({ now: new Date('2026-09-04') })).toHaveLength(1);
    expect(await BrandInvoice.countDocuments()).toBe(1);
  });
  it('summary excludes draft/cancelled invoices, counts unbilled and ages remaining balances', async () => {
    const w = await world();
    const draft = await invoice(w);
    await line(w, {
      status: 'pending_closure'
    });
    await line(w, {
      status: 'void'
    });
    expect((await billing.brandSummary(w.lg._id)).invoiceValue).toBe(0);
    await billing.issueInvoice(draft._id, undefined, {
      now: issued
    });
    await billing.recordPayment(draft._id, pay(50), undefined, {
      now: issued
    });
    const s = await billing.brandSummary(w.lg._id, {
      now: new Date('2026-10-10')
    });
    expect(s).toMatchObject({
      completedCalls: 2,
      invoiceValue: 153.47,
      paid: 50,
      pending: 103.47,
      overdue: 103.47,
      overdueCount: 1,
      unbilledAmount: 153.47
    });
    expect(s.ageing.days1to30).toBe(103.47);
  });
  it('enforces brand isolation, Finance access, CCE denial and platform billing permission', async () => {
    const w = await world();
    const draft = await invoice(w);
    await api('get', '/brand/billing/invoices', w.finance).expect(200);
    await api('get', `/brand/billing/invoices/${draft._id}`, w.other).expect(404);
    await api('get', `/brand/billing/invoices/${draft._id}/pdf`, w.other).expect(404);
    await api('get', '/brand/billing/summary', w.cce).expect(403);
    await api('get', '/super-admin/brand-billing/invoices', w.deniedAdmin).expect(403);
    await api('get', '/super-admin/brand-billing/invoices', w.admin).expect(200);
    await api('post', '/brand/invoices', w.owner, {}).expect(403);
    await api('get', '/brand/billing/invoices/not-an-id', w.owner).expect(400);
  });
  it('writes audit rows for all transitions and serves escaped printable HTML and CSV', async () => {
    const w = await world();
    await line(w, {
      ticketNo: '<script>alert(1)</script>'
    });
    const drafted = await api('post', '/super-admin/brand-billing/invoices', w.admin, {
      brand: String(w.lg._id),
      ...period
    }).expect(200);
    const id = drafted.body.data.id;
    await api('post', `/super-admin/brand-billing/invoices/${id}/issue`, w.admin, {}).expect(200);
    await api('post', `/super-admin/brand-billing/invoices/${id}/payments`, w.admin, pay(1)).expect(200);
    const html = await api('get', `/brand/billing/invoices/${id}/pdf`, w.finance).expect(200);
    expect(html.type).toBe('text/html');
    expect(html.text).toContain('&lt;script&gt;');
    await api('get', '/brand/billing/export?type=payments', w.finance).expect(200);
    expect(await AuditLog.distinct('action')).toEqual(expect.arrayContaining(['invoice.drafted', 'invoice.issued', 'payment.recorded']));
  });
  it('brand can edit billing identity but cannot change NCC terms', async () => {
    const w = await world();
    await api('put', '/brand/billing/billing-profile', w.owner, {
      legalName: 'LG & Co',
      billingAddress: 'Indore'
    }).expect(200);
    await api('put', '/brand/billing/billing-profile', w.owner, {
      paymentTermsDays: 0
    }).expect(400);
    await api('put', `/super-admin/brand-billing/brands/${w.lg._id}/terms`, w.admin, {
      paymentTermsDays: 7,
      gstPercent: 12
    }).expect(200);
    expect((await Brand.findById(w.lg._id)).billing).toMatchObject({
      legalName: 'LG & Co',
      paymentTermsDays: 7,
      gstPercent: 12
    });
  });
  it('rolls back invoice ownership and receipts when their audit write fails', async () => {
    const w = await world(); const l = await line(w);
    let mocked = jest.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('Audit unavailable'));
    try { await expect(billing.draftInvoice(w.lg._id, period)).rejects.toThrow('Audit unavailable'); }
    finally { mocked.mockRestore(); }
    expect(await BrandInvoice.countDocuments()).toBe(0);
    expect((await BillingLine.findById(l._id)).status).toBe('billable');
    const draft = await billing.draftInvoice(w.lg._id, period);
    await billing.issueInvoice(draft._id, undefined, {now:issued});
    mocked = jest.spyOn(AuditLog,'create').mockRejectedValueOnce(new Error('Audit unavailable'));
    try { await expect(billing.recordPayment(draft._id,pay(50),undefined,{now:issued})).rejects.toThrow('Audit unavailable'); }
    finally { mocked.mockRestore(); }
    expect(await BrandPayment.countDocuments()).toBe(0);
    expect((await BrandInvoice.findById(draft._id)).paidAmount).toBe(0);
  });
  it('restricts receipt details and rejects malformed filters without accepting a client clock', async () => {
    const w = await world(); const draft = await invoice(w);
    await billing.issueInvoice(draft._id,undefined,{now:issued});
    await billing.recordPayment(draft._id,pay(10),undefined,{now:issued});
    const p = await Permission.findOne({key:'billing:view',scope:'brand'});
    const role = await Role.create({name:'Billing reader',scope:'brand',brand:w.lg._id,permissions:[p._id]});
    const reader = await kit.staff('brand_admin',{brand:w.lg._id,assignedRoles:[role._id]});
    const detail = await api('get',`/brand/billing/invoices/${draft._id}`,reader).expect(200);
    expect(detail.body.data.payments).toEqual([]);
    await api('get','/brand/billing/payments',reader).expect(403);
    await api('get','/brand/billing/lines?status[$ne]=void',w.owner).expect(400);
    await api('get','/brand/billing/summary?from=not-a-date',w.owner).expect(400);
    const summary = await api('get','/brand/billing/summary?now=1900-01-01',w.owner).expect(200);
    expect(summary.body.data.overdue).toBe(143.47);
  });

});
