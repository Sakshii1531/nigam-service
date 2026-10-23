import { test, expect } from '@playwright/test';

const requestId = '000000000000000000000048';
const bookingId = '000000000000000000000088';
const notification = { id: '000000000000000000000099', type: 'completed', title: 'Service Completed', message: 'Your service request has been completed.', createdAt: new Date().toISOString(), read: true, cta: { label: 'View Details', route: `/service-requests/${requestId}` } };

async function setup(page, { booking = { id: bookingId }, error } = {}) {
  const errors = [], calls = [];
  page.on('pageerror', e => errors.push(e.message));
  const user = { id: '000000000000000000000001', role: 'customer', name: 'Test Customer' };
  await page.addInitScript(user => {
    localStorage.setItem('ncc_access_token_customer', 'test-token');
    localStorage.setItem('ncc_user_customer', JSON.stringify(user));
  }, user);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    calls.push(path);
    let data = [];
    if (path === '/auth/me') data = user;
    else if (path === '/notifications') data = [notification];
    else if (path === `/notifications/${notification.id}`) data = notification;
    else if (path === `/service-requests/${requestId}`) {
      expect(route.request().headers().authorization).toBe('Bearer test-token');
      if (error) return route.fulfill({ status: error, json: { error: { message: 'Not authorized to view this request' } } });
      data = { id: requestId, humanId: 'SR-0048', category: 'AC', status: 'Closed', description: 'AC service completed', booking };
    } else if (path === `/bookings/${bookingId}`) {
      data = { id: bookingId, humanId: 'BK-0088', category: 'AC', status: 'Completed', totalPrice: 587.64, service: 'AC repair', serviceRequest: { id: requestId, timeline: [] } };
    }
    await route.fulfill({ json: { data, error: null, meta: {} } });
  });
  return { errors, calls };
}

test('existing notification opens its actual booking through View Details', async ({ page }) => {
  const { errors, calls } = await setup(page);
  await page.goto('/notifications');
  await page.getByRole('button', { name: /Service Completed/ }).click();
  await expect(page).toHaveURL(`/notifications/${notification.id}`);
  await page.getByRole('button', { name: 'View Details', exact: true }).click();
  await expect(page).toHaveURL(`/bookings/${bookingId}`);
  await expect(page.getByText('Booking Details', { exact: true })).toBeVisible();
  await expect(page.getByText('BK-0088', { exact: true }).first()).toBeVisible();
  expect(calls).toContain(`/service-requests/${requestId}`);
  expect(calls).not.toContain(`/bookings/${requestId}`);
  expect(errors).toEqual([]);
});

for (const booking of [bookingId, { _id: bookingId }]) {
  test(`direct service notification link resolves ${typeof booking === 'string' ? 'string' : '_id'} booking reference`, async ({ page }) => {
    const { errors } = await setup(page, { booking });
    await page.goto(`/service-requests/${requestId}`);
    await expect(page).toHaveURL(`/bookings/${bookingId}`);
    await expect(page.getByText('Booking Details', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('a service without a booking shows its own details', async ({ page }) => {
  await setup(page, { booking: null });
  await page.goto(`/service-requests/${requestId}`);
  await expect(page.getByRole('heading', { name: 'Service Request Details' })).toBeVisible();
  await expect(page.getByText('SR-0048', { exact: true })).toBeVisible();
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
});

test('an inaccessible request shows an error and a way back', async ({ page }) => {
  const { calls } = await setup(page, { error: 403 });
  await page.goto(`/service-requests/${requestId}`);
  await expect(page.getByRole('alert')).toContainText('Not authorized');
  await page.getByRole('link', { name: 'Back to notifications' }).click();
  await expect(page).toHaveURL('/notifications');
  expect(calls).not.toContain(`/bookings/${bookingId}`);
});
