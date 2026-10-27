import { test, expect } from '@playwright/test';

async function setup(page, { stories = [], unavailable = false } = {}) {
  const user = { id: '000000000000000000000001', role: 'customer', name: 'Stories Customer', addresses: [] };
  await page.addInitScript(user => {
    localStorage.setItem('ncc_access_token_customer', 'test-token');
    localStorage.setItem('ncc_user_customer', JSON.stringify(user));
  }, user);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data = [];
    if (path === '/auth/me') data = user;
    if (path === '/public/cities') data = [{ name: 'Delhi', state: 'Delhi', status: 'Active' }];
    if (path === '/cms/stories') {
      if (unavailable) return route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } });
      data = stories;
    }
    await route.fulfill({ json: { data, error: null, meta: {} } });
  });
}

for (const width of [390, 1440]) {
  test(`bundled stories remain visible and open on a ${width}px customer dashboard`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto('/dashboard');
    const heading = page.getByRole('heading', { name: 'Stories', exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    const cards = page.getByRole('button', { name: /^Open story:/ });
    await expect(cards).toHaveCount(4);
    await expect.poll(() => cards.first().locator('img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await expect(cards.last()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `/tmp/nigam-stories-${width}.png` });
    if (width === 1440) {
      await cards.first().focus();
      await page.keyboard.press('Enter');
    } else {
      await cards.first().click();
    }
    const viewer = page.getByRole('dialog', { name: 'Stories viewer' });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByAltText('Cold showers in winter? Hard pass').first()).toBeVisible();
    const close = page.getByRole('button', { name: 'Close stories', exact: true }).first();
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(viewer).toHaveCount(0);
  });
}

test('stories stay available when the CMS request fails', async ({ page }) => {
  await setup(page, { unavailable: true });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /^Open story:/ })).toHaveCount(4);
});

test('published CMS stories replace the bundled set', async ({ page }) => {
  const image = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>';
  await setup(page, { stories: [{ id: 'published', title: 'Published maintenance tip', mediaUrl: image }] });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /^Open story:/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Open story: Published maintenance tip', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Stories viewer' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open story: Cold showers/ })).toHaveCount(0);
});
