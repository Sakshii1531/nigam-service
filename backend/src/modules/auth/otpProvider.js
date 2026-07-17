import { env, isSmsIndiaHubConfigured, isProd } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Behind an interface so a real SMS/email vendor drops in without touching
// auth.service.js — set OTP_PROVIDER=smsindiahub in .env once SMSINDIAHUB_*
// credentials are set (BACKEND_CONTEXT.md §9 — resolved: SMSIndiaHub chosen).
// The frontend's OTP screens are pure UI simulation for 3 of the 4 portals
// still (see frontend/docs/PHASE13_INTEGRATION.md); this only changes how the
// code reaches the user, not the verify flow itself.
// Set OTP_PROVIDER=test in the e2e webServer's env (playwright.config.js) so specs
// can read the real code back via GET /_dev/last-otp/:identifier (dev.routes.js) —
// that route only ever mounts under NODE_ENV=test, never dev/prod, so this in-memory
// store is not a real credential leak outside automated test runs.
const lastCodeByIdentifier = new Map();

// SMSIndiaHub's SendSMS is a plain GET with query-string auth (no HMAC/OAuth) —
// https://cloud.smsindiahub.in/api/mt/SendSMS?user=...&password=...&senderid=...
// &channel=2&DCS=0&flashsms=0&number=91XXXXXXXXXX&text=...&EntityId=...&dlttemplateid=...
// DLT (TRAI) rules require `text` to byte-match the entity's registered template
// exactly (only the {#var#} slot varies) — that's why the template itself lives in
// env (SMSINDIAHUB_OTP_TEMPLATE), not hardcoded here: a template mismatch is
// silently dropped by the carrier, not a clean API error, so it must be
// operator-configurable without a code change.
async function sendViaSmsIndiaHub({ identifier, code, purpose }) {
  if (!isSmsIndiaHubConfigured) {
    if (isProd) throw new ApiError(500, 'SMSIndiaHub is not configured — cannot send OTP in production');
    console.warn('[otp:smsindiahub] Not configured (SMSINDIAHUB_USERNAME/PASSWORD/SENDER_ID missing) — falling back to console log for local dev.');
    console.log(`[otp:smsindiahub:unconfigured] ${purpose} code for ${identifier}: ${code}`);
    return;
  }

  const number = identifier.replace(/\D/g, '');
  if (!number) throw new ApiError(400, 'OTP delivery requires a phone number, not an email, for the smsindiahub provider');

  const text = env.smsIndiaHub.otpTemplate.replace('{code}', code);
  const params = new URLSearchParams({
    user: env.smsIndiaHub.username,
    password: env.smsIndiaHub.password,
    senderid: env.smsIndiaHub.senderId,
    channel: env.smsIndiaHub.channel,
    DCS: '0',
    flashsms: '0',
    number,
    text,
    route: 'clickhere',
    EntityId: env.smsIndiaHub.entityId,
    dlttemplateid: env.smsIndiaHub.dltTemplateId,
  });

  const res = await fetch(`${env.smsIndiaHub.baseUrl}?${params.toString()}`);
  if (!res.ok) {
    throw new ApiError(502, `SMSIndiaHub request failed with HTTP ${res.status}`);
  }
  // SMSIndiaHub returns 200 with an error description in the body on
  // rejection (e.g. bad sender id, DLT mismatch) rather than a non-2xx
  // status — surface that instead of reporting a false success.
  const body = await res.text();
  if (/error|invalid|fail/i.test(body)) {
    throw new ApiError(502, `SMSIndiaHub rejected the SMS: ${body.slice(0, 300)}`);
  }
}

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
  smsindiahub: {
    send: sendViaSmsIndiaHub,
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
