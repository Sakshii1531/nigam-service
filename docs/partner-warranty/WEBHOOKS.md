# NCC Partner Warranty — Webhooks for Brand CRMs

NCC sends your CRM an HTTPS `POST` whenever one of your warranty claims moves.
This page is for the developer building the receiving endpoint.

## 1. Set up

In the NCC Brand Panel → Settings → Webhooks (API: `PUT /api/v1/brand/warranty-webhook`):

```json
{ "url": "https://crm.yourbrand.com/ncc/webhooks", "enabled": true, "events": [] }
```

- `events: []` means every event; otherwise list the ones you want.
- The response contains a **`secret`** the first time (and whenever you send `"rotateSecret": true`). **It is shown only once** — store it; NCC cannot show it again.
- `POST /api/v1/brand/warranty-webhook/test` sends a `PING` straight away and tells you what your endpoint answered.
- Production URLs must be `https` and resolve to a public address.

## 2. Events

| Event | When |
|---|---|
| `CLAIM_CREATED` | A customer submitted a claim against your brand |
| `CLAIM_INFO_REQUESTED` | Your team asked the customer for more information |
| `CLAIM_APPROVED` | The claim was approved (by your team, or by NCC on your behalf) |
| `CLAIM_REJECTED` | The claim was rejected — `note` holds the reason |
| `JOB_CREATED` | NCC created a Service Job for the claim (also after a partner replacement or reopen) |
| `PARTNER_ASSIGNED` | A service partner accepted the job |
| `JOB_STARTED` | The technician reached the customer and started work |
| `JOB_COMPLETED` | The technician marked the service complete |
| `CLAIM_CLOSED` | The claim is closed (customer confirmed, or closed automatically / by NCC) |
| `CLAIM_CANCELLED` | NCC cancelled the claim — `note` holds the reason |
| `PING` | Test from the Brand Panel |

## 3. Request

```
POST https://crm.yourbrand.com/ncc/webhooks
Content-Type: application/json
X-NCC-Event: CLAIM_APPROVED
X-NCC-Delivery: 66fa1c2e9b1d4a0012345678      ← unique per event; use it to de-duplicate
X-NCC-Timestamp: 1790745600                   ← Unix seconds
X-NCC-Signature: sha256=5f0c…
```

```json
{
  "id": "66fa1c2e9b1d4a0012345678",
  "type": "CLAIM_APPROVED",
  "occurredAt": "2026-10-01T10:15:00.000Z",
  "claim": {
    "id": "66fa1b…",
    "ticket": "NCCW-2026-000159",
    "status": "Job Created",
    "product": "Air Conditioner",
    "category": "AC",
    "issue": "Cooling Issue",
    "modelNumber": "AS-Q18",
    "serialNumber": "LG123456",
    "purchaseDate": "2025-11-02T00:00:00.000Z",
    "remarks": "Blows warm air",
    "createdAt": "2026-10-01T09:02:11.000Z",
    "customer": { "name": "Asha Verma", "phone": "98xxxxxxxx" },
    "address": { "city": "Indore", "state": "MP", "pincode": "452001" }
  },
  "serviceJob": { "id": "NCCJ-2026-000842", "status": "New" },
  "partner": null,
  "note": null
}
```

`claim.status` is the claim's status at the moment of the event. `serviceJob` is
null until a job exists; `partner` is null until a partner accepts.

## 4. Verify the signature

`X-NCC-Signature` is `sha256=` + hex HMAC-SHA256 of **`{timestamp}.{raw body}`**
with your secret. Compute it over the raw bytes you received (before parsing JSON),
compare in constant time, and reject timestamps older than ~5 minutes.

```js
import crypto from 'node:crypto';

function verify(req, rawBody, secret) {
  const ts = req.headers['x-ncc-timestamp'];
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const given = String(req.headers['x-ncc-signature'] || '');
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
```

## 5. Responding, retries, ordering

- Answer **2xx within 10 seconds**. Do slow work after responding.
- Anything else — non-2xx, a redirect, a timeout, a connection error — is retried after **1 min, 5 min, 30 min, 2 h, 12 h**. After the 6th failed attempt the event is marked failed and NCC's team is alerted; they can re-send it.
- Deliveries can arrive more than once and, across retries, out of order. De-duplicate on `X-NCC-Delivery` and use `occurredAt` / `claim.status` rather than arrival order.

## 6. Pulling instead of (or as well as) push

Your Brand Panel login can read the same data: `GET /api/v1/brand/warranty-claims`
(filters: `status`, `q`, `from`, `to`, `category`, `pincode`) and
`GET /api/v1/brand/warranty-claims/:ticket`. Dedicated API keys for server-to-server
pulls are not available yet.
