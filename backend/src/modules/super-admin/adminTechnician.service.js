import { Technician } from '../technician/technician.model.js';
import { Job } from '../technician/job.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Platform-wide technician directory for the super-admin console. Distinct from
// modules/technician/technician.service.js, which is the technician's own
// self-service view of a single profile (their id comes from the JWT).

export async function listTechnicians({
  status,
  availability,
  city,
  servicePartner,
  search,
  spec,
  page,
  limit,
  sort,
} = {}) {
  const query = {};
  if (status) query.status = status;
  if (availability) query.availability = availability;
  if (city) query.city = city;
  if (servicePartner) query.servicePartner = servicePartner;
  if (spec) query.specs = spec;

  if (search) {
    // Escape regex metacharacters — a search for "a+b" must not compile as a quantifier.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    query.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Technician.find(query)
      .populate('city', 'name')
      .populate('servicePartner', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Technician.countDocuments(query),
  ]);

  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOr404(id) {
  const technician = await Technician.findById(id)
    .populate('city', 'name')
    .populate('servicePartner', 'name');
  if (!technician) throw new ApiError(404, 'Technician not found');
  return technician;
}

export async function getTechnician(id) {
  return findOr404(id);
}

/**
 * Approve / suspend / reset a technician to pending.
 *
 * A technician who is not Active must not keep advertising themselves as
 * Available to the job feed, so availability is forced Offline alongside.
 * Re-activating leaves availability Offline — the technician marks themselves
 * Available from their own app.
 */
export async function updateTechnicianStatus(id, status) {
  const technician = await findOr404(id);
  technician.status = status;
  if (status !== 'Active') technician.availability = 'Offline';
  await technician.save();
  return technician;
}

export async function updateTechnicianPartner(id, servicePartnerId) {
  const technician = await findOr404(id);
  technician.servicePartner = servicePartnerId || null;
  await technician.save();
  return technician.populate('servicePartner', 'name');
}

export async function deleteTechnician(id) {
  const technician = await findOr404(id);

  // Jobs carry a required technician ref, so removing a technician mid-job would
  // orphan them. Callers should reassign or close those jobs first. 'idle' and
  // 'completed' are the two steps where nobody is mid-engagement.
  const activeJobs = await Job.countDocuments({
    technician: technician._id,
    activeStep: { $nin: ['idle', 'completed'] },
  });
  if (activeJobs > 0) {
    throw new ApiError(409, `Technician has ${activeJobs} active job(s) — reassign them before deleting`);
  }

  await technician.deleteOne();
  return { deleted: true, humanId: technician.humanId, name: technician.name };
}
