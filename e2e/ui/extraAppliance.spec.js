import { test, expect } from '@playwright/test';
import { offeringBookingBody } from '../catalogueFixture.js';

// The client's flow on the real screens: the partner, already at the customer
// for an AC, adds an RO purifier the customer wants serviced too, sends a
// spare part's price to the customer, the customer approves it in their app,
// and the partner's final bill lists both appliances before taking payment.

const API = `${process.env.UI_API_ORIGIN || 'http://localhost:4111'}/api/v1`;
const SHOTS = process.env.EXTRA_SHOTS || '';

const uniquePhone = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;

async function login(request, role, identifier) {
  const res = await request.post(`${API}/auth/login`, { data: { role, identifier, password: 'password123' } });
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

async function signIn(page, session) {
  await page.addInitScript(([a, r, u]) => {
    localStorage.setItem('ncc_access_token', a);
    localStorage.setItem('ncc_refresh_token', r);
    localStorage.setItem('ncc_user', u);
  }, [session.accessToken, session.refreshToken, JSON.stringify(session.user)]);
}

const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }) : null);

test('partner adds another appliance, the customer approves its part, one bill covers both', async ({ browser, request }) => {
  test.setTimeout(150_000);
  const city = `Extra City ${uniquePhone()}`;
  const providerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-serviceProvider`, { data: { phone: providerPhone, password: 'password123', specs: ['AC'], availability: 'Available', serviceCityName: city } });
  const provider = await login(request, 'service_provider', providerPhone);
  const customerPhone = uniquePhone();
  await request.post(`${API}/_dev/test-user`, { data: { role: 'customer', phone: customerPhone, password: 'password123' } });
  const customer = await login(request, 'customer', customerPhone);

  const created = await request.post(`${API}/bookings`, {
    headers: { Authorization: `Bearer ${customer.accessToken}` },
    data: await offeringBookingBody(request, { api: API, offeringCode: 'AC-WINDOW-REPAIR', address: { house: '7 Extra Lane', city, pincode: '452001' }, fullName: 'Extra Appliance Customer' }),
  });
  expect(created.status()).toBe(201);
  const { booking, serviceRequest } = (await created.json()).data;

  // Accept, travel, arrive, inspect and finish the AC through the partner API.
  const sp = { Authorization: `Bearer ${provider.accessToken}` };
  const accepted = await request.post(`${API}/service-provider/jobs/accept/${serviceRequest.id}`, { headers: sp, data: {} });
  expect(accepted.status()).toBe(200);
  const jobId = (await accepted.json()).data.id;
  for (const [path, data] of [
    ['start-travel'],
    ['arrive'],
    ['diagnosis', { photos: { product: 'https://example.test/p.jpg', serial: 'https://example.test/s.jpg' }, notes: 'AC checked' }],
    ['spare-parts', { parts: [] }],
    ['repair-complete'],
  ]) {
    const res = await request.post(`${API}/service-provider/jobs/${jobId}/${path}`, { headers: sp, data: data || {} });
    expect(res.status(), path).toBe(200);
  }

  // Partner's phone: the job's "repair complete" screen.
  const partner = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(partner, provider);
  await partner.goto('/service-provider/dashboard');
  await partner.getByRole('button', { name: /Start Job|Resume|Continue/ }).first().click();
  await expect(partner.getByText('Repair Work Resolution')).toBeVisible();
  const panel = partner.getByLabel('Other appliances');
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: 'Add another appliance' }).click();
  await partner.getByRole('dialog').getByRole('button', { name: 'RO Water Purifier' }).click();
  await partner.getByRole('dialog').getByRole('button', { name: 'Add: RO Inspection' }).click();
  await expect(panel.getByText('RO Inspection')).toBeVisible();

  await panel.getByRole('button', { name: '+ Spare part' }).click();
  const dialog = partner.getByRole('dialog');
  await dialog.getByLabel('Part name').fill('RO Membrane');
  await dialog.getByLabel('Price per piece').fill('1000');
  await shot(partner, '01-partner-sends-part');
  await dialog.getByRole('button', { name: 'Send price to customer' }).click();
  await expect(panel.getByText('Waiting for customer')).toBeVisible();
  await shot(partner, '02-partner-waiting');

  // The bill is refused while the customer has not answered.
  const early = await request.post(`${API}/service-provider/jobs/${jobId}/billing`, { headers: sp });
  expect(early.status()).toBe(409);

  // Customer's phone: the approval pop-up on their booking.
  const cust = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signIn(cust, customer);
  await cust.goto(`/bookings/${booking.humanId}`);
  const ask = cust.getByRole('dialog', { name: 'Approve spare part price' });
  await expect(ask).toContainText('RO Water Purifier');
  await expect(ask).toContainText('RO Membrane');
  await expect(ask).toContainText('₹1,180');
  await shot(cust, '03-customer-approval');
  await ask.getByRole('button', { name: 'Approve ₹1,180' }).click();
  await expect(ask).toHaveCount(0);
  const card = cust.getByLabel('Other appliances on this visit');
  await expect(card.getByText('Approved')).toBeVisible();

  // Back on the partner's phone: approved, then the bill for both appliances.
  await expect(panel.getByText('Approved - fit it')).toBeVisible({ timeout: 15_000 });
  await partner.getByRole('button', { name: 'Proceed to Invoice & Billing' }).click();
  const bill = partner.getByLabel('Bill by appliance');
  await expect(bill).toBeVisible();
  await expect(bill).toContainText('Window AC');
  await expect(bill).toContainText('RO Water Purifier');
  await expect(bill).toContainText('Spare part: RO Membrane');
  await expect(bill).toContainText('₹1,180');
  await expect(partner.getByRole('button', { name: /Customer pays online/ })).toBeVisible();
  await shot(partner, '04-partner-bill');

  const otp = (await (await request.get(`${API}/bookings/${booking.id}`, { headers: { Authorization: `Bearer ${customer.accessToken}` } })).json()).data.completionOtp;
  for (const [i, d] of [...String(otp)].entries()) await partner.locator(`#billing-otp-${i}`).fill(d);
  await partner.getByRole('button', { name: 'Collect Payment (Complete Job)' }).click();
  // Completed: the job screen has nothing left in progress.
  await expect(partner.getByRole('heading', { name: 'No Active Job In Progress' })).toBeVisible({ timeout: 20_000 });

  // The customer's booking shows the itemised final bill.
  await cust.reload();
  const finalBill = cust.getByLabel('Final bill');
  await expect(finalBill).toContainText('RO Water Purifier');
  await expect(finalBill).toContainText('RO Membrane');
  await shot(cust, '05-customer-final-bill');
});
