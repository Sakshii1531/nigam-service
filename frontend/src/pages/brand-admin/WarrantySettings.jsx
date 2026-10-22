import { useId, useState } from 'react';
import { Loader2, Save, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { brandWarrantyApi } from '../../lib/brandWarrantyApi';
import { uploadImage } from '../../lib/uploadImage';
import { resolveMediaUrl } from '../../lib/apiClient';
import WarrantyPolicyPanel from '../../components/brand-admin/WarrantyPolicyPanel';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';

// Brand panel → Warranty Settings (docs/partner-warranty Phases 2 and 10):
// which products customers can raise warranty claims for, the logo customers
// see, and the CRM webhook. Listing the brand at all (warrantyEnabled) and
// SLA hours are NCC's decisions and are shown read-only.

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#1E293B]">{title}</h2>
        {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Flash({ msg }) {
  if (!msg) return null;
  return (
    <p role={msg.error ? 'alert' : 'status'} className={`text-xs font-semibold ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>
      {msg.text}
    </p>
  );
}

function CoverageCard({ canEdit }) {
  const res = useApiData(() => brandWarrantyApi.coverage(), []);
  const [selected, setSelected] = useState(null);
  const [logo, setLogo] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const logoInput = useId();
  const d = res.data;
  const coverage = Array.isArray(d?.coverage) ? d.coverage : [];
  const options = Array.isArray(d?.options) ? d.options : [];
  const chosen = selected ?? new Set(coverage.map((c) => c.id));
  const logoUrl = logo === undefined ? d?.logoUrl : logo;

  const toggle = (id) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      setLogo(await uploadImage(file));
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const body = { coverage: [...chosen] };
      if (logo !== undefined) body.logoUrl = logo;
      res.setData(await brandWarrantyApi.saveCoverage(body));
      setSelected(null);
      setLogo(undefined);
      setMsg({ text: 'Saved. Customers see the change straight away.' });
    } catch (err) {
      setMsg({ error: true, text: err.message || 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Warranty coverage" subtitle="Customers choose your brand first, then one of these covered products to raise a warranty claim.">
      {res.loading ? (
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      ) : d ? (
        <>
          <div className={`text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-2 ${d.warrantyEnabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            <ShieldCheck size={14} aria-hidden="true" />
            {d.warrantyEnabled
              ? 'Customers can select your brand directly in Partner Warranty.'
              : 'Your brand is not listed to customers yet — NCC switches this on.'}
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-[#1E293B] mb-1">Products covered</legend>
            <p className="text-[10px] text-[#64748B] mb-2">Active Master Catalogue categories configured by Super Admin.</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map((o) => (
                <label key={o.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer ${chosen.has(o.id) ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1] font-bold' : 'border-[#E2E8F0] text-[#1E293B]'}`}>
                  <input type="checkbox" checked={chosen.has(o.id)} onChange={() => toggle(o.id)} className="accent-[#0D47A1]" />
                  {o.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
              {logoUrl ? <img src={resolveMediaUrl(logoUrl)} alt="Brand logo" className="h-full w-full object-contain" /> : <ImageIcon size={20} className="text-[#94A3B8]" aria-hidden="true" />}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-[#1E293B]">Logo shown to customers</p>
              <input id={logoInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} className="sr-only" />
              <div className="flex gap-2 mt-1">
                <label htmlFor={logoInput} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] font-semibold text-[#0D47A1] cursor-pointer focus-within:ring-2 focus-within:ring-[#0D47A1]">
                  {uploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
                </label>
                {logoUrl && (
                  <button type="button" onClick={() => setLogo(null)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] font-semibold text-[#64748B]">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#64748B]">
            Approval deadline set by NCC: <span className="font-bold">{d.warrantySla?.approvalHours ? `${d.warrantySla.approvalHours} h` : 'platform default'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={!canEdit || busy || uploading} title={canEdit ? undefined : 'You can view coverage but not change it'} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />} Save coverage
            </button>
            <Flash msg={msg} />
          </div>
        </>
      ) : (
        <Flash msg={{ error: true, text: res.error?.message || 'Could not load.' }} />
      )}
    </Card>
  );
}


const WarrantySettings = () => {
  // Coverage edits need warranty:policy_edit; the CRM webhook is integrations:manage (docs/brand-crm Phase 2).
  const { can } = useBrandPermissions();
  const [tab, setTab] = useState('Coverage');
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar title="Warranty Settings" subtitle="Coverage, logo and CRM integration for Partner Warranty" />
        <div className="p-5 space-y-5">
          <nav aria-label="Warranty settings tabs" className="flex gap-3">{['Coverage','Policies','Serial Registry'].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm ${tab===t?'bg-blue-800 text-white':'bg-white border'}`}>{t}</button>)}</nav>
          {tab==='Coverage'?<div className="grid grid-cols-2 gap-5 items-start">
          <CoverageCard canEdit={can('warranty:policy_edit')} />
          <p className="text-sm text-slate-500">CRM webhook and API keys are in Settings → Integrations.</p>
          </div>:<WarrantyPolicyPanel key={tab} tab={tab} canEdit={can('warranty:policy_edit')}/>}
        </div>
      </div>
    </div>
  );
};

export default WarrantySettings;
