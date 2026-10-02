import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, MapPin } from 'lucide-react';
import ServiceRatingCard from '../components/common/ServiceRatingCard';
import { WarrantyHeader, StatusPill, DocumentChip, AddDocumentButton, ErrorNote, BrandLogo } from '../components/partner-warranty/ui';
import { formatDateTime } from '../lib/partnerWarrantyFormat';
import { SkeletonDetail } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { useWarrantyClaimLive } from '../hooks/useWarrantyClaimLive';
import { warrantyApi, DOCUMENT_LABELS } from '../lib/partnerWarrantyApi';
import { resolveMediaUrl } from '../lib/apiClient';

// One warranty claim in full (docs/partner-warranty Phase 12): what was
// submitted, the documents, the brand's request for more information and the
// answer form, and the history of updates — customer-visible only (the API
// never sends internal notes).

const FINISHED = ['Closed', 'Cancelled', 'Rejected'];

function InfoRequestForm({ claim, onDone }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() && !files.length) {
      setError('Add a message or at least one photo/document.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await warrantyApi.respond(claim.id, {
        message: message.trim() || undefined,
        documents: files.map((f) => ({ kind: 'additional', url: f.url, name: f.name })),
      });
      onDone();
    } catch (err) {
      setError(err.message || 'Could not send your reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3" aria-labelledby="pw-info-title">
      <p id="pw-info-title" className="flex items-center gap-2 text-sm font-black text-amber-800">
        <AlertCircle className="h-4 w-4" aria-hidden="true" /> The brand needs more information
      </p>
      <blockquote className="text-sm text-amber-900 bg-white/70 rounded-xl px-3 py-2">“{claim.infoRequest.message}”</blockquote>
      <label htmlFor="pw-info-message" className="text-xs font-bold text-slate-700">
        Your reply
      </label>
      <textarea
        id="pw-info-message"
        rows={3}
        maxLength={1000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-sm outline-none focus:border-brand-blue resize-none"
      />
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <DocumentChip key={f.url} doc={f} onRemove={() => setFiles((list) => list.filter((_, j) => j !== i))} />
        ))}
        <AddDocumentButton label="Add file" onAdded={(d) => setFiles((list) => [...list, d].slice(0, 10))} />
      </div>
      <ErrorNote message={error} />
      <button type="submit" disabled={sending} className="py-3 bg-brand-navy text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70">
        {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Send to brand
      </button>
    </form>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <dt className="text-xs text-slate-400 font-semibold">{label}</dt>
      <dd className="text-sm font-bold text-slate-800 text-right">{value}</dd>
    </div>
  );
}

const TicketDetails = () => {
  const { id } = useParams();
  const res = useApiData(() => warrantyApi.claim(id), [id]);
  useWarrantyClaimLive(() => res.reload(), res.data?.id || null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const c = res.data;

  const addDocument = async (doc) => {
    setAddError('');
    setAdding(true);
    try {
      res.setData(await warrantyApi.addDocuments(c.id, [{ kind: 'additional', url: doc.url, name: doc.name }]));
    } catch (err) {
      setAddError(err.message || 'Could not add the document.');
    } finally {
      setAdding(false);
    }
  };

  const updates = (c?.timeline || []).filter((e) => e.statusLabel || e.note).slice().reverse();

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title="Claim Details" back="/partner-warranty/claims" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <ErrorNote message={res.error ? res.error.message || 'Could not load this claim.' : ''} onRetry={res.reload} />
        {res.loading ? (
          <SkeletonDetail />
        ) : c ? (
          <>
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center gap-4">
              <BrandLogo brand={c.brand} size="h-11 w-11" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-brand-navy truncate">
                  {c.brand?.name} · {c.productName}
                </p>
                <p className="text-xs text-slate-500">{c.issueName}</p>
                <div className="mt-1.5">
                  <StatusPill status={c.status} label={c.statusLabel} />
                </div>
              </div>
            </div>

            {c.infoRequest && <InfoRequestForm claim={c} onDone={res.reload} />}

            {c.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-800">
                <span className="font-black">Not approved:</span> {c.rejectionReason}
              </div>
            )}

            <Link to={`/partner-warranty/claims/${c.id}/track`} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-5 py-4">
              <span className="text-sm font-black text-brand-navy">Track this ticket</span>
              <ChevronRight className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            </Link>

            <section className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3" aria-labelledby="pw-details">
              <h2 id="pw-details" className="text-sm font-black text-black py-2">
                Details
              </h2>
              <dl>
                <Row label="Ticket ID" value={c.humanId} />
                <Row label="Service Job" value={c.serviceJobId} />
                <Row label="Raised on" value={formatDateTime(c.createdAt)} />
                <Row label="Model Number" value={c.modelNumber} />
                <Row label="Serial Number" value={c.serialNumber} />
                <Row label="Purchase Date" value={c.purchaseDate ? new Date(c.purchaseDate).toLocaleDateString('en-IN') : null} />
              </dl>
              {c.remarks && <p className="text-sm text-slate-600 py-3 border-t border-slate-100">{c.remarks}</p>}
              <p className="text-xs text-slate-500 flex items-start gap-1.5 py-3 border-t border-slate-100">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                {[c.address?.house, c.address?.landmark, c.address?.city, c.address?.state, c.address?.pincode].filter(Boolean).join(', ')}
              </p>
            </section>

            <section className="flex flex-col gap-3" aria-labelledby="pw-docs">
              <h2 id="pw-docs" className="text-sm font-black text-black pl-1">
                Documents
              </h2>
              <div className="flex flex-wrap gap-3">
                {c.documents.map((d) => (
                  <a key={d.id} href={resolveMediaUrl(d.url)} target="_blank" rel="noreferrer" aria-label={`Open ${DOCUMENT_LABELS[d.kind]}${d.name ? `: ${d.name}` : ''}`}>
                    <DocumentChip doc={d} label={DOCUMENT_LABELS[d.kind]} />
                  </a>
                ))}
                {!FINISHED.includes(c.status) && (adding ? (
                  <span className="w-20 h-20 rounded-2xl border border-slate-200 bg-white flex items-center justify-center" aria-label="Uploading">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-blue" aria-hidden="true" />
                  </span>
                ) : (
                  <AddDocumentButton label="Add more" onAdded={addDocument} />
                ))}
              </div>
              <ErrorNote message={addError} />
            </section>

            {updates.length > 0 && (
              <section className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4" aria-labelledby="pw-updates">
                <h2 id="pw-updates" className="text-sm font-black text-black mb-3">
                  Updates
                </h2>
                <ul className="flex flex-col gap-3">
                  {updates.map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-blue shrink-0" aria-hidden="true" />
                      <span className="text-sm">
                        {e.statusLabel && <span className="block font-bold text-slate-800">{e.statusLabel}</span>}
                        {e.note && <span className="block text-slate-600">{e.note}</span>}
                        <span className="block text-[11px] text-slate-400">{formatDateTime(e.at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.status === 'Closed' && c.serviceRequestId && <ServiceRatingCard service={{ id: c.serviceRequestId, _id: c.serviceRequestId }} />}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TicketDetails;
