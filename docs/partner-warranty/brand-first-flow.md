# Brand-first partner warranty

Updated 22 October 2026.

Customers open Partner Warranty, search or select an active warranty-enabled
brand, then select one of that brand's covered products and an issue. Documents,
address, submission, brand approval and technician execution follow the existing
claim journey.

Current customer routes:

- `/partner-warranty`: searchable partner-brand cards and My Warranty Claims.
- `/partner-warranty/products/:brandId`: the brand's active covered products.
- `/partner-warranty/issues/:brandId/:categoryId`: product issues.
- `/partner-warranty/raise-request/:brandId/:categoryId`: claim intake.

Super Admin's catalogue starts with Brands, followed by Issues and Policies &
Serials. Brand coverage, listing, terms, rates and permissions remain managed by
the existing APIs. The claim list and CSV no longer present the old group as a
category. Product filtering remains available. Brand Admin's Warranty Settings
explains direct brand discovery and manages the products shown after selection.

Compatibility: stored claims and groups are retained. Old group catalogue URLs
open the brand directory. Old product/issue/intake URLs remain readable; their
next links use the current routes and product reads use full brand coverage.
Group APIs remain for older clients and historical records; current customer and
admin screens do not call them. No migration or deletion is needed.

Regression coverage:

- `backend/tests/partnerWarrantyCatalog.test.js`: an empty group collection still
  returns listed brands and their covered active products; unlisted brands stay
  unavailable.
- `e2e/ui/partnerWarrantyBrands.spec.js`: desktop/mobile navigation, search,
  failures, old URLs, Super Admin catalogue and Brand Admin coverage. Runs in
  Frontend CI through `playwright.workspace.config.js`.
- Existing `partnerWarranty`, `warrantyJourney`, `adminWarranty` and
  `brandWarranty` browser suites exercise the real APIs and claim lifecycle.
