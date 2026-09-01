import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Browser-level tests for the shared cart (frontend/src/lib/cartStore.js).
 *
 * BuyNew.jsx and ProductDetails.jsx used to keep separate carts under different
 * localStorage keys, with different item shapes — adding a product from its
 * detail page left the buy listing's cart empty. That bug was invisible to the
 * api/ specs (the server was never called) and to `vite build` (both files
 * compiled fine), so it needs a real browser to catch. These cover the behaviours
 * the shared store introduced: one cart across both pages, migration off the two
 * legacy keys, mirroring to the server, and the browser cart merging with the
 * account's own cart at sign-in.
 *
 * Every test signs in: ScrollToTop in App.jsx bounces an unauthenticated visitor
 * off every customer route, so there is no signed-out cart to exercise.
 */

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

async function otpFor(request, identifier) {
  const res = await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  return (await res.json()).data.code;
}

async function verifyOtp(request, role, identifier) {
  await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  const code = await otpFor(request, identifier);
  const res = await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } });
  return (await res.json()).data;
}

async function signedInCustomer(request) {
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  return verifyOtp(request, 'customer', phone);
}

async function superAdminToken(request) {
  const email = `cart-ui-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  return (await verifyOtp(request, 'super_admin', email)).accessToken;
}

async function createProduct(request, adminToken, overrides = {}) {
  const res = await request.post(`${API}/products`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      category: 'Television',
      name: `Cart TV ${randomUUID().slice(0, 8)}`,
      price: 1000,
      stock: 5,
      sku: `CART-${randomUUID()}`,
      ...overrides,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data;
}

/** Put a real session in localStorage before any app code runs. */
async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

/**
 * Seed localStorage once, not on every navigation. addInitScript runs on each
 * document, so seeding unguarded would rewrite the cart after the very
 * behaviour under test (migration, or the login merge) had already run.
 */
async function seedOnce(page, entries) {
  await page.addInitScript((pairs) => {
    if (localStorage.getItem('__cart_seeded')) return;
    localStorage.setItem('__cart_seeded', '1');
    for (const [k, v] of pairs) localStorage.setItem(k, v);
  }, entries);
}

async function readCart(request, token) {
  const res = await request.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).data.items;
}

test('a product added from its detail page shows up in the buy-flow cart', async ({ page, request }) => {
  const product = await createProduct(request, await superAdminToken(request));
  await signIn(page, await signedInCustomer(request));

  await page.goto(`/product-details?id=${product.id}`);
  await page.getByRole('button', { name: /add to cart/i }).click();

  // Separate page, separate component tree — this is the cross-page hand-off
  // that the two independent localStorage keys used to break.
  await page.goto('/buy-new/cart');
  await expect(page.getByText(product.name)).toBeVisible({ timeout: 10_000 });
});

test('the two legacy carts are migrated into one, and the old keys dropped', async ({ page, request }) => {
  const adminToken = await superAdminToken(request);
  const fromDetails = await createProduct(request, adminToken);
  const fromListing = await createProduct(request, adminToken);
  await signIn(page, await signedInCustomer(request));

  await seedOnce(page, [
    // The old ProductDetails shape, which counted with `quantity`.
    ['nigam_cart', JSON.stringify([{ id: fromDetails.id, name: fromDetails.name, price: fromDetails.price, quantity: 2 }])],
    // The old BuyNew shape, which counted with `qty`.
    ['nigam_buy_new_cart', JSON.stringify([{ id: fromListing.id, name: fromListing.name, price: fromListing.price, qty: 1 }])],
  ]);

  await page.goto('/buy-new/cart');

  await expect(page.getByText(fromDetails.name)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(fromListing.name)).toBeVisible();

  const stored = await page.evaluate(() => ({
    merged: JSON.parse(localStorage.getItem('ncc_cart') || '[]'),
    legacyDetails: localStorage.getItem('nigam_cart'),
    legacyListing: localStorage.getItem('nigam_buy_new_cart'),
  }));

  expect(stored.merged).toHaveLength(2);
  expect(stored.legacyDetails).toBeNull();
  expect(stored.legacyListing).toBeNull();
  // `quantity` is normalised to `qty` so both pages can read the same item.
  expect(stored.merged.find((i) => i.id === fromDetails.id).qty).toBe(2);
});

test('an add by a signed-in customer reaches the server cart', async ({ page, request }) => {
  const product = await createProduct(request, await superAdminToken(request));
  const session = await signedInCustomer(request);
  await signIn(page, session);

  await page.goto(`/product-details?id=${product.id}`);
  await page.getByRole('button', { name: /add to cart/i }).click();

  // Mirroring is deliberately fire-and-forget, so poll rather than assert once.
  await expect
    .poll(async () => (await readCart(request, session.accessToken)).length, { timeout: 10_000 })
    .toBe(1);

  const items = await readCart(request, session.accessToken);
  expect(String(items[0].product.id || items[0].product._id)).toBe(String(product.id));
});

test('signing in merges the browser cart with the account cart already on the server', async ({ page, request }) => {
  const adminToken = await superAdminToken(request);
  const inBrowser = await createProduct(request, adminToken);
  const onServer = await createProduct(request, adminToken);

  // A real account that already has something in its server cart, as if it had
  // been added on another device.
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const first = await verifyOtp(request, 'customer', phone);
  await request.post(`${API}/cart/items`, {
    headers: { Authorization: `Bearer ${first.accessToken}` },
    data: { productId: onServer.id, quantity: 1 },
  });

  await seedOnce(page, [
    ['ncc_cart', JSON.stringify([{ id: inBrowser.id, name: inBrowser.name, price: inBrowser.price, qty: 2 }])],
  ]);

  // Driven through the real form rather than an injected session: the merge
  // hangs off AuthContext.verifyOtp, which only runs on an actual sign-in.
  await page.goto('/login');
  await page.locator('input[name="identifier"]').fill(phone);
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: /^login$/i }).click();

  await page.waitForURL('**/verify-otp', { timeout: 15_000 });
  await page.locator('input[inputmode="numeric"]').first().fill(await otpFor(request, phone));
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  const token = await page.evaluate(() => localStorage.getItem('ncc_access_token'));
  await expect.poll(async () => (await readCart(request, token)).length, { timeout: 15_000 }).toBe(2);

  // Both halves survive, and the browser-side quantity is carried up rather
  // than being flattened to 1 by the merge.
  const items = await readCart(request, token);
  const merged = Object.fromEntries(items.map((i) => [String(i.product.id || i.product._id), i.quantity]));
  expect(merged[String(inBrowser.id)]).toBe(2);
  expect(merged[String(onServer.id)]).toBe(1);

  // The pull half of the merge lands after the push, so wait for the browser's
  // own copy to catch up rather than racing it to the next navigation.
  await expect
    .poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('ncc_cart') || '[]'))).length, {
      timeout: 15_000,
    })
    .toBe(2);

  await page.goto('/buy-new/cart');
  await expect(page.getByText(inBrowser.name)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(onServer.name)).toBeVisible();
});
