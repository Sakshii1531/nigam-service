import { useCallback, useEffect, useState } from 'react';
import { Edit2, Loader2, Plus, Power, Trash2 } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from '../catalogue/ui';

// Super Admin → Rewards → Coupon Codes. Each coupon's rules decide which
// customers see it as usable at checkout; the rest see it greyed out with the
// reason ("Add ₹200 more", "First booking only", …).

const SCOPES = [
  { id: 'service', label: 'Service bookings' },
  { id: 'product', label: 'Store orders' },
  { id: 'plan', label: 'Protection plans' },
];

const EMPTY = {
  code: '',
  title: '',
  description: '',
  discountType: 'flat',
  discount: '',
  maxDiscount: '',
  minOrderValue: '',
  categories: [],
  firstOrderOnly: false,
  perUserLimit: '',
  startsAt: '',
  expiry: '',
  status: 'Active',
  applicableOn: ['service'],
};

const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function summary(c) {
  const off = c.discountType === 'percent' ? `${c.discount}% off${c.maxDiscount ? ` (max ${rupees(c.maxDiscount)})` : ''}` : `${rupees(c.discount)} off`;
  const rules = [
    c.minOrderValue ? `min. ${rupees(c.minOrderValue)}` : null,
    c.categories?.length ? c.categories.join(', ') : null,
    c.firstOrderOnly ? 'first booking only' : null,
    c.perUserLimit ? `${c.perUserLimit}× per customer` : null,
  ].filter(Boolean);
  return { off, rules: rules.length ? rules.join(' · ') : 'Everyone, any order' };
}

function CouponForm({ initial, categories, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...EMPTY,
          ...initial,
          maxDiscount: initial.maxDiscount || '',
          minOrderValue: initial.minOrderValue || '',
          perUserLimit: initial.perUserLimit || '',
          startsAt: dateInput(initial.startsAt),
          expiry: dateInput(initial.expiry),
          categories: initial.categories || [],
          applicableOn: initial.applicableOn?.length ? initial.applicableOn : ['service'],
        }
      : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleIn = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.applicableOn.length) return setError('Pick at least one place the coupon can be used.');
    const body = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discount: Number(form.discount),
      maxDiscount: form.discountType === 'percent' ? Number(form.maxDiscount || 0) : 0,
      minOrderValue: Number(form.minOrderValue || 0),
      categories: form.categories,
      firstOrderOnly: form.firstOrderOnly,
      perUserLimit: Number(form.perUserLimit || 0),
      startsAt: form.startsAt || null,
      expiry: form.expiry ? `${form.expiry}T23:59:59` : null,
      status: form.status,
      applicableOn: form.applicableOn,
    };
    setBusy(true);
    try {
      if (editing) await apiRequest(`/coupons/${initial.id}`, { method: 'PATCH', auth: true, body });
      else await apiRequest('/coupons', { method: 'POST', auth: true, body });
      onSaved(editing ? 'Coupon updated.' : 'Coupon created — customers can see it now.');
    } catch (err) {
      setError(err.message || 'Could not save the coupon.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${initial.code}` : 'Create coupon'} subtitle="Shown to customers at checkout" onClose={onClose} width="max-w-2xl">
      <form onSubmit={save} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Code *" hint="Letters and numbers, e.g. FIRST100">
            <input required className={`${inputClass} uppercase`} value={form.code} onChange={set('code')} maxLength={30} aria-label="Coupon code" />
          </Field>
          <Field label="Headline (optional)" hint='e.g. "Flat ₹100 off your first service". Left empty, it is written for you.'>
            <input className={inputClass} value={form.title} onChange={set('title')} maxLength={80} aria-label="Coupon headline" />
          </Field>
        </div>
        <Field label="Details (optional)" hint="One line customers read under the headline.">
          <input className={inputClass} value={form.description} onChange={set('description')} maxLength={300} aria-label="Coupon details" />
        </Field>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Discount type">
            <select className={inputClass} value={form.discountType} onChange={set('discountType')} aria-label="Discount type">
              <option value="flat">Flat ₹ off</option>
              <option value="percent">% off</option>
            </select>
          </Field>
          <Field label={form.discountType === 'percent' ? 'Percent off *' : 'Rupees off *'}>
            <input required type="number" min="1" max={form.discountType === 'percent' ? 100 : undefined} step="any" className={inputClass} value={form.discount} onChange={set('discount')} aria-label="Discount value" />
          </Field>
          {form.discountType === 'percent' && (
            <Field label="Max discount ₹" hint="0 or empty = no cap">
              <input type="number" min="0" className={inputClass} value={form.maxDiscount} onChange={set('maxDiscount')} aria-label="Maximum discount" />
            </Field>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Who can use it</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Minimum order ₹" hint="Order value before GST. Empty = no minimum.">
              <input type="number" min="0" className={inputClass} value={form.minOrderValue} onChange={set('minOrderValue')} aria-label="Minimum order value" />
            </Field>
            <Field label="Uses per customer" hint="Empty = unlimited.">
              <input type="number" min="0" className={inputClass} value={form.perUserLimit} onChange={set('perUserLimit')} aria-label="Uses per customer" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.firstOrderOnly} onChange={set('firstOrderOnly')} /> First booking only (new customers)
          </label>
          <Field label="Usable on" group>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <label key={s.id} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${form.applicableOn.includes(s.id) ? 'border-[#0D47A1] bg-blue-50 text-[#0D47A1]' : 'border-slate-200 text-slate-500'}`}>
                  <input type="checkbox" className="sr-only" checked={form.applicableOn.includes(s.id)} onChange={() => toggleIn('applicableOn', s.id)} /> {s.label}
                </label>
              ))}
            </div>
          </Field>
          {form.applicableOn.includes('service') && (
            <Field label="Service categories" hint="None selected = every category." group>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {categories.map((c) => (
                  <label key={c.key} className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${form.categories.includes(c.key) ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                    <input type="checkbox" className="sr-only" checked={form.categories.includes(c.key)} onChange={() => toggleIn('categories', c.key)} /> {c.name}
                  </label>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Starts on" hint="Empty = now">
            <input type="date" className={inputClass} value={form.startsAt} onChange={set('startsAt')} aria-label="Starts on" />
          </Field>
          <Field label="Ends on" hint="Empty = never">
            <input type="date" className={inputClass} value={form.expiry} onChange={set('expiry')} aria-label="Ends on" />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status === 'Expired' ? 'Inactive' : form.status} onChange={set('status')} aria-label="Status">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />} {editing ? 'Save changes' : 'Create coupon'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function CouponManager({ onToast }) {
  const [coupons, setCoupons] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // {} = new, coupon = edit

  const load = useCallback(async () => {
    try {
      const rows = await apiRequest('/coupons/admin', { auth: true });
      setCoupons(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load coupons.');
      setCoupons([]);
    }
  }, []);
  useEffect(() => {
    load();
    apiRequest('/catalog/categories').then((rows) => setCategories(Array.isArray(rows) ? rows.filter((c) => c.isActive !== false && !c.isMore && !c.isForYou) : [])).catch(() => setCategories([]));
  }, [load]);

  const run = async (work, message) => {
    try {
      await work();
      onToast?.(message);
    } catch (err) {
      setError(err.message || 'Could not save that change.');
    } finally {
      load();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Coupon codes</h3>
          <p className="text-xs text-slate-400 font-semibold mt-1 max-w-xl">Customers see every active coupon at checkout. The ones their order qualifies for can be applied in one tap; the rest show why they don’t apply yet.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setEditing({})}><Plus size={15} /> Create coupon</PrimaryButton>
      </div>
      <ErrorNote message={error} />
      {coupons === null ? (
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-semibold text-slate-500">No coupons yet. Create the first one.</div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Rules</th>
                <th className="p-3">Valid</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => {
                const s = summary(c);
                return (
                  <tr key={c.id} className="font-semibold text-slate-700 align-top">
                    <td className="p-3">
                      <span className="font-mono font-black text-[#0D47A1]">{c.code}</span>
                      {c.title && <span className="block text-[11px] text-slate-500 mt-0.5">{c.title}</span>}
                    </td>
                    <td className="p-3 text-emerald-700 font-black whitespace-nowrap">{s.off}</td>
                    <td className="p-3 text-slate-500">
                      {s.rules}
                      <span className="block text-[10px] text-slate-400 mt-0.5">{(c.applicableOn || []).map((a) => SCOPES.find((x) => x.id === a)?.label).filter(Boolean).join(', ')}</span>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {c.startsAt ? new Date(c.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Now'} – {c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No end'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-black uppercase ${c.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{c.status}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"><Edit2 size={15} /></button>
                        <button
                          type="button"
                          onClick={() => run(() => apiRequest(`/coupons/${c.id}`, { method: 'PATCH', auth: true, body: { status: c.status === 'Active' ? 'Inactive' : 'Active' } }), c.status === 'Active' ? `${c.code} is now hidden from customers.` : `${c.code} is active again.`)}
                          aria-label={c.status === 'Active' ? `Deactivate ${c.code}` : `Activate ${c.code}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm(`Delete coupon ${c.code}? This cannot be undone.`) && run(() => apiRequest(`/coupons/${c.id}`, { method: 'DELETE', auth: true }), 'Coupon deleted.')}
                          aria-label={`Delete ${c.code}`}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <CouponForm
          initial={editing.id ? editing : null}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            onToast?.(message);
            load();
          }}
        />
      )}
    </div>
  );
}
