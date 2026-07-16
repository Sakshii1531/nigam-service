import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { upload, storeUploadedFile } from './fileUpload.js';
import { generateHumanId } from './idGenerator.js';
import { ID_PREFIXES, ROLES } from '../../config/constants.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { isTest } from '../../config/env.js';
import { getLastOtpForTesting } from '../auth/otpProvider.js';
import { User } from '../auth/user.model.js';
import { hashPassword } from '../auth/password.js';

// Non-production only (mounted conditionally in app.js) — exercises the Phase 2
// shared plumbing (pagination, validation-error shape, file upload, id generation)
// end-to-end via real HTTP, per the roadmap's Phase 2 exit criterion. Covered by
// e2e/api/dev.spec.js; both retire once real Phase 4+ routes make this redundant.
export const devRouter = Router();

devRouter.get('/_dev/paginate', (req, res) => {
  const all = Array.from({ length: 47 }, (_, i) => ({ n: i + 1 }));
  const { page, limit, skip } = parsePagination(req.query);
  ok(res, all.slice(skip, skip + limit), paginationMeta({ page, limit, total: all.length }));
});

const devValidateSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
});

devRouter.post('/_dev/validate', validate(devValidateSchema, 'body'), (req, res) => {
  ok(res, req.body);
});

devRouter.post('/_dev/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file provided (expected multipart field "file")');
    const url = await storeUploadedFile(req.file);
    ok(res, { url });
  } catch (err) {
    next(err);
  }
});

devRouter.post('/_dev/id/:prefixKey', async (req, res, next) => {
  try {
    const prefix = ID_PREFIXES[req.params.prefixKey];
    if (!prefix) throw new ApiError(400, `Unknown prefix key: ${req.params.prefixKey}`);
    const id = await generateHumanId(prefix);
    ok(res, { id });
  } catch (err) {
    next(err);
  }
});

// Demonstrates requireAuth/requireRole per the Phase 3 exit criterion
// ("protected-route access -> 403 on wrong role").
devRouter.get('/_dev/whoami', requireAuth, (req, res) => {
  ok(res, req.user);
});

devRouter.get('/_dev/admin-only', requireAuth, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  ok(res, { message: 'Welcome, super admin' });
});

// NODE_ENV=test only (not just non-production) — lets e2e specs read back the code
// the 'test' OTP provider captured, since Playwright can't scrape server stdout the
// way a shell script can. Never reachable in dev or prod regardless of OTP_PROVIDER.
if (isTest) {
  devRouter.get('/_dev/last-otp/:identifier', (req, res, next) => {
    const entry = getLastOtpForTesting(req.params.identifier);
    if (!entry) return next(new ApiError(404, 'No OTP captured for this identifier'));
    ok(res, entry);
  });

  // E2E fixture creation — there's no signup endpoint yet (Phase 3 doesn't include
  // one; accounts come from admin panels/seeding in later phases), so specs need
  // some way to get a real user into the e2e database over HTTP. Upserts (deletes
  // any prior user with the same role+identifier first) so specs are re-runnable.
  const testUserSchema = z.object({
    role: z.enum(Object.values(ROLES)),
    phone: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(6),
  });
  devRouter.post('/_dev/test-user', validate(testUserSchema), async (req, res, next) => {
    try {
      const { role, phone, email, password } = req.body;
      if (!phone && !email) throw new ApiError(400, 'phone or email required');

      await User.deleteOne({ role, ...(phone ? { phone } : {}), ...(email ? { email } : {}) });
      const user = await User.create({
        role,
        phone,
        email,
        name: 'E2E Test User',
        passwordHash: await hashPassword(password),
        status: 'Active',
      });
      ok(res, { id: user.id }, {}, 201);
    } catch (err) {
      next(err);
    }
  });
}
