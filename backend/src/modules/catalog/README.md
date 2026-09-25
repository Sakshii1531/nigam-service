# catalog

The Master Service & Offering Catalogue — `Category` → `ProductType` / `Variant` / `CatalogService` → `ServiceOffering` → `OfferingRate` (append-only, paise). The single source of customer prices and partner payouts. Customer reads: category tree, offering detail, quote, search (`catalog.routes.js`); admin: `catalogAdmin.routes.js`. Design and phase logs: `docs/master-catalogue/`.
