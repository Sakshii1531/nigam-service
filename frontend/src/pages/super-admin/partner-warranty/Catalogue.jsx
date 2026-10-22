import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';
import WarrantyPolicyPanel from '../../../components/brand-admin/WarrantyPolicyPanel';

// Partner brands, their product coverage, issues and warranty terms.

const TABS = [
  ['brands', 'Brands'],
  ['issues', 'Issues'],
  ['policies', 'Policies & Serials'],
];
const input = 'w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0D47A1] user-invalid:border-red-400';


function Msg({ msg }) {
  if (!msg) return null;
  return <p role={msg.error ? 'alert' : 'status'} className={`text-xs font-semibold ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>;
}

function CategoryChecks({ categories, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div>
    <div className="flex gap-3 mb-2 text-xs"><button type="button" onClick={() => onChange(categories.map(c => c.id))}>Select all products</button><button type="button" onClick={() => onChange([])}>Clear selection</button></div>
    <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
      {categories.map((c) => (
        <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${value.includes(c.id) ? 'border-[#0D47A1] bg-[#EEF4FF] font-bold text-[#0D47A1]' : 'border-[#E2E8F0]'}`}>
          <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} className="accent-[#0D47A1]" />
          {c.name}
        </label>
      ))}
    </div>
    </div>
  );
}

function IssuesTab({ categories }) {
  const [category, setCategory] = useState('');
  const issues = useApiData(() => (category ? adminWarrantyApi.issues({ category, productType: '' }) : Promise.resolve([])), [category], { initial: [] });
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(null);

  const act = async (fn) => {
    setMsg(null);
    try {
      await fn();
      issues.reload();
    } catch (err) {
      setMsg({ error: true, text: err.message });
    }
  };
  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    act(async () => {
      await adminWarrantyApi.createIssue({ category, name: name.trim(), sortOrder: issues.data.length });
      setName('');
    });
  };

  return (
    <Panel title="Issues customers can pick">
      <label className="block text-xs font-semibold max-w-xs">
        Product
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 ${input}`}>
          <option value="">Choose a product…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {category && (
        <div className="mt-4 space-y-2 max-w-2xl">
          {issues.data.map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <input
                aria-label={`Issue name: ${i.name}`}
                defaultValue={i.name}
                onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== i.name && act(() => adminWarrantyApi.updateIssue(i.id, { name: e.target.value.trim() }))}
                className={`flex-1 ${input}`}
              />
              <label className="flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
                <input type="checkbox" checked={i.isActive} onChange={(e) => act(() => adminWarrantyApi.updateIssue(i.id, { isActive: e.target.checked }))} className="accent-[#0D47A1]" /> Shown
              </label>
              <button type="button" aria-label={`Delete ${i.name}`} onClick={() => act(() => adminWarrantyApi.deleteIssue(i.id))} className="p-2 rounded-lg text-red-600 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!issues.loading && issues.data.length === 0 && <p className="text-xs text-amber-700">No issues yet — customers can’t raise a claim for this product until you add some.</p>}
          <form onSubmit={add} className="flex gap-2 pt-2">
            <label htmlFor="pw-new-issue" className="sr-only">
              New issue
            </label>
            <input id="pw-new-issue" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Not cooling" className={`flex-1 ${input}`} />
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1">
              <Plus size={13} /> Add issue
            </button>
          </form>
          <Msg msg={msg} />
        </div>
      )}
    </Panel>
  );
}

function BrandsTab({ categories }) {
  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const edit = (b) =>
    setForm({ id: b.id, name: b.name, warrantyEnabled: b.warrantyEnabled, coverage: b.coverage.map((c) => c.id), logoUrl: b.logoUrl, sla: { approvalHours: '', assignmentHours: '', visitHours: '', resolutionHours: '', ...b.warrantySla } });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const warrantySla = Object.fromEntries(Object.entries(form.sla).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)]));
      await adminWarrantyApi.updateBrand(form.id, { warrantyEnabled: form.warrantyEnabled, coverage: form.coverage, logoUrl: form.logoUrl, ...(Object.keys(warrantySla).length ? { warrantySla } : {}) });
      setForm(null);
      setMsg({ text: 'Saved.' });
      brands.reload();
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-5 gap-5 items-start">
      <Panel className="col-span-3" title="Partner brands">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-[#64748B]">
            <tr>
              <th className="text-left py-1.5">Brand</th>
              <th className="text-left">Status</th>
              <th className="text-left">Listed</th>
              <th className="text-left">Products</th>
              <th className="text-left">Approval SLA</th>
              <th className="text-left">Current setup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {brands.data.map((b) => (
              <tr key={b.id} onClick={() => edit(b)} className={`cursor-pointer hover:bg-[#F8FAFC] ${form?.id === b.id ? 'bg-[#EEF4FF]' : ''}`}>
                <td className="py-2 font-bold">{b.name}</td>
                <td>{b.status}</td>
                <td className={b.warrantyEnabled ? 'text-emerald-700 font-bold' : 'text-[#94A3B8]'}>{b.warrantyEnabled ? 'Yes' : 'No'}</td>
                <td className="text-[#64748B]">{b.coverage.map((c) => c.name).join(', ') || '—'}</td>
                <td>{b.warrantySla?.approvalHours ? `${b.warrantySla.approvalHours} h` : 'default'}</td>
                <td className="text-[#64748B]">{b.setup?.activePolicies || 0} policies · {b.setup?.activeRates || 0} rates</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Msg msg={!form ? msg : null} />
      </Panel>
      {form && (
        <Panel className="col-span-2" title={`Warranty settings — ${form.name}`}>
          <form onSubmit={save} className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={form.warrantyEnabled} onChange={(e) => setForm({ ...form, warrantyEnabled: e.target.checked })} className="accent-[#0D47A1]" />
              Show this brand directly in Partner Warranty
            </label>
            <div>
              <p className="text-xs font-semibold mb-1">Products covered</p>
              <CategoryChecks categories={categories} value={form.coverage} onChange={(v) => setForm({ ...form, coverage: v })} />
            </div>
            <p className="text-xs text-slate-600">Configure warranty terms in Policies &amp; Serials and charges in <Link className="text-blue-800 underline" to="/super-admin/brand-rates">Brand Rates</Link>. Listing a brand does not configure its policies or prices. Setup counts show current rules, not complete coverage for every location and service.</p>
            <div>
              <p className="text-xs font-semibold mb-1">SLA hours (blank = platform default)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['approvalHours', 'Approval'],
                  ['assignmentHours', 'Assignment'],
                  ['visitHours', 'Visit'],
                  ['resolutionHours', 'Resolution'],
                ].map(([k, label]) => (
                  <label key={k} className="text-[11px] font-semibold text-[#64748B]">
                    {label}
                    <input type="number" min={1} value={form.sla[k] ?? ''} onChange={(e) => setForm({ ...form, sla: { ...form.sla, [k]: e.target.value } })} className={`mt-1 ${input}`} />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-60">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0]">
                Cancel
              </button>
              <Msg msg={msg} />
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

function PoliciesTab() {
  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const [brand, setBrand] = useState('');
  const [tab, setTab] = useState('Policies');
  return <Panel title="Warranty policies and serial registry">
    <p className="text-sm text-slate-600 mb-4">Select any brand to configure its warranty terms. A brand-default policy covers all products in that brand’s coverage; category, product type and model policies can override it. Set approved business terms before accepting claims.</p>
    <label className="block text-sm font-semibold mb-4">Brand<select aria-label="Policy brand" className={input} value={brand} onChange={e => setBrand(e.target.value)}><option value="">Select brand</option>{brands.data.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    {brands.error && <p role="alert">{brands.error.message}</p>}
    {brand && <><div className="flex gap-3 mb-4">{['Policies', 'Serial Registry'].map(value => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className="rounded-lg border px-4 py-2 text-sm">{value}</button>)}</div><WarrantyPolicyPanel key={`${brand}:${tab}`} canEdit tab={tab} base={`/super-admin/brands/${brand}/warranty-policies`} /></>}
  </Panel>;
}

export default function WarrantyCatalogue() {
  const [search, setSearch] = useSearchParams();
  const tab = TABS.some(([key]) => key === search.get('tab')) ? search.get('tab') : 'brands';
  const categories = useApiData(() => adminWarrantyApi.categories(), [], { initial: [] });
  return (
    <AdminShell title="Partner Warranty Catalogue" subtitle="Brands, covered products and issues — customers choose their brand first">
      <div role="tablist" aria-label="Catalogue" className="flex gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setSearch({ tab: key })}
            className={`px-4 py-2 rounded-xl text-xs font-bold border ${tab === key ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-[#475569] border-[#E2E8F0]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'issues' && <IssuesTab categories={categories.data} />}
      {tab === 'brands' && <BrandsTab categories={categories.data} />}
      {tab === 'policies' && <PoliciesTab />}
    </AdminShell>
  );
}
