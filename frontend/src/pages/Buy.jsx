import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Award, Check, ChevronRight, ShoppingCart,
  Home as HomeIcon, Calendar, Wrench, User, Sparkles, Zap, PackageOpen
} from 'lucide-react';
import { motion } from 'framer-motion';

const Buy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-32">
      
      {/* HEADER */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Nigam Store & Care</h1>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

        {/* Two Core Options Grid */}
        <div className="flex flex-col gap-4">
          
          {/* Option 1: Buy Warranty */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color hover:border-[#0D47A1] transition-all flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/40 rounded-full blur-xl group-hover:bg-blue-50/70 transition-all"></div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-brand-blue">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-text-primary">Buy Appliance Warranty</h3>
                  <span className="bg-[#E3F2FD] text-[#0D47A1] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">POPULAR</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  Protect your home appliances from breakdowns. Includes 100% parts cover, unlimited visits, & OEM support.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/buy-new')}
              className="w-full bg-[#E3ECF9] text-brand-blue font-bold py-2 rounded-lg hover:bg-brand-blue hover:text-white transition-all text-xs shadow-sm flex items-center justify-center gap-1 cursor-pointer relative z-10"
            >
              Protect My Appliance <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Option 2: Buy Product */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color hover:border-brand-yellow transition-all flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50/30 rounded-full blur-xl group-hover:bg-amber-50/50 transition-all"></div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-500">
                <PackageOpen className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-text-primary">Buy Certified Product</h3>
                  <span className="bg-[#FFF8E1] text-[#FF8F00] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">1-Yr Warranty</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  Shop certified refurbished and new home appliances. Rigorously tested, pristine condition, and fully covered.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/buy-product')}
              className="w-full bg-brand-yellow text-black font-bold py-2 rounded-lg hover:bg-yellow-400 transition-all text-xs shadow-sm flex items-center justify-center gap-1 cursor-pointer relative z-10"
            >
              Browse Products <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

        {/* Why Choose Us */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color">
          <h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Why Trust Nigam Assurance?</h4>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <div className="w-[18px] h-[18px] bg-[#E8F5E9] rounded-full flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-text-primary block">Instant Digital Activations</span>
                <span className="text-[11px] text-text-secondary leading-relaxed block">Fully paperless onboarding without manual inspection delays.</span>
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="w-[18px] h-[18px] bg-[#E8F5E9] rounded-full flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-text-primary block">Genuine OEM Spares</span>
                <span className="text-[11px] text-text-secondary leading-relaxed block">All replacement components are authorized, preserving appliance lifespan.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center text-brand-blue">
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>
        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/services')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Wrench className="h-6 w-6" />
          <span className="text-xs font-medium">Services</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Buy;
