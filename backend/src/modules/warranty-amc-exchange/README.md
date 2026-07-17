# warranty-amc-exchange

**Exchange trade-in domain is built** (Phase 5): `ExchangeQuestionSet` (admin-editable), `ExchangeCampaign`, `ExchangeRequest`, pure valuation formula in `exchangeValuation.js`. `POST /exchange/valuate` quotes without persisting; `POST /exchange/requests` persists the computed value (never recomputed later); an `ExchangeRequest` can only be applied to one `Order`.

**Physical-inspection gate (Phase 11 security fix)**: `ExchangeRequest.estimatedValue` is entirely self-reported by the customer, so `buy-commerce/order.service.js` will only apply it as a checkout discount once `status === 'Inspection Approved'`. Nothing in this module transitions that status — it's done by a super-admin via `../super-admin/exchangeRequest.routes.js` (`PATCH /super-admin/exchange-requests/:id/status`) after physically receiving/verifying the traded-in device. See `../../../docs/DATA_MODEL.md`'s Phase 11 addendum for the full reasoning, including the open product question about whether approval should stay platform-wide super-admin or move to a brand/warehouse-scoped role.

**Deferred** (deliberately, see `../../../docs/DATA_MODEL.md` Phase 5 addendum): `ExtendedWarrantyOrder`, `AMCPlan`/`AMCSubscription`/`AMCVisit`, `Claim` — the models exist (Phase 1) but have no service/routes layer yet. See BACKEND_CONTEXT.md §3.7, §3.9.
