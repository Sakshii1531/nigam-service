import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Shield, Check } from 'lucide-react';

const Verification = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Verification</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Status Header */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Verified Partner</h2>
          <p className="text-xs text-slate-500 text-center">Your documents are verified. You are eligible for premium jobs.</p>
        </div>

        {/* Documents List */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Submitted Documents</h3>
          
          <div className="flex flex-col gap-3">
            {/* Doc 1 */}
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Aadhar Card</h4>
                <p className="text-xs text-slate-500">Uploaded on Oct 12, 2023</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> Verified
              </span>
            </div>

            {/* Doc 2 */}
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">PAN Card</h4>
                <p className="text-xs text-slate-500">Uploaded on Oct 12, 2023</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> Verified
              </span>
            </div>

            {/* Doc 3 */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Criminal Background Check</h4>
                <p className="text-xs text-slate-500">Expires on Oct 12, 2024</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> Verified
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Verification;
