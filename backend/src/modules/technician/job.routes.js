import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachTechnician } from '../../middleware/technician.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import * as jobService from './job.service.js';
import {
  serviceRequestIdParamSchema,
  jobIdParamSchema,
  acceptJobSchema,
  submitDiagnosisSchema,
  submitSparePartsSchema,
  collectPaymentSchema,
} from './job.validation.js';

export const jobRouter = Router();
jobRouter.use(requireAuth, requireRole(ROLES.TECHNICIAN), attachTechnician);

// Static paths first — must be registered before '/:id' or Express would treat
// "available"/"active" as a job id.
jobRouter.get('/available', async (req, res, next) => {
  try {
    ok(res, await jobService.listAvailableJobs(req.technician.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.get('/active', async (req, res, next) => {
  try {
    ok(res, await jobService.listActiveJobs(req.technician.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post(
  '/accept/:serviceRequestId',
  validate(serviceRequestIdParamSchema, 'params'),
  validate(acceptJobSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.acceptJob(req.technician.id, req.params.serviceRequestId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.get('/:id', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.getJob(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/start-travel', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.startTravel(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/arrive', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.arrive(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post(
  '/:id/diagnosis',
  validate(jobIdParamSchema, 'params'),
  validate(submitDiagnosisSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.submitDiagnosis(req.technician.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.post(
  '/:id/spare-parts',
  validate(jobIdParamSchema, 'params'),
  validate(submitSparePartsSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.submitSpareParts(req.technician.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.post('/:id/repair-complete', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.confirmRepairComplete(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/billing', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.generateBilling(req.technician.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post(
  '/:id/collect-payment',
  validate(jobIdParamSchema, 'params'),
  validate(collectPaymentSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.collectPayment(req.technician.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);
