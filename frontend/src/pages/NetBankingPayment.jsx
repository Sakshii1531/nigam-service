import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Landmark, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';
import { submitBookingsForMeta, totalPriceFromResults } from '../lib/bookingSubmission';

const POPULAR_BANKS = [
  { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
  { id: 'axis', name: 'Axis Bank', code: 'AXIS' },
];

const OTHER_BANKS = [
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'IDFC FIRST Bank',
  'Yes Bank',
  'Federal Bank',
];

const NetBankingPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBank, setSelectedBank] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract navigation state with session fallback
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;

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

  const itemName = paymentState.productName || bookingMeta?.serviceName || bookingMeta?.service || 'Service Booking';
  // A service booking pays what its catalogue quote says is due now (the
  // advance) — the same number BookingFlow showed. Product buys keep their own.
  const bookingQuote = !isProductBuy ? bookingMeta?.quote : null;
  const itemPrice = bookingQuote ? bookingQuote.payableNow : (paymentState.price ?? 0);
  const finalPrice = bookingQuote ? itemPrice : (paymentState.finalPrice ?? itemPrice);

  const handlePay = async () => {
    const meta = paymentState.bookingMeta || bookingMeta;
    if (meta) {
      setLoading(true);
      try {
        const results = await submitBookingsForMeta(meta, {
          extra: { paymentMethod: 'NetBanking', bank: selectedBank },
          onEach: async (result) => {
            if (result.razorpay) {
              await payWithRazorpay({
                razorpay: result.razorpay,
                verifyPath: `/bookings/${result.booking.id}/verify-payment`,
                description: meta.service || meta.category,
                prefill: { name: meta.fullName, contact: meta.mobile },
              });
            }
          },
        });
        const primary = results[0];

        // Navigate to success page with real serviceRequestId returned from backend
        const params = new URLSearchParams({
          type: 'service',
          serviceRequestId: primary.serviceRequest?.id || primary.serviceRequest?._id || '',
          service: meta.service,
          category: meta.category,
          productType: meta.lines?.[0]?.name || '',
          brand: meta.brand || '',
          quantity: String(meta.lines?.[0]?.quantity || 1),
          date: meta.date || '',
          timeGroup: meta.timeGroup || '',
          totalPrice: String(totalPriceFromResults(results)),
          advanceAmt: String(meta.quote?.payableNow || 0),
          paymentMode: meta.paymentMode || 'advance',
          bookingCount: String(results.length),
        });
        try {
          sessionStorage.removeItem('ncc_last_booking_flow');
        } catch (_err) {
          // ignore session storage removal errors
        }
        navigate(`/booking-success?${params.toString()}`);
      } catch (err) {
        if (err?.code === 'PRICE_CHANGED') {
          // The rate changed while the customer was paying: back to review.
          navigate(`/book/${encodeURIComponent(meta.category)}`, {
            state: { step: 4, resumeBooking: meta, priceChanged: err.message },
            replace: true,
          });
          return;
        }
        console.error('Failed to create booking:', err);
        navigate('/payment-failure', {
          state: {
            errorMessage: err.message || 'Failed to register your service booking on the server.',
            productName: itemName,
            price: finalPrice,
          },
        });
      } finally {
        setLoading(false);
      }
    } else if (isProductBuy && paymentState.productId) {
      setLoading(true);
      try {
        const orderRes = await apiRequest('/orders', {
          method: 'POST',
          auth: true,
          body: {
            items: [{ productId: paymentState.productId, quantity: paymentState.quantity || 1 }],
            address: paymentState.address,
            couponCode: paymentState.couponCode,
            exchangeRequestId: paymentState.exchangeRequestId,
            coinsToRedeem: paymentState.coinsToRedeem || 0,
            paymentMethod: 'NetBanking',
          },
        });
        const order = orderRes;
        if (order.razorpay) {
          await payWithRazorpay({
            razorpay: order.razorpay,
            verifyPath: `/orders/${order.id}/verify-payment`,
            description: itemName,
          });
        }
        navigate(`/booking-success?service=${encodeURIComponent(itemName)}&type=product&price=${itemPrice}&orderId=${order.id}`);
      } catch (err) {
        navigate('/payment-failure', {
          state: { errorMessage: err.message || 'The purchase could not be completed.', productName: itemName, price: finalPrice },
        });
      } finally {
        setLoading(false);
      }
    } else {
      navigate('/payment-failure', {
        state: {
          errorMessage: 'This checkout is missing the details needed to place an order. Please start again from the product page.',
          productName: itemName,
          price: finalPrice,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header */}
      <div className="bg-white px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-brand-blue" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight">Net Banking Payment</h1>
            <span className="hidden md:block text-xs text-slate-400 font-semibold">
              Direct Retail Internet Banking from RBI Approved Banks
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Step 3 of 3</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-3.5 sm:p-5 md:px-8 md:py-8 flex items-center justify-center md:items-start md:block">
        <div className="w-full max-w-md md:max-w-screen-2xl mx-auto bg-white md:bg-transparent rounded-2xl md:rounded-none shadow-sm md:shadow-none overflow-hidden flex flex-col border border-slate-100 md:border-0">
          <div className="flex-1 flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
            
            {/* Left Column: Bank Selection & Visuals */}
            <div className="w-full md:col-span-7 lg:col-span-8 p-3.5 sm:p-5 md:p-0 flex flex-col gap-4 sm:gap-5 text-left">
              
              {/* Visual Banner */}
              <div className="bg-linear-to-br from-[#0F172A] via-[#1E293B] to-[#0A3D80] rounded-2xl md:rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] md:h-52">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9px] md:text-xs bg-[#FFD400] text-brand-navy font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Retail Net Banking
                  </span>
                  <span className="text-xs md:text-sm italic font-extrabold text-[#FFD400] tracking-widest">
                    RBI LICENSED
                  </span>
                </div>
                <div className="my-2">
                  <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-white/80 block uppercase tracking-wider">
                    {isProductBuy ? 'Product Purchase' : 'Service Booking'}
                  </span>
                  <span className="text-sm sm:text-base md:text-xl font-black block mt-0.5 truncate">{itemName}</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black block mt-1 text-[#FFD400]">
                    ₹{finalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/70 pt-2 border-t border-white/10">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-300" /> Over 50+ Banks Supported
                  </span>
                  <span className="font-bold">256-Bit SSL Tunnel</span>
                </div>
              </div>

              {/* Popular Banks Selector Grid */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                  Select Popular Bank
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setSelectedBank(b.name)}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col justify-center items-center gap-1 shadow-2xs ${
                        selectedBank === b.name
                          ? 'border-brand-blue bg-blue-50/40 ring-1 ring-brand-blue'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className="font-black text-xs text-brand-blue">{b.code}</span>
                      <span className="text-[10px] font-bold text-slate-600 tracking-tight block truncate max-w-full">
                        {b.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                    <span className="bg-white px-2">Or Choose Other Bank</span>
                  </div>
                </div>

                {/* Dropdown for All Other Banks */}
                <div>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:border-brand-blue focus:bg-white outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Your Retail Bank --</option>
                    {POPULAR_BANKS.map((b) => (
                      <option key={`opt-${b.id}`} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    {OTHER_BANKS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Information Notice */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl md:rounded-3xl p-3.5 sm:p-5 flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-white text-brand-blue flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <Landmark className="w-4 h-4 text-brand-blue" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-black text-slate-900">Encrypted Banking Portal Redirect</span>
                  <span className="text-[10px] sm:text-xs text-slate-600 font-medium leading-normal mt-0.5">
                    Clicking Proceed will open Razorpay's official banking interface and redirect you directly to your bank's retail netbanking login. We never ask for or store your netbanking password.
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl sm:rounded-2xl flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-emerald-800 leading-snug">
                  Redirects securely via 256-bit SSL encrypted gateway approved by the Reserve Bank of India.
                </span>
              </div>

            </div>

            {/* Right Column: Order Summary & Pay Action Button */}
            <div className="w-full md:col-span-5 lg:col-span-4 p-3.5 sm:p-5 md:p-0 flex flex-col gap-4 sm:gap-5 sticky top-24 text-left">
              <div className="bg-white p-4 sm:p-6 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-3.5 sm:gap-4">
                <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5 sm:pb-3">
                  Payment Summary
                </h2>

                <div className="flex flex-col gap-2.5 sm:gap-3 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Selected {isProductBuy ? 'Product' : 'Service'}</span>
                    <span className="font-extrabold text-slate-900 truncate text-right">{itemName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Selected Bank</span>
                    <span className="font-extrabold text-slate-900 truncate text-right">
                      {selectedBank || 'None selected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Payment Mode</span>
                    <span className="font-extrabold text-slate-900 shrink-0">Net Banking</span>
                  </div>
                  <div className="h-px bg-slate-100 my-0.5 sm:my-1" />
                  <div className="flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-brand-blue">₹{finalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handlePay}
                  disabled={loading || !selectedBank}
                  className={`w-full text-brand-blue font-black py-3 sm:py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs sm:text-sm mt-1 sm:mt-2 ${
                    !selectedBank || loading
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-brand-yellow hover:bg-yellow-400 active:scale-[0.99]'
                  }`}
                >
                  {loading
                    ? 'Connecting to Bank…'
                    : !selectedBank
                      ? 'Select Bank to Proceed'
                      : `Proceed to Bank Login ₹${finalPrice.toLocaleString('en-IN')}`}
                </button>

                <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100 text-slate-400 text-[10px] sm:text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Secure &amp; Verified Checkout</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default NetBankingPayment;
