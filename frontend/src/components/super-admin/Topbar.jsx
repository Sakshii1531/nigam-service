import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Topbar = ({ title }) => {
  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Page Title */}
      <h1 className="text-xl font-bold text-[#1E293B]">{title}</h1>

      {/* Right Side */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative w-64 hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
            placeholder="Global search..."
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-sm">
            SA
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-[#1E293B]">Super Admin</p>
            <p className="text-xs text-[#64748B]">Platform Control</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
