import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const STEPS = [
  { id: 'raised', label: 'Request Raised', date: '25 May 2024, 02:30 PM', done: true },
  { id: 'verification', label: 'Under Brand Verification', date: '25 May 2024, 01:15 PM', done: true },
  { id: 'approved', label: 'Approved by Brand', date: 'Pending', done: false },
  { id: 'expert', label: 'Assigned to Expert', date: 'Pending', done: false },
  { id: 'progress', label: 'Service In Progress', date: 'Pending', done: false },
  { id: 'completed', label: 'Completed', date: 'Pending', done: false },
];

const TrackTicket = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId } = location.state || { ticketId: 'NCCW-2024-000123' };

  // Active step = last done step
  const activeIndex = STEPS.reduce((acc, s, i) => s.done ? i : acc, 0);

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
          Track Ticket
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* Merged Status + Ticket Info Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          {/* Top: Status (light blue bg) */}
          <div className="bg-blue-50 px-5 py-4 flex flex-col gap-1 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-blue" />
              <span className="text-sm font-black text-brand-navy">Under Brand Verification</span>
            </div>
            <p className="text-xs text-slate-500 pl-5">Your request is being verified by the partner brand.</p>
          </div>

          {/* Bottom: Ticket Info */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 font-semibold tracking-wide">Raised on</span>
              <span className="text-xs text-slate-500">25 May 2024, 12:30 PM</span>
            </div>
            <button
              onClick={() => navigate('/partner-warranty/ticket-details', { state: { ticketId } })}
              className="flex flex-col gap-0.5 items-end cursor-pointer"
            >
              <span className="text-xs text-slate-400 font-semibold tracking-wide">Ticket ID</span>
              <span className="text-sm font-black text-brand-navy tracking-wide underline underline-offset-2">{ticketId}</span>
            </button>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col">
          {STEPS.map((step, index) => {
            const isDone = step.done;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.id} className="flex gap-4">
                {/* Left: icon + vertical line */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isDone
                      ? 'bg-brand-blue'
                      : 'bg-white border-2 border-slate-200'
                  }`}>
                    {isDone && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 ${isDone ? 'bg-brand-blue' : 'bg-slate-200'}`} style={{ minHeight: 28 }} />
                  )}
                </div>

                {/* Right: text */}
                <div className="pb-5 flex flex-col gap-0.5">
                  <span className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  <span className={`text-xs ${isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                    {step.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default TrackTicket;
