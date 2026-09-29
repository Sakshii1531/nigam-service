// Stage deadlines for warranty claims (docs/partner-warranty ARCHITECTURE §7).
// Phase 3 stamps the brand-approval deadline at submission; Phase 9 adds the
// other stages and the warning/breach sweep on top of the same helpers.

export const WARRANTY_SLA_DEFAULTS = Object.freeze({
  approvalHours: 24,
  assignmentHours: 4,
  visitHours: 48,
  resolutionHours: 168,
});

/** A brand's own figure for `key` (e.g. 'approvalHours'), else the platform default. */
export function slaHours(brand, key) {
  const own = brand?.warrantySla?.[key];
  return Number.isFinite(own) && own > 0 ? own : WARRANTY_SLA_DEFAULTS[key];
}

export function dueAt(from, hours) {
  return new Date(new Date(from).getTime() + hours * 3600 * 1000);
}
