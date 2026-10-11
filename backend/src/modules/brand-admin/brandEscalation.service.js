import { dateRange } from '../brand-crm/billing.service.js';
import { Escalation } from '../super-admin/escalation.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { User } from '../auth/user.model.js';
import { appendEvent, persistClaim, flushAudit } from '../partner-warranty/claimTimeline.js';
import { actorFromUser } from '../brand-crm/actor.js';
import { responsibleFor, DEFAULT_MATRIX, notifyEscalations } from '../brand-crm/escalationEngine.js';
import { BrandSettings } from './brandSettings.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { runInTransaction } from '../../utils/transaction.js';
import { getIO } from '../../sockets/io.js';

export async function listBrandEscalations(brandId, filters = {}, userId) {
  const { status, priority, level, stage, responsible, overdue, warrantyClaim } = filters;
  const range = dateRange(filters.from, filters.to);
  const query = { scope: 'brand', brand: brandId, ...(Object.keys(range).length ? {createdAt:range}: {}) };
  if (status) query.status = status === 'open' ? { $ne: 'Resolved' } : status;
  if (priority) query.priority = priority;
  if (level) query.level = level;
  if (stage) query.slaStage = stage;
  if (warrantyClaim) query.warrantyClaim = warrantyClaim;
  if (responsible) query['responsible.user'] = responsible === 'me' ? userId : responsible;
  if (overdue === 'true') { query.status = { $ne: 'Resolved' }; query.dueAt = { $lt: new Date() }; }
  const { skip, limit, page, sort } = parsePagination(filters);
  const [items, total] = await Promise.all([
    Escalation.find(query).sort(sort).skip(skip).limit(limit)
      .populate({ path: 'warrantyClaim', select: 'humanId brandTicketNo priority', match: { brand: brandId } })
      .populate('responsible.user', 'name employeeId')
      .populate({ path: 'serviceRequest', populate: { path: 'user', select: 'name' } }),
    Escalation.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page, limit, total }) };
}
export async function countOpenBrandEscalations(brand) {
  return Escalation.countDocuments({ scope: 'brand', brand, status: { $ne: 'Resolved' } });
}
export async function createBrandEscalation(brand, data, userId) {
  const actor = await actorFromUser(userId, 'brand');
  let committed;
  try {
    committed = await runInTransaction(async session => {
      const claim = data.warrantyClaim ? await WarrantyClaim.findOne({ _id: data.warrantyClaim, brand }).session(session) : null;
      if (data.warrantyClaim && !claim) throw new ApiError(404, 'Ticket not found');
      if (data.serviceRequest && !await ServiceRequest.exists({ _id: data.serviceRequest, brand }).session(session)) throw new ApiError(404, 'Service request not found');
      const settings = await BrandSettings.findOne({ brand }).session(session);
      const matrix = settings?.escalationMatrix?.toObject() || DEFAULT_MATRIX;
      const assignment = await responsibleFor(brand, matrix.warning.role, claim || {}, session);
      const escalation = new Escalation({
        ...data, brand, scope: 'brand', raisedBy: 'Brand User', priority: data.priority || claim?.priority || 'Medium',
        slaStage: 'manual', level: 1, responsible: { role: matrix.warning.role, user: assignment.user },
        dueAt: new Date(Date.now() + matrix.escalationResponseHours * 3600000),
        ...(claim ? { openKey: `${claim._id}:manual:brand` } : {}),
        history: [{ action: 'created', actor, note: data.reason }],
      });
      await escalation.save(session ? { session } : undefined);
      if (claim) {
        claim.flags.escalated = true; claim.flags.escalatedAt ||= new Date(); claim.flags.escalationReason = data.reason;
        appendEvent(claim, { action: 'ESCALATION_RAISED', actor, visibility: 'brand', note: data.reason, meta: { escalation: String(escalation._id), level: 1 } });
        await persistClaim(claim, { session });
      }
      return { escalation, claim, recipients: assignment.recipients };
    });
  } catch (e) { if (e.code === 11000) throw new ApiError(409, 'An open manual escalation already exists'); throw e; }
  if (committed.claim) await flushAudit(committed.claim);
  else getIO()?.to(`brand:${brand}`).emit('brand:escalation_updated', { id: String(committed.escalation._id) });
  await notifyEscalations([committed]);
  return committed.escalation;
}
export async function updateBrandEscalation(brand, id, values, userId, { scope = 'brand', kind = 'brand' } = {}) {
  const actor = await actorFromUser(userId, kind);
  let claim;
  const result = await runInTransaction(async session => {
    const escalation = await Escalation.findOne({ _id: id, scope, brand }).session(session);
    if (!escalation) throw new ApiError(404, 'Escalation not found');
    if (escalation.status === 'Resolved') throw new ApiError(409, 'Escalation is already resolved');
    if (values.status === 'Resolved' && !values.resolution) throw new ApiError(400, 'A resolution of at least 10 characters is required');
    if (values.responsibleUserId !== undefined) {
      if (values.responsibleUserId && !await User.exists({ _id: values.responsibleUserId, brand, role: 'brand_admin', status: 'Active' }).session(session)) throw new ApiError(400, 'Choose an active user from this brand');
      escalation.responsible.user = values.responsibleUserId;
    }
    if (values.status) escalation.status = values.status;
    if (values.resolution) {
      escalation.status = 'Resolved'; escalation.resolution = values.resolution;
      escalation.resolvedAt = new Date(); escalation.resolvedBy = actor; escalation.openKey = undefined;
    }
    escalation.history.push({ action: values.resolution ? 'resolved' : 'updated', actor, note: values.resolution || values.note || values.status || 'Responsible person changed' });
    await escalation.save(session ? { session } : undefined);
    if (values.resolution && escalation.warrantyClaim) {
      // Resolve the corresponding NCC mirror too; a new cycle may create a fresh pair.
      await Escalation.updateMany({ warrantyClaim: escalation.warrantyClaim, slaStage: escalation.slaStage, scope: scope === 'brand' ? 'platform' : 'brand', brand, status: { $ne: 'Resolved' } },
        { $set: { status: 'Resolved', resolution: values.resolution, resolvedAt: escalation.resolvedAt, resolvedBy: actor }, $unset: { openKey: 1 }, $push: { history: { at: new Date(), action: 'resolved', actor, note: values.resolution } } }, { session });
      claim = await WarrantyClaim.findOne({ _id: escalation.warrantyClaim, brand }).session(session);
      if (claim) {
        const open = await Escalation.exists({ warrantyClaim: claim._id, brand, status: { $ne: 'Resolved' } }).session(session);
        claim.flags.escalated = Boolean(open);
        appendEvent(claim, { action: 'ESCALATION_RESOLVED', actor, visibility: 'brand', note: values.resolution, meta: { escalation: String(escalation._id) } });
        await persistClaim(claim, { session });
      }
    }
    return escalation;
  });
  if (claim) await flushAudit(claim);
  else getIO()?.to(`brand:${brand}`).emit('brand:escalation_updated', { id: String(result._id) });
  return result;
}
export async function updateBrandEscalationStatus(brand, id, status, userId) {
  return updateBrandEscalation(brand, id, { status }, userId);
}

export async function escalationAssignees(brand) {
  return User.find({ brand, role: 'brand_admin', status: 'Active' }).select('name employeeId').sort({ name: 1 });
}
