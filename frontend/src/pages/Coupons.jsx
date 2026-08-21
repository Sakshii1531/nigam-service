import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, Check, Copy, Percent } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const Coupons = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/coupons', { auth: true });
        const listToMap = Array.isArray(res) ? res : [];
        if (listToMap && listToMap.length >= 0) {
          const formatted = listToMap.map(c => {
            const hasPct = c.description?.toLowerCase().includes('%');
            const discountLabel = hasPct ? `${c.discount}% OFF` : `₹${c.discount.toLocaleString('en-IN')} OFF`;
            
            // Map color dynamically
            let color = 'from-[#64B5F6] to-[#0D47A1]';
            let textColor = 'text-blue-800 bg-blue-50 border-blue-200';
            if (c.code.includes('GOLD') || c.discount >= 1000) {
              color = 'from-[#FFD54F] to-[#FF8F00]';
              textColor = 'text-amber-800 bg-amber-50 border-amber-200';
            } else if (c.code.includes('WARRANTY') || c.code.includes('PLUS') || c.code.includes('SHIELD')) {
              color = 'from-[#81C784] to-[#2E7D32]';
              textColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
            }

            const expiryStr = c.expiry ? `Expires on ${new Date(c.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No Expiry';

            // Build dynamic applicability text
            let scopeText = '';
            if (c.applicableOn && c.applicableOn.length > 0) {
              if (c.applicableOn.length === 3) {
                scopeText = 'Applicable globally on all products, services & protection plans';
              } else {
                const mapped = c.applicableOn.map(s => {
                  if (s === 'product') return 'Products';
                  if (s === 'service') return 'Services';
                  if (s === 'plan') return 'Protection Plans';
                  return s;
                });
                scopeText = `Applicable on: ${mapped.join(', ')}`;
              }
            } else {
              scopeText = 'Applicable globally on all products, services & protection plans';
            }

            return {
              code: c.code,
              discount: discountLabel,
              desc: c.description ? `${c.description} (${scopeText})` : scopeText,
              expiry: expiryStr,
              color,
              textColor
            };
          });
          setCoupons(formatted);
        }
      } catch (err) {
        console.warn('Error loading coupons:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">My Coupons</h1>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
        {/* Coupons List */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">Available Offers</h3>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white border border-slate-200/60 rounded-[24px] p-5 h-36"></div>
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Ticket className="h-6 w-6" />
              </div>
              <span className="text-xs font-black text-brand-navy">No Active Coupons Available</span>
              <span className="text-[10px] text-slate-400 font-semibold max-w-[200px] leading-relaxed">
                There are no active discount coupons at this moment. Check back later!
              </span>
            </div>
          ) : (
            coupons.map((c) => (
              <div 
                key={c.code}
                className="bg-white border border-slate-200/70 rounded-[24px] p-5 shadow-xs flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-sm"
              >
                {/* Semi-circle Cutouts */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full border-r border-slate-200 z-10"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full border-l border-slate-200 z-10"></div>

                {/* Top part: Discount and code */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 bg-gradient-to-tr ${c.color} rounded-2xl flex items-center justify-center text-white shadow-xs`}>
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800">{c.code}</span>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{c.expiry}</p>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${c.textColor}`}>
                    {c.discount}
                  </span>
                </div>

                {/* Dashed line divider */}
                <div className="border-t border-dashed border-slate-200/80 mx-1"></div>

                {/* Description & Action */}
                <div className="flex justify-between items-center gap-4">
                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed flex-1">
                    {c.desc}
                  </p>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                      copiedCode === c.code 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-50 hover:bg-blue-50 text-[#0D47A1] border border-slate-200/50'
                    }`}
                  >
                    {copiedCode === c.code ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> COPIED
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> COPY CODE
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Coupons;
