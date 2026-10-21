import { test, expect } from '@playwright/test';

for (const mobile of [false, true]) {
  test(`kit cart and shipping checkout work on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 });
    const user = { id: '000000000000000000000001', role: 'service_provider', name: 'Test Partner', phone: '9876543210', providerAccess: { eligible: false } };
    const kits = [
      { id: '000000000000000000000002', name: 'Onboarding Starter Kit', description: 'Your essentials for getting started.', contents: ['Partner T-shirt', 'ID card', 'Tool pouch'], price: 499, shippingCharge: 0, stock: 25, qualifiesForOnboarding: true },
      { id: '000000000000000000000003', name: 'Optional Tools Kit', description: 'Extra tools for your everyday work.', contents: ['Gloves', 'Screwdriver set'], price: 199, shippingCharge: 25, stock: 2, qualifiesForOnboarding: false },
      { id: '000000000000000000000004', name: 'Sold Out Kit', description: '', contents: [], price: 199, shippingCharge: 0, stock: 0, qualifiesForOnboarding: false },
    ];
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let submitted, orders = [];
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', ''); let data = [];
      if (path === '/auth/me') data = user;
      else if (path === '/service-provider/kits') data = kits;
      else if (path === '/service-provider/onboarding') data = { canBuyKits: true };
      else if (path === '/service-provider/kits/orders') {
        if (route.request().method() === 'POST') {
          submitted = route.request().postDataJSON();
          const order = { id: '000000000000000000000005', humanId: 'KIT-TEST', status: 'Processing', paymentStatus: 'Paid', recipient: submitted.recipient, items: submitted.items.map(i => ({ ...kits.find(k => k.id === i.kit), kit: i.kit, quantity: i.quantity })), total: 1222, events: [] };
          orders = [order]; data = { order };
        } else data = orders;
      }
      await route.fulfill({ json: { data, error: null, meta: {} } });
    });
    await page.addInitScript(user => { localStorage.setItem('ncc_access_token_service_provider', 'test-token'); localStorage.setItem('ncc_user_service_provider', JSON.stringify(user)); }, user);
    await page.goto('/service-provider/kits');
    const cart = page.getByRole('complementary', { name: 'Your cart' });
    await expect(cart.getByText('Your cart is empty', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Sold Out Kit to cart', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Add Onboarding Starter Kit to cart', exact: true }).click();
    await page.getByRole('button', { name: 'Add Optional Tools Kit to cart', exact: true }).click();
    await expect(cart.getByTestId('cart-total')).toHaveText('₹723.00');
    await cart.getByRole('button', { name: 'Increase quantity of Optional Tools Kit', exact: true }).click();
    await expect(cart.getByRole('button', { name: 'Increase quantity of Optional Tools Kit', exact: true })).toBeDisabled();
    await cart.getByRole('button', { name: 'Remove Optional Tools Kit from cart', exact: true }).click();
    await expect(cart.getByTestId('cart-total')).toHaveText('₹499.00');
    await page.getByRole('button', { name: 'Add Optional Tools Kit to cart', exact: true }).click();
    await cart.getByRole('button', { name: 'Increase quantity of Onboarding Starter Kit', exact: true }).click();
    await cart.getByLabel('Quantity — Onboarding Starter Kit', { exact: true }).fill('999');
    await expect(cart.getByLabel('Quantity — Onboarding Starter Kit', { exact: true })).toHaveValue('20');
    await cart.getByLabel('Quantity — Onboarding Starter Kit', { exact: true }).fill('2');
    await expect(cart.getByTestId('cart-total')).toHaveText('₹1,222.00');
    await page.screenshot({ path: `/tmp/partner-kit-shop-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
    await cart.getByRole('button', { name: 'Continue to checkout', exact: true }).click();
    for (const [name, value] of [['House / street address', '12 Partner Street'], ['Shipping city', 'Indore'], ['Shipping state', 'Madhya Pradesh'], ['Pincode', '452001']]) await page.getByLabel(name, { exact: true }).fill(value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Pay for kits', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Payment confirmed');
    expect(submitted.items).toEqual([{ kit: kits[0].id, quantity: 2 }, { kit: kits[1].id, quantity: 1 }]);
    expect(submitted.recipient.pincode).toBe('452001');
    await expect(cart.getByText('Your cart is empty', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'KIT-TEST', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
