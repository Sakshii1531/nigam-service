# Phase 9 — SLA engine

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #15

## Goal
Every stage has a deadline; warnings and breaches surface to Super Admin.

## Tasks
- [ ] `claimSla.service.js`: compute deadlines on the stage-start events (§7) from `Brand.warrantySla` → platform defaults (`PlatformSettings.warrantySla`, editable by Super Admin)
- [ ] Sweep every 5 min from `server.js` (skipped in tests; exposed as a function for tests): warning at 80 %, breach at 100 %, once per stage; pause/resume clock across `On Hold`
- [ ] Brand approval breach → auto-escalate (`flags.escalated`), notify Super Admin + that brand
- [ ] `slaState` per claim in admin list (`ok | warning | breached`) + filter; per-brand SLA summary endpoint (`GET /super-admin/warranty-claims/sla-summary`)
- [ ] Tests `partnerWarrantySla.test.js` with a fixed clock

## Example
```
LG approvalHours = 24, claim submitted 10:00 → brandApprovalDueAt next day 10:00
sweep at next day 05:12 (80 %)  → warning 'brandApproval', admin notified
sweep at next day 10:01          → breach 'brandApproval', escalated, admin + LG notified
```

## Implementation Log
_Filled in when the phase is done._
