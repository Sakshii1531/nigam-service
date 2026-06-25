import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, LogOut } from 'lucide-react';

const Topbar = ({ title }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

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
        {/* Notifications */}
        <div className="relative cursor-pointer text-[#64748B] hover:text-[#1E293B]">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-sm">
              LG
            </div>
            <div className="hidden md:block text-left">
              <span className="text-sm font-medium text-[#1E293B] block">LG Electronics</span>
              <span className="text-xs text-[#64748B]">Partner Admin</span>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-[#64748B] group-hover:text-[#1E293B] transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>

          {isDropdownOpen && (
            <>
              {/* Invisible backdrop to dismiss dropdown on click outside */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/brand-admin/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2 transition-colors"
                >
                  <User size={16} className="text-[#64748B]" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/brand-admin/login');
                  }}
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
