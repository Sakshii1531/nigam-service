import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireBrandScope } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import { sendOperationsCsv } from './operationsExport.js';
import * as replacementApprovalService from './replacementApproval.service.js';
import { createReplacementApprovalSchema, updateStatusSchema, listQuerySchema, idParamSchema } from './replacementApproval.validation.js';

export const replacementApprovalRouter = Router();
replacementApprovalRouter.use(requireAuth, requireBrandScope);

replacementApprovalRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, meta } = await replacementApprovalService.listReplacementApprovals(req.user.brand, req.query);
    if (req.query.format) return await sendOperationsCsv(req, res, 'replacements', [
      ['Request ID', 'Job ID', 'Customer', 'Product', 'Model', 'Service Provider', 'Reason', 'Status'],
      ...items.map(r => [r.humanId, r.serviceRequest?.humanId, r.serviceRequest?.user?.name, r.product, r.model, r.serviceProvider?.name, r.reason, r.status]),
    ]);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

replacementApprovalRouter.post('/', validate(createReplacementApprovalSchema), async (req, res, next) => {
  try {
    created(res, await replacementApprovalService.createReplacementApproval(req.user.brand, req.body));
  } catch (err) {
    next(err);
  }
});

replacementApprovalRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await replacementApprovalService.getReplacementApproval(req.user.brand, req.params.id));
  } catch (err) {
    next(err);
  }
});

replacementApprovalRouter.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateStatusSchema), async (req, res, next) => {
  try {
    ok(res, await replacementApprovalService.updateReplacementApprovalStatus(req.user.brand, req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
});
