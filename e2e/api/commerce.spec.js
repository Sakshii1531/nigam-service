import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Covers backend/src/modules/buy-commerce/*, rewards-loyalty/coupon.routes.js,
// warranty-amc-exchange/exchange.routes.js, payments-wallet/wallet.routes.js —
// the Phase 5 exit criterion ("an end-to-end 'buy with coin redemption +
// exchange discount' test passes").
//
// Every test creates its own uniquely-keyed Product/Coupon/ExchangeQuestionSet
// (via the real admin endpoints) rather than relying on shared seeded data —
// same parallel-worker isolation lesson learned in booking.spec.js (Phase 4).

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function getOtpCode(request, identifier) {
  const res = await request.get(`/api/v1/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function loginAndVerify(request, { role, identifier, password }) {
  await request.post('/api/v1/auth/login', { data: { role, identifier, password } });
  const code = await getOtpCode(request, identifier);
  const res = await request.post('/api/v1/auth/otp/verify', { data: { role, identifier, code } });
  return (await res.json()).data.accessToken;
}

async function createCustomer(request, walletCoins = 0) {
  const phone = uniquePhone();
  await request.post('/api/v1/_dev/test-user', { data: { role: 'customer', phone, password: 'password123', walletCoins } });
  const token = await loginAndVerify(request, { role: 'customer', identifier: phone, password: 'password123' });
  return { phone, token };
}

async function loginAsFreshAdmin(request) {
  const email = `commerce-admin-${randomUUID()}@e2e.test`;
  await request.post('/api/v1/_dev/test-user', { data: { role: 'super_admin', email, password: 'password123' } });
  return loginAndVerify(request, { role: 'super_admin', identifier: email, password: 'password123' });
}

async function createProduct(request, adminToken, overrides = {}) {
  const res = await request.post('/api/v1/products', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { category: 'Television', name: 'E2E Test TV', price: 1000, stock: 5, sku: `E2E-${randomUUID()}`, ...overrides },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

test.describe('Products', () => {
  test('GET /products lists an admin-created product', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const uniqueCategory = `E2E-List-${randomUUID()}`;
    await createProduct(request, adminToken, { category: uniqueCategory });

    const res = await request.get(`/api/v1/products?category=${uniqueCategory}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  test('GET /products/:id returns the created product', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken, { name: `Findable-${randomUUID()}` });

    const res = await request.get(`/api/v1/products/${product.id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.name).toBe(product.name);
  });

  test('PUT /products/:id lets an admin update price/stock', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken, { price: 100, stock: 5 });

    const res = await request.put(`/api/v1/products/${product.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { price: 150 },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.price).toBe(150);
  });

  test('POST /products rejects a non-admin with 403', async ({ request }) => {
    const customer = await createCustomer(request);
    const res = await request.post('/api/v1/products', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category: 'TV', name: 'Should Fail', price: 100, sku: `E2E-${randomUUID()}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('Cart + Wishlist', () => {
  test('adds to cart, accumulates quantity, and removes', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken);
    const customer = await createCustomer(request);

    await request.post('/api/v1/cart/items', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { productId: product.id, quantity: 1 },
    });
    const afterSecond = await request.post('/api/v1/cart/items', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { productId: product.id, quantity: 2 },
    });
    expect((await afterSecond.json()).data.items[0].quantity).toBe(3);

    const afterRemove = await request.delete(`/api/v1/cart/items/${product.id}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect((await afterRemove.json()).data.items).toHaveLength(0);
  });

  test('adds and removes a wishlist item', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken);
    const customer = await createCustomer(request);

    await request.post(`/api/v1/wishlist/${product.id}`, { headers: { Authorization: `Bearer ${customer.token}` } });
    const afterRemove = await request.delete(`/api/v1/wishlist/${product.id}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect((await afterRemove.json()).data).toHaveLength(0);
  });

  test('GET /cart and GET /wishlist read back what was added', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken);
    const customer = await createCustomer(request);

    await request.post('/api/v1/cart/items', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { productId: product.id, quantity: 1 },
    });
    await request.post(`/api/v1/wishlist/${product.id}`, { headers: { Authorization: `Bearer ${customer.token}` } });

    const cartRes = await request.get('/api/v1/cart', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect((await cartRes.json()).data.items).toHaveLength(1);

    const wishlistRes = await request.get('/api/v1/wishlist', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect((await wishlistRes.json()).data).toHaveLength(1);
  });
});

test.describe('Coupons', () => {
  test('GET /coupons lists an admin-created active coupon', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const code = `E2E${randomUUID().slice(0, 8).toUpperCase()}`;
    await request.post('/api/v1/coupons', { headers: { Authorization: `Bearer ${adminToken}` }, data: { code, discount: 50 } });

    const customer = await createCustomer(request);
    const res = await request.get('/api/v1/coupons', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.some((c) => c.code === code)).toBe(true);
  });

  test('POST /coupons rejects a non-admin with 403', async ({ request }) => {
    const customer = await createCustomer(request);
    const res = await request.post('/api/v1/coupons', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { code: 'SHOULDFAIL', discount: 10 },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('Exchange — remaining routes', () => {
  test('GET /exchange/question-sets/:category and GET /exchange/requests/:id', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const category = `E2E-Category-${randomUUID()}`;
    await request.post('/api/v1/exchange/question-sets', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'E2E Read Test', category, questions: [] },
    });
    const customer = await createCustomer(request);

    const questionSetRes = await request.get(`/api/v1/exchange/question-sets/${category}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(questionSetRes.status()).toBe(200);

    const createRes = await request.post('/api/v1/exchange/requests', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category, baseValue: 500, answers: {} },
    });
    const exchangeRequestId = (await createRes.json()).data.id;

    const getRes = await request.get(`/api/v1/exchange/requests/${exchangeRequestId}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    expect(getRes.status()).toBe(200);

    const otherCustomer = await createCustomer(request);
    const forbiddenRes = await request.get(`/api/v1/exchange/requests/${exchangeRequestId}`, {
      headers: { Authorization: `Bearer ${otherCustomer.token}` },
    });
    expect(forbiddenRes.status()).toBe(403);
  });
});

test.describe('POST /orders — buy with coin redemption + exchange discount', () => {
  test('prices a checkout server-side combining a coupon, an exchange trade-in, and coin redemption', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const category = `E2E-Category-${randomUUID()}`;
    const couponCode = `E2E${randomUUID().slice(0, 8).toUpperCase()}`;

    const product = await createProduct(request, adminToken, { category, price: 5000, stock: 3 });

    await request.post('/api/v1/coupons', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { code: couponCode, discount: 100 },
    });

    await request.post('/api/v1/exchange/question-sets', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'E2E Trade-in', category, questions: [{ text: 'Works?', type: 'Yes/No', options: ['Yes', 'No'], deductions: { No: 1 } }] },
    });

    const customer = await createCustomer(request, 9000); // 9000 coins = ₹900

    const exchangeRes = await request.post('/api/v1/exchange/requests', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category, baseValue: 2000, answers: { Works: 'Yes' } },
    });
    expect(exchangeRes.status()).toBe(201);
    const exchangeRequest = (await exchangeRes.json()).data;
    expect(exchangeRequest.estimatedValue).toBe(2000);

    const orderRes = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: {
        items: [{ productId: product.id, quantity: 1 }],
        couponCode,
        exchangeRequestId: exchangeRequest.id,
        coinsToRedeem: 9000,
      },
    });
    expect(orderRes.status()).toBe(201);
    const order = (await orderRes.json()).data;

    expect(order.subtotal).toBe(5000);
    expect(order.couponDiscount).toBe(100);
    expect(order.exchangeDiscount).toBe(2000);
    // remaining after coupon+exchange = 2900; all 9000 requested coins (=₹900)
    // are used since that's less than what's still owed — nothing capped here.
    expect(order.coinsValue).toBe(900);
    expect(order.coinsRedeemed).toBe(9000);
    expect(order.total).toBe(2000); // 5000 - 100 - 2000 - 900
    expect(order.status).toBe('Confirmed');
    expect(order.humanId).toMatch(/^NCCO\d{6}$/);

    const walletRes = await request.get('/api/v1/wallet', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect((await walletRes.json()).data.coins).toBe(0); // 9000 - 9000

    // Stock decremented, exchange request marked applied, viewable via GET.
    const productAfter = await request.get(`/api/v1/products/${product.id}`);
    expect((await productAfter.json()).data.stock).toBe(2);

    const orderDetail = await request.get(`/api/v1/orders/${order.id}`, { headers: { Authorization: `Bearer ${customer.token}` } });
    expect(orderDetail.status()).toBe(200);
  });

  test('rejects reusing an exchange request already applied to a previous order', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const category = `E2E-Category-${randomUUID()}`;
    const product = await createProduct(request, adminToken, { category, price: 500, stock: 5 });
    await request.post('/api/v1/exchange/question-sets', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: 'E2E Trade-in 2', category, questions: [] },
    });
    const customer = await createCustomer(request);

    const exchangeRes = await request.post('/api/v1/exchange/requests', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { category, baseValue: 100, answers: {} },
    });
    const exchangeRequestId = (await exchangeRes.json()).data.id;

    const firstOrder = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { items: [{ productId: product.id, quantity: 1 }], exchangeRequestId },
    });
    expect(firstOrder.status()).toBe(201);

    const secondOrder = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { items: [{ productId: product.id, quantity: 1 }], exchangeRequestId },
    });
    expect(secondOrder.status()).toBe(400);
  });

  test('rejects checkout with insufficient stock', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken, { stock: 1 });
    const customer = await createCustomer(request);

    const res = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { items: [{ productId: product.id, quantity: 5 }] },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects viewing another customer\'s order with 403', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken);
    const owner = await createCustomer(request);
    const intruder = await createCustomer(request);

    const orderRes = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { items: [{ productId: product.id, quantity: 1 }] },
    });
    const order = (await orderRes.json()).data;

    const res = await request.get(`/api/v1/orders/${order.id}`, { headers: { Authorization: `Bearer ${intruder.token}` } });
    expect(res.status()).toBe(403);
  });

  test('GET /orders lists only the requesting customer\'s own orders', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken);
    const customer = await createCustomer(request);

    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { items: [{ productId: product.id, quantity: 1 }] },
    });

    const res = await request.get('/api/v1/orders', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect(res.status()).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });
});

test.describe('Wallet', () => {
  test('GET /wallet reports the balance for the authenticated user', async ({ request }) => {
    const customer = await createCustomer(request, 250);
    const res = await request.get('/api/v1/wallet', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.coins).toBe(250);
  });

  test('GET /wallet/ledger reflects a redemption from checkout', async ({ request }) => {
    const adminToken = await loginAsFreshAdmin(request);
    const product = await createProduct(request, adminToken, { price: 10, stock: 5 });
    const customer = await createCustomer(request, 100);

    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customer.token}` },
      data: { items: [{ productId: product.id, quantity: 1 }], coinsToRedeem: 100 },
    });

    const res = await request.get('/api/v1/wallet/ledger', { headers: { Authorization: `Bearer ${customer.token}` } });
    expect(res.status()).toBe(200);
    expect((await res.json()).data[0]).toMatchObject({ reason: 'redeemed', delta: -100 });
  });

  test('rejects an unauthenticated request with 401', async ({ request }) => {
    const res = await request.get('/api/v1/wallet');
    expect(res.status()).toBe(401);
  });
});
