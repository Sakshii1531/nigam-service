import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Landmark, Wallet, ChevronRight, Coins, Check } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [redeemCoins, setRedeemCoins] = useState(false);

  // Dynamic parameters passed from the state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Service & Repair';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 299;

  // The coin balance is the wallet's
  const [availableCoins, setAvailableCoins] = useState(0);
  useEffect(() => {
    apiRequest('/wallet', { auth: true })
      .then((res) => setAvailableCoins(res?.coins ?? 0))
      .catch((err) => console.warn('[payment] Could not load wallet balance:', err.message));
  }, []);
  // Conversion: 10 coins = ₹1
  const coinsRate = 10;
  const maxCoinsToRedeem = Math.min(availableCoins, Math.floor(itemPrice * coinsRate));
  const coinDiscountValue = redeemCoins ? (maxCoinsToRedeem / coinsRate) : 0;
  const finalPrice = Math.max(0, itemPrice - coinDiscountValue);

  // Redemption is debited server-side as part of the order, not by writing a
  // smaller number into this browser.
  const handlePay = () => {
    if (selectedMethod === 'card') {
      navigate('/payment/card', { state: { ...paymentState, finalPrice } });
    } else if (selectedMethod === 'upi') {
      navigate('/payment/upi', { state: { ...paymentState, finalPrice } });
    } else if (selectedMethod === 'netbanking') {
      navigate('/payment/netbanking', { state: { ...paymentState, finalPrice } });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10 font-sans">
      
      {/* Header */}
      <div className="bg-white px-5 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight">Payment Summary</h1>
            <span className="hidden md:block text-xs text-slate-400 font-semibold">Choose payment method to complete order</span>
          </div>
        </div>
      </div>

      {/* Main Content Area — 2-column grid on desktop */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full p-5 md:px-8 md:py-8">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
          
          {/* Left Column: Product Info, Coins & Payment Methods */}
          <div className="w-full md:col-span-7 lg:col-span-8 flex flex-col gap-5 text-left">
            
            {/* Product / Service Card */}
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[10px] md:text-xs text-slate-400 font-extrabold block uppercase tracking-wider">{isProductBuy ? 'Product' : 'Service'}</span>
                <span className="font-black text-slate-800 text-sm md:text-base mt-0.5 block">{itemName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] md:text-xs text-slate-400 font-extrabold block uppercase tracking-wider">{isProductBuy ? 'Seller' : 'Technician'}</span>
                <span className="font-black text-[#0D47A1] text-xs md:text-sm mt-0.5 block">{isProductBuy ? 'Nigam Store' : 'Rahul Sharma'}</span>
              </div>
            </div>

            {/* Redeem Nigam Coins Card */}
            {availableCoins > 0 && (
              <div 
                onClick={() => setRedeemCoins(prev => !prev)}
                className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs ${
                  redeemCoins ? 'border-[#0D47A1] bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl flex-shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs md:text-sm font-black text-slate-800 block">Redeem Nigam Coins</span>
                    <span className="text-[10px] md:text-xs text-slate-500 font-semibold mt-0.5 block leading-normal">
                      Use {maxCoinsToRedeem} Coins to get ₹{coinDiscountValue.toLocaleString('en-IN')} off ({availableCoins} Coins available)
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  redeemCoins ? 'border-[#0D47A1] bg-[#0D47A1] text-white' : 'border-slate-350 bg-white'
                }`}>
                  {redeemCoins && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="flex flex-col gap-3">
              <h2 className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Select Payment Method</h2>
              
              {/* Card */}
              <div 
                className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-[#0D47A1] ${
                  selectedMethod === 'card' ? 'border-[#0D47A1] bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('card');
                  navigate('/payment/card', { state: paymentState });
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-blue-50 rounded-2xl text-[#0D47A1]">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs md:text-sm font-black text-slate-800 block">Credit / Debit Card</span>
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold mt-0.5 block">Pay securely with Visa, Mastercard, RuPay</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>

              {/* UPI */}
              <div 
                className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-[#0D47A1] ${
                  selectedMethod === 'upi' ? 'border-[#0D47A1] bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('upi');
                  navigate('/payment/upi', { state: paymentState });
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[#E8F5E9] rounded-2xl text-[#2E7D32]">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs md:text-sm font-black text-slate-800 block">UPI (PhonePe, GPay, Paytm)</span>
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold mt-0.5 block">Instant payment using UPI ID or QR Scan</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>

              {/* Net Banking */}
              <div 
                className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-[#0D47A1] ${
                  selectedMethod === 'netbanking' ? 'border-[#0D47A1] bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('netbanking');
                  navigate('/payment/netbanking', { state: paymentState });
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[#FFF3E0] rounded-2xl text-[#E65100]">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs md:text-sm font-black text-slate-800 block">Net Banking</span>
                    <span className="text-[10px] md:text-xs text-slate-400 font-bold mt-0.5 block">Pay directly from your retail bank account</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            {/* Mobile Price Breakdown Card */}
            <div className="flex flex-col gap-2.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs md:hidden">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Price Breakdown</h2>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Base Amount</span>
                <span className="font-extrabold text-slate-800">
                  ₹{itemPrice.toLocaleString('en-IN')}
                </span>
              </div>

              {redeemCoins && (
                <div className="flex justify-between items-center text-xs animate-in fade-in">
                  <span className="text-slate-500 font-bold">Coins Discount ({maxCoinsToRedeem} Coins)</span>
                  <span className="font-extrabold text-green-600">
                    -₹{coinDiscountValue.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              
              <div className="border-t border-slate-100 border-dashed my-1"></div>
              
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 text-xs">Total Amount</span>
                <span className="font-black text-[#0D47A1] text-sm">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Desktop Summary & Proceed Action */}
          <div className="w-full md:col-span-5 lg:col-span-4 hidden md:flex flex-col gap-5 sticky top-24 text-left">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
              
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Price Breakdown</h2>

              <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Base Amount</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{itemPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {redeemCoins && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Coins Discount ({maxCoinsToRedeem} Coins)</span>
                    <span>
                      -₹{coinDiscountValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="h-px bg-slate-100 my-1" />

                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-[#0D47A1]">
                    ₹{finalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePay}
                className="w-full bg-[#FFD600] text-[#0D47A1] font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer text-sm mt-2"
              >
                Proceed with Selected Method (₹{finalPrice.toLocaleString('en-IN')})
              </button>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 text-slate-400 text-xs font-bold">
                <span>🔒 100% Guaranteed &amp; Safe Checkout</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Mobile Footer Payment Submission Action */}
      <div className="p-5 bg-white border-t border-slate-100 sticky bottom-0 mt-auto md:hidden">
        <button
          onClick={handlePay}
          className="w-full bg-[#FFD600] text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer"
        >
          Proceed with Selected Method (₹{finalPrice.toLocaleString('en-IN')})
        </button>
      </div>

    </div>
  );
};

export default Payment;
