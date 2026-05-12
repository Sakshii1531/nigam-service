import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home as HomeIcon, Calendar, Wrench, User, ClipboardList, Briefcase, Star, Settings, ChevronRight, LogOut, Shield, CreditCard, HelpCircle, TrendingUp } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Profile Header */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center">
          <div className="w-24 h-24 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-semibold text-2xl mb-4">
            A
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Alex Rodriguez</h2>
          <p className="text-sm text-slate-500">Expert HVAC Technician</p>
          
          <div className="flex items-center gap-1 mt-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-slate-700">4.9</span>
            <span className="text-xs text-slate-400">(120+ Reviews)</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-xs font-semibold text-slate-500">Total Earnings</span>
            <p className="text-lg font-semibold text-[#0D47A1] mt-1">$12,450</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
            <span className="text-xs font-semibold text-slate-500">Jobs Done</span>
            <p className="text-lg font-semibold text-slate-900 mt-1">154</p>
          </div>
        </div>

        {/* Menu Options */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Edit Profile */}
          <button 
            onClick={() => navigate('/technician/personal-info')}
            className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-900">Personal Info</h4>
                <p className="text-xs text-slate-500">Name, Phone, Address</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Payout Settings */}
          <button 
            onClick={() => navigate('/technician/payout-settings')}
            className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-900">Payout Settings</h4>
                <p className="text-xs text-slate-500">Bank accounts, History</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Earnings */}
          <button 
            onClick={() => navigate('/technician/earnings')}
            className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-900">Earnings</h4>
                <p className="text-xs text-slate-500">History, Payouts, Stats</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Verification */}
          <button 
            onClick={() => navigate('/technician/verification')}
            className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-900">Verification</h4>
                <p className="text-xs text-slate-500">Documents & Badges</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Support */}
          <button 
            onClick={() => navigate('/technician/support')}
            className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-900">Help & Support</h4>
                <p className="text-xs text-slate-500">FAQs, Contact us</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

          {/* Logout */}
          <button 
            onClick={() => navigate('/technician/login')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-red-500">Logout</h4>
                <p className="text-xs text-slate-400">Exit partner panel</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>

        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button 
          onClick={() => navigate('/technician/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </button>
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs font-medium">Requests</span>
        </button>
        <button 
          onClick={() => navigate('/technician/active-job')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Schedule</span>
        </button>
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default ProfilePage;
