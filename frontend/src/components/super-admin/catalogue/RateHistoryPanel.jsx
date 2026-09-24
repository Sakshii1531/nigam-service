import { useEffect, useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { catalogueAdmin, formatINR, RATE_FIELD_LABELS } from '../../../lib/catalogueAdminApi';

// Every price/payout version of one offering, newest first — old value, new
// value, who, when, why, and from when it applies (client Req 26).

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function RateHistoryPanel({ offeringId, refreshKey }) {
  const requestKey = `${offeringId}:${refreshKey}`;
  // Tagged with the request it answers, so a stale list never shows while the next one loads.
  const [loaded, setLoaded] = useState({ key: null, history: null, error: '' });
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    catalogueAdmin
      .rateHistory(offeringId)
      .then((history) => alive && setLoaded({ key: requestKey, history, error: '' }))
      .catch((err) => alive && setLoaded({ key: requestKey, history: null, error: err.message || 'Could not load history.' }));
    return () => {
      alive = false;
    };
  }, [offeringId, requestKey]);

  if (loaded.key !== requestKey) return <p className="text-xs text-slate-400">Loading history…</p>;
  if (loaded.error) return <p className="text-xs text-red-600">{loaded.error}</p>;
  const { history } = loaded;

  return (
    <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
      {history.map((entry) => {
        const upcoming = new Date(entry.effectiveFrom).getTime() > now;
        const current = !upcoming && (!entry.effectiveUntil || new Date(entry.effectiveUntil).getTime() > now);
        return (
          <li key={entry.id} className="ml-4">
            <span className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 border-white ${current ? 'bg-green-500' : upcoming ? 'bg-amber-400' : 'bg-slate-300'}`} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-800">v{entry.version}</span>
              {entry.scope?.type !== 'DEFAULT' && (
                <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-700 px-1.5 rounded">{entry.scope.type}: {entry.scope.value}</span>
              )}
              {current && <span className="text-[10px] font-black uppercase text-green-700">Current</span>}
              {upcoming && <span className="text-[10px] font-black uppercase text-amber-700">Scheduled</span>}
              <span className="text-[11px] text-slate-400">from {formatDate(entry.effectiveFrom)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {entry.changedBy?.name || 'System seed'} · {formatDate(entry.createdAt)}
              {entry.reason && <> · “{entry.reason}”</>}
            </p>
            {entry.changes.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {entry.changes.map((c) => (
                  <li key={c.field} className="text-xs text-slate-700 flex items-center gap-1.5">
                    <span className="text-slate-500">{RATE_FIELD_LABELS[c.field]}</span>
                    <span className="line-through text-slate-400">{formatINR(c.from)}</span>
                    <ArrowRight size={11} className="text-slate-400" />
                    <span className="font-bold">{formatINR(c.to)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-700 mt-1">
                Initial rate: customer {formatINR(entry.customerPrice)} · SP payout {formatINR(entry.spPayout)} · express {formatINR(entry.expressFee)} / {formatINR(entry.expressSpIncentive)}
              </p>
            )}
          </li>
        );
      })}
      {history.length === 0 && (
        <li className="ml-4 text-xs text-slate-400 flex items-center gap-1.5">
          <History size={12} /> No rates yet.
        </li>
      )}
    </ol>
  );
}
