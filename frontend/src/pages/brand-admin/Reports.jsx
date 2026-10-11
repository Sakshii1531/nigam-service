import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { apiRequest, apiDownload } from '../../lib/apiClient';
const REPORT_NAMES = {
  'state-city-billing': 'State / City billing',
  source: 'Complaint sources',
  product: 'Products and repeat complaints',
  sla: 'SLA performance',
  'resolution-time': 'Resolution time',
  warranty: 'Warranty and decisions',
  billing: 'Monthly billing',
  'partner-performance': 'Partner performance'
};
const field = 'border border-slate-300 rounded-lg px-3 py-2 w-full text-sm bg-white';
const money = n => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
}).format(n || 0);
const format = (value, column) => value == null ? '—' : column.type === 'money' ? money(value) : column.type === 'rates' ? (value || []).map(r => `${money(r.amount)} × ${r.calls}`).join('; ') : column.type === 'hours' ? `${Number(value).toFixed(2)} h` : column.type === 'percent' ? `${value}%` : typeof value === 'number' ? Number(value.toFixed(2)).toLocaleString('en-IN') : value;
function Chart({
  report,
  data
}) {
  const measure = {
    'state-city-billing': 'total',
    source: 'tickets',
    product: 'tickets',
    sla: 'breached',
    'resolution-time': 'avgHours',
    warranty: 'tickets',
    billing: 'pending',
    'partner-performance': 'jobs'
  }[report];
  const col = data.columns.find(c => c.key === measure);
  const rows = data.rows.slice(0, 12);
  const max = Math.max(1, ...rows.map(r => r[measure] || 0));
  if (!rows.length) return null;
  return <section className="bg-white border rounded-xl p-5" aria-label={`${col.label} chart`}><h2 className="font-semibold mb-4">{col.label} by {report === 'state-city-billing' ? 'state / city' : data.columns[0].label.toLowerCase()}{data.rows.length > 12 ? ' (first 12 rows)' : ''}</h2><div className="space-y-3">{rows.map((r, i) => <div key={i} className="grid grid-cols-[180px_1fr_130px] gap-3 items-center text-sm"><span>{report === 'state-city-billing' ? `${r.state} / ${r.city}` : report === 'warranty' ? `${r.dimension}: ${r.value}` : report === 'product' ? `${r.category} / ${r.productType}` : report === 'resolution-time' ? `${r.category} / ${r.city}` : r[data.columns[0].key]}</span><div className="h-4 bg-slate-100 rounded"><div className="h-full bg-blue-700 rounded" style={{
            width: `${Math.max(0, (r[measure] || 0) / max * 100)}%`
          }} /></div><span className="text-right tabular-nums">{format(r[measure], col)}</span></div>)}</div></section>;
}
export default function Reports() {
  const [params, setParams] = useSearchParams();
  const [expanded, setExpanded] = useState(new Set());
  const [exporting, setExporting] = useState(false),
    [error, setError] = useState('');
  const {
    can
  } = useBrandPermissions();
  const report = REPORT_NAMES[params.get('report')] ? params.get('report') : 'state-city-billing';
  const query = new URLSearchParams(params);
  query.delete('report');
  const options = useApiData(() => apiRequest('/brand/reports/options', {
    auth: true
  }), [], {
    initial: {}
  });
  const requestKey = `${report}?${query.toString()}`;
  const data = useApiData(async () => ({
    requestKey,
    result: await apiRequest(`/brand/reports/${report}${query.size ? `?${query}` : ''}`, {
      auth: true
    })
  }), [requestKey], {
    initial: null
  });
  const o = options.data || {},
    r = data.data?.requestKey === requestKey ? data.data.result : null;
  const setFilter = (key, value) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      value ? next.set(key, value) : next.delete(key);
      if (key === 'state') next.delete('city');
      if (key === 'city' && value) {
        const selectedCity = (o.cities || []).find(city => city.name === value);
        if (selectedCity?.state) next.set('state', selectedCity.state);
      }
      if (key === 'categoryKey') next.delete('productType');
      if (key === 'report') next.delete('status');
      return next;
    });
  };
  const preset = value => {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.delete('from');
      next.delete('to');
      if (value !== 'all') {
        const end = new Date();
        end.setUTCHours(0, 0, 0, 0);
        end.setUTCDate(end.getUTCDate() + 1);
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - (value === '7' ? 7 : 30));
        if (value === 'month') start.setUTCFullYear(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
        next.set('from', start.toISOString().slice(0, 10));
        next.set('to', end.toISOString().slice(0, 10));
      }
      return next;
    });
  };
  const download = async extension => {
    setExporting(true);
    setError('');
    try {
      const p = new URLSearchParams(query);
      p.set('format', extension);
      const blob = await apiDownload(`/brand/reports/${report}?${p}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${o.ticketPrefix || 'BRAND'}-${report}-${params.get('from') || 'all'}-${params.get('to') || 'all'}.${extension}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };
  const isBilling = ['state-city-billing', 'billing'].includes(report);
  const selectedCategory = (o.categories || []).find(c => c.key === params.get('categoryKey'));
  const select = (key, label, values) => <label className="text-xs" key={key}>{label}<select aria-label={label} className={field} value={params.get(key) || ''} onChange={e => setFilter(key, e.target.value)}><option value="">All</option>{values.map(v => <option key={v.value || v} value={v.value || v}>{v.label || v}</option>)}</select></label>;
  return <div className="min-h-screen bg-slate-50 flex"><Sidebar /><main className="ml-64 flex-1 min-w-0"><Topbar title="Reports & Analytics" subtitle="Brand ticket performance and reconciled billing" /><div className="p-6 space-y-5">
    <div className="flex flex-wrap items-end gap-3"><label className="font-semibold flex-1 max-w-lg">Report<select aria-label="Report" className={field} value={report} onChange={e => setFilter('report', e.target.value)}>{Object.entries(REPORT_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>{can('reports:export') && <><button disabled={exporting || !r || data.loading} onClick={() => download('csv')} className="bg-blue-800 text-white px-4 py-2 rounded-lg">Export CSV</button><button disabled={exporting || !r || data.loading} onClick={() => download('xlsx')} className="border border-blue-800 text-blue-800 px-4 py-2 rounded-lg bg-white">Export Excel</button></>}</div>
    <section className="bg-white border rounded-xl p-4 grid grid-cols-2 xl:grid-cols-5 gap-3" aria-label="Report filters"><label className="text-xs">Date preset<select aria-label="Date preset" defaultValue="custom" className={field} onChange={e => preset(e.target.value)}><option value="custom" disabled>Custom / URL dates</option><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option></select></label>{['from', 'to'].map(k => <label key={k} className="text-xs">{k === 'from' ? 'From date' : 'Before date (exclusive)'}<input aria-label={k === 'from' ? 'From date' : 'Before date (exclusive)'} type="date" className={field} value={params.get(k) || ''} onChange={e => setFilter(k, e.target.value)} /></label>)}
      {select('state', 'State', [...new Set((o.cities || []).map(c => c.state).filter(Boolean))])}
      {select('city', 'City', [...new Set((o.cities || []).filter(c => !params.get('state') || c.state === params.get('state')).map(c => c.name))])}
      {select('categoryKey', 'Service category', (o.categories || []).map(c => ({
            value: c.key,
            label: c.name
          })))}
      {select('serviceType', 'Service type', o.serviceTypes || [])}
      {select('productType', 'Product type', (o.productTypes || []).filter(p => !selectedCategory || String(p.category) === String(selectedCategory._id)).map(p => ({
            value: p._id,
            label: p.name
          })))}
      {select('status', isBilling ? 'Line status' : 'Ticket status', isBilling ? o.lineStatuses || [] : o.ticketStatuses || [])}
      {select('source', 'Source', o.sources || [])}
    </section>
    {(error || data.error || options.error) && <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{error || data.error?.message || options.error?.message}</p>}
    {(data.loading || !r && !data.error) && <div role="status" aria-label="Loading report" className="space-y-3 animate-pulse"><div className="h-12 bg-slate-200 rounded" /><div className="h-48 bg-slate-200 rounded" /></div>}
    {r && !data.loading && <>
      {r.totals && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(r.totals).map(([key, value]) => <div key={key} className="bg-white border rounded-xl p-4"><p className="text-sm capitalize text-slate-500">{key}</p><p data-testid={`report-${key}`} className="text-xl font-bold">{key === 'calls' ? value : money(value)}</p></div>)}</div>}
      <section className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left p-4 font-semibold">{REPORT_NAMES[report]}</caption><thead className="bg-slate-100"><tr>{r.columns.map(c => <th key={c.key} scope="col" className="p-3 whitespace-nowrap">{c.label}</th>)}</tr></thead><tbody>
        {report === 'state-city-billing' ? (r.states || []).map(state => <StateRows key={state.state} state={state} data={r} expanded={expanded.has(state.state)} toggle={() => setExpanded(prev => {
                  const next = new Set(prev);
                  next.has(state.state) ? next.delete(state.state) : next.add(state.state);
                  return next;
                })} />) : r.rows.map((row, i) => <tr key={i} className="border-t">{r.columns.map(c => <td key={c.key} className="p-3">{format(row[c.key], c)}</td>)}</tr>)}
      </tbody>{r.totals && r.rows.length > 0 && <tfoot className="bg-slate-100 font-semibold"><tr>{r.columns.map(c => <td key={c.key} className="p-3">{c.key === 'state' ? 'Grand total' : r.totals[c.key] != null ? format(r.totals[c.key], c) : ''}</td>)}</tr></tfoot>}</table>{!r.rows.length && <p className="p-8 text-slate-500">No records match these filters. Try a wider date range.</p>}</section>
      {!!r.rows.length && <Chart report={report} data={r} />}
      {(r.note || r.percentileMethod) && <p className="text-xs text-slate-500">{r.note || r.percentileMethod}</p>}
    </>}
  </div></main></div>;
}
function StateRows({
  state,
  data,
  expanded,
  toggle
}) {
  return <><tr className="bg-blue-50 border-t font-semibold">{data.columns.map(c => <td className="p-3" key={c.key}>{c.key === 'state' ? <button aria-expanded={expanded} onClick={toggle} className="text-blue-900">{expanded ? '▾' : '▸'} {state.state}</button> : state[c.key] != null ? format(state[c.key], c) : ''}</td>)}</tr>{expanded && data.rows.filter(r => r.state === state.state).map(row => <tr key={row.city} className="border-t">{data.columns.map(c => <td key={c.key} className="p-3">{format(row[c.key], c)}</td>)}</tr>)}</>;
}
