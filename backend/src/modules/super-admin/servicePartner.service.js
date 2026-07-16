import { ServicePartner } from './servicePartner.model.js';
import { Technician } from '../technician/technician.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listServicePartners({ city } = {}) {
  const query = {};
  if (city) query.city = city;
  return ServicePartner.find(query).sort({ name: 1 });
}

async function findOr404(id) {
  const partner = await ServicePartner.findById(id);
  if (!partner) throw new ApiError(404, 'Service partner not found');
  return partner;
}

export async function getServicePartner(id) {
  const partner = await findOr404(id);
  const technicianCount = await Technician.countDocuments({ servicePartner: partner._id });
  return { ...partner.toJSON(), technicianCount };
}

export async function createServicePartner(data) {
  return ServicePartner.create(data);
}

const EDITABLE_FIELDS = ['name', 'manager', 'email', 'phone', 'city', 'rating', 'status'];

export async function updateServicePartner(id, updates) {
  const partner = await findOr404(id);
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) partner[field] = updates[field];
  }
  await partner.save();
  return partner;
}
