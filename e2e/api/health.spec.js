import { test, expect } from '@playwright/test';

// Every API endpoint that exists as of this phase must have a test here.
// As of Phase 1 (data modeling), the only mounted route is /api/v1/health —
// everything else is Mongoose models with no routes yet. Add a describe block
// per module as its routes are mounted in app.js (Phase 4 onward).

test.describe('GET /api/v1/health', () => {
  test('reports the API as up with the database connected', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.status).toBe('up');
    expect(body.data.db).toBe('connected');
    expect(typeof body.data.uptimeSeconds).toBe('number');
  });
});

test.describe('unmatched routes', () => {
  test('return a consistent 404 envelope', async ({ request }) => {
    const res = await request.get('/api/v1/this-route-does-not-exist');
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error.message).toMatch(/Route not found/);
  });
});
