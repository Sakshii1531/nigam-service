// Phase 10 — load-tests the hottest write path (booking creation, which itself
// exercises the real weighted assignment engine) against a real running
// server. Not part of the CI/Jest gate — a manual diagnostic run.
//
// Target server must run with NODE_ENV=test (so /_dev/* fixture routes and
// the in-memory OTP capture are reachable) against a disposable local DB —
// never point this at Atlas or any shared/production database.
//   NODE_ENV=test OTP_PROVIDER=test MONGODB_URI=mongodb://127.0.0.1:27017/nigam_care_loadtest node src/server.js
//   npm run loadtest
import autocannon from 'autocannon';

const BASE_URL = process.env.LOADTEST_BASE_URL || 'http://localhost:4000/api/v1';

async function loginAndVerify({ role, identifier, password }) {
  await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, identifier, password }),
  });

  const otpRes = await fetch(`${BASE_URL}/_dev/last-otp/${encodeURIComponent(identifier)}`);
  if (!otpRes.ok) {
    throw new Error('GET /_dev/last-otp unavailable — target server must run with NODE_ENV=test.');
  }
  const { code } = (await otpRes.json()).data;

  const verifyRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, identifier, code }),
  });
  return (await verifyRes.json()).data.accessToken;
}

async function setupFixture() {
  const suffix = Date.now();
  const categoryKey = `LOADTEST-${suffix}`;
  const adminEmail = `loadtest-admin-${suffix}@local.test`;

  await fetch(`${BASE_URL}/_dev/test-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'super_admin', email: adminEmail, password: 'password123' }),
  });
  const adminToken = await loginAndVerify({ role: 'super_admin', identifier: adminEmail, password: 'password123' });

  await fetch(`${BASE_URL}/catalog/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ key: categoryKey, name: categoryKey }),
  });
  await fetch(`${BASE_URL}/catalog/categories/${categoryKey}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ slug: 'repair', name: 'Repair', price: 299 }),
  });

  const techPhone = `9${String(suffix).slice(-9)}`;
  await fetch(`${BASE_URL}/_dev/test-technician`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: techPhone, password: 'password123', specs: [categoryKey] }),
  });

  const custPhone = `8${String(suffix).slice(-9)}`;
  await fetch(`${BASE_URL}/_dev/test-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'customer', phone: custPhone, password: 'password123' }),
  });
  const custToken = await loginAndVerify({ role: 'customer', identifier: custPhone, password: 'password123' });

  return { categoryKey, custToken };
}

async function run() {
  console.log(`[loadtest] target: ${BASE_URL}`);
  const { categoryKey, custToken } = await setupFixture();

  console.log('\n[loadtest] === POST /bookings (10 connections, 10s) ===');
  const bookingResult = await autocannon({
    url: `${BASE_URL}/bookings`,
    connections: 10,
    duration: 10,
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${custToken}` },
    body: JSON.stringify({ category: categoryKey, serviceSlug: 'repair' }),
  });
  autocannon.printResult(bookingResult);

  console.log(
    `\n[loadtest] booking creation: ${bookingResult.requests.average} req/s avg, p99 latency ${bookingResult.latency.p99}ms, ` +
      `${bookingResult.errors} errors, ${bookingResult['2xx']} 2xx / ${bookingResult['4xx']} 4xx / ${bookingResult['5xx']} 5xx`,
  );
}

run().catch((err) => {
  console.error('[loadtest] failed:', err.message);
  process.exit(1);
});
