# brand-admin

Phase 7. Every route here MUST be scoped by `brand_id` via `requireBrandScope` middleware (Phase 3) — cross-tenant isolation is a correctness-critical requirement, not optional. `Invoice`, `RateCard`, `ReplacementApproval`, `ReverseLogisticsReturn`, the 3-level `Catalog` hierarchy (master service -> sub-brand -> product -> mapped services), `Team`, brand-scoped `Role`/`BrandUser`, `GeneratedDocument`. See BACKEND_CONTEXT.md §5.
