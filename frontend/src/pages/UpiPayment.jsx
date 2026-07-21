import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Wallet, ShieldCheck, QrCode } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const UpiPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [upiId, setUpiId] = useState('');

  const [loading, setLoading] = useState(false);

  // Extract navigation state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Deep Cleaning';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 5.00;
  const finalPrice = paymentState.finalPrice !== undefined ? paymentState.finalPrice : itemPrice;

  const handlePay = async () => {
    const meta = paymentState.bookingMeta;
    if (meta) {
      setLoading(true);
      try {
        const result = await apiRequest('/bookings', {
          method: 'POST',
          body: {
            category: meta.category,
            productType: meta.productType,
            serviceSlug: meta.serviceSlug,
            brand: meta.brand,
            quantity: meta.quantity || 1,
            scheduledDate: new Date().toISOString(),
            timeSlot: { date: meta.date || '', time: meta.timeGroup || '' },
            address: meta.address,
            fullName: meta.fullName,
            mobile: meta.mobile,
            paymentMode: meta.paymentMode || 'after',
          },
          auth: true,
        });

        // Navigate to success page with real serviceRequestId returned from backend
        const params = new URLSearchParams({
          type: 'service',
          serviceRequestId: result.serviceRequest?.id || result.serviceRequest?._id || '',
          service: meta.service,
          category: meta.category,
          productType: meta.productType,
          brand: meta.brand || '',
          quantity: String(meta.quantity || 1),
          date: meta.date || '',
          timeGroup: meta.timeGroup || '',
          totalPrice: String(meta.totalPrice || 0),
          advanceAmt: String(meta.advanceAmt || 0),
          paymentMode: meta.paymentMode || 'advance',
        });
        navigate(`/booking-success?${params.toString()}`);
      } catch (err) {
        console.error('Failed to create booking:', err);
        navigate('/payment-failure', {
          state: {
            errorMessage: err.message || 'Failed to register your service booking on the server.',
            productName: itemName,
            price: finalPrice,
          }
        });
      } finally {
        setLoading(false);
      }
    } else {
      if (isProductBuy) {
        navigate(`/booking-success?service=${encodeURIComponent(itemName)}&type=product&price=${itemPrice}`);
      } else {
        navigate(`/booking-success?service=${encodeURIComponent(itemName)}`);
      }
    }
  };

  const handleFailurePay = () => {
    navigate('/payment-failure', {
      state: {
        errorMessage: 'UPI payment request timed out / declined by the user in their payment app.',
        productName: itemName,
        price: finalPrice,
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-slate-100">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-border-color flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">UPI Payment</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto items-center">
          
          {/* Simulated QR Code Scan */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-2.5 relative shadow-inner w-full max-w-[280px]">
            <div className="p-3 bg-white rounded-xl shadow border border-slate-100 relative overflow-hidden group">
              <QrCode className="h-28 w-28 text-[#0D47A1]" />
              {/* Dynamic laser scan line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FFD600] shadow-md animate-[bounce_2s_infinite]"></div>
            </div>
            <span className="text-[9px] font-extrabold text-[#2E7D32] bg-[#EBF7EE] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Scan QR to Pay Instantly
            </span>
          </div>

          <div className="w-full border-t border-dashed border-slate-200 my-1"></div>

          {/* UPI ID Form */}
          <div className="w-full text-left">
            <label className="text-[10px] font-bold text-text-secondary block mb-1">ENTER UPI ID / VPA</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="username@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all"
              />
              <button 
                className="bg-[#0D47A1] text-white px-3.5 rounded-xl text-xs font-bold hover:bg-blue-900 transition-all cursor-pointer"
                onClick={() => setUpiId('sakshi@paytm')}
              >
                Verify
              </button>
            </div>
            <span className="text-[9px] text-text-secondary mt-1 block">Supported Apps: BHIM, PhonePe, Paytm, GooglePay, WhatsApp</span>
          </div>

          {/* Secure Trust Badge */}
          <div className="bg-blue-50/40 border border-blue-50 p-2.5 rounded-xl flex items-center gap-2 mt-1 w-full text-left">
            <ShieldCheck className="h-4 w-4 text-[#0D47A1] flex-shrink-0" />
            <span className="text-[9px] font-bold text-[#0D47A1] leading-relaxed">
              Dual-layer authorization protocol is active. Keep your secure banking app open.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex flex-col gap-2.5 flex-shrink-0 w-full">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer text-xs"
          >
            {loading ? 'Processing Payment...' : `Authorize UPI Pay (Success) ₹${finalPrice.toLocaleString('en-IN')}`}
          </button>
          
          <button
            type="button"
            onClick={handleFailurePay}
            disabled={loading}
            className="w-full bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all border border-red-200 cursor-pointer text-xs"
          >
            Simulate Payment Failure
          </button>
        </div>

      </div>
    </div>
  );
};

export default UpiPayment;
