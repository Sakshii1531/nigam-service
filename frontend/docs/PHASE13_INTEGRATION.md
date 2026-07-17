# Phase 13 — Frontend Integration (scoped start)

The roadmap's Phase 13 asks for "Auth + Booking, the two most-mocked flows,"
with an exit criterion of manually walking both flows end-to-end in a browser.
This pass narrowed that to **Auth only** — real, fully working, verified — and
deliberately did not touch the Booking flow's UI. Both the narrowing and the
reason are recorded here rather than left implicit.

## What's real now

- `src/lib/apiClient.js` — fetch wrapper matching the backend's `{ data, error,
  meta }` envelope, with a one-shot access-token-refresh-and-retry on 401.
- `src/context/AuthContext.jsx` — `login()` / `verifyOtp()` / `resendOtp()` /
  `logout()`, backed by the real `POST /auth/login`, `/auth/otp/verify`,
  `/auth/otp/send`, `/auth/logout`. Tokens + user persisted to `localStorage`.
- `pages/Login.jsx` (customer role only) calls the real `login()`, shows a
  real inline error on wrong credentials, and hands the masked `destination`
  + `role`/`identifier` to `/verify-otp` via router state.
- `components/auth/OtpVerification.jsx` gained an optional `onSubmit`/
  `onResend` prop pair. When provided (only `pages/VerifyOtp.jsx` does, and
  only when it was reached with real `role`/`identifier` state from `Login.jsx`)
  it calls the real backend and shows the real error message on an incorrect
  code, instead of the original "any 6 digits work" demo behavior. When not
  provided — every other portal's login (technician, brand-admin,
  super-admin) — the component is completely unchanged.

**Verified for real**, not just read/reasoned about: started the actual
`backend/` dev server against its real Atlas dev database and drove the exact
HTTP calls the frontend code now makes — `POST /auth/login` with the seeded
customer's credentials (`9876543210` / `password123`, matching the
`defaultValue`s already hardcoded in `Login.jsx` before this phase — not a
coincidence, `scripts/seed.js` seeds exactly this customer), read the OTP
code the stub provider logs, `POST /auth/otp/verify`, and confirmed the
response shape (`accessToken`/`refreshToken`/`user`) and a subsequent
authenticated `GET /wallet` call using the issued token both work exactly as
the frontend code expects.

**What this verification is not**: a browser walkthrough. This sandboxed
environment has no browser available, and the project's own standard for UI
changes ("start the dev server and use the feature in a browser... if you
can't test the UI, say so explicitly rather than claiming success") is being
followed literally here — the HTTP contract is proven real, but nobody has
clicked through the actual React screens yet. That's the one concrete,
low-effort follow-up this phase leaves for the user (or a session with
browser access): `cd frontend && cp .env.example .env && npm run dev`,
`cd backend && npm run dev` in another terminal, and click Login → OTP →
Dashboard once.

## What's deliberately not done, and why

**Booking flow** (`BookingFlow.jsx`, `Payment.jsx`/`CardPayment.jsx`/
`UpiPayment.jsx`/`NetBankingPayment.jsx`, `BookingSuccess.jsx`) was read in
full but not touched. Reasons, concretely:

1. **Data model mismatch, not just a wiring gap.** The frontend's
   `data/bookingCatalog.js` nests category → productTypes → services (with
   UI-only fields like icons/descriptions the backend has no concept of) →
   brands, all keyed by human-chosen local IDs. The real backend's
   `Category`/`ProductType`/`ServiceCatalogItem` are separate fetchable
   collections with real slugs and server-computed prices. Wiring this isn't
   a fetch-instead-of-import swap — it's a translation layer, and doing it
   carelessly risks silently mismatching what a customer picks against what
   `POST /bookings` actually prices.
2. **The payment step doesn't correspond to anything the real API does.**
   `BookingFlow.jsx`'s "Confirm Booking" today navigates to a separate mocked
   `/payment` page (then `/upi-payment` etc.) *before* any booking record
   exists anywhere — booking "creation" is really just `BookingSuccess.jsx`
   reading whatever query params got passed to it, including a
   client-generated fake booking ID. The real `POST /bookings` is a single
   atomic call that prices, auto-assigns a technician, and returns the real
   booking + service request together — there is no real two-step
   "pay-then-create" split to preserve, so this needs a real design decision
   (call `POST /bookings` before or instead of the mock payment step?) rather
   than a mechanical swap.
3. **No way to verify it.** Given (1) and (2), any attempt at this within one
   unattended pass, with no browser to click through and the user unavailable
   to redirect a wrong call, risks leaving the app in a **worse** state than
   today's fully-mocked-but-internally-consistent demo — a half-wired booking
   flow that looks real but silently drops data or throws on an untested edge
   case. That's worse than not touching it, so it wasn't attempted.

`ForgotPassword.jsx`/`ResetPassword.jsx` are also still fully mocked — same
`OtpVerification` component, same `onSubmit` mechanism would apply, just not
done in this pass (smaller lift than Booking, flagged as the next-easiest
follow-up after a manual browser check of what's already wired).

## Suggested next slice (not started)

If a future session picks Phase 13 back up: `ForgotPassword`/`ResetPassword`
customer flow first (same `onSubmit` pattern already built, `POST
/auth/forgot-password` + `/auth/reset-password` already exist and match this
shape), then a from-scratch redesign of the Booking flow's final step —
`POST /bookings` in place of the mock payment hand-off — as its own scoped
piece of work, ideally with actual browser access to verify each step.
