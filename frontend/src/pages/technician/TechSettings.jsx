import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Globe, Moon, Lock, Briefcase, ClipboardList, Calendar, Wrench, User, ChevronRight } from 'lucide-react';

const Toggle = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-[#0D47A1]' : 'bg-slate-200'}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

const TechSettings = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationAccess, setLocationAccess] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-4">

        {/* Notifications Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#0D47A1]" />
            Notifications
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Push Notifications</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Receive app alerts</p>
              </div>
              <Toggle enabled={notifications} onToggle={() => setNotifications(p => !p)} />
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Job Alerts</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">New job assignment alerts</p>
              </div>
              <Toggle enabled={jobAlerts} onToggle={() => setJobAlerts(p => !p)} />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-[#0D47A1]" />
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#052355]">Dark Mode</p>
              <p className="text-[10px] text-slate-500 font-normal mt-0.5">Switch to dark theme</p>
            </div>
            <Toggle enabled={darkMode} onToggle={() => setDarkMode(p => !p)} />
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#0D47A1]" />
            Privacy
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#052355]">Location Access</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Share location for jobs</p>
              </div>
              <Toggle enabled={locationAccess} onToggle={() => setLocationAccess(p => !p)} />
            </div>
            <div className="h-[1px] bg-slate-100" />
            <button className="flex items-center justify-between w-full">
              <div className="text-left">
                <p className="text-xs font-medium text-[#052355]">Change Password</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Update your login password</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Language Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-medium text-[#052355] mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#0D47A1]" />
            Language & Region
          </h3>
          <button className="flex items-center justify-between w-full">
            <div className="text-left">
              <p className="text-xs font-medium text-[#052355]">App Language</p>
              <p className="text-[10px] text-slate-500 font-normal mt-0.5">English (India)</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* App Version */}
        <p className="text-[10px] text-slate-400 font-normal text-center">Partner App v2.4.1</p>

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

export default TechSettings;
