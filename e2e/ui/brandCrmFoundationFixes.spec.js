import { test, expect } from '@playwright/test';

const API = 'http://localhost:4111/api/v1';

test('customer signs in directly with credentials without OTP', async ({ page, request }) => {
  const phone = `98${String(Date.now()).slice(-8)}`;
  const created = await request.post(`${API}/_dev/test-user`, {
    data: { role: 'customer', phone, password: 'unknown-random-password', name: 'CCE Customer' },
  });
  expect(created.ok()).toBeTruthy();
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in with OTP', exact: true })).toHaveCount(0);
  await page.locator('input[name="identifier"]').fill(phone);
  await page.locator('input[name="password"]').fill('unknown-random-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
});
