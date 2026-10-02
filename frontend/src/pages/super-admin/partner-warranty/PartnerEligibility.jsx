import { useEffect, useState } from 'react';
import { Loader2, Save, Search } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';

// Super Admin → Partner Warranty → Partner Eligibility (docs/partner-warranty
// Phases 6 and 14, client #9): which partner brands a service partner may do
// warranty jobs for, and where (pincodes / radius). A brand with at least one
// authorized partner only gets its own authorized partners.

function Editor({ id, brands, onSaved }) {
  const res = useApiData(() => adminWarrantyApi.partner(id), [id]);
  const [edits, setEdits] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const d = res.data;
  const form =
    edits ??
    (d && {
      authorizedBrands: d.authorizedBrands.map((b) => b.id),
      pincodes: d.servicePincodes.join(', '),
      radius: d.serviceRadiusKm ?? '',
    });

  const save = async (e) => {
    e.preventDefault();
    const pins = form.pincodes.split(/[\s,]+/).filter(Boolean);
    const bad = pins.filter((p) => !/^\d{6}$/.test(p));
    if (bad.length) return setMsg({ error: true, text: `Not 6-digit pincodes: ${bad.join(', ')}` });
    setBusy(true);
    setMsg(null);
    try {
      res.setData(
        await adminWarrantyApi.updatePartner(id, {
          authorizedBrands: form.authorizedBrands,
          servicePincodes: pins,
          serviceRadiusKm: form.radius === '' ? null : Number(form.radius),
        }),
      );
      setEdits(null);
      setMsg({ text: 'Saved. Applies to the next warranty job offered.' });
      onSaved?.();
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  if (!form) return <Panel><div className="h-40 bg-slate-100 rounded-xl animate-pulse" /></Panel>;
  const toggle = (bid) =>
    setEdits({ ...form, authorizedBrands: form.authorizedBrands.includes(bid) ? form.authorizedBrands.filter((x) => x !== bid) : [...form.authorizedBrands, bid] });

  return (
    <Panel title={`${d.name} · ${d.city || 'no city'} · ${d.specs.join(', ') || 'no skills'} · ${d.tier}`}>
      <form onSubmit={save} className="space-y-4">
        <fieldset>
          <legend className="text-xs font-semibold mb-1">Authorized for brands</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {brands.map((b) => (
              <label key={b.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${form.authorizedBrands.includes(b.id) ? 'border-[#0D47A1] bg-[#EEF4FF] font-bold text-[#0D47A1]' : 'border-[#E2E8F0]'}`}>
                <input type="checkbox" checked={form.authorizedBrands.includes(b.id)} onChange={() => toggle(b.id)} className="accent-[#0D47A1]" />
                {b.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-xs font-semibold">
          Service pincodes (comma or space separated; blank = use radius / city)
          <textarea rows={2} value={form.pincodes} onChange={(e) => setEdits({ ...form, pincodes: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-mono" />
        </label>
        <label className="block text-xs font-semibold">
          Service radius (km; blank = 25 km default when the partner has a location)
          <input type="number" min={1} max={300} value={form.radius} onChange={(e) => setEdits({ ...form, radius: e.target.value })} className="mt-1 w-32 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs" />
        </label>
        {!d.hasLocation && <p className="text-[11px] text-amber-700">This partner has no saved location, so a radius can’t apply — use pincodes, or their city is used.</p>}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
          {msg && <p role={msg.error ? 'alert' : 'status'} className={`text-xs font-semibold ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>}
        </div>
      </form>
    </Panel>
  );
}

export default function PartnerEligibility() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const partners = useApiData(() => adminWarrantyApi.searchPartners(term), [term], { initial: [] });

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const list = Array.isArray(partners.data) ? partners.data : partners.data?.items || [];

  return (
    <AdminShell title="Partner Eligibility" subtitle="Brand authorization and service area for warranty jobs">
      <div className="grid grid-cols-3 gap-5 items-start">
        <Panel title="Service partners">
          <div className="relative mb-3">
            <label htmlFor="pe-q" className="sr-only">
              Search partners
            </label>
            <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" aria-hidden="true" />
            <input id="pe-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or email" className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC]" />
          </div>
          <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs ${selected === p.id ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-transparent hover:bg-[#F8FAFC]'}`}
                >
                  <p className="font-bold">{p.name}</p>
                  <p className="text-[10px] text-[#64748B]">
                    {p.phone} · {p.serviceCityName || p.city?.name || '—'} · {(p.specs || []).join(', ')}
                  </p>
                </button>
              </li>
            ))}
            {!partners.loading && list.length === 0 && <li className="text-xs text-[#94A3B8] px-3">No partners found.</li>}
          </ul>
        </Panel>
        <div className="col-span-2">
          {selected ? <Editor key={selected} id={selected} brands={brands.data} /> : <Panel><p className="text-xs text-[#64748B]">Choose a partner to set their warranty eligibility.</p></Panel>}
        </div>
      </div>
    </AdminShell>
  );
}
