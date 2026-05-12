import React from 'react';
import { Search, Bell, ChevronDown, Globe } from 'lucide-react';

const Topbar = ({ title }) => {
  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Title / Search */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-[#1E293B] font-sans">{title}</h1>
        
        <div className="relative hidden md:block w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
            placeholder="Search requests, parts..."
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Language/Region */}
        <button className="text-[#64748B] hover:text-[#1E293B] flex items-center gap-1 text-sm font-medium">
          <Globe size={18} />
          <span>EN</span>
        </button>

        {/* Notifications */}
        <div className="relative cursor-pointer text-[#64748B] hover:text-[#1E293B]">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-sm">
            LG
          </div>
          <div className="hidden md:block">
            <span className="text-sm font-medium text-[#1E293B] block">LG Electronics</span>
            <span className="text-xs text-[#64748B]">Partner Admin</span>
          </div>
          <ChevronDown size={16} className="text-[#64748B] group-hover:text-[#1E293B] transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default Topbar;
