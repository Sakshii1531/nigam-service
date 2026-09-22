import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  Wallet,
  ChevronRight,
  Coins,
  Check,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Dynamic parameters passed from the state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Service & Repair';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 299;

  const bookingMeta =
    paymentState.bookingMeta ||
    (() => {
      try {
        const raw = sessionStorage.getItem('ncc_last_booking_flow');
        if (raw) return JSON.parse(raw).bookingMeta;
      } catch (_err) {
        // ignore session storage read errors
      }
      return null;
    })();

  // Intercept browser and hardware back button
  useEffect(() => {
    window.history.pushState({ inPayment: true }, '');

    const handlePopState = () => {
      // Re-push history entry so back button doesn't leave the page immediately
      window.history.pushState({ inPayment: true }, '');
      setShowBackConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const handleConfirmGoBack = () => {
    setShowBackConfirm(false);
    if (bookingMeta) {
      const categorySlug = bookingMeta.category || 'ac';
      navigate(`/book/${categorySlug}`, {
        state: {
          step: 4,
          resumeBooking: bookingMeta,
        },
        replace: true,
      });
    } else {
      navigate(-1);
    }
  };

  const handleContinuePayment = () => {
    setShowBackConfirm(false);
  };

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
  const coinDiscountValue = redeemCoins ? maxCoinsToRedeem / coinsRate : 0;
  const finalPrice = Math.max(0, itemPrice - coinDiscountValue);

  const getNextPaymentState = () => ({
    ...paymentState,
    finalPrice,
    bookingMeta,
  });

  const handlePay = () => {
    const nextState = getNextPaymentState();
    if (selectedMethod === 'card') {
      navigate('/payment/card', { state: nextState });
    } else if (selectedMethod === 'upi') {
      navigate('/payment/upi', { state: nextState });
    } else if (selectedMethod === 'netbanking') {
      navigate('/payment/netbanking', { state: nextState });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10 font-sans">
      {/* Header */}
      <div className="bg-white px-5 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Go Back"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-brand-blue" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight">Payment Summary</h1>
            <span className="hidden md:block text-xs text-slate-400 font-semibold">
              Choose payment method to complete order
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area — 2-column grid on desktop */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full p-3.5 sm:p-5 md:px-8 md:py-8">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
          {/* Left Column: Product Info, Coins & Payment Methods */}
          <div className="w-full md:col-span-7 lg:col-span-8 flex flex-col gap-4 sm:gap-5 text-left">
            {/* Product / Service Card */}
            <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 flex items-center justify-between shadow-xs gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] md:text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                    {isProductBuy ? 'Product Purchase' : 'Service Booking'}
                  </span>
                  {!isProductBuy && (
                    <span className="text-[9px] md:text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      ✓ 100% Guaranteed
                    </span>
                  )}
                </div>
                <h2 className="font-black text-slate-800 text-sm md:text-base mt-1 truncate block leading-snug">
                  {itemName}
                </h2>
                {bookingMeta?.date && (
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {bookingMeta.date} {bookingMeta.timeGroup ? `• ${bookingMeta.timeGroup}` : ''}
                  </p>
                )}
              </div>
              {isProductBuy && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] md:text-xs text-slate-400 font-extrabold block uppercase tracking-wider">
                    Seller
                  </span>
                  <span className="font-black text-brand-blue text-xs md:text-sm mt-0.5 block">
                    Nigam Store
                  </span>
                </div>
              )}
            </div>

            {/* Redeem Nigam Coins Card */}
            {availableCoins > 0 && (
              <div
                onClick={() => setRedeemCoins((prev) => !prev)}
                className={`p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs ${
                  redeemCoins ? 'border-brand-blue bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                    <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800 block truncate">Redeem Nigam Coins</span>
                    <span className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5 block leading-normal">
                      Use {maxCoinsToRedeem} Coins to get ₹{coinDiscountValue.toLocaleString('en-IN')} off ({availableCoins} available)
                    </span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ml-2 transition-all ${
                    redeemCoins ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-350 bg-white'
                  }`}
                >
                  {redeemCoins && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <h2 className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                Select Payment Method
              </h2>

              {/* Card */}
              <div
                className={`p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-brand-blue gap-2.5 ${
                  selectedMethod === 'card' ? 'border-brand-blue bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('card');
                  navigate('/payment/card', { state: getNextPaymentState() });
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl sm:rounded-2xl text-brand-blue shrink-0">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800 block truncate">Credit / Debit Card</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5 block truncate">
                      Pay securely with Visa, Mastercard, RuPay
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0" />
              </div>

              {/* UPI */}
              <div
                className={`p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-brand-blue gap-2.5 ${
                  selectedMethod === 'upi' ? 'border-brand-blue bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('upi');
                  navigate('/payment/upi', { state: getNextPaymentState() });
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 sm:p-3 bg-[#E8F5E9] rounded-xl sm:rounded-2xl text-[#2E7D32] shrink-0">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800 block truncate">UPI (PhonePe, GPay, Paytm)</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5 block truncate">
                      Instant payment using UPI ID or QR Scan
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0" />
              </div>

              {/* Net Banking */}
              <div
                className={`p-3.5 sm:p-5 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xs hover:border-brand-blue gap-2.5 ${
                  selectedMethod === 'netbanking' ? 'border-brand-blue bg-blue-50/10' : 'border-slate-100 bg-white'
                }`}
                onClick={() => {
                  setSelectedMethod('netbanking');
                  navigate('/payment/netbanking', { state: getNextPaymentState() });
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 sm:p-3 bg-[#FFF3E0] rounded-xl sm:rounded-2xl text-[#E65100] shrink-0">
                    <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800 block truncate">Net Banking</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5 block truncate">
                      Pay directly from your retail bank account
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Mobile Price Breakdown Card */}
            <div className="flex flex-col gap-2.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs md:hidden">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                Price Breakdown
              </h2>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Base Amount</span>
                <span className="font-extrabold text-slate-800">₹{itemPrice.toLocaleString('en-IN')}</span>
              </div>

              {redeemCoins && (
                <div className="flex justify-between items-center text-xs animate-in fade-in">
                  <span className="text-slate-500 font-bold">Coins Discount ({maxCoinsToRedeem} Coins)</span>
                  <span className="font-extrabold text-green-600">
                    -₹{coinDiscountValue.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-100 border-dashed my-1" />

              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 text-xs">Total Amount</span>
                <span className="font-black text-brand-blue text-sm">₹{finalPrice.toLocaleString('en-IN')}</span>
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
                  <span className="font-extrabold text-slate-900">₹{itemPrice.toLocaleString('en-IN')}</span>
                </div>

                {redeemCoins && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Coins Discount ({maxCoinsToRedeem} Coins)</span>
                    <span>-₹{coinDiscountValue.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="h-px bg-slate-100 my-1" />

                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-brand-blue">₹{finalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full bg-brand-yellow text-brand-blue font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer text-sm mt-2"
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
      <div className="p-3.5 sm:p-5 bg-white border-t border-slate-100 sticky bottom-0 mt-auto md:hidden">
        <button
          type="button"
          onClick={handlePay}
          className="w-full bg-brand-yellow text-brand-blue font-black py-3 sm:py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer text-xs sm:text-sm"
        >
          Proceed with Selected Method (₹{finalPrice.toLocaleString('en-IN')})
        </button>
      </div>

      {/* Back Confirmation Dialog Modal */}
      {showBackConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={handleContinuePayment}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="back-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
              <AlertCircle className="w-7 h-7 stroke-[2.2]" />
            </div>

            <div>
              <h3 id="back-dialog-title" className="text-lg font-black text-slate-900 tracking-tight">
                Do you want to go back?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                If you go back now, you will return to the final booking review step. Your details are saved.
              </p>
            </div>

            <div className="flex flex-col w-full gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleContinuePayment}
                className="w-full py-3.5 px-4 bg-[#0D47A1] hover:bg-blue-800 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all shadow-md shadow-blue-900/15 cursor-pointer flex items-center justify-center"
              >
                Continue Payment
              </button>
              <button
                type="button"
                onClick={handleConfirmGoBack}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer flex items-center justify-center"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
