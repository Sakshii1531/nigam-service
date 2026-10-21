import { storePrivateKyc, removePrivateKyc } from '../provider-onboarding/kycStorage.js';
import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../middleware/errorHandler.js';
import { created } from '../../utils/respond.js';
import { upload } from '../shared/fileUpload.js';
import { ROLES } from '../../config/constants.js';
import { User } from '../auth/user.model.js';
import { hashPassword } from '../auth/password.js';
import { City } from '../super-admin/city.model.js';
import { ServiceProvider } from './serviceProvider.model.js';
import { ProviderOnboarding } from '../provider-onboarding/onboarding.model.js';
import { resolveRequestedCategories } from '../provider-onboarding/eligibility.service.js';
import { notifyJourney } from '../provider-onboarding/onboarding.service.js';
import { runInTransaction } from '../../utils/transaction.js';

// Public service provider application (the /service provider/apply screen). Deliberately not
// on serviceProviderRouter, which requires an authenticated service provider — an applicant
// has no account yet.
//
// The account is created immediately but lands in status 'Pending' with
// availability 'Offline'. Applicants can sign in to onboarding, but cannot work
// until interview, final approval and paid kit receipt are complete.
export const serviceProviderRegistrationRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(6),
  city: z.string().optional(),
  state: z.string().optional(),
  specs: z.string().optional(),
});

function parseSpecs(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // The form also allows a plain comma-separated list.
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

serviceProviderRegistrationRouter.post(
  '/',
  upload.fields([{ name: 'aadharFront', maxCount: 1 }, { name: 'aadharBack', maxCount: 1 }]),
  async (req, res, next) => {
    const pendingUploads = [];
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', parsed.error.issues);
      }
      const { name, phone, email, password, city, state, specs } = parsed.data;

      if (await User.findOne({ role: ROLES.SERVICE_PROVIDER, phone })) {
        throw new ApiError(409, 'An application already exists for this phone number');
      }

      let cityDoc = null;
      if (city) {
        // Match a canonical city so area ASM ownership is unambiguous.
        // Escape typed regex characters before the exact comparison.
        const escaped = city.trim().replace(/\s+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cityDoc = await City.findOne({
          name: new RegExp(`^${escaped}$`, 'i'),
          ...(state ? { state: new RegExp(`^${state.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : {}),
        });

      }

      if (!cityDoc || cityDoc.status !== 'Active') throw new ApiError(400, 'Choose an active service city');
      const requested = await resolveRequestedCategories(parseSpecs(specs));
      if (!req.files?.aadharFront?.[0] || !req.files?.aadharBack?.[0]) throw new ApiError(400, 'Upload both front and back of your Aadhaar document');
      const front = await storePrivateKyc(req.files.aadharFront[0]); pendingUploads.push(front);
      const back = await storePrivateKyc(req.files.aadharBack[0]); pendingUploads.push(back);

      const passwordHash = await hashPassword(password);
      let serviceProvider;
      try {
        serviceProvider = await runInTransaction(async session => {
          const [user] = await User.create([{ role: ROLES.SERVICE_PROVIDER, name, phone, email: email?.trim().toLowerCase() || undefined, passwordHash, status: 'Active' }], { session });
          const [provider] = await ServiceProvider.create([{
            user: user._id, name, phone, email, city: cityDoc._id,
            serviceCityName: cityDoc.name, serviceStateName: cityDoc.state || state || '',
            specs: [], approvedCategoryIds: [], onboardingPolicyVersion: 1,
            status: 'Pending', availability: 'Offline',
            verification: { aadharFrontUrl: front, aadharBackUrl: back },
          }], { session });
          await ProviderOnboarding.create([{ serviceProvider: provider._id, requestedCategories: requested.map(c => c._id), events: [{ action: 'application.submitted', actor: user._id, actorRole: 'service_provider', message: 'Application and Aadhaar documents submitted for ASM interview' }] }], { session });
          return provider;
        }, { required: true });
      } catch (err) {
        if (err?.code === 11000) throw new ApiError(409, 'An application already exists for this phone number or email');
        throw err;
      }
      pendingUploads.length = 0;
      await notifyJourney(serviceProvider, 'New provider application', `${name} applied in ${cityDoc.name}. ASM interview and final approval are required.`, { managers: true });

      created(res, {
        id: serviceProvider.id,
        humanId: serviceProvider.humanId,
        status: serviceProvider.status,
        message: 'Application received. Sign in to track your interview, approval and onboarding kit.',
      });
    } catch (err) {
      await Promise.allSettled(pendingUploads.map(removePrivateKyc));
      next(err);
    }
  },
);
