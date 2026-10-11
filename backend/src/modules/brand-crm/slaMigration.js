import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { slaHours, dueAt, SLA_STAGES } from '../partner-warranty/claimSla.js';

/** Upgrade snapshots once, retaining the original four clocks and recorded outcomes. */
export async function backfillWarrantySla({ dryRun = true } = {}) {
  const platform = (await PlatformSettings.findOne())?.warrantySla?.toObject?.();
  let matched = 0, updated = 0;
  for await (const claim of WarrantyClaim.find({ 'sla.hours.approval': { $exists: true }, 'sla.version': { $ne: 2 } }).cursor()) {
    matched++;
    if (dryRun) continue;
    const brand = await Brand.findById(claim.brand);
    const firstAction = claim.firstBrandActionAt || claim.timeline.find(e => e.actor?.kind === 'brand')?.at;
    const responseHours = slaHours(brand, 'responseHours', platform);
    let pausedAt = null, pausedMs = 0;
    for (const e of claim.timeline) {
      if (firstAction && e.at > firstAction) break;
      if (['Info Requested', 'On Hold'].includes(e.toStatus) && !pausedAt) pausedAt = e.at;
      if (pausedAt && e.toStatus && !['Info Requested', 'On Hold'].includes(e.toStatus)) {
        pausedMs += Math.max(0, new Date(e.at) - new Date(pausedAt)); pausedAt = null;
      }
    }
    claim.sla.hours.response = responseHours;
    claim.sla.responseDueAt = new Date(+dueAt(claim.createdAt, responseHours) + pausedMs);
    if (firstAction) {
      claim.firstBrandActionAt = firstAction; claim.sla.met.response = firstAction;
      if (firstAction > claim.sla.responseDueAt) {
        claim.sla.breaches = [...new Set([...claim.sla.breaches, 'response'])];
      }
    }
    const reached = claim.timeline.find(e => e.action === 'JOB_STAGE_CHANGED' && e.meta?.stage === 'REACHED' && (!e.meta?.job || e.meta.job === String(claim.serviceRequest)));
    if (reached) claim.sla.met.visit = reached.at;
    else if (!['Service Completed', 'Closed'].includes(claim.status)) claim.sla.met.visit = undefined;
    claim.sla.breachFacts = Object.fromEntries((claim.sla.breaches || []).map(key => {
      const stage = SLA_STAGES.find(s => s.key === key);
      return [key, claim.sla.breachFacts?.[key] || claim.sla[stage?.dueField] || claim.updatedAt];
    }));
    claim.markModified('sla.breachFacts');
    claim.sla.priorityFactor ||= 1; claim.sla.version = 2;
    await claim.save(); updated++;
  }
  return { dryRun, matched, updated };
}
