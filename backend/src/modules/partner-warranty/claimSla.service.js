import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, saveClaim } from './claimTimeline.js';
import { TERMINAL_STATUSES } from './claimStatus.js';
import { evaluateSla, recomputeSlaState } from './claimSla.js';
import { claimLinks } from './claimLinks.js';
import { Brand } from '../super-admin/brand.model.js';
import { emitToAdmins, emitToBrand } from '../notifications/notification.service.js';

// The SLA sweep (docs/partner-warranty Phase 9): every few minutes, find open
// claims whose stage clocks crossed 80 % (warning) or 100 % (breach) and
// record + announce it — once per stage per cycle. A missed brand-approval
// deadline also escalates the claim (decision D8: never auto-approve).

const SYSTEM = { kind: 'system', name: 'NCC SLA' };

function formatDue(date) {
  return new Date(date).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function announce(claim, { type, stage }, brandName) {
  const common = {
    humanId: claim.humanId,
    brandName,
    stageLabel: stage.label,
    due: formatDue(claim.sla[stage.dueField]),
  };
  const tasks = [
    emitToAdmins(type === 'breach' ? 'warranty.sla_breach_admin' : 'warranty.sla_warning_admin', {
      ...common,
      cta: { label: 'View Claim', route: claimLinks.admin(claim.id) },
    }),
  ];
  // The brand owns the approval clock, so it hears about that one.
  if (stage.key === 'brandApproval') {
    tasks.push(
      emitToBrand(type === 'breach' ? 'warranty.sla_breach_brand' : 'warranty.sla_warning_brand', claim.brand, {
        ...common,
        cta: { label: 'Review Claim', route: claimLinks.brand(claim.id) },
      }),
    );
  }
  await Promise.all(tasks);
}

/** One sweep. Returns counts; safe to run concurrently with user actions (conflicts retry next sweep). */
export async function runSlaSweep({ now = new Date(), limit = 500 } = {}) {
  const candidates = await WarrantyClaim.find({
    status: { $nin: TERMINAL_STATUSES },
    'sla.hours.approval': { $exists: true },
    'sla.pausedAt': null,
  })
    .sort({ updatedAt: 1 })
    .limit(limit);

  const totals = { checked: candidates.length, warnings: 0, breaches: 0, escalated: 0 };
  for (const claim of candidates) {
    const raised = evaluateSla(claim, now);
    if (!raised.length) continue;

    for (const item of raised) {
      const { type, stage } = item;
      const list = type === 'breach' ? 'breaches' : 'warnings';
      claim.sla[list] = [...(claim.sla[list] || []), stage.key];
      appendEvent(claim, {
        action: type === 'breach' ? 'SLA_BREACHED' : 'SLA_WARNING',
        actor: SYSTEM,
        note: `${stage.label} SLA ${type === 'breach' ? 'breached' : 'at 80%'} — due ${formatDue(claim.sla[stage.dueField])}`,
        visibility: stage.key === 'brandApproval' ? 'brand' : 'internal',
      });
      if (type === 'breach' && stage.key === 'brandApproval' && !claim.flags.escalated) {
        claim.flags.escalated = true;
        claim.flags.escalatedAt = now;
        claim.flags.escalationReason = 'Brand approval SLA breached';
        appendEvent(claim, { action: 'ESCALATED', actor: SYSTEM, note: 'Brand approval SLA breached', visibility: 'brand' });
        totals.escalated += 1;
      }
    }
    recomputeSlaState(claim);

    try {
      await saveClaim(claim);
    } catch (err) {
      if (err.statusCode === 409) continue; // changed under us — the next sweep sees the fresh version
      throw err;
    }

    const brandName = (await Brand.findById(claim.brand).select('name').lean())?.name;
    for (const item of raised) {
      await announce(claim, item, brandName);
      totals[item.type === 'breach' ? 'breaches' : 'warnings'] += 1;
    }
  }
  return totals;
}
