import { Technician } from './technician.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function getProfile(technicianId) {
  const technician = await Technician.findById(technicianId).select('+payoutMethods.accountNo');
  if (!technician) throw new ApiError(404, 'Technician not found');
  return technician;
}

const EDITABLE_FIELDS = ['name', 'phone', 'email', 'specs'];

export async function updateProfile(technicianId, data) {
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) updates[field] = data[field];
  }
  const technician = await Technician.findByIdAndUpdate(technicianId, updates, { new: true });
  if (!technician) throw new ApiError(404, 'Technician not found');
  return technician;
}

function maskDetail(method) {
  if (method.type === 'bank' && method.accountNo) return `•••• ${method.accountNo.slice(-4)}`;
  if (method.type === 'upi' && method.upiId) return method.upiId;
  return method.detail;
}

export async function addPayoutMethod(technicianId, method) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');

  if (method.isPrimary) technician.payoutMethods.forEach((m) => { m.isPrimary = false; });
  technician.payoutMethods.push({ ...method, detail: maskDetail(method) });
  await technician.save();
  return technician;
}

export async function removePayoutMethod(technicianId, methodId) {
  const technician = await Technician.findById(technicianId);
  if (!technician) throw new ApiError(404, 'Technician not found');

  technician.payoutMethods = technician.payoutMethods.filter((m) => String(m._id) !== methodId);
  await technician.save();
  return technician;
}
