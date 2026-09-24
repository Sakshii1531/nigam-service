import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { catalogueAdmin, formatINR, RATE_FIELD_LABELS } from '../../../lib/catalogueAdminApi';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from './ui';

// "Change price / payout" for one offering. Only the amounts actually edited
// are sent — the backend carries every other amount forward, which is what
// keeps a customer-price change from ever moving the partner payout (client
// Test 8). The margin preview is admin-only arithmetic for the admin's eyes;
// the real numbers are recomputed server-side.

const FIELDS = ['customerPrice', 'spPayout', 'expressFee', 'expressSpIncentive'];

const marginPercent = (price, payout) => (price > 0 ? Math.round(((price - payout) / price) * 1000) / 10 : null);

export default function RateChangeModal({ offering, onClose, onSaved }) {
  const current = offering.rate || {};
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((f) => [f, current[f] ?? ''])));
  const [when, setWhen] = useState('now');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState('');
  const [confirmedLoss, setConfirmedLoss] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changed = FIELDS.filter((f) => values[f] !== '' && Number(values[f]) !== Number(current[f]));
  const next = { ...current, ...Object.fromEntries(changed.map((f) => [f, Number(values[f])])) };
  const payoutAbovePrice = next.spPayout > next.customerPrice;

  const save = async (e) => {
    e.preventDefault();
    if (!changed.length) return setError('Change at least one amount.');
    if (payoutAbovePrice && !confirmedLoss) return setError('Confirm that the payout is meant to be higher than the customer price.');
    setSaving(true);
    setError('');
    try {
      const body = { reason: reason.trim(), ...Object.fromEntries(changed.map((f) => [f, Number(values[f])])) };
      if (when === 'later' && effectiveFrom) body.effectiveFrom = new Date(effectiveFrom).toISOString();
      const updated = await catalogueAdmin.changeRate(offering.id, body);
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Could not save the new rate.');
      setSaving(false);
    }
  };

  const beforeMargin = marginPercent(current.customerPrice, current.spPayout);
  const afterMargin = marginPercent(next.customerPrice, next.spPayout);

  return (
    <Modal title="Change price / payout" subtitle={`${offering.code} · ${offering.name}`} onClose={onClose} width="max-w-lg">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <Field key={field} label={`${RATE_FIELD_LABELS[field]} (₹)`} hint={`Now ${formatINR(current[field])}`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values[field]}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                className={`${inputClass} ${changed.includes(field) ? 'ring-2 ring-amber-300 border-amber-300' : ''}`}
              />
            </Field>
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5" aria-live="polite">
          <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">Preview</p>
          {FIELDS.filter((f) => f === 'customerPrice' || f === 'spPayout' || changed.includes(f)).map((field) => (
            <p key={field} className="flex items-center gap-1.5 text-slate-700">
              <span className="w-40 text-slate-500">{RATE_FIELD_LABELS[field]}</span>
              {changed.includes(field) ? (
                <>
                  <span className="line-through text-slate-400">{formatINR(current[field])}</span>
                  <ArrowRight size={12} className="text-slate-400" />
                  <span className="font-bold">{formatINR(next[field])}</span>
                </>
              ) : (
                <span className="font-semibold">{formatINR(current[field])} <span className="text-slate-400 font-normal">(unchanged)</span></span>
              )}
            </p>
          ))}
          <p className="flex items-center gap-1.5 text-slate-700">
            <span className="w-40 text-slate-500">NCC margin (ex-GST)</span>
            <span>{beforeMargin ?? '—'}%</span>
            {afterMargin !== beforeMargin && (
              <>
                <ArrowRight size={12} className="text-slate-400" />
                <span className="font-bold">{afterMargin ?? '—'}%</span>
              </>
            )}
          </p>
        </div>

        {payoutAbovePrice && (
          <label className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span className="flex-1">
              The partner payout ({formatINR(next.spPayout)}) is higher than the customer price ({formatINR(next.customerPrice)}). NCC will lose money on every booking.
              <span className="flex items-center gap-2 mt-2 font-bold">
                <input type="checkbox" checked={confirmedLoss} onChange={(e) => setConfirmedLoss(e.target.checked)} /> This is intentional
              </span>
            </span>
          </label>
        )}

        <Field label="Takes effect" group>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} /> Immediately
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /> From
            </label>
            {when === 'later' && (
              <input
                type="datetime-local"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={`${inputClass} w-auto`}
              />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Existing bookings keep the price they were booked at.</p>
        </Field>

        <Field label="Reason (saved in history)">
          <input required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="e.g. Client rate sheet Oct 2026" />
        </Field>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || !changed.length}>{saving ? 'Saving…' : 'Save new rate'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
