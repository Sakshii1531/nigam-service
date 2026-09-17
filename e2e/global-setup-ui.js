import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSafeTestDb, DEFAULT_UI_DB } from './testDatabase.js';

export default function globalSetupUi() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));
  const mongoUri = process.env.MONGODB_URI || DEFAULT_UI_DB;
  assertSafeTestDb(mongoUri);
  const result = spawnSync('node', ['../backend/scripts/seed.js'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: mongoUri },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('e2e UI global setup: seed.js failed');
  }
}

