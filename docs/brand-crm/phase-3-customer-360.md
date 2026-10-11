# Phase 3: Customer 360 and mobile search

**Status:** ✅ Complete · **Layer:** Full stack · **Delivers:** client §6, §13 (customer part) · **Depends on:** Phases 1, 2

## Goal
Search by mobile opens the existing profile; a new customer is created only
when none exists. The profile shows everything about that customer **for this
brand**:
- details
- products
- warranty
- open and previous tickets
- completed jobs
- communication

## Context: read first
- ARCHITECTURE §7; README D16; [readiness review](PHASE-3-READINESS-REVIEW.md) and its resolution log.
- `backend/src/modules/brand-admin/brandInsights.service.js` `listBrandCustomers` (~L62): SR-only aggregate with an in-memory search. **Replace it.**
- `backend/src/modules/service-requests/ownedAppliance.model.js` (`brand` is a **string**), `ownedAppliance.service.js`.
- `backend/src/modules/auth/user.model.js`: unique `{phone, role}`; `passwordHash` required; customer `humanId` CUST-.
- Frontend:
  - `frontend/src/pages/brand-admin/Customers.jsx` (`complaintsList: []` hardcoded)
  - `RegisterComplaint.jsx` step 1 (client-side search over `/brand/customers`)

## Tasks

### Backend
- [x] `shared/phone.js`: `normalisePhone()` (strip spaces, +91, leading 0 → 10 digits; reject anything else). Use it in all new code. Customer signup/login should also normalise on write; check `auth.service` and note any gap.
- [x] `OwnedAppliance.brandRef: ObjectId<Brand>` + index `{user, brandRef}`. Set it in `ownedAppliance.service` create/update (resolve by name), and in `createTicket` step 7 (upsert rule §7).
- [x] `brand-crm/customer360.service.js`:
  - `searchByPhone(brandId, phone)` returns:
    - `{ match: 'brand', customer: profileSummary }` when `isBrandCustomer` finds an explicit BrandCustomer link, ticket, appliance or legacy SR with this brand
    - `{ match: 'platform', customer: { id, name, maskedPhone } }` when the customer exists but is new to this brand
    - `{ match: 'none' }` otherwise
  - `createCustomer(brandId, actor, { name, phone, alternatePhone, email, address })`:
    - creates `User{role:'customer'}` with a random unusable `passwordHash`
    - 409 `{ existingId }` on a duplicate phone
    - create an explicit `BrandCustomer { brand, customer, createdBy }` relationship with the User in the same transaction; audit `customer.created` and the relationship after commit
    - audit `customer.created`
  - `updateCustomer(…)` changes name, email, alternatePhone and addresses only (no phone change, which would need re-verification). Audited.
  - `getProfile(brandId, customerId)`: 404 unless the customer is linked to this brand. Returns:
    - `customer` (id, CUST-id, name, phone, alternatePhone, email, addresses, createdAt)
    - `products[]` (OwnedAppliance with this brandRef + warranty status via `evaluateWarranty` once Phase 5 lands; until then `shared/brandWarrantyEstimate.js` (the same manufacturer-only estimate used by ticket intake; unknown purchase dates require verification))
    - `tickets[]` (all this brand's tickets: ID, brand ticket no, source, status, jobStage, product, createdAt, closedAt)
    - `openTickets` count
    - `completedJobs[]` (closed tickets with partner name, closure date, rating)
    - `communication[]` (this brand’s non-internal ticket events `CUSTOMER_CONTACTED` / `CONTACT_REQUESTED` + notifications with `brand = brandId` and `recipient = customerId`; exclude unscoped legacy notifications. Phase 9 fills the remaining contact flow)
    - `stats` (total, open, completed, avg TAT hours)
  - `listCustomers(brandId, { q, page, limit })`: customers linked through BrandCustomer, tickets, appliances or legacy SRs. Server-side search on name, phone and CUST-id, paginated in Mongo (not in memory).
- [x] Routes `/api/v1/brand/customers`:
  - `GET /` (customers:view)
  - `GET /search?phone=` (customers:view)
  - `POST /` (customers:create)
  - `GET /:id` (customers:view)
  - `PATCH /:id` (customers:edit)
  - `POST /:id/addresses` (customers:edit)
  - export `GET /?format=csv`: additionally require `customers:export` inside the handler before querying; the route table alone checks only `customers:view`. Use a separate authenticated blob download helper in the frontend (the current apiRequest expects JSON). Bound exports and escape CSV cells.
- [x] Remove `GET /brand/customers` from `brandInsights.routes.js`. Check that `RegisterComplaint.jsx` and others no longer use the old shape.

### Brand Panel
- [x] `Customers.jsx`:
  - server-side search box (phone / name / CUST-id)
  - table with open/total tickets and last activity
  - row → **Customer 360 page** (`/brand-admin/customers/:id`, new `CustomerProfile.jsx`), with tabs Overview · Products · Tickets · Service history · Communication
  - "New ticket for this customer" button (links to Register Complaint pre-filled, Phase 4)
- [x] Create-customer modal with phone validation and duplicate handling: on 409, offer "Open existing profile" only for a brand-linked customer. A platform-only customer remains a masked match and can be selected for a Phase 4 ticket; finding them must not itself create a relationship or reveal their full profile.
- [x] Gate by permissions (Phase 2).
- [x] Reuse the customer "Sign in with OTP" option added in the readiness fixes; test that a CCE-created customer with an unusable password can sign in using the registered phone.
- [x] Keep phone immutable in the brand edit endpoint. Name/email/alternatePhone/addresses are shared platform identity; clearly identify shared profile edits in the UI and audit field diffs. Brand-specific notes must stay on BrandCustomer, not User.

### Tests
- [x] `backend/tests/brandCrmCustomer360.test.js`:
  - phone normalisation variants all find the same customer
  - the three match types
  - a duplicate create → 409 with existing id
  - a profile of a customer linked only to Samsung, opened by LG → 404
  - a platform match reveals only the masked phone
  - the profile lists tickets, products and completed jobs correctly
  - pagination and search run in the DB
  - creating a customer establishes a unique brand relationship and immediately permits this brand’s profile
  - a masked platform match or duplicate POST never creates a relationship
  - notifications from another brand and unscoped legacy notifications are absent
  - Viewer CSV export → 403 even with customers:view
  - concurrent normalized-phone creates → exactly one User/link, loser → 409 with existingId
  - ticket/product upserts preserve existing invoice/purchase date; case/space variants do not duplicate products
- [x] `e2e/ui/brandCrmCustomer360.spec.js`: search → open profile → tabs render real data. Create a new customer → the profile opens.

## API examples
```
GET  /api/v1/brand/customers/search?phone=%2B91%2098765%2043210
  → { match:'brand', customer:{ id, humanId:'CUST-0042', name:'Ravi', openTickets:1 } }
POST /api/v1/brand/customers { name:'Asha', phone:'9876500000', address:{…pincode:'411001'} } → 201
POST same phone again → 409 { message:'Customer already exists', existingId }
```

## Acceptance
- No duplicate customers by phone.
- The profile shows all six areas from real data.
- Brand B can't open Brand A's customer.
- A CCE can create and edit; a Viewer can only view.

## Foundation fixes (2026-10-08)

Readiness fixes landed before Phase 3: brand-token scope validation, customer OTP login UI and normalized auth flows, BrandCustomer model plus `isBrandCustomer`, appliance brandRef resolution, notification brand/ticket provenance, and a shared manufacturer warranty estimate. Phase 3 builds on these prerequisites with customer creation/profile/list/export endpoints, Customer 360 UI and transactional relationship creation. See the resolution log in PHASE-3-READINESS-REVIEW.md.

## Implementation Log

Implemented and verified. Not committed.

### Behavior

- Database-scoped, paginated customer lists combine BrandCustomer links,
  master tickets, registered products and legacy service history. Counts come
  exclusively from master tickets; approved execution jobs are not counted twice.
- Exact normalized mobile lookup distinguishes brand, masked platform and no
  match. Lookup and duplicate POST never grant access or create a brand link.
- Creation writes customer identity and BrandCustomer membership transactionally,
  then records actor-stamped audit rows. Concurrent phone duplicates return 409
  with existingId. On standalone development DBs the existing transaction helper
  falls back to compensating deletion if the membership write fails.
- Customer edits allow only name/email/alternatePhone/addresses; the UI explains
  shared identity edits. Phone and role changes are refused. Address appends are
  atomic and limited to 20 addresses.
- Customer 360 provides Overview, Products, Tickets, Service history and
  Communication tabs with real data, scoped to the requesting brand. Warranty
  uses the shared manufacturer estimate until Phase 5. Internal timeline events
  and another brand’s or unscoped legacy notifications are excluded.
- Product upsert uses an indexed, normalized identity: customer + brand + serial,
  or customer + brand + category/model. Repeated tickets fill missing invoice or
  purchase data but preserve existing values. Ticket + product writes share a
  transaction on replica sets, with fresh ticket document state on retries.
- CSV requires customers:view and an additional customers:export check before
  querying. Exports cap at 5000 matched customers, quote all cells and escape
  formula prefixes. The frontend downloads with portal auth and token refresh.
- The registration screen now uses exact server lookup and accepts a prefilled
  customer link. Submitting tickets there remains paused until Phase 4.

### Files

- New customer360 service/routes/validation under backend/src/modules/brand-crm.
- New shared/applianceIdentity helper; product identity field/index and intake
  upsert in ownedAppliance model/service; brand/customer ticket index. Customer
  appliance registration reuses the same identity and handles concurrent inserts.
- ticketIntake now saves ticket/product as one transaction before emitting audit
  and effects. Existing NCC app response shape remains unchanged.
- app mounts the new customer router; brandAccess supplies every new route rule;
  old brandInsights customer route/service/schema retired.
- Customers.jsx rewritten; new CustomerProfile.jsx and CustomerForm.jsx; App
  detail route; authenticated apiDownload helper; RegisterComplaint lookup and
  prefill updated. Existing customers page permission covers its detail route.
- New brandCrmCustomer360.test.js and brandCrmCustomer360.spec.js; legacy
  brandAdmin test expectation updated to master-ticket counts.

### Verification

- Focused backend run: 5 suites, **122 tests passed**, including all 11 Customer
  360 tests and foundation/RBAC/ticket/brand-admin regressions.
- Browser: Customer 360 (3 scenarios) + OTP foundation (1) → **4/4 passed**.
  Covers creation, edit, all tabs, mobile lookup, duplicate existing-profile
  action, prefilled registration link, masked platform match, Viewer restrictions,
  CSV download and refresh after a real 401.
- Screenshots: phase-3-overview.png, phase-3-products.png and
  phase-3-customer-list.png under screenshots/, visually inspected.
- Final appliance integration check: **52 tests passed** across Customer 360
  and existing appliance tests; no-serial registration reuses the ticket product.
- Build and lint passed on changed/new files; `git diff --check` passed.
- Complete backend coverage: **66/66 test files passed** on an isolated replica
  set. The initial full runs exhausted local MongoDB file descriptors; they
  were stopped after infrastructure failures. The successful second run
  covered 25 files, then all remaining files passed in two bounded batches
  (21 suites / 277 tests and 20 suites / 231 tests), restarting the temporary
  database between batches. The affected city-change and store/inventory
  files passed on rerun. No application failures remained. Test timeout was
  60 seconds for this verification; repository defaults remain unchanged.

### Decisions and limits

- All newly registered appliances resolve brandRef. Under clean-slate D1 there
  is no migration of existing name-only appliances; fixtures/new registrations
  must include or resolve the reference.
- Later-phase job stages, closure ratings and contact events display when
  populated, with honest empty states until then. Brand registration remains
  Phase 4, warranty policies Phase 5, the full contact workflow Phase 9.
- Customer identity is shared platform data; BrandCustomer is membership only.
  Its creation is audited, and ticket/appliance/job links also grant read access.
- Human-readable ID counters may leave gaps after an aborted transaction. They
  remain unique; external effects and audit rows occur only after commit.
