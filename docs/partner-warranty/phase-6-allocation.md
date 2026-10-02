# Phase 6 — Warranty-aware partner allocation

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #9, #10, #11 (payload)

## Goal
The job reaches the right nearby partner, and never gets stuck.

## Tasks
- [x] `rankServiceProviders` accepts `warranty: { brand, pincode }`; applies hard filters per ARCHITECTURE §6 (skill, brand authorization with D6 fallback, pincode/radius/city service area) and a tier bonus in the score; non-warranty bookings behave exactly as today
- [x] `assignServiceProvider` passes the warranty context when `sr.warrantyClaim` is set; excludes `declinedBy`
- [x] `declineAssignment` / timeout sweep: for warranty SRs, when nobody eligible remains, **do not** broadcast to the open pool; set `claim.flags.allocationFailed`, internal timeline event, Super Admin notification
- [x] `autoAssignPendingRequests` retries allocation-failed warranty SRs when partners come online; clears the flag on success
- [x] `job:assigned` socket payload for warranty SRs adds `brand`, `productName`, `issueName`, `jobId (NCCJ)`, `claimId (NCCW)`, `isWarranty: true`, `serviceLabel: 'Warranty Service'`, customer pincode/area
- [x] `listAvailableJobs` / job context include the same warranty fields
- [x] Admin endpoints to set a partner's `authorizedBrands`, `servicePincodes`, `serviceRadiusKm` — put in the partner-warranty module (`/super-admin/warranty-catalog/service-providers/:id`) instead of `adminServiceProvider.*`, which carry your uncommitted changes
- [x] Tests `partnerWarrantyAllocation.test.js`: skill mismatch excluded; unauthorized excluded when brand has authorized partners; fallback flagged when it has none; out-of-area excluded; nearest wins; reject → next; timeout sweep → next; exhaustion → allocationFailed, not open pool

## Acceptance
- Every client criterion (#9) is either a filter or a ranking term, each covered by a test.
- An offered job never sits with a partner past 60 s + sweep interval, and exhaustion is always visible to Super Admin.

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–6 are all uncommitted, as asked).

### Eligibility rules (warranty jobs only — ordinary bookings rank exactly as before)
`rankServiceProviders({ …, warranty: { brand, pincode } })`, in order:
| Rule | Kind | Detail |
|---|---|---|
| Active + Available | filter | unchanged (the admin shortlist still shows Busy/Offline) |
| Skill | **filter** | `specs` must include the category key — a generalist is never offered a warranty job (ordinary bookings still give generalists 40 %) |
| Brand authorization | **filter** when the brand has ≥ 1 Active authorized partner | otherwise skill-qualified partners are used and the claim is flagged `unauthorizedFallback` (D6) |
| Service area | **filter** | partner's `servicePincodes` (if any) must contain the pincode → else within `serviceRadiusKm` (default **25 km**) when both locations are known → else city match |
| Distance | ranking | nearest first when both locations are known (unchanged) |
| Workload, rating | ranking | unchanged weights |
| Tier | ranking | + 10 Senior SP, + 5 SP |

### Dispatch changes (`serviceRequest.service.js`)
- `assignServiceProvider` passes the warranty context for any SR with `warrantyClaim`; the chosen partner's `authorized` flag feeds D6.
- Every offer / decline / timeout is recorded on the claim as an **internal** timeline event ("Offered to Ravi", "Ravi declined", "Ravi did not respond in time") — the dispatch history Super Admin will see in Phase 8.
- `declineAssignment(id, sp, { reason })` — the 60 s timer and the 15 s sweep pass `'timeout'`.
- **All eligible partners exhausted → no open-pool broadcast** for warranty jobs; `allocationFailed` + one Super Admin alert. (Before, the job went to every partner in the city.)
- `autoAssignPendingRequests` (partner comes online) retries it and clears the flag.
- Warranty hooks are wrapped: a hook failure is logged and never breaks dispatch.

### Leak closed in the partner feed (`job.service.js`)
`listAvailableJobs` excluded nothing: an unassigned warranty job showed in every partner's open feed in that city, and any of them could accept it. Open offers now require `warrantyClaim: null`; a warranty job reaches a partner only by direct offer. Test: an unqualified partner in the same city neither sees nor can accept it (403).

### What the partner sees (client #11)
The `job:assigned` socket payload, the `/jobs/available` feed and `/jobs/:id/context` carry `warranty: { isWarranty, serviceLabel: 'Warranty Service', jobId (NCCJ), claimId (NCCW), brand, productName, issueName, modelNumber, serialNumber, area, pincode, visit }`; ordinary jobs carry `warranty: null`.

### Super Admin
- `GET/PUT /api/v1/super-admin/warranty-catalog/service-providers/:id` — `authorizedBrands` (must exist), `servicePincodes` (6 digits, de-duplicated), `serviceRadiusKm` (≤ 300); audited.
- `suggestServiceProviders` applies the warranty rules for warranty jobs and returns `authorizedForBrand`, `distanceKm`, `tier`.

### Files
| File | Change |
|---|---|
| `backend/src/modules/shared/assignmentEngine.js` | warranty filters, `inWarrantyServiceArea`, tier bonus, `cityMatches` extracted |
| `backend/src/modules/service-requests/serviceRequest.service.js` | warranty context, hooks, payload, no open pool for warranty, decline reason |
| `backend/src/modules/service-provider/job.service.js` | open feed excludes warranty jobs; `warranty` block in feed + context |
| `backend/src/modules/partner-warranty/claimDispatch.js` | **new** — offer/decline hooks, `markAllocationFailed`, `warrantyJobInfo` |
| `backend/src/modules/partner-warranty/claimJob.service.js` | uses the shared `markAllocationFailed` |
| `backend/src/modules/partner-warranty/claimStatus.js` | actions `PARTNER_OFFERED`, `PARTNER_DECLINED` |
| `backend/src/modules/partner-warranty/warrantyCatalog.*` | partner eligibility endpoints |
| `backend/tests/partnerWarrantyAllocation.test.js` | **new** — 14 tests |
| `backend/tests/partnerWarrantyJob.test.js` | timeline now includes `PARTNER_OFFERED` |

### The intermittent test failures — most likely cause
The one-off failures noted in Phases 1, 3 and 4 (and many more today under a
heavily loaded machine, load average 11–14) were **not** app bugs. With the new
error detail in `tests/helpers/jobFlow.js`, a failing login returned
`401 {"type":"authentication_error","message":"Invalid authentication"}` — a
response format the app never produces. supertest starts the app with
`listen(0)` on every interface and then connects to `127.0.0.1:<port>`; a local
tool (`agy`) holds many ephemeral ports on `127.0.0.1` only, macOS lets both
binds succeed, and the request lands on that tool instead of the app. (Strong
evidence — the foreign 401 body and `agy`'s loopback-only listeners — but I did
not catch a colliding port in the act.) Separately, under the heaviest load some
files' `beforeAll` (connect + dropDatabase) exceeded Jest's 20 s hook timeout:
local MongoDB stalling, not code.

Fix (tests only): `tests/helpers/loopbackServer.js` binds the test server to
127.0.0.1 itself; all six partner-warranty test files use it. **The other
~50 test files in the suite have the same latent problem** — worth applying
the same helper there (e.g. via a shared setup) as a separate change.

### Verification
- Partner warranty tests (all 6 files): **77/77**, three consecutive runs.
- Full backend suite (single run, `--forceExit`, load < 8): **56 suites, 841 tests passed**.
- Process note: two earlier full runs overlapped — a run that had printed its results but never exited (a test timed out under load and left a request open) was still alive when the next started, and both hit the same test databases. Final verification used one run at a time with `--forceExit`.
- ESLint: clean on new code (two pre-existing unused `City` imports remain).
