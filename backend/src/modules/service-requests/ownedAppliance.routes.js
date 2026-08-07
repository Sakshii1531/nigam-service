import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ok, created } from '../../utils/respond.js';
import * as applianceService from './ownedAppliance.service.js';

// The customer's registered appliances — the record the ExtendWarranty and
// WarrantyVerification screens read from. Before this existed those screens
// invented a purchase date and an expiry, so the warranty dates a customer saw
// were fiction; they now come from what the customer actually registered.
export const applianceRouter = Router();
applianceRouter.use(requireAuth);

const applianceBodySchema = z.object({
  category: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  invoiceFileUrl: z.string().optional(),
  dealer: z.string().optional(),
});

const listQuerySchema = z.object({ category: z.string().optional() });

// At least one identifier, or the lookup would match an arbitrary appliance.
const lookupQuerySchema = z
  .object({ modelNumber: z.string().optional(), serialNumber: z.string().optional() })
  .refine((q) => q.modelNumber || q.serialNumber, 'modelNumber or serialNumber is required');

const idParamSchema = z.object({ id: z.string().length(24) });

applianceRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    ok(res, await applianceService.listAppliances(req.user.id, req.query));
  } catch (err) {
    next(err);
  }
});

applianceRouter.get('/lookup', validate(lookupQuerySchema, 'query'), async (req, res, next) => {
  try {
    const appliance = await applianceService.findByIdentifiers(req.user.id, req.query);
    ok(res, { found: Boolean(appliance), appliance });
  } catch (err) {
    next(err);
  }
});

applianceRouter.post('/', validate(applianceBodySchema), async (req, res, next) => {
  try {
    created(res, await applianceService.registerAppliance(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

applianceRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await applianceService.getAppliance(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

applianceRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(applianceBodySchema.partial()),
  async (req, res, next) => {
    try {
      ok(res, await applianceService.updateAppliance(req.user.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

applianceRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    await applianceService.deleteAppliance(req.user.id, req.params.id);
    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});
