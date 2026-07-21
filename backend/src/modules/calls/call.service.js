/**
 * call.service.js — Twilio Click-to-Call relay service.
 *
 * Real phone numbers are fetched from the database and passed directly to Twilio.
 * They are NEVER returned to any API client — all REST responses use only masked
 * identifiers (e.g. "98••••••10") so neither party can see the other's real number.
 *
 * Flow:
 *   1. Caller (customer or technician) hits POST /api/v1/calls/initiate.
 *   2. We verify they are a participant of the service request.
 *   3. We fetch the real phone numbers of both parties from DB (server-side only).
 *   4. We call Twilio Voice API: "Ring the caller from our virtual number. When they
 *      answer, bridge to the other party's real number."
 *   5. Twilio dials caller → caller answers → Twilio bridges to callee.
 *   6. A CallLog is saved; Twilio POSTs the final status to /calls/status webhook.
 */

import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Technician } from '../technician/technician.model.js';
import { User } from '../auth/user.model.js';
import { CallLog } from './callLog.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { maskIdentifier } from '../auth/otpProvider.js';
import { ROLES } from '../../config/constants.js';

// ── Twilio client (lazy-initialised, same pattern as whatsapp.provider.js) ──────
let _twilioClient = null;
let _initKey = null;

async function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;

  const key = `${sid}:${token}`;
  if (_twilioClient && _initKey === key) return _twilioClient;

  try {
    const { default: Twilio } = await import('twilio');
    _twilioClient = Twilio(sid, token);
    _initKey = key;
    return _twilioClient;
  } catch (err) {
    console.error('[calls] Failed to initialise Twilio client:', err.message);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise to E.164 with Indian country code for bare 10-digit numbers. */
function toE164(phone) {
  if (!phone) return null;
  return phone.startsWith('+') ? phone : `+91${phone}`;
}

/** Return a masked phone string — what the REST layer is allowed to return. */
function masked(phone) {
  return phone ? maskIdentifier(phone) : null;
}

// ── Core service functions ────────────────────────────────────────────────────

/**
 * Initiate a click-to-call relay between customer and technician.
 *
 * @param {object} reqUser  — authenticated user from req.user (id + role)
 * @param {string} serviceRequestId
 * @returns {Promise<object>} — CallLog document (phone numbers masked)
 */
export async function initiateCall(reqUser, serviceRequestId) {
  // Read directly from process.env so Jest beforeEach overrides take effect
  // (env object is cached at import time, process.env is always live).
  const callMaskingEnabled = process.env.CALL_MASKING_ENABLED !== 'false';
  const voiceFrom = process.env.TWILIO_VOICE_NUMBER || '';

  // ── 1. Validate SR existence and participant membership first ─────────────
  // This must happen before any infra checks so 404/403 take priority over 503.
  const sr = await ServiceRequest.findById(serviceRequestId);
  if (!sr) throw new ApiError(404, 'Service request not found');

  const isCustomer = String(sr.user) === reqUser.id;
  let technicianDoc = null;
  if (!isCustomer) {
    technicianDoc = await Technician.findOne({ user: reqUser.id });
    const isTechnician = technicianDoc && String(sr.technician) === technicianDoc.id;
    if (!isTechnician) throw new ApiError(403, 'You are not a participant of this service request');
  }

  // ── 2. Check Twilio Voice config ──────────────────────────────────────────
  if (!callMaskingEnabled) {
    throw new ApiError(503, 'Call masking is currently disabled. Set CALL_MASKING_ENABLED=true to enable.');
  }

  if (!voiceFrom) {
    throw new ApiError(
      503,
      'Twilio Voice is not configured on this server. ' +
        'Set TWILIO_VOICE_NUMBER in .env to a purchased Twilio phone number with Voice capability.',
    );
  }

  // Resolve real phone numbers (server-side only — never returned to client).
  const customerUser = await User.findById(sr.user).select('+phone');
  if (!technicianDoc) technicianDoc = await Technician.findById(sr.technician);

  const customerPhone = toE164(customerUser?.phone);
  const technicianPhone = toE164(technicianDoc?.phone);

  if (!customerPhone) throw new ApiError(422, 'Customer phone number is not registered');
  if (!technicianPhone) throw new ApiError(422, 'Technician phone number is not registered');

  // Determine caller and callee.
  const callerPhone = isCustomer ? customerPhone : technicianPhone;
  const calleePhone = isCustomer ? technicianPhone : customerPhone;
  const initiatedBy = isCustomer ? 'customer' : 'technician';

  // Build TwiML: when the caller picks up, Twilio bridges to the other party.
  // <Dial> connects the two legs through our virtual Twilio number.
  const twiml = `<Response><Dial callerId="${voiceFrom}">${calleePhone}</Dial></Response>`;

  const client = await getTwilioClient();
  if (!client) throw new ApiError(503, 'Twilio is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.');

  let callSid = null;
  try {
    const call = await client.calls.create({
      from: voiceFrom,
      to: callerPhone,
      twiml,
    });
    callSid = call.sid;
  } catch (err) {
    console.error('[calls] Twilio Voice API error:', err.message);
    throw new ApiError(502, `Twilio Voice error: ${err.message}`);
  }

  // Persist the call log.
  const callLog = await CallLog.create({
    callSid,
    serviceRequest: sr._id,
    customer: sr.user,
    technician: sr.technician,
    initiatedBy,
    status: 'initiated',
    startedAt: new Date(),
  });

  return formatCallLog(callLog);
}

/**
 * Handle Twilio's status callback webhook (POST /api/v1/calls/status).
 * Updates the CallLog with final status and duration.
 *
 * @param {object} payload — Twilio webhook body (CallSid, CallStatus, CallDuration)
 */
export async function handleStatusCallback(payload) {
  const { CallSid, CallStatus, CallDuration } = payload;

  // Map Twilio's status string to our enum.
  const statusMap = {
    queued: 'initiated',
    ringing: 'ringing',
    'in-progress': 'in-progress',
    completed: 'completed',
    failed: 'failed',
    'no-answer': 'no-answer',
    busy: 'busy',
    canceled: 'canceled',
  };
  const mappedStatus = statusMap[CallStatus] || 'failed';

  const update = { status: mappedStatus };
  if (CallDuration !== undefined) update.duration = Number(CallDuration);
  if (['completed', 'failed', 'no-answer', 'busy', 'canceled'].includes(mappedStatus)) {
    update.endedAt = new Date();
  }

  await CallLog.findOneAndUpdate({ callSid: CallSid }, update);
}

/**
 * List call logs for a service request.
 * Verifies the requester is a participant.
 *
 * @param {object} reqUser
 * @param {string} serviceRequestId
 * @returns {Promise<object[]>}
 */
export async function getCallLogs(reqUser, serviceRequestId) {
  const sr = await ServiceRequest.findById(serviceRequestId);
  if (!sr) throw new ApiError(404, 'Service request not found');

  const isCustomer = reqUser.role === ROLES.CUSTOMER && String(sr.user) === reqUser.id;
  let isTechnician = false;
  if (reqUser.role === ROLES.TECHNICIAN) {
    const tech = await Technician.findOne({ user: reqUser.id });
    isTechnician = tech && String(sr.technician) === tech.id;
  }
  if (!isCustomer && !isTechnician) throw new ApiError(403, 'You are not a participant of this service request');

  const logs = await CallLog.find({ serviceRequest: sr._id }).sort({ createdAt: -1 });
  return logs.map(formatCallLog);
}

// ── Response formatter — strips real phone numbers ────────────────────────────

/**
 * Format a CallLog for API responses.
 * Phone numbers are NEVER included — only masked identifiers via populated refs.
 */
function formatCallLog(doc) {
  const obj = doc.toJSON ? doc.toJSON() : doc;
  // Deliberately omit customer/technician ObjectId refs from the response \u2014
  // callers only need the call metadata (status, duration, timing).
  return {
    id: obj.id || obj._id,
    serviceRequest: obj.serviceRequest,
    initiatedBy: obj.initiatedBy,
    status: obj.status,
    duration: obj.duration,
    startedAt: obj.startedAt,
    endedAt: obj.endedAt,
    createdAt: obj.createdAt,
  };
}
