# My Appliances

Account → **My Appliances** replaces the customer Exchange Details menu and page. `/exchange-details` redirects to `/my-appliances` for existing links. The unrelated exchange administration and exchange purchase workflows remain intact.

Customers can add, search, view, edit and delete products of any brand or category. Registration follows two steps: product details, then optional documents/photos and notes. Files are selected before final save. A confirmation offers View My Appliances and Register another. If an upload fails after product creation, the form explains the partial save and retries only remaining files using the same product ID. Category tiles include Electronics, IT & Computer, Mobile & Gadgets, Home Appliances, Bathware & Sanitary and Others. Brand/category suggestions come from the live catalogue; manual entry supports uncatalogued brands and models; free text supports other products. A product need not have an NCC service offering to be saved. Appliance management is available to signed-in customers outside NCC service areas too; service booking still follows normal serviceability checks.

The list includes authenticated product-photo thumbnails, model, purchase date and a Details saved badge. Search, category chips and category/brand/purchase-date filters help find saved products. The detail page shows a larger photo when one has been uploaded. These badges indicate saved records, not verified warranty coverage.

## Product information

- Appliance nickname, category, brand, model number, serial number.
- Purchase date and dealer/store, notes.
- Customer-recorded manufacturer warranty end date.
- NCC warranty/AMC/extended-warranty status, calculated separately by the existing coverage engine. A personally entered warranty end date does not grant free service.

Serial numbers identify an existing unit. Adding an already saved serial through the new form prompts the customer to edit it instead. Products without serial numbers can be saved as distinct units, including two units of the same brand/model. Existing API registration behavior used by legacy warranty screens remains compatible.

## Private documents and photos

An appliance supports purchase invoices, warranty documents, product photos and other documents. PDF, JPG, PNG and WebP are supported, up to 10 MB per file and 20 files per appliance. Product-photo uploads must be images. Image decoding and PDF signatures are checked on the server.

New files are stored in MongoDB GridFS (`applianceDocuments.files` and `.chunks`), rather than a public upload/CDN URL. Every upload, preview, download and deletion requires customer authentication and ownership of the appliance. File responses are private/no-store. The frontend build and CI use Node 22.13 or later for the PDF renderer. PDF previews use Mozilla PDF.js with page navigation; photos render as images. The browser fetches files with the customer's access token and creates a temporary preview URL, revoked when the preview closes. Include the GridFS collections in existing database backup and capacity planning.

Previously saved `invoiceFileUrl` fields used by older warranty workflows are retained; this feature does not retroactively migrate old public uploads or replace evidence already attached to claims.

## Booking and service history

**Book service** opens the category booking flow with that appliance selected. The customer still chooses the applicable product type/size and service; selections and prices come from the live catalogue. Categories without bookable product services remain manageable and show an availability message when booking is attempted.

The schedule step offers saved appliances for that category and **New / unsaved appliance**. Selecting a saved unit fills its brand and books one unit. Additional quantities/extra units require their own booking rather than being attributed to one saved appliance. **Add appliance** opens the same registration form within booking. New/unsaved bookings do not create a registry entry and explicitly bypass automatic matching to a saved unit, even when the customer has only one appliance of that brand.

History uses explicit `ServiceRequest.appliance` links scoped to the signed-in customer. It loads the most recent 100 linked service requests, with **Load older services** for earlier records. It shows booking statuses and final bill totals when available (otherwise the booked price), with links to booking or partner-warranty details. Unrelated jobs are never inferred from a matching category, brand or model. Older unlinked requests and warranty claims with no service job are not invented as service history.

Deleting an appliance archives its record so historical booking/job references survive, hides it from customer lookup and new service/plan selection, and deletes its private documents. Existing bookings are neither deleted nor cancelled by removing an appliance.

## Validation

- `backend/tests/myAppliances.test.js`: arbitrary categories, distinct units, ownership, private documents, invalid/oversized files, exact booking links, unsaved bookings, cancellation/history and deletion.
- `e2e/ui/myAppliances.spec.js`: mobile Account navigation, two-step registration, upload failure/retry without duplicate products, confirmation/Register another, category tiles/manual entry, search/brand/date filters, authenticated photo thumbnails, CRUD, real private PDF/image preview, saved/unsaved service booking, inline registration, service history, deletion and desktop layout.
- Frontend CI's customer service flow job runs the real appliance and GST browser journeys against isolated MongoDB. Backend CI retains all four Jest shards and the API E2E gate.
