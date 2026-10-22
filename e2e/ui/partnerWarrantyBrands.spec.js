import { test, expect } from '@playwright/test';
const brand = { id: '000000000000000000000011', name: 'Test Cool', logoUrl: null, status: 'Active', warrantyEnabled: true, coverage: [{ id: '000000000000000000000021', key: 'AC', name: 'Air Conditioner' }] };
const second = { ...brand, id: '000000000000000000000012', name: 'Other Partner' };
const category = brand.coverage[0];
async function setup(page, role = 'customer', fail = false) {
  const requests = [], user = { id: '000000000000000000000001', role, name: 'Test User', permissions: ['warranty:view', 'warranty:policy_edit', 'tickets:view'] };
  await page.addInitScript(user => {
    localStorage.setItem(`ncc_access_token_${user.role}`, 'test-token');
    localStorage.setItem(`ncc_user_${user.role}`, JSON.stringify(user));
  }, user);
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace('/api/v1', ''); requests.push(path + url.search);
    let data = [];
    if (path === '/auth/me') data = user;
    else if (path === '/partner-warranty/brands') {
      if (fail) return route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } });
      data = [second, brand];
    }
    else if (path === `/partner-warranty/brands/${brand.id}/products`) data = { brand, products: [category] };
    else if (path === `/partner-warranty/products/${category.id}/issues`) data = { product: category, issues: [{ id: '000000000000000000000031', name: 'Not cooling' }] };
    else if (path === '/super-admin/warranty-catalog/brands') data = [brand];
    else if (path === '/super-admin/warranty-catalog/coverage-options') data = [category];
    else if (path === '/brand/warranty-coverage') data = { ...brand, options: [category] };
    else if (path === '/partner-warranty/claims/intake-options') data = { visitDates: { min: '2026-10-22' }, slots: [] };
    await route.fulfill({ json: { data, error: null, meta: {} } });
  });
  return requests;
}
for (const mobile of [false, true]) test(`brand-first warranty browse on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  const requests = await setup(page);
  await page.goto('/partner-warranty');
  await expect(page.getByRole('heading', { name: 'Choose your brand', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose a Category' })).toHaveCount(0);
  await page.getByLabel('Search brands', { exact: true }).fill('cool');
  await expect(page.getByRole('button', { name: /Other Partner/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Test Cool/ })).toBeVisible();
  await page.screenshot({ path: `/tmp/partner-warranty-brands-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: /Test Cool/ }).click();
  await expect(page).toHaveURL(new RegExp(`/partner-warranty/products/${brand.id}$`));
  await page.getByRole('button', { name: 'Air Conditioner', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/partner-warranty/issues/${brand.id}/${category.id}$`));
  await page.getByRole('button', { name: 'Not cooling', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Raise Warranty Request', exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/partner-warranty/raise-request/${brand.id}/${category.id}$`));
  expect(requests.some(path => path.includes('/groups') || path.includes('group='))).toBe(false);
});
test('old group links show the brand directory and old product links use full brand coverage', async ({ page }) => {
  const requests = await setup(page);
  await page.goto('/partner-warranty/brands/retired-group');
  await expect(page).toHaveURL(/\/partner-warranty$/);
  await expect(page.getByRole('button', { name: /Test Cool/ })).toBeVisible();
  await page.goto(`/partner-warranty/products/retired-group/${brand.id}`);
  await expect(page.getByRole('button', { name: 'Air Conditioner', exact: true })).toBeVisible();
  expect(requests.some(path => path.includes('/groups') || path.includes('group='))).toBe(false);
});
test('failed brand list shows retry instead of a misleading empty catalogue', async ({ page }) => {
  await setup(page, 'customer', true); await page.goto('/partner-warranty');
  await expect(page.getByText('Could not load partner brands.', { exact: true })).toBeVisible();
  await expect(page.getByText('No partner brands are available for warranty service yet.', { exact: true })).toHaveCount(0);
});
test('super admin manages brands first and has no group tab', async ({ page }) => {
  const requests = await setup(page, 'super_admin');
  await page.goto('/super-admin/partner-warranty/catalogue?tab=groups');
  await expect(page.getByRole('tab', { name: 'Brands', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Groups', exact: true })).toHaveCount(0);
  await page.getByRole('cell', { name: 'Test Cool', exact: true }).click();
  await expect(page.getByLabel('Show this brand directly in Partner Warranty', { exact: true })).toBeChecked();
  await page.screenshot({ path: '/tmp/partner-warranty-admin-brands.png', fullPage: true });
  expect(requests.some(path => path.includes('/groups'))).toBe(false);
});
test('brand admin sees direct brand listing and its covered products', async ({ page }) => {
  const requests = await setup(page, 'brand_admin'); await page.goto('/brand-admin/warranty-settings');
  await expect(page.getByText('Customers can select your brand directly in Partner Warranty.', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Air Conditioner', exact: true })).toBeChecked();
  expect(requests.some(path => path.includes('/groups'))).toBe(false);
});
