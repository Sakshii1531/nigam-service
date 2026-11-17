import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Home screen "Brands & Offers": an admin manages the cards in the console
// (add, link, reorder, hide, delete) and the customer's home screen shows
// exactly what is published — nothing else, and nothing at all when empty.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const PICTURE = fileURLToPath(new URL('../../frontend/src/assets/categories/split_ac.png', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function verifyOtp(request, role, identifier) {
  const loginRes = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(loginRes.status()).toBe(200);
  if (role === 'customer' || role === 'service_provider') return (await loginRes.json()).data;
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signIn(page, session, portal) {
  await page.addInitScript(([a, r, u, p]) => {
    const suffix = p ? `_${p}` : '';
    localStorage.setItem(`ncc_access_token${suffix}`, a);
    localStorage.setItem(`ncc_refresh_token${suffix}`, r);
    if (u) localStorage.setItem(`ncc_user${suffix}`, u);
  }, [session.accessToken, session.refreshToken, session.user ? JSON.stringify(session.user) : '', portal || '']);
}

test('an admin runs the Brands & Offers section and the customer home screen follows', async ({ browser, request }) => {
  test.setTimeout(150_000);
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const auth = { Authorization: `Bearer ${admin.accessToken}` };

  const cards = async () => (await (await request.get(`${API}/cms/home-tiles/admin?placement=brand-card`, { headers: auth })).json()).data;
  const clearCards = async () => { for (const c of await cards()) await request.delete(`${API}/cms/home-tiles/${c.id}`, { headers: auth }); };
  await clearCards();

  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await verifyOtp(request, 'customer', phone);
  const shopper = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(shopper, customer);
  const home = async () => { await shopper.goto('/dashboard'); await shopper.waitForLoadState('networkidle'); };
  const section = shopper.getByRole('heading', { name: 'Brands & Offers' });

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await signIn(adminPage, admin, 'super_admin');

  try {
    // Nothing published: the customer sees no Brands & Offers section at all.
    await home();
    await expect(section).toHaveCount(0);

    // Admin: empty state, then add a card with a picture, a theme and a "book a service" link.
    await adminPage.goto('/super-admin/customer-app-customization?tab=brands');
    await expect(adminPage.getByText('No cards yet')).toBeVisible({ timeout: 15_000 });
    await adminPage.getByRole('button', { name: 'Add brand / offer card' }).click();
    let dialog = adminPage.getByRole('dialog', { name: 'Add a brand or offer card' });
    await dialog.getByLabel('Brand name *').fill(`LLOYD ${tag}`);
    await dialog.getByLabel('Headline *').fill(`Glacier Series ${tag}`);
    await dialog.getByLabel('Supporting line').fill('Superior cooling');
    await dialog.getByLabel('Upload product picture').setInputFiles(PICTURE);
    await expect(dialog.getByRole('img').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Green theme' }).click();
    // Saving without picking a category is refused, with the reason shown.
    await dialog.getByRole('button', { name: 'Save card' }).click();
    await expect(dialog.getByText('Choose which service customers should book.')).toBeVisible();
    await dialog.getByLabel('Service category').selectOption({ index: 1 });
    await dialog.getByRole('button', { name: 'Save card' }).click();
    const list = adminPage.getByRole('list', { name: 'Brands & Offers cards' });
    await expect(list.getByText(`LLOYD ${tag}`)).toBeVisible();

    await home();
    await expect(section).toBeVisible();
    const lloyd = shopper.getByRole('link').filter({ hasText: `LLOYD ${tag}` });
    await expect(lloyd).toContainText(`Glacier Series ${tag}`);
    await expect(lloyd).toContainText('Explore on NCC');

    // A script link is refused by the server and nothing is saved.
    await adminPage.getByRole('button', { name: 'Add brand / offer card' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Add a brand or offer card' });
    await dialog.getByLabel('Brand name *').fill(`BAD ${tag}`);
    await dialog.getByLabel('Headline *').fill('Bad link');
    await dialog.getByLabel('When tapped, open').selectOption('custom');
    await dialog.getByLabel('Custom link').fill('javascript:alert(1)');
    await dialog.getByRole('button', { name: 'Save card' }).click();
    await expect(dialog.getByText(/in-app path like \/book\/AC/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect((await cards()).map((c) => c.brandName)).toEqual([`LLOYD ${tag}`]);

    // A second card that opens the brand's own website.
    await adminPage.getByRole('button', { name: 'Add brand / offer card' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Add a brand or offer card' });
    await dialog.getByLabel('Brand name *').fill(`SAMSUNG ${tag}`);
    await dialog.getByLabel('Headline *').fill('Bespoke AI');
    await dialog.getByLabel('Button text').fill('Visit Official Site');
    await dialog.getByLabel('When tapped, open').selectOption('custom');
    await dialog.getByLabel('Custom link').fill('https://www.samsung.com/in');
    await dialog.getByRole('button', { name: 'Save card' }).click();
    await expect(list.getByText(`SAMSUNG ${tag}`)).toBeVisible();

    await home();
    const names = () => shopper.getByRole('link').filter({ hasText: tag }).allInnerTexts();
    expect((await names())[0]).toContain(`LLOYD ${tag}`);
    expect((await names())[1]).toContain(`SAMSUNG ${tag}`);

    // Reorder: Samsung first.
    await adminPage.getByRole('button', { name: `Move SAMSUNG ${tag} up` }).click();
    await expect(list.getByRole('listitem').first()).toContainText(`SAMSUNG ${tag}`);
    await home();
    expect((await names())[0]).toContain(`SAMSUNG ${tag}`);

    // Edit: change the headline and see it on the customer screen.
    await list.getByRole('listitem').filter({ hasText: `LLOYD ${tag}` }).getByRole('button', { name: 'Edit' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Edit card' });
    await dialog.getByLabel('Headline *').fill(`Glacier 2027 ${tag}`);
    await dialog.getByRole('button', { name: 'Save card' }).click();
    await expect(list.getByText(`Glacier 2027 ${tag}`)).toBeVisible();
    await home();
    await expect(shopper.getByText(`Glacier 2027 ${tag}`)).toBeVisible();

    // Hide Lloyd: customers stop seeing it, the admin still has it.
    await adminPage.getByRole('button', { name: `Hide LLOYD ${tag}` }).click();
    await expect(list.getByRole('listitem').filter({ hasText: `LLOYD ${tag}` }).getByText('Hidden')).toBeVisible();
    await home();
    await expect(shopper.getByText(`LLOYD ${tag}`)).toHaveCount(0);
    await expect(shopper.getByText(`SAMSUNG ${tag}`)).toBeVisible();

    // Delete both: the whole section goes away again.
    adminPage.on('dialog', (d) => d.accept());
    await adminPage.getByRole('button', { name: `Delete SAMSUNG ${tag}` }).click();
    await adminPage.getByRole('button', { name: `Delete LLOYD ${tag}` }).click();
    await expect(adminPage.getByText('No cards yet')).toBeVisible();
    await home();
    await expect(section).toHaveCount(0);
  } finally {
    await clearCards();
  }
});

test('a card with a web address opens it in a new tab; one with an in-app path navigates', async ({ browser, request }) => {
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const auth = { Authorization: `Bearer ${admin.accessToken}` };
  const make = async (body) => (await (await request.post(`${API}/cms/home-tiles`, { headers: auth, data: { placement: 'brand-card', title: 'Offer', ...body } })).json()).data;
  const internal = await make({ brandName: `INT ${tag}`, link: '/buy', sortOrder: 0 });
  const external = await make({ brandName: `EXT ${tag}`, link: 'https://example.com/offer', sortOrder: 1 });
  try {
    const phone = uniquePhone();
    await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
    const customer = await verifyOtp(request, 'customer', phone);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await signIn(page, customer);
    await page.goto('/dashboard');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('link').filter({ hasText: `EXT ${tag}` }).click()]);
    expect(popup.url()).toContain('example.com/offer');
    await popup.close();
    await page.getByRole('link').filter({ hasText: `INT ${tag}` }).click();
    await expect(page).toHaveURL(/\/buy$/);
  } finally {
    for (const t of [internal, external]) if (t?.id) await request.delete(`${API}/cms/home-tiles/${t.id}`, { headers: auth });
  }
});
