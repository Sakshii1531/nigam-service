# Phase 9 — SLA engine

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #15

## Goal
Every stage has a deadline; warnings and breaches surface to Super Admin.

## Tasks
- [x] `claimSla.service.js`: compute deadlines on the stage-start events (§7) from `Brand.warrantySla` → platform defaults (`PlatformSettings.warrantySla`, editable by Super Admin)
- [x] Sweep every 5 min from `server.js` (skipped in tests; exposed as a function for tests): warning at 80 %, breach at 100 %, once per stage; pause/resume clock across `On Hold`
- [x] Brand approval breach → auto-escalate (`flags.escalated`), notify Super Admin + that brand
- [x] `slaState` per claim in admin list (`ok | warning | breached`) + filter; per-brand SLA summary endpoint (`GET /super-admin/warranty-claims/sla-summary`)
- [x] Tests `partnerWarrantySla.test.js` with a fixed clock

## Example
```
LG approvalHours = 24, claim submitted 10:00 → brandApprovalDueAt next day 10:00
sweep at next day 05:12 (80 %)  → warning 'brandApproval', admin notified
sweep at next day 10:01          → breach 'brandApproval', escalated, admin + LG notified
```

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–9 uncommitted, as asked).

### Where the hours come from
Snapshotted on the claim at submission (`sla.hours`): the brand's `warrantySla` →
**`PlatformSettings.warrantySla`** (new; defaults 24 / 4 / 48 / 168 h; edited via
`PUT /api/v1/super-admin/settings` `{ warrantySla: { visitHours: 10 } }`, merged so
one value doesn't wipe the others) → built-in defaults.

### The four clocks
| Clock | Starts | Met at |
|---|---|---|
| Brand approval | submission (restarts on reopen to Brand Review) | Approved / Rejected |
| Partner assignment | Job Created (restarts on reassignment) | Partner Assigned or any later stage |
| Technician visit | Partner Assigned | On Way / In Progress or later |
| Resolution | submission (restarts on reopen) | Service Completed / Closed |

**Paused while On Hold or Info Requested** (waiting on the customer shouldn't count
against the brand or NCC); on resume every open deadline moves by the paused time.

### Sweep (`claimSla.service.runSlaSweep`, every 5 min from server.js)
- ≥ 80 % of a window → **warning**; ≥ 100 % → **breach**; each once per stage per cycle.
- Events: `SLA_WARNING` / `SLA_BREACHED` — brand-visible for the approval clock, internal for the rest.
- Notifications: admins for every warning/breach; the brand for its approval clock ("Awaiting Your Decision" / "Approval Deadline Missed — Escalated").
- **Approval breach → claim escalated** (`flags.escalated`, `ESCALATED` event). Never auto-approved (D8).
- Skips paused and finished claims; a claim changed mid-sweep (409) is retried next sweep.

### Visibility
- Admin list: `slaState` column + filter now read `sla.state` (ok / warning / breached).
- `GET /api/v1/super-admin/warranty-claims/sla-summary?from=&to=` — per brand: total, open, in warning, breached, approvals decided + **on-time %** + average hours, resolutions + on-time %; breached brands first.
- Admin detail shows the full `sla` block (hours, due dates, met times, state).
- Customers never see SLA data (tested).

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/claimSla.js` | rewritten — stage table, `startSla`, `applySlaTransition`, `evaluateSla`, pause/shift/restart (pure) |
| `backend/src/modules/partner-warranty/claimSla.service.js` | **new** — the sweep |
| `backend/src/modules/partner-warranty/claimTimeline.js` | applies SLA on every status move |
| `backend/src/modules/partner-warranty/warrantyClaim.model.js` | `sla.hours`, `sla.met`, `sla.pausedAt`, `sla.state` |
| `backend/src/modules/partner-warranty/warrantyClaim.service.js` | snapshot at submission |
| `backend/src/modules/partner-warranty/adminClaim.*` | `sla-summary`; list filter on `sla.state` |
| `backend/src/modules/super-admin/platformSettings.model.js` / `.service.js` / `.validation.js` | `warrantySla` (merged update) |
| `backend/src/modules/notifications/notification.service.js` | 4 SLA templates |
| `backend/src/server.js` | 5-minute SLA sweep |
| `backend/tests/partnerWarrantySla.test.js` | **new** — 13 tests (6 pure clock tests with fixed times, snapshot, sweep, pause, privacy, summary) |

### Verification
- `partnerWarrantySla.test.js`: **13/13**; partner warranty + super-admin tests: **173/173**.
- Full backend suite (single run, `--forceExit`): **59 suites, 878 tests passed**.
- ESLint clean.
