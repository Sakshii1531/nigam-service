import { test, expect } from '@playwright/test';

const providerId = '000000000000000000000002';
async function setup(page, role, state = 'APPROVED') {
  const provider = { id: providerId, name: 'Mohit Sharma', humanId: 'PROV-267', city: 'Bengaluru', phone: '9999999992' };
  const categories = [{ id: '000000000000000000000003', name: 'AC' }, { id: '000000000000000000000004', name: 'CCTV & Wi-Fi Camera' }];
  const app = { state, revision: 0, requestedCategories: categories, approvedCategories: state === 'ASM_REVIEW' ? [] : categories.slice(0, 1), decisionReason: 'Your application has been reviewed. Complete the next step to continue.', interviewAt: '2026-10-21T10:00:00Z', events: [{ action: 'application.submitted', at: '2026-10-21T09:00:00Z', message: 'Application and documents submitted.' }] };
  const user = { id: '000000000000000000000001', role, name: role === 'service_provider' ? provider.name : 'Area Manager', email: 'manager@test.local', permissions: ['techs:view', 'techs:manage'], ...(role === 'service_provider' ? { providerAccess: { eligible: false } } : {}) };
  let submitted;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', ''); let data = [];
    if (path === '/auth/me') data = user;
    else if (path === '/catalog/categories') data = categories;
    else if (path === '/service-provider/onboarding' || path === `/super-admin/provider-onboarding/${providerId}`) data = { provider, onboarding: app, eligibility: { eligible: false, reasons: ['PAID_KIT_RECEIPT_REQUIRED'] }, canBuyKits: app.state === 'APPROVED' };
    else if (path === '/super-admin/provider-onboarding') data = [{ ...provider, serviceCityName: provider.city, onboarding: app }];
    else if (path.endsWith('/review')) { submitted = route.request().postDataJSON(); app.state = submitted.action === 'final_approve' ? 'APPROVED' : 'SUPER_ADMIN_REVIEW'; app.revision++; }
    else if (path.includes('/documents/')) data = { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFokAAAAASUVORK5CYII=' };
    await route.fulfill({ json: { data, error: null, meta: {} } });
  });
  const portal = role === 'service_provider' ? role : 'super_admin';
  await page.addInitScript(({ user, portal }) => { localStorage.setItem(`ncc_access_token_${portal}`, 'test-token'); localStorage.setItem(`ncc_user_${portal}`, JSON.stringify(user)); }, { user, portal });
  return { errors, submission: () => submitted };
}
for (const mobile of [false, true]) {
  test(`provider journey shows next action and progress on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 });
    const { errors } = await setup(page, 'service_provider');
    await page.goto('/service-provider/onboarding');
    await expect(page.getByRole('heading', { name: 'Complete your kit delivery', exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Onboarding progress' }).locator('li')).toHaveCount(5);
    await expect(page.getByRole('link', { name: 'Shop kits & track orders' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go Online', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Review Aadhaar front' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/onboarding-provider-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
for (const role of ['asm', 'super_admin']) {
  test(`${role} workspace retains review decisions`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1050 });
    const { errors, submission } = await setup(page, role, role === 'asm' ? 'ASM_REVIEW' : 'SUPER_ADMIN_REVIEW');
    await page.goto(`/super-admin/provider-onboarding?provider=${providerId}`);
    await expect(page.getByRole('heading', { name: 'Onboarding workspace' })).toBeVisible();
    await page.getByLabel('Review action', { exact: true }).selectOption(role === 'asm' ? 'interview_pass' : 'final_approve');
    if (role === 'asm') {
      await page.getByLabel('I reviewed and verified both Aadhaar documents').check();
      await page.getByLabel('Background review completed').check();
      await page.getByLabel('Decision 1', { exact: true }).selectOption('approved');
      await page.getByLabel('Category reason 1', { exact: true }).fill('AC skill demonstrated');
      await page.getByLabel('Category reason 2', { exact: true }).fill('Needs more training');
    }
    await page.getByLabel('Decision reason / message to provider').fill('Review complete; proceed to the next step.');
    await page.screenshot({ path: `/tmp/onboarding-workspace-${role}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Save onboarding decision' }).click();
    if (role === 'asm') {
      await expect(page.getByText("Interview passed. Waiting for super admin's final approval.", { exact: true })).toBeVisible();
      expect(submission().categoryDecisions.map(c => c.approved)).toEqual([true, false]);
    } else {
      await expect(page.getByText('Final review complete.', { exact: false })).toBeVisible();
      expect(submission().approvedCategories).toEqual(['000000000000000000000003']);
    }
    expect(errors).toEqual([]);
  });
}

test('ASM workspace fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { errors } = await setup(page, 'asm', 'ASM_REVIEW');
  await page.goto(`/super-admin/provider-onboarding?provider=${providerId}`);
  await expect(page.getByRole('heading', { name: 'ASM interview review', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/onboarding-workspace-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
