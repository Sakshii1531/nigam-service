import { useEffect, useState } from 'react';
import { Download, IndianRupee, Percent, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { exportCsv } from '../../lib/exportCsv';

// NCC gross service margin (docs/master-catalogue Phase 7) —
// GET /super-admin/reports/margin. Revenue is ex-GST; GST and spare parts
// are shown beside it, never inside it. Covered (warranty / AMC / EW) visits
// are their own section: no customer revenue, payout recoverable from the brand.

// Whole rupees stay whole (₹3,825); anything with paise shows both digits (₹724.50).
const inr = (v) => {
  if (v == null) return '—';
  const digits = Number.isInteger(Number(v)) ? 0 : 2;
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
};
const pct = (v) => (v == null ? '—' : `${v}%`);
const isoDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

const GROUP_BY = [
  { id: 'category', label: 'Category' },
  { id: 'offering', label: 'Offering' },
  { id: 'partner', label: 'Partner' },
  { id: 'day', label: 'Day' },
];

const COLUMNS = [
  ['jobs', 'Jobs', (v) => v],
  ['revenue', 'Revenue ex-GST', inr],
  ['discounts', 'Discounts', inr],
  ['expressFees', 'Express fees', inr],
  ['payouts', 'Partner payouts', inr],
  ['margin', 'Gross margin', inr],
  ['marginPercent', 'Margin %', pct],
  ['gstCollected', 'GST collected', inr],
  ['sparePartsRevenue', 'Spare parts (ex-GST)', inr],
];

const controlClass =
  'border border-slate-200 bg-white px-2.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-600';

function Kpi({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}

function SectionTable({ title, note, section, groupLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-extrabold text-sm text-[#1E293B]">{title}</h3>
        {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
      </div>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] font-black tracking-wider uppercase">
            <th className="p-3 pl-5">{groupLabel}</th>
            {COLUMNS.map(([key, label]) => (
              <th key={key} className="p-3 text-right whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {section.groups.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="p-6 text-center text-slate-400 font-semibold">
                No completed jobs in this period.
              </td>
            </tr>
          )}
          {section.groups.map((g) => (
            <tr key={g.key} className="hover:bg-slate-50">
              <td className="p-3 pl-5 font-bold text-slate-800">{g.label}</td>
              {COLUMNS.map(([key, , fmt]) => (
                <td
                  key={key}
                  className={`p-3 text-right tabular-nums ${key === 'margin' ? (g.margin < 0 ? 'text-red-600 font-bold' : 'text-green-700 font-bold') : 'text-slate-700'}`}
                >
                  {fmt(g[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {section.groups.length > 0 && (
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-black text-slate-800">
              <td className="p-3 pl-5">Total</td>
              {COLUMNS.map(([key, , fmt]) => (
                <td key={key} className="p-3 text-right tabular-nums">
                  {fmt(section.totals[key])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function ServiceMarginReport() {
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [groupBy, setGroupBy] = useState('category');
  const [state, setState] = useState({ key: '', data: null, error: '' });
  const key = JSON.stringify({ from, to, groupBy });

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ groupBy, ...(from ? { from } : {}), ...(to ? { to } : {}) });
    apiRequest(`/super-admin/reports/margin?${params}`, { auth: true })
      .then((data) => alive && setState({ key, data, error: '' }))
      .catch((err) => alive && setState({ key, data: null, error: err.message || 'Could not load the report.' }));
    return () => {
      alive = false;
    };
  }, [key, from, to, groupBy]);

  const loading = state.key !== key;
  const { data, error } = state;
  const paid = data?.paid;
  const covered = data?.covered;
  const groupLabel = GROUP_BY.find((g) => g.id === groupBy)?.label;

  const download = () => {
    const rows = [];
    for (const [name, section] of [['Paid', paid], ['Covered', covered]]) {
      if (!section) continue;
      for (const g of section.groups) rows.push([name, g.label, ...COLUMNS.map(([k]) => g[k] ?? '')]);
      rows.push([name, 'Total', ...COLUMNS.map(([k]) => section.totals[k] ?? '')]);
    }
    exportCsv(`ncc-service-margin-${groupBy}-${from}-to-${to}`, ['Section', groupLabel, ...COLUMNS.map(([, label]) => label)], rows);
  };

  return (
    <div className={`space-y-6 ${loading && data ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          <span className="block mb-1">From</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={controlClass} />
        </label>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
          <span className="block mb-1">To</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={controlClass} />
        </label>
        <div role="group" aria-label="Group by" className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {GROUP_BY.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={groupBy === g.id}
              onClick={() => setGroupBy(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${groupBy === g.id ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-slate-500'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!paid || (paid.groups.length === 0 && !covered?.groups.length)}
          className="ml-auto px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-400 font-semibold">Loading margin report…</p>}

      {paid && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Kpi icon={IndianRupee} label="Revenue ex-GST" value={inr(paid.totals.revenue)} tone="bg-blue-50 text-[#0D47A1] border-blue-100" />
            <Kpi icon={Wallet} label="Partner payouts" value={inr(paid.totals.payouts)} tone="bg-yellow-50 text-yellow-600 border-yellow-100" />
            <Kpi icon={TrendingUp} label="Gross margin" value={inr(paid.totals.margin)} tone="bg-green-50 text-green-600 border-green-100" />
            <Kpi icon={Percent} label="Margin %" value={pct(paid.totals.marginPercent)} tone="bg-purple-50 text-purple-600 border-purple-100" />
          </div>
          <SectionTable
            title="Paid services"
            note="Completed jobs by completion date. Revenue = booked service + on-site add-ons, after discounts, before GST. Margin = revenue − partner payouts."
            section={paid}
            groupLabel={groupLabel}
          />
        </>
      )}
      {covered && (
        <SectionTable
          title="Covered visits (warranty / AMC / extended warranty)"
          note="The customer paid nothing for these; the partner payout is NCC's cost, recoverable from the brand or plan."
          section={covered}
          groupLabel={groupLabel}
        />
      )}
    </div>
  );
}
