import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok, created } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { User } from '../auth/user.model.js';
import { getAsmByUserId } from '../super-admin/asm.service.js';
import * as serviceRequestService from './serviceRequest.service.js';
import {
  transitionSchema,
  listServiceRequestsQuerySchema,
  idParamSchema,
  createServiceRequestSchema,
  assignSchema,
} from './serviceRequest.validation.js';

export const serviceRequestRouter = Router();
serviceRequestRouter.use(requireAuth);

async function requestingServiceProviderId(reqUser) {
  if (reqUser.role !== ROLES.SERVICE_PROVIDER) return null;
  const serviceProvider = await ServiceProvider.findOne({ user: reqUser.id });
  return serviceProvider ? serviceProvider.id : null;
}

/** An ASM's own zone name (their City doc's name), resolved from their
 * profile — never client-supplied, since this is what canView/canTransition
 * and the list filter use as the actual security boundary. null for a
 * caller with no ASM profile or no city assigned yet (sees nothing, not
 * everything — see zoneMatches below). */
async function resolveAsmZone(reqUser) {
  if (reqUser.role !== ROLES.ASM) return null;
  try {
    const asm = await getAsmByUserId(reqUser.id);
    return asm.city?.name || null;
  } catch {
    return null;
  }
}

/** Same loose case-insensitive match assignmentEngine.js's territory
 * restriction uses — zone is free text (ServiceRequest.zone: String, not a
 * City ref), so an exact string match would miss legitimate casing/spacing
 * variance between how it got typed in at booking time and the City doc's
 * canonical name. */
function zoneMatches(requestZone, asmZone) {
  if (!requestZone || !asmZone) return false;
  const a = requestZone.trim().toLowerCase();
  const b = asmZone.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function isBrandMatch(serviceRequest, reqUser) {
  return Boolean(reqUser.brand) && serviceRequest.brand && String(serviceRequest.brand) === reqUser.brand;
}

/** brand_admin is scoped to their own req.user.brand — a request with no brand
 * (or a different brand) set is invisible to them, same as another customer's
 * request is invisible to a customer. super_admin is the only role with no
 * forced filter. Customers and service providers can both *view* their own request,
 * but (see canTransition below) only the service provider may change its status.
 * An ASM can view (not drive the status of — that's the assigned service
 * provider's job) whatever falls in their own zone. */
function canView(serviceRequest, reqUser, serviceProviderId, asmZone) {
  if (reqUser.role === ROLES.SUPER_ADMIN) return true;
  if (reqUser.role === ROLES.BRAND_ADMIN) return isBrandMatch(serviceRequest, reqUser);
  if (reqUser.role === ROLES.CUSTOMER) return String(serviceRequest.user) === reqUser.id;
  if (reqUser.role === ROLES.SERVICE_PROVIDER) return serviceProviderId && String(serviceRequest.serviceProvider) === serviceProviderId;
  if (reqUser.role === ROLES.ASM) return zoneMatches(serviceRequest.zone, asmZone);
  return false;
}

/** Deliberately narrower than canView: a customer can see their own request but
 * never drive its status — only the assigned service provider or an admin can. */
function canTransition(serviceRequest, reqUser, serviceProviderId) {
  if (reqUser.role === ROLES.SUPER_ADMIN) return true;
  if (reqUser.role === ROLES.BRAND_ADMIN) return isBrandMatch(serviceRequest, reqUser);
  if (reqUser.role === ROLES.SERVICE_PROVIDER) return serviceProviderId && String(serviceRequest.serviceProvider) === serviceProviderId;
  return false;
}

serviceRequestRouter.get('/', validate(listServiceRequestsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === ROLES.CUSTOMER) filters.user = req.user.id;
    else if (req.user.role === ROLES.SERVICE_PROVIDER) filters.serviceProvider = await requestingServiceProviderId(req.user);
    else if (req.user.role === ROLES.BRAND_ADMIN) filters.brand = req.user.brand;
    else if (req.user.role === ROLES.ASM) filters.zone = (await resolveAsmZone(req.user)) || '__no-zone-assigned__';
    // super_admin: no forced filter, can see everything.

    const { items, meta } = await serviceRequestService.listServiceRequests(filters);
    ok(res, items, meta);
  } catch (err) {
    next(err);
  }
});

/**
 * Log a complaint on a customer's behalf (brand-admin's RegisterComplaint).
 *
 * Restricted to brand_admin, and `brand` is taken from the caller's own token
 * rather than the request body — otherwise one brand could file requests
 * against another and they'd show up on that brand's console. The named
 * customer must exist; the agent is not the subject of the request.
 */
serviceRequestRouter.post(
  '/',
  requireRole(ROLES.BRAND_ADMIN),
  validate(createServiceRequestSchema),
  async (req, res, next) => {
    try {
      if (!req.user.brand) throw new ApiError(403, 'Account is not linked to a brand');
      const customer = await User.findById(req.body.user).select('_id role');
      if (!customer) throw new ApiError(404, 'Customer not found');
      if (customer.role !== ROLES.CUSTOMER) throw new ApiError(400, 'Service requests can only be raised for a customer account');

      created(res, await serviceRequestService.createServiceRequest({ ...req.body, brand: req.user.brand }));
    } catch (err) {
      next(err);
    }
  },
);

serviceRequestRouter.get('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const serviceRequest = await serviceRequestService.getServiceRequest(req.params.id);
    const serviceProviderId = await requestingServiceProviderId(req.user);
    const asmZone = await resolveAsmZone(req.user);
    if (!canView(serviceRequest, req.user, serviceProviderId, asmZone)) throw new ApiError(403, 'Not authorized to view this request');
    ok(res, await serviceRequestService.getServiceRequestDetail(req.params.id));
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
      const serviceProviderId = await requestingServiceProviderId(req.user);
      if (!canTransition(existing, req.user, serviceProviderId)) throw new ApiError(403, 'Not authorized to update this request');

      const updated = await serviceRequestService.transitionStatus(req.params.id, req.body.status, {
        description: req.body.description,
      });
      ok(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

/** An ASM's Job Assignment console is scoped to their own zone the same way
 * their view of the list/detail is — reusing that same 404-not-403 pattern
 * (adminServiceProvider.service.js's findOr404) so probing an id outside
 * their zone can't distinguish "not mine" from "doesn't exist". No-op for
 * every other role, which is already gated by requireRole above it. */
async function assertAsmOwnsRequest(req) {
  if (req.user.role !== ROLES.ASM) return;
  const serviceRequest = await serviceRequestService.getServiceRequest(req.params.id);
  const asmZone = await resolveAsmZone(req.user);
  if (!zoneMatches(serviceRequest.zone, asmZone)) throw new ApiError(404, 'Service request not found');
}

serviceRequestRouter.get(
  '/:id/service-provider-suggestions',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ASM),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await assertAsmOwnsRequest(req);
      ok(res, await serviceRequestService.suggestServiceProviders(req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

serviceRequestRouter.patch(
  '/:id/assign',
  requireRole(ROLES.SUPER_ADMIN, ROLES.ASM),
  validate(idParamSchema, 'params'),
  validate(assignSchema),
  async (req, res, next) => {
    try {
      await assertAsmOwnsRequest(req);
      ok(res, await serviceRequestService.assignServiceProvider(req.params.id, req.body.serviceProvider));
    } catch (err) {
      next(err);
    }
  },
);
