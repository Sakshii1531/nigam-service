import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TIMELINE = [
  { id: 'raised', label: 'Request Raised', date: '25 May 2024, 12:30 PM', done: true },
  { id: 'approved', label: 'Approved by Brand', date: '25 May 2024, 02:45 PM', done: true },
  { id: 'expert', label: 'Assigned to Expert', date: '25 May 2024, 03:10 PM', done: true },
  { id: 'progress', label: 'Service In Progress', date: 'Pending', done: false },
  { id: 'completed', label: 'Completed', date: 'Pending', done: false },
];

const TicketDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId } = location.state || { ticketId: 'NCCW-2024-000123' };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-50 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">
          Ticket Details
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* Ticket Info Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex flex-col gap-4">

          {/* Ticket ID + Status Badge */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 font-semibold tracking-wide">Ticket ID</span>
              <span className="text-sm font-black text-brand-navy tracking-wide">{ticketId}</span>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Approved
            </span>
          </div>

          <div className="border-t border-slate-100" />

          {/* Brand */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold">Brand</span>
            <span className="text-sm font-bold text-slate-800">LG Electronics</span>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold">Product</span>
            <span className="text-sm font-bold text-slate-800">Air Conditioner</span>
          </div>

          {/* Issue */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold">Issue</span>
            <span className="text-sm font-bold text-slate-800">Cooling Issue</span>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-semibold">Status</span>
            <span className="text-sm font-bold text-green-600">Approved by Brand</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-black text-black tracking-wide pl-1">Timeline</h2>
          <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col">
            {TIMELINE.map((step, index) => {
              const isDone = step.done;
              const isLast = index === TIMELINE.length - 1;

              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isDone ? 'bg-green-500' : 'bg-white border-2 border-slate-200'
                    }`}>
                      {isDone && (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 my-1 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: 28 }} />
                    )}
                  </div>
                  <div className="pb-5 flex flex-col gap-0.5">
                    <span className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
                    <span className={`text-xs ${isDone ? 'text-slate-500' : 'text-slate-400'}`}>{step.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* View Updates Button */}
      <div className="px-6 pb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => navigate('/partner-warranty/service-updates', { state: { ticketId } })}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide"
        >
          View Updates
        </button>
      </div>

    </div>
  );
};

export default TicketDetails;
