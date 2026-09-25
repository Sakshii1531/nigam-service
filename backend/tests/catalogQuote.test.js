import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { Variant } from '../src/modules/catalog/variant.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { OfferingRate } from '../src/modules/catalog/offeringRate.model.js';
import { Coupon } from '../src/modules/rewards-loyalty/coupon.model.js';
import { createRateVersion } from '../src/modules/catalog/rateWriter.js';
import { buildQuote } from '../src/modules/catalog/quote.service.js';
import { resolveRate } from '../src/modules/catalog/rateResolver.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { seedTestCatalogue } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const TEST_DB_URI = testDbUri('catalog_quote');

let app;

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
  await Promise.all(
    [User, Category, ProductType, Variant, CatalogService, ServiceOffering, OfferingRate, Coupon].map((model) => model.deleteMany({})),
  );
  await seedTestCatalogue();
});

const idOf = async (code) => String((await ServiceOffering.findOne({ code }))._id);
const variantId = async (label) => String((await Variant.findOne({ label }))._id);

async function quote(lines, extra = {}, token = null) {
  const req = request(app).post('/api/v1/catalog/quote');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send({ lines, ...extra });
}

async function tree(key, query = '') {
  return request(app).get(`/api/v1/catalog/categories/${encodeURIComponent(key)}/tree${query}`);
}

/** Every key anywhere in a JSON value. */
function allKeys(value, keys = []) {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, keys));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.push(k);
      allKeys(v, keys);
    }
  }
  return keys;
}
const INTERNAL = /payout|margin|incentive|internalNotes|needsRateReview|reason|changedBy/i;

async function customerToken(walletCoins = 0) {
  const phone = '9200000077';
  await User.create({ role: ROLES.CUSTOMER, phone, name: 'Quote Customer', walletCoins, passwordHash: await hashPassword('password123') });
  await request(app).post('/api/v1/auth/login').send({ role: ROLES.CUSTOMER, identifier: phone, password: 'password123' }).expect(200);
  const res = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ role: ROLES.CUSTOMER, identifier: phone, code: readOtpCode(phone) })
    .expect(200);
  return res.body.data.accessToken;
}

describe('client tests 1–4 — exact prices through POST /catalog/quote', () => {
  it.each([
    ['Test 1: Split AC 1.5 Ton Installation', 'AC-SPLIT-15T-INSTALL', 1499, 269.82, 1768.82],
    ['Test 2: Window AC Installation', 'AC-WINDOW-INSTALL', 599, 107.82, 706.82],
    ['Test 3: LED TV 32" Installation', 'TV-LED-32-INSTALL', 349, 62.82, 411.82],
    ['Test 4: LED TV 55–65" Installation', 'TV-LED-55-65-INSTALL', 799, 143.82, 942.82],
  ])('%s', async (_label, code, unitPrice, gst, final) => {
    const res = await quote([{ offeringId: await idOf(code), quantity: 1 }]);
    expect(res.status).toBe(200);
    const [line] = res.body.data.lines;
    expect([line.offeringCode, line.unitPrice, line.gstPercent, line.gstAmount, line.finalAmount]).toEqual([code, unitPrice, 18, gst, final]);
    expect(res.body.data.totals.final).toBe(final);
    expect(res.body.data.payableAfterService).toBe(final);
  });
});

describe('client test 9 — quantity multiplies price and payout', () => {
  it('Fan ×2: customer ₹598 (+GST), partner ₹360', async () => {
    const offeringId = await idOf('ELEC-FAN-INSTALL');
    const res = await quote([{ offeringId, quantity: 2 }]);
    expect(res.body.data.lines[0]).toMatchObject({ baseAmount: 598, gstAmount: 107.64, finalAmount: 705.64 });

    const internal = await buildQuote({ lines: [{ offeringId, quantity: 2 }] });
    expect(internal.lines[0].spPayoutTotal).toBe(36000);
  });

  it('rejects a quantity outside the offering range', async () => {
    const res = await quote([{ offeringId: await idOf('ELEC-CONSULT'), quantity: 2 }]);
    expect([res.status, res.body.error.code]).toEqual([400, 'QUANTITY_OUT_OF_RANGE']);
  });
});

describe('client test 4 & 12 — the tree only offers bookable combinations', () => {
  it('TV 55–65" shows ₹799 installation and never the 32" price', async () => {
    const res = await tree('TV');
    expect(res.status).toBe(200);
    const { productTypes, offerings } = res.body.data;
    const led = productTypes.find((pt) => pt.name === 'LED TV');
    expect(led.variants.map((v) => v.label)).toEqual(['32 inch', '40–43 inch', '55–65 inch', '75 inch+']);

    const v55 = led.variants.find((v) => v.label === '55–65 inch').id;
    const forV55 = offerings.filter((o) => o.productTypeId === led.id && (o.variantId === v55 || o.variantId === null));
    const installs = forV55.filter((o) => /installation/i.test(o.serviceName));
    expect(installs.map((o) => [o.serviceName, o.customerPrice])).toEqual([
      ['Installation', 799],
      ['Uninstallation', 299],
    ]);
    // The 32" install price never shows up as the 55–65" install price.
    expect(installs.some((o) => o.customerPrice === 349)).toBe(false);
  });

  it('Window AC offers no Gas Refilling or Deep Cleaning', async () => {
    const { productTypes, offerings } = (await tree('AC')).body.data;
    const window = productTypes.find((pt) => pt.name === 'Window AC');
    expect(window.variants).toEqual([]);
    expect(offerings.filter((o) => o.productTypeId === window.id).map((o) => o.serviceName)).toEqual([
      'Installation',
      'Uninstallation',
      'Repair',
    ]);
  });

  it('a deactivated offering disappears from the tree and cannot be quoted', async () => {
    await ServiceOffering.updateOne({ code: 'AC-WINDOW-UNINSTALL' }, { isActive: false });
    const { offerings } = (await tree('AC')).body.data;
    expect(offerings.some((o) => o.code === 'AC-WINDOW-UNINSTALL')).toBe(false);

    const res = await quote([{ offeringId: await idOf('AC-WINDOW-UNINSTALL'), quantity: 1 }]);
    expect([res.status, res.body.error.code]).toEqual([400, 'OFFERING_NOT_BOOKABLE']);
  });

  it('a deactivated parent hides every offering under it', async () => {
    await ProductType.updateOne({ slug: 'window' }, { isActive: false });
    const { productTypes } = (await tree('AC')).body.data;
    expect(productTypes.map((pt) => pt.name)).toEqual(['Split AC']);
  });

  it('standalone categories have services and options, no product types', async () => {
    const electric = (await tree('Electrician')).body.data;
    expect(electric.productTypes).toEqual([]);
    expect(electric.standaloneServices.map((s) => s.name)).toContain('Fan Installation');

    const tank = (await tree('Water Tank Sump Cleaning')).body.data;
    const cleaning = tank.standaloneServices.find((s) => s.name === 'Water Tank Cleaning');
    expect(cleaning.optionDimension).toEqual({ key: 'tank_capacity', label: 'Tank Capacity' });
    expect(cleaning.options.map((o) => o.label)).toEqual(['Up to 500 L', '501–1000 L', '1001–2000 L', '2000 L+']);
  });

  it('unknown or inactive categories are 404, never a fallback category', async () => {
    expect((await tree('Nope')).status).toBe(404);
    await Category.updateOne({ key: 'TV' }, { isActive: false });
    expect((await tree('TV')).status).toBe(404);
  });
});

describe('variant rules', () => {
  it('a variant-agnostic offering needs the customer\'s variant and records it', async () => {
    const offeringId = await idOf('AC-SPLIT-UNINSTALL');
    const missing = await quote([{ offeringId, quantity: 1 }]);
    expect([missing.status, missing.body.error.code]).toEqual([400, 'VARIANT_REQUIRED']);

    const ok = await quote([{ offeringId, variantId: await variantId('1.5 Ton'), quantity: 1 }]);
    expect(ok.status).toBe(200);
    expect(ok.body.data.lines[0].variant.label).toBe('1.5 Ton');
    expect(ok.body.data.lines[0].unitPrice).toBe(999);
  });

  it('a variant from elsewhere is rejected', async () => {
    const res = await quote([{ offeringId: await idOf('TV-LED-32-INSTALL'), variantId: await variantId('55–65 inch'), quantity: 1 }]);
    expect(res.body.error.code).toBe('VARIANT_MISMATCH');
  });

  it('a variant-specific offering wins over a variant-agnostic one', async () => {
    const split = await ProductType.findOne({ slug: 'split' });
    const install = await CatalogService.findOne({ category: split.category, slug: 'installation' });
    const anyInstall = await ServiceOffering.create({
      code: 'AC-SPLIT-INSTALL-ANY', name: 'Split AC Installation (any)', bookingType: 'PRODUCT_LINKED',
      category: split.category, productType: split._id, service: install._id, maxQty: 5,
    });
    await createRateVersion(anyInstall._id, { customerPrice: 120000, spPayout: 70000, expressFee: 0, expressSpIncentive: 0 });

    const res = await quote([{ offeringId: String(anyInstall._id), variantId: await variantId('1.5 Ton'), quantity: 1 }]);
    expect(res.body.error.code).toBe('VARIANT_MISMATCH');
    expect(res.body.error.details.offeringCode).toBe('AC-SPLIT-15T-INSTALL');
  });
});

describe('express, coupon, coins, advance', () => {
  it('Fan ×2, express, flat ₹60 coupon → ₹751.66', async () => {
    await Coupon.create({ code: 'NCC60', discount: 60, applicableOn: ['service'] });
    const res = await quote([{ offeringId: await idOf('ELEC-FAN-INSTALL'), quantity: 2, isExpress: true }], { couponCode: 'ncc60' });
    expect(res.body.data.lines[0]).toMatchObject({ discount: 60, expressFee: 99, taxableAmount: 637, gstAmount: 114.66, finalAmount: 751.66 });
    expect(res.body.data.couponCode).toBe('NCC60');
  });

  it('express on a non-express offering is refused', async () => {
    const res = await quote([{ offeringId: await idOf('ELEC-CONSULT'), quantity: 1, isExpress: true }]);
    expect(res.body.error.code).toBe('EXPRESS_NOT_AVAILABLE');
  });

  it('an unknown coupon is a clean 400', async () => {
    const res = await quote([{ offeringId: await idOf('ELEC-FAN-INSTALL'), quantity: 1 }], { couponCode: 'NOPE' });
    expect([res.status, res.body.error.code]).toEqual([400, 'COUPON_INVALID']);
  });

  it('coins apply only for a signed-in customer, after GST', async () => {
    const offeringId = await idOf('ELEC-FAN-INSTALL');
    const guest = await quote([{ offeringId, quantity: 1 }], { useCoins: true });
    expect(guest.body.data.coinsApplied).toBe(0);

    const token = await customerToken(1000); // 1000 coins = ₹100
    const res = await quote([{ offeringId, quantity: 1 }], { useCoins: true }, token);
    expect(res.body.data).toMatchObject({ coinsApplied: 100, coinsToRedeem: 1000, payableAfterService: 252.82 });
    expect(res.body.data.totals.gst).toBe(53.82); // GST on the pre-coin ₹299
  });

  it('advance mode splits payable now / after service', async () => {
    const res = await quote([{ offeringId: await idOf('ELEC-FAN-INSTALL'), quantity: 2 }], { paymentMode: 'advance' });
    expect(res.body.data).toMatchObject({ advanceAmount: 141.13, payableNow: 141.13, payableAfterService: 564.51 });
  });
});

describe('warranty coverage is detected server-side, never declared', () => {
  const recent = () => new Date(Date.now() - 30 * 86400000).toISOString();

  it('a signed-in customer with an in-warranty appliance is quoted ₹0', async () => {
    const token = await customerToken();
    const res = await quote([{ offeringId: await idOf('AC-WINDOW-INSTALL'), quantity: 1 }], { warranty: { brand: 'LG', purchaseDate: recent() } }, token);
    expect(res.body.data.lines[0].coverage).toEqual({ type: 'Brand Warranty', amount: 599 });
    expect(res.body.data.totals.final).toBe(0);
  });

  it('a guest sending the same appliance details pays the normal price', async () => {
    const res = await quote([{ offeringId: await idOf('AC-WINDOW-INSTALL'), quantity: 1 }], { warranty: { brand: 'LG', purchaseDate: recent() } });
    expect(res.body.data.totals.final).toBe(706.82);
  });

  it('an old purchase is not covered', async () => {
    const token = await customerToken();
    const old = new Date(Date.now() - 3 * 365 * 86400000).toISOString();
    const res = await quote([{ offeringId: await idOf('AC-WINDOW-INSTALL'), quantity: 1 }], { warranty: { brand: 'LG', purchaseDate: old } }, token);
    expect(res.body.data.totals.final).toBe(706.82);
  });

  it('there is no way to simply claim coverage', async () => {
    const res = await quote([{ offeringId: await idOf('AC-WINDOW-INSTALL'), quantity: 1 }], { coverage: 'Brand Warranty' });
    expect(res.body.data.totals.final).toBe(706.82); // unknown key stripped by the schema
  });

  it('the covered quote and the booking agree (no PRICE_CHANGED)', async () => {
    const token = await customerToken();
    const offeringId = await idOf('AC-WINDOW-INSTALL');
    const purchaseDate = recent();
    const q = await quote([{ offeringId, quantity: 1 }], { warranty: { brand: 'LG', purchaseDate } }, token);
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ offeringId, quantity: 1, brand: 'LG', purchaseDate, expectedFinalAmount: q.body.data.totals.final });
    expect(res.status).toBe(201);
    expect(res.body.data.booking.totalPrice).toBe(0);
  });
});

describe('location, effective dates', () => {
  it('a city-only offering is bookable only in that city', async () => {
    await ServiceOffering.updateOne({ code: 'CCTV-WIFI-INSTALL' }, { serviceability: { mode: 'CITIES', cities: ['Jaipur'] } });
    const inJaipur = (await tree('CCTV', '?city=jaipur')).body.data.offerings;
    const inDelhi = (await tree('CCTV', '?city=Delhi')).body.data.offerings;
    expect([inJaipur.length, inDelhi.length]).toEqual([1, 0]);

    const noCity = await quote([{ offeringId: await idOf('CCTV-WIFI-INSTALL'), quantity: 1 }]);
    expect(noCity.body.error.code).toBe('OFFERING_NOT_BOOKABLE');
  });

  it('a CITY rate beats DEFAULT for that city only (location seam)', async () => {
    const offeringId = await idOf('ELEC-FAN-INSTALL');
    await createRateVersion(offeringId, { customerPrice: 27900, spPayout: 17000, expressFee: 9900, expressSpIncentive: 5000 }, {
      scope: { type: 'CITY', value: 'Jaipur' },
    });
    const jaipur = await quote([{ offeringId, quantity: 1 }], { location: { city: 'Jaipur' } });
    const delhi = await quote([{ offeringId, quantity: 1 }], { location: { city: 'Delhi' } });
    expect([jaipur.body.data.lines[0].unitPrice, delhi.body.data.lines[0].unitPrice]).toEqual([279, 299]);
  });

  it('a future-dated price is not used before its date', async () => {
    const offeringId = await idOf('TV-LED-55-65-INSTALL');
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await createRateVersion(offeringId, { customerPrice: 89900 }, { reason: 'Festive', effectiveFrom: future });

    const now = await quote([{ offeringId, quantity: 1 }]);
    expect(now.body.data.lines[0]).toMatchObject({ unitPrice: 799, rateVersion: 1 });

    const later = await resolveRate(offeringId, { at: new Date(future.getTime() + 1000) });
    expect([later.customerPrice, later.spPayout, later.version]).toEqual([89900, 45000, 2]);
  });

  it('an offering whose only rate starts in the future is not bookable yet', async () => {
    const offeringId = await idOf('RO-INSPECT');
    await OfferingRate.updateMany({ offering: offeringId }, { effectiveFrom: new Date(Date.now() + 86400000) });
    const res = await quote([{ offeringId, quantity: 1 }]);
    expect(res.body.error.code).toBe('OFFERING_NOT_BOOKABLE');
  });
});

describe('customer-visibility rules', () => {
  it('no payout, margin or admin field appears in tree, detail or quote responses', async () => {
    const responses = [
      (await tree('AC')).body,
      (await request(app).get('/api/v1/catalog/offerings/TV-LED-55-65-INSTALL')).body,
      (await quote([{ offeringId: await idOf('ELEC-FAN-INSTALL'), quantity: 2, isExpress: true }])).body,
    ];
    for (const body of responses) {
      expect(body.error).toBeNull();
      expect(allKeys(body.data).filter((k) => INTERNAL.test(k))).toEqual([]);
    }
  });

  it('offering detail carries the customer content', async () => {
    const res = await request(app).get('/api/v1/catalog/offerings/tv-led-55-65-install');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      code: 'TV-LED-55-65-INSTALL',
      customerPrice: 799,
      variant: { label: '55–65 inch' },
      productType: { name: 'LED TV' },
      category: { key: 'TV' },
    });
    expect(res.body.data.included.length).toBeGreaterThan(0);

    const missing = await request(app).get('/api/v1/catalog/offerings/NOT-A-CODE');
    expect([missing.status, missing.body.error.code]).toEqual([404, 'OFFERING_NOT_BOOKABLE']);
  });

  it('rejects malformed quote requests', async () => {
    expect((await quote([{ offeringId: 'abc', quantity: 1 }])).status).toBe(400);
    expect((await quote([])).status).toBe(400);
  });
});
