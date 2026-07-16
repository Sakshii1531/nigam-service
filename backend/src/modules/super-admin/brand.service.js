import { Brand } from './brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { logAudit } from '../shared/auditLog.js';

export async function listBrands() {
  return Brand.find().sort({ name: 1 });
}

async function findOr404(id) {
  const brand = await Brand.findById(id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  return brand;
}

export async function getBrand(id) {
  return findOr404(id);
}

export async function createBrand(data, actingUserId) {
  const existing = await Brand.findOne({ name: data.name });
  if (existing) throw new ApiError(409, `Brand "${data.name}" already exists`);
  const brand = await Brand.create(data);
  await logAudit({ user: actingUserId, action: `Created brand "${brand.name}"`, type: 'System' });
  return brand;
}

const EDITABLE_FIELDS = ['name', 'category', 'status', 'slaResolutionTimeHours', 'slaAdherencePercent', 'csat', 'contractTerms'];

export async function updateBrand(id, updates, actingUserId) {
  const brand = await findOr404(id);
  const statusChanged = updates.status !== undefined && updates.status !== brand.status;
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) brand[field] = updates[field];
  }
  await brand.save();
  if (statusChanged) {
    await logAudit({ user: actingUserId, action: `Changed brand "${brand.name}" status to ${brand.status}`, type: 'System' });
  }
  return brand;
}
