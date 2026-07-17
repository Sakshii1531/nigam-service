# Post-Launch Iteration (Phase 15)

Documentation-only, as the roadmap itself scopes this phase — dependency
updates, index/query performance review "under real traffic," and a backlog
"fed by whatever `/security-review` and error-monitoring turn up" all
require a live, running system with real usage, which doesn't exist yet
(Phase 12's Render deploy and Phase 14's VPS migration are both still
pending the user's own account/infra steps). What follows is the honest
inventory this phase can actually produce right now: every open question
and deferred piece of scope accumulated across Phases 0–14, in one place,
each marked with what it needs to move forward.

## Needs a real decision from the user (not inferable from the code)

1. **Payment gateway** — `payments-wallet/paymentGateway.js` is still a
   stub (`chargePayment()` always succeeds, no real API call). Razorpay is
   the working assumption (a `razorpayKey` field already exists in
   super-admin Settings), but this needs a real Razorpay account + API keys
   before it can become real, and confirmation Razorpay (not another
   gateway) is still the intended choice.
2. **OTP/SMS provider** — `auth/otpProvider.js`'s `stub` provider logs the
   code to the console instead of sending a real SMS/email. Needs a chosen
   provider (Twilio, MSG91, etc.) and an account/API key; the interface is
   already provider-agnostic (`OTP_PROVIDER` env var swaps the
   implementation) so this is additive, not a rewrite.
3. **File storage** — `shared/fileUpload.js` falls back to local disk
   (fine for dev, wrong for any real multi-instance or ephemeral-filesystem
   host like Render) until `S3_ENDPOINT`/`S3_BUCKET`/credentials are set.
   Needs an actual S3-compatible bucket (Cloudflare R2 was the original
   recommendation — cheaper egress than AWS S3 for this use case, but not
   confirmed with the user).
4. **Exchange-request inspection approval scope** (raised during Phase 11's
   security fix) — today *any* `super_admin` can approve *any* trade-in
   platform-wide via `super-admin/exchangeRequest.routes.js`. If this should
   instead be a dedicated warehouse role or brand-scoped responsibility,
   that's a real product decision. Same open question already exists for
   `Claim` approval (Phase 9) — worth deciding both at once since they're
   the same shape of gap.
5. **Unified vs split RBAC** — brand-scoped and platform-scoped roles
   currently share one `Role` collection with a `scope` discriminator (a
   Phase 1 modeling choice, not an explicit user confirmation). Works fine
   as built; flagged because the original roadmap text implied two separate
   collections might be intended instead.

## Deliberately deferred scope (built as models only, or not at all), by phase

- **Finance sub-module** (Phase 8): `BillingTransaction`/`Revenue`/
  `PartnerPayout`/`GatewayTransaction` models exist with no real
  system-generated data source (no commission-calculation job, no
  partner-earnings ledger, no gateway webhook integration). Needs the real
  payment gateway (#1 above) wired up first — webhook-driven data is what
  would actually populate these.
- **AMC/Extended-Warranty *purchase* flow** (Phase 5): the models and the
  technician-side *consumption* of an existing subscription/order both
  exist (Phase 6), but there's no customer-facing "buy an AMC plan" or "buy
  extended warranty" checkout endpoint — `acceptJob()` still accepts an
  explicit override for testing/fixture purposes standing in for it. User
  confirmed post-Phase-6 this stays deferred to a later, dedicated pass
  rather than being pulled forward.
- **Referral / Membership / SpinWheel / LoyaltyMilestone customer-facing
  flows** (Phase 8): super-admin CRUD over the *configuration* exists; the
  actual customer earn/redeem/spin/referral-claim endpoints don't. Same
  "stays deferred" confirmation as above.
- **Technician payout on warranty/AMC/EW visits** — flat ₹150/visit
  placeholder (`FLAT_COVERED_VISIT_EARNINGS`), pending a real brand
  `RateCard`-driven calculation. User confirmed post-Phase-6 this is fine
  as-is, not urgent.
- **Tip settlement** (Phase 10) — `Review.tip` is captured but never paid
  out; no tip-payout flow exists.
- **Technician-set spare-part pricing** (flagged, not fixed, in Phase 11's
  security review at 7/10 confidence — below the skill's ≥8 inclusion bar,
  so not treated as confirmed) — a technician can currently name their own
  price for a claimed spare part with no catalog-price cross-check. Worth a
  deliberate human look, not a false-positive dismissal.
- **Broadcast notification read-state** (Phase 9) — broadcast notifications
  share one `read` flag across every recipient (no per-user read receipt);
  a real fix needs a `NotificationRead { user, notification }` join
  collection, documented as a schema limitation rather than silently
  mishandled in the meantime.
- **Frontend integration beyond Auth** (Phase 13) — Booking flow, and the
  other three portals' login (technician/brand-admin/super-admin), are
  still on their original mocked/simulated behavior. See
  `frontend/docs/PHASE13_INTEGRATION.md` for the specific reasoning on why
  Booking wasn't attempted in that pass and what the next slice looks like.

## Ongoing cadence, once the system is actually live

- **Dependency updates**: `npm audit` is currently clean in production
  dependencies (`npm audit --omit=dev` — Phase 11); the 3 moderate findings
  in `autocannon`'s dev-only chain were a conscious accept, not a fix — revisit
  if `autocannon` ships a compatible patched version, or if it's ever
  promoted out of devDependencies for some reason.
- **Index/query performance review under real traffic**: every list-page
  filter pattern from `BACKEND_CONTEXT.md` §7.4 already has a compound
  index (Phase 1), but real usage is what would surface any that are
  missing or mis-ordered — nothing to review yet without production query
  patterns to look at.
- **Backlog fed by `/security-review` and error monitoring**: run
  `/security-review` again after any substantial future change, the same
  3-step process used in Phase 11. Error monitoring itself isn't wired up
  yet — `pino`'s structured logs are the raw material or MongoDB Atlas
  connection state, uptime, dependencies etc.
- **Playwright and Jest suites should keep being the merge gate** — the
  standing rule this entire build followed (every phase green before
  commit) doesn't stop being the right practice once "phases" end; CI
  (Phase 12) already enforces this mechanically on every PR going forward.
