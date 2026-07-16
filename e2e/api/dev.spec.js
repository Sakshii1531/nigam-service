import { test, expect } from '@playwright/test';

// Covers backend/src/modules/shared/dev.routes.js — the Phase 2 exit criterion
// ("a throwaway test route exercises pagination, validation-error shape, and file
// upload end-to-end") plus id generation. These routes only exist when
// NODE_ENV !== 'production' (see app.js), matching this suite's test-mode webServer.
// Assertions use format regexes, not exact sequence numbers — the e2e Mongo database
// persists Counter docs across separate `npm test` runs, so exact values aren't stable.

test.describe('GET /api/v1/_dev/paginate', () => {
  test('returns a page of results with matching pagination meta', async ({ request }) => {
    const res = await request.get('/api/v1/_dev/paginate?page=2&limit=10');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(10);
    expect(body.data[0]).toEqual({ n: 11 }); // page 2 of a 47-item list, limit 10 -> starts at item 11
    expect(body.meta).toEqual({ page: 2, limit: 10, total: 47, totalPages: 5 });
  });

  test('defaults to page 1 / limit 20 with no query params', async ({ request }) => {
    const res = await request.get('/api/v1/_dev/paginate');
    const body = await res.json();
    expect(body.data).toHaveLength(20);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
  });
});

test.describe('POST /api/v1/_dev/validate', () => {
  test('accepts a valid body and echoes it back', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/validate', { data: { name: 'Capacitor', amount: 220 } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ name: 'Capacitor', amount: 220 });
  });

  test('rejects an invalid body with a consistent 400 error envelope', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/validate', { data: { name: '', amount: -5 } });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.details.fieldErrors.name).toBeTruthy();
    expect(body.error.details.fieldErrors.amount).toBeTruthy();
  });
});

test.describe('POST /api/v1/_dev/upload', () => {
  test('stores a valid file and returns a fetchable URL', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/upload', {
      multipart: {
        file: { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('fake-png-bytes') },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.url).toMatch(/^\/uploads\/[\w-]+\.png$/);

    const fetched = await request.get(body.data.url);
    expect(fetched.status()).toBe(200);
    expect(await fetched.text()).toBe('fake-png-bytes');
  });

  test('rejects an unsupported file type with a 400', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/upload', {
      multipart: {
        file: { name: 'malware.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('nope') },
      },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects a request with no file', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/upload', { multipart: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/No file provided/);
  });
});

test.describe('POST /api/v1/_dev/id/:prefixKey', () => {
  test('generates a daily-reset booking id in NCC-YYMMDD-#### shape', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/id/BOOKING');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.id).toMatch(/^NCC-\d{6}-\d{4}$/);
  });

  test('generates a yearly-reset invoice id in INV-YYYY-### shape', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/id/INVOICE');
    const body = await res.json();
    expect(body.data.id).toMatch(new RegExp(`^INV-${new Date().getFullYear()}-\\d{3}$`));
  });

  test('rejects an unknown prefix key with a 400', async ({ request }) => {
    const res = await request.post('/api/v1/_dev/id/NOT_A_KEY');
    expect(res.status()).toBe(400);
  });
});
