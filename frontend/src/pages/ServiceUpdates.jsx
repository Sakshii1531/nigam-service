import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const UPDATES = [
  {
    id: 'assigned',
    label: 'Technician Assigned',
    desc: 'Rohit Kumar has been assigned to your request.',
    date: '25 May 2024, 03:15 PM',
    done: true,
  },
  {
    id: 'onway',
    label: 'On the Way',
    desc: 'Technician is on the way to your location.',
    date: '25 May 2024, 04:05 PM',
    done: true,
  },
  {
    id: 'started',
    label: 'Service Started',
    desc: 'Technician has started working on your product.',
    date: '25 May 2024, 04:20 PM',
    done: true,
  },
  {
    id: 'completed',
    label: 'Service Completed',
    desc: 'Your service has been completed successfully.',
    date: '25 May 2024, 06:10 PM',
    done: true,
  },
];

const ServiceUpdates = () => {
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
          Service Updates
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-5 flex flex-col">
          {UPDATES.map((update, index) => {
            const isLast = index === UPDATES.length - 1;
            return (
              <div key={update.id} className="flex gap-4">
                {/* Icon + Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${update.done ? 'bg-green-500' : 'bg-white border-2 border-slate-200'}`}>
                    {update.done && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 ${update.done ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: 32 }} />
                  )}
                </div>

                {/* Text */}
                <div className="pb-6 flex flex-col gap-0.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{update.label}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{update.date}</span>
                  </div>
                  <span className="text-xs text-slate-500 leading-relaxed">{update.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rate Service Button */}
      <div className="px-6 pb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => navigate('/partner-warranty/rate-service', { state: { ticketId } })}
          className="w-full py-4 bg-brand-navy text-white font-bold text-base rounded-2xl cursor-pointer tracking-wide"
        >
          Rate Service
        </button>
      </div>

    </div>
  );
};

export default ServiceUpdates;
