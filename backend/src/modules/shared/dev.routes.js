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
import { Technician } from '../technician/technician.model.js';
import { AMCPlan } from '../warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../warranty-amc-exchange/amcSubscription.model.js';

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
    walletCoins: z.coerce.number().int().nonnegative().optional(), // lets commerce specs test coin redemption without a real earn flow
  });
  devRouter.post('/_dev/test-user', validate(testUserSchema), async (req, res, next) => {
    try {
      const { role, phone, email, password, walletCoins } = req.body;
      if (!phone && !email) throw new ApiError(400, 'phone or email required');

      await User.deleteOne({ role, ...(phone ? { phone } : {}), ...(email ? { email } : {}) });
      const user = await User.create({
        role,
        phone,
        email,
        name: 'E2E Test User',
        passwordHash: await hashPassword(password),
        status: 'Active',
        walletCoins,
      });
      ok(res, { id: user.id }, {}, 201);
    } catch (err) {
      next(err);
    }
  });

  // Same reasoning as /_dev/test-user, one level up: booking/service-request specs
  // need a technician that's exclusively theirs (Active+Available, specific specs),
  // not the shared seeded one — reusing that across parallel workers would race on
  // auto-assignment and OTP login. Creates both the User and its Technician profile.
  const testTechnicianSchema = z.object({
    phone: z.string().min(1),
    password: z.string().min(6),
    specs: z.array(z.string()).optional(),
    availability: z.enum(['Available', 'Busy', 'Offline']).optional(),
  });
  devRouter.post('/_dev/test-technician', validate(testTechnicianSchema), async (req, res, next) => {
    try {
      const { phone, password, specs = ['AC'], availability = 'Available' } = req.body;

      await User.deleteOne({ role: ROLES.TECHNICIAN, phone });
      const user = await User.create({
        role: ROLES.TECHNICIAN,
        phone,
        name: 'E2E Test Technician',
        passwordHash: await hashPassword(password),
        status: 'Active',
      });

      await Technician.deleteOne({ user: user._id });
      const technician = await Technician.create({
        user: user._id,
        name: 'E2E Test Technician',
        phone,
        status: 'Active',
        availability,
        specs,
      });

      ok(res, { userId: user.id, technicianId: technician.id }, {}, 201);
    } catch (err) {
      next(err);
    }
  });

  // AMC subscription purchase is a deferred flow (Phase 5 scope decision — see
  // DATA_MODEL.md) with no real HTTP surface yet, but Phase 6's technician "AMC
  // Visit" job type needs a real subscription to link against and decrement.
  // Same reasoning as /_dev/test-technician: gives specs something real to set up
  // and read back without building the deferred purchase flow early.
  const testAmcSubscriptionSchema = z.object({
    customerId: z.string().min(1),
    brand: z.string().min(1).default('LG'),
    visitsTotal: z.coerce.number().int().positive().default(4),
  });
  devRouter.post('/_dev/test-amc-subscription', validate(testAmcSubscriptionSchema), async (req, res, next) => {
    try {
      const { customerId, brand, visitsTotal } = req.body;
      const plan = await AMCPlan.findOneAndUpdate(
        { name: 'E2E AMC Plan' },
        { name: 'E2E AMC Plan', tier: 'Gold', price: 2499, visitsTotal },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const subscription = await AMCSubscription.create({
        user: customerId,
        plan: plan._id,
        brand,
        expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        visitsTotal,
        visitsRemaining: visitsTotal,
        visitNumber: 1,
      });
      ok(res, { id: subscription.id }, {}, 201);
    } catch (err) {
      next(err);
    }
  });

  // Non-booking ServiceRequests (warranty/AMC complaints raised directly, not via
  // a Booking) also have no real HTTP surface yet (same deferred-flow reasoning as
  // above) — this creates one already 'Assigned' to a given technician so E2E specs
  // can exercise AMC/Brand-Warranty job acceptance without a real complaint-raising flow.
  const testServiceRequestSchema = z.object({
    customerId: z.string().min(1),
    technicianId: z.string().min(1),
    category: z.string().min(1),
  });
  devRouter.post('/_dev/test-service-request', validate(testServiceRequestSchema), async (req, res, next) => {
    try {
      const { createServiceRequest, transitionStatus } = await import('../service-requests/serviceRequest.service.js');
      let serviceRequest = await createServiceRequest({
        user: req.body.customerId,
        technician: req.body.technicianId,
        category: req.body.category,
        description: `${req.body.category} — E2E fixture request`,
        requestMode: 'B2C',
      });
      serviceRequest = await transitionStatus(serviceRequest.id, 'Assigned', { description: 'E2E fixture: pre-assigned' });
      ok(res, { id: serviceRequest.id }, {}, 201);
    } catch (err) {
      next(err);
    }
  });

  devRouter.get('/_dev/amc-subscription/:id', async (req, res, next) => {
    try {
      const subscription = await AMCSubscription.findById(req.params.id);
      if (!subscription) throw new ApiError(404, 'AMC subscription not found');
      ok(res, subscription);
    } catch (err) {
      next(err);
    }
  });
}
