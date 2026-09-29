# Phase 10 — Notifications matrix + domain events + webhooks

**Status:** ⬜ Not started · **Layer:** Backend · **Delivers:** #16, #18

## Goal
Every party hears about the events that matter to them, and the platform is
ready for brand CRMs to subscribe.

## Tasks
- [ ] Notification templates for every row of ARCHITECTURE §10 (in-app + push via existing `emit`), with a `cta` deep link to the claim in each app
- [ ] Helper `notifyBrandUsers(brandId, template, payload)` — resolves `User.brand = brandId`
- [ ] Helper `notifyAdmins(template, payload)` — super-admin users
- [ ] `DomainEvent` model + `claimEvents.enqueue()` called from `appendEvent` for the 9 event types (§8)
- [ ] Webhook delivery sweep (1 min): HMAC-SHA256 signature, `X-NCC-Event`, `X-NCC-Delivery` id, 10 s timeout, backoff retry, give-up flag; SSRF guard (https only, no private IPs)
- [ ] Brand webhook config: `GET/PUT /brand/warranty-webhook` (brand sets URL, events; secret generated server-side and shown once; `POST …/test` sends a ping) + Super Admin view of delivery logs
- [ ] Read API for CRMs: `GET /brand/warranty-claims` already exists — document it as the pull API; add brand API-key auth later (out of scope, noted)
- [ ] Docs: `docs/partner-warranty/WEBHOOKS.md` with payload samples and signature verification
- [ ] Tests `partnerWarrantyEvents.test.js` (local HTTP server receiving signed deliveries, retry on 500)

## Implementation Log
_Filled in when the phase is done._
