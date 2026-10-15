# Four-panel review against both client briefs — 15 October 2026

## Verdict

The normal connected workflow is implemented. The two defects originally
reproduced in this review have now been corrected, with rollback/retry and
foreign-reference regressions. Super Admin can now manage policy and serial
setup for any selected brand, alongside the existing catalogue/rate controls.
Real-account client acceptance remains pending approved warranty/rate setup
and the client business-default confirmations.

The probes and configuration findings below record the original review state.
See [the follow-up fix log](phase-19-e2e-acceptance.md#follow-up-four-panel-client-flow-fixes-15-october-2026)
and [Super Admin setup directions](WALKTHROUGH.md#super-admin-setup-for-all-brands-and-products).

This review covers both supplied briefs: **Partner Warranty Flow – Backend +
Brand Panel Integration Required** (20 requirements) and **NCC Brand Panel /
Brand CRM** (22 requirements). It checks source, automated journeys, isolated
failure/privacy probes and a read-only configuration check. It is not a
deployment or an unrestricted production UI walkthrough.

## What works across the four panels

| Panel | Verified behavior | Qualification |
|---|---|---|
| Customer/User | Brand/product/issue selection, proof upload, dynamic claim ID, automatic brand routing, information response, tracking, visit/partner updates, completion confirmation and rating | Customer views allowlist relevant fields and hide internal notes/payout; the brand must be warranty-enabled to be listed |
| Brand Admin | Unified app/CCE/Toll-Free/manual/intake tickets, policy verification and approval, Customer 360, job/parts/SLA/communication history, live dashboards, rates, invoices/payments/reports, RBAC and audit | Replacement-reference isolation defect F1 is now corrected and regression-tested |
| NCC Super Admin | All-brand visibility/filters, linked jobs, allocation intervention, hold/cancel/reopen/reassign/status controls, SLA/eligibility/catalogue configuration, parts fulfillment, Brand billing and manual B2B2C settlement | Settlement rollback/retry defect F2 is now corrected and regression-tested |
| Service Provider | Warranty offers, acceptance, visit scheduling, brand/product/customer documents, onsite stages/parts, completion, B2B2C earnings by brand/product and manual settlement history | Warranty earnings remain outside the withdrawable balance; failed settlement writes now roll back atomically |

The implemented chain is:

Customer App / CCE / Toll-Free / Manual / WhatsApp-ready API → one master ticket
(NCCW + brand ticket number) → verification/approval → separate linked NCCJ job
→ eligible partner offers/acceptance → visit/service/parts → completion →
customer confirmation/closure → brand charges/invoice/dues/receipts → reports.

NCC Super Admin sees submitted claims before approval. Approval creates the
service job; it does not create a second master complaint. Partner B2B2C
settlement and the brand's invoice/payment are separate financial workflows.

## Originally confirmed defects — corrected in the follow-up

### F1 — High: replacement requests can reference another brand's job

Relevant source:

- `backend/src/modules/brand-admin/replacementApproval.service.js:47` creates
  an approval with the caller's brand but does not validate that the supplied
  service request belongs to that brand.
- The listing at line 22 populates that service request and its customer's
  name without a tenant match.
- `replacementApproval.routes.js` exposes these operations to users with the
  relevant operations permission. Scoping the replacement record itself does
  not prove ownership of its linked job.

An isolated service-level probe created fake Brand A and Brand B, a fake
customer/job belonging to B, then submitted the B job reference while creating
an A replacement request. A's listing returned:

```json
{
  "brandACreationAccepted": true,
  "listedForeignJob": "NCCJ-BRAND-B-PRIVATE",
  "listedForeignCustomer": "Private customer of Brand B"
}
```

Impact: violates Brand CRM requirement 22's isolation of another brand's
customers/service data. The successful ticket/report isolation tests do not
cover this linked-reference case. No real customer data was used for the probe.

Required correction: validate job ownership before creation, constrain linked
reads/populates to the current brand, validate any supplied partner reference,
and add an API regression covering forged foreign-job references and legacy
inconsistent rows. Review similar legacy linked-reference mutations too.

### F2 — High: failed B2B2C payout creation leaves jobs falsely settled

`backend/src/modules/partner-warranty/b2b2cPayout.service.js:132` marks jobs
settled before creating the Payout at line 149, linking it at line 159 and
writing the audit. These writes are not one transaction. The compensation
branch handles a competing claim, not a subsequent payout-record write failure.

An isolated probe made `Payout.create` throw after the job update. Result:

```json
{
  "jobSettlementAfterFailure": "settled",
  "linkedPayout": null,
  "payoutRecords": 0
}
```

Retry returned HTTP-style status 409 with **One or more jobs are already
settled**. Therefore the ordinary manual settlement path works, but failure
recovery can leave the partner's job settled without its invoice payout record.

Impact: Partner Warranty requirements 17/20 (audit and manual Invoice payout)
are not robust under a write failure. Existing concurrent/double-payment
tests pass but do not exercise this failure boundary.

Required correction: atomically persist settlement, payout linkage and audit
with replica-set transactions, emit notifications after commit, and test
rollback/retry when payout creation, linkage or audit persistence fails.

## Existing-account and brand readiness check

Read-only inspection of the configured database found:

| Account's brand | Access | Partner Warranty enabled | Active warranty policies | Active call-rate rows | Active, available, explicitly brand-authorized partners |
|---|---|---|---|---|---|
| Reported user's brand | Brand Super Admin, 43 brand permissions | No | 0 | 0 | 0 |
| Demo Brand | Brand Super Admin, 43 brand permissions | No | 0 | 0 | 0 |

The earlier legacy-owner access repair remains effective. However, permission
restoration does not configure warranty intake, policies or prices.

`warrantyCatalog.service.js` lists customer-facing brands only when Active and
`warrantyEnabled: true`. These brands therefore will not appear as enabled
Partner Warranty choices until NCC enables them. Missing rates also prevent
verifying the expected configured call amount; a missing-rate flag/zero
placeholder is not a validated client price.

Zero explicitly authorized available partners does not alone prove no partner
is eligible: the current allocation logic can fall back to skill-qualified
partners when a brand has no active authorized partners. Confirm the intended
partner's service area, skill, status, availability and authorization rule.

Before the real-account walkthrough:

1. NCC → Warranty Catalogue: enable the intended brand and category/issue flow.
2. Brand → Warranty Settings: configure matching policy, proof/serial rules and
   coverage; populate required serial-registry entries.
3. Brand/NCC → Call Rates: configure active category/service/state/city rates
   and partner payout, with correct effective dates, GST and terms.
4. NCC → Partner eligibility/service-provider setup: prepare a suitable online
   partner for the customer's location.
5. Verify role permissions and run the customer-originated complaint journey
   in [WALKTHROUGH.md](WALKTHROUGH.md), followed by brand invoicing and the
   separate NCC partner settlement.

No configuration or account data was changed during this review.

## Partner Warranty brief: 20 requirements

“Implemented” indicates traced implementation and selected regression coverage,
not certification of every deployment/provider or every possible failure.

| # | Requirement | Assessment / evidence |
|---|---|---|
| 1 | Customer selection, proof and product fields | Implemented; customer steps in `warrantyJourney.spec.js` |
| 2 | Real claim, full details and dynamic-year NCCW ID | Implemented; `partnerWarrantyModel`, `partnerWarrantyClaim` |
| 3 | NCC all-brand module, columns and filters | Implemented; `partnerWarrantyAdmin`, `adminWarranty.spec.js` |
| 4 | Complete detail and timeline | Implemented; claim views, timeline writer and journey |
| 5 | Automatic routing by brand ID | Implemented; shared claim brand reference and brand-scoped queue |
| 6 | Brand own claims, approval/rejection/info | Implemented; `partnerWarrantyBrand`, Brand CRM actions |
| 7 | Info request, customer response, same claim | Implemented; request/document paths and journey coverage |
| 8 | Separate automatically linked NCCJ service job | Implemented; `partnerWarrantyJob`, approval transaction |
| 9 | Eligible nearby partner ranking | Implemented; skill/area/availability filters, authorization and weighted ranking |
| 10 | Accept/reject/timeout/next candidate | Implemented; `partnerWarrantyAllocation`, assignment sweep |
| 11 | Partner warranty job/context/scheduling | Implemented; `partnerAppWarranty.spec.js` |
| 12 | Live Customer/Brand/NCC updates | Implemented; `warrantyJourney.spec.js` |
| 13 | Customer-relevant tracking/private-field exclusion | Implemented; customer-view allowlist and sync tests |
| 14 | NCC intervention and manual control | Implemented; admin backend tests and `adminWarranty.spec.js` |
| 15 | SLA fields, warnings/breaches | Implemented; SLA services/tests and NCC SLA screen |
| 16 | Event notifications by party | Implemented; notification/event tests; actual external delivery requires configured providers |
| 17 | Audit actor/action/status/reason | Implemented; F2 follow-up makes payout audit atomic |
| 18 | Future CRM API/webhook events | Implemented; domain outbox, signed retrying webhooks and later intake-key API |
| 19 | Exact connected cross-panel architecture | Normal journey verified; F1/F2 corrected; actual brand setup remains pending |
| 20 | B2B2C manual Invoice payout, totals/product split | Normal path and F2 rollback/retry regressions verified |

## Brand CRM brief: 22 requirements

| # | Requirement | Assessment / evidence |
|---|---|---|
| 1 | One centralized ticket for all sources | Implemented; shared ticket creator and source tests |
| 2 | App fields/documents flow into Brand | Implemented; customer intake/journey; configured brands must be enabled |
| 3 | Approval/reject/hold/info/document/contact + actor | Implemented; approval, communication and RBAC suites |
| 4 | Per-brand warranty/policy evaluation | Implemented; policies/serials/overrides; existing checked brands have no active policies |
| 5 | Individual CCE IDs/ownership/restrictions | Implemented; registration and RBAC suites |
| 6 | Mobile search and Customer 360 | Implemented; customer membership, duplicate guard, scoped history |
| 7 | Brand approval → linked NCC job, no duplicate | Implemented; ticket/job and journey tests |
| 8 | Suitable automatic allocation incl. SLA/load | Implemented; allocation/ranking tests |
| 9 | Detailed live job stages | Implemented; stage sync and cross-panel browser journey |
| 10 | Parts approval/fulfillment/installation | Implemented; Brand CRM journey and parts services |
| 11 | SLA/escalation responsibility/resolution | Implemented; SLA/escalation suites |
| 12 | WhatsApp backend ready | Implemented; API keys, catalogue/upload/intake/idempotency; production bot separate |
| 13 | Toll-Free existing/new customer registration | Implemented; registration and Brand CRM journey |
| 14 | Complete communication/activity timeline | Implemented; actor-stamped writer and communication tests |
| 15 | Geographic rates connected to real jobs | Implemented; rate resolver/frozen charges; existing checked brands need rates |
| 16 | Brand billing/GST/dues/payments | Implemented; transactional brand invoice/receipt tests; distinct from partner payout F2 |
| 17 | Filtered state/city call/billing report/export | Implemented; reports suite and journey |
| 18 | Module/action roles and departments | Implemented; RBAC suite and existing-account read-only verification |
| 19 | Audit coverage | Implemented; F2 correction adds atomic payout audit persistence |
| 20 | Connected single ticket-detail history | Implemented; detail and journey tests |
| 21 | Actual-data dashboard and analytics | Implemented; dashboard/report services and suites |
| 22 | Per-brand config and strict tenant isolation | Central scopes and F1 linked-reference correction verified |

## Verification performed on 15 October 2026

- Browser: **5/5 selected tests passed**:
  `adminWarranty.spec.js`, `brandCrmJourney.spec.js`,
  `brandCrmOperations.spec.js`, `partnerAppWarranty.spec.js`,
  `warrantyJourney.spec.js`.
- These use independent Customer/Brand/NCC/Partner sessions, but some onsite,
  parts and finance transitions are driven over HTTP. They do not establish
  that every control on every screen was clicked.
- Backend: **all 36 selected suites passed across the primary and recovery
  runs**, covering `brandCrm|brandEscalation|partnerWarranty|assignmentEngine`.
  This is not a claim that the entire repository test suite was run.
- The primary run recorded 27 passing suites and 9 failed suites. Eight were
  interrupted by local MongoDB open-file exhaustion; one had the obsolete
  audit fixture described below. The first recovery passed Audit, Events and
  JobStage, then the reused database crashed again despite a higher open-file
  limit. A fresh isolated replica set passed all six remaining suites
  (36 tests). Thus every selected suite has a successful run; the original
  broad invocation itself was not green.
- One audit test used a nonexistent random job ID for document generation. It
  was updated to create an owned job, preserving the document audit assertion
  and the newer ownership validation. This is a test-fixture correction, not
  an application behavior change.
- Two isolated probes reproduced F1/F2 using fake local data; their dedicated
  databases were dropped afterwards.
- Existing walkthrough screenshots were backed up before browser tests and
  restored afterwards. Existing user work was preserved.
- No application implementation or configured-database data was changed during
  the initial review. The follow-up changes application code as documented in
  the fix log; configured-database business values remain unchanged.

## Client decisions still outstanding

The five existing defaults remain unconfirmed: visibility of customer-paid B2C
bookings, who edits rates, billing period/drafting rules, parts approval threshold
rules, and customer-unavailable visit charges. Also note that partner selection
uses weighted suitability (distance/workload/rating/tier/SLA), so it is not a
promise that the shortest GPS distance always wins irrespective of other factors.

Accept the normal flow as implemented/tested. Keep complete client acceptance
open until actual brand configuration is completed and the client confirms the
business defaults. F1/F2 are corrected; the original probes above explain the
failure boundaries now covered by regression tests.
