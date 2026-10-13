import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Brand, derivePrefix } from '../src/modules/super-admin/brand.model.js';
import { BrandSettings } from '../src/modules/brand-admin/brandSettings.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { Counter } from '../src/modules/shared/counter.model.js';
import { createTicket } from '../src/modules/partner-warranty/ticketIntake.service.js';
import { recordAction } from '../src/modules/shared/auditLog.js';
import { actorFromUser } from '../src/modules/brand-crm/actor.js';
import { LOCAL_UPLOAD_DIR } from '../src/modules/shared/fileUpload.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { brandCrmKit } from './helpers/brandCrm.js';

const TEST_DB_URI = testDbUri('brandCrmTicket');
const YEAR = new Date().getFullYear();
const MB = 1024 * 1024;

let app;
const kit = brandCrmKit(() => app, { phoneStart: 9320100000 });
const { api, bearer } = kit;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  app = await listenOnLoopback(createApp());
});

afterAll(async () => {
  await closeServer(app);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all(
    [Category, Brand, BrandSettings, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, User, Role, AuditLog, Notification, Counter].map(
      (m) => m.deleteMany({}),
    ),
  );
});

/** LG world, an LG CCE with an employee ID and a role, and one customer. */
async function scenario() {
  const w = await kit.world();
  const [cce, cust] = await Promise.all([
    kit.brandUser(w.lg, { employeeId: 'LG-CC-014', name: 'Neha K', templates: ['cce'] }),
    kit.customer(),
  ]);
  return { w, cce, cust };
}

const removeUpload = (url) => {
  if (url?.startsWith('/uploads/')) fs.rmSync(path.join(LOCAL_UPLOAD_DIR, path.basename(url)), { force: true });
};

describe('Phase 1 — brand ticket prefixes', () => {
  it('derives a prefix from the name', () => {
    expect(derivePrefix('LG')).toBe('LG');
    expect(derivePrefix('Samsung')).toBe('SAMS');
    expect(derivePrefix('Blue Star')).toBe('BLUES');
    expect(derivePrefix('Voltas Beko India')).toBe('VOLTBI');
    expect(derivePrefix('A')).toBe('AX');
  });

  it('gives every new brand a prefix, numbering a clash', async () => {
    const samsung = await Brand.create({ name: 'Samsung' });
    const samsonite = await Brand.create({ name: 'Samsonite' });
    const given = await Brand.create({ name: 'Whirlpool', ticketPrefix: 'whp' });
    expect(samsung.ticketPrefix).toBe('SAMS');
    expect(samsonite.ticketPrefix).toBe('SAMS2');
    expect(given.ticketPrefix).toBe('WHP');
  });
});

describe('Phase 1 — the customer app goes through createTicket', () => {
  it('stores source, both ticket numbers and the customer as captured, with no registrant', async () => {
    const { w, cust } = await scenario();
    const view = await kit.submitClaim(w, cust);

    const ticket = await WarrantyClaim.findById(view.id).lean();
    expect(ticket.humanId).toMatch(new RegExp(`^NCCW-${YEAR}-\\d{6}$`));
    expect(ticket.brandTicketNo).toBe(`LG-${YEAR}-000001`);
    expect(ticket).toMatchObject({
      source: 'ncc_app',
      priority: 'Normal',
      serviceType: 'repair',
      registeredBy: null,
      assignedCce: null,
      customerSnapshot: { name: 'Test Customer', phone: cust.user.phone },
      warranty: { status: 'In Warranty', months: 24 },
    });
    // The creation event names the customer, with a full actor snapshot.
    expect(ticket.timeline[0]).toMatchObject({ action: 'CLAIM_SUBMITTED', actor: { kind: 'customer', name: 'Test Customer' }, meta: { source: 'ncc_app' } });
  });

  it('keeps the customer-facing duplicate message', async () => {
    const { w, cust } = await scenario();
    const first = await kit.submitClaim(w, cust, { serialNumber: 'DUP-1' });
    const invoice = await kit.upload(cust.token);
    const dup = await api()
      .post('/api/v1/partner-warranty/claims')
      .set(bearer(cust.token))
      .send({
        brandId: String(w.lg._id),
        categoryId: String(w.ac._id),
        issueId: String(w.cooling._id),
        modelNumber: 'AS-Q18',
        serialNumber: 'dup-1',
        purchaseDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        addressId: cust.addressId,
        documents: [{ kind: 'invoice', url: invoice }],
      })
      .expect(409);
    expect(dup.body.error.message).toBe(`You already have an open claim for this product (${first.humanId})`);
  });
});

describe('Phase 1 — staff-registered tickets', () => {
  it('records the CCE as registrant and owner, with employee ID, in the ticket, timeline and audit', async () => {
    const { w, cce, cust } = await scenario();
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust, { priority: 'High' }));

    const expectedActor = { kind: 'brand', name: 'Neha K', employeeId: 'LG-CC-014', roles: ['Customer Care Executive'] };
    expect(ticket.source).toBe('toll_free');
    expect(ticket.priority).toBe('High');
    expect(ticket.registeredBy).toMatchObject(expectedActor);
    expect(ticket.assignedCce).toMatchObject(expectedActor);
    expect(ticket.assignedCce.assignedAt).toBeInstanceOf(Date);
    expect(ticket.timeline[0]).toMatchObject({ action: 'CLAIM_SUBMITTED', note: 'Registered via Toll-Free call', actor: expectedActor });

    const audit = await AuditLog.findOne({ entityType: 'WarrantyClaim', entityId: ticket._id }).lean();
    expect(String(audit.brand)).toBe(String(w.lg._id));
    expect(audit.actor).toMatchObject(expectedActor);
    expect(String(audit.user)).toBe(String(cce.user._id));
  });

  it('leaves the owner empty when the brand does not auto-assign', async () => {
    const { w, cce, cust } = await scenario();
    await BrandSettings.create({ brand: w.lg._id, cceAutoAssign: 'none' });
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust), 'brand_manual');
    expect(ticket.source).toBe('brand_manual');
    expect(ticket.registeredBy.employeeId).toBe('LG-CC-014');
    expect(ticket.assignedCce).toBeNull();
  });

  it('needs verification when the purchase date is missing — never a guess', async () => {
    const { w, cce, cust } = await scenario();
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust, { purchaseDate: undefined, serialNumber: undefined }));
    expect(ticket.warranty).toMatchObject({ status: 'Verification Required', reasons: expect.arrayContaining(['NO_PURCHASE_DATE', 'NO_SERIAL', 'NO_INVOICE']) });
  });

  it('takes a free-text issue when the catalogue has none', async () => {
    const { w, cce, cust } = await scenario();
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust, { issue: undefined, issueName: 'Water dripping from indoor unit' }));
    expect(ticket.issue).toBeNull();
    expect(ticket.issueName).toBe('Water dripping from indoor unit');
  });

  it('refuses a staff source without a brand user, an uncovered product and a non-customer', async () => {
    const { w, cce, cust } = await scenario();
    await expect(createTicket(kit.ticketInput(w, cust), { source: 'toll_free' })).rejects.toThrow('needs the registering brand user');
    await expect(createTicket(kit.ticketInput(w, cust), { source: 'carrier_pigeon' })).rejects.toThrow('unknown source');
    await expect(kit.createTicketAs(cce, kit.ticketInput(w, cust, { category: w.fridge.toObject(), issue: w.fridgeNoise.toObject() })))
      .rejects.toMatchObject({ statusCode: 400, message: 'LG does not service Refrigerator' });
    await expect(kit.createTicketAs(cce, kit.ticketInput(w, { user: cce.user })))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(await WarrantyClaim.countDocuments()).toBe(0);
  });
});

describe('Phase 1 — numbering', () => {
  it('counts brand ticket numbers per brand, while NCCW stays platform-wide', async () => {
    const { w, cce, cust } = await scenario();
    const sCce = await kit.brandUser(w.samsung, { employeeId: 'SAMS-1' });
    const a = await kit.createTicketAs(cce, kit.ticketInput(w, cust));
    const b = await kit.createTicketAs(cce, kit.ticketInput(w, cust));
    const s = await kit.createTicketAs(sCce, kit.ticketInput(w, cust, { brand: w.samsung.toObject() }));

    expect([a.brandTicketNo, b.brandTicketNo]).toEqual([`LG-${YEAR}-000001`, `LG-${YEAR}-000002`]);
    expect(s.brandTicketNo).toBe(`SAMS-${YEAR}-000001`);
    expect(new Set([a.humanId, b.humanId, s.humanId]).size).toBe(3);
  });

  it('backfills a prefix for a brand saved before prefixes existed', async () => {
    const { w, cce, cust } = await scenario();
    await Brand.collection.updateOne({ _id: w.lg._id }, { $unset: { ticketPrefix: '' } });
    const lean = await Brand.findById(w.lg._id).lean();
    expect(lean.ticketPrefix).toBeUndefined();

    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust, { brand: lean }));
    expect(ticket.brandTicketNo).toBe(`LG-${YEAR}-000001`);
    expect((await Brand.findById(w.lg._id)).ticketPrefix).toBe('LG');
  });

  it('never lets a ticket change its source', async () => {
    const { w, cce, cust } = await scenario();
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust));
    ticket.source = 'whatsapp';
    await ticket.save();
    expect((await WarrantyClaim.findById(ticket._id)).source).toBe('toll_free');
  });
});

describe('Phase 1 — auto-approval by source (README D6)', () => {
  it('always holds NCC App tickets for approval even with legacy or directly injected auto-approval settings', async () => {
    const { w, cust } = await scenario();
    await BrandSettings.collection.insertOne({ brand: w.lg._id, autoApproveSources: ['ncc_app', 'whatsapp', 'api'] });
    const ticket = await kit.submitClaim(w, cust);
    const saved = await WarrantyClaim.findById(ticket.id);
    expect(saved.warranty.status).toBe('In Warranty');
    expect(saved.status).toBe('Submitted');
    expect(saved.serviceRequest).toBeFalsy();
    expect(saved.timeline.some(e => e.action === 'CLAIM_APPROVED')).toBe(false);
    await expect(new BrandSettings({ brand: w.samsung._id, autoApproveSources: ['ncc_app'] }).validate()).rejects.toThrow();
  });
  it('approves and creates the NCC job at once for a listed source, when in warranty', async () => {
    const { w, cce, cust } = await scenario();
    await BrandSettings.create({ brand: w.lg._id, autoApproveSources: ['toll_free'] });

    const invoice = await kit.upload(cust.token);
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust, {documents:[{kind:'invoice',url:invoice}]}));
    expect(ticket.status).toBe('Job Created');
    expect(ticket.coverageDecision).toBe('warranty');
    const sr = await ServiceRequest.findById(ticket.serviceRequest);
    expect(sr.humanId).toMatch(new RegExp(`^NCCJ-${YEAR}-\\d{6}$`));
    expect(ticket.timeline.map((e) => e.action)).toEqual(expect.arrayContaining(['CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'JOB_CREATED']));
  });

  it('still waits for a person when the warranty needs verification, or the source is not listed', async () => {
    const { w, cce, cust } = await scenario();
    await BrandSettings.create({ brand: w.lg._id, autoApproveSources: ['toll_free'] });

    const unverified = await kit.createTicketAs(cce, kit.ticketInput(w, cust, { purchaseDate: undefined }));
    const manual = await kit.createTicketAs(cce, kit.ticketInput(w, cust), 'brand_manual');
    expect(unverified.status).toBe('Submitted');
    expect(manual.status).toBe('Submitted');
    expect(await ServiceRequest.countDocuments()).toBe(0);
  });
});

describe('Phase 1 — employee IDs and audit helper', () => {
  it('keeps employee IDs unique within a brand only', async () => {
    const w = await kit.world();
    await kit.brandUser(w.lg, { employeeId: 'E-1' });
    await kit.brandUser(w.samsung, { employeeId: 'E-1' });
    await expect(kit.brandUser(w.lg, { employeeId: 'E-1' })).rejects.toMatchObject({ code: 11000 });
  });

  it('recordAction writes a brand-scoped row with the actor snapshot and a diff', async () => {
    const { w, cce } = await scenario();
    const actor = await actorFromUser(cce.user._id, 'brand');
    await recordAction({ brand: w.lg._id, entityType: 'BrandRate', action: 'rate.updated', actor, meta: { changes: { amount: [400, 450] } } });

    const row = await AuditLog.findOne({ action: 'rate.updated' }).lean();
    expect(String(row.brand)).toBe(String(w.lg._id));
    expect(String(row.user)).toBe(String(cce.user._id));
    expect(row.actor).toMatchObject({ employeeId: 'LG-CC-014', roles: ['Customer Care Executive'] });
    expect(row.meta).toEqual({ changes: { amount: [400, 450] } });
  });

  it('shows the brand who registered a ticket and who acted, by employee ID', async () => {
    const { w, cce, cust } = await scenario();
    const ticket = await kit.createTicketAs(cce, kit.ticketInput(w, cust));

    const res = await api().get(`/api/v1/brand/warranty-claims/${ticket._id}`).set(bearer(cce.token)).expect(200);
    expect(res.body.data).toMatchObject({
      source: 'toll_free',
      brandTicketNo: ticket.brandTicketNo,
      registeredBy: { name: 'Neha K', employeeId: 'LG-CC-014' },
      warranty: { status: 'Verification Required' },
    });
    const opened = res.body.data.timeline.find((e) => e.action === 'BRAND_OPENED');
    expect(opened.by).toEqual({ kind: 'brand', name: 'Neha K', employeeId: 'LG-CC-014' });
  });
});

describe('Phase 1 — the second complaint system is gone (README D4)', () => {
  it('has no POST /service-requests for a brand', async () => {
    const { w, cce, cust } = await scenario();
    await api()
      .post('/api/v1/service-requests')
      .set(bearer(cce.token))
      .send({ user: String(cust.user._id), category: 'AC', description: 'No cooling' })
      .expect(404);
    expect(await ServiceRequest.countDocuments({ brand: w.lg._id })).toBe(0);
  });
});

describe('Phase 1 — videos (README D17)', () => {
  const uploadFile = (token, size, contentType, filename) =>
    api().post('/api/v1/uploads').set(bearer(token)).attach('file', Buffer.alloc(size, 1), { filename, contentType });

  it('accepts a video up to 50 MB and holds images and PDFs to 10 MB', async () => {
    const { cust } = await scenario();
    const video = await uploadFile(cust.token, 12 * MB, 'video/mp4', 'leak.mp4').expect(200);
    expect(video.body.data.url).toMatch(/\.mp4$/);
    removeUpload(video.body.data.url);

    const bigPdf = await uploadFile(cust.token, 12 * MB, 'application/pdf', 'bill.pdf').expect(400);
    expect(bigPdf.body.error.message).toMatch(/at most 10 MB/);
    const hugeVideo = await uploadFile(cust.token, 51 * MB, 'video/mp4', 'long.mp4').expect(400);
    expect(hugeVideo.body.error.message).toMatch(/at most 50 MB/);
  });

  it('allows two videos on a ticket, not three', async () => {
    const { w, cust } = await scenario();
    const urls = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await uploadFile(cust.token, 1024, 'video/mp4', `clip${i}.mp4`).expect(200);
      urls.push(res.body.data.url);
    }
    const video = (url) => ({ kind: 'video', url, name: 'clip.mp4' });

    const invoice = await kit.upload(cust.token);
    const ok = await kit.submitClaim(w, cust, {
      serialNumber: 'VID-2',
      documents: [{ kind: 'invoice', url: invoice }, video(urls[0]), video(urls[1])],
    });
    expect(ok.documents.filter((d) => d.kind === 'video')).toHaveLength(2);

    const third = await api()
      .post(`/api/v1/partner-warranty/claims/${ok.id}/documents`)
      .set(bearer(cust.token))
      .send({ documents: [video(urls[2])] })
      .expect(400);
    expect(third.body.error.message).toBe('A claim can hold at most 2 videos');
    urls.forEach(removeUpload);
  });

  it('counts videos on staff tickets too', async () => {
    const { w, cce, cust } = await scenario();
    const docs = [1, 2, 3].map((n) => ({ kind: 'video', url: `/uploads/v${n}.mp4`, uploadedBy: cce.user._id }));
    await expect(kit.createTicketAs(cce, kit.ticketInput(w, cust, { documents: docs }))).rejects.toMatchObject({ statusCode: 400 });
  });
});
