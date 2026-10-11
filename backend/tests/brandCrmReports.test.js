import { beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { BrandInvoice } from '../src/modules/brand-crm/brandInvoice.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import * as reports from '../src/modules/brand-crm/brandReports.service.js';
let server;
const kit = brandCrmKit(() => server, {
  phoneStart: 9371410000
});
const id = () => new mongoose.Types.ObjectId();
const at = new Date('2026-08-01T00:00:00Z');
const now = new Date('2026-08-20T00:00:00Z');
const hour = n => new Date(+at + n * 3600000);
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmReports'));
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
const api = (path, user) => kit.api().get(`/api/v1/brand/reports${path}`).set(kit.bearer(user.token));
async function fixture() {
  const w = await kit.world();
  const owner = await kit.brandAdmin(w.lg);
  const provider = id();
  await mongoose.connection.collection('serviceproviders').insertOne({
    _id: provider,
    name: 'Own partner',
    phone: 'PRIVATE',
    bankAccount: 'PRIVATE',
    rating: 1
  });
  const tickets = [];
  const lines = [];
  for (let i = 0; i < 4; i++) {
    const ticket = id(),
      job = id(),
      line = id();
    const brand = i === 3 ? w.samsung._id : w.lg._id;
    const state = i === 2 ? 'MP' : 'Maharashtra';
    const city = ['Pune', 'Mumbai', 'Indore', 'Pune'][i];
    const source = i === 1 ? 'brand_manual' : 'toll_free';
    const completed = hour(10 + i * 10);
    tickets.push({
      _id: ticket,
      brand,
      customer: id(),
      categoryKey: 'AC',
      serviceType: 'repair',
      productType: null,
      serialNumber: i < 2 ? 'SHARED' : '',
      source,
      status: i === 1 ? 'Rejected' : 'Closed',
      createdAt: hour(i),
      address: {
        state,
        city
      },
      serviceRequest: job,
      warranty: {
        status: ['In Warranty', 'Out of Warranty', 'Verification Required', 'In Warranty'][i]
      },
      coverageDecision: i === 1 ? null : 'warranty',
      rejectionCode: i === 1 ? 'NOT_COVERED' : null,
      sla: {
        hours: {
          response: 2
        },
        responseDueAt: hour(i + 2),
        met: {
          response: hour(i + (i === 2 ? 3 : 1)),
          resolution: completed,
          visit: hour(i + 1)
        },
        visitDueAt: hour(i + 2),
        breaches: i === 2 ? ['response'] : []
      },
      closure: {
        rating: 5
      },
      timeline: [{
        action: i === 1 ? 'CLAIM_REJECTED' : 'CLAIM_APPROVED',
        at: hour(i + 2)
      }, {
        action: 'JOB_STAGE_CHANGED',
        meta: {
          stage: 'REACHED'
        },
        at: hour(i + 1)
      }, ...(i === 2 ? [{
        action: 'JOB_STAGE_CHANGED',
        meta: {
          stage: 'REACHED'
        },
        at: hour(i + 2)
      }] : [])]
    });
    await mongoose.connection.collection('servicerequests').insertOne({
      _id: job,
      brand,
      createdAt: hour(i),
      serviceProvider: provider
    });
    lines.push({
      _id: line,
      brand,
      ticket,
      ticketNo: `TEST-${i}`,
      categoryKey: 'AC',
      serviceType: 'repair',
      state,
      city,
      rate: {
        amount: i === 2 ? 200 : 100
      },
      subtotal: i === 2 ? 200 : 100,
      gstAmount: i === 2 ? 36 : 18,
      total: i === 2 ? 236 : 118,
      status: 'invoiced',
      completedAt: completed,
      closedAt: completed
    });
  }
  await WarrantyClaim.collection.insertMany(tickets);
  const invoice = id();
  for (const l of lines.slice(0, 3)) l.invoice = invoice;
  await BillingLine.collection.insertMany(lines);
  await BrandInvoice.collection.insertOne({
    _id: invoice,
    brand: w.lg._id,
    status: 'partially_paid',
    lines: lines.slice(0, 3).map(l => l._id),
    lineSnapshots: lines.slice(0, 3).map(l => ({
      total: l.total
    })),
    subtotal: 400,
    gstAmount: 72,
    total: 472,
    paidAmount: 118,
    dueDate: new Date('2026-08-10')
  });
  return {
    ...w,
    owner,
    tickets,
    lines
  };
}
it('state/city totals reconcile stored charges and exclude the other brand', async () => {
  const w = await fixture();
  const r = await reports.getReport(w.lg._id, 'state-city-billing');
  expect(r.totals).toEqual({
    calls: 3,
    subtotal: 400,
    gst: 72,
    total: 472
  });
  expect(r.rows).toHaveLength(3);
  expect(r.rows.find(r => r.city === 'Pune')).toMatchObject({
    calls: 1,
    rates: [{
      amount: 100,
      calls: 1
    }],
    total: 118
  });
  expect(r.states.find(s => s.state === 'Maharashtra')).toMatchObject({
    calls: 2,
    total: 236
  });
});
it('source, product, warranty, SLA and resolution have known outcomes', async () => {
  const w = await fixture();
  expect((await reports.source(w.lg._id)).rows.find(r => r.source === 'toll_free')).toMatchObject({
    tickets: 2,
    approved: 2,
    rejected: 0,
    approvedPercent: 100,
    avgDecisionHours: 2
  });
  expect((await reports.product(w.lg._id)).rows[0]).toMatchObject({
    tickets: 3,
    inWarranty: 1,
    outOfWarranty: 1,
    verification: 1,
    repeatComplaints: 1,
    repeatPercent: 33.33
  });
  const warranty = await reports.warranty(w.lg._id);
  expect(warranty.rows).toContainEqual({
    dimension: 'rejection',
    value: 'NOT_COVERED',
    tickets: 1
  });
  expect((await reports.sla(w.lg._id, {}, {
    now
  })).rows.find(r => r.stage === 'Response')).toMatchObject({
    measured: 3,
    met: 2,
    breached: 1,
    warning: 0,
    avgOverrunHours: 1
  });
  for (const percentiles of [true, false]) {
    const r = await reports.resolutionTime(w.lg._id, {}, {
      percentiles
    });
    expect(r.rows).toHaveLength(2);
    expect(r.rows.find(r => r.city === 'Pune')).toMatchObject({
      completed: 1,
      avgHours: 10,
      medianHours: 10,
      p90Hours: 10
    });
  }
});
it('billing attributes receipts to frozen lines and ageing without duplicating invoices', async () => {
  const w = await fixture();
  expect((await reports.billing(w.lg._id, {}, {
    now
  })).rows[0]).toMatchObject({
    calls: 3,
    invoiced: 472,
    paid: 118,
    pending: 354,
    overdue: 354,
    days1to30: 354,
    current: 0
  });
  expect((await reports.billing(w.lg._id, {
    city: 'Pune'
  }, {
    now
  })).rows[0]).toMatchObject({
    calls: 1,
    invoiced: 118,
    paid: 29.5,
    pending: 88.5
  });
  await BrandInvoice.collection.updateOne({
    brand: w.lg._id
  }, {
    $set: {
      paidAmount: 0.01
    }
  });
  const all = (await reports.billing(w.lg._id, {}, {
    now
  })).rows[0];
  const selected = await Promise.all(['Pune', 'Mumbai', 'Indore'].map(city => reports.billing(w.lg._id, {
    city
  }, {
    now
  })));
  expect(selected.reduce((sum, r) => sum + r.rows[0].paid, 0)).toBe(all.paid);
  expect(all.paid).toBe(0.01);
  await BrandInvoice.collection.updateOne({
    brand: w.lg._id
  }, {
    $set: {
      status: 'draft'
    }
  });
  expect((await reports.billing(w.lg._id)).rows[0]).toMatchObject({
    invoiced: 0,
    paid: 0,
    pending: 0
  });
});
it('partner metrics are scoped to these tickets and expose only name and performance', async () => {
  const w = await fixture();
  const r = (await reports.partnerPerformance(w.lg._id, {}, {
    now
  })).rows[0];
  expect(r).toMatchObject({
    name: 'Own partner',
    jobs: 3,
    completed: 2,
    completionPercent: 66.67,
    avgTatHours: 19,
    averageRating: 5,
    repeatVisits: 1,
    repeatVisitPercent: 33.33,
    firstVisitBreachPercent: 0
  });
  expect(JSON.stringify(r)).not.toContain('PRIVATE');
  expect(r._id).toBeUndefined();
});
it('all dimensions filter ticket and billing cohorts; end dates are exclusive', async () => {
  const w = await fixture();
  for (const report of Object.keys(reports.REPORTS)) {
    const r = await reports.getReport(w.lg._id, report, {
      state: 'Maharashtra',
      city: 'Pune',
      categoryKey: 'AC',
      serviceType: 'repair',
      source: 'toll_free'
    }, {
      now
    });
    expect(r.rows.length).toBeGreaterThan(0);
    expect((await reports.getReport(w.lg._id, report, {
      city: 'Missing'
    }, {
      now
    })).rows).toEqual([]);
    expect((await reports.getReport(w.lg._id, report, {
      categoryKey: 'Missing'
    }, {
      now
    })).rows).toEqual([]);
    expect((await reports.getReport(w.lg._id, report, {
      productType: String(id())
    }, {
      now
    })).rows).toEqual([]);
    expect((await reports.getReport(w.lg._id, report, {
      from: '2026-09-01',
      to: '2026-10-01'
    }, {
      now
    })).rows).toEqual([]);
  }
  expect((await reports.source(w.lg._id, {
    to: hour(1)
  })).rows[0].tickets).toBe(1);
  expect((await reports.stateCityBilling(w.lg._id, {
    to: hour(10)
  })).rows).toEqual([]);
  expect((await reports.source(w.lg._id, {
    status: 'Rejected'
  })).rows[0].tickets).toBe(1);
  expect((await reports.stateCityBilling(w.lg._id, {
    status: 'billable'
  })).rows).toEqual([]);
  // Historical identity lookup is independent of cohort dates.
  expect((await reports.product(w.lg._id, {
    from: hour(1),
    to: hour(2)
  })).rows[0].repeatComplaints).toBe(1);
});
it('view/export permissions, input validation and retirement are enforced', async () => {
  const w = await fixture(),
    viewer = await kit.brandUser(w.lg, {
      templates: ['viewer']
    }),
    cce = await kit.brandUser(w.lg, {
      templates: ['cce']
    });
  await api('/product', viewer).expect(200);
  await api('/product?format=csv', viewer).expect(403);
  await api('/product', cce).expect(403);
  await api('/options', cce).expect(403);
  await api('', w.owner).expect(403);
  await api('/not-a-report', w.owner).expect(404);
  await api('/source?brand=other', w.owner).expect(400);
  await api('/source?from=bad', w.owner).expect(400);
  await api('/source?from=2026-09-01&to=2026-08-01', w.owner).expect(400);
});
it('all reports export CSV and valid XLSX with headers, row counts, filenames and audit', async () => {
  const w = await fixture();
  for (const report of Object.keys(reports.REPORTS)) {
    const expected = await reports.getReport(w.lg._id, report);
    const csv = await api(`/${report}?format=csv`, w.owner).expect(200);
    expect(csv.headers['content-disposition']).toMatch(new RegExp(`-${report}-all-all.csv`));
    expect(csv.text.trim().split('\r\n')).toHaveLength(expected.rows.length + 1);
    expect(csv.text).toContain(`"${expected.columns[0].label}"`);
    const xlsx = await api(`/${report}?format=xlsx`, w.owner).buffer(true).parse((res, cb) => {
      const a = [];
      res.on('data', b => a.push(b));
      res.on('end', () => cb(null, Buffer.concat(a)));
    }).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx.body);
    expect(wb.worksheets[0].rowCount).toBe(expected.rows.length + 1);
    expect(wb.worksheets[0].getCell('A1').value).toBe(expected.columns[0].label);
  }
  expect(await AuditLog.countDocuments({
    action: 'report.exported',
    brand: w.lg._id
  })).toBe(16);
});
it('CSV quotes and neutralizes spreadsheet formulas', async () => {
  const w = await fixture();
  await BillingLine.collection.updateOne({
    _id: w.lines[0]._id
  }, {
    $set: {
      city: '=HYPERLINK("evil")'
    }
  });
  const csv = await api('/state-city-billing?format=csv', w.owner).expect(200);
  expect(csv.text).toContain('"\'=HYPERLINK(""evil"")"');
});
it('mixed city rates stay distinct and void lines are excluded by default', async () => {
  const w = await fixture();
  await BillingLine.collection.updateOne({
    _id: w.lines[1]._id
  }, {
    $set: {
      city: 'Pune',
      'rate.amount': 200
    }
  });
  const r = await reports.stateCityBilling(w.lg._id, {
    state: 'Maharashtra'
  });
  expect(r.rows[0].rates).toEqual([{
    amount: 100,
    calls: 1
  }, {
    amount: 200,
    calls: 1
  }]);
  expect(r.totals.total).toBe(236); // Stored totals are authoritative; rates are descriptive.
  await BillingLine.collection.updateOne({
    _id: w.lines[1]._id
  }, {
    $set: {
      status: 'void'
    }
  });
  expect((await reports.stateCityBilling(w.lg._id)).totals.calls).toBe(2);
  expect((await reports.stateCityBilling(w.lg._id, {
    status: 'void'
  })).totals.calls).toBe(1);
});
it('repeat complaints use appliance identity when serials are absent', async () => {
  const w = await fixture(),
    appliance = id();
  await WarrantyClaim.collection.updateMany({
    _id: {
      $in: w.tickets.slice(0, 2).map(t => t._id)
    }
  }, {
    $set: {
      serialNumber: ''
    }
  });
  await mongoose.connection.collection('servicerequests').updateMany({
    _id: {
      $in: w.tickets.slice(0, 2).map(t => t.serviceRequest)
    }
  }, {
    $set: {
      appliance
    }
  });
  expect((await reports.product(w.lg._id)).rows[0].repeatComplaints).toBe(1);
});
it('SLA warns in the last 20 percent, preserves paused clocks and detects unswept visit breaches', async () => {
  const w = await fixture();
  await WarrantyClaim.collection.updateOne({
    _id: w.tickets[0]._id
  }, {
    $set: {
      status: 'Service In Progress',
      sla: {
        hours: {
          response: 2
        },
        responseDueAt: new Date(+now + 360000),
        visitDueAt: new Date(+now - 3600000),
        met: {},
        breaches: []
      }
    }
  });
  await WarrantyClaim.collection.updateOne({
    _id: w.tickets[2]._id
  }, {
    $set: {
      status: 'On Hold',
      sla: {
        hours: {
          response: 2
        },
        responseDueAt: new Date(+now - 3600000),
        pausedAt: new Date(+now - 7200000),
        met: {},
        breaches: []
      }
    }
  });
  expect((await reports.sla(w.lg._id, {}, {
    now
  })).rows.find(r => r.stage === 'Response')).toMatchObject({
    warning: 1,
    pending: 1,
    breached: 0,
    met: 1
  });
  expect((await reports.partnerPerformance(w.lg._id, {}, {
    now
  })).rows[0].firstVisitBreachPercent).toBe(50);
});
it('bounded fallback computes exact median and p90, and row overflow returns actionable 413', async () => {
  const w = await fixture();
  await WarrantyClaim.collection.updateOne({
    _id: w.tickets[2]._id
  }, {
    $set: {
      'address.city': 'Pune'
    }
  });
  const r = await reports.resolutionTime(w.lg._id, {}, {
    percentiles: false
  });
  expect(r.rows[0]).toMatchObject({
    completed: 2,
    avgHours: 19,
    medianHours: 19,
    p90Hours: 26.2
  });
  const spy = jest.spyOn(WarrantyClaim, 'aggregate').mockReturnValue({
    allowDiskUse: () => Promise.resolve(Array(reports.MAX_REPORT_ROWS + 1).fill({}))
  });
  try {
    const response = await api('/source?format=csv', w.owner).expect(413);
    expect(JSON.stringify(response.body)).toContain('Narrow');
  } finally {
    spy.mockRestore();
  }
});
