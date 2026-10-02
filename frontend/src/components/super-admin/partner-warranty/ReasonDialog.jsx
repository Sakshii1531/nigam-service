import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

/**
 * A native <dialog> asking for the reason every Super Admin override needs
 * (docs/partner-warranty Phase 8). `extra` renders fields above the reason;
 * `onSubmit(reason)` may throw — its message is shown inline.
 */
export default function ReasonDialog({ open, title, help, submitLabel = 'Confirm', tone = 'bg-[#0D47A1] hover:bg-blue-800', reasonLabel = 'Reason', minLength = 3, extra, onSubmit, onClose }) {
  const ref = useRef(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < minLength) {
      setError(`Please give a reason (at least ${minLength} characters).`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(reason.trim());
      setReason('');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="pw-reason-title" className="rounded-2xl p-0 w-full max-w-lg backdrop:bg-black/40 backdrop:backdrop-blur-sm m-auto">
      {open && (
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <h2 id="pw-reason-title" className="font-bold text-sm text-[#1E293B]">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-[#F1F5F9]">
              <X size={16} />
            </button>
          </div>
          {help && <p className="text-xs text-[#64748B]">{help}</p>}
          {extra}
          <label htmlFor="pw-reason" className="block text-xs font-semibold text-[#1E293B]">
            {reasonLabel} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="pw-reason"
            rows={3}
            required
            minLength={minLength}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0D47A1] user-invalid:border-red-400"
          />
          <p className="text-[10px] text-[#94A3B8]">Recorded in the claim's audit trail.</p>
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] text-[#64748B]">
              Cancel
            </button>
            <button type="submit" disabled={busy} className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60 ${tone}`}>
              {busy && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {submitLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
