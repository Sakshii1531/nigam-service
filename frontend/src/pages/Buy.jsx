import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Award, Check, ChevronRight, ShoppingCart
} from 'lucide-react';

const Buy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* HEADER */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Buy Protection</h1>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Introductory Hero Card */}
        <div className="bg-gradient-to-br from-brand-navy to-brand-blue rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-yellow/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col gap-2">
            <span className="text-[10px] bg-brand-yellow text-black font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start">
              Nigam Shield Plan
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Smart Appliance Care</h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Protect your home appliances from unexpected breakdowns with premium coverage. Free parts, skilled technicians, and quick claim approvals.
            </p>
          </div>
        </div>

        {/* Two Primary Option Cards */}
        <div className="flex flex-col gap-4">
          
          {/* Option A: Buy New Warranty */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color hover:border-[#0D47A1] transition-all flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-brand-blue">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">Buy New Warranty</h3>
                <p className="text-sm text-text-secondary mt-1">
                  For new appliances purchased within the last 12 months that currently do not have an active warranty.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/buy-new')}
              className="w-full bg-[#E3ECF9] text-brand-blue font-bold py-3 rounded-xl hover:bg-brand-blue hover:text-white transition-all text-sm shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Buy Warranty <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Option B: Extend Existing Warranty */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color hover:border-brand-yellow transition-all flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-500">
                <Award className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">Extend Existing Warranty</h3>
                <p className="text-sm text-text-secondary mt-1">
                  For appliances with an active warranty that are close to expiry and need continuous coverage protection.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/extend-warranty')}
              className="w-full bg-brand-yellow text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-all text-sm shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Extend Warranty <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Why Choose Us */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Why Protect with Nigam Care?</h4>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="w-5 h-5 bg-[#E8F5E9] rounded-full flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary block">Instant Paperless Approvals</span>
                <span className="text-xs text-text-secondary">Fully digital activation without manual inspections or hard copies.</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 bg-[#E8F5E9] rounded-full flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary block">100% Genuine Spare Parts</span>
                <span className="text-xs text-text-secondary">All part replacements are OEM authorized, preserving appliance lifetime.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Buy;
