import { useState } from 'react';
import { FileText } from 'lucide-react';
import { apiDownload, apiRequest, resolveMediaUrl } from '../../lib/apiClient';
export async function openInvoice(path, preview = window.open('about:blank', '_blank')) {
  try {
    if (preview) preview.opener = null;
    const response = await apiDownload(path);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    doc.querySelectorAll('img[src^="/uploads/"]').forEach(img => img.setAttribute('src', resolveMediaUrl(img.getAttribute('src'))));
    const url = URL.createObjectURL(new Blob(['<!doctype html>' + doc.documentElement.outerHTML], { type: 'text/html' }));
    if (preview) preview.location.replace(url);
    else { const a = document.createElement('a'); a.href = url; a.download = 'GST-invoice.html'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { preview?.close(); throw error; }
}
export default function BusinessInvoiceCard({ booking }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!booking.businessBilling) return null;
  const d = booking.businessBilling;
  const show = async () => {
    const preview = window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    setBusy(true); setError('');
    try { await apiRequest(`/bookings/${booking.id || booking._id}/invoice`, { method: 'POST', auth: true }); await openInvoice(`/bookings/${booking.id || booking._id}/invoice`, preview); }
    catch (e) { preview?.close(); setError(e.message); } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={17} />Business GST invoice</h3><p className="mt-3 text-sm font-semibold text-slate-700">{d.legalName}</p><p className="mt-1 text-xs text-slate-500">GSTIN: {d.gstin}</p><p className="mt-1 text-xs text-slate-500">{d.address}, {d.city} · {d.pincode}</p>{booking.status === 'Completed' ? <button disabled={busy} onClick={show} className="mt-4 rounded-xl bg-blue-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Preparing invoice…' : 'View / save GST invoice'}</button> : <p className="mt-3 text-xs text-slate-500">{booking.status === 'Cancelled' ? 'No final service invoice is issued for a cancelled booking.' : 'The final invoice will be available after service completion.'}</p>}{error && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}</section>;
}
