import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, XCircle, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';

const PaymentFailure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state details from router state
  const paymentState = location.state || {};
  const errorMsg = paymentState.errorMessage || 'Transaction declined by your bank. Please check your card balance or daily limit.';
  const itemName = paymentState.productName || 'AC Service';
  const price = paymentState.price !== undefined ? paymentState.price : 199;

  // Retrieve transaction reference
  const txnId = React.useMemo(() => {
    return `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF5F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-red-100">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-slate-100 flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-red-600" />
          </button>
          <h1 className="text-base font-extrabold text-red-650 ml-3">Payment Failed</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto items-center justify-center">
          
          {/* Animated Error Emblem */}
          <div className="relative">
            {/* Sparkles */}
            <span className="absolute -top-3 -left-4 text-red-400 text-lg animate-pulse">✦</span>
            <span className="absolute bottom-0 -right-5 text-red-300 text-sm animate-pulse">✦</span>
            
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center shadow-lg shadow-red-200">
              <XCircle className="w-12 h-12 text-red-650" strokeWidth={2.5} />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-[20px] font-black text-slate-900 leading-tight">Payment Declined</h2>
            <p className="text-[12px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
              Transaction ID: {txnId}
            </p>
          </div>

          {/* Error Message Box */}
          <div className="w-full bg-red-50/50 border border-red-100 rounded-2xl p-4 flex gap-3 text-left">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-black text-red-800">Reason for Failure</p>
              <p className="text-[11px] text-red-700/80 font-medium mt-1 leading-relaxed">
                {errorMsg}
              </p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Attempted Order</h3>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">{itemName}</span>
              <span className="font-extrabold text-slate-800">₹{price}</span>
            </div>
            <div className="border-t border-slate-200 my-0.5"></div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Status</span>
              <span className="font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                Unpaid
              </span>
            </div>
          </div>

          {/* Secure Trust Badge */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2.5 w-full text-left">
            <HelpCircle className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="text-[10px] font-bold text-slate-500 leading-relaxed">
              Don't worry, if any money was deducted it will be refunded back to your account automatically within 3-5 business days.
            </span>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="p-5 border-t border-slate-100 flex-shrink-0 w-full flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-red-600 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.99] transition-all shadow-md shadow-red-200 cursor-pointer text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Payment Method
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full text-center text-[12px] font-extrabold text-slate-500 hover:text-slate-700 transition-colors py-1.5 cursor-pointer"
          >
            Cancel and Return Home
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentFailure;
