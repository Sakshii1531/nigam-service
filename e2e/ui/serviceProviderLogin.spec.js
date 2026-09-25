import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Partner login takes an email or a 10-digit phone number (not a provider ID).

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;

function uniquePhone() {
  return `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
}

test.use({ viewport: { width: 390, height: 844 } });

test('phone mode keeps digits only, stops at 10, and needs exactly 10', async ({ page }) => {
  await page.goto('/service-provider/login');
  const input = page.getByLabel('Email or Phone Number');
  const help = page.locator('#sp-login-identifier-help');

  await input.pressSequentially('98a7-6 5');
  await expect(input).toHaveValue('98765');
  await expect(help).not.toBeVisible();

  await page.getByPlaceholder('Enter Password').fill('password123');
  await page.getByRole('button', { name: 'Login to Dashboard' }).click();
  await expect(help).toHaveText('Phone number must be exactly 10 digits.');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/service-provider\/login/);

  await input.focus();
  await input.press('End');
  await input.pressSequentially('4321099');
  await expect(input).toHaveValue('9876543210');
  await expect(help).not.toBeVisible();
});

test('email mode starts with a letter and must be a valid address', async ({ page }) => {
  await page.goto('/service-provider/login');
  const input = page.getByLabel('Email or Phone Number');
  const help = page.locator('#sp-login-identifier-help');

  await input.fill('partner@example');
  await input.blur();
  await expect(help).toHaveText('Enter a valid email address, like name@example.com.');

  await input.fill('partner@example.com');
  // A valid address clears the error — the help line is removed, not emptied.
  await expect(help).not.toBeVisible();

  await input.fill('@partner');
  await input.blur();
  await expect(help).toHaveText('Start with a letter for email, or a digit for your phone number.');
});

for (const kind of ['phone', 'email']) {
  test(`a partner can log in with their ${kind}`, async ({ page, request }) => {
    const phone = uniquePhone();
    await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone, password: 'password123' } });
    let identifier = phone;
    if (kind === 'email') {
      identifier = `partner-${randomUUID().slice(0, 8)}@e2e.test`;
      // The dev fixture has no email field; set it through the provider's own profile.
      const otpLogin = await request.post(`${API}/auth/login`, { data: { role: 'service_provider', identifier: phone, password: 'password123' } });
      expect(otpLogin.status()).toBe(200);
      const code = (await (await request.get(`${API}/_dev/last-otp/${phone}`)).json()).data.code;
      const session = (await (await request.post(`${API}/auth/otp/verify`, { data: { role: 'service_provider', identifier: phone, code } })).json()).data;
      await request.patch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${session.accessToken}` }, data: { email: identifier } });
    }

    await page.goto('/service-provider/login');
    await page.getByLabel('Email or Phone Number').fill(identifier);
    await page.getByPlaceholder('Enter Password').fill('password123');
    await page.getByRole('button', { name: 'Login to Dashboard' }).click();
    await expect(page).toHaveURL(/\/service-provider\/verify-otp/, { timeout: 15_000 });
  });
}
