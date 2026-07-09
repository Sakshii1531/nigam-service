import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, User, LogOut, Phone, Calendar, Copy, Check, Mail } from 'lucide-react';

const Topbar = ({ title, subtitle }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('21 May 2025 – 21 May 2025');
  const [copied, setCopied] = useState(false);
  
  const navigate = useNavigate();

  const handleCopyPhone = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText('1800-123-4567');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dateOptions = [
    { label: 'Today (21 May 2025)', val: '21 May 2025 – 21 May 2025' },
    { label: 'Yesterday (20 May 2025)', val: '20 May 2025 – 20 May 2025' },
    { label: 'Last 7 Days', val: '15 May 2025 – 21 May 2025' },
    { label: 'Last 30 Days', val: '21 Apr 2025 – 21 May 2025' },
    { label: 'This Month', val: '01 May 2025 – 31 May 2025' }
  ];

  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-30 gap-4">
      
      {/* Left: Title */}
      <div className="flex flex-col justify-center min-w-[160px]">
        <h1 className="text-base font-bold text-[#1E293B] font-sans leading-tight">{title}</h1>
        {subtitle && <p className="text-[10px] text-[#64748B] leading-tight">{subtitle}</p>}
      </div>

      {/* Center: Toll-free + Date Range */}
      <div className="flex items-center gap-3 flex-1 justify-center relative">
        
        {/* Toll-Free Dropdown */}
        <div className="relative">
          <div 
            onClick={() => { setIsPhoneDropdownOpen(!isPhoneDropdownOpen); setIsDateDropdownOpen(false); }}
            className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#E8EFF7] transition-all select-none"
          >
            <Phone size={13} className="text-[#0D47A1]" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider leading-none">Toll Free Number</span>
              <span className="text-xs font-bold text-[#1E293B] leading-tight">1800-123-4567</span>
            </div>
            <ChevronDown size={12} className={`text-[#64748B] transition-transform duration-200 ${isPhoneDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isPhoneDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsPhoneDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Support Hotline</p>
                <div className="flex items-center justify-between bg-[#F8FAFC] rounded-lg p-2 mb-2 border border-[#E2E8F0]">
                  <div>
                    <p className="text-[9px] text-[#64748B] font-medium leading-none">Toll-Free</p>
                    <p className="text-xs font-bold text-[#1E293B] mt-0.5">1800-123-4567</p>
                  </div>
                  <button 
                    onClick={handleCopyPhone}
                    className="p-1.5 hover:bg-[#EEF2F6] rounded-md text-[#64748B] hover:text-[#1E293B] transition-colors"
                    title="Copy Number"
                  >
                    {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <a href="tel:18001234567" className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#0D47A1] font-bold hover:bg-[#EEF4FF] rounded-lg transition-colors">
                    <Phone size={13} />
                    <span>Call Helpline Now</span>
                  </a>
                  <a href="mailto:support@brand.com" className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors">
                    <Mail size={13} className="text-[#64748B]" />
                    <span>Email Support</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Date Range Dropdown */}
        <div className="relative">
          <div 
            onClick={() => { setIsDateDropdownOpen(!isDateDropdownOpen); setIsPhoneDropdownOpen(false); }}
            className="flex items-center gap-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#E8EFF7] transition-all select-none"
          >
            <Calendar size={13} className="text-[#0D47A1]" />
            <span className="text-xs font-semibold text-[#1E293B] whitespace-nowrap">{selectedDateRange}</span>
            <ChevronDown size={12} className={`text-[#64748B] transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDateDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-3 py-1.5 border-b border-[#F1F5F9]">Select Date Range</p>
                <div className="py-1">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setSelectedDateRange(opt.val); setIsDateDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedDateRange === opt.val 
                          ? 'bg-[#EEF4FF] text-[#0D47A1]' 
                          : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedDateRange === opt.val && <Check size={12} className="text-[#0D47A1]" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
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
            onClick={() => { setIsDropdownOpen(!isDropdownOpen); setIsPhoneDropdownOpen(false); setIsDateDropdownOpen(false); }}
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
