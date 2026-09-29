# Phase 11 — B2B2C payout (manual, product-wise)

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #20

## Goal
Partners see B2B2C (partner brand warranty) earnings in Invoice Payout as
totals, by brand and by product; settlement is manual by NCC.

## Tasks
- [ ] Earnings summary: new `b2b2c` bucket = completed Jobs whose SR has `warrantyClaim`; `{ amount, jobs, byBrand: [{brand, jobs, amount}], byProduct: [{category, jobs, amount}], settled, pending }`
- [ ] Keep EW/AMC in the existing invoice bucket but separate from `b2b2c`
- [ ] `requestPayout` rejects `payoutType: 'Invoice'` from partners (manual only)
- [ ] Super Admin: `GET /super-admin/b2b2c-payouts?serviceProvider=&month=` (unsettled jobs grouped by partner) and `POST /super-admin/b2b2c-payouts/settle` `{ serviceProviderId, jobIds, reference, note }` → creates a `Payout` (type Invoice, Settled), marks jobs `payoutSettled`
- [ ] Tests `partnerWarrantyPayout.test.js`

## Implementation Log
_Filled in when the phase is done._
