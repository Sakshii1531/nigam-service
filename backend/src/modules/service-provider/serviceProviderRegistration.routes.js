import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../middleware/errorHandler.js';
import { created } from '../../utils/respond.js';
import { upload, storeUploadedFile } from '../shared/fileUpload.js';
import { ROLES } from '../../config/constants.js';
import { User } from '../auth/user.model.js';
import { hashPassword } from '../auth/password.js';
import { City } from '../super-admin/city.model.js';
import { ServiceProvider } from './serviceProvider.model.js';

// Public service provider application (the /service provider/apply screen). Deliberately not
// on serviceProviderRouter, which requires an authenticated service provider — an applicant
// has no account yet.
//
// The account is created immediately but lands in status 'Pending' with
// availability 'Offline', so it cannot be assigned work and cannot pass login
// until a super-admin activates it from the console.
export const serviceProviderRegistrationRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
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
        cityDoc = await City.findOne({
          name: new RegExp(`^${city.trim()}$`, 'i'),
          ...(state ? { state: new RegExp(`^${state.trim()}$`, 'i') } : {}),
        });
        if (!cityDoc) {
          cityDoc = await City.findOne({ name: new RegExp(`^${city.trim()}$`, 'i') });
        }
      }

      const [front, back] = await Promise.all([
        req.files?.aadharFront?.[0] ? storeUploadedFile(req.files.aadharFront[0]) : null,
        req.files?.aadharBack?.[0] ? storeUploadedFile(req.files.aadharBack[0]) : null,
      ]);

      const user = await User.create({
        role: ROLES.SERVICE_PROVIDER,
        name,
        phone,
        email,
        passwordHash: await hashPassword(password),
        status: 'Pending',
      });

      const serviceProvider = await ServiceProvider.create({
        user: user._id,
        name,
        phone,
        email,
        city: cityDoc ? cityDoc._id : null,
        serviceCityName: city ? city.trim() : '',
        serviceStateName: state ? state.trim() : (cityDoc?.state || ''),
        specs: parseSpecs(specs),
        status: 'Pending',
        availability: 'Offline',
        verification: { aadharFrontUrl: front, aadharBackUrl: back },
      });

      created(res, {
        id: serviceProvider.id,
        humanId: serviceProvider.humanId,
        status: serviceProvider.status,
        message: 'Application received — you can sign in once it is approved.',
      });
    } catch (err) {
      next(err);
    }
  },
);
