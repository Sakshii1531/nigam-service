import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import { isTest } from '../../config/env.js';
import * as authService from './auth.service.js';
import {
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  logoutSchema,
} from './auth.validation.js';

export const authRouter = Router();

// Tighter than the app-wide default (app.js) — these are the brute-force-sensitive
// endpoints (password checks, OTP guesses). Skipped in NODE_ENV=test: the in-memory
// store persists for the life of the process, and a single Jest file legitimately
// exercises far more than 20 auth requests across its test cases — rate limiting
// itself is exercised separately were it ever made configurable per-environment,
// but blocking the functional test suite on it isn't the point of this middleware.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
if (!isTest) authRouter.use(authRateLimit);

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    ok(res, await authService.login(req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/send', validate(otpSendSchema), async (req, res, next) => {
  try {
    ok(res, await authService.resendOtp(req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', validate(otpVerifySchema), async (req, res, next) => {
  try {
    ok(res, await authService.verifyLoginOtp(req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    ok(res, await authService.forgotPassword(req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    ok(res, { message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    ok(res, await authService.refreshSession(req.body.refreshToken));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', validate(logoutSchema), async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    ok(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});
