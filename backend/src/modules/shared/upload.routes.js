import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
import { upload, storeUploadedFile } from './fileUpload.js';

// General authenticated file upload — returns the stored URL for the caller to
// save on whatever document it belongs to (a purchase invoice, a claim photo).
// The only upload surface before this was the NODE_ENV=test-only /_dev/upload,
// so customer-facing screens simulated a progress bar and stored nothing.
export const uploadRouter = Router();
uploadRouter.use(requireAuth);

uploadRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file provided (expected multipart field "file")');
    const url = await storeUploadedFile(req.file);
    ok(res, { url, name: req.file.originalname, size: req.file.size });
  } catch (err) {
    next(err);
  }
});
