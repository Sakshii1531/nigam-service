import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, User, LogOut, Phone, Calendar } from 'lucide-react';

const Topbar = ({ title, subtitle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-10 gap-4">
      
      {/* Left: Title */}
      <div className="flex flex-col justify-center min-w-[160px]">
        <h1 className="text-base font-bold text-[#1E293B] font-sans leading-tight">{title}</h1>
        {subtitle && <p className="text-[10px] text-[#64748B] leading-tight">{subtitle}</p>}
      </div>

      {/* Center: Toll-free + Date Range */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
          <Phone size={13} className="text-[#0D47A1]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider leading-none">Toll Free Number</span>
            <span className="text-xs font-bold text-[#1E293B] leading-tight">1800-123-4567</span>
          </div>
          <ChevronDown size={12} className="text-[#64748B]" />
        </div>

        <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#E8EFF7] transition-colors">
          <Calendar size={13} className="text-[#0D47A1]" />
          <span className="text-xs font-semibold text-[#1E293B] whitespace-nowrap">21 May 2025 – 21 May 2025</span>
          <ChevronDown size={12} className="text-[#64748B]" />
        </div>
      </div>

      {/* Right: Bell + Profile */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => navigate('/brand-admin/notifications')}
          className="relative cursor-pointer text-[#64748B] hover:text-[#1E293B] p-1"
        >
          <Bell size={20} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">9</span>
        </div>

        <div className="relative">
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold text-xs">
              BP
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold text-[#1E293B] block leading-tight">Brand Admin</span>
              <span className="text-[10px] text-[#64748B] leading-tight">Brand Admin</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748B] group-hover:text-[#1E293B] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </div>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { setIsDropdownOpen(false); navigate('/brand-admin/settings'); }}
                  className="w-full text-left px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2 transition-colors"
                >
                  <User size={16} className="text-[#64748B]" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => { setIsDropdownOpen(false); navigate('/brand-admin/login'); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-[#F1F5F9]"
                >
                  <LogOut size={16} className="text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;

