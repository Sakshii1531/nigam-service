import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { Technician } from '../technician/technician.model.js';
import * as serviceRequestService from './serviceRequest.service.js';
import { transitionSchema, listServiceRequestsQuerySchema, idParamSchema } from './serviceRequest.validation.js';

export const serviceRequestRouter = Router();
serviceRequestRouter.use(requireAuth);

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.BRAND_ADMIN];

async function requestingTechnicianId(reqUser) {
  if (reqUser.role !== ROLES.TECHNICIAN) return null;
  const technician = await Technician.findOne({ user: reqUser.id });
  return technician ? technician.id : null;
}

function canView(serviceRequest, reqUser, technicianId) {
  if (ADMIN_ROLES.includes(reqUser.role)) return true;
  if (reqUser.role === ROLES.CUSTOMER) return String(serviceRequest.user) === reqUser.id;
  if (reqUser.role === ROLES.TECHNICIAN) return technicianId && String(serviceRequest.technician) === technicianId;
  return false;
}

serviceRequestRouter.get('/', validate(listServiceRequestsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === ROLES.CUSTOMER) filters.user = req.user.id;
    else if (req.user.role === ROLES.TECHNICIAN) filters.technician = await requestingTechnicianId(req.user);
    // admin roles: no forced filter, can see everything (brand-scoping lands in Phase 7).

    const { items, meta } = await serviceRequestService.listServiceRequests(filters);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

serviceRequestRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const serviceRequest = await serviceRequestService.getServiceRequest(req.params.id);
    const technicianId = await requestingTechnicianId(req.user);
    if (!canView(serviceRequest, req.user, technicianId)) throw new ApiError(403, 'Not authorized to view this request');
    ok(res, serviceRequest);
  } catch (err) {
    next(err);
  }
});

serviceRequestRouter.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(transitionSchema),
  async (req, res, next) => {
    try {
      const existing = await serviceRequestService.getServiceRequest(req.params.id);
      const technicianId = await requestingTechnicianId(req.user);
      const canTransition =
        ADMIN_ROLES.includes(req.user.role) || (technicianId && String(existing.technician) === technicianId);
      if (!canTransition) throw new ApiError(403, 'Not authorized to update this request');

      const updated = await serviceRequestService.transitionStatus(req.params.id, req.body.status, {
        description: req.body.description,
      });
      ok(res, updated);
    } catch (err) {
      next(err);
    }
  },
);
