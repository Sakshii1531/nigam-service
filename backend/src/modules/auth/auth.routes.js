import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { User } from './user.model.js';
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
  signupCheckSchema,
  signupVerifySchema,
  changePasswordSchema,
  updateOwnProfileSchema,
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

authRouter.post('/signup/check', validate(signupCheckSchema), async (req, res, next) => {
  try {
    ok(res, await authService.signupCheck(req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/signup/verify', validate(signupVerifySchema), async (req, res, next) => {
  try {
    ok(res, await authService.signupVerify(req.body));
  } catch (err) {
    next(err);
  }
});

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

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    const referralsCount = await User.countDocuments({ referredBy: req.user.id });
    const userObj = user.toJSON();
    delete userObj.passwordHash;
    userObj.referralsCount = referralsCount;
    ok(res, userObj);
  } catch (err) {
    next(err);
  }
});

// Address CRUD Routes
authRouter.get('/addresses', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.getAddresses(req.user.id));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/addresses', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.addAddress(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.put('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.updateAddress(req.user.id, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.delete('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.deleteAddress(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/addresses/:id/default', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.setDefaultAddress(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

// Payment Methods Tokenization Routes (PCI-DSS Compliant)
authRouter.get('/payment-methods', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.getPaymentMethods(req.user.id));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/payment-methods/tokenize-card', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.tokenizeAndSaveCard(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/payment-methods/tokenize-upi', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.tokenizeAndSaveUpi(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

authRouter.delete('/payment-methods/:id', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.deletePaymentMethod(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/payment-methods/:id/primary', requireAuth, async (req, res, next) => {
  try {
    ok(res, await authService.setPrimaryPaymentMethod(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});



// Authenticated self-service password change (any role).
authRouter.patch('/password', requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    ok(res, { changed: true });
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/me', requireAuth, validate(updateOwnProfileSchema), async (req, res, next) => {
  try {
    ok(res, await authService.updateOwnProfile(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});
