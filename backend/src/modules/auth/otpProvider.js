import { env } from '../../config/env.js';

// Behind an interface so a real SMS/email vendor (Twilio, MSG91, etc.) drops in
// later without touching auth.service.js — set OTP_PROVIDER in .env once one is
// chosen (BACKEND_CONTEXT.md §9 open question). The frontend's OTP screens are
// pure UI simulation today, so there's no existing contract to match beyond "a
// 6-digit code gets to the user somehow."
// Set OTP_PROVIDER=test in the e2e webServer's env (playwright.config.js) so specs
// can read the real code back via GET /_dev/last-otp/:identifier (dev.routes.js) —
// that route only ever mounts under NODE_ENV=test, never dev/prod, so this in-memory
// store is not a real credential leak outside automated test runs.
const lastCodeByIdentifier = new Map();

const providers = {
  stub: {
    async send({ identifier, code, purpose }) {
      console.log(`[otp:stub] ${purpose} code for ${identifier}: ${code}`);
    },
  },
  test: {
    async send({ identifier, code, purpose }) {
      lastCodeByIdentifier.set(identifier, { code, purpose });
    },
  },
};

export function getLastOtpForTesting(identifier) {
  return lastCodeByIdentifier.get(identifier) || null;
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits, never starts with 0
}

export async function sendOtp({ identifier, code, purpose }) {
  const provider = providers[env.otpProvider] || providers.stub;
  await provider.send({ identifier, code, purpose });
}

/** Masks a phone/email for display, matching what the frontend's OTP screen shows (e.g. "98******10", "j***@example.com"). */
export function maskIdentifier(identifier) {
  if (identifier.includes('@')) {
    const [user, domain] = identifier.split('@');
    return `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
  }
  if (identifier.length <= 4) return '*'.repeat(identifier.length);
  return `${identifier.slice(0, 2)}${'*'.repeat(identifier.length - 4)}${identifier.slice(-2)}`;
}
