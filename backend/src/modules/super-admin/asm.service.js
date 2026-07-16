import { ASM } from './asm.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listAsms({ city } = {}) {
  const query = {};
  if (city) query.city = city;
  return ASM.find(query).sort({ name: 1 });
}

async function findOr404(id) {
  const asm = await ASM.findById(id);
  if (!asm) throw new ApiError(404, 'ASM not found');
  return asm;
}

export async function getAsm(id) {
  return findOr404(id);
}

export async function createAsm(data) {
  return ASM.create(data);
}

const EDITABLE_FIELDS = ['name', 'email', 'phone', 'city', 'rating', 'user'];

export async function updateAsm(id, updates) {
  const asm = await findOr404(id);
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) asm[field] = updates[field];
  }
  await asm.save();
  return asm;
}

export async function addPartner(id, partnerId) {
  const asm = await findOr404(id);
  if (!asm.partners.some((p) => String(p) === partnerId)) asm.partners.push(partnerId);
  await asm.save();
  return asm;
}

export async function removePartner(id, partnerId) {
  const asm = await findOr404(id);
  asm.partners = asm.partners.filter((p) => String(p) !== partnerId);
  await asm.save();
  return asm;
}
