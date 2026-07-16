import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { upload, storeUploadedFile } from './fileUpload.js';
import { generateHumanId } from './idGenerator.js';
import { ID_PREFIXES } from '../../config/constants.js';

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
