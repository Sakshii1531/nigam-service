import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, MoreVertical, ChevronDown, TrendingUp, Briefcase, 
  ClipboardList, Wrench, Calendar, User, ShieldCheck, HelpCircle, LogOut, CreditCard, X,
  ArrowLeft
} from 'lucide-react';
import techAvatar from '../../assets/tech_avatar.png';

const Analytics = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('This Week');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pl-8">Analytics</h1>
        <button className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors">
          <MoreVertical className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-6">
        
        {/* Timeframe Selector */}
        <div className="flex justify-start">
          <div className="relative">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-xs font-normal text-slate-600 focus:outline-none focus:border-slate-300 shadow-sm"
            >
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* 2x2 Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Earnings Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Earnings</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">₹18,450</p>
            <div className="flex items-center gap-1 mt-1 text-[#2E7D32]">
              <TrendingUp className="h-3 w-3 text-[#2E7D32]" />
              <span className="text-[10px] font-normal">+12.5%</span>
            </div>
          </div>

          {/* Jobs Completed Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Jobs Completed</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">18</p>
            <div className="flex items-center gap-1 mt-1 text-[#2E7D32]">
              <TrendingUp className="h-3 w-3 text-[#2E7D32]" />
              <span className="text-[10px] font-normal">+8.3%</span>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Completion Rate</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">92%</p>
            <div className="flex items-center gap-1 mt-1 text-[#2E7D32]">
              <TrendingUp className="h-3 w-3 text-[#2E7D32]" />
              <span className="text-[10px] font-normal">+5.2%</span>
            </div>
          </div>

          {/* Customer Rating Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Customer Rating</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">4.9</p>
            <div className="flex items-center gap-1 mt-1 text-[#2E7D32]">
              <TrendingUp className="h-3 w-3 text-[#2E7D32]" />
              <span className="text-[10px] font-normal">+0.1</span>
            </div>
          </div>

        </div>

        {/* Top Services Donut Chart Section */}
        <div className="bg-white rounded-[2rem] p-3.5.5 border border-slate-200 shadow-sm text-left flex flex-col gap-4">
          <h3 className="text-xs font-medium text-[#052355] uppercase tracking-wider">Top Services</h3>
          
          <div className="flex items-center justify-between gap-5 py-2">
            
            {/* Custom SVG Donut Chart */}
            <div className="relative w-[110px] h-[110px] flex items-center justify-center flex-shrink-0">
              <svg width="110" height="110" viewBox="0 0 110 110" className="transform -rotate-90">
                {/* Background circle */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                {/* AC Repair - Blue - 45% (Circumference C = 2*pi*45 = 282.74) */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#0D47A1" strokeWidth="12"
                  strokeDasharray="127.23 282.74" strokeDashoffset="0" />
                {/* Washing Machine - Green - 25% (282.74 * 0.25 = 70.69) */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#2E7D32" strokeWidth="12"
                  strokeDasharray="70.69 282.74" strokeDashoffset="-127.23" />
                {/* Refrigerator - Purple - 20% (282.74 * 0.20 = 56.55) */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#7B1FA2" strokeWidth="12"
                  strokeDasharray="56.55 282.74" strokeDashoffset="-197.92" />
                {/* Others - Yellow/Orange - 10% (282.74 * 0.10 = 28.27) */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#FFB300" strokeWidth="12"
                  strokeDasharray="28.27 282.74" strokeDashoffset="-254.47" />
              </svg>
              {/* Inner hole overlay for text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-slate-600 uppercase">Jobs</span>
                <span className="text-base font-medium text-[#052355]">18</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-normal">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D47A1] inline-block"></span>
                  <span className="text-slate-500 font-normal text-[11px]">AC Repair</span>
                </div>
                <span className="text-[#052355] text-[11px]">45%</span>
              </div>

              <div className="flex items-center justify-between text-xs font-normal">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] inline-block"></span>
                  <span className="text-slate-500 font-normal text-[11px]">Washing Machine</span>
                </div>
                <span className="text-[#052355] text-[11px]">25%</span>
              </div>

              <div className="flex items-center justify-between text-xs font-normal">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7B1FA2] inline-block"></span>
                  <span className="text-slate-500 font-normal text-[11px]">Refrigerator</span>
                </div>
                <span className="text-[#052355] text-[11px]">20%</span>
              </div>

              <div className="flex items-center justify-between text-xs font-normal">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB300] inline-block"></span>
                  <span className="text-slate-500 font-normal text-[11px]">Others</span>
                </div>
                <span className="text-[#052355] text-[11px]">10%</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Sidebar Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-sm z-30 transition-all flex justify-start animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        >
          {/* Drawer Container */}
          <div 
            className="bg-white w-72 h-full shadow-2xl flex flex-col z-40 text-left animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Dark Blue Profile Section */}
            <div className="bg-[#052355] text-white p-3.5 flex flex-col gap-3 relative">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 mt-2 shadow-md">
                <img 
                  src={techAvatar} 
                  alt="Alex Rodriguez Avatar Side" 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div>
                <h3 className="text-sm font-normal text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              
              {/* Dashboard / Jobs */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/dashboard'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Dashboard (Jobs)</span>
              </button>

              {/* My Schedule */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/schedule'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Calendar className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">My Schedule</span>
              </button>

              {/* Part Requests */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/raise-part-request?tab=claims'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ClipboardList className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Part Requests</span>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/inventory'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Wrench className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">My Inventory</span>
              </button>

              {/* Payout Settings */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/payout-settings'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Payout Settings</span>
              </button>

              {/* KYC Verification */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/verification'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ShieldCheck className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">KYC Verification</span>
              </button>

              {/* Help & Support */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/support'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <HelpCircle className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Help & Support</span>
              </button>

              {/* Divider */}
              <div className="h-[1px] bg-slate-100 my-2 mx-5"></div>

              {/* Logout */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/login'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-red-50/20 text-red-500 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-xs font-normal">Logout</span>
              </button>

            </div>

            {/* Version Info */}
            <div className="p-3.5 border-t border-slate-200 text-left">
              <span className="text-[10px] font-normal text-slate-600">Partner App v2.4.1</span>
            </div>
          </div>
        </div>
      )}

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
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Analytics;
