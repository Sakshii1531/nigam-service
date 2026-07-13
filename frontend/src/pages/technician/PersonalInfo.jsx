import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, Save } from 'lucide-react';

const PersonalInfo = () => {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg z-55 flex items-center gap-2 border border-green-500 animate-in fade-in slide-in-from-top-4 duration-250">
          <span className="text-xs font-semibold">✓ Profile updated successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Personal Info</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Info Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
            <input 
              type="text" 
              defaultValue="Alex Rodriguez" 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
            <input 
              type="email" 
              defaultValue="alex.r@example.com" 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
            <input 
              type="tel" 
              defaultValue="+91 98765 43210" 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1]"
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
            <textarea 
              defaultValue="Flat 4B, Royal Residency, Gomti Nagar, Lucknow, UP 226010" 
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#0D47A1] resize-none h-20"
            />
          </div>

        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          Save Changes
        </button>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-3.5 flex justify-around items-center z-20 shadow-lg">
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

export default PersonalInfo;
