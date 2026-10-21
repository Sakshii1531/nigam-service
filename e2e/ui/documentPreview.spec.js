import { test, expect } from '@playwright/test';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFokAAAAASUVORK5CYII=';
async function setup(page, url, contentType) {
  const user = { id: '000000000000000000000001', role: 'service_provider', name: 'Test Partner', providerAccess: { eligible: false } };
  await page.addInitScript(user => { localStorage.setItem('ncc_access_token_service_provider', 'test-token'); localStorage.setItem('ncc_user_service_provider', JSON.stringify(user)); }, user);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', ''); let data = [];
    if (path === '/auth/me') data = user;
    else if (path === '/service-provider/onboarding') data = { provider: { name: user.name }, onboarding: { state: 'ASM_REVIEW', requestedCategories: [], approvedCategories: [], events: [] }, eligibility: { eligible: false, reasons: [] } };
    else if (path.includes('/documents/')) data = { url, contentType };
    await route.fulfill({ json: { data, meta: {}, error: null } });
  });
  await page.goto('/service-provider/onboarding'); await page.getByRole('button', { name: 'Review Aadhaar front' }).click();
}
test('uploaded image renders as an image with a working open link', async ({ page }) => {
  await setup(page, png, 'image/png'); const image = page.getByRole('img', { name: 'Aadhaar front document preview' });
  await expect(image).toBeVisible(); await expect.poll(() => image.evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTitle('Aadhaar document preview')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open document' })).toHaveAttribute('href', /^blob:/);
  await page.getByRole('button', { name: 'Close document' }).click(); await expect(image).toHaveCount(0);
});
test('failed image explains the problem instead of leaving a blank preview', async ({ page }) => {
  await setup(page, 'data:image/png;base64,AAAA', 'image/png');
  await expect(page.getByRole('alert')).toContainText('The document could not be displayed');
  await expect(page.getByText('Loading document…', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open document' })).toBeVisible();
});
test('PDF uses the PDF viewer and provides a browser fallback', async ({ page }) => {
  await setup(page, 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=', 'application/pdf');
  await expect(page.getByTitle('Aadhaar document preview')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByText('If your browser cannot display this PDF', { exact: false })).toBeVisible();
});
