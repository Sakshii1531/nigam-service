import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CreditCard, ShieldCheck } from 'lucide-react';

const PaymentMethods = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([
    { id: '1', type: 'Visa', last4: '4321', expiry: '09/28', primary: true },
    { id: '2', type: 'Mastercard', last4: '8765', expiry: '12/30', primary: false }
  ]);
  const [upis, setUpis] = useState([
    { id: '1', address: 'sakshi@okaxis', type: 'Axis Bank', primary: true },
    { id: '2', address: 'sakshi@paytm', type: 'Paytm Payments Bank', primary: false }
  ]);

  const removeCard = (id) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const removeUpi = (id) => {
    setUpis(upis.filter(u => u.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Payment Methods</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5">
        
        {/* Saved Cards */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Saved Cards</h2>
          {cards.map(card => (
            <div key={card.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">{card.type} •••• {card.last4}</span>
                    {card.primary && (
                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase">Primary</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Expires {card.expiry}</span>
                </div>
              </div>
              <button 
                onClick={() => removeCard(card.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          ))}
          <button className="bg-white border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition-all cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Add New Card</span>
          </button>
        </div>

        {/* UPI Accounts */}
        <div className="flex flex-col gap-2.5 mt-2">
          <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">UPI ID Accounts</h2>
          {upis.map(upi => (
            <div key={upi.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black text-sm">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">{upi.address}</span>
                    {upi.primary && (
                      <span className="text-[8px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-black uppercase">Primary</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{upi.type}</span>
                </div>
              </div>
              <button 
                onClick={() => removeUpi(upi.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          ))}
          <button className="bg-white border-2 border-dashed border-slate-200 hover:border-green-500 hover:bg-green-50/10 rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-green-600 transition-all cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Add New UPI ID</span>
          </button>
        </div>

        {/* Secure Badge */}
        <div className="bg-slate-100/50 rounded-2xl p-3 flex items-center gap-3 mt-4 border border-slate-200/50">
          <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
          <p className="text-[9px] text-slate-500 font-bold leading-normal">
            Your details are completely secured under PCI-DSS standards. Nigam Care Center does not store full credit card credentials on its servers.
          </p>
        </div>

      </div>
    </div>
  );
};

export default PaymentMethods;
