import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, FileText, Loader2, X, AlertCircle, Check } from 'lucide-react';
import { goBack } from '../../lib/navigation';
import { resolveMediaUrl } from '../../lib/apiClient';
import { DOCUMENT_ACCEPT, uploadClaimDocument } from '../../lib/partnerWarrantyApi';
import { statusTone, formatDateTime } from '../../lib/partnerWarrantyFormat';

// Shared pieces of the customer Partner Warranty screens (docs/partner-warranty
// Phase 12) — same visual language the approved mock screens used.

export function WarrantyHeader({ title, back = '/partner-warranty' }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white/90 backdrop-blur-md sticky top-0 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
      <button
        type="button"
        onClick={() => goBack(navigate, back)}
        aria-label="Go back"
        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100"
      >
        <ArrowLeft className="h-5 w-5 text-slate-700" />
      </button>
      <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest truncate">{title}</h1>
    </div>
  );
}

/** A brand's uploaded logo, or its initials when it has none. */
export function BrandLogo({ brand, size = 'h-9 w-9' }) {
  if (brand?.logoUrl) {
    return <img src={resolveMediaUrl(brand.logoUrl)} alt="" className={`${size} object-contain rounded-lg`} />;
  }
  const initials = String(brand?.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span aria-hidden="true" className={`${size} rounded-lg bg-brand-navy text-white text-xs font-black flex items-center justify-center shrink-0`}>
      {initials}
    </span>
  );
}

const PILL_TONES = {
  action: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-blue-50 text-brand-navy border-blue-200',
};

export function StatusPill({ status, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${PILL_TONES[statusTone(status)]}`}>
      {statusTone(status) === 'action' && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      {label || status}
    </span>
  );
}

/** Vertical stage list from GET /claims/:id/track (`stages[]`). */
export function StageTimeline({ stages }) {
  return (
    <ol className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col" aria-label="Claim progress">
      {stages.map((stage, index) => {
        const done = stage.state === 'done';
        const current = stage.state === 'current';
        const bad = ['rejected', 'cancelled'].includes(stage.key);
        const last = index === stages.length - 1;
        return (
          <li key={stage.key} className="flex gap-4" aria-current={current ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  bad ? 'bg-red-500' : done ? 'bg-brand-blue' : current ? 'bg-white border-2 border-brand-blue' : 'bg-white border-2 border-slate-200'
                }`}
              >
                {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} aria-hidden="true" />}
                {bad && <X className="w-3.5 h-3.5 text-white" strokeWidth={3} aria-hidden="true" />}
                {current && !bad && <span className="w-2 h-2 rounded-full bg-brand-blue" />}
              </div>
              {!last && <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-brand-blue' : 'bg-slate-200'}`} style={{ minHeight: 28 }} />}
            </div>
            <div className="pb-5 flex flex-col gap-0.5">
              <span className={`text-sm font-bold ${done || current ? 'text-slate-900' : 'text-slate-400'}`}>
                {stage.label}
                {current && !bad && <span className="sr-only"> (current step)</span>}
              </span>
              <span className="text-xs text-slate-500">{stage.at ? formatDateTime(stage.at) : done ? 'Done' : current ? 'In progress' : 'Pending'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One upload slot (bill, warranty card, photo …). Uploads as soon as a file is
 * picked and reports `{ url, name, isPdf }` through onChange; shows progress,
 * a thumbnail or PDF chip, remove, and the error inline.
 */
export function DocumentTile({ label, icon: Icon = FileText, value, onChange, required = false, invalid = false }) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange(await uploadClaimDocument(file));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const showError = error || (invalid && !value ? 'Required' : '');
  return (
    <div className="flex-1 min-w-0">
      <input ref={inputRef} id={inputId} type="file" accept={DOCUMENT_ACCEPT} className="sr-only" onChange={pick} aria-describedby={showError ? errorId : undefined} />
      {value ? (
        <div className="relative flex flex-col items-center gap-1.5 py-3 px-2 bg-white border-2 border-emerald-300 rounded-2xl">
          {value.isPdf ? (
            <FileText className="h-9 w-9 text-brand-blue" aria-hidden="true" />
          ) : (
            <img src={resolveMediaUrl(value.url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight truncate w-full">{label}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex flex-col items-center gap-2 py-4 px-2 bg-white border rounded-2xl cursor-pointer focus-within:ring-2 focus-within:ring-brand-blue ${
            showError ? 'border-red-400 bg-red-50/40' : 'border-slate-200/80'
          }`}
        >
          <span className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            {busy ? <Loader2 className="h-5 w-5 text-brand-blue animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5 text-brand-blue" aria-hidden="true" />}
          </span>
          <span className="text-xs font-semibold text-slate-600 text-center leading-tight">
            {label}
            {required && <span aria-hidden="true" className="text-red-500"> *</span>}
          </span>
          <span className="text-xs font-bold text-brand-blue">{busy ? 'Uploading…' : 'Upload'}</span>
        </label>
      )}
      {showError && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {showError}
        </p>
      )}
    </div>
  );
}

/** "Add photo" button for any number of extra documents. */
export function AddDocumentButton({ onAdded, label = 'Add Photo' }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setError('');
    setBusy(true);
    try {
      for (const file of files) onAdded(await uploadClaimDocument(file));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <input id={inputId} type="file" accept={DOCUMENT_ACCEPT} multiple className="sr-only" onChange={pick} />
      <label
        htmlFor={inputId}
        className="w-20 h-20 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-2xl cursor-pointer gap-1 focus-within:ring-2 focus-within:ring-brand-blue"
      >
        <span className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
          {busy ? <Loader2 className="h-5 w-5 text-brand-blue animate-spin" aria-hidden="true" /> : <Camera className="h-5 w-5 text-brand-blue" aria-hidden="true" />}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{busy ? 'Uploading…' : label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** A small uploaded-file chip with an optional remove button. */
export function DocumentChip({ doc, label, onRemove }) {
  return (
    <div className="relative w-20 h-20 rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-1 overflow-hidden">
      {doc.isPdf || /\.pdf($|\?)/i.test(doc.url) ? (
        <FileText className="h-7 w-7 text-brand-blue" aria-hidden="true" />
      ) : (
        <img src={resolveMediaUrl(doc.url)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {label && <span className="relative text-[10px] font-bold text-slate-600 bg-white/85 px-1 rounded">{label}</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${doc.name || 'file'}`}
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center cursor-pointer"
        >
          <X className="h-3 w-3 text-slate-600" />
        </button>
      )}
    </div>
  );
}

export function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="underline font-bold cursor-pointer">
          Retry
        </button>
      )}
    </div>
  );
}
