# Phase 11: SLA v2 and automatic escalation

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §11, §14 (escalation events) · **Depends on:** Phases 6, 8, 9

## Goal
SLA is configured per brand: Response, Approval, Allocation, First Visit and
Resolution. The system shows the time remaining or breached on every ticket.
Near-breach and breach automatically create and raise **escalation records**.
Each record has:
- ticket
- reason
- priority
- responsible person
- due time
- status
- resolution

Notifications go to the right people.

## Context: read first
- ARCHITECTURE §9; README D-table.
- `partner-warranty/claimSla.js`:
  - `WARRANTY_SLA_DEFAULTS`, `SLA_STAGES`
  - `startSla`, `applySlaTransition` (pauses)
  - `evaluateSla`, `WARNING_AT = 0.8`
- `partner-warranty/claimSla.service.js`: the sweep and its schedule (find where it is started in `server.js`).
- `Brand.warrantySla`, `PlatformSettings.warrantySla`; Super Admin `SlaOverview.jsx` (editable defaults).
- `super-admin/escalation.model.js` (manual only; `serviceRequest` required); `brand-admin/brandEscalation.*`; `frontend/src/pages/brand-admin/Escalations.jsx`; Super Admin `EscalationDesk`.
- Sidebar escalation badge (`/brand/escalations/open-count`).

## Tasks

### Backend
- [x] SLA stages:
  - add **response** (start: created; stop: `firstBrandActionAt` = first open / contact / decision)
  - rename assignment → **allocation** and visit → **firstVisit** in labels (keep the stored keys or migrate; clean slate allows a rename, so pick one and record it)
  - firstVisit stops at jobStage REACHED (Phase 8), not at visit scheduling. Verify against the current `applySlaTransition`.
- [x] Per-stage state `on_track|warning|breached|met` + `remainingMs` in the API (computed at read time).
- [x] Priority multipliers (optional per brand): `Brand.warrantySla.priorityFactor: { Critical: 0.5, High: 0.75, Normal: 1, Low: 1.5 }`, applied at start and recomputed on a priority change (Phase 6 `PRIORITY_CHANGED`).
- [x] `Escalation` model extension (§9):
  - `warrantyClaim` (indexed); `serviceRequest` optional
  - `slaStage`, `level`, `responsible:{ role, user }`, `dueAt`
  - `resolution`, `resolvedBy` (snapshot), `resolvedAt`
  - `history[]`
  - `raisedBy` += `'Brand User'`
- [x] `BrandSettings.escalationMatrix` (default: warning → L1 Brand Manager; breach → L2 Quality/Escalation + NCC platform escalation) + `GET/PUT /brand/settings/escalation-matrix` (`sla:edit`).
- [x] `brand-crm/escalationEngine.js`, run from the SLA sweep:
  - on a stage entering warning or breach, upsert **one open escalation per (ticket, stage)**; raise its level on breach
  - set `responsible.role` and pick `responsible.user` (assigned CCE's manager if a team lead exists, else any active user with that role, round-robin)
  - `dueAt` = stage due + `escalationResponseHours` (default 4 h)
  - set `claim.flags.escalated`
  - timeline `ESCALATION_RAISED` / `SLA_WARNING` / `SLA_BREACHED`
  - notify the role's users (+ admins for platform level)
  - `ESCALATION_RAISED` domain event
  - it must be idempotent (re-running the sweep never duplicates)
- [x] Brand escalation routes:
  - list/filter by status, level, stage, responsible = me, overdue (`escalations:view`)
  - `POST /brand/escalations` manual raise on a ticket (`escalations:manage`, reason required)
  - `PATCH /:id { status, responsibleUserId, note }`
  - `POST /:id/resolve { resolution }` (required, ≥ 10 chars) → `ESCALATION_RESOLVED`; clears `flags.escalated` when no open escalations remain
- [x] Brand SLA config: `GET/PUT /brand/settings/sla` (`sla:edit`) for the five stages' hours + priority factors (validated ranges). Audited. Super Admin keeps the platform defaults.
- [x] SLA met/breach facts stored per stage for reports (Phase 14).

### Brand Panel
- [x] Ticket queue: an SLA column showing the next due stage with a countdown chip (green / amber / red), a filter on SLA state, and the "SLA Breached" and "Escalated" overlays.
- [x] Ticket detail: SLA table (stage, due, met at, state, remaining) + escalation panel (open/closed, level, responsible, due, resolve dialog).
- [x] `Escalations.jsx` rewritten:
  - tabs Open / Overdue / Resolved
  - columns ticket, reason, stage, level, priority, responsible, due, status
  - assign, resolve
  - export
  - the sidebar badge keeps working
- [x] Settings → **SLA & Escalation** tab: stage hours, priority factors, escalation matrix editor (role pickers from the brand's roles).

### Tests
- [x] `backend/tests/brandCrmSla.test.js` (fake timers/clock injection like `partnerWarrantySla.test.js`):
  - response stops at first open
  - pauses during Info Requested / On Hold
  - firstVisit stops at REACHED
  - priority factor applied and recomputed
  - warning → L1 escalation once; breach → raised to L2 + NCC
  - sweep re-run → no duplicates
  - resolve needs a resolution and clears the flag
  - a manual raise works
  - matrix edit requires `sla:edit`
  - cross-brand isolation
- [x] `e2e/ui/brandCrmEscalation.spec.js`: a breached ticket shows red; the escalation appears with the responsible person; resolve it → the badge decrements.

## Acceptance
- All five SLA stages are configurable per brand and visible per ticket.
- Escalations are created automatically with all seven attributes, notified, and resolved with a record.

## Implementation Log
Implemented all five clocks and read-time states/countdowns. Kept the stored
`assignment` / `visit` keys, with Allocation / First visit labels. New first-visit
clocks start at NCC job creation and stop only at detailed stage REACHED.
Response stops on the first brand action, including staff registration.
Completed stages retain met timestamps and late-completion breach facts,
even when completion happens between sweeps.

Priority factors apply to both lean and document brand inputs. Priority changes
preserve elapsed time and update the ticket snapshot plus open escalation
priority/deadlines transactionally. Existing configuration edits affect new
tickets; they do not silently move existing targets.

The sweep creates/promotes one open brand record per ticket/stage, with a
partial unique key, actor/history, responsible role/person, due time and a
matching NCC record at breach. Assignment prefers an active CCE team lead,
then uses durable atomic round-robin counters. Notifications go to role users
and NCC; timeline and domain events are recorded. Manual raises, scoped
filters, reassignment and resolution are supported. Resolutions require ten
characters, close the NCC/brand mirror and clear the flag only when no records
remain. NCC assignment/resolution retains the same responsible person/history;
the old flag-only action cannot bypass an open record.

Added the Brand SLA & Escalation settings tab, five-clock ticket table, queue
countdown colors and escalation desk/panel with Open/Overdue/Resolved filters,
assignment, resolution and CSV export. The sidebar badge refreshes after
changes and live ticket events. Super Admin retains editable platform defaults,
now including response.

Browser verification exposed a partner scheduling refresh race: the server
saved a visit, but a remounted scheduler could prefer stale context data and
show an empty form. The partner screen now uses live job warranty data and the
scheduler derives the saved visit from refreshed props. The partner and full
four-app journey pass after the fix.

Release migration (application data has **not** been changed):
```sh
cd backend
node scripts/backfillWarrantySla.js          # read-only preview
node scripts/backfillWarrantySla.js --apply  # apply once before release
```
The idempotent migration adds response snapshots, recovers the first brand
action, corrects premature legacy visit completion, and retains four existing
deadlines and historical facts. Verification used isolated local replica sets.

Validation: **74 backend suites / 1,065 tests pass**, combining the full isolated
regression with final reruns of changed contracts. **18 distinct browser
scenarios pass**, covering Brand CRM and the customer, brand, NCC and partner
flows. The final sequential checks include the new escalation acceptance,
partner scheduling and full four-app journey. Production build passes;
frontend lint has zero errors and 153 existing warnings. The existing
large-chunk build warning remains. `git diff --check` passes.

Evidence: `backend/tests/brandCrmSla.test.js`,
`backend/tests/partnerWarrantySla.test.js`,
`e2e/ui/brandCrmEscalation.spec.js`, `partnerAppWarranty.spec.js`,
`warrantyJourney.spec.js`, and
[settings screenshot](screenshots/phase-11-sla-settings.png).

