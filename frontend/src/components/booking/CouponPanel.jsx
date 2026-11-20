import { useEffect, useState } from 'react';
import { BadgePercent, CheckCircle2, ChevronDown, Lock, Tag, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const rupees = (n) => { const v = Number(n || 0); return `₹${v.toLocaleString('en-IN', Number.isInteger(v) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };

/**
 * Coupons for a service booking: a code box, the coupons this order can use
 * (best saving first) and the ones it can't, each with the reason. Coupons are
 * made by the admin (Super Admin → Rewards → Coupon Codes); whether one
 * applies, and how much it saves, is decided by the server.
 */
export default function CouponPanel({ signedIn, orderValue, categoryKey, appliedCode, appliedDiscount, onApply, onRemove, message, singleLine = true }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showIneligible, setShowIneligible] = useState(false);
  const value = Math.round(Number(orderValue) || 0);

  useEffect(() => {
    if (!signedIn || !singleLine) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      apiRequest('/coupons/checkout', { method: 'POST', auth: true, body: { scope: 'service', orderValue: value, categoryKey: categoryKey || null } })
        .then((rows) => {
          if (!alive) return;
          setList(Array.isArray(rows) ? rows : []);
          setError('');
        })
        .catch((err) => alive && setError(err.message || 'Could not load coupons.'));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [signedIn, singleLine, value, categoryKey]);

  const eligible = (list || []).filter((c) => c.eligible);
  const ineligible = (list || []).filter((c) => !c.eligible);
  const visibleEligible = showAll ? eligible : eligible.slice(0, 3);

  const apply = (code) => {
    setInput('');
    onApply(code.trim().toUpperCase());
  };

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col gap-3" aria-labelledby="booking-coupons">
      <div className="flex items-center justify-between">
        <h3 id="booking-coupons" className="text-[12px] font-black text-slate-900 flex items-center gap-1.5">
          <BadgePercent className="w-4 h-4 text-brand-blue" /> Coupons &amp; offers
        </h3>
        {list && eligible.length > 0 && !appliedCode && (
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{eligible.length} available</span>
        )}
      </div>

      {!singleLine ? (
        <p className="text-[11px] font-semibold text-slate-500">Coupons apply when you book one service at a time.</p>
      ) : (
        <>
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <span className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12px] font-black text-emerald-800">{appliedCode} applied</span>
                  {appliedDiscount > 0 && <span className="block text-[11px] font-bold text-emerald-700">You save {rupees(appliedDiscount)}</span>}
                </span>
              </span>
              <button type="button" onClick={onRemove} className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) apply(input);
              }}
              className="flex gap-2"
            >
              <label className="sr-only" htmlFor="booking-coupon">Coupon code</label>
              <input
                id="booking-coupon"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter coupon code"
                autoComplete="off"
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold uppercase outline-none focus:border-brand-blue placeholder:normal-case placeholder:font-semibold"
              />
              <button type="submit" disabled={!input.trim()} className="px-4 rounded-xl bg-brand-blue text-white text-xs font-black disabled:opacity-40 cursor-pointer">
                Apply
              </button>
            </form>
          )}
          {message && <p role="alert" className="text-[11px] font-bold text-rose-600">{message}</p>}

          {!signedIn ? (
            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Log in to see the coupons available to you.</p>
          ) : error ? (
            <p className="text-[11px] font-semibold text-rose-600">{error}</p>
          ) : list === null ? (
            <div className="h-16 rounded-xl bg-slate-100 animate-pulse" aria-label="Loading coupons" />
          ) : list.length === 0 ? (
            <p className="text-[11px] font-semibold text-slate-500">No coupons right now. Check back soon.</p>
          ) : (
            <>
              {eligible.length > 0 && (
                <ul className="flex flex-col gap-2" aria-label="Coupons you can use">
                  {visibleEligible.map((c) => (
                    <CouponTicket key={c.code} coupon={c} applied={c.code === appliedCode} onApply={() => apply(c.code)} />
                  ))}
                </ul>
              )}
              {eligible.length > 3 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-[11px] font-black text-brand-blue cursor-pointer">
                  {showAll ? 'Show fewer' : `View all ${eligible.length} coupons`}
                </button>
              )}
              {ineligible.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowIneligible((v) => !v)}
                    aria-expanded={showIneligible}
                    className="w-full flex items-center justify-between text-[11px] font-black text-slate-500 py-1 cursor-pointer"
                  >
                    <span>Not applicable to this booking ({ineligible.length})</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showIneligible ? 'rotate-180' : ''}`} />
                  </button>
                  {showIneligible && (
                    <ul className="mt-2 flex flex-col gap-2" aria-label="Coupons not applicable">
                      {ineligible.map((c) => <CouponTicket key={c.code} coupon={c} />)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function CouponTicket({ coupon, applied = false, onApply }) {
  const usable = coupon.eligible;
  return (
    <li className={`relative flex rounded-xl border overflow-hidden ${usable ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`w-12 shrink-0 flex items-center justify-center ${usable ? 'bg-linear-to-b from-emerald-500 to-emerald-600' : 'bg-slate-300'}`}>
        <span className="-rotate-90 whitespace-nowrap text-[10px] font-black tracking-widest text-white">
          {coupon.discountType === 'percent' ? `${coupon.discount}% OFF` : `₹${coupon.discount} OFF`}
        </span>
      </div>
      <div className="flex-1 min-w-0 p-3 border-l-2 border-dashed border-slate-200">
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md border border-dashed px-1.5 py-0.5 text-[11px] font-black tracking-wide ${usable ? 'border-emerald-400 text-emerald-700' : 'border-slate-300 text-slate-500'}`}>
            <Tag className="w-3 h-3" /> {coupon.code}
          </span>
          {usable && onApply && (
            <button
              type="button"
              onClick={onApply}
              disabled={applied}
              className={`text-[11px] font-black cursor-pointer ${applied ? 'text-emerald-600' : 'text-brand-blue'}`}
              aria-label={`Apply ${coupon.code}`}
            >
              {applied ? 'Applied' : 'Apply'}
            </button>
          )}
        </div>
        <p className={`mt-1.5 text-[12.5px] font-black leading-snug ${usable ? 'text-slate-900' : 'text-slate-500'}`}>{coupon.title}</p>
        {coupon.description && <p className="text-[11px] font-semibold text-slate-500 leading-snug">{coupon.description}</p>}
        {usable ? (
          <p className="mt-1 text-[11px] font-black text-emerald-700">You save {rupees(coupon.savings)} on this booking</p>
        ) : (
          <p className="mt-1 text-[11px] font-bold text-amber-700">{coupon.reason}</p>
        )}
        {coupon.expiry && (
          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Valid till {new Date(coupon.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        )}
      </div>
    </li>
  );
}
