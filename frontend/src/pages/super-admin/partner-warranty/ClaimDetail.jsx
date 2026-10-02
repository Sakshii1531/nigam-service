import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, UserPlus, Shuffle, ListChecks, AlertTriangle, Pause, Play, Ban, RotateCcw, StickyNote, FileText, Lock, Eye, Building } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import ReasonDialog from '../../../components/super-admin/partner-warranty/ReasonDialog';
import { useApiData } from '../../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../../hooks/useWarrantyClaimLive';
import { adminWarrantyApi, OVERRIDE_TARGETS } from '../../../lib/adminWarrantyApi';
import { DOCUMENT_LABELS } from '../../../lib/partnerWarrantyApi';
import { formatDateTime, dueLabel, formatVisit } from '../../../lib/partnerWarrantyFormat';
import { resolveMediaUrl } from '../../../lib/apiClient';

// Super Admin → one Partner Warranty claim (docs/partner-warranty Phase 14,
// client #4, #14, #15, #17): everything about it, and every manual control.

const DECIDABLE = ['Submitted', 'Brand Review', 'Info Requested'];
const TERMINAL = ['Closed', 'Cancelled', 'Rejected'];
const PRE_WORK = ['Approved', 'Job Created', 'Partner Assigned', 'Visit Scheduled', 'Technician On Way', 'Service In Progress'];
const SLA_STAGES = [
  ['brandApproval', 'Brand approval', 'brandApprovalDueAt', 'approval'],
  ['assignment', 'Partner assignment', 'assignmentDueAt', 'assignment'],
  ['visit', 'Technician visit', 'visitDueAt', 'visit'],
  ['resolution', 'Resolution', 'resolutionDueAt', 'resolution'],
];
const VISIBILITY = {
  customer: 'bg-emerald-50 text-emerald-700',
  brand: 'bg-indigo-50 text-indigo-700',
  internal: 'bg-slate-100 text-slate-600',
};

function PartnerPicker({ claimId, value, onChange, allowNone }) {
  const res = useApiData(() => adminWarrantyApi.suggestions(claimId), [claimId], { initial: [] });
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-[#1E293B] mb-1">Partner</legend>
      {allowNone && (
        <label className="flex items-center gap-2 text-xs p-2 rounded-lg border border-[#E2E8F0] cursor-pointer">
          <input type="radio" name="pw-partner" checked={!value} onChange={() => onChange('')} className="accent-[#0D47A1]" />
          Next eligible partner (automatic)
        </label>
      )}
      <div className="max-h-56 overflow-y-auto space-y-1.5">
        {res.loading && <p className="text-xs text-[#94A3B8]">Loading partners…</p>}
        {!res.loading && res.data.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">No partner passes the warranty rules (skill, service area, brand authorization) — check Partner Eligibility.</p>
        )}
        {res.data.map((p) => (
          <label key={p.id} className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer ${value === p.id ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-[#E2E8F0]'}`}>
            <input type="radio" name="pw-partner" checked={value === p.id} onChange={() => onChange(p.id)} className="accent-[#0D47A1]" />
            <span className="flex-1">
              <span className="font-bold text-[#1E293B]">{p.name}</span>
              <span className="text-[#64748B]">
                {' '}· {p.city || '—'} · {p.availability}
                {p.distanceKm != null ? ` · ${p.distanceKm} km` : ''} · score {p.score}
              </span>
            </span>
            {p.authorizedForBrand && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Authorized</span>}
            {p.availability !== 'Available' && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">{p.availability}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#F1F5F9] last:border-0 text-xs">
      <span className="text-[#64748B] font-semibold">{label}</span>
      <span className="text-[#1E293B] font-bold text-right">{value || '—'}</span>
    </div>
  );
}

export default function AdminWarrantyClaimDetail() {
  const { id } = useParams();
  const res = useApiData(() => adminWarrantyApi.get(id), [id]);
  useWarrantyClaimLive(() => res.reload(), res.data?.id || null, 'super_admin');
  const [dialog, setDialog] = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [force, setForce] = useState(false);
  const [target, setTarget] = useState('');
  const [toast, setToast] = useState('');
  const c = res.data;

  const current = c?.serviceJobs?.find((j) => j.current && !['Cancelled', 'Closed'].includes(j.status));
  const open = (kind) => {
    setPartnerId('');
    setForce(false);
    setTarget(kind === 'reopen' ? 'Brand Review' : '');
    setDialog(kind);
  };
  const run = async (action, body, message) => {
    const updated = await adminWarrantyApi.action(c.id, action, body);
    res.setData(updated);
    setDialog(null);
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const DIALOGS = c && {
    approve: { title: 'Approve on the brand’s behalf', help: 'Creates the Service Job and dispatches it. The customer sees a normal approval; your reason stays internal.', submitLabel: 'Approve', tone: 'bg-emerald-600 hover:bg-emerald-700', go: (reason) => run('approve', { reason }, 'Approved — Service Job created.') },
    reject: { title: 'Reject on the brand’s behalf', help: 'The customer sees this reason.', submitLabel: 'Reject', tone: 'bg-red-600 hover:bg-red-700', go: (reason) => run('reject', { reason }, 'Claim rejected.') },
    assign: {
      title: 'Assign a partner',
      help: 'For when automatic allocation found nobody, or to override it. Any Active partner can be chosen, even if offline.',
      submitLabel: 'Assign',
      extra: <PartnerPicker claimId={c.id} value={partnerId} onChange={setPartnerId} />,
      go: (reason) => {
        if (!partnerId) throw new Error('Choose a partner.');
        return run('assign', { serviceProviderId: partnerId, reason }, 'Partner assigned.');
      },
    },
    reassign: {
      title: 'Reassign',
      help: current?.accepted
        ? 'The partner has already accepted. Replacing them cancels this job and creates a new Service Job — tick below to confirm.'
        : 'Takes the offer away from the current partner.',
      submitLabel: 'Reassign',
      extra: (
        <>
          <PartnerPicker claimId={c.id} value={partnerId} onChange={setPartnerId} allowNone />
          {current?.accepted && (
            <label className="flex items-center gap-2 text-xs font-semibold text-red-700">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="accent-red-600" />
              Cancel job {current.humanId} and create a new one
            </label>
          )}
        </>
      ),
      go: (reason) => {
        if (current?.accepted && !force) throw new Error('Tick the box to replace an accepted job.');
        return run('reassign', { reason, ...(partnerId ? { serviceProviderId: partnerId } : {}), ...(force ? { force: true } : {}) }, 'Reassigned.');
      },
    },
    status: {
      title: 'Change status',
      help: 'Moves the claim only (closing also closes a job that is ready). Use the other actions for approve, reject, hold, cancel and reopen.',
      submitLabel: 'Change status',
      extra: (
        <label className="block text-xs font-semibold text-[#1E293B]">
          New status
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs">
            <option value="">Choose…</option>
            {OVERRIDE_TARGETS.filter((s) => s !== c.status).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      ),
      go: (reason) => {
        if (!target) throw new Error('Choose the new status.');
        return run('status', { status: target, reason }, `Status changed to ${target}.`);
      },
    },
    escalate: { title: 'Escalate', help: 'Flags the claim and tells the brand.', submitLabel: 'Escalate', tone: 'bg-orange-600 hover:bg-orange-700', go: (reason) => run('escalate', { reason }, 'Escalated.') },
    'de-escalate': { title: 'De-escalate', submitLabel: 'De-escalate', go: (reason) => run('de-escalate', { reason }, 'De-escalated.') },
    hold: { title: 'Put on hold', help: 'Pauses the claim and its SLA clocks. An offer nobody has accepted is withdrawn until you resume.', submitLabel: 'Put on hold', tone: 'bg-amber-600 hover:bg-amber-700', go: (reason) => run('hold', { reason }, 'On hold.') },
    resume: { title: 'Resume', help: 'Back to where it was; catches up with the job and re-offers it if nobody holds it.', submitLabel: 'Resume', go: (reason) => run('resume', { reason }, 'Resumed.') },
    cancel: { title: 'Cancel claim', help: 'Cancels the claim and its live Service Job. Customer and brand are told the reason.', submitLabel: 'Cancel claim', tone: 'bg-red-600 hover:bg-red-700', go: (reason) => run('cancel', { reason }, 'Claim cancelled.') },
    reopen: {
      title: 'Reopen',
      submitLabel: 'Reopen',
      extra: (
        <label className="block text-xs font-semibold text-[#1E293B]">
          Reopen to
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs">
            <option value="Brand Review">Brand Review — the brand decides again</option>
            {c.status !== 'Rejected' && <option value="Job Created">Job Created — start a new Service Job</option>}
          </select>
        </label>
      ),
      go: (reason) => run('reopen', { reason, to: target }, 'Reopened.'),
    },
    notes: { title: 'Internal note', reasonLabel: 'Note', submitLabel: 'Add note', go: (note) => run('notes', { note }, 'Note added.') },
  };

  const actions = c
    ? [
        DECIDABLE.includes(c.status) && ['approve', 'Approve for brand', <Check size={13} key="i" />, 'text-emerald-700 border-emerald-200'],
        DECIDABLE.includes(c.status) && ['reject', 'Reject for brand', <X size={13} key="i" />, 'text-red-600 border-red-200'],
        !TERMINAL.includes(c.status) && c.status !== 'On Hold' && !DECIDABLE.includes(c.status) && !current?.accepted && ['assign', 'Assign partner', <UserPlus size={13} key="i" />],
        current && PRE_WORK.includes(c.status) && ['reassign', 'Reassign', <Shuffle size={13} key="i" />],
        !['On Hold'].includes(c.status) && ['status', 'Change status', <ListChecks size={13} key="i" />],
        !c.flags.escalated ? ['escalate', 'Escalate', <AlertTriangle size={13} key="i" />, 'text-orange-700 border-orange-200'] : ['de-escalate', 'De-escalate', <AlertTriangle size={13} key="i" />],
        !TERMINAL.includes(c.status) && c.status !== 'On Hold' && ['hold', 'Hold', <Pause size={13} key="i" />],
        c.status === 'On Hold' && ['resume', 'Resume', <Play size={13} key="i" />],
        !TERMINAL.includes(c.status) && ['cancel', 'Cancel', <Ban size={13} key="i" />, 'text-red-600 border-red-200'],
        TERMINAL.includes(c.status) && ['reopen', 'Reopen', <RotateCcw size={13} key="i" />],
        ['notes', 'Note', <StickyNote size={13} key="i" />],
      ].filter(Boolean)
    : [];

  const cfg = dialog && DIALOGS?.[dialog];

  return (
    <AdminShell title="Warranty Claim" subtitle={c ? `${c.humanId} · ${c.brand?.name} · ${c.productName} — ${c.issueName}` : 'Loading…'}>
      <Link to="/super-admin/partner-warranty/claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D47A1]">
        <ArrowLeft size={14} /> All claims
      </Link>
      {res.error && (
        <p role="alert" className="bg-white rounded-2xl border border-red-200 p-5 text-sm font-semibold text-red-600">
          {res.error.message}
        </p>
      )}
      {res.loading && <div className="bg-white rounded-2xl border border-[#E2E8F0] h-64 animate-pulse" />}

      {c && (
        <>
          <Panel>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-60">
                <p className="text-lg font-black text-[#0D47A1]">{c.humanId}</p>
                <p className="text-xs text-[#64748B] flex items-center gap-1">
                  <Building size={12} aria-hidden="true" /> {c.brand?.name} · submitted {formatDateTime(c.createdAt)} · customer sees “{c.customerStatusLabel}”
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EEF4FF] text-[#0D47A1]">{c.status}</span>
                  {c.statusBeforeHold && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">was {c.statusBeforeHold}</span>}
                  {c.slaState !== 'ok' && <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.slaState === 'breached' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>SLA {c.slaState}</span>}
                  {c.flags.escalated && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700" title={c.flags.escalationReason}>Escalated</span>}
                  {c.flags.allocationFailed && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">No partner found</span>}
                  {c.flags.unauthorizedFallback && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Non-authorized partner (brand has none)</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end max-w-2xl">
                {actions.map(([key, label, icon, tone]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => open(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border bg-white hover:bg-[#F8FAFC] flex items-center gap-1 ${tone || 'text-[#0D47A1] border-[#BFDBFE]'}`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              <Panel title="SLA">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-[#64748B]">
                    <tr>
                      <th className="text-left py-1.5">Stage</th>
                      <th className="text-left">Window</th>
                      <th className="text-left">Due</th>
                      <th className="text-left">Met</th>
                      <th className="text-left">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {SLA_STAGES.map(([key, label, dueField, hoursKey]) => {
                      const due = c.sla?.[dueField];
                      const met = c.sla?.met?.[key];
                      const breached = c.sla?.breaches?.includes(key);
                      const warned = c.sla?.warnings?.includes(key);
                      const left = !met && due ? dueLabel(due) : null;
                      return (
                        <tr key={key}>
                          <td className="py-2 font-semibold">{label}</td>
                          <td>{c.sla?.hours?.[hoursKey] ? `${c.sla.hours[hoursKey]} h` : '—'}</td>
                          <td>{due ? formatDateTime(due) : 'not started'}</td>
                          <td>{met ? formatDateTime(met) : left ? <span className={left.late ? 'text-red-600 font-bold' : ''}>{left.text}</span> : '—'}</td>
                          <td>
                            {breached ? (
                              <span className="text-red-600 font-bold">Breached</span>
                            ) : warned && !met ? (
                              <span className="text-amber-700 font-bold">Warning</span>
                            ) : met ? (
                              <span className={due && new Date(met) <= new Date(due) ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                                {due && new Date(met) <= new Date(due) ? 'On time' : 'Late'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {c.sla?.pausedAt && <p className="text-[11px] text-amber-700 mt-2">Clock paused since {formatDateTime(c.sla.pausedAt)}.</p>}
              </Panel>

              <Panel title={`Service jobs (${c.serviceJobs.length})`}>
                {c.serviceJobs.length === 0 ? (
                  <p className="text-xs text-[#64748B]">Created when the claim is approved.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase text-[#64748B]">
                      <tr>
                        <th className="text-left py-1.5">Job</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Partner</th>
                        <th className="text-left">Declined / timed out</th>
                        <th className="text-left">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {c.serviceJobs.map((j) => (
                        <tr key={j.id} className={j.current ? '' : 'text-[#94A3B8]'}>
                          <td className="py-2 font-mono font-bold">
                            {j.humanId}
                            {j.current && <span className="ml-1 px-1 rounded bg-[#EEF4FF] text-[#0D47A1] text-[9px] font-sans">current</span>}
                          </td>
                          <td>
                            {j.status}
                            {j.jobStep ? ` · ${j.jobStep}` : ''}
                            {j.cancellationReason && <p className="text-[10px]">{j.cancellationReason}</p>}
                          </td>
                          <td>
                            {j.partner ? `${j.partner.name}${j.accepted ? ' ✓' : ' (offered)'}` : '—'}
                            {j.partner?.phone && <p className="text-[10px]">{j.partner.phone}</p>}
                          </td>
                          <td>{j.declinedBy.length ? j.declinedBy.join(', ') : '—'}</td>
                          <td>{j.payout != null ? `₹${j.payout}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              <Panel title="Timeline (everything)">
                <ol className="space-y-2.5">
                  {c.timeline
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={e.id} className="flex gap-3 text-xs">
                        <span className={`shrink-0 h-fit px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${VISIBILITY[e.visibility]}`}>
                          {e.visibility === 'internal' ? <Lock size={9} className="inline" /> : <Eye size={9} className="inline" />} {e.visibility}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-[#1E293B]">
                            {e.toStatus ? `${e.fromStatus ? `${e.fromStatus} → ` : ''}${e.toStatus}` : e.action.replaceAll('_', ' ').toLowerCase()}
                          </p>
                          {e.note && <p className="text-[#64748B]">{e.note}</p>}
                          <p className="text-[10px] text-[#94A3B8]">
                            {e.by?.kind}
                            {e.by?.name ? ` · ${e.by.name}` : ''} · {formatDateTime(e.at)}
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              </Panel>

              <Panel title={`Audit trail (${c.audit.length})`}>
                <table className="w-full text-[11px]">
                  <thead className="text-[10px] uppercase text-[#64748B]">
                    <tr>
                      <th className="text-left py-1.5">When</th>
                      <th className="text-left">Who</th>
                      <th className="text-left">Old → new</th>
                      <th className="text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {c.audit
                      .slice()
                      .reverse()
                      .map((a, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 whitespace-nowrap align-top">{formatDateTime(a.at)}</td>
                          <td className="pr-4 align-top">{a.by ? `${a.by.name} (${a.by.role})` : 'System'}</td>
                          <td>{a.toStatus ? `${a.fromStatus || '—'} → ${a.toStatus}` : a.action.split(': ')[1]}</td>
                          <td className="text-[#64748B]">{a.reason || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Panel>
            </div>

            <div className="space-y-5">
              <Panel title="Customer & product">
                <KV label="Customer" value={c.customer?.name} />
                <KV label="Phone" value={c.customer?.phone} />
                <KV label="Address" value={[c.address?.house, c.address?.city, c.address?.pincode].filter(Boolean).join(', ')} />
                <KV label="Product" value={c.productName} />
                <KV label="Issue" value={c.issueName} />
                <KV label="Model" value={c.modelNumber} />
                <KV label="Serial" value={c.serialNumber} />
                <KV label="Purchased" value={c.purchaseDate ? new Date(c.purchaseDate).toLocaleDateString('en-IN') : null} />
                <KV label="Warranty check" value={c.warrantyCheck?.status} />
                {c.visit && <KV label="Visit" value={formatVisit(c.visit)} />}
                {c.remarks && <p className="mt-2 text-xs bg-[#F8FAFC] rounded-xl p-2">“{c.remarks}”</p>}
                {c.rejectionReason && <p className="mt-2 text-xs text-red-700 font-semibold">Rejected: {c.rejectionReason}</p>}
              </Panel>

              <Panel title={`Documents (${c.documents.length})`}>
                <ul className="space-y-1.5">
                  {c.documents.map((d) => (
                    <li key={d.id}>
                      <a href={resolveMediaUrl(d.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-[#0D47A1] hover:underline">
                        <FileText size={13} aria-hidden="true" /> {DOCUMENT_LABELS[d.kind]} {d.name ? `· ${d.name}` : ''}
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>

              {c.infoRequests.length > 0 && (
                <Panel title="Information requests">
                  <ol className="space-y-2 text-xs">
                    {c.infoRequests.map((r) => (
                      <li key={r.id} className="border border-[#E2E8F0] rounded-xl p-2">
                        <p className="font-semibold">“{r.message}”</p>
                        <p className="text-[#64748B]">{r.respondedAt ? `Replied: “${r.response || 'documents only'}”` : 'Waiting for the customer'}</p>
                      </li>
                    ))}
                  </ol>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}

      {cfg && (
        <ReasonDialog
          open
          title={cfg.title}
          help={cfg.help}
          submitLabel={cfg.submitLabel}
          tone={cfg.tone}
          reasonLabel={cfg.reasonLabel}
          minLength={dialog === 'notes' ? 1 : 3}
          extra={cfg.extra}
          onSubmit={cfg.go}
          onClose={() => setDialog(null)}
        />
      )}
      {toast && (
        <div role="status" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </AdminShell>
  );
}
