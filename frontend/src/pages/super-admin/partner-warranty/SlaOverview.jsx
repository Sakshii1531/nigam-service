import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';

// Super Admin → Partner Warranty → SLA (docs/partner-warranty Phase 14,
// client #15): per-brand performance and the platform default hours a brand's
// own SLA overrides.

const FIELDS = [
  ['approvalHours', 'Brand approval'],
  ['assignmentHours', 'Partner assignment'],
  ['visitHours', 'Technician visit'],
  ['resolutionHours', 'Resolution'],
];

function Defaults() {
  const settings = useApiData(() => adminWarrantyApi.settings(), []);
  const [edits, setEdits] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const saved = settings.data?.warrantySla || {};
  const values = edits ?? saved;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body = Object.fromEntries(FIELDS.map(([k]) => [k, Number(values[k])]));
      settings.setData(await adminWarrantyApi.saveSla(body));
      setEdits(null);
      setMsg({ text: 'Saved. New claims use these hours; existing claims keep theirs.' });
    } catch (err) {
      setMsg({ error: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Platform default hours">
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {FIELDS.map(([k, label]) => (
            <label key={k} className="text-xs font-semibold text-[#1E293B]">
              {label}
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min={1}
                  max={2160}
                  required
                  value={values[k] ?? ''}
                  onChange={(e) => setEdits({ ...values, [k]: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs user-invalid:border-red-400"
                />
                <span className="text-[#64748B]">h</span>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy || !edits} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save defaults
          </button>
          {msg && <p className={`text-xs font-semibold ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>}
        </div>
        <p className="text-[11px] text-[#94A3B8]">A brand’s own hours (Catalogue → Brands) override these. Warning at 80 % of a window, breach at 100 %; a missed brand approval escalates the claim.</p>
      </form>
    </Panel>
  );
}

export default function SlaOverview() {
  const summary = useApiData(() => adminWarrantyApi.slaSummary(), [], { initial: [] });
  const pct = (v) => (v == null ? '—' : `${v}%`);
  return (
    <AdminShell title="Warranty SLA" subtitle="Deadlines, warnings and breaches across partner brands">
      <Panel
        title="By brand"
        right={
          <Link to="/super-admin/partner-warranty/claims?view=breached" className="text-xs font-semibold text-[#0D47A1]">
            See breached claims →
          </Link>
        }
      >
        <table className="w-full text-xs">
          <thead className="bg-[#F8FAFC] text-[10px] uppercase text-[#64748B]">
            <tr>
              {['Brand', 'Claims', 'Open', 'In warning', 'Breached', 'Approvals decided', 'Approved on time', 'Avg. approval', 'Resolved', 'Resolved on time'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {summary.data.map((r) => (
              <tr key={r.brand.id}>
                <td className="px-3 py-2.5 font-bold">{r.brand.name}</td>
                <td className="px-3">{r.total}</td>
                <td className="px-3">{r.open}</td>
                <td className={`px-3 ${r.inWarning ? 'text-amber-700 font-bold' : ''}`}>{r.inWarning}</td>
                <td className={`px-3 ${r.breached ? 'text-red-600 font-bold' : ''}`}>{r.breached}</td>
                <td className="px-3">{r.approval.decided}</td>
                <td className="px-3">{pct(r.approval.onTimePercent)}</td>
                <td className="px-3">{r.approval.avgHours == null ? '—' : `${r.approval.avgHours} h`}</td>
                <td className="px-3">{r.resolution.resolved}</td>
                <td className="px-3">{pct(r.resolution.onTimePercent)}</td>
              </tr>
            ))}
            {!summary.loading && summary.data.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-[#64748B]">
                  No claims yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      <Defaults />
    </AdminShell>
  );
}
