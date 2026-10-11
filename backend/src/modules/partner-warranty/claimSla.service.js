import { runInTransaction } from '../../utils/transaction.js';
import { raiseSlaEscalation, notifyEscalations } from '../brand-crm/escalationEngine.js';
import { WarrantyClaim } from './warrantyClaim.model.js';
import { appendEvent, persistClaim, flushAudit } from './claimTimeline.js';
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

  for (const candidate of candidates) {
    let committed;
    try {
      committed = await runInTransaction(async session => {
        const claim = await WarrantyClaim.findById(candidate._id).session(session);
        if (!claim) return null;
        const raised = evaluateSla(claim, now);
        if (!raised.length) return null;
        const effects = [];
        for (const item of raised) {
          const { type, stage } = item;
          const list = type === 'breach' ? 'breaches' : 'warnings';
          claim.sla[list] = [...(claim.sla[list] || []), stage.key];
          if (type === 'breach') {
            claim.sla.breachFacts = { ...claim.sla.breachFacts, [stage.key]: now };
            claim.markModified('sla.breachFacts');
          }
          appendEvent(claim, {
            action: type === 'breach' ? 'SLA_BREACHED' : 'SLA_WARNING', actor: SYSTEM,
            note: `${stage.label} SLA ${type} — due ${formatDue(claim.sla[stage.dueField])}`, visibility: 'brand',
          });
          effects.push(...await raiseSlaEscalation(claim, item, now, session));
        }
        recomputeSlaState(claim);
        await persistClaim(claim, { session });
        return { claim, raised, effects };
      });
    } catch (err) {
      if (err.statusCode === 409 || err.code === 11000) continue;
      throw err;
    }
    if (!committed) continue;
    const { claim, raised, effects } = committed;
    await flushAudit(claim);
    await notifyEscalations(effects);
    const brandName = (await Brand.findById(claim.brand).select('name').lean())?.name;
    for (const item of raised) {
      await announce(claim, item, brandName);
      totals[item.type === 'breach' ? 'breaches' : 'warnings'] += 1;
    }
    totals.escalated += effects.filter(e => e.escalation.scope === 'brand').length;
  }

  return totals;
}
