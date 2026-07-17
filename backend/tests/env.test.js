import { describe, it, expect } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Phase 11 — regression test for a critical bug found during the security
// audit: config/env.js's JWT secret fallback ('dev-only-access-secret') used
// to apply in every environment including production, so a deployment that
// forgot to set JWT_ACCESS_SECRET would silently boot with a public, guessable
// secret — anyone could forge a valid token for any role. Runs in a real child
// process (not just `import()` in-process) so NODE_ENV/env vars can be
// controlled precisely without leaking into the rest of this Jest run.
function runEnvModule(envOverrides) {
  const backendRoot = fileURLToPath(new URL('..', import.meta.url));
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', '-e', "import('./src/config/env.js').then(() => console.log('OK')).catch(e => { console.error(e.message); process.exit(1); })"],
    {
      cwd: backendRoot,
      env: { ...process.env, ...envOverrides },
      encoding: 'utf8',
    },
  );
  return result;
}

describe('env.js — production must never silently fall back to the dev JWT secret', () => {
  it('refuses to start in production when JWT_ACCESS_SECRET is missing', () => {
    const result = runEnvModule({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: '',
      JWT_REFRESH_SECRET: 'x',
      MONGODB_URI: 'mongodb://x/x',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/FATAL.*JWT_ACCESS_SECRET/);
  });

  it('refuses to start in production when MONGODB_URI is missing', () => {
    const result = runEnvModule({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'x',
      JWT_REFRESH_SECRET: 'x',
      MONGODB_URI: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/FATAL.*MONGODB_URI/);
  });

  it('starts fine in production when all required secrets are set', () => {
    const result = runEnvModule({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a-real-secret',
      JWT_REFRESH_SECRET: 'another-real-secret',
      MONGODB_URI: 'mongodb://x/x',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/OK/);
  });

  it('only warns (does not throw) in development when secrets are missing — local DX preserved', () => {
    const result = runEnvModule({ NODE_ENV: 'development', JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: '', MONGODB_URI: '' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/OK/);
  });
});
