import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';

const CardPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();


  const [loading, setLoading] = useState(false);

  // Extract navigation state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Deep Cleaning';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 5.00;
  const finalPrice = paymentState.finalPrice !== undefined ? paymentState.finalPrice : itemPrice;

  const handlePay = async (e) => {
    if (e) e.preventDefault();
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
            paymentMode: meta.paymentMode || 'after', // or 'advance'
            paymentMethod: 'Card',
          },
          auth: true,
        });

        // Collect the advance for real before showing the success screen. A
        // cancelled or declined payment must not look like a completed booking.
        if (result.razorpay) {
          await payWithRazorpay({
            razorpay: result.razorpay,
            verifyPath: `/bookings/${result.booking.id}/verify-payment`,
            description: meta.service || meta.category,
            prefill: { name: meta.fullName, contact: meta.mobile },
          });
        }

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
    } else if (isProductBuy && paymentState.productId) {
      // Product purchases go through the real order + gateway path. This branch
      // used to jump straight to the success page, creating no order and taking
      // no money.
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
            paymentMethod: 'Card',
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
      <div className="bg-white px-5 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight">Credit &amp; Debit Card Payment</h1>
            <span className="hidden md:block text-xs text-slate-400 font-semibold">PCI-DSS Compliant 256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Step 3 of 3</span>
        </div>
      </div>

      {/* Main Container — Phone container on mobile, 2-column grid on desktop */}
      <div className="flex-1 p-4 md:px-8 md:py-8 flex items-center justify-center md:items-start md:block">
        
        {/* Mobile View Wrap Container */}
        <div className="w-full max-w-md md:max-w-screen-2xl mx-auto bg-white md:bg-transparent rounded-[30px] md:rounded-none shadow-2xl md:shadow-none overflow-hidden flex flex-col h-[700px] md:h-auto border border-slate-100 md:border-0">
          
          <div className="flex-1 flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start overflow-y-auto md:overflow-visible">
            
            {/* Left Column: Card Visual & Security Badges */}
            <div className="w-full md:col-span-7 lg:col-span-8 p-5 md:p-0 flex flex-col gap-6 text-left">
              
              {/* Card Visual representation */}
              <div className="bg-gradient-to-br from-[#051F42] via-[#0A3D80] to-[#0D47A1] rounded-2xl md:rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-48 md:h-56">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD400]/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex justify-between items-start">
                  <span className="text-[9px] md:text-xs bg-[#FFD400] text-[#051F42] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Secure Card Pay
                  </span>
                  <span className="text-xs md:text-sm italic font-extrabold text-[#FFD400] tracking-widest">NIGAM SHIELD</span>
                </div>
                <div className="my-2">
                  <span className="text-xs md:text-sm font-semibold text-white/80 block uppercase tracking-wider">Service Booking</span>
                  <span className="text-base md:text-xl font-black block mt-0.5">{itemName}</span>
                  <span className="text-2xl md:text-3xl font-black block mt-1 text-[#FFD400]">₹{finalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/70 pt-2 border-t border-white/10">
                  <span>PCI-DSS Compliant Gateway</span>
                  <span className="font-bold">Visa • Mastercard • RuPay</span>
                </div>
              </div>

              {/* Information Notice */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl md:rounded-3xl p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-white text-[#0D47A1] flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                  ℹ️
                </div>
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-black text-slate-900">Secure Gateway Redirect</span>
                  <span className="text-[11px] md:text-xs text-slate-600 font-medium leading-normal mt-0.5">
                    Clicking Proceed will open Razorpay's official secure payment dialog. You can enter your card details safely without storing sensitive credentials on this device.
                  </span>
                </div>
              </div>

            </div>

            {/* Right Column: Order Summary & Pay Action Button */}
            <div className="w-full md:col-span-5 lg:col-span-4 p-5 md:p-0 flex flex-col gap-5 sticky top-24 text-left">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                
                <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Payment Summary</h2>

                <div className="flex flex-col gap-3 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Selected Service</span>
                    <span className="font-extrabold text-slate-900 truncate max-w-[150px]">{itemName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Payment Mode</span>
                    <span className="font-extrabold text-slate-900">Credit / Debit Card</span>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-[#0D47A1]">₹{finalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handlePay}
                  disabled={loading}
                  className={`w-full text-[#0D47A1] font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-sm mt-2 ${
                    loading
                      ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-[#FFD600] hover:bg-yellow-400 active:scale-[0.99]'
                  }`}
                >
                  {loading ? 'Opening secure checkout…' : `Pay ₹${finalPrice.toLocaleString('en-IN')} Securely`}
                </button>

                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 text-slate-400 text-xs font-bold">
                  <span>🔒 100% Secure &amp; Verified Checkout</span>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CardPayment;
