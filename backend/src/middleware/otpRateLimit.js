import rateLimit from 'express-rate-limit';
import { ROLES } from '../config/constants.js';

// Sending/resending an OTP is a distinct abuse vector from the rest of
// authRouter's brute-force-sensitive endpoints (auth.routes.js's authRateLimit
// covers those with one flat per-IP budget) — repeatedly triggering SMS/email
// sends costs real money per message and can be used to harass a phone
// number, independent of whether anyone is also guessing passwords. This
// limiter targets exactly that: POST /auth/otp/send and /auth/forgot-password,
// both of which funnel into auth.service.js's initiateOtp.
//
// Two things IP-based limiting alone gets wrong here, which is why this keys
// on (role, device) instead:
//   - Too coarse: many genuine users share one IP (office Wi-Fi, a mobile
//     carrier's NAT), so one throttles them all together.
//   - Too loose: a determined caller trivially gets a fresh IP; a device id
//     persisted in that browser's localStorage (frontend/src/lib/deviceId.js)
//     survives that.
// Falls back to req.ip only when the header is missing (a non-browser caller,
// or a client predating this) so the endpoint still degrades safely rather
// than sharing one bucket across every headerless request.
//
// Limits are intentionally different per role: customer and service_provider
// both cover a public, high-volume signup/login surface where a mistyped
// number needing a couple of resends is normal. brand_admin/asm/super_admin
// are provisioned accounts on a low-volume internal surface, where repeated
// resends are more likely to be probing than a real user — so they get a
// tighter budget.
const OTP_RESEND_LIMITS = Object.freeze({
  [ROLES.CUSTOMER]: 5,
  [ROLES.SERVICE_PROVIDER]: 5,
  [ROLES.BRAND_ADMIN]: 4,
  [ROLES.ASM]: 4,
  [ROLES.SUPER_ADMIN]: 3,
});
const OTP_RESEND_DEFAULT_LIMIT = 3; // an unrecognized/missing role gets the strictest budget, not the loosest
const OTP_RESEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function deviceKeyFor(req) {
  const deviceId = req.headers['x-device-id'];
  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : req.ip;
}

export const otpResendRateLimit = rateLimit({
  windowMs: OTP_RESEND_WINDOW_MS,
  limit: (req) => OTP_RESEND_LIMITS[req.body?.role] ?? OTP_RESEND_DEFAULT_LIMIT,
  keyGenerator: (req) => `${req.body?.role || 'unknown'}:${deviceKeyFor(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { message: 'Too many code requests from this device. Please wait a few minutes and try again.' },
    meta: {},
  },
});

// Same config would work as one shared instance, but a fresh one keeps the
// two windows (send vs forgot-password) independent — spending the budget on
// one purpose shouldn't lock out the other.
export const forgotPasswordOtpRateLimit = rateLimit({
  windowMs: OTP_RESEND_WINDOW_MS,
  limit: (req) => OTP_RESEND_LIMITS[req.body?.role] ?? OTP_RESEND_DEFAULT_LIMIT,
  keyGenerator: (req) => `${req.body?.role || 'unknown'}:${deviceKeyFor(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { message: 'Too many code requests from this device. Please wait a few minutes and try again.' },
    meta: {},
  },
});
