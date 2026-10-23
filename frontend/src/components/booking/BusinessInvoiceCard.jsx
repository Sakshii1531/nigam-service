import { useEffect, useState } from 'react';
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
  const [availability, setAvailability] = useState(null), [loading, setLoading] = useState(false), [revision, setRevision] = useState(0);
  const bookingId = booking.id || booking._id;
  const completed = booking.status === 'Completed';
  const requested = Boolean(booking.businessBilling);
  useEffect(() => {
    if (!requested || !completed) return;
    let active = true;
    setLoading(true); setError('');
    apiRequest(`/bookings/${bookingId}/invoice/status`, {auth:true, silentError:true})
      .then(data => { if (active) setAvailability({bookingId, ...data}); })
      .catch(e => { if (active) { setAvailability(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId, requested, completed, revision]);
  useEffect(() => {
    const refresh = () => setRevision(n => n + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  if (!requested) return null;
  const d = booking.businessBilling;
  const status = availability?.bookingId === bookingId ? availability : null;
  const available = status?.state === 'issued' || status?.state === 'ready';
  const show = async () => {
    const preview = window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    setBusy(true); setError('');
    try {
      if (status?.state !== 'issued') await apiRequest(`/bookings/${bookingId}/invoice`, { method:'POST', auth:true, silentError:true });
      await openInvoice(`/bookings/${bookingId}/invoice`, preview);
      setRevision(n => n + 1);
    } catch (e) { preview?.close(); setError(e.message); setRevision(n => n + 1); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={17} />Business GST invoice</h3>
    {status?.sample && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-900">Sample invoice — not a tax invoice. NCC is using test supplier details.</p>}
    <p className="mt-3 text-sm font-semibold text-slate-700">{d.legalName}</p><p className="mt-1 text-xs text-slate-500">GSTIN: {d.gstin}</p><p className="mt-1 text-xs text-slate-500">{d.address}, {d.city} · {d.pincode}</p>
    {!completed ? <p className="mt-3 text-xs text-slate-500">{booking.status === 'Cancelled' ? 'No final service invoice is issued for a cancelled booking.' : 'The final invoice will be available after service completion.'}</p>
      : loading ? <p role="status" className="mt-3 text-xs text-slate-500">Checking invoice availability…</p>
      : available ? <><p className="mt-3 text-xs font-semibold text-emerald-700">{status.invoiceNo ? `Invoice ${status.invoiceNo}` : 'Your final invoice is ready to prepare.'}</p><button disabled={busy} onClick={show} className="mt-3 rounded-xl bg-blue-800 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Preparing invoice…' : status.sample ? 'View / save sample invoice' : 'View / save GST invoice'}</button></>
      : <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-900">Awaiting accounts {status?.state === 'setup-required' ? 'setup' : 'review'}</p><p className="mt-2 text-xs leading-5 text-amber-900">{status?.message || 'Invoice availability could not be checked. Please try again.'}</p><button disabled={busy} onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 text-xs font-bold text-blue-800 underline">Check invoice availability</button></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  </section>;
}
