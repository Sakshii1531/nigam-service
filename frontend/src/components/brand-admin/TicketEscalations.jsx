import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';

const date = v => v ? new Date(v).toLocaleString() : '—';
function download(rows) {
  const cells = v => `"${String(v ?? '').replace(/"/g, '""').replace(/^[=+@-]/, "'$&")}"`;
  const content = [['Ticket', 'Reason', 'Stage', 'Level', 'Priority', 'Responsible', 'Due', 'Status', 'Resolution'],
    ...rows.map(e => [e.warrantyClaim?.humanId || e.serviceRequest?.humanId, e.reason, e.slaStage, e.level, e.priority, e.responsible?.user?.name, e.dueAt, e.status, e.resolution])].map(row => row.map(cells).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'escalations.csv'; a.click(); URL.revokeObjectURL(url);
}
export default function TicketEscalations({ ticketId }) {
  const { can } = useBrandPermissions();
  const [search] = useSearchParams();
  const [tab, setTab] = useState('open'), [level, setLevel] = useState(''), [stage, setStage] = useState(''), [mine, setMine] = useState(false);
  const [selected, setSelected] = useState(null), [resolution, setResolution] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [page, setPage] = useState(1);
  const params = new URLSearchParams({ status: tab === 'Resolved' ? 'Resolved' : 'open', limit: '25', page: String(page) });
  if (tab === 'Overdue') params.set('overdue', 'true');
  if (!ticketId) for (const key of ['from','to']) if (search.get(key)) params.set(key,search.get(key));
  if (ticketId) params.set('warrantyClaim', ticketId);
  if (level) params.set('level', level);
  if (stage) params.set('stage', stage);
  if (mine) params.set('responsible', 'me');
  const query = params.toString();
  const result = useApiData(() => apiRequest(`/brand/escalations?${query}`, { auth: true, envelope: true }), [query]);
  useWarrantyClaimLive(result.reload, null, 'brand_admin');
  const staff = useApiData(() => apiRequest('/brand/escalations/assignees', { auth: true }), [], { enabled: can('escalations:manage'), initial: [] });
  async function mutate(path, body, method = 'POST') {
    setError(''); setBusy(true);
    try {
      await apiRequest(`/brand/escalations${path}`, { auth: true, method, body });
      setSelected(null); setResolution(''); setReason(''); await result.reload();
      window.dispatchEvent(new Event('brand:escalations-changed'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function exportAll() {
    setBusy(true); setError('');
    try {
      const rows = [];
      for (let pg = 1; ; pg++) {
        const p = new URLSearchParams(query); p.set('page', String(pg)); p.set('limit', '100');
        const data = await apiRequest(`/brand/escalations?${p}`, { auth: true, envelope: true });
        rows.push(...data.data);
        if (rows.length >= data.meta.total || !data.data.length) break;
      }
      download(rows);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="space-y-3" aria-label="Ticket escalations">
    <div className="flex gap-2 flex-wrap">{['open', 'Overdue', 'Resolved'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-lg px-3 py-2 text-xs ${tab === t ? 'bg-blue-900 text-white' : 'bg-slate-100'}`}>{t === 'open' ? 'Open' : t}</button>)}<button className="text-xs underline" onClick={exportAll} disabled={busy}>Export CSV</button><button className="text-xs underline" onClick={result.reload}>Refresh escalations</button></div>
    <div className="flex gap-3 flex-wrap text-xs">
      <label>Level <select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}><option value="">All</option>{[1, 2, 3].map(l => <option key={l}>{l}</option>)}</select></label>
      <label>Stage <select value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}><option value="">All</option>{['response','brandApproval','assignment','visit','resolution','manual'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label><input type="checkbox" checked={mine} onChange={e => { setMine(e.target.checked); setPage(1); }}/> Assigned to me</label>
    </div>
    {(error || result.error) && <p role="alert" className="text-red-700 text-xs">{error || result.error.message}</p>}
    {result.loading && <p>Loading escalations…</p>}
    <div className="overflow-auto"><table className="w-full text-xs text-left"><thead><tr>{['Ticket','Reason','Stage','Level','Priority','Responsible','Due','Status','Actions'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{result.data?.data.map(e => <tr key={e.id} className="border-t">
      <td className="p-2">{e.warrantyClaim ? <Link className="text-blue-900 underline" to={`/brand-admin/tickets/${e.warrantyClaim.id || e.warrantyClaim._id}`}>{e.warrantyClaim.humanId}</Link> : e.serviceRequest?.humanId || '—'}</td>
      <td className="p-2">{e.reason}{e.resolution && <p className="text-green-700">{e.resolution} · {e.resolvedBy?.name} · {date(e.resolvedAt)}</p>}</td><td className="p-2">{e.slaStage || 'manual'}</td><td className="p-2">L{e.level}</td><td className="p-2">{e.priority}</td>
      <td className="p-2">{can('escalations:manage') && e.status !== 'Resolved' ? <select aria-label={`Responsible for ${e.reason}`} value={e.responsible?.user?.id || e.responsible?.user?._id || ''} disabled={busy} onChange={v => mutate(`/${e.id}`, { responsibleUserId: v.target.value || null }, 'PATCH')}><option value="">Unassigned</option>{staff.data?.map(u => <option key={u.id} value={u.id}>{u.name}{u.employeeId ? ` (${u.employeeId})` : ''}</option>)}</select> : e.responsible?.user?.name || 'Unassigned'}</td>
      <td className={`p-2 ${e.status !== 'Resolved' && new Date(e.dueAt) < new Date() ? 'text-red-700' : ''}`}>{date(e.dueAt)}</td><td className="p-2">{e.status}</td><td className="p-2">{can('escalations:manage') && e.status !== 'Resolved' && <button disabled={busy} onClick={() => setSelected(e)} className="text-blue-900 underline">Resolve</button>}</td>
    </tr>)}</tbody></table></div>
    {!result.loading && !result.data?.data.length && <p className="text-xs text-slate-500">No escalations found.</p>}
    <div className="flex gap-3 text-xs"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} · {result.data?.meta.total || 0} records</span><button disabled={page * 25 >= (result.data?.meta.total || 0)} onClick={() => setPage(page + 1)}>Next</button></div>
    {ticketId && can('escalations:manage') && <form onSubmit={e => { e.preventDefault(); mutate('', { warrantyClaim: ticketId, reason }); }} className="flex gap-2 text-xs"><label className="flex-1">Escalation reason<input required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="border rounded p-2 w-full"/></label><button disabled={busy} className="text-blue-900 underline">Raise escalation</button></form>}
    {selected && <div role="dialog" aria-modal="true" aria-label="Resolve escalation" className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5"><form className="bg-white p-6 rounded-xl max-w-lg w-full space-y-3" onSubmit={e => { e.preventDefault(); mutate(`/${selected.id}/resolve`, { resolution }); }}><h3 className="font-bold">Resolve escalation</h3><p className="text-xs">{selected.reason}</p><label className="text-xs block">Resolution<textarea required minLength={10} maxLength={2000} value={resolution} onChange={e => setResolution(e.target.value)} className="border rounded w-full p-2"/></label>{error && <p role="alert">{error}</p>}<button disabled={busy} className="bg-blue-900 text-white rounded p-2 text-xs">Confirm resolution</button><button type="button" onClick={() => { setSelected(null); setError(''); }} className="ml-3 text-xs">Cancel</button></form></div>}
  </div>;
}
