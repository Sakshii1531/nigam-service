# Phase 3 readiness review

Original review: 2026-10-08. The review itself changed no application code. The subsequent authorized fixes are recorded in the resolution log below; the Customer 360 feature remains not started.

The architecture is moving in the right direction. Keep `WarrantyClaim` as the
master ticket, `ServiceRequest` as the approved execution job, and `User` as
platform customer identity. The centralized intake, actor snapshots and
deny-by-default route rules are useful foundations. Resolve the findings below
before treating the Phase 3 specification as implementation-ready.

## Existing code issue

### High: current permissions can authorize an old brand token

`backend/src/modules/brand-crm/brandPermission.middleware.js:56` loads the
database user's current brand and permissions but never compares that brand
with `req.user.brand`. Handlers continue to scope queries using the brand from
the JWT. `super-admin/brandAdmin.service.js` permits brand reassignment and
invalidates the permission cache, but an already-issued access token still
contains the previous brand.

Reproduced with temporary local fixtures: a database user assigned to brand B
with `customers:view`, passed to the permission middleware with brand A in the
request identity, was accepted. This is a middleware reproduction; a complete
reassignment-through-HTTP scenario was not run.

Reject a mismatch between the authenticated token scope and the database
scope, and check the current coarse role as well. Add a regression test using
an old token after brand reassignment. This should precede the new Customer
360 routes.

## Phase 3 specification gaps

### High: creating a customer does not establish a brand relationship

The phase defines a linked customer through tickets, appliances or legacy
jobs, but customer creation makes only a platform `User`. A new customer has
none of those links. The required UI flow “create customer → profile opens”
therefore conflicts with `getProfile` returning 404 for unlinked customers.
The duplicate modal also cannot offer a full profile for a platform-only match.

Add an explicit, audited brand/customer relationship, preferably a small
`BrandCustomer` model with unique `{brand, customer}`. Creation establishes
this relationship; existing ticket/product/job links also continue to grant
access. Finding a platform customer by phone must not itself grant full
profile access. Phase 4 can establish a relationship when registering that
customer's ticket. Never fabricate a ticket or appliance to make a profile
accessible.

### High: customer notification history is not brand-scoped

`notifications/notification.model.js` stores a recipient but no brand or ticket
reference. Selecting notifications by customer alone would include activity
from other brands. Timeline events can be selected through this brand's
tickets, excluding internal visibility; arbitrary recipient notifications
cannot safely be included.

Use brand-scoped ticket contact events now. Include only notifications with a
verifiable relationship to this brand's ticket; otherwise defer those entries
until Phase 9 adds explicit notification provenance. Reuse the brand/customer
relationship predicate in `brandActions.service.js`, whose notification guard
currently recognizes only ServiceRequest history.

### Medium: provisioned customers cannot use the ordinary login screen

README D16 assumes OTP sign-in after creating an unusable password hash.
`auth.service.js:140` and `frontend/src/pages/Login.jsx:309` require a password
before reaching OTP. The backend OTP-send endpoint can initiate login without
a password, but the normal customer login screen does not expose that flow.

Define and test a customer OTP onboarding/sign-in path, or explicitly record
it as a delivery dependency. Do not claim that CCE-created users can sign in
normally based only on creating their User row. Signup already requires ten
digits; exact-string lookups and the own-profile phone update need review
when introducing normalization. Normalize consistently through OTP issuance,
verification, lookup and writes, with duplicate-key handling for concurrent
creates. `User` also needs an `alternatePhone` field.

### Medium: CSV export needs a query-sensitive permission check

The existing `GET /customers` rule grants `customers:view`. Adding
`?format=csv` leaves the method and path unchanged, so the route table alone
will not enforce `customers:export`. Require export permission additionally
inside the export branch, or use a separate export path and update the plan.
The frontend fetch wrapper assumes JSON, so CSV needs an authenticated
download path too.

### Medium: appliance links and warranty estimates need careful reuse

Adding `brandRef` is appropriate. Resolve it consistently in customer
appliance create/update, ticket intake and fixtures; define how existing
name-only appliances are handled under the clean-slate decision. Normalize
serial/model identifiers and enforce a race-safe upsert identity. Repeated
tickets must not erase existing purchase dates or invoice details.

Do not call `withWarranty` unchanged for Brand CRM warranty verification:
it applies customer-wide AMC/extended-warranty overlays to an appliance,
and treats a missing purchase date as Out of Warranty. Ticket intake instead
returns Verification Required for missing dates. Keep NCC paid cover separate
from the brand's base warranty and align the displayed estimate with ticket
intake until the Phase 5 policy engine arrives.

## Implementation fit

- Put customer services, validation and routes in `brand-crm`; replace the
  old customer route rather than mount a competing handler.
- Derive ticket totals from brand-scoped master tickets. Joining their NCC
  jobs must not count the same complaint twice. Legacy jobs may establish a
  relationship, but customer-paid B2C jobs stay outside ticket totals (D5).
- Keep search, sorting, count and pagination in Mongo. Add indexes for the
  brand/customer joins and an explicit bounded export strategy.
- Preserve the existing JSON envelope: pagination uses `meta`, available via
  `apiRequest(..., { envelope: true })`. Update both `Customers.jsx` and the
  paused `RegisterComplaint.jsx` consumer.
- Decide explicitly which customer details are platform-owned versus
  brand-specific. Editing shared User addresses/name affects other brands
  serving the same person; document this behavior and allowlist editable fields.
- Keep phases 4–9 features staged: registration remains paused until Phase 4;
  detailed job stages, closure/rating fields and contact logs may legitimately
  be empty until their later phases. Show honest empty states.

## Verification

Fresh run against an isolated local MongoDB at `127.0.0.1:27018`, with external
services isolated by the existing test setup:

```sh
MONGODB_TEST_URI=mongodb://127.0.0.1:27018/nigam_care_review npm test -- \
  --runTestsByPath tests/brandCrmTicket.test.js tests/brandCrmRbac.test.js \
  tests/partnerWarrantyClaim.test.js tests/partnerWarrantyBrand.test.js \
  tests/brandAdmin.test.js --forceExit
```

**5 suites, 124 tests passed.** The first attempt could not connect because
the default local database was stopped; the isolated rerun succeeded. The
review database used standalone MongoDB, so transaction rollback was not
verified. The full backend suite and browser suites were not rerun for this
review; their prior results remain historical evidence in the phase logs.

Recommended order: fix the token-scope guard, clarify customer relationships
and onboarding in the architecture/phase plan, then implement Phase 3 with
cross-brand, duplicate-create, export-permission and pagination tests alongside
the specified profile UI tests.

## Resolution log — 2026-10-08

The user authorized fixing the findings before implementing Phase 3.

Implemented:

- Permission checks now reject a token/database brand mismatch and a changed
  database role, including universal brand routes and shared guarded routes.
  The regression reassigns a brand admin through the Super Admin HTTP endpoint,
  verifies old-token rejection, and verifies a fresh login succeeds.
- Added shared phone normalization across customer login, OTP send/verify,
  signup, password recovery and own-profile writes. Added the customer login
  screen’s “Sign in with OTP” option. Suspended users cannot request or verify
  login OTPs, including an OTP requested before suspension.
- Added BrandCustomer’s unique brand/customer relationship model and the
  read-only `isBrandCustomer` predicate. Brand contact actions now recognize
  ticket-only, appliance-only and explicit CRM customers as well as legacy
  service history. Another brand’s customer remains inaccessible.
- Added appliance `brandRef` and indexed customer/brand lookup. Registration
  and edits resolve the reference by brand name; changing to an unknown brand
  clears the old reference.
- Notifications now store optional brand and ticket provenance. Ticket
  submission, approval/rejection/info requests, progress and brand ad-hoc
  customer messages populate those fields. Legacy unscoped rows stay excluded
  from the planned Customer 360 history.
- Extracted the manufacturer-only warranty estimate into one helper used by
  ticket intake and specified for Customer 360. Missing/invalid purchase dates
  require verification; NCC paid cover does not alter this estimate.

Specification corrections (features still to implement in Phase 3):

- Customer creation must transactionally create User + BrandCustomer and audit
  after commit; a duplicate or platform phone lookup must not create a link.
- Duplicate handling offers a full profile only for an already-linked customer.
- Customer communication queries must filter both brand and recipient and
  exclude internal ticket events and unscoped legacy notifications.
- CSV export additionally checks `customers:export` inside the handler and
  uses an authenticated download helper; no CSV endpoint exists yet.
- Appliance intake upserts must be race-safe and preserve invoice/purchase data.
- Shared identity edits are allowlisted and explained in the UI; the brand
  endpoint may not change the customer’s primary phone.

These corrections are incorporated in ARCHITECTURE.md, README.md and the
Phase 3 checklist. The Customer 360 endpoints/UI, relationship creation writer,
intake appliance upsert and CSV download are still Phase 3 work. This fix does
not mark that phase complete. No commit was made.

### Fix verification

- New foundation regressions: **10/10 passed**, covering stale brand tokens
  after HTTP reassignment, current-role changes, OTP sign-in/suspension/replay,
  normalized duplicate signup, relationship isolation, ticket-only contact,
  notification provenance, appliance reference updates and warranty estimates.
- Full backend run against isolated local test DBs:
  **64 suites passed; 946 tests passed; one existing video-upload test timed
  out at 20 seconds** late in the cumulative run (478.8 seconds total).
  The entire affected ticket suite then passed **21/21** in a fresh process
  (8.2 seconds), with the same default timeout and no application changes.
  Thus every test passed across the full run and targeted rerun, but the
  full suite did not pass in a single invocation. The timeout is consistent
  with cumulative runtime/resource pressure; its precise cause was not proven.
- Browser: `E2E_UI_PORT=5299`, isolated local e2e DB,
  `brandCrmFoundationFixes.spec.js` **1/1 passed**. It uses the visible customer
  login/OTP flow and verifies arrival at the dashboard without a password.
- Frontend production build succeeded. Existing bundle-size warning remains.
- Changed backend files pass ESLint; customer Login has no lint errors and one
  pre-existing synchronous-effect warning. `git diff --check` passes.
- Test MongoDB was standalone; transaction rollback remains unverified. No
  shared/Atlas database was used. Phase 3 transaction behavior still needs
  replica-set tests when the customer creation writer is implemented.
