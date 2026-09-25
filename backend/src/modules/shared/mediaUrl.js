import { z } from 'zod';

// Image fields hold a URL (Cloudinary, or /uploads/… in development) or a
// preset icon name — never the image itself. Clients upload through
// POST /api/v1/uploads first (docs/master-catalogue Phase 17); base64
// "data:" values used to be saved straight into documents and are refused.
export const mediaUrl = (max = 2048) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/^data:/i.test(v), { message: 'Upload the image first — embedded (base64) images are not accepted' });
