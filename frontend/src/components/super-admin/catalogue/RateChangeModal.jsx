import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { catalogueAdmin, formatINR, RATE_FIELD_LABELS } from '../../../lib/catalogueAdminApi';
import { Modal, Field, inputClass, ErrorNote, PrimaryButton, SecondaryButton } from './ui';

// "Change price / payout" for one offering. Only the amounts actually edited
// are sent — the backend carries every other amount forward, which is what
// keeps a customer-price change from ever moving the partner payout (client
// Test 8). The margin preview is admin-only arithmetic for the admin's eyes;
// the real numbers are recomputed server-side.
//
// `scope` picks which price list is edited (docs/master-catalogue Phase 10):
//   undefined                      → the default price (everywhere)
//   { type, value, isNew: true }   → a new city / pincode price (type/value editable)
//   { type: 'CITY', value: 'Jaipur' } → that location's existing price
// A new location starts from the default amounts and sends all four, because
// its first version needs every amount.

const sameScope = (a, b) => a.type === b.type && String(a.value || '').toLowerCase() === String(b.value || '').toLowerCase();
const scopeText = (scope) => (scope.type === 'CITY' ? scope.value : `pincode ${scope.value}`);

const FIELDS = ['customerPrice', 'spPayout', 'expressFee', 'expressSpIncentive'];

const marginPercent = (price, payout) => (price > 0 ? Math.round(((price - payout) / price) * 1000) / 10 : null);

export default function RateChangeModal({ offering, scope: initialScope, cities = [], onClose, onSaved }) {
  const isLocal = Boolean(initialScope);
  const creatingLocal = Boolean(initialScope?.isNew);
  const [target, setTarget] = useState(() => (initialScope ? { type: initialScope.type, value: initialScope.value || '' } : { type: 'DEFAULT', value: '' }));
  const existingLocal = isLocal && target.value ? (offering.localRates || []).find((l) => sameScope(l.scope, target)) : null;
  // The numbers this change starts from: the location's own price, or — for a new location — the default price.
  const current = (existingLocal ? existingLocal.rate : offering.rate) || {};
  const newLocation = isLocal && !existingLocal;
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((f) => [f, current[f] ?? ''])));
  const [when, setWhen] = useState('now');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState('');
  const [confirmedLoss, setConfirmedLoss] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const edited = FIELDS.filter((f) => values[f] !== '' && Number(values[f]) !== Number(current[f]));
  const changed = newLocation ? FIELDS.filter((f) => values[f] !== '') : edited;
  const targetReady = !isLocal || (target.type === 'PINCODE' ? /^\d{6}$/.test(target.value) : target.value.trim().length > 0);
  const next = { ...current, ...Object.fromEntries(changed.map((f) => [f, Number(values[f])])) };
  const payoutAbovePrice = next.spPayout > next.customerPrice;

  const save = async (e) => {
    e.preventDefault();
    if (!targetReady) return setError(target.type === 'PINCODE' ? 'Enter a 6-digit pincode.' : 'Choose the city.');
    if (!changed.length) return setError('Change at least one amount.');
    if (payoutAbovePrice && !confirmedLoss) return setError('Confirm that the payout is meant to be higher than the customer price.');
    setSaving(true);
    setError('');
    try {
      const body = { reason: reason.trim(), ...Object.fromEntries(changed.map((f) => [f, Number(values[f])])) };
      if (isLocal) body.scope = { type: target.type, value: target.value.trim() };
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
    <Modal
      title="Change price / payout"
      subtitle={`${offering.code} · ${offering.name}${isLocal && !creatingLocal ? ` · ${scopeText(target)}` : ''}`}
      onClose={onClose}
      width="max-w-lg"
    >
      <form onSubmit={save} className="space-y-4">
        {creatingLocal && (
          <Field label="Applies to" group hint="Customers there pay this instead of the default price. Everyone else keeps the default.">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {[
                ['CITY', 'A city'],
                ['PINCODE', 'A pincode'],
              ].map(([type, label]) => (
                <label key={type} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="scope-type" checked={target.type === type} onChange={() => setTarget({ type, value: '' })} /> {label}
                </label>
              ))}
              {target.type === 'CITY' ? (
                <>
                  <input
                    aria-label="City"
                    list="rate-cities"
                    required
                    value={target.value}
                    onChange={(e) => setTarget((t) => ({ ...t, value: e.target.value }))}
                    placeholder="e.g. Jaipur"
                    className={`${inputClass} w-44`}
                  />
                  <datalist id="rate-cities">
                    {cities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              ) : (
                <input
                  aria-label="Pincode"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={target.value}
                  onChange={(e) => setTarget((t) => ({ ...t, value: e.target.value.replace(/\D/g, '') }))}
                  placeholder="6 digits"
                  className={`${inputClass} w-32`}
                />
              )}
            </div>
            {existingLocal && (
              <p className="text-[11px] text-amber-700 mt-1">
                {scopeText(existingLocal.scope)} already has a price ({formatINR(existingLocal.rate.customerPrice)}) — this saves a new version of it.
              </p>
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <Field key={field} label={`${RATE_FIELD_LABELS[field]} (₹)`} hint={newLocation ? `Default ${formatINR(current[field])}` : `Now ${formatINR(current[field])}`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values[field]}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                className={`${inputClass} ${edited.includes(field) ? 'ring-2 ring-amber-300 border-amber-300' : ''}`}
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
          <PrimaryButton type="submit" disabled={saving || !changed.length || !targetReady}>
            {saving ? 'Saving…' : newLocation ? 'Save local price' : 'Save new rate'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
