# warranty-amc-exchange

**Exchange trade-in domain is built** (Phase 5): `ExchangeQuestionSet` (admin-editable), `ExchangeCampaign`, `ExchangeRequest`, pure valuation formula in `exchangeValuation.js`. `POST /exchange/valuate` quotes without persisting; `POST /exchange/requests` persists the computed value (never recomputed later); an `ExchangeRequest` can only be applied to one `Order`.

**Deferred** (deliberately, see `../../../docs/DATA_MODEL.md` Phase 5 addendum): `ExtendedWarrantyOrder`, `AMCPlan`/`AMCSubscription`/`AMCVisit`, `Claim` — the models exist (Phase 1) but have no service/routes layer yet. See BACKEND_CONTEXT.md §3.7, §3.9.
