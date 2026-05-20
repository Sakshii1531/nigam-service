import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, Check, Copy } from 'lucide-react';

const Coupons = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(null);

  const coupons = [
    {
      code: 'NIGAMGOLD50',
      discount: '₹1,500 OFF',
      desc: 'Applicable on Split Air Conditioners & Double Door Refrigerators',
      expiry: 'Expires in 3 Days'
    },
    {
      code: 'CARE20',
      discount: '20% OFF',
      desc: 'Applicable on non-warranty AC deep cleaning and appliance checkups',
      expiry: 'Expires in 7 Days'
    },
    {
      code: 'WARRANTYPLUS',
      discount: '₹500 OFF',
      desc: 'Applicable on 1-Year Extended Warranty purchase plans',
      expiry: 'Expires on 31st May'
    }
  ];

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-slate-100 relative">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-slate-100 flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">My Coupons</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto pb-10">
          
          {coupons.map((c) => (
            <div 
              key={c.code}
              className="bg-white border border-[#BACBE7]/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 relative overflow-hidden"
            >
              {/* Left semi-circle cutout */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full border-r border-[#BACBE7]"></div>
              {/* Right semi-circle cutout */}
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full border-l border-[#BACBE7]"></div>

              <div className="p-2.5 bg-blue-50 text-[#0D47A1] rounded-xl flex-shrink-0">
                <Ticket className="h-6 w-6" />
              </div>

              <div className="flex-1 flex flex-col gap-1 pr-4 pl-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-extrabold text-[#0D47A1] text-xs font-mono">{c.code}</span>
                  <span className="text-[10px] text-green-600 font-extrabold uppercase bg-green-50 px-1.5 py-0.5 rounded-md">{c.discount}</span>
                </div>
                <span className="text-[10px] text-text-primary font-semibold leading-relaxed mt-1 block">{c.desc}</span>
                <span className="text-[9px] text-text-secondary mt-0.5 block">{c.expiry}</span>
              </div>

              {/* Copy Action button */}
              <button 
                onClick={() => handleCopy(c.code)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  copiedCode === c.code ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-text-secondary hover:bg-blue-50'
                }`}
              >
                {copiedCode === c.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default Coupons;
