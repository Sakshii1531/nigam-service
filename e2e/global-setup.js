import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Runs the real backend/scripts/seed.js (idempotent) against the e2e database
// before the suite starts, so catalog/booking specs have real categories,
// services, and a technician to work with — same seed logic used for local dev,
// not a duplicated fixture. auth.spec.js doesn't depend on this (it creates its
// own users via /_dev/test-user) but benefits from the RBAC data too.
export default function globalSetup() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));
  const result = spawnSync('node', ['../backend/scripts/seed.js'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:27017/nigam_care_e2e' },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('e2e global setup: seed.js failed — see output above');
  }
}
