import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, MessageSquareMore, FileText, User, MapPin, Package, Wrench, Lock, Loader2, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { useApiData } from '../../hooks/useApiData';
import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { brandWarrantyApi, DECIDABLE } from '../../lib/brandWarrantyApi';
import { DOCUMENT_LABELS } from '../../lib/partnerWarrantyApi';
import { formatDateTime, dueLabel, formatVisit } from '../../lib/partnerWarrantyFormat';
import { resolveMediaUrl } from '../../lib/apiClient';

// One claim, for the brand to decide (docs/partner-warranty Phase 13): the
// customer's documents and details, the info-request thread, the linked
// Service Job once approved, and the brand-visible history. Approve, reject
// (reason required) and request-information use native <dialog>s.

const isPdf = (url) => /\.pdf($|\?)/i.test(url || '');

const ACTIONS = {
  approve: {
    title: 'Approve warranty claim',
    help: 'NCC will create a Service Job and send the nearest eligible technician.',
    field: 'Remarks for the record (optional)',
    min: 0,
    submit: 'Approve claim',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
  },
  reject: {
    title: 'Reject warranty claim',
    help: 'The customer sees this reason.',
    field: 'Reason for rejection',
    min: 5,
    submit: 'Reject claim',
    tone: 'bg-red-600 hover:bg-red-700',
  },
  info: {
    title: 'Request more information',
    help: 'The customer is notified and can reply with photos or documents on this claim.',
    field: 'What do you need from the customer?',
    min: 5,
    submit: 'Send request',
    tone: 'bg-[#0D47A1] hover:bg-blue-800',
  },
};

function DecisionDialog({ kind, onClose, onDone, claimId }) {
  const ref = useRef(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cfg = ACTIONS[kind];

  useEffect(() => {
    const dialog = ref.current;
    if (kind && dialog && !dialog.open) dialog.showModal();
    if (!kind && dialog?.open) dialog.close();
  }, [kind]);

  if (!cfg) return <dialog ref={ref} />;

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length < cfg.min) {
      setError(`Please write at least ${cfg.min} characters.`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (kind === 'approve') await brandWarrantyApi.approve(claimId, value || undefined);
      if (kind === 'reject') await brandWarrantyApi.reject(claimId, value);
      if (kind === 'info') await brandWarrantyApi.requestInfo(claimId, value);
      setText('');
      onDone(kind);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="bw-dialog-title"
      className="rounded-2xl p-0 w-full max-w-md backdrop:bg-black/40 backdrop:backdrop-blur-sm m-auto"
    >
      <form onSubmit={submit} className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <h2 id="bw-dialog-title" className="font-bold text-sm text-[#1E293B]">
            {cfg.title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-[#F1F5F9]">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[#64748B]">{cfg.help}</p>
        <label htmlFor="bw-dialog-text" className="block text-xs font-semibold text-[#1E293B]">
          {cfg.field}
          {cfg.min > 0 && <span className="text-red-500" aria-hidden="true"> *</span>}
        </label>
        <textarea
          id="bw-dialog-text"
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required={cfg.min > 0}
          minLength={cfg.min || undefined}
          aria-describedby={error ? 'bw-dialog-error' : undefined}
          className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0D47A1] user-invalid:border-red-400"
        />
        {error && (
          <p id="bw-dialog-error" role="alert" className="text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] text-[#64748B]">
            Cancel
          </button>
          <button type="submit" disabled={busy} className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60 ${cfg.tone}`}>
            {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {cfg.submit}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Section({ title, icon, children, right }) {
  return (
    <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase font-bold text-[#64748B] flex items-center gap-1.5">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function KV({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#F1F5F9] last:border-0 text-xs">
      <span className="text-[#64748B] font-semibold">{label}</span>
      <span className={`text-[#1E293B] font-bold text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

const BrandWarrantyClaimDetail = () => {
  const { id } = useParams();
  const res = useApiData(() => brandWarrantyApi.get(id), [id]);
  useWarrantyClaimLive(() => res.reload(), res.data?.id || null, 'brand_admin');
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState('');
  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const previewRef = useRef(null);
  const c = res.data;

  useEffect(() => {
    if (preview && previewRef.current && !previewRef.current.open) previewRef.current.showModal();
  }, [preview]);

  const done = (kind) => {
    setDialog(null);
    setToast({ approve: 'Claim approved — a Service Job has been created.', reject: 'Claim rejected. The customer has been told why.', info: 'Request sent to the customer.' }[kind]);
    setTimeout(() => setToast(''), 4000);
    res.reload();
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setNoteBusy(true);
    try {
      res.setData(await brandWarrantyApi.note(c.id, note.trim()));
      setNote('');
    } finally {
      setNoteBusy(false);
    }
  };

  const decidable = c && DECIDABLE.includes(c.status);
  const due = decidable ? dueLabel(c.approvalDueAt) : null;
  const docsByRequest = (reqId) => (c?.documents || []).filter((d) => d.infoRequest === reqId);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar title="Warranty Claim" subtitle={c ? `${c.humanId} · ${c.productName} — ${c.issueName}` : 'Loading…'} />

        <div className="p-5 space-y-5">
          <Link to="/brand-admin/warranty-claims" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D47A1]">
            <ArrowLeft size={14} /> Back to Warranty Claims
          </Link>

          {res.error && (
            <p role="alert" className="bg-white rounded-2xl border border-red-200 p-5 text-sm font-semibold text-red-600">
              {res.error.status === 404 ? 'This claim was not found for your brand.' : res.error.message}
            </p>
          )}
          {res.loading && <div className="bg-white rounded-2xl border border-[#E2E8F0] h-64 animate-pulse" />}

          {c && (
            <>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-60">
                  <p className="text-[11px] font-semibold text-[#64748B]">Ticket</p>
                  <p className="text-lg font-black text-[#0D47A1]">{c.humanId}</p>
                  <p className="text-xs text-[#64748B]">
                    Submitted {formatDateTime(c.createdAt)} · customer sees “{c.customerStatusLabel}”
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EEF4FF] text-[#0D47A1]">{c.status}</span>
                {due && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${due.late ? 'bg-red-100 text-red-700' : due.soon ? 'bg-amber-100 text-amber-800' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    Decision {due.text}
                  </span>
                )}
                {decidable && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDialog('approve')} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1">
                      <Check size={14} /> Approve
                    </button>
                    <button type="button" onClick={() => setDialog('reject')} className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 flex items-center gap-1">
                      <X size={14} /> Reject
                    </button>
                    {c.status !== 'Info Requested' && (
                      <button type="button" onClick={() => setDialog('info')} className="px-4 py-2 rounded-xl text-xs font-bold text-[#0D47A1] border border-[#BFDBFE] bg-white hover:bg-[#EEF4FF] flex items-center gap-1">
                        <MessageSquareMore size={14} /> Request more information
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2 space-y-5">
                  <Section title="Product & issue" icon={<Package size={13} />}>
                    <KV label="Product" value={c.productName} />
                    <KV label="Issue" value={c.issueName} />
                    <KV label="Model number" value={c.modelNumber} mono />
                    <KV label="Serial number" value={c.serialNumber} mono />
                    <KV label="Purchase date" value={c.purchaseDate ? new Date(c.purchaseDate).toLocaleDateString('en-IN') : null} />
                    <KV
                      label="System warranty check"
                      value={
                        <span className={c.warrantyCheck?.status === 'In Warranty' ? 'text-emerald-700' : c.warrantyCheck?.status === 'Out of Warranty' ? 'text-red-600' : ''}>
                          <ShieldCheck size={12} className="inline mr-1" aria-hidden="true" />
                          {c.warrantyCheck?.status}
                          {c.warrantyCheck?.expiresOn ? ` · until ${new Date(c.warrantyCheck.expiresOn).toLocaleDateString('en-IN')}` : ''}
                        </span>
                      }
                    />
                    {c.remarks && <p className="mt-3 text-xs text-[#1E293B] bg-[#F8FAFC] rounded-xl p-3">“{c.remarks}”</p>}
                  </Section>

                  <Section title={`Documents (${c.documents.length})`} icon={<FileText size={13} />}>
                    <div className="grid grid-cols-4 gap-3">
                      {c.documents.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => (isPdf(d.url) ? window.open(resolveMediaUrl(d.url), '_blank', 'noopener') : setPreview(d))}
                          className="border border-[#E2E8F0] rounded-xl overflow-hidden text-left hover:ring-2 hover:ring-[#0D47A1]"
                        >
                          <div className="h-24 bg-[#F8FAFC] flex items-center justify-center">
                            {isPdf(d.url) ? <FileText size={28} className="text-[#0D47A1]" aria-hidden="true" /> : <img src={resolveMediaUrl(d.url)} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-[#1E293B]">{DOCUMENT_LABELS[d.kind]}</p>
                            <p className="text-[10px] text-[#64748B] truncate">{d.infoRequest ? 'Sent in reply · ' : ''}{formatDateTime(d.uploadedAt)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Section>

                  {c.infoRequests.length > 0 && (
                    <Section title="Information requests" icon={<MessageSquareMore size={13} />}>
                      <ol className="space-y-3">
                        {c.infoRequests.map((r) => (
                          <li key={r.id} className="border border-[#E2E8F0] rounded-xl p-3 text-xs space-y-2">
                            <p>
                              <span className="font-bold text-[#0D47A1]">You asked</span> <span className="text-[#94A3B8]">{formatDateTime(r.requestedAt)}</span>
                            </p>
                            <p className="text-[#1E293B]">“{r.message}”</p>
                            {r.respondedAt ? (
                              <div className="bg-[#F8FAFC] rounded-lg p-2 space-y-1">
                                <p>
                                  <span className="font-bold text-emerald-700">Customer replied</span> <span className="text-[#94A3B8]">{formatDateTime(r.respondedAt)}</span>
                                </p>
                                {r.response && <p className="text-[#1E293B]">“{r.response}”</p>}
                                {docsByRequest(r.id).length > 0 && <p className="text-[#64748B]">{docsByRequest(r.id).length} document(s) attached — see Documents.</p>}
                              </div>
                            ) : (
                              <p className="text-amber-700 font-semibold">Waiting for the customer…</p>
                            )}
                          </li>
                        ))}
                      </ol>
                    </Section>
                  )}

                  <Section title="History" icon={<Wrench size={13} />}>
                    <ol className="space-y-2.5">
                      {c.timeline
                        .slice()
                        .reverse()
                        .map((e) => (
                          <li key={e.id} className="flex gap-3 text-xs">
                            <span className="mt-1 h-2 w-2 rounded-full bg-[#0D47A1] shrink-0" aria-hidden="true" />
                            <div className="flex-1">
                              <p className="font-semibold text-[#1E293B]">
                                {e.toStatus ? `${e.fromStatus ? `${e.fromStatus} → ` : ''}${e.toStatus}` : e.action.replaceAll('_', ' ').toLowerCase()}
                                {e.brandOnly && (
                                  <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[10px] text-[#64748B]">
                                    <Lock size={9} aria-hidden="true" /> brand only
                                  </span>
                                )}
                              </p>
                              {e.note && <p className="text-[#64748B]">{e.note}</p>}
                              <p className="text-[10px] text-[#94A3B8]">
                                {e.by?.name} · {formatDateTime(e.at)}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ol>
                  </Section>
                </div>

                <div className="space-y-5">
                  <Section title="Customer" icon={<User size={13} />}>
                    <KV label="Name" value={c.customer?.name} />
                    <KV label="Phone" value={c.customer?.phone} />
                    <p className="mt-3 text-xs text-[#64748B] flex gap-1.5">
                      <MapPin size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                      {[c.address?.house, c.address?.landmark, c.address?.city, c.address?.state, c.address?.pincode].filter(Boolean).join(', ')}
                    </p>
                  </Section>

                  <Section title="Service job" icon={<Wrench size={13} />}>
                    {c.serviceJob ? (
                      <>
                        <KV label="Job ID" value={c.serviceJob.humanId} mono />
                        <KV label="Job status" value={c.serviceJob.status} />
                        <KV label="Technician" value={c.serviceJob.partner?.name || 'Being assigned'} />
                        <KV label="Visit" value={formatVisit(c.visit)} />
                      </>
                    ) : (
                      <p className="text-xs text-[#64748B]">Created by NCC as soon as you approve.</p>
                    )}
                    {c.rejectionReason && <p className="mt-2 text-xs text-red-700 font-semibold">Rejected: {c.rejectionReason}</p>}
                  </Section>

                  <Section title="Internal note" icon={<Lock size={13} />}>
                    <form onSubmit={addNote} className="space-y-2">
                      <label htmlFor="bw-note" className="sr-only">
                        Internal note
                      </label>
                      <textarea
                        id="bw-note"
                        rows={3}
                        maxLength={1000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Visible to your team and NCC — never to the customer"
                        className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      />
                      <button type="submit" disabled={noteBusy || !note.trim()} className="w-full py-2 rounded-xl text-xs font-bold text-white bg-[#0D47A1] disabled:opacity-50">
                        Add note
                      </button>
                    </form>
                  </Section>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DecisionDialog kind={dialog} claimId={c?.id} onClose={() => setDialog(null)} onDone={done} />

      <dialog ref={previewRef} onClose={() => setPreview(null)} aria-label="Document preview" className="rounded-2xl p-0 max-w-3xl w-full backdrop:bg-black/60 m-auto">
        {preview && (
          <div className="relative">
            <button type="button" onClick={() => previewRef.current?.close()} aria-label="Close preview" className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
              <X size={16} />
            </button>
            <img src={resolveMediaUrl(preview.url)} alt={DOCUMENT_LABELS[preview.kind]} className="w-full max-h-[80vh] object-contain bg-black" />
          </div>
        )}
      </dialog>

      {toast && (
        <div role="status" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default BrandWarrantyClaimDetail;
