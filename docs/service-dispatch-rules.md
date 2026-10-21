# Provider search and territory rules

Unaccepted customer bookings have a 30-minute provider search window. A customer restart/reschedule gets a fresh explicit booking deadline. Warranty service jobs and direct requests without a Booking parent use 30 minutes from service-request creation (for warranty, after brand approval creates the service job).

The startup/15-second sweeps persist cancellation for expired unaccepted work. Feed, dispatch, socket-offer and acceptance guards enforce the deadline without waiting for the sweep. Accepted work is not cancelled by search expiry. An expired warranty service job is cancelled and its claim is flagged for admin follow-up; the customer's underlying warranty entitlement is retained.

The registered service city is a boundary. GPS proximity and configured pincodes/radius can narrow eligibility but cannot authorize another registered city. The same checks protect ranking, manual assignment, available-job feeds, socket offers and acceptance. Pincode rules remain more specific than a provider's radius inside the registered city.

Search timeouts are system cancellations, not customer cancellations. Provider notifications and cancellation dialogs distinguish the cause.

Regression coverage: `booking.test.js` (30-minute searches and legacy missing deadlines), `partnerWarrantyAllocation.test.js` (cross-city GPS/pincode rejection, stale searches, exact cutoff and accepted work), `serviceProviderJob.test.js`, `bookingCancellation.test.js` and `sockets.test.js`.
