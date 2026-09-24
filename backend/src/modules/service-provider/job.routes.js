import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { attachServiceProvider } from '../../middleware/serviceProvider.js';
import { ok } from '../../utils/respond.js';
import * as serviceRequestService from '../service-requests/serviceRequest.service.js';
import { ROLES } from '../../config/constants.js';
import * as jobService from './job.service.js';
import {
  serviceRequestIdParamSchema,
  jobIdParamSchema,
  acceptJobSchema,
  submitDiagnosisSchema,
  submitSparePartsSchema,
  requestPartSchema,
  collectPaymentSchema,
  verifyJobPaymentSchema,
  addOnOfferingsQuerySchema,
  addJobAddOnSchema,
  jobAddOnParamSchema,
} from './job.validation.js';

export const jobRouter = Router();
jobRouter.use(requireAuth, requireRole(ROLES.SERVICE_PROVIDER), attachServiceProvider);

// Static paths first — must be registered before '/:id' or Express would treat
// "available"/"active" as a job id.
jobRouter.get('/available', async (req, res, next) => {
  try {
    ok(res, await jobService.listAvailableJobs(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.get('/active', async (req, res, next) => {
  try {
    ok(res, await jobService.listActiveJobs(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.get('/summary', async (req, res, next) => {
  try {
    ok(res, await jobService.getJobSummary(req.serviceProvider.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.get('/history', async (req, res, next) => {
  try {
    ok(res, await jobService.listJobHistory(req.serviceProvider.id, req.query));
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
      ok(res, await jobService.acceptJob(req.serviceProvider.id, req.params.serviceRequestId, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// Rejecting is the counterpart to accept: it releases the request rather than
// hiding it locally, which is all the app could do before. Keyed by service
// request id for the same reason accept is — there is no Job yet.
jobRouter.post(
  '/reject/:serviceRequestId',
  validate(serviceRequestIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await serviceRequestService.declineAssignment(req.params.serviceRequestId, req.serviceProvider.id));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.get('/:id', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.getJob(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

// The appliance's real warranty/install date, this category's real add-on
// services and spare-part catalog, and this appliance's real repair history —
// everything the job-details screen's Overview/Parts/History tabs need that
// used to be hardcoded mock content in the frontend.
jobRouter.get('/:id/context', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.getJobDetailContext(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/start-travel', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.startTravel(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/arrive', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.arrive(req.serviceProvider.id, req.params.id));
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
      ok(res, await jobService.submitDiagnosis(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// ─── On-site extra work from the Master Catalogue (docs/master-catalogue Phase 5)
jobRouter.get(
  '/:id/addon-offerings',
  validate(jobIdParamSchema, 'params'),
  validate(addOnOfferingsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await jobService.listAddOnOfferings(req.serviceProvider.id, req.params.id, req.query));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.post(
  '/:id/addons',
  validate(jobIdParamSchema, 'params'),
  validate(addJobAddOnSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.addJobAddOn(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.delete('/:id/addons/:addOnId', validate(jobAddOnParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.removeJobAddOn(req.serviceProvider.id, req.params.id, req.params.addOnId));
  } catch (err) {
    next(err);
  }
});

jobRouter.post(
  '/:id/spare-parts',
  validate(jobIdParamSchema, 'params'),
  validate(submitSparePartsSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.submitSpareParts(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.post(
  '/:id/request-part',
  validate(jobIdParamSchema, 'params'),
  validate(requestPartSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.requestSparePart(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.post('/:id/repair-complete', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.confirmRepairComplete(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/billing', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.generateBilling(req.serviceProvider.id, req.params.id));
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
      ok(res, await jobService.collectPayment(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// Called after Razorpay's Checkout.js reports success (see job.service.js's
// collectPayment doc comment for when this step is actually needed vs Cash
// completing synchronously).
jobRouter.post(
  '/:id/verify-payment',
  validate(jobIdParamSchema, 'params'),
  validate(verifyJobPaymentSchema),
  async (req, res, next) => {
    try {
      ok(res, await jobService.verifyJobPayment(req.serviceProvider.id, req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

jobRouter.get('/:id/amc-history', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.getJobAmcHistory(req.serviceProvider.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

jobRouter.post('/:id/respond-reschedule', validate(jobIdParamSchema, 'params'), async (req, res, next) => {
  try {
    ok(res, await jobService.respondToReschedule(req.serviceProvider.id, req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});
