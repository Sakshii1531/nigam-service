import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';
import { formatINR } from '../../../lib/catalogueAdminApi';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton, StatusPill, Toggle } from '../catalogue/ui';

// AMC plans (membership merged in, docs/master-catalogue Phase 12). What a
// customer sees on the AMC page — which appliances, "from" prices, plan cards,
// benefits — is exactly this list.

const BLANK = {
  name: '',
  tier: '',
  applianceCategory: '',
  price: '',
  visitsTotal: '',
  durationMonths: 12,
  description: '',
  benefits: '',
  displayOrder: 0,
  isPopular: false,
  isActive: true,
};

const toForm = (plan) => ({
  ...BLANK,
  ...plan,
  applianceCategory: plan.applianceCategory || '',
  benefits: (plan.benefits || []).join('\n'),
});

const toBody = (form) => ({
  name: form.name.trim(),
  tier: form.tier.trim(),
  applianceCategory: form.applianceCategory || null,
  price: Number(form.price),
  visitsTotal: Number(form.visitsTotal),
  durationMonths: Number(form.durationMonths) || 12,
  description: form.description.trim(),
  benefits: form.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
  displayOrder: Number(form.displayOrder) || 0,
  isPopular: Boolean(form.isPopular),
  isActive: Boolean(form.isActive),
});

function PlanEditor({ plan, categories, onClose, onSaved }) {
  const [form, setForm] = useState(() => (plan ? toForm(plan) : BLANK));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = toBody(form);
      const saved = plan
        ? await apiRequest(`/super-admin/plans/amc/${plan.id}`, { method: 'PUT', auth: true, body })
        : await apiRequest('/super-admin/plans/amc', { method: 'POST', auth: true, body });
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save the plan.');
      setSaving(false);
    }
  };

  return (
    <Modal title={plan ? 'Edit AMC plan' : 'New AMC plan'} subtitle={plan?.subscribers ? `${plan.subscribers} customer(s) bought this plan — they keep what they bought` : undefined} onClose={onClose} width="max-w-2xl">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan name" className="col-span-2">
            <input required minLength={2} value={form.name} onChange={set('name')} className={inputClass} placeholder="e.g. AC Gold AMC" />
          </Field>
          <Field label="Appliance" hint="Leave on 'Any appliance' for a plan that covers every appliance.">
            <select value={form.applianceCategory} onChange={set('applianceCategory')} className={inputClass}>
              <option value="">Any appliance</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tier label" hint="Shown as a badge, e.g. Silver / Gold / Platinum.">
            <input value={form.tier} onChange={set('tier')} className={inputClass} placeholder="Gold" />
          </Field>
          <Field label="Price (₹)">
            <input required type="number" min="0" step="1" value={form.price} onChange={set('price')} className={inputClass} />
          </Field>
          <Field label="Visits included">
            <input required type="number" min="0" max="52" step="1" value={form.visitsTotal} onChange={set('visitsTotal')} className={inputClass} />
          </Field>
          <Field label="Validity (months)">
            <input required type="number" min="1" max="60" step="1" value={form.durationMonths} onChange={set('durationMonths')} className={inputClass} />
          </Field>
          <Field label="Display order" hint="Lower shows first.">
            <input type="number" step="1" value={form.displayOrder} onChange={set('displayOrder')} className={inputClass} />
          </Field>
          <Field label="Short description" className="col-span-2">
            <input value={form.description} onChange={set('description')} className={inputClass} placeholder="Year-round care for your AC" />
          </Field>
          <Field label="Benefits (one per line)" className="col-span-2" hint="Shown on the plan card exactly as written.">
            <textarea rows={5} value={form.benefits} onChange={set('benefits')} className={inputClass} placeholder={'3 scheduled service visits\nFree gas top-up once a year\nPriority booking'} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Toggle checked={form.isPopular} onChange={(v) => setForm((f) => ({ ...f, isPopular: v }))} label="Mark as most popular" />
          <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Live (customers can buy it)" />
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function AmcPlansTab({ categories }) {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | plan
  const nameOf = (key) => (key ? categories.find((c) => c.key === key)?.name || key : 'Any appliance');

  const load = useCallback(() => {
    apiRequest('/super-admin/plans/amc', { auth: true })
      .then((list) => {
        setPlans(Array.isArray(list) ? list : []);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load AMC plans.'));
  }, []);
  useEffect(load, [load]);

  const toggle = async (plan) => {
    try {
      await apiRequest(`/super-admin/plans/amc/${plan.id}`, { method: 'PUT', auth: true, body: { isActive: !plan.isActive } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async (plan) => {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    try {
      await apiRequest(`/super-admin/plans/amc/${plan.id}`, { method: 'DELETE', auth: true });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-[#1E293B]">AMC plans</h3>
          <p className="text-xs text-slate-500 mt-0.5">Customers pick an appliance, then one of its plans (plus any "Any appliance" plans). Buying a plan gives its visits for its validity.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setEditing('new')}>
          <Plus size={14} /> New AMC plan
        </PrimaryButton>
      </div>
      <ErrorNote message={error} />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase font-black tracking-wider text-slate-400">
            <th className="p-3 pl-5">Plan</th>
            <th className="p-3">Appliance</th>
            <th className="p-3 text-right">Price</th>
            <th className="p-3 text-right">Visits</th>
            <th className="p-3 text-right">Validity</th>
            <th className="p-3 text-right">Sold</th>
            <th className="p-3">Status</th>
            <th className="p-3 pr-5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {plans === null && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-slate-400 font-semibold">Loading…</td>
            </tr>
          )}
          {plans?.length === 0 && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-slate-400 font-semibold">No AMC plans yet — customers see nothing to buy.</td>
            </tr>
          )}
          {plans?.map((plan) => (
            <tr key={plan.id} className="hover:bg-slate-50">
              <td className="p-3 pl-5">
                <p className="font-bold text-slate-800">
                  {plan.name} {plan.isPopular && <span className="ml-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 rounded">Popular</span>}
                </p>
                <p className="text-[11px] text-slate-500">{[plan.tier, `${(plan.benefits || []).length} benefit(s)`].filter(Boolean).join(' · ')}</p>
              </td>
              <td className="p-3 text-slate-700">{nameOf(plan.applianceCategory)}</td>
              <td className="p-3 text-right font-bold">{formatINR(plan.price)}</td>
              <td className="p-3 text-right">{plan.visitsTotal}</td>
              <td className="p-3 text-right">{plan.durationMonths} mo</td>
              <td className="p-3 text-right">{plan.subscribers}</td>
              <td className="p-3">
                <button type="button" onClick={() => toggle(plan)} aria-label={`${plan.isActive ? 'Switch off' : 'Switch on'} ${plan.name}`} className="cursor-pointer">
                  <StatusPill active={plan.isActive} />
                </button>
              </td>
              <td className="p-3 pr-5 text-right whitespace-nowrap">
                <button type="button" onClick={() => setEditing(plan)} aria-label={`Edit ${plan.name}`} className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer">
                  <Pencil size={14} />
                </button>
                {plan.subscribers === 0 && (
                  <button type="button" onClick={() => remove(plan)} aria-label={`Delete ${plan.name}`} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <PlanEditor
          plan={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
