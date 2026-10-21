import { test, expect } from '@playwright/test';

// Hold the logout response open to exercise the render after session removal.
for (const role of ['asm', 'super_admin']) {
  test(`${role} can log out with an onboarding review open`, async ({ page }) => {
    const user = { id: '000000000000000000000001', role, name: 'Logout Test Manager', email: 'logout-manager@test.local', permissions: ['techs:view', 'techs:manage'] };
    const provider = { id: '000000000000000000000002', name: 'Logout Test Applicant', humanId: 'PROV-TEST', city: 'Test City', phone: '9000000000' };
    const onboarding = { revision: 0, state: 'ASM_REVIEW', requestedCategories: [], approvedCategories: [], events: [] };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let releaseLogout;
    const logoutResponse = new Promise(resolve => { releaseLogout = resolve; });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data = [];
      if (path === '/auth/logout') await logoutResponse;
      else if (path === '/auth/me') data = user;
      else if (path === '/super-admin/provider-onboarding') data = [{ ...provider, onboarding }];
      else if (path === `/super-admin/provider-onboarding/${provider.id}`) data = { provider, onboarding, eligibility: { eligible: false, reasons: ['FINAL_APPROVAL_REQUIRED'] } };
      await route.fulfill({ json: { data, error: null, meta: { total: 0 } } });
    });
    await page.addInitScript(user => {
      localStorage.setItem('ncc_access_token_super_admin', 'logout-test-token');
      localStorage.setItem('ncc_refresh_token_super_admin', 'logout-test-refresh');
      localStorage.setItem('ncc_user_super_admin', JSON.stringify(user));
    }, user);
    await page.goto(`/super-admin/provider-onboarding?provider=${provider.id}`);
    await expect(page.getByRole('heading', { name: 'ASM interview review', exact: true })).toBeVisible();
    await page.getByText(user.email, { exact: true }).click();
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    const logoutRequest = page.waitForRequest('**/api/v1/auth/logout');
    await page.getByRole('button', { name: 'Yes, Log Out', exact: true }).click();
    await logoutRequest;
    await expect(page).toHaveURL(/\/super-admin\/login$/);
    await expect(page.getByText('Application Error', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('ncc_user_super_admin'))).toBeNull();
    releaseLogout();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
