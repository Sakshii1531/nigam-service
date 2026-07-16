import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as generatedDocumentService from './generatedDocument.service.js';
import { generateDocumentSchema, listQuerySchema, idParamSchema } from './generatedDocument.validation.js';

export const generatedDocumentRouter = Router();
generatedDocumentRouter.use(requireAuth, requireBrandScope);

generatedDocumentRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await generatedDocumentService.listDocuments(req.user.brand, req.query);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

generatedDocumentRouter.post('/', validate(generateDocumentSchema), async (req, res, next) => {
  try {
    created(res, await generatedDocumentService.generateDocument(req.user.brand, req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

generatedDocumentRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await generatedDocumentService.getDocument(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});
