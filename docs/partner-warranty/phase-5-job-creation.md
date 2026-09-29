# Phase 5 — Approval → automatic Service Job

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #8, #19

## Goal
Brand approval creates the separate Service Job and starts dispatch, with no
human in between.

## Tasks
- [ ] `claimJob.service.createServiceJobForClaim(claim, { session })` per ARCHITECTURE §5 — `ServiceRequest` with `humanId` `NCCJ-{YYYY}-######`, `warrantyClaim`, `requestMode: 'B2B2C'`, `warranty: 'In Warranty'`, address → `zone`/`pincode`/`customerLocation`, documents → `attachments`
- [ ] Approve runs in a transaction (`utils/transaction.js`): claim Approved → Job Created + SR create, both or neither
- [ ] After commit: `assignServiceProvider(sr, null)`; "no eligible partner" is not an error for approval — it sets `allocationFailed` (Phase 6 refines)
- [ ] Idempotent: approving a claim that already has a `serviceRequest` never creates a second job
- [ ] `acceptJob` for an SR with `warrantyClaim` → Job `type: 'Brand Warranty'`, `isPartner: true`, payout from brand RateCard
- [ ] Warranty SR is free to the customer: billing step collects ₹0 service charge (verify existing covered-job billing path; spare parts under warranty are FOC)
- [ ] Tests `partnerWarrantyJob.test.js`

## Example
```
POST /brand/warranty-claims/{NCCW-2026-000001}/approve
→ claim.status 'Job Created', claim.serviceRequest → SR { humanId: 'NCCJ-2026-000001', brand: LG, category: 'AC', requestMode: 'B2B2C' }
→ SR status 'Assigned' to the top eligible partner (or claim.flags.allocationFailed = true)
```

## Acceptance
- Claim and job are separate documents with separate IDs, linked both ways.
- A failure mid-approval leaves neither an approved claim without a job nor an orphan job.

## Implementation Log
_Filled in when the phase is done._
