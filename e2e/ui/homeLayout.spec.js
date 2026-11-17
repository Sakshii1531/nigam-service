import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// The customer home screen is a list of sections an admin controls: reorder,
// hide, rename the built-in ones, and add sections of their own (a row of
// brand/offer cards, or a curated row of bookable services).

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
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

test('an admin orders the home screen and adds sections of their own; the customer follows', async ({ browser, request }) => {
  test.setTimeout(180_000);
  const tag = randomUUID().slice(0, 6).toUpperCase();
  const email = `admin-${randomUUID()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await verifyOtp(request, 'super_admin', email);
  const auth = { Authorization: `Bearer ${admin.accessToken}` };
  const layout = async () => (await (await request.get(`${API}/cms/home-layout/admin`, { headers: auth })).json()).data;

  // Start from the built-in layout: no custom sections, everything visible, default names.
  const reset = async () => {
    for (const s of await layout()) {
      if (!s.builtIn) await request.delete(`${API}/cms/home-layout/${s.id}`, { headers: auth });
      else await request.put(`${API}/cms/home-layout/${s.id}`, { headers: auth, data: { isActive: true, title: s.defaultTitle } });
    }
    const order = (await layout()).sort((a, b) => ['banners', 'categories', 'warranty-offers', 'brand-cards', 'most-booked', 'appliance-services', 'spare-parts', 'reviews', 'stories'].indexOf(a.key) - ['banners', 'categories', 'warranty-offers', 'brand-cards', 'most-booked', 'appliance-services', 'spare-parts', 'reviews', 'stories'].indexOf(b.key));
    await request.put(`${API}/cms/home-layout/reorder`, { headers: auth, data: { ids: order.map((s) => s.id) } });
  };
  await reset();

  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await verifyOtp(request, 'customer', phone);
  const shopper = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(shopper, customer);
  const home = async () => { await shopper.goto('/dashboard'); await shopper.waitForLoadState('networkidle'); };
  const heading = (name) => shopper.getByRole('heading', { name, exact: true });
  const top = async (name) => (await heading(name).boundingBox()).y;

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await signIn(adminPage, admin, 'super_admin');

  try {
    // The built-in order is what customers have always had.
    await home();
    await expect(heading('Our Services')).toBeVisible({ timeout: 15_000 });

    await adminPage.goto('/super-admin/customer-app-customization?tab=layout');
    const list = adminPage.getByRole('list', { name: 'Home sections' });
    await expect(list.getByRole('listitem')).toHaveCount(9, { timeout: 15_000 });
    await expect(adminPage.getByRole('button', { name: /^Delete / })).toHaveCount(0); // built-ins cannot be deleted

    // ---- add a brand-card section, fill it with a card
    await adminPage.getByRole('button', { name: 'Add a section' }).click();
    let dialog = adminPage.getByRole('dialog', { name: 'Add a section' });
    await dialog.getByRole('radio', { name: /Brand \/ offer cards/ }).check();
    await dialog.getByLabel('Section heading').fill(`Summer deals ${tag}`);
    await dialog.getByRole('button', { name: 'Add section' }).click();
    // straight into filling it
    await adminPage.getByRole('button', { name: 'Add brand / offer card' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Add a brand or offer card' });
    await dialog.getByLabel('Brand name *').fill(`VOLTAS ${tag}`);
    await dialog.getByLabel('Headline *').fill(`Cool offers ${tag}`);
    await dialog.getByLabel('Service category').selectOption({ index: 1 });
    await dialog.getByRole('button', { name: 'Save card' }).click();
    await expect(adminPage.getByRole('list', { name: `Summer deals ${tag} cards` }).getByText(`VOLTAS ${tag}`)).toBeVisible();
    await adminPage.getByRole('button', { name: 'Back to home layout' }).click();

    // ---- add a service row, pick a real catalogue service
    await adminPage.getByRole('button', { name: 'Add a section' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Add a section' });
    await dialog.getByRole('radio', { name: /Service row/ }).check();
    await dialog.getByLabel('Section heading').fill(`Festive cleaning ${tag}`);
    await dialog.getByLabel('See all link').fill('/services');
    await dialog.getByRole('button', { name: 'Add section' }).click();
    await adminPage.getByRole('button', { name: 'Add a service' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Add a service' });
    await dialog.getByLabel('Search services').fill('fan inst');
    await dialog.getByRole('option', { name: /Fan Installation/ }).click();
    await dialog.getByRole('button', { name: 'Save tile' }).click();
    await expect(adminPage.getByRole('list', { name: new RegExp(`Festive cleaning ${tag} tiles`) }).getByText('Fan Installation')).toBeVisible();
    await adminPage.getByRole('button', { name: 'Back to home layout' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(11);

    // ---- the customer sees both at the bottom, with their content
    await home();
    await expect(heading(`Summer deals ${tag}`)).toBeVisible();
    await expect(shopper.getByRole('link').filter({ hasText: `VOLTAS ${tag}` })).toContainText(`Cool offers ${tag}`);
    await expect(heading(`Festive cleaning ${tag}`)).toBeVisible();
    await expect(shopper.getByRole('region', { name: `Festive cleaning ${tag}` }).getByRole('button', { name: /Fan Installation/ })).toBeVisible();
    expect(await top(`Summer deals ${tag}`)).toBeGreaterThan(await top('Our Services'));

    // ---- move the Summer section to the very top of the list
    for (;;) {
      const names = await list.getByRole('listitem').allInnerTexts();
      const index = names.findIndex((n) => n.includes(`Summer deals ${tag}`));
      if (index <= 0) break;
      await adminPage.getByRole('button', { name: `Move Summer deals ${tag} up` }).click();
      await expect(list.getByRole('listitem').nth(index - 1)).toContainText(`Summer deals ${tag}`);
    }
    await expect(list.getByRole('listitem').first()).toContainText(`Summer deals ${tag}`);
    await home();
    expect(await top(`Summer deals ${tag}`)).toBeLessThan(await top('Our Services'));

    // ---- hide and rename a built-in section
    await adminPage.getByRole('button', { name: 'Hide Our Services' }).click();
    await expect(list.getByRole('listitem').filter({ hasText: 'Our Services' }).getByText('Hidden')).toBeVisible();
    await home();
    await expect(heading('Our Services')).toHaveCount(0);
    await adminPage.getByRole('button', { name: 'Show Our Services' }).click();
    await adminPage.getByRole('button', { name: 'Rename Our Services' }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Edit section' });
    await dialog.getByLabel('Section heading').fill(`Browse services ${tag}`);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await home();
    await expect(heading(`Browse services ${tag}`)).toBeVisible();

    // ---- delete the custom sections; their content goes with them
    adminPage.on('dialog', (d) => d.accept());
    await adminPage.getByRole('button', { name: `Delete Summer deals ${tag}` }).click();
    await adminPage.getByRole('button', { name: `Delete Festive cleaning ${tag}` }).click();
    await expect(list.getByRole('listitem')).toHaveCount(9);
    await home();
    await expect(heading(`Summer deals ${tag}`)).toHaveCount(0);
    await expect(heading(`Festive cleaning ${tag}`)).toHaveCount(0);
  } finally {
    await reset();
  }
});
