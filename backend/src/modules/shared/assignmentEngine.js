import { Technician } from '../technician/technician.model.js';
import { AssignmentWeighting } from '../super-admin/assignmentWeighting.model.js';

function clamp0to100(n) {
  return Math.max(0, Math.min(100, n));
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
 *   - workload: inversely proportional to activeJobsCount — 100 at 0 active
 *     jobs, -20 per active job, floored at 0.
 * Weighted by the admin-configurable AssignmentWeighting singleton (defaults
 * 40/30/20/10 if none exists yet, matching the model's schema defaults).
 */
export async function rankTechnicians({ category, city } = {}) {
  const candidates = await Technician.find({ status: 'Active', availability: 'Available' }).populate('city');
  if (candidates.length === 0) return [];

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
    const workload = clamp0to100(100 - tech.activeJobsCount * 20);

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

export async function findAvailableTechnician({ category, city } = {}) {
  const [best] = await rankTechnicians({ category, city });
  return best ? best.technician : null;
}
