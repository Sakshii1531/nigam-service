import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileText, Info, ShieldCheck, Heart } from 'lucide-react';

const AboutNCC = () => {
  const navigate = useNavigate();

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
        <h1 className="text-sm font-black text-slate-900">About NCC</h1>
      </div>

      <div className="flex flex-col items-center px-4 sm:px-6 pt-8 gap-6 flex-1 max-w-3xl mx-auto w-full text-left">
        
        {/* App Logo Indicator */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#0D47A1] to-[#1E88E5] rounded-[24px] flex items-center justify-center shadow-lg text-white font-black text-3xl">
            N
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">Nigam Care Center</h2>
            <span className="text-[10px] text-slate-400 font-extrabold block mt-0.5">Version 1.0.0 (Production Build)</span>
          </div>
        </div>

        {/* Short Bio */}
        <p className="text-[11px] text-slate-500 font-bold text-center leading-relaxed max-w-md px-4">
          Nigam Care Center (NCC) is a next-generation client service platform delivering premium appliance diagnostic, cleaning, repair, and warranty solutions right to your doorstep.
        </p>

        {/* List of links */}
        <div className="w-full bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-xs flex flex-col divide-y divide-slate-100 mt-2">
          
          {/* Terms of Service */}
          <div 
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer" 
            onClick={() => navigate('/terms-and-conditions')}
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Terms of Service</span>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
          </div>

          {/* Privacy Policy */}
          <div 
            className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer" 
            onClick={() => navigate('/privacy-policy')}
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Privacy Policy</span>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
          </div>

          {/* Version Info / Licenses */}
          <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => alert('Software Licenses: React 19, Vite 8, TailwindCSS 4, Lucide Icons.')}>
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Info className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Open Source Licenses</span>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
          </div>

        </div>

        {/* Footer Credit */}
        <div className="mt-auto flex flex-col items-center gap-1.5 pt-8 text-center">
          <span className="text-[9px] text-slate-400 font-extrabold flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> in India
          </span>
          <span className="text-[8px] text-slate-400 font-bold">
            © 2026 Nigam Care Center. All rights reserved.
          </span>
        </div>

      </div>
    </div>
  );
};

export default AboutNCC;
