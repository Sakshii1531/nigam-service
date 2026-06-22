import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, AlertTriangle } from 'lucide-react';

const Announcements = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-base font-semibold text-white">Announcements</h1>
        </div>
        <Bell className="h-5.5 w-5.5 text-white/90" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 text-left pb-8">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notice & alert from Headquarters</span>

        {/* List of Notices */}
        <div className="flex flex-col gap-4">
          {/* Notice 1: Critical */}
          <div className="bg-white rounded-3xl p-4 border-l-4 border-red-500 border-y border-r border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="bg-red-50 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                CRITICAL SAFETY ALERT
              </span>
              <span className="text-[9px] text-slate-400 font-normal">2 hours ago</span>
            </div>
            <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Double-Harness Safety Mandatory Above 2nd Floor</h4>
            <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
              Headquarters requires all service partners to wear double-harness safety gear for outdoor unit AC works. You must take and upload a selfie wearing safety harness before commencing work. Payout holds apply for safety violations.
            </p>
          </div>

          {/* Notice 2: Incentive */}
          <div className="bg-white rounded-3xl p-4 border-l-4 border-amber-500 border-y border-r border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                MONSOON SCHEME
              </span>
              <span className="text-[9px] text-slate-400 font-normal">1 day ago</span>
            </div>
            <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">1.5x Incentive on AC Wet Servicing</h4>
            <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
              Get a 1.5x earnings multiplier on all preventive wet cleaning and leakage calls completed between 2:00 PM and 6:00 PM this week. Make sure to upsell additional services (jet cleaning, outdoor unit check) to customer.
            </p>
          </div>

          {/* Notice 3: App Update */}
          <div className="bg-white rounded-3xl p-4 border-l-4 border-blue-500 border-y border-r border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                APP UPDATE
              </span>
              <span className="text-[9px] text-slate-400 font-normal">3 days ago</span>
            </div>
            <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Partner App v2.4.1 Released</h4>
            <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
              Please update your Nigam Care Partner App immediately from the Play Store. This update improves live GPS precision and resolves real-time spare part inventory syncing issues.
            </p>
          </div>

          {/* Notice 4: Payout timing */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="bg-slate-50 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                PAYMENT NOTICE
              </span>
              <span className="text-[9px] text-slate-400 font-normal">5 days ago</span>
            </div>
            <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Weekly Payout Timing Update</h4>
            <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
              Due to the upcoming National Bank Holiday on Wednesday, June 24th, payouts will be dispatched to your registered bank account on June 25th instead. Bank transfers may take up to 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
