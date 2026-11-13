// One search budget for an unaccepted service request. Accepted/scheduled work
// is never expired by this policy. Booking reschedules keep their own deadline.
export const SEARCH_WINDOW_MS = 30 * 60 * 1000;
// An online advance has to be paid within this window or the booking is cancelled
// (it is never offered to partners until it is paid).
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
export function searchHasExpired(request, booking = null, now = new Date()) {
  if (request.isAccepted || !['New', 'Assigned', 'Pending'].includes(request.status)) return false;
  const deadline = booking?.searchExpiresAt || (request.createdAt && new Date(new Date(request.createdAt).getTime() + SEARCH_WINDOW_MS));
  return Boolean(deadline && new Date(deadline) <= now);
}
