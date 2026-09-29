# Phase 6 — Warranty-aware partner allocation

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #9, #10, #11 (payload)

## Goal
The job reaches the right nearby partner, and never gets stuck.

## Tasks
- [ ] `rankServiceProviders` accepts `warranty: { brand, pincode }`; applies hard filters per ARCHITECTURE §6 (skill, brand authorization with D6 fallback, pincode/radius/city service area) and a tier bonus in the score; non-warranty bookings behave exactly as today
- [ ] `assignServiceProvider` passes the warranty context when `sr.warrantyClaim` is set; excludes `declinedBy`
- [ ] `declineAssignment` / timeout sweep: for warranty SRs, when nobody eligible remains, **do not** broadcast to the open pool; set `claim.flags.allocationFailed`, internal timeline event, Super Admin notification
- [ ] `autoAssignPendingRequests` retries allocation-failed warranty SRs when partners come online; clears the flag on success
- [ ] `job:assigned` socket payload for warranty SRs adds `brand`, `productName`, `issueName`, `jobId (NCCJ)`, `claimId (NCCW)`, `isWarranty: true`, `serviceLabel: 'Warranty Service'`, customer pincode/area
- [ ] `listAvailableJobs` / job context include the same warranty fields
- [ ] Admin endpoints to set a partner's `authorizedBrands`, `servicePincodes`, `serviceRadiusKm` (extend existing adminServiceProvider update validation)
- [ ] Tests `partnerWarrantyAllocation.test.js`: skill mismatch excluded; unauthorized excluded when brand has authorized partners; fallback flagged when it has none; out-of-area excluded; nearest wins; reject → next; timeout sweep → next; exhaustion → allocationFailed, not open pool

## Acceptance
- Every client criterion (#9) is either a filter or a ranking term, each covered by a test.
- An offered job never sits with a partner past 60 s + sweep interval, and exhaustion is always visible to Super Admin.

## Implementation Log
_Filled in when the phase is done._
