import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Landmark, Wallet, ChevronRight } from 'lucide-react';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMethod, setSelectedMethod] = useState('card');

  // Dynamic parameters passed from the state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Deep Cleaning';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 5.00;

  const handlePay = () => {
    // Navigate to the selected method's relevant page
    if (selectedMethod === 'card') {
      navigate('/payment/card', { state: paymentState });
    } else if (selectedMethod === 'upi') {
      navigate('/payment/upi', { state: paymentState });
    } else if (selectedMethod === 'netbanking') {
      navigate('/payment/netbanking', { state: paymentState });
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
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">Payment Summary</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
          
          {/* Product / Service Card */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
            <div>
              <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">{isProductBuy ? 'Product' : 'Service'}</span>
              <span className="font-extrabold text-text-primary text-sm mt-0.5">{itemName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-text-secondary font-bold block uppercase tracking-wider">{isProductBuy ? 'Seller' : 'Technician'}</span>
              <span className="font-bold text-[#0D47A1] text-xs mt-0.5">{isProductBuy ? 'Nigam Store' : 'Rahul Sharma'}</span>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="flex flex-col gap-2.5 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0.5">Price Breakdown</h2>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Base Amount</span>
              <span className="font-semibold text-text-primary">
                {isProductBuy ? `₹${itemPrice.toLocaleString('en-IN')}` : `$${itemPrice.toFixed(2)}`}
              </span>
            </div>
            
            {!isProductBuy && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Warranty Discount</span>
                <span className="font-semibold text-green-600">-$45.00</span>
              </div>
            )}
            
            <div className="border-t border-slate-200 border-dashed my-1"></div>
            
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-text-primary text-xs">Total Amount</span>
              <span className="font-extrabold text-[#0D47A1] text-sm">
                {isProductBuy ? `₹${itemPrice.toLocaleString('en-IN')}` : `$5.00`}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-0.5">Select Payment Method</h2>
            
            {/* Card */}
            <div 
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-sm hover:border-[#0D47A1] ${
                selectedMethod === 'card' ? 'border-[#0D47A1] bg-blue-50/20' : 'border-slate-100 bg-white'
              }`}
              onClick={() => {
                setSelectedMethod('card');
                navigate('/payment/card', { state: paymentState });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-text-primary block">Credit / Debit Card</span>
                  <span className="text-[10px] text-text-secondary mt-0.5 block">Pay securely with Visa, Mastercard, RuPay</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </div>

            {/* UPI */}
            <div 
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-sm hover:border-[#0D47A1] ${
                selectedMethod === 'upi' ? 'border-[#0D47A1] bg-blue-50/20' : 'border-slate-100 bg-white'
              }`}
              onClick={() => {
                setSelectedMethod('upi');
                navigate('/payment/upi', { state: paymentState });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#E8F5E9] rounded-xl">
                  <Wallet className="h-5 w-5 text-[#2E7D32]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-text-primary block">UPI (PhonePe, GPay, Paytm)</span>
                  <span className="text-[10px] text-text-secondary mt-0.5 block">Instant payment using UPI ID or QR Scan</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </div>

            {/* Net Banking */}
            <div 
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-sm hover:border-[#0D47A1] ${
                selectedMethod === 'netbanking' ? 'border-[#0D47A1] bg-blue-50/20' : 'border-slate-100 bg-white'
              }`}
              onClick={() => {
                setSelectedMethod('netbanking');
                navigate('/payment/netbanking', { state: paymentState });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FFF3E0] rounded-xl">
                  <Landmark className="h-5 w-5 text-[#E65100]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-text-primary block">Net Banking</span>
                  <span className="text-[10px] text-text-secondary mt-0.5 block">Pay directly from your retail bank account</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </div>
          </div>

        </div>

        {/* Footer Payment Submission Action */}
        <div className="p-5 border-t border-border-color flex-shrink-0">
          <button
            onClick={handlePay}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md cursor-pointer"
          >
            Proceed with Selected Method ({isProductBuy ? `₹${itemPrice.toLocaleString('en-IN')}` : `$5.00`})
          </button>
        </div>

      </div>
    </div>
  );
};

export default Payment;
