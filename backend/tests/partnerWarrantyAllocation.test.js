import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { WarrantyGroup } from '../src/modules/partner-warranty/warrantyGroup.model.js';
import { WarrantyIssue } from '../src/modules/partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../src/modules/partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { rankServiceProviders } from '../src/modules/shared/assignmentEngine.js';
import { sweepExpiredAssignments, autoAssignPendingRequests } from '../src/modules/service-requests/serviceRequest.service.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { partnerWarrantyKit } from './helpers/partnerWarranty.js';

const TEST_DB_URI = testDbUri('partnerWarrantyAllocation');

let app;
const kit = partnerWarrantyKit(() => app, { phoneStart: 9310600000 });
const { api, bearer } = kit;

// Customer's saved address (kit default): Indore 452001 at 22.72, 75.86.
// ~0.01° latitude ≈ 1.1 km.
const near = (km) => ({ latitude: 22.72 + km / 111, longitude: 75.86 });

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

const MODELS = [Category, Brand, WarrantyGroup, WarrantyIssue, WarrantyClaim, ServiceRequest, ServiceProvider, Job, User, AuditLog, Notification];
const clearAll = () => Promise.all(MODELS.map((m) => m.deleteMany({})));

beforeEach(clearAll);

// LG has no authorized partners in most scenarios, so every offer notes the fallback (D6).
const FALLBACK = '; brand has no authorized partners — skill-qualified partner used';

let nameSeq = 0;
/** A partner; `at` = km from the customer (null = no location), defaults to an Indore AC tech. */
async function partner({ specs = ['AC'], at = 2, city = 'Indore', brands = [], pincodes, radius, tier, availability = 'Available', name } = {}) {
  const label = name || `Partner ${nameSeq++}`;
  const sp = await kit.flow.partner(specs, label);
  const set = { serviceCityName: city, availability, authorizedBrands: brands.map((b) => b._id) };
  if (at != null) set.location = near(at);
  if (pincodes) set.servicePincodes = pincodes;
  if (radius) set.serviceRadiusKm = radius;
  if (tier) set.tier = tier;
  await ServiceProvider.updateOne({ _id: sp.serviceProvider._id }, set);
  return { ...sp, id: String(sp.serviceProvider._id), name: label };
}

async function scenario() {
  const w = await kit.world();
  const [lg, cust, admin] = await Promise.all([kit.brandAdmin(w.lg), kit.customer(), kit.superAdmin()]);
  const claim = await kit.submitClaim(w, cust);
  return { w, lg, cust, admin, claim };
}

async function approve({ lg, claim }) {
  await api().post(`/api/v1/brand/warranty-claims/${claim.id}/approve`).set(bearer(lg.token)).send({}).expect(200);
  const saved = await WarrantyClaim.findById(claim.id);
  return { saved, sr: await ServiceRequest.findById(saved.serviceRequest) };
}

const assignedTo = async (srId) => {
  const sr = await ServiceRequest.findById(srId);
  return sr.serviceProvider ? String(sr.serviceProvider) : null;
};

describe('Phase 6 — who is eligible for a warranty job', () => {
  it('skill is a hard filter (a non-warranty booking would still take a generalist)', async () => {
    const s = await scenario();
    await partner({ specs: ['Refrigerator'], at: 1 });

    const { saved, sr } = await approve(s);
    expect(sr.serviceProvider).toBeNull();
    expect(saved.flags.allocationFailed).toBe(true);

    // Contrast: ordinary ranking keeps the generalist, at a lower skill score.
    const ordinary = await rankServiceProviders({ category: 'AC', city: 'Indore' });
    expect(ordinary).toHaveLength(1);
    expect(ordinary[0].skill).toBe(40);
  });

  it('only the brand\'s authorized partners, when it has any — even if an unauthorized one is nearer', async () => {
    const s = await scenario();
    await partner({ at: 1, name: 'Near, not authorized' });
    const auth = await partner({ at: 5, brands: [s.w.lg], name: 'Far, LG authorized' });

    const { saved, sr } = await approve(s);
    expect(String(sr.serviceProvider)).toBe(auth.id);
    expect(saved.flags.unauthorizedFallback).toBe(false);
  });

  it('falls back to skill-qualified partners when the brand has none authorized, and flags it', async () => {
    const s = await scenario();
    await partner({ at: 1, brands: [s.w.samsung], name: 'Samsung-only tech' }); // authorized for another brand
    const near1 = await partner({ at: 2, name: 'Nearest generic' });
    await ServiceProvider.updateOne({ _id: near1.id }, { location: near(0.5) });

    const { sr } = await approve(s);
    // Both are skill-qualified; LG has nobody authorized, so the nearest one wins.
    expect(String(sr.serviceProvider)).toBe(near1.id);
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.flags.unauthorizedFallback).toBe(true);
    expect(saved.timeline.at(-1)).toMatchObject({ action: 'PARTNER_OFFERED', visibility: 'internal' });
    expect(saved.timeline.at(-1).note).toMatch(/no authorized partners/);
  });

  it('respects service pincodes, radius, and city', async () => {
    const s = await scenario();
    await partner({ at: 1, pincodes: ['462001'], name: 'Bhopal pincodes only' });
    await partner({ at: 10, radius: 5, name: '10 km away, 5 km radius' });
    await partner({ at: null, city: 'Bhopal', name: 'Other city, no location' });
    await partner({ at: 40, name: '40 km, default 25 km radius' });
    const ok = await partner({ at: 8, pincodes: ['452001', '452002'], name: 'Serves 452001' });

    const { sr } = await approve(s);
    expect(String(sr.serviceProvider)).toBe(ok.id);
  });

  it('prefers the nearer partner, and the more senior one when distance is unknown', async () => {
    const s = await scenario();
    await partner({ at: 6, name: 'six' });
    const nearest = await partner({ at: 3, name: 'three' });
    let { sr } = await approve(s);
    expect(String(sr.serviceProvider)).toBe(nearest.id);

    // No locations anywhere → city match; tier breaks the tie.
    await clearAll();
    const s2 = await scenario();
    await partner({ at: null, tier: 'TSP', name: 'junior' });
    const senior = await partner({ at: null, tier: 'Senior SP', name: 'senior' });
    ({ sr } = await approve(s2));
    expect(String(sr.serviceProvider)).toBe(senior.id);
  });

  it('skips partners who are offline', async () => {
    const s = await scenario();
    await partner({ at: 1, availability: 'Offline' });
    const online = await partner({ at: 4 });
    const { sr } = await approve(s);
    expect(String(sr.serviceProvider)).toBe(online.id);
  });
});

describe('Phase 6 — offer, reject, timeout, never stuck', () => {
  it('reject → the next eligible partner, with the dispatch history on the claim', async () => {
    const s = await scenario();
    const first = await partner({ at: 1, name: 'First' });
    const second = await partner({ at: 3, name: 'Second' });
    const { sr } = await approve(s);
    expect(await assignedTo(sr._id)).toBe(first.id);

    await api().post(`/api/v1/service-provider/jobs/reject/${sr.id}`).set(bearer(first.token)).expect(200);
    expect(await assignedTo(sr._id)).toBe(second.id);

    const saved = await WarrantyClaim.findById(s.claim.id);
    const history = saved.timeline.filter((e) => e.visibility === 'internal').map((e) => e.note);
    expect(history).toEqual([`Offered to First${FALLBACK}`, 'First declined', `Offered to Second${FALLBACK}`]);
  });

  it('timeout → the next eligible partner', async () => {
    const s = await scenario();
    await partner({ at: 1, name: 'Sleepy' });
    const second = await partner({ at: 3, name: 'Awake' });
    const { sr } = await approve(s);

    await ServiceRequest.updateOne({ _id: sr._id }, { assignedAt: new Date(Date.now() - 5 * 60 * 1000) });
    const { passedOn } = await sweepExpiredAssignments();
    expect(passedOn).toBe(1);
    expect(await assignedTo(sr._id)).toBe(second.id);
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.timeline.map((e) => e.note)).toContain('Sleepy did not respond in time');
  });

  it('when everyone eligible says no: not thrown into the open pool, flagged for Super Admin', async () => {
    const s = await scenario();
    const only = await partner({ at: 1, name: 'Only one' });
    const fridgeTech = await partner({ specs: ['Refrigerator'], at: 1, name: 'Fridge tech' });
    const { sr } = await approve(s);

    await api().post(`/api/v1/service-provider/jobs/reject/${sr.id}`).set(bearer(only.token)).expect(200);

    const after = await ServiceRequest.findById(sr._id);
    expect(after.serviceProvider).toBeNull();
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.flags.allocationFailed).toBe(true);
    expect(await Notification.countDocuments({ recipient: s.admin.user._id, title: 'Warranty Job Needs Manual Assignment' })).toBe(1);

    // Nobody can pick it up from the open feed — not the unqualified tech in the same city.
    const feed = await api().get('/api/v1/service-provider/jobs/available').set(bearer(fridgeTech.token)).expect(200);
    expect(feed.body.data.map((j) => j.id)).not.toContain(sr.id);
    await api().post(`/api/v1/service-provider/jobs/accept/${sr.id}`).set(bearer(fridgeTech.token)).send({}).expect(403);
  });

  it('recovers automatically when an eligible partner comes online', async () => {
    const s = await scenario();
    const { saved: failed, sr } = await approve(s);
    expect(failed.flags.allocationFailed).toBe(true);

    const late = await partner({ at: 2, name: 'Came online' });
    await autoAssignPendingRequests();

    expect(await assignedTo(sr._id)).toBe(late.id);
    const saved = await WarrantyClaim.findById(s.claim.id);
    expect(saved.flags.allocationFailed).toBe(false);
    expect(saved.timeline.at(-1).note).toBe(`Offered to Came online${FALLBACK}; after an earlier allocation failure`);
  });
});

describe('Phase 6 — what the partner sees', () => {
  it('the offer and the accepted job carry brand, product, issue, area, both IDs and "Warranty Service"', async () => {
    const s = await scenario();
    const sp = await partner({ at: 1 });
    const { saved, sr } = await approve(s);

    const feed = await api().get('/api/v1/service-provider/jobs/available').set(bearer(sp.token)).expect(200);
    const offer = feed.body.data.find((j) => j.id === sr.id);
    const expected = {
      isWarranty: true,
      serviceLabel: 'Warranty Service',
      jobId: sr.humanId,
      claimId: saved.humanId,
      brand: 'LG',
      productName: 'Air Conditioner',
      issueName: 'Cooling Issue',
      area: 'Indore',
      pincode: '452001',
    };
    expect(offer.warranty).toMatchObject({ ...expected, customerPays: 0 });
    // Before accepting: nothing of the customer's documents.
    expect(offer.warranty.documents).toBeUndefined();

    const accepted = await api().post(`/api/v1/service-provider/jobs/accept/${sr.id}`).set(bearer(sp.token)).send({}).expect(200);
    const context = await api().get(`/api/v1/service-provider/jobs/${accepted.body.data.id}/context`).set(bearer(sp.token)).expect(200);
    expect(context.body.data.warranty).toMatchObject({ ...expected, claimStatus: 'Partner Assigned' });
    // Once theirs: where to go — the full address and map position (the offer
    // above had only area + pincode) — and the invoice/photos, the purchase date.
    expect(offer.warranty.address).toBeUndefined();
    expect(context.body.data.warranty.address).toMatchObject({
      house: '12 MG Road',
      city: 'Indore',
      pincode: '452001',
      latitude: 22.72,
      longitude: 75.86,
      line: '12 MG Road, Indore, MP 452001',
    });
    expect(context.body.data.warranty.documents).toEqual(saved.documents.map((d) => ({ kind: d.kind, url: d.url, name: d.name || null })));
    expect(context.body.data.warranty.documents.length).toBeGreaterThan(0);
    expect(new Date(context.body.data.warranty.purchaseDate).getTime()).toBe(saved.purchaseDate.getTime());

    // The active-jobs list (the partner app's job cards) carries it too.
    const active = await api().get('/api/v1/service-provider/jobs/active').set(bearer(sp.token)).expect(200);
    const activeWarranty = active.body.data.find((j) => j.id === accepted.body.data.id).warranty;
    expect(activeWarranty).toMatchObject(expected);
    expect(activeWarranty.address.line).toBe('12 MG Road, Indore, MP 452001');

    // History: "Warranty (B2B2C)" lists only partner-warranty jobs.
    await ServiceRequest.create({ user: s.cust.user._id, category: 'AC', zone: 'Indore', status: 'Assigned', serviceProvider: sp.id, assignedAt: new Date() }).then((plain) =>
      api().post(`/api/v1/service-provider/jobs/accept/${plain.id}`).set(bearer(sp.token)).send({}).expect(200),
    );
    const all = await api().get('/api/v1/service-provider/jobs/history').set(bearer(sp.token)).expect(200);
    const b2b2c = await api().get('/api/v1/service-provider/jobs/history?type=b2b2c').set(bearer(sp.token)).expect(200);
    expect(all.body.data.items).toHaveLength(2);
    expect(b2b2c.body.data.items.map((j) => j.id)).toEqual([accepted.body.data.id]);
  });

  it('ordinary jobs carry no warranty block', async () => {
    const s = await scenario();
    const sp = await partner({ at: 1 });
    await ServiceRequest.create({ user: s.cust.user._id, category: 'AC', zone: 'Indore', status: 'Assigned', serviceProvider: sp.id, assignedAt: new Date() });
    const feed = await api().get('/api/v1/service-provider/jobs/available').set(bearer(sp.token)).expect(200);
    expect(feed.body.data).toHaveLength(1);
    expect(feed.body.data[0].warranty).toBeNull();
  });
});

describe('Phase 6 — Super Admin sets partner eligibility', () => {
  it('sets authorized brands, pincodes and radius; validates them; admins only', async () => {
    const s = await scenario();
    const sp = await partner({ at: 1 });
    const url = `/api/v1/super-admin/warranty-catalog/service-providers/${sp.id}`;

    const res = await api()
      .put(url)
      .set(bearer(s.admin.token))
      .send({ authorizedBrands: [String(s.w.lg._id)], servicePincodes: ['452001', '452001', '452010'], serviceRadiusKm: 15 })
      .expect(200);
    expect(res.body.data).toMatchObject({
      authorizedBrands: [{ id: String(s.w.lg._id), name: 'LG' }],
      servicePincodes: ['452001', '452010'],
      serviceRadiusKm: 15,
      specs: ['AC'],
      hasLocation: true,
    });

    await api().put(url).set(bearer(s.admin.token)).send({ authorizedBrands: [String(new mongoose.Types.ObjectId())] }).expect(400);
    await api().put(url).set(bearer(s.admin.token)).send({ servicePincodes: ['4520'] }).expect(400);
    await api().get(url).set(bearer(s.lg.token)).expect(403);
    expect(await AuditLog.countDocuments({ type: 'Warranty', action: /eligibility/ })).toBe(1);
  });

  it('the shortlist for a warranty job applies the warranty rules and shows authorization', async () => {
    const s = await scenario();
    await partner({ specs: ['Refrigerator'], at: 1, name: 'Wrong skill' });
    await partner({ at: 2, brands: [s.w.lg], availability: 'Offline', name: 'Authorized but offline' });
    const { sr } = await approve(s);

    const { suggestServiceProviders } = await import('../src/modules/service-requests/serviceRequest.service.js');
    const list = await suggestServiceProviders(sr.id);
    expect(list.map((p) => p.name)).toEqual(['Authorized but offline']);
    expect(list[0]).toMatchObject({ availability: 'Offline', authorizedForBrand: true });
  });
});
