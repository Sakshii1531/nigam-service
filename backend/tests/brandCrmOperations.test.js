import { beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { brandCrmKit } from './helpers/brandCrm.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Escalation } from '../src/modules/super-admin/escalation.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { ReplacementApproval } from '../src/modules/brand-admin/replacementApproval.model.js';
import { listBrandCompletions } from '../src/modules/brand-admin/brandCompletions.service.js';

let server;
const kit = brandCrmKit(() => server, { phoneStart: 9382000000 });
const api = (method, path, user, body) => kit.api()[method](`/api/v1/brand${path}`).set(kit.bearer(user.token)).send(body);
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmOperations'));
  await registerAllModels(); await ensureIndexes(); server = await listenOnLoopback(createApp());
});
afterAll(async () => { await awaitPendingDeliveries(); await closeServer(server); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await awaitPendingDeliveries(); invalidateBrandPermissions(); await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({}))); });
async function world() {
  const w = await kit.world();
  return { ...w, owner: await kit.brandAdmin(w.lg), foreign: await kit.brandAdmin(w.samsung), viewer: await kit.brandUser(w.lg, { templates: ['viewer'] }),
    customer: await kit.customer(), partner: await kit.flow.partner(['AC'], 'Completion Partner') };
}
async function job(w, completedAt, extra = {}) {
  const sr = await ServiceRequest.create({ brand: w.lg._id, user: w.customer.user._id, serviceProvider: w.partner.serviceProvider._id,
    category: 'AC', status: 'Closed', timeline: [{ stepLabel: 'Repair Completed', done: true, timestamp: completedAt }], ...extra });
  await Job.create({ serviceRequest: sr._id, serviceProvider: w.partner.serviceProvider._id, type: 'Brand Warranty', completion: { at: completedAt } });
  return sr;
}
it('uses recorded completion time across the India midnight boundary and reports totals/ratings beyond the first page', async () => {
  const w = await world();
  const now = new Date('2026-10-13T00:30:00Z');
  const boundary = new Date('2026-10-12T18:30:00Z');
  for (let i = 0; i < 22; i++) await job(w, new Date(+boundary - 1 - i));
  const today = await job(w, boundary);
  await Review.create({ serviceRequest: today._id, user: w.customer.user._id, rating: 4 });
  await job(w, boundary, { brand: w.samsung._id });
  const first = await listBrandCompletions(w.lg._id, {}, now);
  expect(first.items).toHaveLength(20);
  expect(first.meta).toMatchObject({ total: 23, totalPages: 2, summary: { total: 23, averageRating: 4, feedbackPending: 22 } });
  const daily = await listBrandCompletions(w.lg._id, { tab: 'today' }, now);
  expect(daily.items.map(r => r.id)).toEqual([today.id]);
  expect(daily.items[0].serviceProvider.name).toBe('Completion Partner');
  expect(daily.items[0].completedAt).toEqual(boundary);
  expect((await listBrandCompletions(w.lg._id, { page: 2 }, now)).items).toHaveLength(3);
  expect((await listBrandCompletions(w.lg._id, { q: today.humanId }, now)).meta.total).toBe(1);
});
it('exports all matching completions safely and refuses an operations viewer export', async () => {
  const w = await world();
  await User.updateOne({ _id: w.customer.user._id }, { name: '=HYPERLINK("bad")' });
  for (let i = 0; i < 21; i++) await job(w, new Date('2026-10-12'));
  await job(w, new Date('2026-10-12'), { brand: w.samsung._id });
  const csv = await api('get', '/completions?format=csv', w.owner).expect(200);
  expect(csv.headers['content-disposition']).toContain('brand-completions.csv');
  expect(csv.text.split('\r\n')).toHaveLength(22);
  expect(csv.text).toContain("'=HYPERLINK");
  expect(csv.text).toContain('Completion Partner');
  await api('get', '/completions?format=csv', w.viewer).expect(403);
  expect(await AuditLog.countDocuments({ brand: w.lg._id, action: 'report.exported' })).toBe(1);
});
it('persists Re-QC as an audited escalation and shows it as pending until resolved', async () => {
  const w = await world(); const sr = await job(w, new Date('2026-10-12'));
  const body = { serviceRequest: sr.id, reason: 'Re-QC: Customer reports the fault returned' };
  await api('post', '/escalations', w.foreign, body).expect(404);
  await api('post', '/escalations', w.viewer, body).expect(403);
  const created = (await api('post', '/escalations', w.owner, body).expect(201)).body.data;
  expect(await Escalation.findById(created.id)).toMatchObject({ reason: body.reason, brand: w.lg._id });
  const list = (await api('get', '/completions?tab=pending_qc', w.owner).expect(200)).body;
  expect(list.data[0]).toMatchObject({ id: sr.id, qcStatus: 'Pending QC', reQcRequested: true });
  expect(list.meta.summary.pendingQc).toBe(1);
  await api('post', `/escalations/${created.id}/resolve`, w.owner, { resolution: 'Quality review completed and the customer contacted' }).expect(200);
  expect((await api('get', '/completions?tab=pending_qc', w.owner).expect(200)).body.data).toHaveLength(0);
  expect(await AuditLog.countDocuments({ brand: w.lg._id, action: 'escalation.created' })).toBeGreaterThan(0);
});
it('exports the full filtered replacement report with partner names and tenant isolation', async () => {
  const w = await world(); const sr = await job(w, new Date('2026-10-12'));
  await ReplacementApproval.create({ brand: w.lg._id, serviceRequest: sr._id, serviceProvider: w.partner.serviceProvider._id, product: 'AC', status: 'Approved' });
  await ReplacementApproval.create({ brand: w.lg._id, serviceRequest: sr._id, product: 'Other', status: 'Pending' });
  await ReplacementApproval.create({ brand: w.samsung._id, serviceRequest: sr._id, product: 'Foreign', status: 'Approved' });
  const result = await api('get', `/replacement-approvals?format=csv&status=Approved&q=${encodeURIComponent(w.customer.user.name)}`, w.owner).expect(200);
  expect(result.text.split('\r\n')).toHaveLength(2);
  expect(result.text).toContain('Completion Partner');
  expect(result.text).not.toContain('Foreign');
  await api('get', '/replacement-approvals?format=csv', w.viewer).expect(403);
});
it('renders downloadable, escaped, snapshotted documents and rejects foreign job/document references', async () => {
  const w = await world(); const sr = await job(w, new Date('2026-10-12'));
  await User.updateOne({ _id: w.customer.user._id }, { name: '<script>alert(1)</script>' });
  const document = (await api('post', '/documents', w.owner, { serviceRequest: sr.id, type: 'Service Completion Letter' }).expect(201)).body.data;
  await ServiceRequest.updateOne({ _id: sr._id }, { status: 'Customer Confirmation' });
  const html = await api('get', `/documents/${document.id}?format=html`, w.owner).expect(200);
  expect(html.headers['content-type']).toContain('text/html');
  expect(html.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html.text).not.toContain('<script>alert(1)</script>');
  expect(html.text).toContain('Print / Save PDF');
  expect(html.text).toContain('Closed');
  expect(html.text).not.toContain('Customer Confirmation');
  expect(html.text).toContain(sr.humanId);
  await api('post', '/documents', w.foreign, { serviceRequest: sr.id, type: 'Warranty Certificate' }).expect(404);
  await api('get', `/documents/${document.id}?format=html`, w.foreign).expect(404);
});
