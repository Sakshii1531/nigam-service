import { Counter } from '../shared/counter.model.js';
import { Escalation } from '../super-admin/escalation.model.js';
import { BrandSettings } from '../brand-admin/brandSettings.model.js';
import { Role } from '../auth/role.model.js';
import { User } from '../auth/user.model.js';
import { Team } from '../brand-admin/team.model.js';
import { appendEvent } from '../partner-warranty/claimTimeline.js';
import { sendAdHocPush } from '../notifications/notification.service.js';

export const DEFAULT_MATRIX = Object.freeze({
  warning: { role: 'brand_manager', level: 1 },
  breach: { role: 'quality_escalation', level: 2, platform: true },
  escalationResponseHours: 4,
});
const SYSTEM = { kind: 'system', name: 'NCC SLA' };

export async function responsibleFor(brand, role, claim, session) {
  const roles = await Role.find({ scope: 'brand', brand, $or: [{ template: role }, { _id: /^[a-f0-9]{24}$/i.test(role) ? role : null }] }).session(session);
  const users = await User.find({ brand, role: 'brand_admin', status: 'Active', assignedRoles: { $in: roles.map(r => r._id) } }).sort({ _id: 1 }).session(session);
  if (claim.assignedCce?.user) {
    const team = await Team.findOne({ brand, members: claim.assignedCce.user, lead: { $ne: null } }).session(session);
    const lead = team && await User.findOne({ _id: team.lead, brand, role: 'brand_admin', status: 'Active' }).session(session);
    if (lead) return { user: lead._id, recipients: [...new Set([...users.map(u => String(u._id)), String(lead._id)])] };
  }
  const counter = users.length ? await Counter.findOneAndUpdate(
    { _id: `escalation:${brand}:${role}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session }) : null;
  return { user: users.length ? users[(counter.seq - 1) % users.length]._id : null, recipients: users.map(u => String(u._id)) };
}

/** Called within the same transaction as the claim write; effects returned for after commit. */
export async function raiseSlaEscalation(claim, { type, stage }, now, session) {
  const settings = await BrandSettings.findOne({ brand: claim.brand }).session(session);
  const matrix = settings?.escalationMatrix?.toObject() || DEFAULT_MATRIX;
  const target = matrix[type] || DEFAULT_MATRIX[type];
  const assignment = await responsibleFor(claim.brand, target.role, claim, session);
  const effects = [];
  for (const scope of type === 'breach' && target.platform ? ['brand', 'platform'] : ['brand']) {
    const openKey = `${claim._id}:${stage.key}:${scope}`;
    let escalation = await Escalation.findOne({ openKey }).session(session);
    if (escalation && escalation.level >= target.level) continue;
    const admin = scope === 'platform' ? await User.findOne({ role: 'super_admin', status: 'Active' }).sort({ _id: 1 }).session(session) : null;
    const values = {
      scope, brand: claim.brand, warrantyClaim: claim._id, serviceRequest: claim.serviceRequest || undefined,
      slaStage: stage.key, level: target.level, priority: claim.priority,
      responsible: { role: scope === 'platform' ? 'super_admin' : target.role, user: scope === 'platform' ? admin?._id || null : assignment.user },
      ...(scope === 'platform' ? { manager: admin?._id || null } : {}),
      dueAt: new Date(new Date(claim.sla[stage.dueField]).getTime() + (matrix.escalationResponseHours ?? 4) * 3600000),
      reason: `${stage.label} SLA ${type === 'breach' ? 'breached' : 'near breach'}`,
      raisedBy: 'System Auto', openKey,
    };
    if (!escalation) escalation = new Escalation(values);
    else Object.assign(escalation, values);
    escalation.history.push({ at: now, action: type === 'breach' ? 'raised' : 'created', actor: SYSTEM, note: values.reason });
    await escalation.save(session ? { session } : undefined);
    appendEvent(claim, { action: 'ESCALATION_RAISED', actor: SYSTEM, visibility: 'brand', note: values.reason, meta: { escalation: String(escalation._id), stage: stage.key, level: target.level, scope } });
    effects.push({ escalation, recipients: scope === 'platform' ? null : assignment.recipients });
  }
  claim.flags.escalated = true;
  claim.flags.escalatedAt ||= now;
  claim.flags.escalationReason = `${stage.label} SLA ${type === 'breach' ? 'breached' : 'near breach'}`;
  return effects;
}

export async function notifyEscalations(effects) {
  for (const { escalation: e, recipients } of effects) {
    const ids = recipients || (await User.find({ role: 'super_admin', status: 'Active' }).select('_id')).map(u => String(u._id));
    for (const recipientId of ids) await sendAdHocPush({
      recipientId, brand: e.brand, warrantyClaim: e.warrantyClaim,
      title: `SLA escalation · L${e.level}`, body: e.reason, priority: 'High',
      cta: { label: 'Review escalation', route: e.scope === 'brand' ? '/brand-admin/escalations' : '/super-admin/escalations' },
    });
  }
}
