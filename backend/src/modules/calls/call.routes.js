import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ok } from '../../utils/respond.js';
import { ROLES } from '../../config/constants.js';
import { initiateCallSchema, twilioStatusCallbackSchema } from './call.validation.js';
import * as callService from './call.service.js';

export const callRouter = Router();

/**
 * POST /api/v1/calls/initiate
 *
 * Triggers a Twilio click-to-call relay between the authenticated user and
 * their counterpart on the given service request. Neither party's real phone
 * number is returned — both legs ring via the platform's virtual Twilio number.
 *
 * Auth: customer or technician only.
 */
callRouter.post(
  '/initiate',
  requireAuth,
  requireRole(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  validate(initiateCallSchema),
  async (req, res, next) => {
    try {
      const callLog = await callService.initiateCall(req.user, req.body.serviceRequestId);
      ok(res, callLog, undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/calls/status
 *
 * Twilio status callback webhook — called by Twilio's servers when call state
 * changes (ringing, answered, completed, failed, etc.). Public endpoint; Twilio
 * does not send an auth header, so we rely on Twilio's IP allowlisting in prod.
 * In test/dev the endpoint is still reachable for integration testing.
 */
callRouter.post('/status', validate(twilioStatusCallbackSchema), async (req, res, next) => {
  try {
    await callService.handleStatusCallback(req.body);
    // Twilio expects a 200 with an empty TwiML body or plain 200 to acknowledge.
    res.status(200).send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/calls/:serviceRequestId
 *
 * Returns call history for a service request. Verifies the requester is a
 * participant (customer or technician of that SR). Real phone numbers are never
 * included in the response.
 *
 * Auth: customer or technician only.
 */
callRouter.get(
  '/:serviceRequestId',
  requireAuth,
  requireRole(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  async (req, res, next) => {
    try {
      const logs = await callService.getCallLogs(req.user, req.params.serviceRequestId);
      ok(res, logs);
    } catch (err) {
      next(err);
    }
  },
);
