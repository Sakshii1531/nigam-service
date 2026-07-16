# Nigam Care (NCC) — Backend Context

> Reverse-engineered from the existing React frontend (`frontend/`) which is a **pure UI mock**: no backend calls exist anywhere (no `fetch`/`axios`), all "persistence" is `localStorage`, in-memory `useState`, or React Router `location.state`. This document exists to give backend development a single source of truth for the data model, workflows, and API surface implied by the UI, so the backend can be built to match what the frontend already expects.
>
> Stack of the frontend: React 19 + Vite + React Router v7 + Tailwind v4 + Framer Motion. No state management library beyond two small Context providers (`BookingContext`, `TechContext`) — most pages just use local `useState`, which is a strong signal that **almost everything currently "faked" client-side needs to become a real API call**.

---

## 1. Product Overview

Nigam Care is a home-appliance **services marketplace** (Urban-Company/Servify style) with **four applications sharing one router** (`frontend/src/App.jsx`):

| App | Route prefix | Users |
|---|---|---|
| Customer app (mobile-simulated) | `/`, `/home`, `/dashboard`, `/buy`, `/booking`, `/partner-warranty`, ... | End consumers |
| Technician app | `/technician/*` | Field service technicians |
| Brand-admin panel | `/brand-admin/*` | Appliance brand partners (LG, Samsung, Voltas...) managing their warranty ops within the marketplace |
| Super-admin panel | `/super-admin/*` | Platform operator — manages brands, technicians, cities, pricing, content, finance |

The business spans several overlapping sub-domains that all funnel into one **complaint/service-request** core:
1. **On-demand repair/install/maintenance booking** (D2C paid service)
2. **Brand warranty claims** (in-warranty repair via brand partner)
3. **NCC Extended Warranty / NCC Shield** (platform-sold protection plan)
4. **AMC (Annual Maintenance Contract)** — scheduled recurring visits
5. **Buy** — new appliances, refurbished appliances, extended warranty/AMC purchase
6. **Exchange** — trade-in old appliance for discount on new purchase
7. **Rewards/Loyalty** — coins wallet, membership tiers, coupons, referrals, spin wheel

---

## 2. Roles, Auth & Sessions

All four apps share the **same auth UI pattern** (`components/auth/OtpVerification.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, parameterized by a `variant`/`portalLabel` prop), so the backend should expose **one auth module parameterized by role**, not four copies.

- **Login**: phone+password or email+password (toggle), no real validation in UI (demo creds hardcoded per app: e.g. `admin123@gmail.com`/`admin123` for admin panels, `9876543210`/`password123` for customer).
- **OTP verify**: 6-digit, 30s resend timer. Needed: `POST /auth/otp/send`, `POST /auth/otp/verify`.
- **Forgot/Reset password**: `POST /auth/forgot-password`, `POST /auth/reset-password`.
- Suggested roles/tenancy: `customer`, `technician`, `brand_admin` (scoped to a `brand_id`), `super_admin`. Brand-admin further implies **sub-roles** (see §7.6 RBAC).
- Session: no token handling visible in UI — assume JWT/session cookie is entirely a backend decision; UI just needs `POST /auth/login` → redirect on success.

---

## 3. Core Entities (cross-app, consolidated)

These are the entities referenced by **multiple** apps and should be modeled once, then referenced by FK everywhere.

### 3.1 User / Customer
```
User {
  id, name, phone, email, password_hash,
  avatar, addresses[] -> Address,
  wallet_coins (int),           // "Nigam Coins" — 10 coins = ₹1
  referral_code, referred_by,
  membership_tier (Silver|Gold|Plus Gold|Diamond|Platinum),
  source (B2B|B2C|AMC|Extended Warranty),   // seen in super-admin Users.jsx
  status (Active|Suspended|Pending),
  created_at, last_active
}
```

### 3.2 Address
```
Address { id, user_id, type (Home|Work|Other), house, landmark/area, city, pincode, name, is_default }
```

### 3.3 Product / Appliance (customer-owned instance, not catalog)
```
OwnedAppliance {
  id, user_id, category, brand, model, model_number, serial_number,
  purchase_date, invoice_file_url, dealer,
  warranty_status (In Warranty|Out of Warranty|Extended Warranty|AMC)
}
```
Warranty status is **derived** (purchase_date + plan), not just stored — brand-admin explicitly needs "a shared warranty computation service" (referenced from Requests, Warranty, PartRequests, Customers, RegisterComplaint).

### 3.4 Service Catalog (brand/admin-editable — currently `data/bookingCatalog.js` + `localStorage` overrides)
```
Category { key, name, icon, color, category_note }
ProductType { id, category_key, name, icon, desc }
ServiceCatalogItem { id, category_key, name, icon, desc, price, unit }
CategoryBrand { category_key, brand_name }   // brands offered per category
```
This is CMS content today authored via **super-admin `CustomerAppCustomization.jsx`** and read by the customer app via `custom_service_details_configs`/`custom_service_catalogs`/`custom_categories` localStorage keys — a strong signal this must become a real admin-editable catalog service.

### 3.5 Booking (D2C on-demand service)
```
Booking {
  id (NCC-YYMMDD-####),
  user_id, category, product_type, service_id, brand,
  quantity, scheduled_date, time_slot,
  address_id, full_name, mobile,
  payment_mode (advance|after), advance_amount, total_price,
  status (Upcoming|Ongoing|Completed|Cancelled),
  technician_id (assigned on creation, e.g. auto-assigned)
}
```
`POST /bookings` should return `bookingId` + assigned technician (BookingSuccess.jsx shows this immediately). `GET /bookings?status=`.

### 3.6 Service Request / Complaint / Warranty Ticket (the central entity)
This is the same underlying entity viewed differently by each app — **brand-admin explicitly encodes dual IDs** (brand ticket no. `SOM-GKP-YYMMDD-######` + platform ID `NCC-YYMMDD-#####`), confirming multi-tenant ticket numbering is required.

```
ServiceRequest {
  id, ncc_id, brand_ticket_no,
  user_id, technician_id, brand_id,
  category, product (owned_appliance_id), model, serial_no,
  complaint_type (Breakdown|No Power|Noise|Performance|Physical Damage|Intermittent),
  description, priority (Critical/High/P1..Low/P3),
  warranty (In/Out of Warranty), invoice_available, attachments[],
  request_mode (B2B|B2C),
  status: New → Assigned → Engineer Accepted → Visit Scheduled → Engineer Reached
        → Diagnosis Done → (Spare Required → Ordered → Received) → Repair Completed
        → Customer Confirmation → Closed
        (also: Customer NA, Reschedule, Cancelled, SLA Breached, Escalated)
  sla_due_at, zone, created_at, updated_at
}
ServiceRequestTimeline { id, request_id, step_label, done, timestamp, description }
```
Endpoints: `POST /service-requests`, `GET /service-requests/{id}`, `GET /service-requests/{id}/timeline`, `PATCH /service-requests/{id}/status`, `POST /service-requests/{id}/reassign`.

### 3.7 Extended Warranty (NCC Shield) / AMC purchase records
```
ExtendedWarrantyOrder {
  id (NCCEW######), user_id, appliance, brand, tier_id, price,
  full_name, mobile, email, pincode, model_number, purchase_date, invoice_file,
  valid_till, status (Active|Expired), coverage[], terms,
  claims_remaining, claims_total
}
AMCPlan { id, name, price, visits_total, tier (Silver/Gold/Platinum AMC) }
AMCSubscription {
  id (NCCAMC####), user_id, plan_id, appliance, brand, model,
  expiry_date, status (Active|Expiring Soon|Expired),
  visits_total, visits_remaining, visit_number
}
AMCVisit { id, amc_subscription_id, visit_number, scheduled_date, technician_id, status, tasks[], notes }
Claim { id (NC#####), user_or_tech_id, brand, item, claim_type (Brand|Extended Warranty|D2C), amount, status (Pending Approval|Approved|Rejected), reason, date }
```

### 3.8 Buy / Commerce (three overlapping sub-domains found in UI, should likely be unified into one Product+Order model)
```
Product { id, category, name, brand, condition (New|Refurbished), condition_grade,
  original_price, price, rating, specs[], full_specs{}, warranty_months, benefits[], stock, sku, image }
CartItem { user_id, product_id, quantity }
Wishlist { user_id, product_id }
Order { id (NCCO######), user_id, items[], address_id, payment_id, total, status }
```

### 3.9 Exchange (trade-in)
```
ExchangeQuestionSet { id, category, questions: [{ id, text, type(Yes/No|Radio|Toggle), options[], deductions{option: fraction} }] }
ExchangeCampaign { id, name, badge_text, highlight_color, status, bonus_amount }
ExchangeProductConfig { product_id, exchange_enabled, supported_categories[], question_set_id, badge_text, campaign_id, max_value }
ExchangeRequest {
  id (EX-####), user_id, category, brand, model, condition,
  answers{}, base_value, deductions_amount, bonus_amount, estimated_value,
  status (Pending Inspection|Inspection Approved|Defective Received|Received at WH),
  applied_to_order_id
}
```
Valuation formula: `estimated_value = base_value - deductions_amount + bonus_amount` (deductions computed by summing `deductions[selected_option] * base_value` across answered questions). `POST /exchange/valuate`, `POST /exchange/apply`.

### 3.10 Payments / Wallet
```
Payment { id, user_id, target_type (booking|order|extended_warranty|amc), target_id,
  amount, method (Card|UPI|NetBanking|Cash|Wallet), status (Success|Failed|Refunded), gateway_ref, coins_redeemed }
WalletLedger { id, user_id, delta, reason (earned|redeemed|referral|scratch_card|spin_wheel), balance_after, created_at }
PaymentMethod { id, user_id, type (card|upi|netbanking), masked_detail, is_default }
```
No real gateway integration exists in UI — needs `POST /payments/intent`, `POST /payments/{id}/confirm`. Nigam Coins: 10 coins = ₹1, deducted client-side today, must move server-side.

### 3.11 Coupons / Loyalty / Referral
```
Coupon { code, discount, description, expiry, status }
Membership { id, name, price, benefits[], tier_rank }
SpinWheelSegment { label, probability, reward }
Referral { code, user_id, bonus_amount, referred_user_id, status }
LoyaltyMilestone { title, threshold, benefit, status }
```

### 3.12 Notifications
```
Notification {
  id, user_id (or role/target: All|Technicians|Brands), type (assigned|created|payment|completed|jobs|claims|payments|service|tech|dispatch),
  title, message, detail, cta_label, cta_route, priority, read, created_at
}
NotificationPreference { user_id, channel (push|sms|email), enabled }
```
`GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`. Notifications map 1:1 to `ServiceRequest`/`Booking`/`Payment` lifecycle events — should be emitted server-side as domain events, not just CRUD.

### 3.13 Chat / Messaging
```
Conversation { id, service_request_id, customer_id, technician_id, status }
Message { id, conversation_id, sender (customer|technician|ai|agent), text, attachment_url, sent_at, status (sent|delivered|read) }
```
Needs a **real-time layer** (WebSocket) scoped per booking/ticket, with phone-number masking for customer↔technician calls. Also present: an **AI Assistant chat** (technician-facing, keyword-canned replies today — candidate for real LLM integration later) and a **Technical Support chat** (agent-facing).

### 3.14 Reviews
```
Review { id (REV-###), service_request_id, user_id, technician_id, rating (1-5),
  category_ratings {overall, technician_behavior, service_quality, timeliness},
  tags[], photos[], tip, comment, status (Reviewed|Responded|Escalated), brand_response }
```

---

## 4. Technician Domain

### 4.1 Technician profile
```
Technician {
  id (TECH-###), name, phone, email, city, skills[]/specs[] (AC|Refrigerator|Washing Machine|RO|TV|Chimney),
  rating, active_jobs_count, completed_jobs_count,
  status (Active|Inactive|Pending), availability (Available|Busy|Offline),
  verification: { aadhar_status, pan_status, background_check_status }, trust_score,
  join_date, service_partner_id, tier (TSP|SP|Senior SP — job-count based ladder),
  bank_account: { bank_name, account_no, ifsc, holder_name, is_primary },
  upi_accounts[]
}
Certification { id, technician_id, name, issuer, date, status }
Skill { technician_id, name, level (Expert|Advanced|Intermediate), years }
```

### 4.2 Job (technician's view of a ServiceRequest/Booking)
A technician "job" is a `ServiceRequest`/`Booking` joined with type-specific metadata. Frontend `TechContext.jobs` shows the full shape needed per-job:
```
Job = ServiceRequest ⨝ {
  type (NCC Paid Service|Brand Warranty|NCC Extended Warranty|AMC Visit),
  is_d2c, is_partner, is_priority, is_recommended, is_ncc_ew,
  est_earnings, price, distance_km,
  // AMC-specific: amc_plan_name, amc_id, amc_visits_total/remaining, amc_visit_number, amc_plan_expiry, amc_plan_type
  // EW-specific: ew_plan_name, ew_valid_till, ew_claims_remaining/total
}
```

### 4.3 Job state machine (drives ActiveJob.jsx — the largest page in the app)
```
idle → details → assigned → ontheway → inspection → spareapproval → repaircomplete → billing → completed
```
Plus **revisit sub-flow** states: `revisit_complete`, `spare_part_required`, `completed_pending`, `cancellation_summary`, `unable_to_fix_summary`, `revisit_billing`, `revisit_payment(_upi|_cash|_card|_wallet)`, `revisit_otp`.

Backend should expose this as an explicit **status transition API** (`POST /jobs/{id}/transition {to_status}`) with server-side validation of legal transitions, not a client-trusted enum. Sub-entities collected along the way:
```
JobDiagnosis { job_id, checklist_actions{}, notes, photos[] (product/serial/issue) }
JobAdditionalService { job_id, service_name, price, checked }  // e.g. Deep Cleaning ₹599
JobSparePart { job_id, part_id, name, price, checked, source (recommended_ai|manual) }
JobProof { job_id, photos_count, videos_count, voice_note, signature_url, geo_location }
JobRevisit { job_id, expected_date, repair_status (completed|unable|cancelled), reason, otp, signature_url }
JobBillingEstimate { job_id, service_charge, spare_parts_total, additional_services_total, gst_pct(18), total, technician_earnings }
```
Job-type-specific "overview" views (AMC/Brand-Warranty/Extended-Warranty) always show spare parts at **₹0 "Covered"** and only chargeable "extras" — pricing engine must know which job types are non-billable for parts/labor.

### 4.4 Inventory & Parts (technician-held stock + ordering)
```
TechInventoryItem { id, technician_id, name, sku, qty, price, status(In/Low/Out of Stock — derived from qty thresholds) }
PartOrder { id, technician_id, job_id?, part_id, qty, order_source (NCC Warehouse|Partner Brand|Nearby Store), status }
```
`raiseClaim`/FOC claims reuse the `Claim` entity (§3.7).

### 4.5 Earnings & Payouts
```
EarningsTally { technician_id, today, total, completed_today, completed_total }
Payout { id, technician_id, job_id, base_amount, platform_fee, net_amount, payout_type (Quick|Invoice), status (Settled|Pending), credited_to, transaction_id, created_at }
```
`POST /payouts/withdraw`.

### 4.6 Academy / Training
```
TrainingGuide { id (GD-###), title, type (PDF|Video), product, downloads, url }
Course { id (CRS-###), name, modules[], test_required, min_score, status }
TechBlog { id, title, category, read_time, author, body }
```

### 4.7 Announcements
```
Announcement { id, message, severity, scope (all|city|role), created_at }
```

---

## 5. Brand-Admin Domain

Brand-admin is a **tenant-scoped** view (`brand_id`) over the shared `ServiceRequest`, `Claim`, `Technician`, `Invoice` entities, plus brand-owned config:

```
Invoice { id (INV-YYYY-###), service_request_id, customer_id, technician_id, brand_id,
  product, service_charge, part_charge, gst, total, status (Paid|Pending|Failed) }
RateCard { id, brand_id, category, service_type, labor_rate, parts_markup_pct, total_base (computed) }
  // pricing engine config feeding invoice generation
ReplacementApproval { id (RPL-###), request_id, product, reason, tech_notes, status (Pending|Approved|Rejected|Info Requested) }
ReverseLogisticsReturn { id (RET-###), technician_id, part_name, sku, request_id, transit_status, status, tracking_no, damage_flag }
BrandCatalog: MasterService { id, name, type, charge } → SubBrand { id, name, category } → Product { id, name, model } → mapped services
  // 3-level hierarchy: brand → sub-brand → product → services (from Catalog.jsx, the schema-richest brand-admin page)
Team { id, name, department (Field Service|QA|Remote Support|Installation), lead, members[], active_requests, region }
Role { name, permissions[] }   // Brand Admin / Support Agent / Finance / Viewer — RBAC scoped within a brand
BrandUser { id, name, email, role, last_login, active }
GeneratedDocument { id (DOC-###), type (Service Completion Letter|Warranty Certificate|FOC Approval Letter|Replacement Authorization|Customer Bill Copy), service_request_id, generated_by, generated_on, pdf_url }
```

Key cross-cutting note from analysis: `service_request_id`/`ticket_id` is the FK that ties Requests, Invoices, Reviews, GeneratedDocuments, ReverseLogisticsReturn, Escalations, and ServiceCompletionMonitor together — reinforces `ServiceRequest` (§3.6) as the central table.

---

## 6. Super-Admin Domain

Platform-level entities not owned by any single brand:

```
Brand { id, name, category, status(Active|Pending), sla_resolution_time, sla_adherence_pct, csat, contract_terms }
City { id, name, state, district, coverage_area_sqkm, technician_count, status }
ServicePartner { id, name, manager, email, phone, city, technician_count, rating, status }  // "centers" employing technicians
ASM { id, name, email, phone, city, rating, partner_count, active_jobs }  // Area Service Manager oversees partners in a city
AssignmentWeighting { proximity_pct, skill_pct, rating_pct, workload_pct }  // auto-assign scoring engine, must sum to 100
LiveTracking { job_id, technician_id, status, eta, coords{lat,lng}, updated_at }  // GPS feed
Escalation { id, ticket_id, description, city, priority (High|Critical), manager, status (Unassigned|In Progress|Resolved) }
AuditLog { id, user_id, action, type (System|Support|User|Finance|Inventory), created_at }
SparePartCatalog { id, name, brand, code, cost_price, markup_pct, retail_price, stock, status }
PlatformSettings { platform_name, support_email, maintenance_mode, gst_default, payment_gateway_keys, notification_toggles, 2fa }
```

### 6.1 Finance
```
BillingTransaction { id, user_id, amount, type (Service Fee|Payout|Brand Share|Refund), status, date }
Revenue { id, source, gross, partner_share, margin_pct, net }
Payout { id, partner_id, city, balance, last_paid, status (Pending Approval|Paid) }
GatewayTransaction { id, ref, customer_id, amount, gateway (UPI|Card|NetBanking), status (Success|Failed|Refunded) }
```

### 6.2 CMS / App Customization (super-admin authored, consumed by customer & technician apps)
```
Banner { id, image, segment (warranty|non-warranty), app (customer|technician) }
Story { id, title, type (Promo Banner|Customer Help Slider|Informational), aspect_ratio, clicks, status (Active|Scheduled) }
Video { id, title, duration, size, views, active }
Advertisement { id, name, type (App Header Banner|Category Popup|Cart Bottom Banner), budget, clicks, status }
CMSPage { slug (privacy-policy|terms|faqs), body, published_at }
AppSetting { app (customer|technician), key, value }  // e.g. offlineMode, autoAssign, gpsInterval, payoutCycle
```
`CustomerAppCustomization.jsx` is the largest single page in the codebase (~165KB) — it's essentially a merchandising/CMS builder for the entire customer-app catalog (categories, banners, services, brand offer cards, most-booked services). This strongly implies the backend needs a proper **admin-editable content service**, replacing today's localStorage-based overrides in `bookingCatalog.js`/`Dashboard.jsx`.

### 6.3 Loyalty Program config (authored by super-admin, consumed by customer app §3.11)
`coin_rate`, milestones, membership plans (Silver/Gold/Diamond/Platinum), spin-wheel segments (probabilities must sum ≤100%), referral bonuses, campaign-scoped coupons.

### 6.4 RBAC
`Roles.jsx` implements a **boolean permission matrix** across 5 coarse domains: `{ users, techs, brands, billing, settings }`. Brand-admin's `UserRoleManagement.jsx` implements a **separate, brand-scoped** RBAC with named roles (Brand Admin/Support Agent/Finance/Viewer) and finer permission lists. Backend should implement a real RBAC table (`roles`, `permissions`, `role_permissions`, `user_roles`) rather than hardcoded enums, since both panels clearly expect to edit permissions dynamically.

---

## 7. Cross-Cutting Concerns for Backend Design

1. **No API calls exist today** — every list/detail page is `useState` + inline mock arrays. Treat every mock array found above as a required `GET` endpoint; every action button (Approve/Reject/Assign/Dispatch/Mark Paid/etc.) as a required mutating endpoint.
2. **ID schemes are already specified by the frontend** and should be preserved so existing UI needs no changes:
   `NCC-YYMMDD-####` (bookings), `NCCW-2024-######` (warranty tickets), `NCCEW######` / `NCCAMC####` (extended warranty/AMC), `NCCO######` (orders), `SR-####` / `SOM-GKP-YYMMDD-######` (brand-side complaint), `INV-YYYY-###`, `CLM-####`/`NC#####`, `AMC-####`, `EX-####`, `RPL-###`, `RET-####`, `PR-####`, `SKU-####`, `REV-###`, `DOC-###`, `GD-###`/`CRS-###`, `TECH-###`, `CUST-###`, `VR-####`, `JOB-xxx`.
3. **Warranty-status computation** must be a shared service (purchase_date + brand warranty period + any AMC/EW overlay), queried from Bookings, Requests, PartRequests, Customers views, and the pre-booking warranty-check modal on the customer dashboard.
4. **Every admin list page follows the same UI pattern**: KPI/stat cards (→ aggregation endpoints), filter/search, paginated table, row detail drawer, one or more status-transition actions, CSV/PDF export. Design a consistent list-endpoint contract (`?status=&search=&page=&date_from=&date_to=`) once and reuse it.
5. **Pricing engine**: `RateCard` (brand-admin `CallRatesCharges.jsx`) drives invoice/labor pricing; GST is a confirmed flat 18% everywhere (the 10% in Buy.jsx extended-warranty checkout was mock-data inconsistency, not a real second rate — see §9); job types AMC/BrandWarranty/ExtendedWarranty always show parts/labor as ₹0 "Covered" with only extras chargeable.
6. **Real-time requirements**: chat (customer↔technician), live GPS tracking (super-admin Tracking.jsx), and notification push — these need WebSocket/SSE, not just REST polling.
7. **File uploads**: invoices, warranty cards, product photos, complaint photos (up to 4), signatures (canvas-drawn), documents for technician verification (Aadhar/PAN/background check), brand-admin bulk upload for complaints.
8. **Auto-assignment engine**: super-admin `Assignment.jsx` implies a scoring service (`score = w1*proximity + w2*skill + w3*rating + w4*workload`, weights configurable, sum to 100%) — needed for both manual-override assignment and the "technician auto-assigned on booking" flow seen in customer BookingSuccess.
9. **Multi-tenancy**: brand-admin pages must scope all queries by `brand_id`, and a `ServiceRequest` can simultaneously carry a platform ID and a brand-specific ticket number.
10. **Demo/seed data reference**: hardcoded persona "Sakshi Dwivedi" (customer), "Rahul Sharma" (technician, 4.8★, 128 jobs) recur across screens — useful as consistent seed data during backend dev so the existing UI "just works" against real data without visual diffs.

---

## 8. Suggested High-Level API Surface

```
Auth:            POST /auth/login, /auth/otp/send, /auth/otp/verify, /auth/forgot-password, /auth/reset-password
Users/Profile:    GET/PUT /me, /me/addresses (CRUD), /me/wallet, /me/coupons
Catalog:         GET /catalog/categories, /catalog/categories/{key}, PUT (admin) /catalog/categories/{key}
Bookings:        POST /bookings, GET /bookings, GET /bookings/{id}
ServiceRequests: POST /service-requests, GET /service-requests, GET/{id}, GET/{id}/timeline,
                 PATCH /{id}/status, POST /{id}/reassign, POST /{id}/rating
Warranty/AMC/EW: GET /extended-warranty/tiers, POST /extended-warranty/purchase, GET /my-warranties,
                 GET /amc-plans, GET /amc-subscriptions, POST /amc-subscriptions/{id}/schedule-visit,
                 POST /claims, GET /claims
Buy:             GET /products, POST /cart, GET /cart, POST /orders, GET /orders/{id}
Exchange:        GET /exchange/question-sets, POST /exchange/valuate, POST /exchange/apply
Payments:        POST /payments/intent, POST /payments/{id}/confirm, GET /wallet/ledger
Notifications:   GET /notifications, PATCH /notifications/{id}/read, PATCH /notifications/read-all
Chat:            WS /conversations/{id}, GET /conversations/{id}/messages, POST /conversations/{id}/messages
Technician:      GET /tech/jobs, POST /tech/jobs/{id}/accept, POST /tech/jobs/{id}/transition,
                 POST /tech/jobs/{id}/diagnosis, POST /tech/jobs/{id}/billing-estimate,
                 GET/POST /tech/inventory, POST /tech/part-orders, POST /tech/claims,
                 GET /tech/earnings, POST /tech/payouts/withdraw, GET/POST /tech/payout-methods,
                 GET /tech/academy/guides, /tech/academy/courses
Brand-admin:     GET /brand/{brandId}/requests, /invoices, /technicians, /inventory, /rate-cards,
                 /amcs, /exchanges, /warranty-claims, /replacement-approvals, /reverse-logistics,
                 /catalog, /reviews, /teams, /users, /documents
Super-admin:     GET/POST /admin/brands, /cities, /technicians, /service-partners, /asm, /users,
                 /roles, /assignment/auto, /tracking, /escalations, /billing, /revenue, /payouts,
                 /transactions, /cms/*, /loyalty/*, /reports, /logs, /settings
```

---

## 9. Open Questions to Confirm Before/While Building

- Is `ServiceRequest`/`Booking`/warranty "ticket" meant to be **one unified table** with a `type` discriminator (recommended, given the technician `Job` view already unifies them), or genuinely separate systems that later merge for the technician? — resolved as a single `ServiceRequest` collection (Phase 1); `Job` (Phase 6) is the technician-facing join on top of it.
- ~~GST rate: 18% appears almost everywhere, but Buy.jsx extended-warranty checkout computes 10% — confirm the correct rate(s) per product line.~~ **Resolved (user confirmed, post-Phase-6): flat 18% everywhere.** The 10% sighting was mock-data inconsistency, not a real second rate. See `GST_PERCENT_DEFAULT` in `backend/src/config/constants.js`.
- Real payment gateway choice (Razorpay key field appears in super-admin Settings.jsx — likely Razorpay). Still open — `paymentGateway.js` remains a stub.
- Real-time transport choice for chat/tracking (WebSocket vs SSE vs polling) and infra (self-hosted vs managed, e.g. Pusher/Ably/Socket.IO). Still open — Phase 9 scope.
- File storage (S3-compatible?) for invoices, photos, signatures, documents. Still open — `fileUpload.js` has a local-disk dev fallback, S3/R2 config is a no-op until env vars are set.
- Whether brand-admin "sub-roles" and super-admin "roles" should be one unified RBAC system or intentionally separate (brand-scoped vs platform-scoped). Still open — current `Role` model uses a `scope` discriminator (Phase 1 deviation, see `DATA_MODEL.md`), leaning unified, but not explicitly confirmed with the user.
- Technician payout rate on warranty/AMC/EW-covered visits — still a flat ₹150/visit placeholder (`FLAT_COVERED_VISIT_EARNINGS` in `job.service.js`), pending real brand `RateCard`s (Phase 7). **User confirmed (post-Phase-6): fine to leave as-is for now, not urgent.**
- Whether to build the AMC/Extended-Warranty purchase flow and Referral/Membership/SpinWheel/Loyalty modules earlier than their planned phases — **user confirmed (post-Phase-6): no, stick to the original 16-phase roadmap order.**
