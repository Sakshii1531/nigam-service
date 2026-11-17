import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { CatalogService } from '../src/modules/catalog/catalogService.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { hasEmoji, stripEmoji } from '../src/modules/shared/noEmoji.js';
import { seedTestCatalogue } from './helpers/catalogue.js';
import { testDbUri } from './helpers/testDb.js';
import { readOtpCode } from './helpers/otp.js';

const BASE = '/api/v1/super-admin/catalogue';
let app;
let token;

beforeAll(async () => {
  await registerAllModels();
  await mongoose.connect(testDbUri('no_emoji'));
  await ensureIndexes();
  app = createApp().listen(0);
});
afterAll(async () => {
  await new Promise((resolve) => app.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
beforeEach(async () => {
  await Promise.all([User, Category, ProductType, CatalogService].map((m) => m.deleteMany({})));
  await seedTestCatalogue();
  const email = 'no-emoji-admin@test.dev';
  await User.create({ role: ROLES.SUPER_ADMIN, email, name: 'Admin', passwordHash: await hashPassword('password123') });
  await request(app).post('/api/v1/auth/login').send({ role: ROLES.SUPER_ADMIN, identifier: email, password: 'password123' }).expect(200);
  token = (await request(app).post('/api/v1/auth/otp/verify').send({ role: ROLES.SUPER_ADMIN, identifier: email, code: readOtpCode(email) }).expect(200)).body.data.accessToken;
});

describe('no emoji helper', () => {
  it('finds emoji, sequences and flags but leaves typographic symbols alone', () => {
    for (const s of ['\u2744\ufe0f', '\u{1f527}', '\u{1f468}\u200d\u{1f527}', '\u{1f1ee}\u{1f1f3}', 'AC \u{1f512} secure']) expect(hasEmoji(s)).toBe(true);
    for (const s of ['₹799 — per visit', '✓ done', '1.5 ton · 2 ton', '/uploads/ac.webp', 'https://cdn.example.com/a.png']) expect(hasEmoji(s)).toBe(false);
  });
  it('strips an emoji and the space after it', () => {
    expect(stripEmoji('\u{1f512} 100% Secure')).toBe('100% Secure');
    expect(stripEmoji('Hello Alex! \u{1f44b}')).toBe('Hello Alex! ');
    expect(stripEmoji('plain')).toBe('plain');
  });
});

describe('admin item pictures', () => {
  it('rejects an emoji as a service or product-type icon, accepts an uploaded picture', async () => {
    const category = await Category.findOne();
    const post = (path, body) => request(app).post(`${BASE}${path}`).set('Authorization', `Bearer ${token}`).send(body);

    const bad = await post('/services', { category: String(category._id), name: 'Emoji Service', icon: '\u{1f527}' });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('Emoji are not allowed');
    expect(await CatalogService.countDocuments({ name: 'Emoji Service' })).toBe(0);

    const ok = await post('/services', { category: String(category._id), name: 'Picture Service', icon: '/uploads/picture-service.webp' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.icon ?? ok.body.data.service?.icon).toBe('/uploads/picture-service.webp');

    const badType = await post('/product-types', { category: String(category._id), name: 'Emoji Type', icon: '\u2744\ufe0f' });
    expect(badType.status).toBe(400);
  });
});
