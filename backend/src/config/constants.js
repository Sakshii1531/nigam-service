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
export const JOB_STEPS = Object.freeze([
  'idle',
  'details',
  'assigned',
  'ontheway',
  'inspection',
  'spareapproval',
  'repaircomplete',
  'billing',
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

export const GST_PERCENT_DEFAULT = 18; // Confirm per-product-line rate before go-live (§9 open question).

export const PAGINATION_DEFAULT = Object.freeze({ page: 1, limit: 20, maxLimit: 100 });
