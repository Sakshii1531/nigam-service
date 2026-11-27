import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, PackagePlus, Plus, Trash2, Wrench, X, XCircle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PART_STATUS = {
  Pending: { label: 'Waiting for customer', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Approved - fit it', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Declined: { label: 'Declined - do not fit', icon: XCircle, className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

/**
 * Other appliances the customer asks the partner to service on this visit.
 * The partner picks the appliance and its service from the catalogue, and for
 * a spare part sends its price to the customer's app; the part is fitted only
 * once the customer approves. Everything here joins the one final bill.
 */
export default function ExtraAppliances({ jobId, onChanged }) {
  const [work, setWork] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // { step: 'type' | 'service' | 'part', key?, name? }
  const [picker, setPicker] = useState(null);

  const load = useCallback(async () => {
    try {
      setWork(await apiRequest(`/service-provider/jobs/${jobId}/extra-work`, { auth: true, silentError: true }));
    } catch (err) {
      setError(err.message || 'Could not load the other appliances.');
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  // While a part waits for the customer's answer, check every few seconds.
  const waiting = Boolean(work?.pendingApprovals?.length);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  const run = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
      setPicker(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeService = (id) =>
    run(() => apiRequest(`/service-provider/jobs/${jobId}/addons/${id}`, { method: 'DELETE', auth: true }));
  const removePart = (id) =>
    run(() => apiRequest(`/service-provider/jobs/${jobId}/extra-parts/${id}`, { method: 'DELETE', auth: true }));

  if (!work) return null;
  const open = work.open;

  return (
    <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left" aria-label="Other appliances">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-[#052355]">Other appliances</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Customer wants another appliance serviced on this visit? Add it here.</p>
        </div>
      </div>

      {work.appliances.map((group) => (
        <div key={group.key} className="border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 bg-slate-50/50">
          <p className="text-xs font-semibold text-[#052355] flex items-center gap-1.5">
            <Wrench size={13} className="text-[#0D47A1]" /> {group.name}
          </p>
          {group.services.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-700">{s.quantity > 1 ? `${s.name} x ${s.quantity}` : s.name}</span>
              <span className="flex items-center gap-1">
                <span className="font-semibold text-[#052355]">{money(s.amount)}</span>
                {open && (
                  <button type="button" disabled={busy} onClick={() => removeService(s.id)} aria-label={`Remove ${s.name}`} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                )}
              </span>
            </div>
          ))}
          {group.parts.map((p) => {
            const status = PART_STATUS[p.status] || PART_STATUS.Pending;
            const Icon = status.icon;
            return (
              <div key={p.id} className="flex flex-col gap-1 border-t border-slate-200 pt-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-700">Part: {p.quantity > 1 ? `${p.name} x ${p.quantity}` : p.name}</span>
                  <span className="flex items-center gap-1">
                    <span className={`font-semibold ${p.status === 'Declined' ? 'line-through text-slate-400' : 'text-[#052355]'}`}>{money(p.amount)}</span>
                    {open && (
                      <button type="button" disabled={busy} onClick={() => removePart(p.id)} aria-label={`Remove part ${p.name}`} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </div>
                <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${status.className}`}>
                  <Icon size={11} /> {status.label}
                </span>
              </div>
            );
          })}
          {open && (
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setPicker({ step: 'service', key: group.key, name: group.name })} className="flex-1 text-[11px] font-semibold text-[#0D47A1] bg-white border border-blue-200 rounded-xl py-2 hover:bg-blue-50 cursor-pointer">
                + Service
              </button>
              <button type="button" onClick={() => setPicker({ step: 'part', key: group.key, name: group.name })} className="flex-1 text-[11px] font-semibold text-[#0D47A1] bg-white border border-blue-200 rounded-xl py-2 hover:bg-blue-50 cursor-pointer">
                + Spare part
              </button>
            </div>
          )}
        </div>
      ))}

      {waiting && (
        <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          The customer has to approve the part price in their app before you fit it. You can&apos;t make the bill until they answer.
        </p>
      )}

      {open ? (
        <button type="button" onClick={() => setPicker({ step: 'type' })} className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-dashed border-blue-200 text-[#0D47A1] text-xs font-semibold hover:bg-blue-50 cursor-pointer">
          <Plus size={14} /> Add another appliance
        </button>
      ) : (
        !work.appliances.length && <p className="text-[11px] text-slate-400">Other appliances can be added while you are at the customer, before the bill.</p>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-600" role="alert">{error}</p>}

      {picker && <Picker jobId={jobId} picker={picker} setPicker={setPicker} busy={busy} run={run} />}
    </div>
  );
}

function Picker({ jobId, picker, setPicker, busy, run }) {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [manual, setManual] = useState({ name: '', price: '', quantity: 1 });

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setLoadError('');
    const path =
      picker.step === 'type'
        ? `/service-provider/jobs/${jobId}/extra-appliance-types`
        : picker.step === 'service'
          ? `/service-provider/jobs/${jobId}/addon-offerings?category=${encodeURIComponent(picker.key)}`
          : `/service-provider/jobs/${jobId}/extra-part-catalog?category=${encodeURIComponent(picker.key)}`;
    apiRequest(path, { auth: true, silentError: true })
      .then((data) => !cancelled && setItems(Array.isArray(data) ? data : []))
      .catch((err) => !cancelled && setLoadError(err.message || 'Could not load the list.'));
    return () => {
      cancelled = true;
    };
  }, [jobId, picker.step, picker.key]);

  const title =
    picker.step === 'type' ? 'Which appliance?' : picker.step === 'service' ? `${picker.name}: choose the service` : `${picker.name}: spare part`;

  const addService = (offeringId) =>
    run(() => apiRequest(`/service-provider/jobs/${jobId}/addons`, { method: 'POST', auth: true, body: { offeringId, quantity: 1 } }));
  const sendPart = (body) =>
    run(() => apiRequest(`/service-provider/jobs/${jobId}/extra-parts`, { method: 'POST', auth: true, body: { categoryKey: picker.key, ...body } }));

  return (
    <div className="fixed inset-0 bg-[#052355]/40 z-50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-label={title}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-4 shadow-2xl flex flex-col gap-3 max-h-[85vh]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#052355]">{title}</h3>
          <button type="button" onClick={() => setPicker(null)} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {picker.step === 'part' && (
          <p className="text-[11px] text-slate-500">The customer gets the price (with 18% GST) in their app and must approve it before you fit the part.</p>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto">
          {loadError && <p className="text-xs text-rose-600">{loadError}</p>}
          {!items && !loadError && <Loader2 className="animate-spin mx-auto text-slate-400" size={18} />}
          {items && items.length === 0 && picker.step !== 'part' && (
            <p className="text-xs text-slate-500 text-center py-4">Nothing available here yet.</p>
          )}
          {items?.map((item) =>
            picker.step === 'type' ? (
              <button key={item.key || item.id} type="button" onClick={() => setPicker({ step: 'service', key: item.key, name: item.name })} className="text-left px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-[#052355] hover:bg-blue-50 cursor-pointer">
                {item.name}
              </button>
            ) : (
              <div key={item.id || item.key} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#052355]">{item.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {money(item.customerPrice ?? item.price)} + GST{item.unitLabel ? ` ${item.unitLabel}` : ''}
                    {item.spPayout ? <span className="text-emerald-700"> · you earn {money(item.spPayout)}</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (picker.step === 'service' ? addService(item.id) : sendPart({ partCatalogId: item.id }))}
                  aria-label={`${picker.step === 'service' ? 'Add' : 'Send for approval'}: ${item.name}`}
                  className="shrink-0 text-[11px] font-semibold text-[#0D47A1] bg-[#E3ECF9] px-3 py-1.5 rounded-xl hover:bg-[#c2d7f5] disabled:opacity-50 cursor-pointer">
                  {picker.step === 'service' ? '+ Add' : 'Send'}
                </button>
              </div>
            ),
          )}
        </div>

        {picker.step === 'part' && (
          <form
            className="flex flex-col gap-2 border-t border-slate-100 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendPart({ name: manual.name.trim(), unitPrice: Number(manual.price), quantity: Number(manual.quantity) || 1 });
            }}>
            <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <PackagePlus size={13} /> Part not in the list
            </p>
            <input aria-label="Part name" value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} placeholder="Part name" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D47A1]" />
            <div className="flex gap-2">
              <input aria-label="Price per piece" inputMode="decimal" value={manual.price} onChange={(e) => setManual((m) => ({ ...m, price: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="Price (before GST)" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D47A1]" />
              <input aria-label="Quantity" inputMode="numeric" value={manual.quantity} onChange={(e) => setManual((m) => ({ ...m, quantity: e.target.value.replace(/\D/g, '').slice(0, 2) }))} className="w-14 px-3 py-2 border border-slate-200 rounded-xl text-xs text-center outline-none focus:border-[#0D47A1]" />
            </div>
            <button type="submit" disabled={busy || !manual.name.trim() || !(Number(manual.price) > 0)} className="py-2.5 rounded-xl bg-[#0D47A1] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer">
              {busy ? 'Sending…' : 'Send price to customer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
