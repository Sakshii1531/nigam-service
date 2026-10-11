import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, IndianRupee, Package, ArrowUpRight, Plus, Truck, BarChart2 } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { useBrandDashboardLive } from '../../hooks/useBrandDashboardLive';
import { apiRequest } from '../../lib/apiClient';
const money = v => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
}).format(v || 0);
const count = v => Number(v || 0).toLocaleString('en-IN');
const panel = 'bg-white rounded-2xl border border-[#E2E8F0] p-4';
const field = 'border rounded-lg px-3 py-2 text-sm bg-white';
const definitions = [['total', 'Total Complaints', ClipboardList, 'blue'], ['pendingApproval', 'Pending Approval', Clock, 'orange'], ['approved', 'Approved', CheckCircle2, 'green'], ['assigned', 'Assigned', Truck, 'blue'], ['inProgress', 'In Progress', Clock, 'orange'], ['completed', 'Completed', CheckCircle2, 'green'], ['escalated', 'Escalated', AlertTriangle, 'red'], ['slaBreached', 'SLA Breached', AlertTriangle, 'red'], ['totalBilling', 'Total Billing', IndianRupee, 'purple'], ['pendingPayment', 'Pending Payment', IndianRupee, 'red'], ['unbilled', 'Unbilled', Package, 'teal']];
const colors = {
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500'
};
function Card({
  name,
  title,
  Icon,
  color,
  kpi,
  financial,
  canOpen
}) {
  const body = <><span className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center text-white mb-3`}><Icon size={18} /></span><span className="block text-[11px] font-semibold text-slate-500">{title}</span><strong data-testid={`dashboard-${name}`} className="block text-xl font-black text-slate-800">{financial ? money(kpi.value) : count(kpi.value)}</strong><span className="block text-xs text-slate-500 mt-2">{kpi.deltaPct == null ? 'No prior baseline' : `${kpi.deltaPct > 0 ? '+' : ''}${kpi.deltaPct}% vs previous period`} · previous {financial ? money(kpi.previous) : count(kpi.previous)}</span>{canOpen && <span className="flex gap-1 items-center text-blue-800 text-[10px] font-semibold mt-2">View details <ArrowUpRight size={10} /></span>}</>;
  return canOpen ? <Link aria-label={title} to={kpi.link} className={`${panel} hover:shadow-lg transition-shadow`}>{body}</Link> : <div className={panel}>{body}</div>;
}
function Bars({
  title,
  rows,
  link
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return <section className={panel} aria-label={title}><h2 className="font-bold text-sm mb-4">{title}</h2>{!rows.length ? <p className="text-sm text-slate-500">No tickets in this range.</p> : <div className="space-y-3">{rows.map((r, i) => <div key={`${r.name}-${i}`}><div className="flex justify-between text-xs mb-1">{link ? <Link className="text-blue-800" to={link(r)}>{r.name.replaceAll('_', ' ')}</Link> : <span>{r.name.replaceAll('_', ' ')}</span>}<span>{count(r.value)}{r.pct != null ? ` (${r.pct}%)` : ''}</span></div><div className="bg-slate-100 rounded h-2"><div className="bg-blue-600 rounded h-2" style={{
            width: `${r.value / max * 100}%`
          }} /></div></div>)}</div>}</section>;
}
function Trend({
  rows,
  unit
}) {
  const max = Math.max(1, ...rows.flatMap(r => [r.created, r.closed]));
  const points = key => rows.map((r, i) => `${rows.length > 1 ? i / (rows.length - 1) * 500 : 250},${90 - r[key] / max * 80}`).join(' ');
  return <section className={`${panel} lg:col-span-2`} aria-label="Complaints trend"><h2 className="font-bold text-sm">Complaints Trend</h2><p className="text-xs text-slate-500 my-2">Created (blue) · Closed (green) · per {unit} · UTC</p><svg role="img" aria-label="Tickets created and closed" viewBox="0 0 500 100" className="w-full h-36" preserveAspectRatio="none">{rows.length > 0 && <><polyline points={points('created')} fill="none" stroke="#3B82F6" strokeWidth="2" /><polyline points={points('closed')} fill="none" stroke="#16A34A" strokeWidth="2" />{rows.map((r, i) => <g key={r.date}><title>{r.date}: {r.created} created, {r.closed} closed</title><circle cx={rows.length > 1 ? i / (rows.length - 1) * 500 : 250} cy={90 - r.created / max * 80} r="2" fill="#3B82F6" /><circle cx={rows.length > 1 ? i / (rows.length - 1) * 500 : 250} cy={90 - r.closed / max * 80} r="2" fill="#16A34A" /></g>)}</>}</svg><div className="flex justify-between text-xs text-slate-500"><span>{rows[0]?.date}</span><span>{rows.at(-1)?.date}</span></div><details className="text-xs mt-3"><summary className="cursor-pointer text-blue-800">View trend data</summary><div className="max-h-48 overflow-auto"><table className="w-full"><thead><tr><th>Date</th><th>Created</th><th>Closed</th></tr></thead><tbody>{rows.map(r => <tr key={r.date}><th>{r.date}</th><td>{r.created}</td><td>{r.closed}</td></tr>)}</tbody></table></div></details></section>;
}
function Sla({
  snapshot,
  link
}) {
  const segments = [['onTrack', 'On track', '#22C55E'], ['warning', 'Warning', '#F59E0B'], ['breached', 'Breached', '#EF4444']];
  const total = Object.values(snapshot).reduce((a, b) => a + b, 0);
  let offset = 0;
  return <section className={panel} aria-label="SLA snapshot"><h2 className="font-bold text-sm mb-3">SLA Snapshot · Open tickets</h2><div className="flex items-center gap-6"><svg role="img" aria-label={`${total} open tickets`} viewBox="0 0 100 100" className="w-28 h-28 -rotate-90"><circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="12" />{segments.map(([key, label, color]) => {
          const length = total ? snapshot[key] / total * 251.327 : 0;
          const at = offset;
          offset += length;
          return <circle key={key} cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${length} 251.327`} strokeDashoffset={-at}><title>{label}: {snapshot[key]}</title></circle>;
        })}</svg><div className="space-y-3 text-xs">{segments.map(([key, label, color]) => <p key={key}><span className="inline-block w-2 h-2 rounded-full mr-2" style={{
            background: color
          }} />{label}: <strong>{count(snapshot[key])}</strong></p>)}</div></div>{link && <Link className="block text-xs text-blue-800 mt-3" to={link}>View breached tickets</Link>}</section>;
}
export default function Dashboard() {
  const [params, setParams] = useSearchParams(),
    [preset, setPreset] = useState('custom');
  const {
    can,
    canOpen
  } = useBrandPermissions();
  const query = new URLSearchParams();
  for (const key of ['from', 'to']) if (params.get(key)) query.set(key, params.get(key));
  const requestKey = query.toString();
  const data = useApiData(async () => ({
    key: requestKey,
    result: await apiRequest(`/brand/dashboard${requestKey ? `?${requestKey}` : ''}`, {
      auth: true
    })
  }), [requestKey], {
    initial: null
  });
  useBrandDashboardLive(data.reload);
  const d = data.data?.key === requestKey ? data.data.result : null;
  const selectPreset = value => {
    setPreset(value);
    if (value === 'custom') return;
    const now = new Date(),
      to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
      from = new Date(+to - (value === 'today' ? 1 : value === '7' ? 7 : 30) * 86400000);
    if (value === 'month') from.setUTCFullYear(now.getUTCFullYear(), now.getUTCMonth(), 1);
    setParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    });
  };
  const date = (key, value) => {
    setPreset('custom');
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  const ticketLink = extra => `/brand-admin/tickets?${new URLSearchParams({
    from: d.period.from.slice(0, 10),
    to: new Date(new Date(d.period.to) - 1).toISOString().slice(0, 10),
    ...extra
  })}`;
  return <div className="min-h-screen bg-[#F1F5F9] flex"><Sidebar /><main className="ml-64 flex-1 min-w-0"><Topbar title="Brand Dashboard" subtitle="Live complaint, service and billing performance" /><div className="p-5 space-y-5">
    <div className={`${panel} flex gap-4 flex-wrap items-end`}><label className="text-xs">Date range<select aria-label="Dashboard date range" className={`${field} block mt-1`} value={preset} onChange={e => selectPreset(e.target.value)}><option value="custom">Custom / Default 7 days</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option></select></label>{['from', 'to'].map(key => <label key={key} className="text-xs">{key === 'from' ? 'From date' : 'Before date (exclusive)'}<input aria-label={key === 'from' ? 'Dashboard from date' : 'Dashboard before date'} type="date" className={`${field} block mt-1`} value={params.get(key) || ''} onChange={e => date(key, e.target.value)} /></label>)}<button className="text-blue-800 text-sm" onClick={data.reload}>Refresh</button>{d && <p className="text-xs text-slate-500">{d.period.from.slice(0, 10)} → {d.period.to.slice(0, 10)} (exclusive, UTC)</p>}</div>
    {data.error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl">{data.error.message}</p>}
    {!d && !data.error && <div role="status" aria-label="Loading dashboard" className="grid grid-cols-3 gap-4 animate-pulse">{definitions.map(([key]) => <div key={key} className="h-36 bg-slate-200 rounded-2xl" />)}</div>}
    {d && <><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">{definitions.filter(([name]) => d.kpis[name] && (!['totalBilling', 'pendingPayment', 'unbilled'].includes(name) || can('billing:view'))).map(([name, title, Icon, color]) => <Card key={name} name={name} title={title} Icon={Icon} color={color} kpi={d.kpis[name]} financial={['totalBilling', 'pendingPayment', 'unbilled'].includes(name)} canOpen={!!d.kpis[name].link && canOpen(d.kpis[name].link.split('?')[0])} />)}</div>
      {d.queues && <section className={`${panel} flex items-center gap-5 flex-wrap`} aria-label="My work"><h2 className="font-bold text-sm">My Work</h2>{Object.entries(d.queues).map(([key, value]) => <Link key={key} className="text-xs text-blue-800" to="/brand-admin/my-work">{{
                assigned: 'Assigned to me',
                contacts: 'Contact requests',
                callbacks: 'Callbacks today',
                awaitingCustomer: 'Awaiting customer'
              }[key]}: <strong>{count(value)}</strong></Link>)}</section>}
      <div className="grid lg:grid-cols-3 gap-4"><Trend rows={d.trend} unit={d.period.unit} /><Sla snapshot={d.slaSnapshot} link={can('tickets:view') ? d.kpis.slaBreached.link : null} /></div>
      <div className="grid lg:grid-cols-3 gap-4"><Bars title="Complaint Sources" rows={d.bySource} link={can('tickets:view') ? r => ticketLink({
              source: r.name
            }) : null} /><Bars title="Product Wise Complaints" rows={d.byProduct} link={can('tickets:view') ? r => ticketLink({
              categoryKey: r.categoryKey
            }) : null} /><Bars title="Complaints by State" rows={d.byState} link={can('tickets:view') ? r => ticketLink({
              state: r.state
            }) : null} /></div>
      <div className="grid lg:grid-cols-12 gap-4">{d.recent && <section className={`${panel} ${d.billing ? 'lg:col-span-5' : 'lg:col-span-8'} overflow-x-auto`}><h2 className="font-bold text-sm mb-3">Recent Complaints</h2><table className="w-full text-xs text-left"><thead><tr>{['Ticket', 'Product', 'Status', 'Raised'].map(v => <th className="p-2" key={v}>{v}</th>)}</tr></thead><tbody>{d.recent.map(r => <tr key={r.id} className="border-t"><td className="p-2"><Link className="text-blue-800" to={`/brand-admin/tickets/${r.id}`}>{r.humanId}</Link><p>{r.brandTicketNo}</p></td><td className="p-2">{r.productName || r.categoryKey}</td><td className="p-2">{r.status}</td><td className="p-2">{new Date(r.createdAt).toLocaleString('en-IN')}</td></tr>)}</tbody></table>{!d.recent.length && <p className="text-sm text-slate-500 p-3">No complaints in this range.</p>}</section>}
        {d.parts && <section className={`${panel} lg:col-span-4`}><h2 className="font-bold text-sm mb-4">Spare Parts Overview</h2>{[['awaitingApproval', 'Awaiting brand approval'], ['inTransit', 'In transit'], ['installed', 'Installed in range']].map(([key, label]) => <p key={key} className="flex justify-between text-xs py-3 border-b"><span>{label}</span><strong>{count(d.parts[key])}</strong></p>)}<Link className="text-xs text-blue-800 block mt-3" to="/brand-admin/part-requests">View parts</Link></section>}
        {d.billing && can('billing:view') && <section className={`${panel} lg:col-span-3`}><h2 className="font-bold text-sm mb-4">Financial Overview</h2>{[['invoiceValue', 'Invoiced'], ['paid', 'Paid'], ['pending', 'Pending'], ['overdue', 'Overdue'], ['unbilledAmount', 'Unbilled']].map(([key, label]) => <p key={key} className="flex justify-between text-xs py-3 border-b"><span>{label}</span><strong>{money(d.billing[key])}</strong></p>)}</section>}
      </div>
      <section className={panel}><h2 className="font-bold text-sm mb-4">Quick Actions</h2><div className="flex gap-4 flex-wrap">{[['tickets:create', '/brand-admin/requests', 'Register Complaint', Plus], ['parts:approve', '/brand-admin/part-requests', 'Review Parts', Package], ['reports:view', '/brand-admin/reports', 'View Reports', BarChart2], ['billing:view', '/brand-admin/invoices', 'View Billing', IndianRupee]].filter(([permission]) => can(permission)).map(([, path, label, Icon]) => <Link key={path} className="flex items-center gap-2 text-xs text-blue-800" to={path}><Icon size={16} />{label}</Link>)}</div></section>
      <p className="text-xs text-slate-500">{d.note}</p>
    </>}
  </div></main></div>;
}
