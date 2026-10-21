import AuditEntries from '../../components/brand-admin/AuditEntries';
import TicketEscalations from '../../components/brand-admin/TicketEscalations';
import TicketParts from '../../components/brand-admin/TicketParts';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Copy, FileText, X, MessageSquare, Briefcase, Wrench, Package, Clock, Receipt, StickyNote } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import TicketCommunication from '../../components/brand-admin/TicketCommunication';
import JobStagePanel from '../../components/brand-admin/JobStagePanel';
import TicketActions from '../../components/brand-admin/TicketActions';
import WarrantyBadge from '../../components/brand-admin/WarrantyBadge';
import WarrantyOverride from '../../components/brand-admin/WarrantyOverride';
import { useApiData } from '../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { brandWarrantyApi, DECIDABLE } from '../../lib/brandWarrantyApi';
import { DOCUMENT_LABELS } from '../../lib/partnerWarrantyApi';
import { formatDateTime, formatVisit } from '../../lib/partnerWarrantyFormat';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';

const activityIcons={communication:MessageSquare,status:Briefcase,job:Wrench,parts:Package,sla:Clock,billing:Receipt,notes:StickyNote};
const fieldClass = 'w-full border border-slate-200 rounded-xl p-3 text-xs';
function Section({ title, children, id }) { return <section id={id} className="bg-white rounded-2xl border border-slate-200 p-5 break-inside-avoid"><h2 className="text-sm font-bold text-slate-700 mb-3">{title}</h2>{children}</section>; }
function KV({ label, value }) { return <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 text-xs"><span className="text-slate-500">{label}</span><span className="font-semibold text-right">{value ?? '—'}</span></div>; }
function Empty({ children }) { return <p className="text-xs text-slate-500">{children}</p>; }
const isPdf = url => /\.pdf($|\?)/i.test(url || '');
const isVideo = d => d.kind === 'video' || /\.(mp4|webm|mov)($|\?)/i.test(d.url || '');
function CopyId({ value }) {
  const [copied, setCopied] = useState(false);
  return value && <button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); }} title={`Copy ${value}`} className="inline-flex gap-1 items-center text-sm font-bold text-blue-900">{value}<Copy size={12}/>{copied && <span className="text-xs">Copied</span>}</button>;
}
export default function TicketDetail() {
  const { hash } = useLocation();
  const { id } = useParams(), { can } = useBrandPermissions();
  const res = useApiData(() => brandWarrantyApi.get(id), [id]);
  const d = res.data;
  useEffect(() => { if (d && ['#customer', '#job', '#activity'].includes(hash)) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }); }, [d, hash]);
  useWarrantyClaimLive(res.reload, d?.ticket.id || null, 'brand_admin');
  const [preview, setPreview] = useState(null), previewRef = useRef(null);
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false), [confirmRemarks, setConfirmRemarks] = useState('');
  const [type, setType] = useState(''), [page, setPage] = useState(1), [now, setNow] = useState(() => Date.now());
  const [showAudit, setShowAudit] = useState(false), [auditPage, setAuditPage] = useState(1);
  const canAudit = can('audit:view');
  const audit = useApiData(() => showAudit && canAudit ? apiRequest(`/brand/audit-logs?entityType=ticket&entityId=${id}&page=${auditPage}&limit=20`, {auth:true,envelope:true}) : Promise.resolve(null), [showAudit,canAudit,id,auditPage,d?.activity?.[0]?.id]);
  const activity = useApiData(() => apiRequest(`/brand/tickets/${id}/activity?${new URLSearchParams({ ...(type ? {type} : {}), page: String(page), limit: '20' })}`, { auth: true, envelope: true }), [id, type, page, d?.activity?.[0]?.id]);
  useEffect(() => { if (preview && previewRef.current && !previewRef.current.open) previewRef.current.showModal(); }, [preview]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  async function addNote(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await brandWarrantyApi.note(d.ticket.id, note.trim()); setNote(''); await res.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const t = d?.ticket, c = d?.complaint;
  const actionsClaim = d ? { id: t.id, status: t.status, warranty: d.warranty, serviceJob: d.job, priority: t.priority } : null;
  const next = t?.sla.stages.filter(s => s.dueAt && !s.metAt).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
  const remaining = next ? next.state === 'paused' ? next.remainingMs : new Date(next.dueAt) - now : null;
  const events = activity.data?.data || d?.activity || [];
  const activityMeta = activity.data?.meta;
  return <div className="min-h-screen bg-slate-100 flex ticket-print">
    <div className="print-hide"><Sidebar/></div>
    <main className="flex-1 ml-64 min-w-0 ticket-content">
      <div className="print-hide"><Topbar title="Ticket" subtitle={t?.humanId || 'Loading…'}/></div>
      <div className="p-5 space-y-5">
        <div className="flex justify-between print-hide"><Link to="/brand-admin/tickets" className="inline-flex items-center gap-1 text-xs text-blue-900"><ArrowLeft size={14}/>Back to Tickets</Link><button onClick={() => window.print()} className="text-xs font-bold text-blue-900">Print / Download ticket summary (PDF)</button></div>
        {(res.error || error) && <p role="alert" className="text-red-700">{res.error?.message || error}</p>}
        {res.loading && !d && <Empty>Loading ticket…</Empty>}
        {d && <>
          <Section title="Ticket"><div className="flex flex-wrap items-center gap-4"><CopyId value={t.humanId}/><CopyId value={t.brandTicketNo}/><CopyId value={d.job?.nccJobId}/><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold" data-testid="ticket-status">{t.statusLabel}</span><span className="text-xs">{t.source.replaceAll('_', ' ')} · {t.priority}</span></div>
            <p className="text-xs text-slate-500 mt-3">Submitted {formatDateTime(t.createdAt)} · Registered by {t.registeredBy?.name || 'Customer / system'} {t.registeredBy?.employeeId} · Assigned CCE: {t.assignedCce?.name || 'Unassigned'}</p>
            {next && <p className={`text-xs mt-2 ${remaining < 0 ? 'text-red-700' : 'text-slate-600'}`}>{next.label}: {next.state === 'paused' ? 'Clock paused' : `${remaining < 0 ? 'Overdue by' : 'Due in'} ${Math.floor(Math.abs(remaining) / 3600000)}h ${Math.floor(Math.abs(remaining) / 60000) % 60}m`}</p>}
            <div className="print-hide mt-4"><TicketActions claim={actionsClaim} onSaved={res.reload}/>{can('tickets:edit')&&<TicketCommunication ticket={t} complaint={c} onSaved={res.reload}/>}</div>
          </Section>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <Section id="customer" title="Customer">{d.customer ? <><KV label="Name" value={<Link to={d.customer.profileUrl} className="text-blue-900 underline">{d.customer.name}</Link>}/><KV label="Customer ID" value={d.customer.humanId}/><KV label="Phone" value={d.customer.phone}/><KV label="Alternate phone" value={d.customer.alternatePhone}/><KV label="Email" value={d.customer.email}/><KV label="Address" value={['house', 'landmark', 'city', 'state', 'pincode'].map(k => d.customer.address?.[k]).filter(Boolean).join(', ')}/></> : <Empty>Customer details are unavailable.</Empty>}</Section>
              <Section title="Product">{[['Product', d.product.name], ['Category', d.product.category], ['Product type', d.product.productType], ['Model number', d.product.modelNumber], ['Serial number', d.product.serialNumber], ['Purchase date', d.product.purchaseDate && new Date(d.product.purchaseDate).toLocaleDateString('en-IN')], ['Service type', d.product.serviceType]].map(([label, value]) => <KV key={label} label={label} value={value}/>)}</Section>
              <Section title="Warranty"><WarrantyBadge warranty={d.warranty}/>{d.warranty.overrideNote && <KV label="Verification note" value={d.warranty.overrideNote}/>}<KV label="Verified by" value={d.warranty.verifiedBy?.name}/>{can('warranty:verify') && !d.job && DECIDABLE.includes(t.status) && <div className="print-hide"><WarrantyOverride id={t.id} onSaved={res.reload}/></div>}</Section>
              <Section title="Complaint"><KV label="Issue" value={c.issueName}/><KV label="Remarks" value={c.remarks}/><KV label="Preferred visit" value={formatVisit(c.preferredVisit)}/>
                <h3 className="text-sm font-bold mt-4 mb-2">Documents ({c.documents.length})</h3>
                {!c.documents.length && <Empty>Documents appear when the customer or team uploads them.</Empty>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{c.documents.map(doc => <button key={doc.id} type="button" onClick={() => isPdf(doc.url) ? window.open(resolveMediaUrl(doc.url), '_blank', 'noopener') : setPreview(doc)} className="rounded-xl border border-slate-200 p-2 text-left"><div className="h-24 bg-slate-50 flex items-center justify-center">{isPdf(doc.url) || isVideo(doc) ? <FileText size={28}/> : <img src={resolveMediaUrl(doc.url)} alt="" className="w-full h-full object-cover"/>}</div><p className="text-xs font-bold">{DOCUMENT_LABELS[doc.kind] || doc.kind}</p><p className="text-[10px] text-slate-500">{doc.uploadedBy?.name || 'Customer'} · {formatDateTime(doc.uploadedAt)}</p></button>)}</div>
                {!!c.infoRequests.length && <h3 className="font-bold text-sm mt-4">Information requests</h3>}{c.infoRequests.map(r => <div key={r.id} className="rounded-xl border p-3 text-xs mt-2"><p>You asked: {r.message}</p><p className="text-slate-500">{formatDateTime(r.requestedAt)}</p>{r.respondedAt ? <p className="text-green-700">Customer replied: {r.response || 'Documents uploaded'}</p> : <p className="text-amber-700">Waiting for the customer…</p>}</div>)}
                {c.pendingReschedule&&<p className="text-xs mt-3" role="status">Reschedule {c.pendingReschedule.status}: {c.pendingReschedule.date} · {c.pendingReschedule.slot}</p>}
                {!!c.contactRequests.length && <h3 className="font-bold text-sm mt-4">Contact requests</h3>}{c.contactRequests.map(r => <p key={r.id} className="text-xs mt-2">{r.reason} · {r.status} · {r.outcome || 'Awaiting contact'}</p>)}
              </Section>
              <Section title="Approval">{d.approval.decision ? <><KV label="Decision" value={d.approval.decision}/><KV label="Coverage" value={d.approval.coverageDecision}/><KV label="Decided by" value={`${d.approval.by?.name || 'NCC'} ${d.approval.by?.employeeId || ''}`}/><KV label="Decision time" value={formatDateTime(d.approval.at)}/><KV label="Decision remarks" value={d.approval.remarks}/>{d.approval.rejectionCode && <KV label="Rejection code" value={d.approval.rejectionCode}/>}</> : <Empty>The brand decision appears after approval or rejection.</Empty>}{d.approval.hold && <KV label="Hold reason" value={d.approval.hold.reason}/>}</Section>
            </div>
            <div className="space-y-5">
              <Section id="job" title="NCC Job"><JobStagePanel job={d.job}/></Section>
              <Section title="Parts"><TicketParts parts={d.parts}/></Section>
              <Section title="Billing">{d.billing ? <div data-testid="ticket-billing">{d.billing.flags?.map(f=><p key={f} role="alert" className="text-amber-700 font-bold">{f}</p>)}<KV label="Service rate" value={`₹${d.billing.rate.amount.toFixed(2)}`}/><KV label="Rate rule" value={`Matched on ${d.billing.rate.matchedOn}${d.billing.rate.matchedOn==='city'?`: ${d.billing.city}`:d.billing.rate.matchedOn==='state'?`: ${d.billing.state}`:''}`}/>{d.billing.parts.map(p=><KV key={p._id} label={`${p.name} × ${p.qty}`} value={`₹${p.amount.toFixed(2)}`}/>)}{d.billing.otherCharges.map(p=><KV key={p._id} label={p.label} value={`₹${p.amount.toFixed(2)}`}/>)}<KV label="Subtotal" value={`₹${d.billing.subtotal.toFixed(2)}`}/><KV label={`GST (${d.billing.gstPercent}%)`} value={`₹${d.billing.gstAmount.toFixed(2)}`}/><KV label="Total" value={`₹${d.billing.total.toFixed(2)}`}/><KV label="Billing status" value={d.billing.status}/><KV label="Invoice" value={d.billing.invoiceNo}/>{d.billing.voidReason&&<KV label="Void reason" value={d.billing.voidReason}/>}</div> : <Empty>Billing appears once the job is completed.</Empty>}</Section>
              <Section title="Closure">{d.closure ? <><KV label="Service report" value={d.closure.serviceReport?.summary}/><KV label="Work done" value={d.closure.serviceReport?.workDone}/>{d.closure.serviceReport?.partsUsed?.map((p,i) => <p key={i} className="text-xs mt-2">{p.name} · {p.partNumber || 'No part number'} · Qty {p.qty}</p>)}<div className="flex flex-wrap gap-2 mt-2">{d.closure.serviceReport?.photos?.map(url => <button key={url} onClick={() => setPreview({kind:'service_report',url})}><img src={resolveMediaUrl(url)} alt="Completion photo" className="h-20 w-20 rounded-lg object-cover"/></button>)}</div><KV label="Confirmation" value={d.closure.confirmationMethod}/><KV label="Confirmed at" value={formatDateTime(d.closure.customerConfirmedAt)}/><KV label="Rating" value={<span data-testid="closure-rating">{d.closure.rating != null ? `${'★'.repeat(Math.round(d.closure.rating))}${'☆'.repeat(5-Math.round(d.closure.rating))} ${d.closure.rating}/5` : 'Not rated'}</span>}/><KV label="Feedback" value={d.closure.feedback}/><KV label="Closed at" value={formatDateTime(d.closure.closedAt)}/></> : <Empty>The service report, confirmation and rating appear as the job finishes.</Empty>}</Section>
              {can('tickets:edit') && d.job?.jobStage === 'CUSTOMER_CONFIRMATION' && <div className="print-hide"><button className="text-xs text-blue-900 font-bold" onClick={() => setConfirmOpen(!confirmOpen)}>Confirm on customer's behalf</button>{confirmOpen && <form className="space-y-2 mt-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await apiRequest(`/brand/tickets/${t.id}/confirm-on-behalf`, { auth: true, method: 'POST', body: { method: 'cce', remarks: confirmRemarks } }); setConfirmOpen(false); await res.reload(); } catch(e) { setError(e.message); } finally { setBusy(false); } }}><p className="text-xs text-slate-500">Log a customer confirmation call or internal note after completion first.</p><label className="text-xs">Confirmation remarks<textarea required minLength={5} maxLength={1000} value={confirmRemarks} onChange={e => setConfirmRemarks(e.target.value)} className={fieldClass}/></label><button disabled={busy} className="text-xs font-bold text-blue-900">Record customer confirmation</button></form>}</div>}
              <Section title="SLA"><div className="overflow-auto"><table className="text-xs w-full text-left"><thead><tr>{['Stage','Due','Met at','State','Remaining'].map(h=><th key={h} className="p-1">{h}</th>)}</tr></thead><tbody>{t.sla.stages.map(s=><tr key={s.key} className={s.state==='breached'?'text-red-700':s.state==='warning'?'text-amber-700':''}><td className="p-1">{s.label}</td><td className="p-1">{formatDateTime(s.dueAt)}</td><td className="p-1">{formatDateTime(s.metAt)}</td><td className="p-1">{s.paused&&!s.metAt?'paused':s.state.replaceAll('_',' ')}</td><td className="p-1">{s.remainingMs==null?'—':`${s.remainingMs<0?'-':''}${Math.floor(Math.abs(s.remainingMs)/3600000)}h ${Math.floor(Math.abs(s.remainingMs)/60000)%60}m`}</td></tr>)}</tbody></table></div></Section>
              {can('escalations:view') && <Section title="Escalations"><TicketEscalations ticketId={t.id}/></Section>}
            </div>
          </div>
          <Section id="activity" title="Activity">{canAudit && <label className="flex gap-2 text-xs mb-4 print-hide"><input type="checkbox" checked={showAudit} onChange={e=>{setShowAudit(e.target.checked);setAuditPage(1);}}/>Show audit entries</label>}{showAudit && canAudit && <div className="mb-5 border rounded-xl overflow-hidden">{audit.loading ? <p className="p-3 text-xs">Loading audit entries…</p> : audit.error ? <p role="alert" className="p-3 text-red-700">{audit.error.message}</p> : <><AuditEntries rows={audit.data?.data||[]}/>{audit.data?.meta?.totalPages>1&&<div className="flex gap-3 p-3 text-xs"><button disabled={auditPage<=1} onClick={()=>setAuditPage(p=>p-1)}>Previous audit entries</button><span>{auditPage} / {audit.data.meta.totalPages}</span><button disabled={auditPage>=audit.data.meta.totalPages} onClick={()=>setAuditPage(p=>p+1)}>Next audit entries</button></div>}</>}</div>}<div className="flex flex-wrap gap-2 mb-4 print-hide">{['', 'status', 'communication', 'job', 'parts', 'sla', 'billing', 'notes'].map(v => <button key={v} onClick={() => { setType(v); setPage(1); }} aria-pressed={type === v} className={`px-3 py-1 rounded-full text-xs ${type === v ? 'bg-blue-900 text-white' : 'bg-slate-100'}`}>{v || 'All activity'}</button>)}</div>
            {activity.error && <p role="alert">{activity.error.message}</p>}
            <ol className="space-y-3">{events.map(e => <li key={e.id} className="text-xs border-l-2 border-blue-200 pl-3"><p className="font-bold flex gap-2 items-center">{(() => {const Icon=activityIcons[e.type]||Briefcase;return <Icon size={14}/>;})()}{e.toStatus ? `${e.fromStatus} → ${e.toStatus}` : e.action.replaceAll('_', ' ').toLowerCase()}{e.brandOnly && <span className="ml-2 text-slate-500">brand only</span>}</p>{e.note && <p>{e.note}</p>}{e.type==='communication'&&e.meta&&<p className="text-slate-500">{[e.meta.channel,e.meta.direction,e.meta.outcome?.replaceAll('_',' '),e.meta.durationSec!=null?`${e.meta.durationSec}s`:null,e.meta.callbackAt?`Callback ${formatDateTime(e.meta.callbackAt)}`:null].filter(Boolean).join(' · ')}</p>}<p className="text-slate-500">{e.by?.name}{e.by?.employeeId?` (${e.by.employeeId})`:''} · {e.by?.roles?.join(', ') || e.by?.kind || 'NCC'} · {formatDateTime(e.at)}</p></li>)}</ol>{!events.length && <Empty>No activity for this filter.</Empty>}
            {activityMeta?.totalPages > 1 && <div className="flex gap-3 mt-3 print-hide"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous activity</button><span>{page} / {activityMeta.totalPages}</span><button disabled={page >= activityMeta.totalPages} onClick={() => setPage(page + 1)}>Next activity</button></div>}
            {can('tickets:edit') && <form onSubmit={addNote} className="space-y-2 mt-4 print-hide"><label htmlFor="ticket-note" className="text-xs font-bold">Internal note</label><textarea id="ticket-note" className={fieldClass} rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Visible to your team and NCC — never to the customer"/><button disabled={busy || !note.trim()} className="bg-blue-900 text-white text-xs rounded-xl px-4 py-2">Add note</button></form>}
          </Section>
        </>}
      </div>
    </main>
    <dialog ref={previewRef} onClose={() => setPreview(null)} aria-label="Document preview" className="rounded-2xl p-6 max-w-3xl w-full backdrop:bg-black/60 m-auto">{preview && <><button onClick={() => previewRef.current?.close()} aria-label="Close preview" className="float-right mb-2"><X size={18}/></button>{isVideo(preview) ? <video controls autoPlay src={resolveMediaUrl(preview.url)} className="w-full max-h-[80vh]"/> : <img src={resolveMediaUrl(preview.url)} alt={DOCUMENT_LABELS[preview.kind]} className="w-full max-h-[80vh] object-contain"/>}</>}</dialog>
    <style>{`@media print { .print-hide, dialog { display:none!important; } .ticket-content { margin-left:0!important; } .ticket-print { background:white!important; } .ticket-content .grid { display:block; } .ticket-content section { margin-bottom:14px; } }`}</style>
  </div>;
}
