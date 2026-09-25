import { useState } from 'react';
import { MapPin, Plus, Pencil, XCircle } from 'lucide-react';
import { catalogueAdmin, formatINR } from '../../../lib/catalogueAdminApi';
import { ErrorNote, SecondaryButton } from './ui';

// City and pincode prices for one offering (docs/master-catalogue Phase 10).
// Customers in that city / pincode pay the local price instead of the default;
// a pincode price beats a city price. Ending one sends that location back to
// the next price down — the version stays in the history.

const label = (scope) => (scope.type === 'CITY' ? scope.value : `Pincode ${scope.value}`);

export default function LocalPricesPanel({ offering, onChangeRate, onRatesChanged }) {
  const [ending, setEnding] = useState(null);
  const [error, setError] = useState('');
  const locals = offering.localRates || [];

  const end = async (local) => {
    const reason = window.prompt(`Why end the ${label(local.scope)} price? (saved in history)`);
    if (!reason || reason.trim().length < 3) return;
    setEnding(local);
    setError('');
    try {
      await catalogueAdmin.endLocalRate(offering.id, { scope: local.scope, reason: reason.trim() });
      onRatesChanged();
    } catch (err) {
      setError(err.message || 'Could not end the local price.');
    } finally {
      setEnding(null);
    }
  };

  return (
    <section aria-label="Local prices" className="border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin size={14} className="text-[#0D47A1]" /> Local prices
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">A different price and payout for one city or pincode. Pincode beats city beats default.</p>
        </div>
        <SecondaryButton type="button" onClick={() => onChangeRate(offering, { type: 'CITY', value: '', isNew: true })} disabled={!offering.rate}>
          <Plus size={14} /> Add city / pincode price
        </SecondaryButton>
      </div>

      {locals.length === 0 ? (
        <p className="text-xs text-slate-400">No local prices — every location pays {formatINR(offering.rate?.customerPrice)}.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-slate-400 text-left">
              <th className="py-1.5">Location</th>
              <th className="py-1.5 text-right">Customer price</th>
              <th className="py-1.5 text-right">SP payout</th>
              <th className="py-1.5 text-right">Express</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {locals.map((local) => (
              <tr key={`${local.scope.type}:${local.scope.value}`}>
                <td className="py-2 font-bold text-slate-800">
                  {label(local.scope)}
                  {local.scheduled && <span className="ml-1.5 text-[10px] font-black uppercase text-amber-700">Scheduled</span>}
                </td>
                <td className="py-2 text-right font-bold">{formatINR(local.rate.customerPrice)}</td>
                <td className="py-2 text-right">{formatINR(local.rate.spPayout)}</td>
                <td className="py-2 text-right text-slate-500">
                  {formatINR(local.rate.expressFee)} / {formatINR(local.rate.expressSpIncentive)}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onChangeRate(offering, local.scope)}
                    aria-label={`Change ${label(local.scope)} price`}
                    className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => end(local)}
                    disabled={ending === local}
                    aria-label={`End ${label(local.scope)} price`}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ErrorNote message={error} />
    </section>
  );
}
