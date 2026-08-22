import { Technician } from '../technician/technician.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { AssignmentWeighting } from '../super-admin/assignmentWeighting.model.js';

function clamp0to100(n) {
  return Math.max(0, Math.min(100, n));
}

/**
 * Work already on a technician's plate but not yet picked up. `activeJobsCount`
 * only moves when a technician *accepts* a job (job.service.js), so a batch
 * auto-assign handed every pending request to the same top-ranked technician —
 * nothing in the score changed between iterations. Counting assigned-but-
 * unaccepted requests makes the workload term react immediately.
 */
async function pendingAssignmentCounts() {
  const rows = await ServiceRequest.aggregate([
    { $match: { status: 'Assigned', technician: { $ne: null } } },
    { $group: { _id: '$technician', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/**
 * Real weighted scoring engine (Phase 8), replacing the Phase 4 stub
 * (`assignmentStub.js`, deleted). Same call shape (`{ category }`) plus an
 * optional `city`, so booking.service.js needed one extra field, not a rewrite.
 *
 * Hard-filters to Active+Available technicians first (an unavailable
 * technician can never win regardless of score), then scores each candidate:
 *   - proximity: city-name match against the technician's City doc (100 if
 *     match, 0 if a known mismatch, 50 if unknown either way) — a simplified
 *     proxy since neither Technician nor Booking store real lat/lng yet.
 *   - skill: 100 if `category` is in the technician's specs, else 40 (a
 *     generalist is still assignable, just less preferred than a specialist —
 *     this is what naturally reproduces the old stub's "fall back to any
 *     available technician" behavior without a separate code path).
 *   - rating: technician.rating (0-5) scaled to 0-100.
 *   - workload: inversely proportional to the technician's open load — their
 *     accepted activeJobsCount plus anything already assigned to them and
 *     awaiting pickup — 100 at 0, -20 per open item, floored at 0.
 * Weighted by the admin-configurable AssignmentWeighting singleton (defaults
 * 40/30/20/10 if none exists yet, matching the model's schema defaults).
 */
export async function rankTechnicians({ category, city, includeUnavailable = false, exclude = [] } = {}) {
  // Auto-assignment only ever considers technicians who have marked themselves
  // Available. The super-admin console passes includeUnavailable so an operator
  // can still hand-pick an Active technician who is Busy or Offline — an
  // override has to reach the technicians the automatic path deliberately
  // skips, otherwise the manual panel renders empty in exactly the situation
  // where an operator went looking for it.
  const filter = { status: 'Active' };
  if (!includeUnavailable) filter.availability = 'Available';
  // Technicians who already turned this request down. Without this a rejected
  // job is handed straight back to the same person, who is usually the
  // top-ranked candidate that made them the assignee in the first place.
  if (exclude.length) filter._id = { $nin: exclude };

  const candidates = await Technician.find(filter).populate('city');
  if (candidates.length === 0) return [];

  const pending = await pendingAssignmentCounts();

  const weighting = (await AssignmentWeighting.findOne()) || {
    proximityPercent: 40,
    skillPercent: 30,
    ratingPercent: 20,
    workloadPercent: 10,
  };

  function breakdown(tech) {
    let proximity = 50;
    if (city && tech.city && tech.city.name) {
      proximity = tech.city.name.toLowerCase().trim() === city.toLowerCase().trim() ? 100 : 0;
    }
    const skill = tech.specs.includes(category) ? 100 : 40;
    const rating = clamp0to100((tech.rating / 5) * 100);
    const load = tech.activeJobsCount + (pending.get(String(tech._id)) || 0);
    const workload = clamp0to100(100 - load * 20);

    const score =
      (proximity * weighting.proximityPercent +
        skill * weighting.skillPercent +
        rating * weighting.ratingPercent +
        workload * weighting.workloadPercent) /
      100;

    return { proximity, skill, rating, workload, score };
  }

  // The console shows the whole ranked shortlist with the same numbers auto-assign
  // uses, so an operator overriding the top pick can see exactly why it ranked first.
  return candidates
    .map((technician) => ({ technician, ...breakdown(technician) }))
    .sort((a, b) => b.score - a.score);
}

export async function findAvailableTechnician({ category, city, exclude = [] } = {}) {
  const [best] = await rankTechnicians({ category, city, exclude });
  return best ? best.technician : null;
}
