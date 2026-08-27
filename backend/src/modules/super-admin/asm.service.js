import { ASM } from './asm.model.js';
import { Technician } from '../technician/technician.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// A request stops counting against an ASM's workload once it reaches a terminal
// state; everything before that is still live work in their region.
const TERMINAL_STATUSES = ['Closed', 'Cancelled'];

/**
 * Adds `activeJobs` to each ASM: open service requests handled by technicians
 * employed at any service partner this ASM oversees.
 *
 * Done in three batched queries for the whole list rather than per-ASM — the
 * console renders every ASM at once, so a per-row lookup would be N+1.
 */
async function withActiveJobCounts(asms) {
  const partnerIds = asms.flatMap((asm) => asm.partners || []);
  if (partnerIds.length === 0) {
    return asms.map((asm) => ({ ...asm.toJSON(), activeJobs: 0 }));
  }

  const technicians = await Technician.find({ servicePartner: { $in: partnerIds } })
    .select('_id servicePartner')
    .lean();

  const openCounts = await ServiceRequest.aggregate([
    { $match: { technician: { $in: technicians.map((t) => t._id) }, status: { $nin: TERMINAL_STATUSES } } },
    { $group: { _id: '$technician', count: { $sum: 1 } } },
  ]);
  const countByTechnician = new Map(openCounts.map((row) => [String(row._id), row.count]));

  const countByPartner = new Map();
  for (const tech of technicians) {
    const partner = String(tech.servicePartner);
    const open = countByTechnician.get(String(tech._id)) || 0;
    countByPartner.set(partner, (countByPartner.get(partner) || 0) + open);
  }

  return asms.map((asm) => ({
    ...asm.toJSON(),
    activeJobs: (asm.partners || []).reduce((sum, p) => sum + (countByPartner.get(String(p)) || 0), 0),
  }));
}

export async function listAsms({ city } = {}) {
  const query = {};
  if (city) query.city = city;
  // The console shows the region name and a live workload figure, so resolve the
  // city ref and fold in open-job counts rather than returning bare ids.
  const asms = await ASM.find(query).populate('city', 'name').sort({ name: 1 });
  return withActiveJobCounts(asms);
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

export async function deleteAsm(id) {
  const asm = await findOr404(id);
  await asm.deleteOne();
  return { message: 'ASM deleted successfully' };
}
