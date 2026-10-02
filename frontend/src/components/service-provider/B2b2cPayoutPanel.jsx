import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { Skeleton } from '../common/Skeleton';

// Earnings → InvoicePayout → Warranty (B2B2C) (docs/partner-warranty Phase 15,
// client #20): partner-warranty jobs are paid by NCC and settled by hand, so
// this shows totals, by brand and by product, and each job's settlement — and
// has no request button.

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Breakdown({ title, rows, keyName }) {
  if (!rows?.length) return null;
  return (
    <div>
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">{title}</h4>
      <ul className="divide-y divide-blue-100">
        {rows.map((r) => (
          <li key={r[keyName]} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className="font-semibold text-[#052355] truncate">{r[keyName]}</span>
            <span className="text-right shrink-0">
              <span className="font-bold text-[#052355]">{inr(r.amount)}</span>
              <span className="text-slate-500"> · {r.jobs} job{r.jobs === 1 ? '' : 's'}</span>
              {r.pending > 0 && <span className="block text-[10px] text-amber-700">{inr(r.pending)} pending</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function B2b2cPayoutPanel() {
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/service-provider/warranty-jobs/payouts', { auth: true }),
      apiRequest('/service-provider/warranty-jobs/payouts/jobs', { auth: true }),
    ])
      .then(([s, list]) => {
        if (!active) return;
        setSummary(s);
        setJobs(Array.isArray(list) ? list : []);
      })
      .catch((err) => active && setError(err.message || 'Could not load warranty earnings.'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="b2b2c-title" className="bg-white border border-blue-200/80 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="b2b2c-title" className="text-xs font-bold text-[#052355] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#1E6BDB]" aria-hidden="true" /> Partner Warranty (B2B2C)
        </h3>
        <span className="text-[9px] font-black text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md whitespace-nowrap">Settled manually by NCC</span>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold">
          {error}
        </p>
      )}
      {!summary && !error && <Skeleton className="h-20 w-full" />}

      {summary && (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Total earned', summary.amount, `${summary.jobs} job${summary.jobs === 1 ? '' : 's'}`],
              ['Pending', summary.pending.amount, `${summary.pending.jobs} to settle`],
              ['Settled', summary.settled.amount, `${summary.settled.jobs} paid`],
            ].map(([label, amount, sub]) => (
              <div key={label} className="bg-blue-50/70 rounded-xl p-2">
                <dt className="text-[10px] font-bold text-slate-500">{label}</dt>
                <dd className="text-base font-black text-[#052355]">{inr(amount)}</dd>
                <dd className="text-[10px] text-slate-500">{sub}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[10.5px] text-slate-600">
            Warranty jobs are paid by NCC, not the customer. They aren’t added to your withdrawable balance — NCC transfers them to your bank account and records the reference here.
          </p>
          {summary.jobs === 0 ? (
            <p className="text-xs text-slate-500">No completed warranty jobs yet.</p>
          ) : (
            <>
              <Breakdown title="By brand" rows={summary.byBrand} keyName="brand" />
              <Breakdown title="By product" rows={summary.byProduct} keyName="product" />
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Jobs</h4>
                <ul className="divide-y divide-slate-100">
                  {jobs.map((j) => (
                    <li key={j.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                      <span className="min-w-0">
                        <span className="block font-mono font-semibold text-[#052355]">{j.jobId}</span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {[j.brand, j.product].filter(Boolean).join(' · ')} · {fmtDate(j.completedAt)}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-bold text-[#052355]">{inr(j.amount)}</span>
                        {j.status === 'settled' ? (
                          <span className="block text-[10px] font-semibold text-emerald-700">
                            Settled {fmtDate(j.settledAt)}
                            {j.reference ? ` · ${j.reference}` : ''}
                          </span>
                        ) : (
                          <span className="block text-[10px] font-semibold text-amber-700">Awaiting NCC settlement</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
