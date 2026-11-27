import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Receipt, Wrench, XCircle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const STATUS = {
  Pending: { label: 'Waiting for your approval', icon: Clock, className: 'text-amber-700 bg-amber-50 border-amber-200' },
  Approved: { label: 'Approved', icon: CheckCircle2, className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  Declined: { label: 'Declined', icon: XCircle, className: 'text-rose-700 bg-rose-50 border-rose-200' },
};

/**
 * On the customer's booking page: other appliances they asked the partner to
 * service on this visit, a pop-up to approve or decline each spare part's
 * price (the partner fits a part only after approval), and — once the partner
 * made it — the final bill, itemised per appliance.
 */
export default function ExtraWorkCard({ booking, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const appliances = booking?.extraWork?.appliances || [];
  const pending = booking?.extraWork?.pendingApprovals || [];
  const bill = booking?.finalBill;
  const ask = pending[0];

  const answer = async (approve) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/bookings/${booking.id || booking.humanId}/extra-parts/${ask.id}/respond`, {
        method: 'POST',
        auth: true,
        body: { approve },
      });
      await onChanged?.();
    } catch (err) {
      setError(err.message || 'Could not save your answer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // A visit with no other appliance keeps the page exactly as before.
  if (!appliances.length) return null;
  const groups = bill ? [...new Set(bill.lines.map((l) => l.group))] : [];

  return (
    <>
      {appliances.length > 0 && !bill && (
        <section className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3" aria-label="Other appliances on this visit">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-brand-blue" /> Other appliances on this visit
          </h3>
          {appliances.map((g) => (
            <div key={g.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 flex flex-col gap-1.5 text-xs">
              <p className="font-bold text-slate-800">{g.name}</p>
              {g.services.map((s) => (
                <div key={s.id} className="flex justify-between gap-2 text-slate-600">
                  <span>{s.quantity > 1 ? `${s.name} x ${s.quantity}` : s.name}</span>
                  <span className="font-semibold text-slate-800">{money(s.amount)}</span>
                </div>
              ))}
              {g.parts.map((p) => {
                const st = STATUS[p.status] || STATUS.Pending;
                const Icon = st.icon;
                return (
                  <div key={p.id} className="flex justify-between items-center gap-2 text-slate-600">
                    <span>
                      Spare part: {p.quantity > 1 ? `${p.name} x ${p.quantity}` : p.name}
                      <span className={`ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${st.className}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </span>
                    <span className={`font-semibold ${p.status === 'Declined' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{money(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <p className="text-[11px] text-slate-500">These are added to your final bill. Prices include GST.</p>
        </section>
      )}

      {bill && (
        <section className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3" aria-label="Final bill">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-brand-blue" /> Final bill
          </h3>
          {groups.map((group) => (
            <div key={group} className="flex flex-col gap-1 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</p>
              {bill.lines
                .filter((l) => l.group === group)
                .map((l, i) => (
                  <div key={`${group}-${i}`} className="flex justify-between gap-2 text-slate-600">
                    <span>{l.kind === 'part' ? `Spare part: ${l.label}` : l.label}</span>
                    <span className="font-semibold text-slate-800">{l.covered ? 'Covered' : money(l.amount)}</span>
                  </div>
                ))}
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 flex flex-col gap-1 text-xs">
            {bill.alreadyPaid > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Already paid</span>
                <span>-{money(bill.alreadyPaid)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-slate-900 text-sm">
              <span>{bill.alreadyPaid > 0 ? 'Paid on the visit' : 'Total'}</span>
              <span>{money(bill.alreadyPaid > 0 ? bill.amountToCollect : bill.total)}</span>
            </div>
            <p className="text-[10px] text-slate-400">Prices include GST.</p>
          </div>
        </section>
      )}

      {ask && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" role="dialog" aria-label="Approve spare part price">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Approve spare part price?</h3>
              <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-relaxed">
                To repair your <span className="font-black text-slate-900">{ask.appliance}</span>, the technician needs{' '}
                <span className="font-black text-slate-900">{ask.quantity > 1 ? `${ask.name} x ${ask.quantity}` : ask.name}</span>.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs flex flex-col gap-1">
              <div className="flex justify-between text-slate-600">
                <span>Part price</span>
                <span>{money((ask.unitPrice || 0) * (ask.quantity || 1))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span>{money(ask.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>You pay</span>
                <span>{money(ask.amount)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Approve and the repair goes ahead; the part is added to your final bill. Decline and it won&apos;t be fitted. You can pay online or in cash at the end.
            </p>
            {error && <p className="text-xs font-semibold text-rose-600" role="alert">{error}</p>}
            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => answer(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs disabled:opacity-60 cursor-pointer">
                Decline
              </button>
              <button type="button" disabled={busy} onClick={() => answer(true)} className="flex-1 bg-brand-blue hover:bg-[#083679] text-white font-bold py-3 rounded-2xl text-xs shadow-sm disabled:opacity-60 cursor-pointer">
                {busy ? 'Saving…' : `Approve ${money(ask.amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
