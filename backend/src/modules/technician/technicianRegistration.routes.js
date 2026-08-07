import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../middleware/errorHandler.js';
import { created } from '../../utils/respond.js';
import { upload, storeUploadedFile } from '../shared/fileUpload.js';
import { ROLES } from '../../config/constants.js';
import { User } from '../auth/user.model.js';
import { hashPassword } from '../auth/password.js';
import { City } from '../super-admin/city.model.js';
import { Technician } from './technician.model.js';

// Public technician application (the /technician/apply screen). Deliberately not
// on technicianRouter, which requires an authenticated technician — an applicant
// has no account yet.
//
// The account is created immediately but lands in status 'Pending' with
// availability 'Offline', so it cannot be assigned work and cannot pass login
// until a super-admin activates it from the console.
export const technicianRegistrationRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  password: z.string().min(6),
  city: z.string().optional(),
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

technicianRegistrationRouter.post(
  '/',
  upload.fields([{ name: 'aadharFront', maxCount: 1 }, { name: 'aadharBack', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, 'Validation failed', parsed.error.issues);
      }
      const { name, phone, email, password, city, specs } = parsed.data;

      if (await User.findOne({ role: ROLES.TECHNICIAN, phone })) {
        throw new ApiError(409, 'An application already exists for this phone number');
      }

      const cityDoc = city ? await City.findOne({ name: city }) : null;

      const [front, back] = await Promise.all([
        req.files?.aadharFront?.[0] ? storeUploadedFile(req.files.aadharFront[0]) : null,
        req.files?.aadharBack?.[0] ? storeUploadedFile(req.files.aadharBack[0]) : null,
      ]);

      const user = await User.create({
        role: ROLES.TECHNICIAN,
        name,
        phone,
        email,
        passwordHash: await hashPassword(password),
        status: 'Pending',
      });

      const technician = await Technician.create({
        user: user._id,
        name,
        phone,
        email,
        city: cityDoc ? cityDoc._id : null,
        specs: parseSpecs(specs),
        status: 'Pending',
        availability: 'Offline',
        verification: { aadharFrontUrl: front, aadharBackUrl: back },
      });

      created(res, {
        id: technician.id,
        humanId: technician.humanId,
        status: technician.status,
        message: 'Application received — you can sign in once it is approved.',
      });
    } catch (err) {
      next(err);
    }
  },
);
