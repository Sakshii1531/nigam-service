// Central place for cross-module enums/constants so modules don't duplicate magic strings.
// See BACKEND_CONTEXT.md for the full domain reasoning behind each of these.

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  TECHNICIAN: 'technician',
  BRAND_ADMIN: 'brand_admin',
  SUPER_ADMIN: 'super_admin',
});

// Human-readable ID prefixes the frontend already assumes — preserve these exactly
// so the existing UI needs no changes once wired to real data (BACKEND_CONTEXT.md §7.2).
export const ID_PREFIXES = Object.freeze({
  BOOKING: 'NCC', // NCC-YYMMDD-####
  WARRANTY_TICKET: 'NCCW', // NCCW-2024-######
  EXTENDED_WARRANTY: 'NCCEW', // NCCEW######
  AMC: 'NCCAMC', // NCCAMC####
  ORDER: 'NCCO', // NCCO######
  SERVICE_REQUEST: 'SR', // SR-####
  INVOICE: 'INV', // INV-YYYY-###
  CLAIM: 'NC', // NC#####
  AMC_RECORD: 'AMC', // AMC-####
  EXCHANGE: 'EX', // EX-####
  REPLACEMENT: 'RPL', // RPL-###
  RETURN: 'RET', // RET-####
  PART_REQUEST: 'PR', // PR-####
  SKU: 'SKU', // SKU-####
  REVIEW: 'REV', // REV-###
  DOCUMENT: 'DOC', // DOC-###
  GUIDE: 'GD', // GD-###
  COURSE: 'CRS', // CRS-###
  TECHNICIAN: 'TECH', // TECH-###
  CUSTOMER: 'CUST', // CUST-###
  VERIFICATION: 'VR', // VR-####
  JOB: 'JOB', // JOB-xxx
});

export const SERVICE_REQUEST_STATUS = Object.freeze([
  'New',
  'Assigned',
  'Engineer Accepted',
  'Visit Scheduled',
  'Engineer Reached',
  'Diagnosis Done',
  'Spare Required',
  'Spare Ordered',
  'Spare Received',
  'Repair Completed',
  'Customer Confirmation',
  'Closed',
  'Customer NA',
  'Reschedule',
  'Cancelled',
]);

// Technician job state machine (BACKEND_CONTEXT.md §4.3), mirrors ActiveJob.jsx.
// 'awaitingpayment' added post-Phase-15 for the real Razorpay Checkout flow —
// billing -> completed directly still exists for Cash / already-covered ($0)
// jobs, which never touch a gateway at all (see job.service.js's collectPayment).
export const JOB_STEPS = Object.freeze([
  'idle',
  'details',
  'assigned',
  'ontheway',
  'inspection',
  'spareapproval',
  'repaircomplete',
  'billing',
  'awaitingpayment',
  'completed',
]);

export const JOB_REVISIT_STEPS = Object.freeze([
  'revisit_complete',
  'spare_part_required',
  'completed_pending',
  'cancellation_summary',
  'unable_to_fix_summary',
  'revisit_billing',
  'revisit_payment',
  'revisit_otp',
]);

// Format spec per human-readable ID prefix, keyed by the prefix STRING itself (not the
// ID_PREFIXES constant name) so idGenerator can look one up from just the prefix a model
// was configured with. `digits` = zero-padded sequence length; `dateSegment` = null (no
// reset) | 'YYYY' (resets yearly) | 'YYMMDD' (resets daily) — matches the exact formats
// the frontend already assumes (BACKEND_CONTEXT.md §7.2).
export const ID_SCHEMES = Object.freeze({
  [ID_PREFIXES.BOOKING]: { digits: 4, dateSegment: 'YYMMDD', separator: '-' },
  [ID_PREFIXES.WARRANTY_TICKET]: { digits: 6, dateSegment: 'YYYY', separator: '-' },
  [ID_PREFIXES.EXTENDED_WARRANTY]: { digits: 6, dateSegment: null, separator: '' },
  [ID_PREFIXES.AMC]: { digits: 4, dateSegment: null, separator: '' },
  [ID_PREFIXES.ORDER]: { digits: 6, dateSegment: null, separator: '' },
  [ID_PREFIXES.SERVICE_REQUEST]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.INVOICE]: { digits: 3, dateSegment: 'YYYY', separator: '-' },
  [ID_PREFIXES.CLAIM]: { digits: 5, dateSegment: null, separator: '' },
  [ID_PREFIXES.AMC_RECORD]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.EXCHANGE]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.REPLACEMENT]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.RETURN]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.PART_REQUEST]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.SKU]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.REVIEW]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.DOCUMENT]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.GUIDE]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.COURSE]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.TECHNICIAN]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.CUSTOMER]: { digits: 3, dateSegment: null, separator: '-' },
  [ID_PREFIXES.VERIFICATION]: { digits: 4, dateSegment: null, separator: '-' },
  [ID_PREFIXES.JOB]: { digits: 4, dateSegment: null, separator: '-' },
});

// Allowed next-statuses per current ServiceRequest.status — server-side transition
// validation (Phase 4 exit criterion), not the client-trusted enum the frontend
// mock UI uses. Terminal states (Closed, Cancelled) have no outgoing edges.
export const SERVICE_REQUEST_TRANSITIONS = Object.freeze({
  New: ['Assigned', 'Cancelled'],
  Assigned: ['Engineer Accepted', 'Customer NA', 'Cancelled'],
  'Engineer Accepted': ['Visit Scheduled', 'Cancelled'],
  'Visit Scheduled': ['Engineer Reached', 'Reschedule', 'Customer NA', 'Cancelled'],
  'Engineer Reached': ['Diagnosis Done', 'Customer NA'],
  'Diagnosis Done': ['Spare Required', 'Repair Completed'],
  'Spare Required': ['Spare Ordered'],
  'Spare Ordered': ['Spare Received'],
  'Spare Received': ['Repair Completed'],
  'Repair Completed': ['Customer Confirmation'],
  'Customer Confirmation': ['Closed'],
  'Customer NA': ['Visit Scheduled', 'Reschedule', 'Cancelled'],
  Reschedule: ['Visit Scheduled', 'Cancelled'],
  Cancelled: [],
  Closed: [],
});

// Allowed next-steps per current Job.activeStep — same server-side-validation
// reasoning as SERVICE_REQUEST_TRANSITIONS. Linear happy path only; the
// JOB_REVISIT_STEPS sub-flow (re-visit scheduling after an incomplete repair)
// is deliberately out of scope for Phase 6 (see DATA_MODEL.md Phase 6 addendum)
// — those steps stay in the Job.activeStep enum but have no transitions here yet.
export const JOB_STEP_TRANSITIONS = Object.freeze({
  idle: ['details', 'assigned'],
  details: ['assigned'],
  assigned: ['ontheway'],
  ontheway: ['inspection'],
  inspection: ['spareapproval'],
  spareapproval: ['repaircomplete'],
  repaircomplete: ['billing'],
  billing: ['completed', 'awaitingpayment'],
  awaitingpayment: ['completed'],
  completed: [],
});

export const GST_PERCENT_DEFAULT = 18; // Confirmed flat rate everywhere (user decision) — the frontend's 10% sighting (§9) was mock-data inconsistency, not a second real rate.

export const PAGINATION_DEFAULT = Object.freeze({ page: 1, limit: 20, maxLimit: 100 });
