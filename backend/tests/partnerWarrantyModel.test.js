import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { generateHumanId } from '../src/modules/shared/idGenerator.js';
import { Counter } from '../src/modules/shared/counter.model.js';
import { ID_PREFIXES, ROLES } from '../src/config/constants.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import {
  CLAIM_STATUS,
  CLAIM_STATUSES,
  CLAIM_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransition,
  customerStatusLabel,
} from '../src/modules/partner-warranty/claimStatus.js';
import { appendEvent, flushAudit, recordAndSave } from '../src/modules/partner-warranty/claimTimeline.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { Claim } from '../src/modules/warranty-amc-exchange/claim.model.js';
import { createServiceRequest } from '../src/modules/service-requests/serviceRequest.service.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { testDbUri } from './helpers/testDb.js';
import { jobFlow } from './helpers/jobFlow.js';

const TEST_DB_URI = testDbUri('partnerWarrantyModel');
const YEAR = new Date().getFullYear();

let app;
const flow = jobFlow(() => app, { phoneStart: 9310100000 });
const S = CLAIM_STATUS;
const SYSTEM = { kind: 'system', name: 'test' };

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await registerAllModels();
  await ensureIndexes();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function makeCustomer() {
  return User.create({ role: ROLES.CUSTOMER, name: 'Asha', phone: String(9310000000 + Math.floor(Math.random() * 99999)), passwordHash: 'x' });
}

async function makeClaim(overrides = {}) {
  const [customer, brand] = await Promise.all([
    makeCustomer(),
    Brand.create({ name: `Brand ${new mongoose.Types.ObjectId()}`, status: 'Active' }),
  ]);
  return WarrantyClaim.create({
    customer: customer._id,
    brand: brand._id,
    categoryKey: 'AC',
    productName: 'Split AC',
    issueName: 'Cooling Issue',
    address: { city: 'Indore', state: 'MP', pincode: '452001' },
    ...overrides,
  });
}

describe('Phase 1 — human IDs', () => {
  // Counters restart from 1, so the documents that consumed earlier IDs go too.
  beforeEach(async () => {
    await Promise.all([
      Counter.deleteMany({}),
      User.deleteMany({}),
      WarrantyClaim.deleteMany({}),
      ServiceRequest.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await Counter.deleteMany({});
    await Promise.all([User.deleteMany({}), WarrantyClaim.deleteMany({}), ServiceRequest.deleteMany({})]);
  });

  it('claims get NCCW-{current year}-###### and count up', async () => {
    expect(await generateHumanId(ID_PREFIXES.WARRANTY_TICKET)).toBe(`NCCW-${YEAR}-000001`);
    expect(await generateHumanId(ID_PREFIXES.WARRANTY_TICKET)).toBe(`NCCW-${YEAR}-000002`);
  });

  it('service jobs get NCCJ-{current year}-###### on their own counter', async () => {
    await generateHumanId(ID_PREFIXES.WARRANTY_TICKET);
    expect(await generateHumanId(ID_PREFIXES.SERVICE_JOB)).toBe(`NCCJ-${YEAR}-000001`);
  });

  it('a saved WarrantyClaim is stamped with an NCCW humanId', async () => {
    const claim = await makeClaim();
    expect(claim.humanId).toMatch(new RegExp(`^NCCW-${YEAR}-\\d{6}$`));
    expect(claim.status).toBe(S.SUBMITTED);
  });

  it('a ServiceRequest can carry an NCCJ humanId, B2B2C mode, pincode and its claim', async () => {
    const claim = await makeClaim();
    const humanId = await generateHumanId(ID_PREFIXES.SERVICE_JOB);
    const sr = await ServiceRequest.create({
      humanId,
      user: claim.customer,
      brand: claim.brand,
      requestMode: 'B2B2C',
      pincode: '452001',
      warrantyClaim: claim._id,
    });
    expect(sr.humanId).toBe(humanId);
    expect(sr.requestMode).toBe('B2B2C');
    expect(String(sr.warrantyClaim)).toBe(String(claim._id));
  });
});

describe('Phase 1 — claim status machine', () => {
  it('has a transition row for every status', () => {
    for (const status of CLAIM_STATUSES) expect(CLAIM_TRANSITIONS[status]).toBeDefined();
  });

  it('allows the happy path end to end', () => {
    const path = [
      S.SUBMITTED, S.BRAND_REVIEW, S.INFO_REQUESTED, S.BRAND_REVIEW, S.APPROVED, S.JOB_CREATED,
      S.PARTNER_ASSIGNED, S.VISIT_SCHEDULED, S.TECHNICIAN_ON_WAY, S.SERVICE_IN_PROGRESS,
      S.SERVICE_COMPLETED, S.CLOSED,
    ];
    for (let i = 1; i < path.length; i += 1) expect(canTransition(path[i - 1], path[i])).toBe(true);
  });

  it('rejects skipping the brand decision or closing early', () => {
    expect(canTransition(S.SUBMITTED, S.JOB_CREATED)).toBe(false);
    expect(canTransition(S.SUBMITTED, S.CLOSED)).toBe(false);
    expect(canTransition(S.BRAND_REVIEW, S.PARTNER_ASSIGNED)).toBe(false);
    expect(canTransition(S.SERVICE_COMPLETED, S.PARTNER_ASSIGNED)).toBe(false);
  });

  it('lets every non-terminal status go on hold or be cancelled, and no terminal one', () => {
    for (const status of CLAIM_STATUSES) {
      const expected = !TERMINAL_STATUSES.includes(status) && status !== S.ON_HOLD;
      expect(canTransition(status, S.ON_HOLD)).toBe(expected);
      expect(canTransition(status, S.CANCELLED)).toBe(expected);
    }
  });

  it('only allows reopening terminal claims back into review or service', () => {
    expect(CLAIM_TRANSITIONS[S.REJECTED]).toEqual([S.BRAND_REVIEW]);
    expect(CLAIM_TRANSITIONS[S.CLOSED]).toEqual([S.BRAND_REVIEW, S.JOB_CREATED]);
  });

  it('shows customers friendly labels', () => {
    expect(customerStatusLabel(S.BRAND_REVIEW)).toBe('Brand Verification');
    expect(customerStatusLabel(S.JOB_CREATED)).toBe('Warranty Approved');
  });
});

describe('Phase 1 — timeline + audit trail', () => {
  it('records who moved the claim, from what, to what, and why', async () => {
    const claim = await makeClaim();
    const actor = { kind: 'brand', user: new mongoose.Types.ObjectId(), name: 'LG Reviewer' };
    appendEvent(claim, { action: 'BRAND_OPENED', toStatus: S.BRAND_REVIEW, actor, visibility: 'brand' });
    appendEvent(claim, { action: 'CLAIM_REJECTED', toStatus: S.REJECTED, actor, note: 'Serial number mismatch' });
    await claim.save();
    await flushAudit(claim);

    const saved = await WarrantyClaim.findById(claim._id);
    expect(saved.status).toBe(S.REJECTED);
    expect(saved.timeline).toHaveLength(2);
    expect(saved.timeline[1]).toMatchObject({
      action: 'CLAIM_REJECTED',
      fromStatus: S.BRAND_REVIEW,
      toStatus: S.REJECTED,
      note: 'Serial number mismatch',
      visibility: 'customer',
    });
    expect(saved.timeline[1].actor.name).toBe('LG Reviewer');

    const audit = await AuditLog.find({ entityType: 'WarrantyClaim', entityId: claim._id }).sort({ createdAt: 1, _id: 1 });
    expect(audit).toHaveLength(2);
    expect(audit[1]).toMatchObject({
      type: 'Warranty',
      fromStatus: S.BRAND_REVIEW,
      toStatus: S.REJECTED,
      reason: 'Serial number mismatch',
    });
    expect(String(audit[1].user)).toBe(String(actor.user));
  });

  it('refuses an illegal move and leaves the claim untouched', async () => {
    const claim = await makeClaim();
    expect(() => appendEvent(claim, { action: 'STATUS_CHANGED', toStatus: S.CLOSED, actor: SYSTEM })).toThrow(
      'Cannot move claim from "Submitted" to "Closed"',
    );
    expect(claim.status).toBe(S.SUBMITTED);
    expect(claim.timeline).toHaveLength(0);
  });

  it('remembers the status before hold and clears it on resume', async () => {
    const claim = await makeClaim();
    await recordAndSave(claim, { action: 'BRAND_OPENED', toStatus: S.BRAND_REVIEW, actor: SYSTEM });
    await recordAndSave(claim, { action: 'PUT_ON_HOLD', toStatus: S.ON_HOLD, actor: SYSTEM, note: 'Customer travelling' });
    expect(claim.statusBeforeHold).toBe(S.BRAND_REVIEW);
    await recordAndSave(claim, { action: 'RESUMED', toStatus: claim.statusBeforeHold, actor: SYSTEM });
    expect(claim.status).toBe(S.BRAND_REVIEW);
    expect(claim.statusBeforeHold).toBeNull();
  });

  it('records a note without moving the status', async () => {
    const claim = await makeClaim();
    await recordAndSave(claim, { action: 'NOTE_ADDED', actor: SYSTEM, note: 'Called customer', visibility: 'internal' });
    expect(claim.status).toBe(S.SUBMITTED);
    expect(claim.timeline[0]).toMatchObject({ fromStatus: null, toStatus: null, visibility: 'internal' });
  });

  it('stamps closedAt when a claim closes', async () => {
    const claim = await makeClaim({ status: S.SERVICE_COMPLETED });
    await recordAndSave(claim, { action: 'STATUS_CHANGED', toStatus: S.CLOSED, actor: SYSTEM });
    expect(claim.closedAt).toBeInstanceOf(Date);
  });
});

describe('Phase 1 — bug fixes', () => {
  it('a brand warranty notification reaches only that brand\'s users', async () => {
    const [lg, samsung] = await Promise.all([
      Brand.create({ name: 'LG Notify', status: 'Active' }),
      Brand.create({ name: 'Samsung Notify', status: 'Active' }),
    ]);
    const [lgAdmin, samsungAdmin] = await Promise.all([
      User.create({ role: ROLES.BRAND_ADMIN, name: 'LG Admin', email: 'lg-notify@test.local', brand: lg._id, passwordHash: 'x' }),
      User.create({ role: ROLES.BRAND_ADMIN, name: 'Samsung Admin', email: 'ss-notify@test.local', brand: samsung._id, passwordHash: 'x' }),
    ]);
    const customer = await makeCustomer();

    await createServiceRequest({ user: customer._id, brand: lg._id, warranty: 'In Warranty', category: 'AC' });

    const toLg = await Notification.find({ recipient: lgAdmin._id, title: 'Brand Warranty Claim' });
    const toSamsung = await Notification.find({ recipient: samsungAdmin._id });
    const broadcast = await Notification.find({ title: 'Brand Warranty Claim', recipient: null });
    expect(toLg).toHaveLength(1);
    expect(toSamsung).toHaveLength(0);
    expect(broadcast).toHaveLength(0);
  });

  it('a parts claim on a Brand Warranty job carries the real brand name', async () => {
    const brand = await Brand.create({ name: 'LG Parts', status: 'Active' });
    const sp = await flow.partner(['AC']);
    const customer = await makeCustomer();
    const sr = await ServiceRequest.create({
      user: customer._id,
      brand: brand._id,
      category: 'AC',
      warranty: 'In Warranty',
      status: 'Assigned',
      serviceProvider: sp.serviceProvider._id,
      assignedAt: new Date(),
    });

    const auth = { Authorization: `Bearer ${sp.token}` };
    const accepted = await request(app).post(`/api/v1/service-provider/jobs/accept/${sr.id}`).set(auth).send({}).expect(200);
    const jobId = accepted.body.data.id;
    expect(accepted.body.data.type).toBe('Brand Warranty');
    await request(app).post(`/api/v1/service-provider/jobs/${jobId}/start-travel`).set(auth).expect(200);
    await request(app).post(`/api/v1/service-provider/jobs/${jobId}/arrive`).set(auth).expect(200);
    await request(app).post(`/api/v1/service-provider/jobs/${jobId}/diagnosis`).set(auth).send({ notes: 'compressor' }).expect(200);
    await request(app)
      .post(`/api/v1/service-provider/jobs/${jobId}/spare-parts`)
      .set(auth)
      .send({ parts: [{ name: 'Compressor', price: 4200, checked: true }] })
      .expect(200);

    const claims = await Claim.find({ serviceRequest: sr._id });
    expect(claims).toHaveLength(1);
    expect(claims[0].brand).toBe('LG Parts');
    expect(claims[0].claimType).toBe('Brand');

    // …which is what the brand panel's claim list matches on.
    const admin = await User.create({
      role: ROLES.BRAND_ADMIN,
      name: 'LG Parts Admin',
      email: 'lg-parts@test.local',
      brand: brand._id,
      passwordHash: await hashPassword('password123'),
    });
    const token = await flow.loginAndVerify({ role: ROLES.BRAND_ADMIN, identifier: admin.email });
    const list = await request(app).get('/api/v1/brand/claims').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.data.map((c) => c.item)).toContain('Compressor');
  });
});
