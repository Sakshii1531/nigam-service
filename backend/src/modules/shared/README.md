# shared

Phase 2. Cross-cutting services used by nearly every domain module — build once, early, so later phases don't reimplement:
- `idGenerator` — every human-readable ID prefix scheme (see `src/config/constants.js` `ID_PREFIXES`).
- `warrantyEngine` — computes `warranty_status` from purchase date + brand warranty period + AMC/EW overlay.
- `pricingEngine` — reads `RateCard` / `ServiceCatalogItem`, applies GST (confirm real rate before hardcoding — flagged in BACKEND_CONTEXT.md §9).
- `fileUpload` — Multer -> Cloudinary (user-confirmed choice, post-Phase-11; replaced the earlier S3-compatible placeholder). Falls back to local disk in dev/test only — refuses uploads in production if unconfigured rather than silently using ephemeral local disk (most hosts, e.g. Render, wipe it on restart).

See BACKEND_CONTEXT.md §7.
