import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
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
  phoneStart: 9371200000
});
beforeAll(async () => {
  await mongoose.connect(testDbUri('brandCrmRates'));
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
  const owner = await kit.brandAdmin(w.lg),
    other = await kit.brandAdmin(w.samsung),
    cce = await kit.brandUser(w.lg, {
      templates: ['cce']
    }),
    admin = await kit.superAdmin();
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
describe('Phase 12 dated call rates', () => {
  it('resolves city > state > national, canonicalizes geography and separates payout', async () => {
    const w = await world();
    await api('post', '/brand/rates', w.owner, payload(w)).expect(200);
    await api('post', '/brand/rates', w.owner, {
      ...payload(w),
      state: 'maharashtra',
      brandRate: 400
    }).expect(200);
    await api('post', `/super-admin/brand-rates?brand=${w.lg._id}`, w.admin, {
      ...payload(w),
      state: 'MAHARASHTRA',
      city: 'pUne',
      brandRate: 450,
      partnerPayout: 200
    }).expect(200);
    const resolve = (state, city) => resolveRate({
      brand: w.lg._id,
      categoryId: w.ac._id,
      serviceType: 'repair',
      state,
      city
    });
    expect(await resolve('Maharashtra', 'Pune')).toMatchObject({
      rate: 450,
      matchedOn: 'city',
      row: {
        state: 'Maharashtra',
        city: 'Pune'
      }
    });
    expect(await resolve('Maharashtra', 'Mumbai')).toMatchObject({
      rate: 400,
      matchedOn: 'state'
    });
    expect(await resolve('Madhya Pradesh', 'Indore')).toMatchObject({
      rate: 300,
      matchedOn: 'national'
    });
    const claim = await kit.createTicketAs(w.owner, kit.ticketInput(w, await kit.customer(), {
      address: {
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001'
      }
    }));
    expect(await coveredVisitRate({
      brand: w.lg._id,
      warrantyClaim: claim._id
    })).toEqual({
      amount: 200,
      missing: false
    });
    const list = await api('get', '/brand/rates', w.owner).expect(200);
    expect(JSON.stringify(list.body)).not.toContain('partnerPayout');
    const preview = await api('get', `/brand/rates/resolve?categoryId=${w.ac._id}&serviceType=repair&state=Maharashtra&city=Pune`, w.owner).expect(200);
    expect(JSON.stringify(preview.body)).not.toContain('partnerPayout');
    expect(preview.body.data.rate).toBe(450);
    expect((await api('get', '/brand/rates', w.other).expect(200)).body.data).toEqual([]);
    await api('post', '/brand/rates', w.owner, {
      ...payload(w),
      partnerPayout: 999
    }).expect(400);
  });
  it('rejects overlaps, unknown geography, invalid money and unauthorized writes', async () => {
    const w = await world();
    await api('post', '/brand/rates', w.owner, payload(w)).expect(200);
    await api('post', '/brand/rates', w.owner, {
      ...payload(w),
      effectiveFrom: '2026-03-01'
    }).expect(409);
    for (const data of [{
      state: 'Unknown'
    }, {
      state: 'Maharashtra',
      city: 'Unknown'
    }, {
      city: 'Pune'
    }, {
      brandRate: 1.001
    }]) await api('post', '/brand/rates', w.owner, {
      ...payload(w),
      ...data
    }).expect(400);
    await api('post', '/brand/rates', w.cce, payload(w)).expect(403);
    await api('get', '/brand/rate-cards', w.owner).expect(403);
  });
  it('versions used rates, preserves historical resolution and closes deactivated rates', async () => {
    const w = await world();
    const first = (await api('post', '/brand/rates', w.owner, payload(w)).expect(200)).body.data;
    await BrandRate.updateOne({
      _id: first.id
    }, {
      $set: {
        usageCount: 1
      }
    });
    const next = (await api('patch', `/brand/rates/${first.id}`, w.owner, {
      brandRate: 500
    }).expect(200)).body.data;
    expect(next.id).not.toBe(first.id);
    const query = {
      brand: w.lg._id,
      categoryId: w.ac._id,
      serviceType: 'repair'
    };
    expect((await resolveRate({
      ...query,
      at: new Date('2026-06-01')
    })).rate).toBe(300);
    expect((await resolveRate(query)).rate).toBe(500);
    await api('post', `/brand/rates/${next.id}/deactivate`, w.owner).expect(200);
    expect((await resolveRate(query)).matchedOn).toBe('missing');
    await api('patch', `/brand/rates/${first.id}`, w.owner, {
      brandRate: 99
    }).expect(409);
  });
  it('previews CSV without writes, commits valid rows and rejects payout columns for brands', async () => {
    const w = await world();
    const csv = `category,serviceType,state,city,brandRate,effectiveFrom\n${w.ac._id},repair,Maharashtra,Pune,450,2026-01-01`;
    const dry = (await api('post', '/brand/rates/import', w.owner, {
      csv,
      dryRun: true
    }).expect(200)).body.data;
    expect(dry).toMatchObject({
      ok: 1,
      imported: 0,
      errors: []
    });
    expect(await BrandRate.countDocuments()).toBe(0);
    await api('post', '/brand/rates/import', w.owner, {
      csv,
      dryRun: false
    }).expect(200);
    expect(await BrandRate.countDocuments()).toBe(1);
    const exported = await api('get', '/brand/rates/export', w.owner).expect(200);
    expect(exported.text).toContain('450');
    expect(exported.text).not.toContain('partnerPayout');
    await api('post', '/brand/rates/import', w.owner, {
      csv: 'category,partnerPayout\na,200',
      dryRun: true
    }).expect(400);
  });
  it('serializes concurrent overlapping creates', async () => {
    const w = await world();
    const responses = await Promise.all([api('post', '/brand/rates', w.owner, payload(w)), api('post', '/brand/rates', w.owner, {
      ...payload(w),
      effectiveFrom: '2026-02-01'
    })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await BrandRate.countDocuments()).toBe(1);
  });
  it('cancels future rules without blocking replacement dates, and rejects expired row edits', async () => {
    const w=await world(), future={...payload(w),effectiveFrom:'2090-01-01T00:00:00Z'};
    const first=(await api('post','/brand/rates',w.owner,future).expect(200)).body.data;
    await api('post',`/brand/rates/${first.id}/deactivate`,w.owner).expect(200);
    await api('post','/brand/rates',w.owner,{...future,effectiveFrom:'2090-02-01T00:00:00Z'}).expect(200);
    const old=(await api('post','/brand/rates',w.owner,{...payload(w),effectiveTo:'2026-02-01T00:00:00Z'}).expect(200)).body.data;
    await api('patch',`/brand/rates/${old.id}`,w.owner,{brandRate:100}).expect(409);
  });

  it('imports different service keys together without treating them as overlapping',async()=>{
    const w=await world();const csv=`category,serviceType,brandRate,effectiveFrom\n${w.ac._id},repair,450,2026-01-01\n${w.ac._id},demo,200,2026-01-01`;
    const preview=(await api('post','/brand/rates/import',w.owner,{csv,dryRun:true}).expect(200)).body.data;
    expect(preview).toMatchObject({ok:2,errors:[],imported:0});
    await api('post','/brand/rates/import',w.owner,{csv,dryRun:false}).expect(200);expect(await BrandRate.countDocuments()).toBe(2);
  });

});
