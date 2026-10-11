import { formatDateTime, formatVisit } from '../../lib/partnerWarrantyFormat';
import { resolveMediaUrl } from '../../lib/apiClient';
const label = s => s?.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export default function JobStagePanel({ job }) {
  if (!job) return <p className="text-xs text-slate-500">Created by NCC as soon as you approve.</p>;
  return <div className="space-y-3 text-xs">
    <p className="font-mono font-bold">{job.nccJobId}</p>
    <p data-testid="job-stage" className={`font-bold ${job.jobStage === 'ALLOCATION_FAILED' ? 'text-red-700' : 'text-blue-900'}`}>{label(job.jobStage) || 'Being assigned'}</p>
    {job.allocation.failed && <p role="status" className="text-red-700">NCC is assigning manually</p>}
    <ol className="grid grid-cols-2 gap-2">{job.stages?.filter(s => s.stage !== 'CANCELLED').map(s => <li key={s.stage} aria-current={s.stage === job.jobStage ? 'step' : undefined} className={`border rounded-lg p-2 ${s.stage === job.jobStage ? 'bg-blue-50 border-blue-500' : 'border-slate-100'}`}><p className="font-semibold">{label(s.stage)}</p><p className="text-[10px] text-slate-500">{s.at ? formatDateTime(s.at) : '—'}</p></li>)}</ol>
    {job.partner ? <div className="bg-slate-50 rounded-xl p-3">{job.partner.photo && <img src={resolveMediaUrl(job.partner.photo)} alt="" className="h-12 w-12 rounded-full object-cover mb-2"/>}<p className="font-bold">{job.partner.name}</p><p>{job.partner.phone || 'Phone unavailable'}</p><p>Rating: {job.partner.rating || 'Not rated'}</p></div> : <p className="text-slate-500">Partner details appear after acceptance.</p>}
    <p>Visit: {formatVisit(job.visit) || 'Not scheduled'}</p>
    <details><summary className="cursor-pointer font-semibold">Allocation attempts ({job.allocation.attempts.length})</summary><ol className="mt-2 space-y-2">{job.allocation.attempts.map(a => <li key={a.id}><p>{a.partner.name} · {a.outcome}</p><p className="text-slate-500">{formatDateTime(a.offeredAt)}{a.reason ? ` · ${a.reason}` : ''}</p></li>)}</ol></details>
  </div>;
}
