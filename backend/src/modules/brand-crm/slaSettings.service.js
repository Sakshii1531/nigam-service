import { z } from 'zod';
import { Brand } from '../super-admin/brand.model.js';
import { BrandSettings } from '../brand-admin/brandSettings.model.js';
import { Role } from '../auth/role.model.js';
import { getSettings as getPlatformSettings } from '../super-admin/platformSettings.service.js';
import { WARRANTY_SLA_DEFAULTS, PRIORITY_FACTORS, slaHours } from '../partner-warranty/claimSla.js';
import { DEFAULT_MATRIX } from './escalationEngine.js';
import { actorFromUser } from './actor.js';
import { recordAction } from '../shared/auditLog.js';
import { ApiError } from '../../middleware/errorHandler.js';

const hours = z.number().min(0.05).max(8760);
export const slaSchema = z.object({
  responseHours: hours, approvalHours: hours, assignmentHours: hours, visitHours: hours, resolutionHours: hours,
  priorityFactor: z.object(Object.fromEntries(Object.keys(PRIORITY_FACTORS).map(key => [key, z.number().min(0.1).max(5)]))).strict(),
}).strict();
const step = z.object({ role: z.string().min(1).max(100), level: z.number().int().min(1).max(3) }).strict();
export const matrixSchema = z.object({
  warning: step, breach: step.extend({ platform: z.boolean() }), escalationResponseHours: hours,
}).strict().refine(v => v.breach.level > v.warning.level, 'Breach level must exceed warning level');

export async function getSlaSettings(brandId) {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, 'Brand not found');
  const platform = (await getPlatformSettings()).warrantySla?.toObject?.();
  return { ...Object.fromEntries(Object.keys(WARRANTY_SLA_DEFAULTS).map(key => [key, slaHours(brand, key, platform)])),
    priorityFactor: { ...PRIORITY_FACTORS, ...brand.warrantySla?.priorityFactor?.toObject?.() } };
}
export async function getMatrix(brand) {
  const [settings, roles] = await Promise.all([BrandSettings.findOne({ brand }), Role.find({ scope: 'brand', brand }).select('name template').lean()]);
  return { matrix: settings?.escalationMatrix?.toObject() || DEFAULT_MATRIX, roles: roles.map(r => ({ id: String(r._id), name: r.name, template: r.template })) };
}
export async function updateSlaSettings(user, values) {
  const before = await getSlaSettings(user.brand);
  await Brand.updateOne({ _id: user.brand }, { $set: { warrantySla: values } });
  await recordAction({ brand: user.brand, entityType: 'Brand', entityId: user.brand, action: 'sla.updated', actor: await actorFromUser(user.id, 'brand'), meta: { before, after: values } });
  return getSlaSettings(user.brand);
}
export async function updateMatrix(user, matrix) {
  const before = await getMatrix(user.brand);
  for (const role of [matrix.warning.role, matrix.breach.role]) {
    if (!before.roles.some(r => r.id === role || r.template === role)) throw new ApiError(400, 'Choose a role belonging to this brand');
  }
  await BrandSettings.findOneAndUpdate({ brand: user.brand }, { $set: { escalationMatrix: matrix } }, { upsert: true, new: true, runValidators: true });
  await recordAction({ brand: user.brand, entityType: 'BrandSettings', action: 'escalation_matrix.updated', actor: await actorFromUser(user.id, 'brand'), meta: { before: before.matrix, after: matrix } });
  return getMatrix(user.brand);
}
