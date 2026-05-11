import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const service = searchParams.get('service');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glows for Premium Feel */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#E3ECF9] rounded-full blur-3xl opacity-70"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#E8F5E9] rounded-full blur-3xl opacity-70"></div>

      <div className="w-full max-w-md p-6 flex flex-col items-center text-center gap-5 relative z-10">
        
        {/* Animated-like Success Icon */}
        <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle className="h-10 w-10 text-[#2E7D32]" />
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-text-primary mb-1">Booking Confirmed!</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Your service has been successfully booked.<br />
            A professional technician will be assigned soon.
          </p>
        </div>
        
        {/* Ticket-style Booking ID */}
        <div className="w-full bg-[#E3ECF9]/50 border border-[#BACBE7] p-3 rounded-2xl text-left relative">
          <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-r border-[#BACBE7]"></div>
          <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-l border-[#BACBE7]"></div>
          <span className="text-xs text-text-secondary block mb-0.5">Booking ID</span>
          <span className="font-bold text-text-primary text-base tracking-wider">#NC-98234</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3 mt-1">
          <button
            onClick={() => {
              const trackingUrl = service === 'Refrigerator Service' ? '/tracking?service=refrigerator' : '/tracking';
              navigate(trackingUrl);
            }}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-sm active:scale-[0.98] text-sm"
          >
            Track Booking <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-2xl border border-border-color font-semibold text-text-primary hover:bg-slate-50 transition-all active:scale-[0.98] text-sm"
          >
            Go to Home
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default BookingSuccess;
