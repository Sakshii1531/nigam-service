import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';

// The visit history behind this contract, read from the server. This file used
// to ship two invented visits — including a TDS reading and the technician
// names "Rahul S." and "Amir K." — that were shown for every AMC job against
// real customers.

const statusIcon = (type, status) => {
  if (status === 'completed' && type === 'scheduled') {
    return <CheckCircle className="h-5 w-5 text-[#00C853] flex-shrink-0 mt-0.5" />;
  }
  if (type === 'unscheduled') {
    return <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />;
  }
  return <Clock className="h-5 w-5 text-[#0D47A1] flex-shrink-0 mt-0.5" />;
};

const AMCHistoryDrawer = ({ job, onStartVisit }) => {
  const [history, setHistory] = useState({ subscription: null, visits: [] });
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!job?.id) return;
    let cancelled = false;
    apiRequest(`/tech/jobs/${job.id}/amc-history`, { auth: true })
      .then((res) => { if (!cancelled) setHistory(res.data || { subscription: null, visits: [] }); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load the AMC history.'); });
    return () => { cancelled = true; };
  }, [job?.id]);

  const AMC_HISTORY = history.visits.map((v) => ({
    id: v.id,
    type: 'scheduled',
    visitNumber: v.visitNumber,
    date: v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled',
    label: `Visit ${v.visitNumber}${history.subscription?.visitsTotal ? ` of ${history.subscription.visitsTotal}` : ''} — ${v.status}`,
    tasks: v.tasks,
    technician: v.technician || 'Unassigned',
    status: v.status === 'Completed' ? 'completed' : 'pending',
    notes: v.notes,
  }));

  const totalVisits = history.subscription?.visitsTotal ?? job?.amcVisitsTotal ?? 0;
  const currentVisitsRemaining = history.subscription?.visitsRemaining ?? job?.amcVisitsRemaining ?? 0;
  const currentVisitNum = AMC_HISTORY.length + 1;

  // Months remaining calc
  const expiryDate = history.subscription?.expiryDate
    ? new Date(history.subscription.expiryDate)
    : job?.amcPlanExpiry ? new Date(job.amcPlanExpiry) : null;
  const now = new Date();
  // Null when no expiry is recorded — the screens must say so rather than
  // measure against a hardcoded 2027 date, which is what this used to do.
  const monthsLeft = expiryDate
    ? Math.max(0, (expiryDate.getFullYear() - now.getFullYear()) * 12 + (expiryDate.getMonth() - now.getMonth()))
    : null;

  return (
    <div className="fixed inset-0 bg-[#052355]/50 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">

        {/* Drawer Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#052355]">Service History</h2>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                Review before starting today's visit
              </p>
            </div>
            {/* AMC Summary Chip */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 text-right">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block">
                {job?.amcPlanName || 'AMC Gold Plan'}
              </span>
              <span className="text-[10px] text-amber-600 font-normal block mt-0.5">
                {monthsLeft === null ? 'Expiry not recorded' : `${monthsLeft}m left`} · {currentVisitsRemaining}/{totalVisits} visits left
              </span>
            </div>
          </div>
        </div>

        {/* Timeline — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Past visits recorded against this contract */}
          {loadError && (
            <p className="text-[11px] font-bold text-red-600 px-1 py-2">{loadError}</p>
          )}
          {!loadError && AMC_HISTORY.length === 0 && (
            <p className="text-[11px] font-semibold text-slate-400 px-1 py-4 text-center">
              No previous visits recorded on this contract.
            </p>
          )}
          {AMC_HISTORY.map((entry, idx) => (
            <div key={entry.id} className="flex gap-3.5 relative">
              {/* Connector line */}
              {idx < AMC_HISTORY.length && (
                <div className="absolute left-[9px] top-6 bottom-[-20px] w-[2px] bg-slate-100 z-0" />
              )}
              {statusIcon(entry.type, entry.status)}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2 text-left">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    entry.type === 'scheduled'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {entry.type === 'scheduled' ? `Visit ${entry.visitNumber}` : 'Unscheduled'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">{entry.date}</span>
                </div>

                {entry.type === 'scheduled' ? (
                  <div className="flex flex-col gap-1.5">
                    {entry.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span className="text-[11px] text-slate-700 font-normal">{task}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1.5 items-start">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-slate-600 font-normal">
                        <strong className="text-slate-700">Complaint:</strong> {entry.complaint}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-start mt-0.5">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-slate-600 font-normal">
                        <strong className="text-slate-700">Action:</strong> {entry.action}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200/70 pt-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-normal">
                    Technician: <strong className="text-[#052355]">{entry.technician}</strong>
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* TODAY's visit — Current */}
          <div className="flex gap-3.5 relative">
            <Clock className="h-5 w-5 text-[#0D47A1] flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 bg-[#E3ECF9] border-2 border-[#0D47A1]/30 rounded-2xl p-3.5 flex flex-col gap-2 text-left">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D47A1] text-white">
                  Visit {currentVisitNum} — TODAY
                </span>
                <span className="text-[10px] text-[#0D47A1] font-semibold">Now</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-[#0D47A1] flex-shrink-0" />
                  <span className="text-[11px] text-[#052355] font-semibold">Carbon Filter Check — Due Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-[#0D47A1] flex-shrink-0" />
                  <span className="text-[11px] text-[#052355] font-semibold">TDS Level Check — Due Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="text-[11px] text-amber-700 font-semibold">Follow-up: Verify water flow (Apr issue)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onStartVisit}
            className="w-full bg-[#FFA000] hover:bg-amber-500 text-white font-semibold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            Understood, Start Visit
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default AMCHistoryDrawer;
