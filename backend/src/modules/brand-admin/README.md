# brand-admin

Phase 7. Every route here is mounted behind `requireAuth, requireBrandScope` (Phase 3) and every service function double-checks the resolved document's `brand` against `req.user.brand` before returning it — cross-tenant isolation is a correctness-critical requirement, verified by a dedicated Jest/E2E suite (two real brands, cross-access always 403/empty), not just assumed from the middleware alone.

Modules: `invoice` (server-computed totals), `rateCard` (upsert on brand+category+serviceType), `replacementApproval` + `reverseLogisticsReturn` (both also serve as their own creation entry point — no technician-side trigger exists yet), `brandCatalog` (3-level `MasterService` → `SubBrand` → `BrandProduct` hierarchy), `team` (+ add/remove members), `brandRole` + `brandUser` (brand-scoped RBAC — `BrandUser` folded into the shared `User` collection, same Phase 1 deviation as everywhere else), `generatedDocument` (PDF rendering itself out of scope, just tracks the record).

This phase also closed a gap left open since Phase 4: `service-requests/serviceRequest.routes.js`'s list/get/status-transition routes now properly scope `brand_admin` by `req.user.brand` (previously any brand_admin could see and transition *any* service request). See BACKEND_CONTEXT.md §5 and `../../../docs/DATA_MODEL.md`'s Phase 7 addendum.
