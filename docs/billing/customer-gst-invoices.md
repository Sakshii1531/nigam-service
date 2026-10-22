# Customer business GST invoices

Customers can request a business tax invoice in the final address/payment step of service booking. They enter a GSTIN, registered business name and billing address. GST is still payable: the invoice separates the taxable value from GST; this option does not give a tax exemption or promise input tax credit.

## Set up before issuing live invoices

In **Super admin → Settings → Tax → Customer GST invoices**:

1. Enter the actual registered supplier's legal name, GSTIN and registered address.
2. Enter the authorised signatory's name and upload their signature.
3. Confirm the appropriate service SAC and parts HSN with accounts. Service offerings can retain their own SAC; the defaults are fallbacks, not universal classifications.
4. Confirm whether IRP e-invoicing applies to the supplier. This app does not register invoices with an IRP. When the IRP requirement is enabled, automatic issuance is blocked until accounts supplies the external invoice number, IRP acknowledgment and signed QR image. Accounts must reconcile the external invoice number, values and recipient with the invoice issued here. An IRN entered by staff is not independently authenticated by the app.
5. Enable invoices. Choose automatic issuance for ordinary same-state billing, or disable it to review every invoice.

There is no default real supplier identity, GSTIN, signature or tax classification. A MongoDB replica set is required for atomic invoice numbering and persistence.

## Customer journey

- Select **I need a business GST invoice** during booking and provide the business details. Saved service addresses must include their state/UT.
- Complete booking and service as usual. Advance payments and NCC coins continue through the existing payment flow.
- After service completion and final payment confirmation, open **Bookings → booking details → Business GST invoice → View / save GST invoice**.
- Use **Print / Save as PDF** in the opened invoice. The app supplies authenticated printable HTML; it does not generate a PDF attachment on the server.
- If accounts review is required, the customer sees a pending message. The completed service/payment is not rolled back by a deferred invoice.

GSTIN validation checks structure, state code and checksum. It does not look up the business's registration, legal name, status or tax-credit eligibility with the GST portal.

## Accounts review

**Business invoice requests**, in the same Tax settings section, lists the oldest 100 completed unissued requests and the most recent 25 issued invoices. Open **Review & issue** to confirm place of supply and SAC/HSN. Different service/billing states require a recorded review reason; do not infer place of supply blindly for site-specific services. Where configured, enter the IRP acknowledgment and upload the signed QR before issuance. Customers can access issued invoices immediately.

The issuer GSTIN state and confirmed place of supply determine IGST versus CGST plus SGST/UTGST. Taxes retain the original rounded booking/add-on/parts amounts and reconcile to the final bill. Neither selecting business billing nor viewing the invoice reprices the booking or adds GST again. Advances and coins affect settlement rather than reducing taxable value.

Ordinary invoices have a unique financial-year number such as `NC/2627/000001`. For an external IRP e-invoice, the supplied registered invoice number is preserved instead. The supplier, recipient, classifications, place of supply and final bill are saved as a snapshot. Repeated or simultaneous requests return the existing invoice. Later catalog or issuer edits do not rewrite it. Corrections, refunds and credit notes require a separate accounts process; an issued invoice cannot be edited in this feature.

Only the booking customer and super admin can access the invoice. Customer business billing details are excluded from provider job payloads. Invoice responses use `Cache-Control: no-store`; uploaded signature/QR media follow the existing upload storage model.

## Verification and CI

- `backend/tests/customerInvoice.test.js`: validation, authorization, invoice timing, snapshots, local/interstate splits, accounts holds, IRP requirement, add-ons/parts, rounding and concurrent issuance.
- `e2e/ui/customerGstInvoice.spec.js`: real mobile checkout, actual provider completion/payment, printable customer invoice with signature and desktop admin controls.
- Frontend CI runs the real GST browser journey against an isolated MongoDB replica set when frontend, backend or E2E files change. The existing backend CI still runs all four Jest shards and the API E2E gate.

## Primary references for accounts

- [CBIC tax invoice rules](https://cbic-gst.gov.in/gst-invoice-rules.html)
- [IGST Act and place of supply](https://cbic-gst.gov.in/hindi/IGST-bill-e.html)
- [GST e-invoicing applicability advisory](https://einvoice6.gst.gov.in/content/new-advisory-on-e-invoicing-enablement-status-update-for-taxpayers/)
