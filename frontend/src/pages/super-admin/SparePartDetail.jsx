import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, CheckCircle2, Edit2, History, Loader2, Package, SlidersHorizontal, Trash2 } from 'lucide-react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from '../../components/super-admin/catalogue/ui';
import { StockBadge } from '../../components/super-admin/store/formParts';
import { rupees } from '../../components/super-admin/store/storeFormat';

// Super Admin → Inventory → one spare part (docs/master-catalogue Phase 21):
// pictures, what it fits, pricing, stock with its full history, supplier.

const MOVEMENT = {
  OPENING: { label: 'Opening stock', tone: 'text-slate-600 bg-slate-100' },
  RESTOCK: { label: 'Restock', tone: 'text-emerald-700 bg-emerald-50' },
  ISSUE: { label: 'Issued', tone: 'text-blue-700 bg-blue-50' },
  ADJUSTMENT: { label: 'Adjustment', tone: 'text-amber-700 bg-amber-50' },
};
const ACTIONS = {
  RESTOCK: { title: 'Restock', hint: 'Units received from the supplier.', Icon: ArrowDownRight, placeholder: 'e.g. PO 4411 from Nigam Spares' },
  ISSUE: { title: 'Issue stock', hint: 'Units sent out — to a partner, a branch, a job.', Icon: ArrowUpRight, placeholder: 'e.g. Sent to Lucknow partner Rahul' },
  ADJUSTMENT: { title: 'Adjust stock', hint: 'Correct the count: + found, − damaged or lost.', Icon: SlidersHorizontal, placeholder: 'e.g. Physical count, 2 damaged' },
};

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function StockDialog({ part, type, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const action = ACTIONS[type];
  const qty = Number(quantity) || 0;
  const after = part.stock + (type === 'ISSUE' ? -qty : qty);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onSaved(await apiRequest(`/super-admin/spare-parts/${part.id}/stock`, { method: 'POST', auth: true, body: { type, quantity: qty, reason: reason.trim() } }));
    } catch (err) {
      setError(err.message || 'Could not update the stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={action.title} subtitle={action.hint} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label={type === 'ADJUSTMENT' ? 'Change (+ or −)' : `Quantity (${part.unit || 'piece'})`}>
          <input required type="number" min={type === 'ADJUSTMENT' ? undefined : 1} className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Reason">
          <input required className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={action.placeholder} />
        </Field>
        <p className="text-xs text-slate-500">
          Stock goes from <b>{part.stock}</b> to <b className={after < 0 ? 'text-rose-600' : 'text-slate-900'}>{after}</b>.
        </p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !qty || after < 0}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function SparePartDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [part, setPart] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(location.state?.toast || '');
  const [dialog, setDialog] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [appliances, setAppliances] = useState({});

  const load = useCallback(
    () => apiRequest(`/super-admin/spare-parts/${id}`, { auth: true }).then(setPart).catch((err) => setError(err.message || 'Could not load this part.')),
    [id],
  );
  useEffect(() => {
    load();
    apiRequest('/catalog/categories', { silentError: true })
      .then((list) => setAppliances(Object.fromEntries((list || []).map((c) => [c.key, c.name]))))
      .catch(() => {});
  }, [load]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const remove = async () => {
    if (!window.confirm(`Delete "${part.name}" and its stock history? Partners will no longer see it.`)) return;
    try {
      await apiRequest(`/super-admin/spare-parts/${id}`, { method: 'DELETE', auth: true });
      navigate('/super-admin/inventory');
    } catch (err) {
      setError(err.message || 'Could not delete the part.');
    }
  };

  const name = (key) => appliances[key] || key;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title="Spare part" subtitle="Central inventory — details, pricing and stock history" />
        {toast && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 size={16} /> {toast}
          </div>
        )}
        <main className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/super-admin/inventory" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0D47A1]">
              <ArrowLeft size={14} /> Inventory
            </Link>
            {part && (
              <div className="flex gap-2">
                <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer">
                  <Trash2 size={14} /> Delete
                </button>
                <Link to={`/super-admin/inventory/${id}/edit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold hover:bg-blue-800">
                  <Edit2 size={14} /> Edit part
                </Link>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {!part && !error && <Loader2 className="animate-spin mx-auto text-slate-400" />}

          {part && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
              <div className="space-y-5 min-w-0">
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
                  <div>
                    <div className="aspect-square rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                      {part.images?.length ? (
                        <img src={part.images[activeImage] || part.images[0]} alt={part.name} className="max-w-full max-h-full object-contain p-3" />
                      ) : (
                        <Package size={48} className="text-slate-300" />
                      )}
                    </div>
                    {part.images?.length > 1 && (
                      <div className="flex gap-1.5 mt-2">
                        {part.images.map((url, i) => (
                          <button key={url} type="button" onClick={() => setActiveImage(i)} aria-label={`Show picture ${i + 1}`} className={`w-12 h-12 rounded-lg border overflow-hidden cursor-pointer ${i === activeImage ? 'border-[#0D47A1]' : 'border-slate-200'}`}>
                            <img src={url} alt="" className="w-full h-full object-contain p-0.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0D47A1]">{name(part.category) || 'No appliance'}</span>
                      <span className={`px-2 py-0.5 rounded-md ${part.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{part.isActive ? 'Available to partners' : 'Hidden'}</span>
                    </div>
                    <div>
                      {part.brand && <p className="text-sm font-bold text-slate-400">{part.brand}</p>}
                      <h1 className="text-xl font-extrabold text-slate-900">{part.name}</h1>
                      <p className="text-xs text-slate-500 mt-1 font-mono">{[part.humanId, part.code && `Part no. ${part.code}`].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">{rupees(part.retailPrice)}</span>
                      <span className="text-xs text-slate-400">per {part.unit || 'piece'} · + {part.gstPercent ?? 18}% GST</span>
                    </div>
                    <StockBadge status={part.status} stock={part.stock} unit={part.unit} />
                    {part.description && <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{part.description}</p>}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                  <h2 className="text-sm font-extrabold text-slate-800">Fits</h2>
                  <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <dt className="font-bold text-slate-400 uppercase text-[10px] mb-1">Appliances</dt>
                      <dd className="flex flex-wrap gap-1">
                        {[part.category, ...(part.compatibleCategories || [])].filter(Boolean).map((k) => (
                          <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">{name(k)}</span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-400 uppercase text-[10px] mb-1">Brands</dt>
                      <dd className="text-slate-700">{part.compatibleBrands?.join(', ') || 'Any'}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-400 uppercase text-[10px] mb-1">Models</dt>
                      <dd className="text-slate-700">{part.compatibleModels?.join(', ') || 'Not listed'}</dd>
                    </div>
                  </dl>
                  {part.specifications?.length > 0 && (
                    <table className="w-full text-sm mt-2">
                      <tbody>
                        {part.specifications.map((s) => (
                          <tr key={s.label} className="border-b border-slate-100 last:border-0">
                            <th scope="row" className="text-left font-semibold text-slate-400 py-2 pr-4 w-1/3">{s.label}</th>
                            <td className="py-2 text-slate-800">{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-1.5"><History size={15} /> Stock history</h2>
                  {part.movements.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                            <th className="text-left py-2">When</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-right py-2">Change</th>
                            <th className="text-right py-2">Stock after</th>
                            <th className="text-left py-2 pl-4">Reason</th>
                            <th className="text-left py-2">By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {part.movements.map((m) => (
                            <tr key={m.id}>
                              <td className="py-2 text-slate-500 whitespace-nowrap">{when(m.createdAt)}</td>
                              <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${MOVEMENT[m.type]?.tone}`}>{MOVEMENT[m.type]?.label || m.type}</span></td>
                              <td className={`py-2 text-right font-black ${m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                              <td className="py-2 text-right font-bold">{m.stockAfter}</td>
                              <td className="py-2 pl-4 text-slate-600">{m.reason || '—'}</td>
                              <td className="py-2 text-slate-500">{m.by || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No stock changes recorded yet.</p>
                  )}
                </section>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-4">
                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Stock</h2>
                  <p className="text-3xl font-black text-slate-900">{part.stock} <span className="text-sm font-bold text-slate-400">{part.unit || 'piece'}s</span></p>
                  <p className="text-xs text-slate-400 mt-1">Re-order at {part.reorderThreshold ?? 5} · worth {rupees(part.stockValue)} at cost</p>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {Object.entries(ACTIONS).map(([type, { title, Icon }]) => (
                      <button key={type} type="button" onClick={() => setDialog(type)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-[#0D47A1] hover:text-[#0D47A1] cursor-pointer">
                        <Icon size={16} /> {title.replace(' stock', '')}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Pricing</h2>
                  <dl className="text-xs space-y-2">
                    {[
                      ['Cost price', rupees(part.costPrice)],
                      ['Markup', `${part.markupPercent ?? 0}%`],
                      ['Margin per unit', rupees(part.marginPerUnit)],
                      ['Selling price', rupees(part.retailPrice)],
                      [`GST (${part.gstPercent ?? 18}%)`, rupees((part.retailPrice * (part.gstPercent ?? 18)) / 100)],
                      ['HSN code', part.hsnCode || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between"><dt className="text-slate-400 font-semibold">{label}</dt><dd className="font-bold">{value}</dd></div>
                    ))}
                  </dl>
                </section>

                <section className="bg-white rounded-2xl border border-slate-200/80 p-5">
                  <h2 className="text-sm font-extrabold text-slate-800 mb-3">Supply & storage</h2>
                  <dl className="text-xs space-y-2">
                    {[
                      ['Supplier', part.supplier || '—'],
                      ['Lead time', part.leadTimeDays != null ? `${part.leadTimeDays} days` : '—'],
                      ['Storage bin', part.storageLocation || '—'],
                      ['Warranty', part.warrantyMonths ? `${part.warrantyMonths} months` : 'None'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3"><dt className="text-slate-400 font-semibold">{label}</dt><dd className="font-bold text-right">{value}</dd></div>
                    ))}
                  </dl>
                </section>
              </aside>
            </div>
          )}
        </main>
        {dialog && part && (
          <StockDialog
            part={part}
            type={dialog}
            onClose={() => setDialog(null)}
            onSaved={(updated) => {
              setPart(updated);
              setDialog(null);
              setToast('Stock updated.');
            }}
          />
        )}
      </div>
    </div>
  );
}
