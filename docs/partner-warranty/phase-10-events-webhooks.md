# Phase 10 — Notifications matrix + domain events + webhooks

**Status:** ✅ Done (2026-09-30) · **Layer:** Backend · **Delivers:** #16, #18

## Goal
Every party hears about the events that matter to them, and the platform is
ready for brand CRMs to subscribe.

## Tasks
- [x] Notification templates for every row of ARCHITECTURE §10 (in-app + push via existing `emit`), with a `cta` deep link to the claim in each app
- [x] Brand-users helper — built in Phase 1 as `emitToBrand(event, brandId, payload)`
- [x] Admins helper — built in Phase 1 as `emitToAdmins(event, payload)`
- [x] `DomainEvent` model; events recorded by `claimEffects.runClaimEffects`, called from `flushAudit` (after the save, not from `appendEvent`) — 10 event types
- [x] Webhook delivery sweep (1 min): HMAC-SHA256 signature, `X-NCC-Event`, `X-NCC-Delivery` id, 10 s timeout, backoff retry, give-up flag; SSRF guard (https only, no private IPs)
- [x] Brand webhook config: `GET/PUT /brand/warranty-webhook` (brand sets URL, events; secret generated server-side and shown once; `POST …/test` sends a ping) + Super Admin view of delivery logs
- [x] Read API for CRMs: `GET /brand/warranty-claims` documented as the pull API (WEBHOOKS.md §6); brand API keys **not built** (noted)
- [x] Docs: `docs/partner-warranty/WEBHOOKS.md` with payload samples and signature verification
- [x] Tests `partnerWarrantyEvents.test.js` (local HTTP server receiving signed deliveries, retry on 500)

## Implementation Log

**Done 2026-09-30.** Not committed (Phases 4–10 uncommitted, as asked).

### A. Notifications (ARCHITECTURE §10)
`claimEffects.runClaimEffects` runs after every claim save (from `flushAudit`, i.e. after the audit rows, so only for changes that were saved):

| Stage | Customer | Brand | Super Admin |
|---|---|---|---|
| Technician Assigned (partner accepted) | ✔ | ✔ | ✔ |
| Visit Scheduled | ✔ | ✔ | |
| Technician On the Way | ✔ | ✔ | |
| Service Completed (CTA "Confirm Service") | ✔ | ✔ | ✔ |
| Warranty Claim Closed | ✔ | ✔ | |

Earlier phases already notify at the point of action: submitted (customer, brand, admins), info requested / answered, approved, rejected, cancelled, reopened, escalated, allocation failed, SLA warning/breach, webhook failure. A status an admin sets without a customer-visible event notifies the brand only.

**Duplicates removed:** for warranty jobs the generic job notifications are no longer sent — "ServiceProvider Assigned" (it fired when the job was merely *offered*), "ServiceProvider is On The Way", "Payment Successful" (₹0) and the generic "Service Completed". Ordinary bookings are unchanged. Test: over a full journey the customer receives exactly 7 claim notifications and nothing else.

### B. Domain events (outbox)
`DomainEvent` row per event, written after the claim change: `CLAIM_CREATED, CLAIM_INFO_REQUESTED, CLAIM_APPROVED, CLAIM_REJECTED, JOB_CREATED, PARTNER_ASSIGNED, JOB_STARTED, JOB_COMPLETED, CLAIM_CLOSED, CLAIM_CANCELLED` (the client's 8 + info-requested + cancelled). Payload: claim (ticket, status, product, issue, model, serial, purchase date, remarks, customer name/phone, city/state/pincode), service job, partner name, brand-visible note — see WEBHOOKS.md. Status `pending` when the brand has an enabled, subscribed webhook, else `skipped` (kept as an event log).

### C. Webhooks
- Brand: `GET/PUT /api/v1/brand/warranty-webhook` (`url`, `enabled`, `events`, `rotateSecret`); signing secret generated server-side and returned **once**; `POST …/test` sends a PING and reports the result.
- Delivery (`runWebhookSweep`, every minute from server.js): signed POST (`X-NCC-Event`, `X-NCC-Delivery`, `X-NCC-Timestamp`, `X-NCC-Signature = sha256=HMAC(secret, "{ts}.{body}")`), 10 s timeout, **redirects count as failures**, retries after 1 m / 5 m / 30 m / 2 h / 12 h, then `failed` + admin notification.
- SSRF guard: production requires https and a host resolving to public addresses (checked on save and again on every delivery); http/loopback allowed outside production for local testing.
- Super Admin: `GET /api/v1/super-admin/warranty-webhooks/deliveries?brand=&status=&type=` (with every attempt's HTTP status / error / duration) and `POST …/deliveries/:id/retry`.
- Receiver guide for brand developers: **[WEBHOOKS.md](WEBHOOKS.md)**.

### Found by the tests
The CLAIM_CLOSED event showed the claim Closed but its job still "Customer Confirmation": the claim was saved before the job. Closing (customer confirm, auto-close, admin close) now closes the job first — with a new `transitionStatus(…, { skipWarrantySync: true })` so the sync doesn't close the claim with the wrong event — then the claim.

### Not built
Brand API keys for server-to-server pulls (the pull API currently uses a brand-admin login).

### Files
| File | Change |
|---|---|
| `backend/src/modules/partner-warranty/domainEvent.model.js` | **new** — outbox |
| `backend/src/modules/partner-warranty/claimEffects.js` | **new** — progress notifications + event recording |
| `backend/src/modules/partner-warranty/claimWebhooks.service.js` / `.routes.js` | **new** — delivery, signing, retries, SSRF guard, brand config, admin log/retry |
| `backend/src/modules/partner-warranty/claimTimeline.js` | runs effects after audit |
| `backend/src/modules/partner-warranty/partnerWarrantyJob.service.js`, `adminClaim.service.js` | close job before claim |
| `backend/src/modules/service-requests/serviceRequest.service.js` | `skipWarrantySync`; no generic "assigned" for warranty offers |
| `backend/src/modules/service-provider/job.service.js` | no generic on-the-way / payment / completed for warranty jobs |
| `backend/src/modules/notifications/notification.service.js` | progress (customer / brand / admin) + webhook-failed templates |
| `backend/src/server.js`, `backend/src/app.js` | 1-minute webhook sweep; routers |
| `docs/partner-warranty/WEBHOOKS.md` | **new** |
| `backend/tests/partnerWarrantyEvents.test.js` | **new** — 9 tests incl. a local HTTP receiver verifying signatures |

### Verification
- `partnerWarrantyEvents.test.js`: **9/9**; all partner warranty tests: **123/123**.
- Full backend suite (887 tests): **not one fully clean run** — the machine was heavily loaded (load average up to 39 from other programs). Two single full runs had only `beforeAll` **hook timeouts** (46 and 150 of them), in *different* files each time (chat / wallet / fullJourney, then adminServiceProvider / appliances / rateWriter — one file took 967 s). Every failed file then passed on its own (23/23 and 75/75). No assertion failures anywhere; no failure in any partner-warranty file.
- ESLint clean.
