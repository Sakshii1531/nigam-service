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

async function requestingTechnicianId(reqUser) {
  if (reqUser.role !== ROLES.TECHNICIAN) return null;
  const technician = await Technician.findOne({ user: reqUser.id });
  return technician ? technician.id : null;
}

function isBrandMatch(serviceRequest, reqUser) {
  return Boolean(reqUser.brand) && serviceRequest.brand && String(serviceRequest.brand) === reqUser.brand;
}

/** brand_admin is scoped to their own req.user.brand — a request with no brand
 * (or a different brand) set is invisible to them, same as another customer's
 * request is invisible to a customer. super_admin is the only role with no
 * forced filter. Customers and technicians can both *view* their own request,
 * but (see canTransition below) only the technician may change its status. */
function canView(serviceRequest, reqUser, technicianId) {
  if (reqUser.role === ROLES.SUPER_ADMIN) return true;
  if (reqUser.role === ROLES.BRAND_ADMIN) return isBrandMatch(serviceRequest, reqUser);
  if (reqUser.role === ROLES.CUSTOMER) return String(serviceRequest.user) === reqUser.id;
  if (reqUser.role === ROLES.TECHNICIAN) return technicianId && String(serviceRequest.technician) === technicianId;
  return false;
}

/** Deliberately narrower than canView: a customer can see their own request but
 * never drive its status — only the assigned technician or an admin can. */
function canTransition(serviceRequest, reqUser, technicianId) {
  if (reqUser.role === ROLES.SUPER_ADMIN) return true;
  if (reqUser.role === ROLES.BRAND_ADMIN) return isBrandMatch(serviceRequest, reqUser);
  if (reqUser.role === ROLES.TECHNICIAN) return technicianId && String(serviceRequest.technician) === technicianId;
  return false;
}

serviceRequestRouter.get('/', validate(listServiceRequestsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === ROLES.CUSTOMER) filters.user = req.user.id;
    else if (req.user.role === ROLES.TECHNICIAN) filters.technician = await requestingTechnicianId(req.user);
    else if (req.user.role === ROLES.BRAND_ADMIN) filters.brand = req.user.brand;
    // super_admin: no forced filter, can see everything.

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
      if (!canTransition(existing, req.user, technicianId)) throw new ApiError(403, 'Not authorized to update this request');

      const updated = await serviceRequestService.transitionStatus(req.params.id, req.body.status, {
        description: req.body.description,
      });
      ok(res, updated);
    } catch (err) {
      next(err);
    }
  },
);
