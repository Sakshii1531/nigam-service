# Brand CRM user guide

The Brand CRM uses one ticket from intake through closure and billing. What a
staff member can see and change comes from their assigned role. If a menu is
missing or a page shows **Forbidden**, ask a Brand Super Admin to review the
role in **Users & Roles**.

## Customer Care Executive (CCE)

- Use **Register Complaint** for Toll-Free or manual calls. Search the mobile
  number first; create the customer only when no brand or NCC match exists.
- Complete customer/address, product, complaint and preferred-visit details,
  review the warranty result, then register the ticket.
- Use **My Work** for owned tickets, contact requests and callbacks. Record each
  call or message in the ticket communication panel.
- Use **Customers** for Customer 360: products, warranty, tickets, completed
  jobs and communication history.
- CCE access excludes rates, billing, users, roles and configuration.

## Warranty Executive

- Use **All Tickets** and the **Pending Approval** queue.
- Open a ticket to review customer, product, invoice/media, policy result and
  history. Choose Approve, Reject, Hold, Request Info, Request Document or
  Request Customer Contact.
- Approvals must select warranty or goodwill coverage. Rejections require the
  applicable reason code and remarks.
- Use **Warranty Settings** to view policy and serial-registry behavior when the
  role includes policy access.

## Service Operations

- Use **All Tickets** to follow Partner Finding, offers, assignment, visit and
  job stages. The linked NCC job and allocation attempts appear on ticket
  detail.
- Coordinate accepted reschedule requests and use **Escalations** for work that
  needs intervention.
- Partner allocation and onsite actions happen in the Partner App; the Brand
  Panel receives the resulting stages live.

## Spare Parts

- Use **Part Requests** for requests awaiting brand approval.
- Check part name/number, quantity, ticket, technician, policy payer and approval
  threshold before approving or rejecting with remarks.
- NCC controls fulfilment and dispatch. The Partner App records receipt and
  installation; all milestones appear on ticket detail.

## Finance

- Use **Call Rates & Charges** to review the effective national, state and city
  rate hierarchy. Rate edits require the `rates:edit` permission.
- Use **Invoices** for issued invoices and balances, and **Payments** for receipt
  history and dues ageing. NCC Finance drafts/issues invoices and records
  payments.
- Use **Reports** for State/City billing, source, product, SLA, resolution,
  warranty, billing and partner performance reports. Apply filters before CSV
  or Excel export.

## Quality & Escalation

- Use **Escalations** for L2 SLA breaches, reassigned cases and resolution work.
- An escalation cannot close without a meaningful resolution note. The original
  breach facts remain on the ticket and in the audit log.
- Use **Audit Log** to trace the responsible user, employee ID, action, time,
  reason and changed fields.

## Brand Manager

- Use **Dashboard** for live ticket, SLA and financial KPIs, then open a KPI to
  drill into its filtered ticket queue.
- Own L1 escalations, monitor pending approvals and assignment/resolution risk,
  and use **Reports** for operating reviews.
- Use **Teams & Departments** when the role includes staff-management access.

## Brand Super Admin

- Has every brand permission and is the brand account owner. At least one active
  Brand Super Admin must remain assigned.
- Use **Users & Roles** to create staff, assign departments and edit the module ×
  action permission matrix.
- Use **Settings** for SLA, escalation matrix, billing profile, warranty
  coverage and integrations/API keys.
- Use every operational screen above for oversight. The Brand Super Admin can
  approve a ticket during registration when the chosen intake source permits
  it.

## NCC Super Admin

- Use **Brand Tickets** for cross-brand oversight and dispatch history.
- Use **Part Requests** for NCC approval and fulfilment after any required brand
  approval.
- Use **Brand Billing** to draft and issue invoices, record receipts, maintain
  terms and add audited adjustments.
- Use **Brands** to review each tenant's readiness checklist before enabling
  intake.

## Ticket flow reference

`Pending Approval → Approved → Partner Finding → Offered → Accepted → En Route
→ Reached → Diagnosis → Parts Required/Repair → Completed → Customer
Confirmation → Closed`

The ticket detail page is the reference for the customer, product, warranty,
approval, NCC job, parts, communication, SLA, billing and closure history.
