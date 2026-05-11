import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Landmark, Wallet, Check } from 'lucide-react';

const Payment = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('card');

  const handlePay = () => {
    // Simulate payment success
    alert('Payment Successful!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px]">
        
        {/* Header */}
        <div className="p-6 flex items-center border-b border-border-color">
          <button 
            onClick={() => navigate('/warranty')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
          </button>
          <h1 className="text-xl font-bold text-[#0d47a1] ml-4">Payment Summary</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* Service Card */}
          <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs text-text-secondary block">Service</span>
              <span className="font-semibold text-text-primary">AC Deep Cleaning</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">Technician</span>
              <span className="font-semibold text-text-primary">Rahul Sharma</span>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">Price Breakdown</h2>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Service Fee</span>
              <span className="font-medium text-text-primary">$50.00</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Warranty Discount</span>
              <span className="font-medium text-green-600">-$45.00</span>
            </div>
            
            <div className="border-t border-border-color my-2"></div>
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-text-primary">Total Amount</span>
              <span className="font-bold text-[#0D47A1] text-lg">$5.00</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary">Payment Methods</h2>
            
            {/* Card */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedMethod === 'card' ? 'border-[#0D47A1] bg-blue-50/50' : 'border-border-color bg-slate-50'
              }`}
              onClick={() => setSelectedMethod('card')}
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                <div>
                  <span className="text-sm font-semibold text-text-primary block">Credit / Debit Card</span>
                  <span className="text-xs text-text-secondary">Pay with Visa, Master, etc.</span>
                </div>
              </div>
              {selectedMethod === 'card' && <Check className="h-5 w-5 text-[#0D47A1]" />}
            </div>

            {/* UPI */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedMethod === 'upi' ? 'border-[#0D47A1] bg-blue-50/50' : 'border-border-color bg-slate-50'
              }`}
              onClick={() => setSelectedMethod('upi')}
            >
              <div className="flex items-center gap-4">
                <Wallet className="h-5 w-5 text-[#0D47A1]" />
                <div>
                  <span className="text-sm font-semibold text-text-primary block">UPI</span>
                  <span className="text-xs text-text-secondary">Google Pay, PhonePe, etc.</span>
                </div>
              </div>
              {selectedMethod === 'upi' && <Check className="h-5 w-5 text-[#0D47A1]" />}
            </div>

            {/* Net Banking */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                selectedMethod === 'netbanking' ? 'border-[#0D47A1] bg-blue-50/50' : 'border-border-color bg-slate-50'
              }`}
              onClick={() => setSelectedMethod('netbanking')}
            >
              <div className="flex items-center gap-4">
                <Landmark className="h-5 w-5 text-[#0D47A1]" />
                <div>
                  <span className="text-sm font-semibold text-text-primary block">Net Banking</span>
                  <span className="text-xs text-text-secondary">Pay via your bank account.</span>
                </div>
              </div>
              {selectedMethod === 'netbanking' && <Check className="h-5 w-5 text-[#0D47A1]" />}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-color">
          <button
            onClick={handlePay}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-md"
          >
            Pay $5.00
          </button>
        </div>

      </div>
    </div>
  );
};

export default Payment;
