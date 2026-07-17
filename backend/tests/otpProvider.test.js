import { describe, it, expect } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateOtpCode, maskIdentifier } from '../src/modules/auth/otpProvider.js';

describe('generateOtpCode', () => {
  it('always returns a 6-digit numeric string', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe('maskIdentifier', () => {
  it('masks a phone number, keeping the first 2 and last 2 digits', () => {
    expect(maskIdentifier('9876543210')).toBe('98******10');
  });

  it('masks an email, keeping the first character of the local part', () => {
    expect(maskIdentifier('john@example.com')).toBe('j***@example.com');
  });
});

// The smsindiahub branch reads env.smsIndiaHub (frozen at module import time),
// so exercising both the "unconfigured in dev" (warn + console fallback, never
// throws) and "unconfigured in production" (fatal, matches the Phase 11
// fail-fast precedent for missing required config) paths needs a real child
// process per scenario — same pattern as env.test.js.
function runSendOtp(envOverrides) {
  const backendRoot = fileURLToPath(new URL('..', import.meta.url));
  const script = `
    import('./src/modules/auth/otpProvider.js').then(async ({ sendOtp }) => {
      try {
        await sendOtp({ identifier: '9876543210', code: '123456', purpose: 'login' });
        console.log('SEND_OK');
      } catch (err) {
        console.error('SEND_ERROR:', err.message);
        process.exit(1);
      }
    });
  `;
  return spawnSync(process.execPath, ['--experimental-vm-modules', '-e', script], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'x',
      JWT_REFRESH_SECRET: 'x',
      MONGODB_URI: 'mongodb://x/x',
      OTP_PROVIDER: 'smsindiahub',
      SMSINDIAHUB_USERNAME: '',
      SMSINDIAHUB_PASSWORD: '',
      SMSINDIAHUB_SENDER_ID: '',
      ...envOverrides,
    },
    encoding: 'utf8',
  });
}

describe('otpProvider — smsindiahub, unconfigured', () => {
  it('falls back to a console log instead of throwing outside production', () => {
    const result = runSendOtp({ NODE_ENV: 'development' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/SEND_OK/);
  });

  it('refuses to silently no-op in production — throws instead', () => {
    const result = runSendOtp({ NODE_ENV: 'production' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/SMSIndiaHub is not configured/);
  });
});
