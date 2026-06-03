import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';

const CardPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Input states for simulator
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Extract navigation state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Deep Cleaning';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 5.00;

  const handlePay = (e) => {
    e.preventDefault();
    const meta = paymentState.bookingMeta;
    if (meta) {
      const params = new URLSearchParams({ type: 'service', ...meta });
      navigate(`/booking-success?${params.toString()}`);
    } else if (isProductBuy) {
      navigate(`/booking-success?service=${encodeURIComponent(itemName)}&type=product&price=${itemPrice}`);
    } else {
      navigate(`/booking-success?service=${encodeURIComponent(itemName)}`);
    }
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    if (formattedValue.length <= 19) setCardNumber(formattedValue);
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
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">Card Payment</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
          
          {/* Card Visual representation */}
          <div className="bg-gradient-to-br from-[#072C63] via-[#0A3D80] to-[#0D47A1] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD400]/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8px] bg-[#FFD400] text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Secure Card Pay
                </span>
              </div>
              <span className="text-xs italic font-bold text-[#FFD400]">NIGAM SHIELD</span>
            </div>
            <div className="my-2">
              <span className="font-mono text-base tracking-widest block h-6">
                {cardNumber || '•••• •••• •••• ••••'}
              </span>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-bold text-white/80">
              <div>
                <span className="text-[8px] text-white/50 block font-normal uppercase">Cardholder</span>
                <span className="truncate block max-w-[150px]">{cardName || 'YOUR FULL NAME'}</span>
              </div>
              <div>
                <span className="text-[8px] text-white/50 block font-normal uppercase">Expires</span>
                <span>{expiry || 'MM/YY'}</span>
              </div>
            </div>
          </div>

          {/* Form Input fields */}
          <form onSubmit={handlePay} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-text-secondary block mb-1">CARDHOLDER NAME</label>
              <input 
                type="text" 
                placeholder="Enter Cardholder Name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary block mb-1">CARD NUMBER</label>
              <input 
                type="text" 
                placeholder="4111 2222 3333 4444"
                value={cardNumber}
                onChange={handleCardNumberChange}
                required
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-mono font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">EXPIRY DATE</label>
                <input 
                  type="text" 
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length >= 2) val = val.slice(0,2) + '/' + val.slice(2,4);
                    if (val.length <= 5) setExpiry(val);
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary block mb-1">CVV CODE</label>
                <input 
                  type="password" 
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 3) setCvv(val);
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all text-center"
                />
              </div>
            </div>

            {/* Secure Trust Badge */}
            <div className="bg-blue-50/40 border border-blue-50 p-2.5 rounded-xl flex items-center gap-2 mt-1">
              <ShieldCheck className="h-4 w-4 text-[#0D47A1] flex-shrink-0" />
              <span className="text-[9px] font-bold text-[#0D47A1] leading-relaxed">
                Your payment details are 100% secured by Nigam Shield Payment Protection Protocol.
              </span>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-color flex-shrink-0">
          <button
            onClick={handlePay}
            disabled={!cardNumber || !expiry || !cvv || !cardName}
            className={`w-full text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              !cardNumber || !expiry || !cvv || !cardName
                ? 'bg-slate-100 border border-slate-200 text-text-secondary cursor-not-allowed shadow-none'
                : 'bg-[#FFD600] hover:bg-yellow-400 active:scale-[0.99]'
            }`}
          >
            Pay Securely {isProductBuy ? `₹${itemPrice.toLocaleString('en-IN')}` : `$5.00`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CardPayment;
