import { test, expect } from '@playwright/test';

// Super Admin → Rewards Program (earning, customer levels, partner badges,
// tasks and the spin wheel on one page) drives the customer Play Zone and the
// partner's badge.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = process.env.REWARD_SHOTS || '';
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function session(request, role, identifier) {
  const res = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(res.status()).toBe(200);
  if (role === 'customer' || role === 'service_provider') return (await res.json()).data;
  const code = (await (await request.get(`${API}/_dev/last-otp/${encodeURIComponent(identifier)}`)).json()).data.code;
  return (await (await request.post(`${API}/auth/otp/verify`, { data: { role, identifier, code } })).json()).data;
}

async function signIn(page, s) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [s.accessToken, s.refreshToken, JSON.stringify(s.user)]);
}

const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null);

test('admin sets levels, badges and the wheel; the customer and partner see them', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const email = `rewards-${uniquePhone()}@e2e.test`;
  await request.post(`${API}/_dev/test-user`, { data: { role: 'super_admin', email, password: 'password123' } });
  const admin = await session(request, 'super_admin', email);
  // Unique per run: the test database keeps the programme between runs.
  const run = uniquePhone().slice(-4);
  const levelName = `Silver Star ${run}`;
  const badgeName = `Rising Fixer ${run}`;

  const adminPage = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await signIn(adminPage, admin);
  await adminPage.goto('/super-admin/loyalty-program?tab=rewards');
  await expect(adminPage.getByRole('heading', { name: 'Rewards Program' })).toBeVisible();
  for (const section of ['Earning on services', 'Customer levels', 'Partner badges', 'One-time tasks', 'Spin wheel']) {
    await expect(adminPage.getByRole('heading', { name: section })).toBeVisible();
  }
  await expect(adminPage.getByRole('img', { name: 'Spin wheel preview' })).toBeVisible();
  await expect(adminPage.getByText('Total chance: 100% — ready')).toBeVisible();

  // Customer levels: rename Silver.
  await adminPage.getByLabel('Level 2 name').fill(levelName);
  // Partner badges: rename the first paid badge.
  await adminPage.getByLabel('Badge 2 name').fill(badgeName);
  await expect(adminPage.getByLabel('Partner badges')).toContainText('1–99 jobs');

  // The wheel's chances must add up to 100: break it, see the warning and the server's refusal, then fix it.
  const firstChance = adminPage.getByLabel('Segment 1 chance');
  const original = await firstChance.inputValue();
  await firstChance.fill(String(Number(original) - 10));
  await expect(adminPage.getByText(/Total chance: 90% — must be exactly 100% \(10% left to give\)/)).toBeVisible();
  await adminPage.getByRole('button', { name: 'Save changes' }).click();
  await expect(adminPage.getByRole('alert')).toContainText('must add up to exactly 100% (now 90%)');
  await firstChance.fill(original);
  await shot(adminPage, 'admin-rewards-program');
  await adminPage.getByRole('button', { name: 'Save changes' }).click();
  await expect(adminPage.getByRole('button', { name: 'Saved' })).toBeVisible();

  // The old "Spin Wheel Config" link opens the same page.
  await adminPage.goto('/super-admin/loyalty-program?tab=spinwheel');
  await expect(adminPage.getByRole('heading', { name: 'Spin wheel' })).toBeVisible();
  await expect(adminPage.getByLabel('Level 2 name')).toHaveValue(levelName);

  // Customer: Bronze, one free spin a day, the renamed level in the ladder.
  const phone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone, password: 'password123' } });
  const customer = await session(request, 'customer', phone);
  const custPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(custPage, customer);
  await custPage.goto('/rewards-play-zone');
  await expect(custPage.getByText('As a Bronze member you get 1 free spin every day.')).toBeVisible();
  await expect(custPage.getByLabel('Levels')).toContainText(levelName);
  await expect(custPage.getByText('1 free spin today')).toBeVisible();
  await shot(custPage, 'customer-play-zone');
  await custPage.getByRole('button', { name: 'Spin now' }).click();
  const result = custPage.getByRole('dialog');
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result).toContainText('XP');
  await shot(custPage, 'customer-spin-result');
  const wonExtraSpin = (await result.innerText()).includes('extra spin has been added');
  await result.getByRole('button', { name: /Collect|Continue/ }).click();
  // The one daily spin is used, unless the wheel gave an extra spin.
  await expect(custPage.getByRole('button', { name: wonExtraSpin ? 'Spin now' : 'Come back tomorrow' })).toBeVisible();

  // Partner: the badge their completed jobs reach.
  const spPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: spPhone, password: 'password123', specs: ['AC'], availability: 'Offline' } });
  const partner = await session(request, 'service_provider', spPhone);
  const spPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(spPage, partner);
  await spPage.goto('/service-provider/profile');
  const badge = spPage.getByLabel('Your badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('New Partner');
  await expect(badge).toContainText(`1 more job to reach ${badgeName}`);
  await shot(spPage, 'partner-badge');
});
