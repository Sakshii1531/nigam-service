// Partner warranty claim lifecycle (docs/partner-warranty/ARCHITECTURE.md §3).
// Every status change goes through claimTimeline.appendEvent, which checks it
// against CLAIM_TRANSITIONS — the frontend never decides what move is legal.

export const CLAIM_STATUS = Object.freeze({
  SUBMITTED: 'Submitted',
  BRAND_REVIEW: 'Brand Review',
  INFO_REQUESTED: 'Info Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  JOB_CREATED: 'Job Created',
  PARTNER_ASSIGNED: 'Partner Assigned',
  VISIT_SCHEDULED: 'Visit Scheduled',
  TECHNICIAN_ON_WAY: 'Technician On Way',
  SERVICE_IN_PROGRESS: 'Service In Progress',
  SERVICE_COMPLETED: 'Service Completed',
  CLOSED: 'Closed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
});

const S = CLAIM_STATUS;

export const CLAIM_STATUSES = Object.freeze(Object.values(CLAIM_STATUS));

/** Service stages in the order they happen — the sync from the Service Job
 * only ever moves a claim forward along this list. */
export const SERVICE_STAGES = Object.freeze([
  S.JOB_CREATED,
  S.PARTNER_ASSIGNED,
  S.VISIT_SCHEDULED,
  S.TECHNICIAN_ON_WAY,
  S.SERVICE_IN_PROGRESS,
  S.SERVICE_COMPLETED,
  S.CLOSED,
]);

export const TERMINAL_STATUSES = Object.freeze([S.CLOSED, S.CANCELLED, S.REJECTED]);

// Hold and Cancel are allowed from every non-terminal status, so they are added
// below rather than repeated on every row.
const BASE_TRANSITIONS = {
  [S.SUBMITTED]: [S.BRAND_REVIEW, S.INFO_REQUESTED, S.APPROVED, S.REJECTED],
  [S.BRAND_REVIEW]: [S.INFO_REQUESTED, S.APPROVED, S.REJECTED],
  [S.INFO_REQUESTED]: [S.BRAND_REVIEW, S.APPROVED, S.REJECTED],
  [S.APPROVED]: [S.JOB_CREATED],
  // A job can skip stages (a partner who marks arrival without "on the way"),
  // so each service stage may move to any later one.
  [S.JOB_CREATED]: SERVICE_STAGES.slice(1),
  [S.PARTNER_ASSIGNED]: [S.JOB_CREATED, ...SERVICE_STAGES.slice(2)],
  [S.VISIT_SCHEDULED]: [S.JOB_CREATED, ...SERVICE_STAGES.slice(3)],
  [S.TECHNICIAN_ON_WAY]: [S.JOB_CREATED, ...SERVICE_STAGES.slice(4)],
  [S.SERVICE_IN_PROGRESS]: [S.JOB_CREATED, ...SERVICE_STAGES.slice(5)],
  [S.SERVICE_COMPLETED]: [S.CLOSED],
  // Resume goes back to statusBeforeHold; which one is checked by the caller.
  [S.ON_HOLD]: [
    S.SUBMITTED, S.BRAND_REVIEW, S.INFO_REQUESTED, ...SERVICE_STAGES.slice(0, -1),
  ],
  // Reopen is an admin override (Phase 8).
  [S.REJECTED]: [S.BRAND_REVIEW],
  [S.CLOSED]: [S.BRAND_REVIEW, S.JOB_CREATED],
  [S.CANCELLED]: [S.BRAND_REVIEW, S.JOB_CREATED],
};

export const CLAIM_TRANSITIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_TRANSITIONS).map(([from, to]) => {
      const extra = TERMINAL_STATUSES.includes(from) || from === S.ON_HOLD ? [] : [S.ON_HOLD, S.CANCELLED];
      return [from, Object.freeze([...new Set([...to, ...extra])])];
    }),
  ),
);

export function canTransition(from, to) {
  return (CLAIM_TRANSITIONS[from] || []).includes(to);
}

// What the customer app shows. Approved and Job Created read the same to a
// customer — the job is an NCC-internal step.
export const CUSTOMER_STATUS_LABELS = Object.freeze({
  [S.SUBMITTED]: 'Claim Submitted',
  [S.BRAND_REVIEW]: 'Brand Verification',
  [S.INFO_REQUESTED]: 'Action Needed: More Information',
  [S.APPROVED]: 'Warranty Approved',
  [S.REJECTED]: 'Not Approved',
  [S.JOB_CREATED]: 'Warranty Approved',
  [S.PARTNER_ASSIGNED]: 'Partner Assigned',
  [S.VISIT_SCHEDULED]: 'Visit Scheduled',
  [S.TECHNICIAN_ON_WAY]: 'Technician On Way',
  [S.SERVICE_IN_PROGRESS]: 'Service In Progress',
  [S.SERVICE_COMPLETED]: 'Service Completed',
  [S.CLOSED]: 'Closed',
  [S.ON_HOLD]: 'On Hold',
  [S.CANCELLED]: 'Cancelled',
});

export function customerStatusLabel(status) {
  return CUSTOMER_STATUS_LABELS[status] || status;
}

// Timeline event actions. Kept as one list so the model enum, the audit log
// and the domain events (Phase 10) all speak the same words.
export const CLAIM_ACTIONS = Object.freeze([
  'CLAIM_SUBMITTED',
  'STATUS_CHANGED',
  'BRAND_OPENED',
  'CLAIM_APPROVED',
  'CLAIM_REJECTED',
  'INFO_REQUESTED',
  'INFO_PROVIDED',
  'DOCUMENT_ADDED',
  'JOB_CREATED',
  'PARTNER_ASSIGNED',
  'PARTNER_UNASSIGNED',
  'ALLOCATION_FAILED',
  'NOTE_ADDED',
  'ESCALATED',
  'DE_ESCALATED',
  'PUT_ON_HOLD',
  'RESUMED',
  'CANCELLED',
  'REOPENED',
  'SLA_WARNING',
  'SLA_BREACHED',
]);

export const EVENT_VISIBILITY = Object.freeze(['customer', 'brand', 'internal']);
export const ACTOR_KINDS = Object.freeze(['customer', 'brand', 'admin', 'partner', 'system']);
