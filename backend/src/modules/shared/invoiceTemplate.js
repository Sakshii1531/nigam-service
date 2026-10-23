// Presentation only. Callers supply their existing invoice details and totals;
// content must be trusted markup with customer-provided values HTML-escaped.
export const invoiceText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

export function renderInvoiceDocument({ title = 'Service Invoice', reference = '', date = '', content = '' }) {
  const body = content.replace(/<table\b/g, '<div class="invoice-table-scroll"><table').replace(/<\/table>/g, '</table></div>');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${invoiceText(title)}${reference ? ` · ${invoiceText(reference)}` : ''}</title>
<style>
:root{color-scheme:light;--navy:#052355;--blue:#0D47A1;--muted:#64748B;--border:#E2E8F0;--wash:#F8FAFC}
*{box-sizing:border-box}body{margin:0;background:#F5F8FC;color:#1E293B;font:13px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}
.invoice-toolbar{max-width:980px;margin:24px auto 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 12px;color:var(--muted);font-size:12px}
button{border:0;border-radius:10px;background:var(--blue);color:white;padding:11px 18px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.invoice-sheet{max-width:980px;margin:0 auto 40px;background:white;border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 12px 40px #05235508}
.invoice-header{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:32px 36px;background:var(--navy);color:white;border-bottom:5px solid #2467BF}
.invoice-brand{display:flex;align-items:center;gap:12px}.invoice-mark{display:grid;place-items:center;width:48px;height:48px;border:1px solid #ffffff40;border-radius:14px;background:#ffffff12;font-size:13px;font-weight:800;letter-spacing:1px}
.invoice-brand strong{font-size:23px;letter-spacing:-.5px}.invoice-brand small{display:block;color:#CBDAEF;font-size:11px}.invoice-meta{text-align:right}.invoice-meta h1{font-size:13px;letter-spacing:1.8px;text-transform:uppercase;margin:0 0 6px;color:#D6E5FF}.invoice-meta b{font-size:17px}.invoice-meta small{display:block;color:#CBDAEF;font-size:11px}
.invoice-content{padding:30px 36px;overflow-wrap:anywhere}h2{font-size:15px;color:var(--navy);margin:0 0 8px}h3{font-size:14px;color:var(--navy)}p{margin:12px 0}small{color:var(--muted)}
.grid-details,dl{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 26px}.section-title{font-size:10px;font-weight:800;color:var(--blue);text-transform:uppercase;letter-spacing:1.3px;margin:18px 0 8px}.grid-details .section-title{margin-top:0}
.details-box,dl>div{background:var(--wash);border:1px solid var(--border);padding:16px;border-radius:12px}.details{background:var(--wash);padding:16px;border:1px solid var(--border);border-radius:12px;margin-bottom:24px}
.invoice-table-scroll{overflow-x:auto;margin:22px 0}table{width:100%;border-collapse:collapse;margin:0;font-size:12px}thead{background:#EEF4FF}th{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--blue);text-align:left;padding:12px 10px;border-bottom:1px solid #CDDDF5}td{padding:14px 10px;border-bottom:1px solid var(--border);vertical-align:top}tr{break-inside:avoid}tbody tr:last-child td{border-bottom:1px solid var(--border)}
.summary-box{width:310px;max-width:100%;margin:24px 0 24px auto;padding:16px 20px;background:var(--wash);border:1px solid var(--border);border-radius:12px}.summary-row,.line-row,.total-row{display:flex;justify-content:space-between;gap:16px;padding:7px 0}.summary-row.total,.grand-total,.total{border-top:1px solid #CDDDF5;margin-top:10px;padding-top:14px;font-weight:800;color:var(--blue);font-size:18px}.grand-total{display:flex;justify-content:space-between}.line-row{border-bottom:1px solid var(--border)}.covered{color:#15803D;background:#F0FDF4;border-radius:6px;padding:2px 6px;font-size:11px}
img{max-width:180px;max-height:90px}.invoice-footer{clear:both;display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--border);padding:18px 36px;color:var(--muted);font-size:10px}.invoice-footer b{color:var(--blue)}
@media(max-width:640px){.invoice-toolbar{margin:12px 0}.invoice-toolbar span{display:none}.invoice-toolbar button{margin-left:auto}.invoice-sheet{margin:0 8px 20px;border-radius:14px}.invoice-header{padding:22px 18px;gap:12px}.invoice-mark{display:none}.invoice-brand strong{font-size:19px}.invoice-brand small{max-width:130px}.invoice-meta b{font-size:13px}.invoice-meta h1{font-size:10px}.invoice-content{padding:20px 16px}.grid-details,dl{grid-template-columns:1fr;gap:12px}table{min-width:680px;font-size:11px}th,td{padding:10px 8px;letter-spacing:0}.invoice-footer{padding:16px;flex-wrap:wrap}}
@page{size:A4;margin:12mm}@media print{body{background:white;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-toolbar{display:none}.invoice-sheet{border:0;border-radius:0;box-shadow:none;margin:0;max-width:none}.invoice-header{padding:22px 24px}.invoice-content{padding:24px 4px}.invoice-footer{padding:16px 4px}.grid-details,dl{grid-template-columns:1fr 1fr}table{min-width:0}.invoice-table-scroll{overflow:visible}thead{display:table-header-group}.summary-box{break-inside:avoid}th,td{padding:9px 6px}img{break-inside:avoid}}
</style></head><body>
<nav class="invoice-toolbar" aria-label="Invoice actions"><span>Invoice preview · Nigam Care</span><button onclick="window.print()">Print / Download PDF</button></nav>
<article class="invoice-sheet" data-invoice-template="nigam-care-v1"><header class="invoice-header"><div class="invoice-brand"><div class="invoice-mark">NCC</div><div><strong>Nigam Care</strong><small>Trusted Home Appliance Services</small></div></div><div class="invoice-meta"><h1>${invoiceText(title)}</h1><b>${invoiceText(reference)}</b>${date ? `<small>${invoiceText(date)}</small>` : ''}</div></header>
<main class="invoice-content">${body}</main><footer class="invoice-footer"><b>NIGAM CARE</b><span>Thank you for choosing Nigam Care.</span></footer></article>
</body></html>`;
}
