import { Technician } from '../technician/technician.model.js';

/**
 * Stand-in for Phase 8's full auto-assignment scoring engine (weighted
 * proximity/skill/rating/workload). For now: first Active+Available technician
 * whose `specs` includes the booking's category, falling back to any
 * Active+Available technician if none specialize in it. No real geo/"nearest"
 * concept yet — that's exactly what Phase 8 adds without changing this
 * function's signature, so callers (booking.service.js) don't need to change.
 */
export async function findAvailableTechnician({ category }) {
  const specialist = await Technician.findOne({ status: 'Active', availability: 'Available', specs: category });
  if (specialist) return specialist;

  return Technician.findOne({ status: 'Active', availability: 'Available' });
}
