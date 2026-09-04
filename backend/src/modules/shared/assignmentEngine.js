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
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(numLat1 * (Math.PI / 180)) * Math.cos(numLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function rankTechnicians({ category, city, state, latitude, longitude, includeUnavailable = false, exclude = [] } = {}) {
  // Auto-assignment only ever considers technicians who have marked themselves
  // Available. The super-admin console passes includeUnavailable so an operator
  // can still hand-pick an Active technician who is Busy or Offline.
  const filter = { status: 'Active' };
  if (!includeUnavailable) filter.availability = 'Available';
  if (exclude.length) filter._id = { $nin: exclude };

  let candidates = await Technician.find(filter).populate('city');
  if (candidates.length === 0) return [];

  // Territory restriction: If a booking has a city, only match technicians registered in that city territory.
  // A technician registered in Indore, MP will never receive or be assigned jobs from Delhi, Bangalore, etc.
  if (city && city.trim()) {
    const targetCity = city.trim().toLowerCase();
    const targetState = state ? state.trim().toLowerCase() : '';

    candidates = candidates.filter((tech) => {
      const techCity = (tech.serviceCityName || tech.city?.name || '').trim().toLowerCase();
      const techState = (tech.serviceStateName || tech.city?.state || '').trim().toLowerCase();

      // If technician has a registered city, it MUST match the booking city
      if (techCity) {
        const cityMatch = techCity === targetCity || techCity.includes(targetCity) || targetCity.includes(techCity);
        if (!cityMatch) return false;

        if (targetState && techState) {
          const stateMatch = techState === targetState || techState.includes(targetState) || targetState.includes(techState);
          if (!stateMatch) return false;
        }
        return true;
      }
      return false;
    });

    if (candidates.length === 0) return [];
  }

  const pending = await pendingAssignmentCounts();

  const weighting = (await AssignmentWeighting.findOne()) || {
    proximityPercent: 40,
    skillPercent: 30,
    ratingPercent: 20,
    workloadPercent: 10,
  };

  function breakdown(tech) {
    let proximity = 50;
    let distanceKm = null;
    const techCity = (tech.serviceCityName || tech.city?.name || '').trim().toLowerCase();

    // Check GPS coordinates for distance-based ranking (nearest to farthest)
    const techLat = tech.location?.latitude ?? tech.latitude;
    const techLon = tech.location?.longitude ?? tech.longitude;
    if (latitude != null && longitude != null && techLat != null && techLon != null) {
      distanceKm = calculateDistanceKm(latitude, longitude, techLat, techLon);
      if (distanceKm != null) {
        // Proximity score decreases as distance increases (0 km = 100, 25 km = 0)
        proximity = clamp0to100(100 - distanceKm * 4);
      }
    } else if (city && techCity) {
      proximity = techCity === city.trim().toLowerCase() ? 100 : 0;
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

    return { proximity, distanceKm, skill, rating, workload, score };
  }

  // Order from nearest to farthest (when GPS distance exists) or highest weighted score
  return candidates
    .map((technician) => ({ technician, ...breakdown(technician) }))
    .sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return b.score - a.score;
    });
}

export async function findAvailableTechnician({ category, city, state, latitude, longitude, exclude = [] } = {}) {
  const [best] = await rankTechnicians({ category, city, state, latitude, longitude, exclude });
  return best ? best.technician : null;
}

