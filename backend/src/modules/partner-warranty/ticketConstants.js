// Vocabulary of the Brand CRM ticket (docs/brand-crm/ARCHITECTURE.md §2).
// The ticket is the partner-warranty WarrantyClaim, extended so every complaint
// source — NCC App, toll-free CCE, brand manual entry, WhatsApp, brand CRM API —
// creates the same document through ticketIntake.createTicket.

export const TICKET_SOURCE = Object.freeze({
  NCC_APP: 'ncc_app',
  TOLL_FREE: 'toll_free',
  BRAND_MANUAL: 'brand_manual',
  WHATSAPP: 'whatsapp',
  API: 'api',
});
export const TICKET_SOURCES = Object.freeze(Object.values(TICKET_SOURCE));

/** Sources where a brand user registers the ticket (registeredBy is that user). */
export const STAFF_SOURCES = Object.freeze([TICKET_SOURCE.TOLL_FREE, TICKET_SOURCE.BRAND_MANUAL]);

export const TICKET_PRIORITIES = Object.freeze(['Low', 'Normal', 'High', 'Critical']);

export const SERVICE_TYPES = Object.freeze(['repair', 'installation', 'demo', 'preventive_maintenance', 'inspection']);

export const WARRANTY_STATUS = Object.freeze({
  IN: 'In Warranty',
  VERIFY: 'Verification Required',
  OUT: 'Out of Warranty',
});
export const WARRANTY_STATUSES = Object.freeze(Object.values(WARRANTY_STATUS));

export const COVERAGE_DECISIONS = Object.freeze(['warranty', 'goodwill']);

export const REJECTION_CODES = Object.freeze([
  'OUT_OF_WARRANTY',
  'PHYSICAL_DAMAGE',
  'NOT_COVERED',
  'DUPLICATE',
  'INVALID_DOCUMENTS',
  'CUSTOMER_UNREACHABLE',
  'OTHER',
]);

// The detailed NCC job stage shown to the brand and Super Admin (§4). Kept
// apart from the claim status, which drives the customer's tracker.
export const JOB_STAGES = Object.freeze([
  'PARTNER_FINDING',
  'JOB_OFFERED',
  'ALLOCATION_FAILED',
  'PARTNER_ASSIGNED',
  'VISIT_SCHEDULED',
  'EN_ROUTE',
  'REACHED',
  'DIAGNOSIS',
  'PARTS_REQUIRED',
  'REPAIR',
  'COMPLETED',
  'CUSTOMER_CONFIRMATION',
  'CLOSED',
  'CANCELLED',
]);

export const VISIT_SLOTS = Object.freeze(['morning', 'afternoon', 'evening']);

export const DOCUMENT_KINDS = Object.freeze(['invoice', 'warranty_card', 'product_photo', 'additional', 'video', 'service_report', 'other']);

/** At most this many videos on one ticket (README D17). */
export const MAX_TICKET_VIDEOS = 2;
