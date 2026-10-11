import { useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
const labels = { responseHours: 'Response', approvalHours: 'Approval', assignmentHours: 'Allocation', visitHours: 'First visit', resolutionHours: 'Resolution' };
function Editor({ initial, config }) {
  const [sla, setSla] = useState(initial), [matrix, setMatrix] = useState(config.matrix), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function save(path, body) {
    setError(''); setMessage(''); setBusy(true);
    try { await apiRequest('/brand/settings/' + path, { auth: true, method: 'PUT', body }); setMessage(path === 'sla' ? 'SLA settings saved. New tickets use these targets.' : 'Escalation matrix saved.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    <form onSubmit={e => { e.preventDefault(); save('sla', sla); }} className="space-y-4">
      <h2 className="font-bold">SLA targets</h2><p className="text-xs text-slate-500">Targets apply to new tickets. A priority change adjusts the existing ticket's remaining deadline using its original target.</p>
      <div className="grid grid-cols-2 gap-3">{Object.entries(labels).map(([key, label]) => <label key={key} className="text-xs">{label} hours<input className="border rounded p-2 block w-full" type="number" min="0.05" max="8760" step="0.05" required value={sla[key]} onChange={e => setSla({ ...sla, [key]: Number(e.target.value) })}/></label>)}</div>
      <h3 className="font-semibold text-sm">Priority factors</h3><div className="grid grid-cols-2 gap-3">{Object.keys(sla.priorityFactor).map(key => <label key={key} className="text-xs">{key} factor<input className="border rounded p-2 block w-full" type="number" min="0.1" max="5" step="0.05" required value={sla.priorityFactor[key]} onChange={e => setSla({ ...sla, priorityFactor: { ...sla.priorityFactor, [key]: Number(e.target.value) } })}/></label>)}</div><button disabled={busy} className="bg-blue-900 text-white rounded p-2 text-xs">Save SLA targets</button>
    </form>
    <form onSubmit={e => { e.preventDefault(); save('escalation-matrix', matrix); }} className="space-y-4 border-t pt-4">
      <h2 className="font-bold">Escalation matrix</h2>{['warning','breach'].map(key => <div key={key} className="flex gap-3"><label className="text-xs flex-1">{key === 'warning' ? 'Warning role' : 'Breach role'}<select className="border rounded p-2 block w-full" value={matrix[key].role} onChange={e => setMatrix({ ...matrix, [key]: { ...matrix[key], role: e.target.value } })}>{config.roles.map(r => <option key={r.id} value={r.template || r.id}>{r.name}</option>)}</select></label><label className="text-xs">{key === 'warning' ? 'Warning level' : 'Breach level'}<input className="border rounded p-2 block w-20" type="number" min="1" max="3" required value={matrix[key].level} onChange={e => setMatrix({ ...matrix, [key]: { ...matrix[key], level: Number(e.target.value) } })}/></label></div>)}
      <label className="text-xs block"><input type="checkbox" checked={matrix.breach.platform} onChange={e => setMatrix({ ...matrix, breach: { ...matrix.breach, platform: e.target.checked } })}/> Notify NCC and create a platform escalation on breach</label>
      <label className="text-xs block">Escalation response hours<input className="border rounded p-2 block" type="number" min="0.05" max="8760" step="0.05" required value={matrix.escalationResponseHours} onChange={e => setMatrix({ ...matrix, escalationResponseHours: Number(e.target.value) })}/></label><button disabled={busy} className="bg-blue-900 text-white rounded p-2 text-xs">Save escalation matrix</button>
    </form>
  </div>;
}
export default function SlaSettings() {
  const result = useApiData(() => Promise.all([apiRequest('/brand/settings/sla', { auth: true }), apiRequest('/brand/settings/escalation-matrix', { auth: true })]), []);
  return result.error ? <p role="alert">{result.error.message}</p> : result.data ? <Editor initial={result.data[0]} config={result.data[1]}/> : <p>Loading SLA settings…</p>;
}
