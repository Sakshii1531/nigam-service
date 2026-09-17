import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Which database the e2e suites run against, decided in one place.
//
// The suites seed (seed.js wipes every Notification) and purge test fixtures
// (cleanupTestData.mjs) in whatever database they point at. They used to take
// MONGODB_URI straight from backend/.env — which is a developer's real,
// shared database — so a plain `npm test` wrote fixtures into it and deleted
// data from it. Now:
//   - backend/.env is still loaded for other settings, but never MONGODB_URI;
//   - the database is E2E_MONGODB_URI, or a local default;
//   - anything that isn't a local, clearly-test database is refused unless
//     E2E_ALLOW_REMOTE_DB=true is set on purpose.

const e2eDir = fileURLToPath(new URL('.', import.meta.url));

export const DEFAULT_API_DB = 'mongodb://127.0.0.1:27017/nigam_care_e2e';
export const DEFAULT_UI_DB = 'mongodb://127.0.0.1:27017/nigam_care_e2e_ui';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const NEVER_FROM_DOTENV = new Set(['MONGODB_URI', 'MONGODB_TEST_URI']);

/** Loads backend/.env into process.env without overriding anything already set. */
export function loadBackendEnv() {
  const envPath = path.resolve(e2eDir, '../backend/.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    if (NEVER_FROM_DOTENV.has(key)) continue;
    // undefined, not falsy: an explicitly blanked variable must stay blank.
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(idx + 1).trim();
  }
}

function describeUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/.exec(uri || '');
  if (!match) return null;
  const hosts = match[1].split(',').map((h) => h.replace(/:\d+$/, '').toLowerCase());
  return { hosts, dbName: match[2] || '' };
}

/** Throws unless `uri` is a local database whose name marks it as test data. */
export function assertSafeTestDb(uri) {
  if (process.env.E2E_ALLOW_REMOTE_DB === 'true') return;
  const parsed = describeUri(uri);
  const local = parsed && parsed.hosts.every((h) => LOCAL_HOSTS.has(h));
  const testNamed = parsed && /e2e|test/i.test(parsed.dbName);
  if (!local || !testNamed) {
    throw new Error(
      `[e2e] Refusing to run against ${parsed ? `${parsed.hosts.join(',')}/${parsed.dbName}` : 'an unrecognised MongoDB URI'}: ` +
        'the e2e suites seed and delete data. Use a local database whose name contains "e2e" or "test" ' +
        '(set E2E_MONGODB_URI), or set E2E_ALLOW_REMOTE_DB=true if you really mean it.',
    );
  }
}

/**
 * Resolves and checks the suite's database, and exports it as MONGODB_URI so
 * the web server, global setup and teardown (which inherit process.env) all
 * use the same one.
 */
export function useE2eDatabase(defaultUri) {
  const uri = process.env.E2E_MONGODB_URI || defaultUri;
  assertSafeTestDb(uri);
  process.env.MONGODB_URI = uri;
  return uri;
}
