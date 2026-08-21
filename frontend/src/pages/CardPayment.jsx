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
          {/* Card details are entered inside Razorpay Checkout, which is PCI-DSS
              compliant. This screen used to collect the card number, expiry and
              CVV itself — putting raw card data through our own app for no
              reason, since Checkout asks for them again anyway. */}
          <div className="bg-gradient-to-br from-[#072C63] via-[#0A3D80] to-[#0D47A1] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD400]/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start">
              <span className="text-[8px] bg-[#FFD400] text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Secure Card Pay
              </span>
              <span className="text-xs italic font-bold text-[#FFD400]">NIGAM SHIELD</span>
            </div>
            <div className="my-2">
              <span className="text-sm font-bold block">{itemName}</span>
              <span className="text-2xl font-black block mt-1">₹{finalPrice.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[10px] text-white/70">
              You'll enter your card details on the secure payment screen.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex flex-col gap-2.5 flex-shrink-0 w-full">
          <button
            onClick={handlePay}
            disabled={loading}
            className={`w-full text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              loading
                ? 'bg-slate-100 border border-slate-200 text-text-secondary cursor-not-allowed shadow-none'
                : 'bg-[#FFD600] hover:bg-yellow-400 active:scale-[0.99]'
            }`}
          >
            {loading ? 'Opening secure checkout…' : `Pay ₹${finalPrice.toLocaleString('en-IN')} Securely`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CardPayment;
