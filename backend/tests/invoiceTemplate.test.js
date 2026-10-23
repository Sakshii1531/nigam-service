import { it, expect } from '@jest/globals';
import { invoiceHtml } from '../src/modules/booking/customerInvoice.service.js';
import { renderInvoiceDocument } from '../src/modules/shared/invoiceTemplate.js';

it('escapes document metadata and includes one shared printable template', () => {
  const html = renderInvoiceDocument({ title: '<script>Invoice</script>', reference: 'INV-48 & 49', content: '<p>Existing bill details</p>' });
  expect(html).toContain('&lt;script&gt;Invoice&lt;/script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('INV-48 &amp; 49');
  expect(html).toContain('data-invoice-template="nigam-care-v1"');
  expect(html).toContain('<p>Existing bill details</p>');
  expect(html).toContain('@media print');
  expect(html).toContain('thead{display:table-header-group}');
  expect(html.match(/onclick="window.print\(\)"/g)).toHaveLength(1);
});

it.each([false, true])('preserves GST content in the shared design (interstate: %s)', interState => {
  const html = invoiceHtml({ invoiceNo: 'NC/2627/000048', issuedAt: '2026-10-23', snapshot: {
    issuer: { legalName: 'Supplier', gstin: '23AAAAA0000A1Z5', address: 'Indore', signatoryName: 'Accounts', signatureUrl: '/uploads/signature.png' },
    recipient: { legalName: '<Customer & Co>', gstin: '23AAAAA0000A1Z5', address: 'Main Road', city: 'Indore', pincode: '452001' },
    bookingNo: 'BK-0048', serviceAddress: {}, placeOfSupply: '23', placeOfSupplyName: 'Madhya Pradesh', interState, localTax: 'SGST',
    lines: [{ name: 'AC repair', code: '998719', quantity: 1, taxable: 1000, rate: 18, cgst: 90, sgst: 90, igst: 180, total: 1180 }],
    subtotal: 1000, gst: 180, total: 1180,
  } });
  expect(html).toContain('data-invoice-template="nigam-care-v1"');
  expect(html).toContain('&lt;Customer &amp; Co&gt;');
  expect(html).toContain('998719');
  expect(html).toContain('1,180.00');
  expect(html).toContain(interState ? '<th>IGST</th>' : '<th>CGST</th><th>SGST</th>');
  expect(html).toContain('Authorised signatory');
  expect(html).toContain('/uploads/signature.png');
});
