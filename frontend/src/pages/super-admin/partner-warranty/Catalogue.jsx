import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Save, Trash2, Image as ImageIcon } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';
import { uploadImage } from '../../../lib/uploadImage';
import { resolveMediaUrl } from '../../../lib/apiClient';

// Super Admin → Partner Warranty → Catalogue (docs/partner-warranty Phases 2
// and 14): what customers pick in Partner Warranty — groups, the issues per
// product, and which partner brands are listed for which products.

const TABS = [
  ['groups', 'Groups'],
  ['issues', 'Issues'],
  ['brands', 'Brands'],
];
const input = 'w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0D47A1] user-invalid:border-red-400';
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Msg({ msg }) {
  if (!msg) return null;
  return <p role={msg.error ? 'alert' : 'status'} className={`text-xs font-semibold ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>;
}

function CategoryChecks({ categories, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
      {categories.map((c) => (
        <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${value.includes(c.id) ? 'border-[#0D47A1] bg-[#EEF4FF] font-bold text-[#0D47A1]' : 'border-[#E2E8F0]'}`}>
          <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} className="accent-[#0D47A1]" />
          {c.name}
        </label>
      ))}
    </div>
  );
}

function GroupsTab({ categories }) {
  const groups = useApiData(() => adminWarrantyApi.groups(), [], { initial: [] });
  const blank = { name: '', slug: '', tagline: '', imageUrl: null, categories: [], sortOrder: 0, isActive: true };
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const edit = (g) => setForm({ id: g.id, name: g.name, slug: g.slug, tagline: g.tagline, imageUrl: g.imageUrl, categories: g.categories.map((c) => c.id), sortOrder: g.sortOrder, isActive: g.isActive });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { id, ...body } = form;
    try {
      if (id) await adminWarrantyApi.updateGroup(id, body);
      else await adminWarrantyApi.createGroup(body);
      setForm(null);
      setMsg({ text: 'Saved.' });
      groups.reload();
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };
  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setForm({ ...form, imageUrl: await uploadImage(file) });
    } catch (err) {
      setMsg({ error: true, text: err.message });
    }
  };

  return (
    <div className="grid grid-cols-5 gap-5 items-start">
      <Panel className="col-span-3" title="Groups" right={<button type="button" onClick={() => setForm(blank)} className="text-xs font-bold text-[#0D47A1] flex items-center gap-1"><Plus size={13} /> New group</button>}>
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-[#64748B]">
            <tr>
              <th className="text-left py-1.5">Group</th>
              <th className="text-left">Products</th>
              <th className="text-left">Order</th>
              <th className="text-left">Shown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {groups.data.map((g) => (
              <tr key={g.id} onClick={() => edit(g)} className={`cursor-pointer hover:bg-[#F8FAFC] ${form?.id === g.id ? 'bg-[#EEF4FF]' : ''}`}>
                <td className="py-2">
                  <p className="font-bold">{g.name}</p>
                  <p className="text-[10px] text-[#64748B]">{g.slug} · {g.tagline}</p>
                </td>
                <td className="text-[#64748B]">{g.categories.map((c) => c.name).join(', ') || '—'}</td>
                <td>{g.sortOrder}</td>
                <td className={g.isActive ? 'text-emerald-700 font-bold' : 'text-[#94A3B8]'}>{g.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Msg msg={!form ? msg : null} />
      </Panel>

      {form && (
        <Panel className="col-span-2" title={form.id ? 'Edit group' : 'New group'}>
          <form onSubmit={save} className="space-y-3">
            <label className="block text-xs font-semibold">
              Name
              <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs font-semibold">
              Slug (in the customer app’s address)
              <input required pattern="[a-z0-9-]+" maxLength={60} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs font-semibold">
              Tagline
              <input maxLength={160} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
                {form.imageUrl ? <img src={resolveMediaUrl(form.imageUrl)} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={18} className="text-[#94A3B8]" />}
              </div>
              <label className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#0D47A1] cursor-pointer focus-within:ring-2 focus-within:ring-[#0D47A1]">
                Picture
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} className="sr-only" />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Products in this group</p>
              <CategoryChecks categories={categories} value={form.categories} onChange={(v) => setForm({ ...form, categories: v })} />
            </div>
            <div className="flex gap-3">
              <label className="text-xs font-semibold">
                Order
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={`mt-1 w-20 ${input}`} />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold mt-5">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-[#0D47A1]" /> Shown to customers
              </label>
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
              List this brand in the customer app’s Partner Warranty
            </label>
            <div>
              <p className="text-xs font-semibold mb-1">Products covered</p>
              <CategoryChecks categories={categories} value={form.coverage} onChange={(v) => setForm({ ...form, coverage: v })} />
            </div>
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

export default function WarrantyCatalogue() {
  const [search, setSearch] = useSearchParams();
  const tab = search.get('tab') || 'groups';
  const categories = useApiData(() => adminWarrantyApi.categories(), [], { initial: [] });
  return (
    <AdminShell title="Partner Warranty Catalogue" subtitle="Groups, issues and brand coverage — what customers pick in Partner Warranty">
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
      {tab === 'groups' && <GroupsTab categories={categories.data} />}
      {tab === 'issues' && <IssuesTab categories={categories.data} />}
      {tab === 'brands' && <BrandsTab categories={categories.data} />}
    </AdminShell>
  );
}
