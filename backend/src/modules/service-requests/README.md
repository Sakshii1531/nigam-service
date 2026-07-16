# service-requests

Phase 4. The central complaint/ticket entity referenced by nearly every other module (Invoices, Reviews, Documents, Escalations, ReverseLogistics, ServiceCompletionMonitor). Owns the status state machine with server-side transition validation. See BACKEND_CONTEXT.md §3.6.

**Phase 7 update**: `brand_admin` access to `GET /`, `GET /:id`, and `PATCH /:id/status` is now scoped to `req.user.brand` (previously any brand_admin could see/transition any request — see `../../../docs/DATA_MODEL.md`'s Phase 7 addendum). Viewing (`canView`) and transitioning (`canTransition`) are deliberately separate authorization checks — a customer can view their own request but never transition its status.
