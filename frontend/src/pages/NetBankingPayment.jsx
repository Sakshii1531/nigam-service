import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Landmark, ShieldCheck } from 'lucide-react';

const NetBankingPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBank, setSelectedBank] = useState('');

  // Extract navigation state
  const paymentState = location.state || {};
  const isProductBuy = !!paymentState.isApplianceBuy;
  const itemName = paymentState.productName || 'AC Deep Cleaning';
  const itemPrice = paymentState.price !== undefined ? paymentState.price : 5.00;

  const handlePay = () => {
    if (isProductBuy) {
      navigate(`/booking-success?service=${encodeURIComponent(itemName)}&type=product&price=${itemPrice}`);
    } else {
      navigate(`/booking-success?service=${encodeURIComponent(itemName)}`);
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
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">Net Banking</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
          
          <label className="text-[10px] font-bold text-text-secondary block mb-0.5">SELECT POPULAR BANK</label>
          
          {/* Popular Banks Selector Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
              { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
              { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
              { id: 'axis', name: 'Axis Bank', code: 'AXIS' }
            ].map((b) => (
              <div 
                key={b.id}
                onClick={() => setSelectedBank(b.name)}
                className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all hover:border-[#0D47A1] flex flex-col justify-center items-center gap-1 shadow-sm ${
                  selectedBank === b.name ? 'border-[#0D47A1] bg-blue-50/20' : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <span className="font-extrabold text-xs text-[#0D47A1]">{b.code}</span>
                <span className="text-[9px] font-bold text-text-secondary tracking-tight block max-w-[120px] truncate">{b.name}</span>
              </div>
            ))}
          </div>

          <div className="w-full border-t border-dashed border-slate-200 my-1"></div>

          {/* Dropdown for All Banks */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary block mb-1">OR CHOOSE OTHER BANK</label>
            <select 
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="">-- Choose Your Retail Bank --</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
              <option value="Yes Bank">Yes Bank</option>
            </select>
          </div>

          {/* Secure Trust Badge */}
          <div className="bg-blue-50/40 border border-blue-50 p-2.5 rounded-xl flex items-center gap-2 mt-1 w-full text-left">
            <ShieldCheck className="h-4 w-4 text-[#0D47A1] flex-shrink-0" />
            <span className="text-[9px] font-bold text-[#0D47A1] leading-relaxed">
              Redirects securely to official retail corporate site via SSL encrypted tunnel.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-color flex-shrink-0">
          <button
            onClick={handlePay}
            disabled={!selectedBank}
            className={`w-full text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              !selectedBank
                ? 'bg-slate-100 border border-slate-200 text-text-secondary cursor-not-allowed shadow-none'
                : 'bg-[#FFD600] hover:bg-yellow-400 active:scale-[0.99]'
            }`}
          >
            Proceed to Bank Login {isProductBuy ? `₹${itemPrice.toLocaleString('en-IN')}` : `$5.00`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default NetBankingPayment;
