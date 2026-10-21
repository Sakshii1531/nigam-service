// One search budget for an unaccepted service request. Accepted/scheduled work
// is never expired by this policy. Booking reschedules keep their own deadline.
export const SEARCH_WINDOW_MS = 30 * 60 * 1000;
export function searchHasExpired(request, booking = null, now = new Date()) {
  if (request.isAccepted || !['New', 'Assigned', 'Pending'].includes(request.status)) return false;
  const deadline = booking?.searchExpiresAt || (request.createdAt && new Date(new Date(request.createdAt).getTime() + SEARCH_WINDOW_MS));
  return Boolean(deadline && new Date(deadline) <= now);
}
