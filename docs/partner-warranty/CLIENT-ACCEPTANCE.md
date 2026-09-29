# Partner Warranty — Client Acceptance

The client's 20 requirements, the phase that delivers each, and its status.
Status is updated when the delivering phase's tests pass.

Status legend: ⬜ Not started · 🟨 Partial · ✅ Passing

| # | Requirement | Phases | Status | Evidence |
|---|---|---|---|---|
| 1 | Customer flow: search brands → brand → product → issue → documents (invoice, warranty card, photo) → model, serial, purchase date, remarks → submit | 2, 3, 12 | 🟨 | Phase 2: catalogue APIs. Phase 3: submission with documents, model, serial, purchase date, remarks (`POST /partner-warranty/claims`, test `partnerWarrantyClaim`). Screens in Phase 12. |
| 2 | Real claim created with unique `NCCW-{year}-######` ID (year not hardcoded), customer, brand, product, model, serial, purchase date, remarks, documents, address/pincode, created time, status | 1, 3 | ✅ | Backend: `POST /partner-warranty/claims` stores every listed field + address/pincode, returns `NCCW-{year}-######` (tests `partnerWarrantyModel`, `partnerWarrantyClaim`). |
| 3 | Super Admin Partner Warranty module: all brands' claims (ticket, brand, customer, product, issue, location, date, status, assigned partner) + filters (brand, category, product, status, date, city/pincode) | 8, 14 | ⬜ | |
| 4 | Claim detail page with documents + full timeline (Submitted → Brand Review → Approved/Rejected → Job Created → Partner Assigned → Service Started → Completed → Closed) | 1, 7, 13, 14 | ⬜ | |
| 5 | Automatic routing to the selected brand's panel by `brand_id`, no manual forwarding | 1, 3, 4 | 🟨 | Claims carry the Brand ObjectId from submission; that brand's users are notified, others not (test `partnerWarrantyClaim` › notifies). Brand queue in Phase 4. |
| 6 | Brand panel Warranty Claims: own claims only; Approve, Reject (reason mandatory), Request More Information | 4, 13 | ⬜ | |
| 7 | Request More Info → customer notified → uploads → visible to brand on same claim | 3, 4, 12, 13 | 🟨 | Phase 3: customer sees the request, answers with message + documents, claim returns to Brand Review, brand notified (test › request more information). Brand side in Phase 4. |
| 8 | Approval automatically creates a separate Service Job (`NCCJ-{year}-######`) | 1, 5 | 🟨 | Phase 1: `NCCJ-{year}-######` scheme (test: human IDs). Job creation in Phase 5. |
| 9 | Automatic eligible partner search: pincode/location, distance, product skill, brand authorization, availability, workload, service area, level | 6 | ⬜ | |
| 10 | Offer to nearest eligible; accept → assigned, reject/timeout → next; never stuck with an unavailable partner | 6 | ⬜ | |
| 11 | Partner app shows warranty job: brand, product, issue, location, job ID, "Warranty Service", schedule | 6, 15 | ⬜ | |
| 12 | Real-time status sync to Customer, Brand panel, Super Admin | 7, 12, 13, 14 | ⬜ | |
| 13 | Customer Track Ticket timeline, customer-relevant info only | 7, 12 | 🟨 | Phase 3: customer claim view shows only customer-visible events and fields (test › never shows internal fields). Live tracking in Phase 7. |
| 14 | Super Admin: view claim/job, reassign, change status, escalate, hold, cancel, reopen, manual assignment | 8, 14 | ⬜ | |
| 15 | SLA fields (approval, assignment, visit, resolution) + warning/breach visible to Super Admin | 9, 14 | ⬜ | |
| 16 | Notifications to Customer / Brand / Partner / Super Admin on key events | 10 | 🟨 | Phase 1: brand alerts go to that brand's users only (cross-brand leak fixed); `emitToBrand` / `emitToAdmins` helpers. |
| 17 | Audit trail: who, what, when, old status, new status, remarks/reason | 1, 4, 8 | 🟨 | Phase 1: every claim status change → timeline event + AuditLog row with actor, old/new status, reason (test: timeline + audit trail). |
| 18 | Future brand CRM: API/webhook events CLAIM_CREATED … CLAIM_CLOSED | 10 | ⬜ | |
| 19 | Flow order: Customer → Backend → Super Admin visibility → Brand → approval → auto job → network → partner → execution → 3-way sync | 16 | ⬜ | |
| 20 | Partner Invoice payout: B2B2C jobs, manual settlement, totals + product-wise | 11, 15 | ⬜ | |

## End-to-end acceptance scenario (Phase 16)

> Customer picks **LG → AC → Cooling Issue**, uploads invoice + photo, enters
> model/serial/purchase date, submits → gets `NCCW-2026-000001`.
> Super Admin list shows it; LG brand panel shows it; Samsung's does not.
> LG requests info → customer uploads a photo → LG sees it → LG approves.
> `NCCJ-2026-000001` is created and offered to the nearest LG-authorized AC
> technician in that pincode; they reject → next technician accepts.
> Customer, LG and Super Admin all see "Partner Assigned" live. Partner goes
> on the way → in progress → completes → claim Closed. Timeline, audit log,
> SLA fields, and CLAIM_CREATED…CLAIM_CLOSED events are all recorded; the
> partner's Invoice payout shows the job under LG / AC.
