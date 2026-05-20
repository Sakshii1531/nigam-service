import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const TicketSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId } = location.state || { ticketId: 'NCCW-2024-000123' };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col items-center justify-center p-6">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">

        {/* Success Icon with rays */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Decorative rays */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-4 rounded-full"
              style={{
                background: i % 2 === 0 ? '#22c55e' : i % 3 === 0 ? '#f59e0b' : '#3b82f6',
                transform: `rotate(${i * 45}deg) translateY(-38px)`,
                opacity: 0.7,
              }}
            />
          ))}
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center z-10">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Ticket Raised Successfully!</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your request has been submitted.<br />We will notify you once it is<br />verified by the brand.
          </p>
        </div>

        {/* Ticket ID box */}
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-6 py-4 text-center">
          <p className="text-xs text-slate-400 font-semibold tracking-wide mb-1">Ticket ID</p>
          <p className="text-base font-black text-brand-navy tracking-wider">{ticketId}</p>
        </div>

        {/* Track Ticket Button */}
        <button
          onClick={() => navigate('/partner-warranty/track-ticket', { state: { ticketId } })}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide"
        >
          Track Ticket
        </button>

        {/* Go to Home */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-bold text-brand-blue cursor-pointer"
        >
          Go to Home
        </button>

      </div>
    </div>
  );
};

export default TicketSuccess;
