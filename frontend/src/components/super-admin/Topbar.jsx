import React from 'react';
import { Search, Bell, Menu, MapPin, Calendar, ChevronDown } from 'lucide-react';

const Topbar = ({ title, subtitle, showFilters = false }) => {
  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left side: Hamburger menu + Title/Subtitle */}
      <div className="flex items-center gap-4">
        <button className="p-1.5 hover:bg-slate-50 rounded-lg text-[#64748B] hover:text-[#1E293B] cursor-pointer">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-[#1E293B] tracking-tight leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[#64748B] font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Side: Filters, Search, Notification Bell, User Avatar */}
      <div className="flex items-center gap-4">
        {showFilters && (
          <>
            {/* Location Selector */}
            <div className="relative">
              <button className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E293B] bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none">
                <MapPin size={14} className="text-[#0D47A1]" />
                <span>All India</span>
                <ChevronDown size={12} className="text-[#64748B]" />
              </button>
            </div>

            {/* Date Selector */}
            <div className="relative">
              <button className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E293B] bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none">
                <Calendar size={14} className="text-[#0D47A1]" />
                <span>21 May 2025</span>
                <ChevronDown size={12} className="text-[#64748B]" />
              </button>
            </div>
          </>
        )}

        {/* Search Icon Button */}
        <button className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-full transition-colors cursor-pointer">
          <Search size={18} />
        </button>

        {/* Notifications Icon Button with Badge */}
        <button className="relative p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-full transition-colors cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-[9px] font-extrabold text-white rounded-full flex items-center justify-center border border-white">
            2
          </span>
        </button>

        {/* User initials badge with active status */}
        <div className="relative flex items-center gap-2 cursor-pointer pl-2 border-l border-slate-200">
          <div className="w-8.5 h-8.5 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-xs select-none">
            SA
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
