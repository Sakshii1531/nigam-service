import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const service = searchParams.get('service');
  const type = searchParams.get('type');
  const price = searchParams.get('price');
  
  const isProduct = type === 'product';

  const invoiceNumber = React.useMemo(() => {
    return `NIG-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glows for Premium Feel */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#E3ECF9] rounded-full blur-3xl opacity-70"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#E8F5E9] rounded-full blur-3xl opacity-70"></div>

      <div className="w-full max-w-md bg-white p-6 rounded-[30px] shadow-xl flex flex-col items-center text-center gap-5 relative z-10 border border-border-color">
        
        {/* Animated Success Icon */}
        <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle className="h-9 w-9 text-[#2E7D32]" />
        </div>
        
        <div>
          <h1 className="text-lg font-bold text-text-primary mb-1">
            Payment Successful!
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            {isProduct 
              ? 'Thank you! Your appliance delivery has been scheduled.'
              : 'Thank you! Your service booking is confirmed and scheduled.'
            }
          </p>
        </div>

        {/* Glassmorphic digital receipt card */}
        <div className="w-full bg-gradient-to-br from-[#072C63] via-[#0A3D80] to-[#0D47A1] rounded-2xl p-4 text-white text-left relative overflow-hidden shadow-md">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD400]/10 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-start mb-3.5 border-b border-white/10 pb-2.5">
            <div>
              <span className="text-[8px] bg-[#FFD400] text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {isProduct ? 'Nigam Certified Store Invoice' : 'Nigam Service Booking Invoice'}
              </span>
              <h4 className="font-bold text-xs mt-1.5">{service || 'AC Deep Cleaning'}</h4>
            </div>
            <span className="text-xl">{isProduct ? '📦' : '🛠️'}</span>
          </div>

          <div className="flex flex-col gap-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-white/60">Invoice ID:</span>
              <span className="font-mono font-bold">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Amount Paid:</span>
              <span className="font-bold text-[#FFD400]">
                {isProduct 
                  ? `₹${Number(price || 24999).toLocaleString('en-IN')}` 
                  : `$5.00`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">{isProduct ? 'Delivery Address:' : 'Assigned Technician:'}</span>
              <span className="font-semibold text-right max-w-[200px] truncate">
                {isProduct ? 'Sakshi Dwivedi, Delhi' : 'Rahul Sharma (Expert)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Status:</span>
              <span className="font-bold text-green-400">Payment Confirmed (Active)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5 mt-1">
          <button
            onClick={() => {
              if (isProduct) {
                navigate('/bookings');
              } else {
                const trackingUrl = service === 'Refrigerator Service' ? '/tracking?service=refrigerator' : '/tracking';
                navigate(trackingUrl);
              }
            }}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-yellow-400 transition-all shadow-sm active:scale-[0.98] text-xs cursor-pointer"
          >
            {isProduct ? 'Go to My Orders' : 'Track Booking'} <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 rounded-xl border border-border-color font-semibold text-text-primary hover:bg-slate-50 transition-all active:scale-[0.98] text-xs cursor-pointer"
          >
            Go to Home
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default BookingSuccess;
