import { useId, useState } from 'react';
import { Copy, Loader2, Plug, RefreshCw, Save, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { brandWarrantyApi } from '../../lib/brandWarrantyApi';
import { uploadImage } from '../../lib/uploadImage';
import { resolveMediaUrl } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/partnerWarrantyFormat';

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

function CoverageCard() {
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
    <Card title="Warranty coverage" subtitle="The products customers can raise a warranty claim for under your brand.">
      {res.loading ? (
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      ) : d ? (
        <>
          <div className={`text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-2 ${d.warrantyEnabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            <ShieldCheck size={14} aria-hidden="true" />
            {d.warrantyEnabled
              ? 'Your brand is listed in the customer app’s Partner Warranty.'
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
            <button type="button" onClick={save} disabled={busy || uploading} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-60">
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

function WebhookCard() {
  const res = useApiData(() => brandWarrantyApi.webhook(), []);
  const [edits, setForm] = useState(null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [test, setTest] = useState(null);
  const d = res.data;
  // The form starts from the saved settings; edits replace it until saved.
  const form = edits ?? (d ? { url: d.url || '', enabled: d.enabled, events: d.events || [] } : null);

  const toggleEvent = (ev) =>
    setForm({ ...form, events: form.events.includes(ev) ? form.events.filter((e) => e !== ev) : [...form.events, ev] });

  const save = async (extra = {}) => {
    setBusy(true);
    setMsg(null);
    try {
      const out = await brandWarrantyApi.saveWebhook({ url: form.url.trim() || null, enabled: form.enabled, events: form.events, ...extra });
      res.setData(out);
      setForm(null);
      if (out.secret) setSecret(out.secret);
      setMsg({ text: out.secret ? 'Saved. Copy the signing secret now — it is shown only once.' : 'Saved.' });
    } catch (err) {
      setMsg({ error: true, text: err.message || 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTest({ busy: true });
    try {
      setTest(await brandWarrantyApi.testWebhook());
      res.reload();
    } catch (err) {
      setTest({ status: 'failed', error: err.message });
    }
  };

  return (
    <Card title="CRM webhook" subtitle="NCC can POST every claim event (created, approved, job created, completed, closed …) to your CRM, signed with a secret.">
      {!form ? (
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <label className="block text-xs font-semibold text-[#1E293B]">
            Endpoint URL
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://crm.yourbrand.com/ncc/webhooks"
              className="mt-1 w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0D47A1] user-invalid:border-red-400"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#1E293B]">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-[#0D47A1]" />
            Send events
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-[#1E293B] mb-2">Events (none ticked = all)</legend>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(d?.availableEvents) ? d.availableEvents : []).map((ev) => (
                <label key={ev} className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono cursor-pointer ${form.events.includes(ev) ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B]'}`}>
                  <input type="checkbox" className="sr-only" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  {ev}
                </label>
              ))}
            </div>
          </fieldset>

          {secret && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
              <p className="font-bold text-amber-900">Signing secret — copy it now, it won’t be shown again</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 font-mono text-[11px] break-all bg-white rounded-lg px-2 py-1.5">{secret}</code>
                <button type="button" onClick={() => navigator.clipboard?.writeText(secret)} aria-label="Copy secret" className="p-2 rounded-lg border border-amber-200 bg-white">
                  <Copy size={13} />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => save()} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />} Save webhook
            </button>
            {d.hasSecret && (
              <button type="button" onClick={() => save({ rotateSecret: true })} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-[#0D47A1] border border-[#BFDBFE] flex items-center gap-1.5">
                <RefreshCw size={13} aria-hidden="true" /> New secret
              </button>
            )}
            {d.url && d.enabled && (
              <button type="button" onClick={runTest} disabled={test?.busy} className="px-4 py-2 rounded-xl text-xs font-bold text-[#0D47A1] border border-[#BFDBFE] flex items-center gap-1.5">
                <Plug size={13} aria-hidden="true" /> {test?.busy ? 'Sending…' : 'Send test'}
              </button>
            )}
            <Flash msg={msg} />
          </div>
          {test && !test.busy && (
            <Flash msg={{ error: test.status !== 'delivered', text: test.status === 'delivered' ? `Test delivered (HTTP ${test.httpStatus}).` : `Test failed: ${test.error || `HTTP ${test.httpStatus}`}` }} />
          )}

          <div>
            <p className="text-xs font-semibold text-[#1E293B] mb-2">Recent deliveries</p>
            {(Array.isArray(d?.recentDeliveries) ? d.recentDeliveries : []).length === 0 ? (
              <p className="text-xs text-[#94A3B8]">Nothing sent yet.</p>
            ) : (
              <table className="w-full text-[11px] text-left">
                <thead className="text-[#64748B] uppercase text-[9px]">
                  <tr>
                    <th className="py-1.5">Event</th>
                    <th>Claim</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(Array.isArray(d?.recentDeliveries) ? d.recentDeliveries : []).map((e) => (
                    <tr key={e.id}>
                      <td className="py-1.5 font-mono">{e.type}</td>
                      <td>{e.claimTicket || '—'}</td>
                      <td className={e.status === 'delivered' ? 'text-emerald-700 font-bold' : e.status === 'failed' ? 'text-red-600 font-bold' : 'text-amber-700 font-bold'} title={e.lastError || ''}>
                        {e.status}
                      </td>
                      <td>{e.attempts}</td>
                      <td className="text-[#64748B]">{formatDateTime(e.deliveredAt || e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-[#94A3B8] mt-2">Payloads and signature verification are described in NCC’s webhook guide.</p>
          </div>
        </>
      )}
    </Card>
  );
}

const WarrantySettings = () => (
  <div className="min-h-screen bg-[#F1F5F9] flex relative">
    <Sidebar />
    <div className="flex-1 ml-64 flex flex-col min-w-0">
      <Topbar title="Warranty Settings" subtitle="Coverage, logo and CRM integration for Partner Warranty" />
      <div className="p-5 grid grid-cols-2 gap-5 items-start">
        <CoverageCard />
        <WebhookCard />
      </div>
    </div>
  </div>
);

export default WarrantySettings;
