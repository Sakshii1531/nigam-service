import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs the real backend/scripts/seed.js (idempotent) against the e2e database
// before the suite starts, so catalog/booking specs have real categories,
// services, and a technician to work with — same seed logic used for local dev,
// not a duplicated fixture. auth.spec.js doesn't depend on this (it creates its
// own users via /_dev/test-user) but benefits from the RBAC data too.
export default function globalSetup() {
  const e2eDir = fileURLToPath(new URL('.', import.meta.url));
  const envPath = path.resolve(e2eDir, '../backend/.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
  const result = spawnSync('node', ['../backend/scripts/seed.js'], {
    cwd: e2eDir,
    env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nigam_care_e2e' },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('e2e global setup: seed.js failed — see output above');
  }
}
