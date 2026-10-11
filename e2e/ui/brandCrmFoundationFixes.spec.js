import { test, expect } from '@playwright/test';

const API = 'http://localhost:4111/api/v1';

test('customer signs in with OTP without entering a password', async ({ page, request }) => {
  const phone = `98${String(Date.now()).slice(-8)}`;
  const created = await request.post(`${API}/_dev/test-user`, {
    data: { role: 'customer', phone, password: 'unknown-random-password', name: 'CCE Customer' },
  });
  expect(created.ok()).toBeTruthy();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in with OTP', exact: true }).click();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await page.locator('input[name="identifier"]').fill(`+91 ${phone}`);
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
  await expect(page).toHaveURL(/verify-otp/);
  const otp = await request.get(`${API}/_dev/last-otp/${phone}`);
  const code = (await otp.json()).data.code;
  const inputs = page.locator('input[inputmode="numeric"]');
  if (await inputs.count() === 6) {
    for (let i = 0; i < 6; i++) await inputs.nth(i).fill(code[i]);
  } else {
    await inputs.first().fill(code);
  }
  await page.getByRole('button', { name: /Verify|Confirm/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
