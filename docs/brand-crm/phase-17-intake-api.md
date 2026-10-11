# Phase 17: Intake API + WhatsApp-ready backend

**Status:** ✅ Complete · **Layer:** Backend + docs (+ small Brand Panel UI) · **Delivers:** client §12 · **Depends on:** Phases 1, 3, 4, 5

## Goal
A WhatsApp chatbot, built separately, or a brand's own CRM can create the
**same** ticket through an authenticated API. The ticket ID is generated
automatically. There is no manual re-entry and no duplicates.

## Context: read first
- ARCHITECTURE §11; README D15.
- `partner-warranty/ticketIntake.service.js` `createTicket` (Phase 1/4), `customer360.service` (Phase 3), `evaluateWarranty` (Phase 5).
- `partner-warranty/warrantyCatalog.service.js` (public brand → category → issue reads).
- `shared/fileUpload.js` / `upload.routes.js`.
- `docs/partner-warranty/WEBHOOKS.md` (outgoing events; reuse its style for `INTAKE-API.md`).
- Rate limiting: see `middleware/otpRateLimit.js` for the existing pattern.

## Tasks

### Backend
- [x] `brand-crm/apiKey.model.js` (§11):
  - key format `ncc_live_<8-char prefix>_<32-char secret>`
  - store `prefix` + `sha256(secret)`
  - compare in constant time
  - `brand: null` = a platform key (Super Admin only), able to create tickets for any warranty-enabled brand
- [x] `intakeAuth.middleware.js`:
  - parse the bearer key, check revoked, check scope
  - sets `req.integration = { keyId, brand, scopes }`
  - updates `lastUsedAt` (throttled)
  - per-key rate limit (default 60/min)
  - actor snapshot `{ kind:'integration', name: key.name }`
- [x] Routes `/api/v1/intake` (§11):
  - `GET /brands` (platform key) / own brand only (brand key)
  - `GET /brands/:id/catalog` → covered categories + product types + issues + service types
  - `POST /uploads` (`uploads:create`; same mime/size rules as D17) → `{ url }`
  - `POST /tickets` (`tickets:create`):
    - `Idempotency-Key` header required; a replay with the same key + same body hash → the same ticket (200); same key + different body → 409
    - customer upsert by phone (never overwrites an existing name; stores the provided name in `customerSnapshot`)
    - `source` from the body (`whatsapp` | `api`), restricted by a key setting `allowedSources`
    - documents by url (must be urls from `/intake/uploads` or `https`)
    - goes to Pending Approval (D6)
    - returns `{ ticketNo (NCCW), brandTicketNo, status, customerStatusLabel, warrantyStatus }`
  - `GET /tickets/:ticketNo` (`tickets:read`): only tickets created by keys of the same brand (or the same platform key); customer-safe projection + jobStage public label
- [x] WhatsApp conversation helper (stateless, optional for the bot builder): `POST /intake/whatsapp/validate-step { step, data }` validates one step's payload (brand, product, complaint, customer, warranty/invoice, problem, photos) using the same zod schemas, so the bot can re-prompt early. No session storage on our side.
- [x] Brand key management: `/api/v1/brand/api-keys` (`integrations:manage`):
  - list
  - create (the secret is shown once)
  - revoke
  - set `allowedSources` and scopes

  Super Admin: platform keys at `/api/v1/super-admin/api-keys`. All key operations are audited.
- [x] Every intake request is audited (`intake.ticket_created`, `intake.replayed`, `intake.rejected` with a reason). Failed auth attempts are counted (no body logged).
- [x] `docs/brand-crm/INTAKE-API.md`:
  - auth
  - idempotency
  - each endpoint with request/response examples
  - error codes
  - the WhatsApp step → endpoint table (Brand Selection → `GET /brands`; Product → `/catalog`; Complaint/Problem → issue id or text; Customer Details → `customer`; Warranty/Invoice + Photos → `/uploads`; Ticket Creation → `POST /tickets`)
  - status polling vs webhooks (link `../partner-warranty/WEBHOOKS.md`)
- [x] `backend/scripts/intake-simulator.js`: a CLI that walks the WhatsApp flow against a running server with a key and prints the ticket number (used in Phase 19).

### Brand Panel
- [x] Settings → **Integrations** tab: webhook (existing, moved here from Warranty Settings) + API keys (create/revoke, copy-once modal, last used, allowed sources).

### Tests
- [x] `backend/tests/brandCrmIntake.test.js`:
  - bad / revoked key → 401
  - missing scope → 403
  - brand key can't create for another brand → 403
  - platform key can
  - idempotent replay → same ticket, one DB doc
  - same key + different body → 409
  - existing customer phone → reused, not duplicated
  - uncovered category → 400
  - the ticket appears in the brand queue with source `whatsapp`
  - rate limit → 429
  - `GET /tickets/:no` cross-brand → 404
  - audit rows written
- [x] `e2e/api/brandCrmIntake.spec.js`: the full WhatsApp flow over HTTP (catalog → upload → create → read).

## Acceptance
- A WhatsApp or CRM system can create tickets that are identical in workflow to app and CCE tickets, with auto-generated IDs and no duplicates.
- The API is documented and has a working simulator.

## Implementation Log
### Implementation

- Added `ApiKey` (hash-only secret storage), durable `IntakeRequest`, per-key
  Mongo-backed rate windows and intake-upload ownership records. Unique request
  and ticket source indexes prevent duplicate creation across concurrent workers.
- Intake routes are mounted at `/api/v1/intake`; every endpoint is authenticated,
  scoped and audited. Rejections log HTTP status reasons, never request bodies;
  failed authentication has a persisted counter. Authorization/cookie headers
  are now redacted by the shared request logger.
- Creation calls the existing `createTicket` inside the caller's transaction;
  customer identity, CRM membership, appliance, ticket and replay response commit
  together on replica-set MongoDB. Customer phone races reuse the winning account;
  provided names are retained only in the ticket snapshot. API/WhatsApp sources
  cannot auto-approve through the shared creator.
- Added brand key list/create/update/revoke routes with `integrations:manage`,
  Super Admin platform-key routes, native key-operation audit coverage and audit
  entity aliases. Keys return secrets only on creation. Brand tracking is limited
  to tickets created by that brand's keys; platform keys track their own tickets.
- Added stateless step validation sharing submission/customer/product/address
  schemas, scoped catalogue reads, shared upload rules and safe tracking labels.
- Settings → Integrations now contains key management and the existing CRM
  webhook card, extracted from Warranty Settings. The old location points users
  to Settings. Source/scope edits show immediate feedback and restore server state
  on failure. Existing webhook save/rotate/test behavior is preserved.
- Added [INTAKE-API.md](INTAKE-API.md), the environment-configured CLI simulator,
  backend tests, HTTP flow + simulator E2E, and browser key-management E2E.

### Operational boundaries

- Production atomicity requires replica-set MongoDB, consistent with the existing
  transaction helper. Standalone local development has weaker rollback guarantees.
- Replay identities do not expire. A committed ticket can recover its response;
  an interrupted reservation with no committed ticket stays fail-closed rather
  than risking duplicates through an automatic timeout takeover. Operators must
  reconcile that rare case. The API guide describes retry behavior explicitly.
- Existing notification effects run after commit. Replays return a committed
  response without repeating effects; this phase does not promise exactly-once
  external notification delivery.
- HTTPS document links are stored, not fetched. Local development upload links
  must belong to the calling intake key. The WhatsApp chatbot itself remains out
  of scope (D15).

### Validation

- Final focused backend gate: 4 suites / 65 tests passed (intake, audit, RBAC,
  unified ticket creator). Intake includes 13 tests with concurrent replay,
  concurrent cross-brand customer reuse, rollback fault injection, auth/revocation,
  scopes/sources/tenant checks, upload rules, rate limiting and response recovery.
- HTTP catalogue → upload → step validation → create → replay → track and the
  running-server simulator passed. Brand Admin HTTP regression: 5 tests passed.
- Browser run: 23 scenarios passed initially; Integrations and Dashboard passed
  their final focused rerun, covering all 25 scenarios. The integration checkbox
  feedback issue was corrected; Dashboard's detached live-refresh element passed
  on rerun. Cross-portal customer, brand, partner and Super Admin flows passed.
- Backend and frontend lint: zero errors (existing 8 / 153 warnings). Production
  frontend build passed (existing chunk-size warning). Integrations and copy-once
  dialog screenshots visually reviewed.
- Full backend regression plus corrected focused reruns: **81 suites / 1,135
  tests passed**. The initial isolated run exposed two Phase 17 structural issues:
  an intermediate idempotency helper regression and multiple models in one model
  file. Both were corrected; the final intake, model-registry and audit rerun
  passed 27/27 tests, and the final intake/audit/RBAC/ticket gate passed 65/65.

