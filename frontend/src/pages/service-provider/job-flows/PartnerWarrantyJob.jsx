import { useState } from 'react';
import { CalendarClock, FileText, Image as ImageIcon, Loader2, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';

// Partner app — a partner-warranty (B2B2C) job (docs/partner-warranty Phase 15,
// client #11): the claim's real brand, product, issue, IDs and the customer's
// documents, the ₹0-to-customer / paid-by-NCC rule, and visit scheduling.

const DOC_LABEL = { invoice: 'Bill / Invoice', warranty_card: 'Warranty card', product_photo: 'Product photo', additional: 'Other document' };
const SLOTS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM'];
const SCHEDULABLE = ['Partner Assigned', 'Visit Scheduled', 'Technician On Way'];
const isImage = (url) => /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(url || '');
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-[#052355] font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

/** Claim + product + issue + documents + who pays. `payout` = the partner's earning. */
export function PartnerWarrantyDetails({ warranty: w, payout }) {
  if (!w) return null;
  const docs = w.documents || [];
  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="bg-[#1E6BDB] text-white text-[9px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">{w.serviceLabel}</span>
        {w.jobId && <span className="text-[11px] font-mono font-semibold text-[#052355]">{w.jobId}</span>}
      </div>

      <section className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3" aria-labelledby="pw-info">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#1E6BDB] rounded-full flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="pw-info" className="text-sm font-semibold text-[#052355]">
              {w.brand} {w.productName}
            </h3>
            <p className="text-xs text-slate-600">{w.issueName}</p>
          </div>
        </div>
        <div className="h-px bg-slate-100" />
        <Row label="Warranty claim" value={w.claimId} mono />
        <Row label="Service job" value={w.jobId} mono />
        <Row label="Model" value={w.modelNumber} />
        <Row label="Serial no." value={w.serialNumber} mono />
        <Row label="Purchased" value={fmtDate(w.purchaseDate)} />
        {w.address?.line ? (
          <div className="bg-slate-50 rounded-2xl px-3 py-2.5 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#1E6BDB] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500">Visit address</span>
              <span className="block text-xs font-semibold text-[#052355]">{w.address.line}</span>
              <a
                href={
                  w.address.latitude != null && w.address.longitude != null
                    ? `https://www.google.com/maps/dir/?api=1&destination=${w.address.latitude},${w.address.longitude}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(w.address.line)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-[#1E6BDB] min-h-8"
              >
                <Navigation className="w-3 h-3" aria-hidden="true" /> Open in Maps
              </a>
            </div>
          </div>
        ) : (
          <Row label="Area" value={[w.area, w.pincode].filter(Boolean).join(' · ')} />
        )}
        {w.remarks && (
          <div className="bg-slate-50 rounded-2xl px-3 py-2 text-xs text-slate-700">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Customer’s note</span>
            {w.remarks}
          </div>
        )}
      </section>

      {w.documents && (
        <section className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-2.5" aria-labelledby="pw-docs">
          <h3 id="pw-docs" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Customer documents ({docs.length})
          </h3>
          {docs.length === 0 && <p className="text-xs text-slate-500">The customer didn’t upload any documents.</p>}
          <ul className="grid grid-cols-2 gap-2">
            {docs.map((d, i) => (
              <li key={`${d.url}-${i}`}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-50 hover:bg-[#EEF4FE] border border-slate-100 rounded-2xl p-2 min-h-12 focus-visible:outline-2 focus-visible:outline-[#1E6BDB]"
                >
                  {isImage(d.url) ? (
                    <img src={d.url} alt="" loading="lazy" className="w-10 h-10 rounded-xl object-cover bg-white shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {d.kind === 'product_photo' ? <ImageIcon className="w-5 h-5 text-slate-500" aria-hidden="true" /> : <FileText className="w-5 h-5 text-slate-500" aria-hidden="true" />}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-[#052355]">{DOC_LABEL[d.kind] || 'Document'}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{d.name || 'View'}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 text-xs text-emerald-900 flex flex-col gap-1" aria-label="Payment">
        <p className="font-semibold">Customer pays ₹0 for this warranty repair — don’t collect money for it.</p>
        <p>
          {payout ? <>You earn <strong>{inr(payout)}</strong>, paid by NCC. </> : 'Your earning is paid by NCC. '}
          Warranty jobs are settled manually by NCC and don’t add to your withdrawable balance.
        </p>
      </section>
    </div>
  );
}

/** Pick the visit date and slot; the customer and brand see it on the claim. */
export function WarrantyVisitScheduler({ jobId, warranty: w, onScheduled }) {
  const [visit, setVisit] = useState(w?.visit || null);
  const [date, setDate] = useState(w?.visit?.date || '');
  const [slot, setSlot] = useState(w?.visit?.slot || '');
  const [editing, setEditing] = useState(!w?.visit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!w || (w.claimStatus && !SCHEDULABLE.includes(w.claimStatus))) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!date || !slot) return setError('Pick a date and a time slot.');
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest(`/service-provider/warranty-jobs/${jobId}/schedule-visit`, { method: 'POST', auth: true, body: { date, slot } });
      setVisit(res.visit);
      setEditing(false);
      onScheduled?.(res);
    } catch (err) {
      setError(err.message || 'Could not schedule the visit.');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <section className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3 text-left" aria-labelledby="pw-visit">
      <h3 id="pw-visit" className="text-sm font-semibold text-[#052355] flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#1E6BDB]" aria-hidden="true" /> Visit
      </h3>
      {visit && !editing ? (
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-sm text-[#052355]">
            <strong>{fmtDate(visit.date)}</strong>, {visit.slot}
          </p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-[#1E6BDB] hover:underline min-h-10 px-2">
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-xs text-slate-600">Call the customer, agree a time, then save it here — they and the brand see it on the claim.</p>
          <label className="text-xs font-semibold text-slate-700 flex flex-col gap-1">
            Date
            <input type="date" required min={localToday()} value={date} onChange={(e) => setDate(e.target.value)} className="h-11 px-3 border border-slate-200 rounded-xl text-sm font-normal user-invalid:border-red-400" />
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700 mb-1">Time slot</legend>
            <div className="grid grid-cols-2 gap-2">
              {SLOTS.map((s) => (
                <label key={s} className={`h-11 flex items-center justify-center rounded-xl border text-xs cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-[#1E6BDB] ${slot === s ? 'border-[#1E6BDB] bg-[#EEF4FE] font-semibold text-[#0D47A1]' : 'border-slate-200 text-slate-700'}`}>
                  <input type="radio" name="pw-slot" value={s} checked={slot === s} onChange={() => setSlot(s)} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {visit && (
              <button type="button" onClick={() => setEditing(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                Keep current
              </button>
            )}
            <button type="submit" disabled={busy} className="flex-[2] h-11 rounded-xl bg-[#0D47A1] hover:bg-[#0A3F91] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {visit ? 'Save new time' : 'Schedule visit'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
