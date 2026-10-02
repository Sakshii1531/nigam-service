import { CLAIM_STATUS } from './claimStatus.js';

// Stage deadlines for warranty claims (docs/partner-warranty ARCHITECTURE §7,
// Phase 9). Pure functions over a claim document — no database access — so
// claimTimeline.appendEvent can apply them on every status change. The sweep
// that raises warnings and breaches lives in claimSla.service.js.

const S = CLAIM_STATUS;

export const WARRANTY_SLA_DEFAULTS = Object.freeze({
  approvalHours: 24,
  assignmentHours: 4,
  visitHours: 48,
  resolutionHours: 168,
});

/** Warning fires when this share of a stage's window has passed. */
export const WARNING_AT = 0.8;

/** A brand's own figure for `key` (e.g. 'approvalHours'), else `defaults`, else the built-in default. */
export function slaHours(brand, key, defaults = WARRANTY_SLA_DEFAULTS) {
  const own = brand?.warrantySla?.[key];
  if (Number.isFinite(own) && own > 0) return own;
  const platform = defaults?.[key];
  return Number.isFinite(platform) && platform > 0 ? platform : WARRANTY_SLA_DEFAULTS[key];
}

export function dueAt(from, hours) {
  return new Date(new Date(from).getTime() + hours * 3600 * 1000);
}

const AFTER_ASSIGNMENT = [S.PARTNER_ASSIGNED, S.VISIT_SCHEDULED, S.TECHNICIAN_ON_WAY, S.SERVICE_IN_PROGRESS, S.SERVICE_COMPLETED, S.CLOSED];

/**
 * The four clocks. `startOn`: statuses that (re)start the clock; `metOn`:
 * statuses that stop it as met. Brand approval and resolution start at
 * submission (startSla).
 */
export const SLA_STAGES = Object.freeze([
  { key: 'brandApproval', label: 'Brand approval', dueField: 'brandApprovalDueAt', hoursKey: 'approval', startOn: [], metOn: [S.APPROVED, S.REJECTED] },
  { key: 'assignment', label: 'Partner assignment', dueField: 'assignmentDueAt', hoursKey: 'assignment', startOn: [S.JOB_CREATED], metOn: AFTER_ASSIGNMENT },
  { key: 'visit', label: 'Technician visit', dueField: 'visitDueAt', hoursKey: 'visit', startOn: [S.PARTNER_ASSIGNED], metOn: AFTER_ASSIGNMENT.slice(2) },
  { key: 'resolution', label: 'Resolution', dueField: 'resolutionDueAt', hoursKey: 'resolution', startOn: [], metOn: [S.SERVICE_COMPLETED, S.CLOSED] },
]);

/** Waiting on someone other than NCC / the brand / the partner — the clock doesn't run. */
const PAUSED = [S.ON_HOLD, S.INFO_REQUESTED];
const TERMINAL = [S.CLOSED, S.CANCELLED, S.REJECTED];

const hasSla = (claim) => Boolean(claim.sla?.hours?.approval);

/** Stamps the SLA snapshot and the two clocks that start at submission. */
export function startSla(claim, hours, now = new Date()) {
  claim.sla = {
    hours,
    brandApprovalDueAt: dueAt(now, hours.approval),
    resolutionDueAt: dueAt(now, hours.resolution),
    met: {},
    pausedAt: null,
    state: 'ok',
    warnings: [],
    breaches: [],
  };
}

/** A new cycle for the stage; its earlier warning/breach stay in the timeline + audit log. */
function restart(claim, stage, now) {
  claim.sla[stage.dueField] = dueAt(now, claim.sla.hours[stage.hoursKey]);
  claim.sla.met[stage.key] = null;
  claim.sla.warnings = (claim.sla.warnings || []).filter((k) => k !== stage.key);
  claim.sla.breaches = (claim.sla.breaches || []).filter((k) => k !== stage.key);
}

/** Open = started and not yet met. */
export function openStages(claim) {
  if (!hasSla(claim)) return [];
  return SLA_STAGES.filter((stage) => claim.sla[stage.dueField] && !claim.sla.met?.[stage.key]);
}

export function recomputeSlaState(claim) {
  if (!hasSla(claim)) return;
  const warnings = claim.sla.warnings || [];
  claim.sla.state = claim.sla.breaches?.length
    ? 'breached'
    : openStages(claim).some((stage) => warnings.includes(stage.key))
      ? 'warning'
      : 'ok';
}

/**
 * Applies a status move to the clocks: pause/resume (shifting every open
 * deadline by the paused time), start/restart, and met. Called by
 * claimTimeline.appendEvent for every move; a claim without an SLA snapshot
 * (created before Phase 9) is left alone.
 */
export function applySlaTransition(claim, from, to, now = new Date()) {
  if (!hasSla(claim)) return;
  const sla = claim.sla;
  if (!sla.met) sla.met = {};

  if (PAUSED.includes(to) && !PAUSED.includes(from)) sla.pausedAt = now;
  if (PAUSED.includes(from) && !PAUSED.includes(to) && sla.pausedAt) {
    const shift = now.getTime() - new Date(sla.pausedAt).getTime();
    for (const stage of openStages(claim)) sla[stage.dueField] = new Date(sla[stage.dueField].getTime() + shift);
    sla.pausedAt = null;
  }

  // Reopened after a rejection / closure / cancellation: the clocks run again.
  if (TERMINAL.includes(from) && !TERMINAL.includes(to)) {
    const byKey = Object.fromEntries(SLA_STAGES.map((s) => [s.key, s]));
    restart(claim, byKey.resolution, now);
    if (to === S.BRAND_REVIEW) restart(claim, byKey.brandApproval, now);
  }

  for (const stage of SLA_STAGES) {
    if (stage.startOn.includes(to)) restart(claim, stage, now);
    if (stage.metOn.includes(to) && !sla.met[stage.key]) sla.met[stage.key] = now;
  }

  if (TERMINAL.includes(to)) sla.pausedAt = null;
  recomputeSlaState(claim);
}

/**
 * What the sweep should raise for one claim at `now`: [{ type: 'warning' | 'breach', stage }].
 * Pure — the caller records and notifies.
 */
export function evaluateSla(claim, now = new Date()) {
  if (!hasSla(claim) || claim.sla.pausedAt || TERMINAL.includes(claim.status)) return [];
  const raised = [];
  for (const stage of openStages(claim)) {
    const due = claim.sla[stage.dueField].getTime();
    const window = claim.sla.hours[stage.hoursKey] * 3600 * 1000;
    if (claim.sla.breaches?.includes(stage.key)) continue;
    if (now.getTime() >= due) raised.push({ type: 'breach', stage });
    else if (now.getTime() >= due - (1 - WARNING_AT) * window && !claim.sla.warnings?.includes(stage.key)) {
      raised.push({ type: 'warning', stage });
    }
  }
  return raised;
}
