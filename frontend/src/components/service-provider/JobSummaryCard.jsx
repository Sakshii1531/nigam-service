import { useState } from "react";
import { ChevronDown, Zap, Info, IndianRupee } from "lucide-react";

// What the partner is booked to do and what they earn (docs/master-catalogue
// Phase 5) — all from the job context's `jobSummary`, which the server builds
// from the booking's frozen snapshot: the exact service (type · size ·
// quantity), express, the customer's answers, the offering's instructions and
// scope, the amount to collect, and the fixed payout. Never the NCC margin.

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function JobSummaryCard({ summary }) {
  const [open, setOpen] = useState(false);
  if (!summary) return null;

  const line = [summary.productType, summary.variant].filter(Boolean).join(" · ");
  const qty = summary.quantity > 1 ? ` × ${summary.quantity}` : "";
  const { customerAmount: amount, payout } = summary;

  return (
    <section
      aria-label="Booked service and earnings"
      className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-normal">Booked service</p>
          <p className="text-sm font-medium text-[#052355] leading-snug">
            {summary.serviceName}
            {qty}
          </p>
          {line && <p className="text-xs text-slate-500 mt-0.5">{line}</p>}
        </div>
        {summary.isExpress && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
            <Zap className="w-3 h-3" /> Express
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100">
          <p className="text-[10px] text-slate-500">
            {amount.toCollect > 0 ? "Collect from customer" : summary.coverage ? `Covered — ${summary.coverage}` : "Nothing to collect"}
          </p>
          <p className="text-base font-medium text-[#052355]">{inr(amount.toCollect)}</p>
          {amount.alreadyPaid > 0 && (
            <p className="text-[10px] text-slate-500">{inr(amount.alreadyPaid)} already paid online</p>
          )}
        </div>
        <div className="bg-[#E8F5E9] rounded-2xl p-2.5 border border-emerald-100">
          <p className="text-[10px] text-emerald-800">Your payout</p>
          <p className="text-base font-medium text-emerald-800">{inr(payout.total)}</p>
          {(payout.expressIncentive > 0 || payout.addOns > 0) && (
            <p className="text-[10px] text-emerald-700">
              {inr(payout.base)} base
              {payout.expressIncentive > 0 ? ` + ${inr(payout.expressIncentive)} express` : ""}
              {payout.addOns > 0 ? ` + ${inr(payout.addOns)} extra work` : ""}
            </p>
          )}
        </div>
      </div>

      {summary.requiredInfo.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {summary.requiredInfo.map((answer) => (
            <div key={answer.key} className="contents">
              <dt className="text-slate-500">{answer.label}</dt>
              <dd className="text-[#052355] font-medium">{answer.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {summary.customerInstructions && (
        <p className="text-xs text-slate-600 bg-blue-50/60 rounded-xl p-2.5 flex gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#1E6BDB] shrink-0 mt-0.5" />
          {summary.customerInstructions}
        </p>
      )}

      {(summary.included.length > 0 || summary.excluded.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-full flex items-center justify-between text-xs text-[#1E6BDB] font-medium">
            What's included in this job
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="grid grid-cols-2 gap-3 mt-2 text-[11px]">
              <ul className="space-y-0.5 text-slate-600">
                {summary.included.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <ul className="space-y-0.5 text-slate-400">
                {summary.excluded.map((item) => (
                  <li key={item}>✕ {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <IndianRupee className="w-3 h-3" /> Payout is fixed per job — spare parts are billed to the customer and don't change it.
      </p>
    </section>
  );
}
