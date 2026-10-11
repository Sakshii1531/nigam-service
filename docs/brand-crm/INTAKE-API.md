# Intake API: WhatsApp bots and brand CRM integrations

Base path: `/api/v1/intake`. The WhatsApp bot is a separate application; NCC
provides catalogues, media upload, early validation, ticket creation and tracking.
All responses use `{ "data": ..., "error": null, "meta": {} }`. Errors use
`{ "data": null, "error": { "message": "...", "details": ... }, "meta": {} }`.

## Authentication and permissions

Send `Authorization: Bearer ncc_live_<8 hex prefix>_<32 hex secret>` on every
request. Brand administrators with `integrations:manage` create keys in
**Settings → Integrations**, or through `/api/v1/brand/api-keys`. The full key is
returned only by creation. NCC stores the prefix and SHA-256 of the secret,
compares hashes in constant time, and never returns the stored hash.

Available scopes: `catalog:read`, `uploads:create`, `tickets:create`,
`tickets:read`. Keys also restrict `allowedSources` to `whatsapp`, `api`, or both.
A brand key sees its own active, warranty-enabled brand. Super Admin can create
platform keys at `/api/v1/super-admin/api-keys`; these can create tickets for any
active, warranty-enabled brand. A JWT cannot replace an intake key.

Limits are persisted per key and fixed minute window, default **60 calls/minute**
across all intake endpoints and server processes. A 429 includes `Retry-After`
(seconds). `lastUsedAt` is updated at most once a minute. Revocation and scope
changes apply on the next request. Keep keys on your server, outside browser
code and chat messages. Request logs redact Authorization headers and cookies.

### Key management (JWT authentication)

Both management base paths support:

| Method | Path | Body / response |
|---|---|---|
| GET | `/api-keys` | Safe key list: id, name, prefix, scopes, sources, created, last-used, revoked timestamps |
| POST | `/api-keys` | `{name, scopes, allowedSources}` → list fields plus `secret` (once), HTTP 201 |
| PATCH | `/api-keys/:id` | Any of name, scopes, allowedSources; active keys only |
| POST | `/api-keys/:id/revoke` | `{}` → revoked key; repeated revocation is safe |

Brand routes are tenant-scoped and require `integrations:manage`. Platform
routes require `super_admin` and manage only platform keys. Secrets cannot be
retrieved or edited. Create a replacement key to rotate. Successful management
operations, including listing, write audit records; secret values are excluded.

## Catalogues

`GET /brands` requires `catalog:read`:

```json
{"data":[{"id":"<brandId>","name":"Your Brand","logoUrl":null}],"error":null,"meta":{}}
```

`GET /brands/:id/catalog` requires `catalog:read`:

```json
{
  "data": {
    "brand": {"id":"<brandId>","name":"Your Brand"},
    "categories": [{
      "id":"<categoryId>","key":"AC","name":"Air Conditioner",
      "productTypes":[{"id":"<productTypeId>","name":"Split AC"}],
      "issues":[{"id":"<issueId>","name":"Not cooling","productTypeId":null}]
    }],
    "serviceTypes":["repair","installation","demo","preventive_maintenance","inspection"]
  },
  "error":null,"meta":{}
}
```

Only covered active categories, active types and active issues appear. Show
category-level issues (`productTypeId: null`) and issues for the chosen type.
Selection is validated again during ticket creation.

## Upload media

`POST /uploads` requires `uploads:create`, multipart form field **file**:

```sh
curl "$BASE/intake/uploads" -H "Authorization: Bearer $INTAKE_API_KEY" \
  -F 'file=@invoice.pdf;type=application/pdf'
```

Returns `{ "data": { "url": "https://..." }, "error": null, "meta": {} }`.
PNG/JPEG/WebP/PDF: maximum **10 MB**; MP4/WebM/QuickTime MOV: **50 MB**. At most
two videos and ten documents per ticket. Existing image conversion and storage
configuration apply. Development storage may return `/uploads/<file>`; only
local URLs uploaded through intake by the same key can be attached. Documents
may also use HTTPS URLs (without URL credentials). NCC stores those URLs and
does not fetch external content during submission. Production uploads require
configured storage.

## Create a ticket

`POST /tickets` requires `tickets:create`, an allowed source, and
`Idempotency-Key` (1–128 printable ASCII characters, no spaces). Example:

```sh
curl "$BASE/intake/tickets" -H "Authorization: Bearer $INTAKE_API_KEY" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: whatsapp-message-123' \
  --data @ticket.json
```

`ticket.json`:

```json
{
  "brandId":"<brandId>",
  "categoryId":"<categoryId>",
  "productTypeId":"<productTypeId>",
  "issueId":"<issueId>",
  "source":"whatsapp",
  "customer":{"name":"Asha","phone":"+91 98765 43210"},
  "address":{"house":"12 MG Road","city":"Indore","state":"MP","pincode":"452001"},
  "product":{"modelNumber":"AC18","serialNumber":"SN123","purchaseDate":"2026-01-15"},
  "serviceType":"repair",
  "remarks":"Air conditioner blows warm air",
  "documents":[{"kind":"invoice","url":"https://example.com/invoice.pdf","name":"Invoice"}]
}
```

Replace placeholder IDs with catalogue IDs. Supply exactly one of `issueId` or
`issueName` (free text, max 200 characters). `productTypeId`, `product`,
`documents` and `preferredVisit` are optional. Remarks need 10–1000 characters.
`customer` supports optional email and alternatePhone. Mobile identity is
normalized to ten digits; an existing account is reused and its name/contact
fields are preserved. Submitted contact details are captured in the ticket's
customer snapshot. Inactive customers are rejected.

Address requires house, city, state and six-digit pincode; optional name,
landmark, latitude and longitude. `preferredVisit` uses `{date:"YYYY-MM-DD",
slot:"morning"|"afternoon"|"evening",notes:"..."}` within the current visit date
range. Document kinds: invoice, warranty_card, product_photo, additional, video,
service_report, other. Purchase dates cannot be in the future. Unknown fields
(including `approveNow`, actor, assignee and status) are rejected.

HTTP **201**:

```json
{"data":{"ticketNo":"NCCW-2026-000123","brandTicketNo":"BRAND-2026-000045","status":"Submitted","customerStatusLabel":"Claim Submitted","warrantyStatus":"In Warranty"},"error":null,"meta":{}}
```

`Submitted` is the existing workflow's **Pending Approval** state. API and
WhatsApp tickets always wait for brand approval, including when legacy
`autoApproveSources` lists those channels. The shared creator performs warranty
assessment, IDs, appliance/customer linkage, SLA clocks, timeline, audit and
notifications. Approval later creates the service job through the existing flow.

### Idempotency and retries

The durable unique identity is **API key ID + Idempotency-Key**. Store a stable
message/event ID on the caller. Repeating the same JSON body (object-property
order does not matter) returns the original creation response, HTTP **200**.
A changed body under that identity returns **409**. Arrays and explicitly
supplied values are significant; keep the same body on retries.

Concurrent identical requests converge on one ticket. Requests wait briefly
for an in-flight attempt; if still pending they return 409. Retry with the same
identity/body after a delay. A ticket-level unique index adds duplicate
protection. Keys are not automatically expired or reused. Validation failures
before reservation, and failed transactions without a committed ticket, leave
the identity available for a corrected request.

Customer, brand relationship, ticket, appliance and saved response commit in
one transaction on replica-set MongoDB (the production requirement for atomic
multi-document writes). ID counters can have harmless gaps. Standalone local
MongoDB uses the existing development fallback and cannot guarantee atomic
multi-document rollback.

A committed ticket can recover its response after a process interruption.
An abandoned reservation without a committed ticket remains fail-closed (409);
operators must reconcile that reservation before retrying. It is not
silently expired, which could allow a still-running worker to create duplicates.
Post-commit audit/notification failure may return 500; retry with the same key
and body to retrieve the committed response. Notification delivery follows the
existing notification system, not an exactly-once guarantee.

## Track a ticket

`GET /tickets/:ticketNo` requires `tickets:read`. Returns creation fields plus
`jobStage` (public label or null), `createdAt`, `updatedAt`:

```json
{"data":{"ticketNo":"NCCW-2026-000123","brandTicketNo":"BRAND-2026-000045","status":"Partner Assigned","customerStatusLabel":"Partner Assigned","warrantyStatus":"In Warranty","jobStage":"Partner assigned","createdAt":"2026-10-10T10:00:00Z","updatedAt":"2026-10-10T11:00:00Z"},"error":null,"meta":{}}
```

Brand keys can track tickets created by keys of that same brand (including
revoked keys). Platform keys can track only tickets they created. Other tickets
return 404. The projection excludes phone/address, staff, internal timeline,
financial information and policy internals. Allocation/offer/failure stages
share the public label “Finding a service partner”.

Poll within your rate limit, or use [outgoing webhooks](../partner-warranty/WEBHOOKS.md)
for event-driven updates. Intake authentication is separate from webhook
signing. Webhook configuration is also in Settings → Integrations.

## Stateless WhatsApp step validation

`POST /whatsapp/validate-step` requires `tickets:create`:

```json
{"step":"customer","data":{"name":"Asha","phone":"+91 98765 43210"}}
```

Returns `{valid:true,step:"customer",data:{name:"Asha",phone:"9876543210"}}`
inside the standard envelope. No chat sessions or draft conversations are stored.
Schemas are shared with final submission. Steps validate their own payload;
final submission checks all selections together.

| Conversation step | Endpoint / validation payload |
|---|---|
| Brand selection | GET /brands; `brand`: `{brandId}` |
| Product | GET /brands/:id/catalog; `product`: `{brandId,categoryId,productTypeId?}` |
| Complaint | Catalogue issue or text; `complaint`: `{issueId}` or `{issueName}` |
| Customer details | `customer`: `{name,phone,email?,alternatePhone?}` |
| Warranty | `warranty`: `{modelNumber?,serialNumber?,purchaseDate?}` |
| Invoice | POST /uploads; `invoice`: array of document objects |
| Problem description | `problem`: `{remarks}` |
| Photos/videos | POST /uploads; `photos`: array of document objects |
| Create | POST /tickets with all collected fields + idempotency header |
| Track | GET /tickets/:ticketNo or outgoing webhook events |

## Errors and audit

| HTTP | Meaning / action |
|---|---|
| 400 | Invalid fields, missing idempotency key, uncovered product, mismatched issue/type, document or upload limits |
| 401 | Missing, malformed, incorrect or revoked key; replace credentials |
| 403 | Missing scope, disallowed source or another brand; fix key configuration |
| 404 | Inaccessible/disabled brand or ticket; do not infer another tenant's data |
| 409 | Changed idempotency body, in-flight request, open serial duplicate, or conflicting customer identity |
| 429 | Per-key rate limit; honor Retry-After |
| 500 / 502 | Server/storage failure; retry ticket creation with the same identity and body |

Every intake endpoint writes a safe audit event: catalogue read, upload, step
validation, ticket read, `intake.ticket_created`, `intake.replayed`, or
`intake.rejected`. Rejections record the HTTP status as their reason and do not
copy request bodies. Failed authentication is also counted in persisted minute
windows. Logs and audit events exclude credentials and media/customer bodies.

## Simulator

Node 20+; against a local/test server:

```sh
export INTAKE_BASE_URL=http://localhost:4000/api/v1
export INTAKE_API_KEY='<copy-once key>'
export INTAKE_CUSTOMER_PHONE='9876543210'
export INTAKE_BRAND_ID='<brandId>'
node backend/scripts/intake-simulator.js
```

This creates a real test ticket, verifies replay, reads status, and prints IDs.
Optional environment variables: `INTAKE_CUSTOMER_NAME`, `INTAKE_INVOICE_PATH`
(PDF), `INTAKE_IDEMPOTENCY_KEY`, `INTAKE_HOUSE`, `INTAKE_CITY`, `INTAKE_STATE`,
`INTAKE_PINCODE`. Use a dedicated test key and customer. Default source is
WhatsApp; the key needs all four scopes and that allowed source. The HTTP E2E
suite runs this simulator against its disposable database.
