// Reproducible Phase 14 benchmark. Creates and drops ONLY its own temporary DB.
// BRAND_REPORT_BENCH_URI=mongodb://127.0.0.1:27018 node scripts/benchmarkBrandReports.js
import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { registerAllModels } from '../src/config/registerModels.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { BillingLine } from '../src/modules/brand-crm/billingLine.model.js';
import { getReport, REPORTS } from '../src/modules/brand-crm/brandReports.service.js';
const uri = process.env.BRAND_REPORT_BENCH_URI;
if (!uri) throw new Error('Set BRAND_REPORT_BENCH_URI to a disposable local MongoDB server');
const parsed = new URL(uri);
if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) throw new Error('Benchmark requires a local MongoDB server');
parsed.pathname = `/nigam_care_report_benchmark_${randomUUID().replaceAll('-', '')}`;
await mongoose.connect(parsed.toString());
try {
  await registerAllModels();
  await Promise.all([WarrantyClaim.createIndexes(), BillingLine.createIndexes(), mongoose.model('ServiceRequest').createIndexes()]);
  const brand = new mongoose.Types.ObjectId(),
    other = new mongoose.Types.ObjectId(),
    provider = new mongoose.Types.ObjectId();
  const start = new Date('2026-08-01'),
    tickets = [],
    lines = [],
    jobs = [];
  for (let i = 0; i < 10000; i++) {
    const ticket = new mongoose.Types.ObjectId(),
      job = new mongoose.Types.ObjectId(),
      created = new Date(+start + i * 1000),
      completed = new Date(+created + 36000000);
    tickets.push({
      _id: ticket,
      brand,
      createdAt: created,
      source: i % 2 ? 'toll_free' : 'ncc_app',
      status: 'Closed',
      categoryKey: 'AC',
      serialNumber: `SER-${Math.floor(i / 2)}`,
      address: {
        state: i % 2 ? 'Maharashtra' : 'MP',
        city: i % 2 ? 'Pune' : 'Indore'
      },
      serviceType: 'repair',
      serviceRequest: job,
      warranty: {
        status: 'In Warranty'
      },
      coverageDecision: 'warranty',
      timeline: [{
        action: 'CLAIM_APPROVED',
        at: new Date(+created + 3600000)
      }],
      sla: {
        hours: {
          response: 2
        },
        responseDueAt: new Date(+created + 7200000),
        met: {
          response: new Date(+created + 3600000),
          resolution: completed
        },
        breaches: []
      }
    });
    lines.push({
      _id: new mongoose.Types.ObjectId(),
      brand,
      ticket,
      completedAt: completed,
      categoryKey: 'AC',
      serviceType: 'repair',
      state: tickets[i].address.state,
      city: tickets[i].address.city,
      rate: {
        amount: 100
      },
      subtotal: 100,
      gstAmount: 18,
      total: 118,
      status: 'billable'
    });
    jobs.push({
      _id: job,
      brand,
      createdAt: created,
      serviceProvider: provider
    });
  }
  // Ensure tenant selectivity and a real comparison population for the planner.
  await WarrantyClaim.collection.insertMany([...tickets, ...tickets.map(t => ({
    ...t,
    _id: new mongoose.Types.ObjectId(),
    brand: other
  }))]);
  await BillingLine.collection.insertMany([...lines, ...lines.map(l => ({
    ...l,
    _id: new mongoose.Types.ObjectId(),
    brand: other
  }))]);
  await mongoose.connection.collection('servicerequests').insertMany(jobs);
  await mongoose.connection.collection('serviceproviders').insertOne({
    _id: provider,
    name: 'Benchmark partner'
  });
  const version = (await mongoose.connection.db.admin().command({
    buildInfo: 1
  })).version;
  console.log(JSON.stringify({
    version,
    cohortTickets: 10000,
    otherBrandTickets: 10000,
    billingLines: 20000
  }));
  for (const report of Object.keys(REPORTS)) {
    const captured = [];
    const model = ['billing', 'state-city-billing'].includes(report) ? BillingLine : WarrantyClaim;
    const original = model.aggregate;
    model.aggregate = function (pipeline, ...args) {
      captured.push(pipeline);
      return original.call(this, pipeline, ...args);
    };
    const began = performance.now();
    let data;
    try {
      data = await getReport(brand, report, {
        from: '2026-08-01',
        to: '2026-09-01'
      });
    } finally {
      model.aggregate = original;
    }
    const elapsedMs = Math.round(performance.now() - began);
    const explanations = await Promise.all(captured.map(pipeline => model.aggregate(pipeline).explain('executionStats')));
    const explanation = explanations[0];
    const cursor = explanation.stages?.find(s => s.$cursor)?.$cursor || explanation;
    const indexes = new Set();
    const visit = x => {
      if (!x || typeof x !== 'object') return;
      if (x.indexName) indexes.add(x.indexName);
      if (x.indexesUsed) for (const n of x.indexesUsed) indexes.add(n);
      for (const v of Object.values(x)) visit(v);
    };
    visit(cursor.queryPlanner?.winningPlan);
    for (const stage of explanation.stages || []) if (stage.$lookup) visit({
      indexesUsed: stage.indexesUsed
    });
    console.log(JSON.stringify({
      report,
      elapsedMs,
      rows: data.rows.length,
      explainMs: cursor.executionStats?.executionTimeMillis,
      docsExamined: cursor.executionStats?.totalDocsExamined,
      keysExamined: cursor.executionStats?.totalKeysExamined,
      indexes: [...indexes]
    }));
  }
} finally {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
