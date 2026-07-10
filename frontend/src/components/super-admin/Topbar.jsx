import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, MapPin, Calendar, ChevronDown, User, LogOut, Settings, Check } from 'lucide-react';

const Topbar = ({ title, subtitle, showFilters = false }) => {
  const navigate = useNavigate();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All India');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('21 May 2025');
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const locations = ['All India', 'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad'];

  const dates = [
    { label: 'Today (21 May 2025)', value: '21 May 2025' },
    { label: 'Yesterday', value: '20 May 2025' },
    { label: 'Last 7 Days', value: 'Last 7 Days' },
    { label: 'Last 30 Days', value: 'Last 30 Days' },
    { label: 'This Month', value: 'This Month' }
  ];

  return (
    <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left side: Hamburger menu + Title/Subtitle */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => triggerToast('Sidebar menu toggled')}
          className="p-1.5 hover:bg-slate-50 rounded-lg text-[#64748B] hover:text-[#1E293B] cursor-pointer"
        >
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
              <button 
                onClick={() => { setIsLocationOpen(!isLocationOpen); setIsDateOpen(false); setIsUserOpen(false); }}
                className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E293B] bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                <MapPin size={14} className="text-[#0D47A1]" />
                <span>{selectedLocation}</span>
                <ChevronDown size={12} className={`text-[#64748B] transition-transform duration-200 ${isLocationOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLocationOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsLocationOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    {locations.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setSelectedLocation(loc);
                          setIsLocationOpen(false);
                          triggerToast(`Location filtered to ${loc}`);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-[#F8FAFC] transition-colors font-semibold flex items-center justify-between ${
                          selectedLocation === loc ? 'text-[#0D47A1] bg-[#F1F5F9]' : 'text-[#1E293B]'
                        }`}
                      >
                        <span>{loc}</span>
                        {selectedLocation === loc && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date Selector */}
            <div className="relative">
              <button 
                onClick={() => { setIsDateOpen(!isDateOpen); setIsLocationOpen(false); setIsUserOpen(false); }}
                className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E293B] bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                <Calendar size={14} className="text-[#0D47A1]" />
                <span>{selectedDate}</span>
                <ChevronDown size={12} className={`text-[#64748B] transition-transform duration-200 ${isDateOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDateOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    {dates.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => {
                          setSelectedDate(d.value);
                          setIsDateOpen(false);
                          triggerToast(`Date filter updated to ${d.label}`);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-[#F8FAFC] transition-colors font-semibold flex items-center justify-between ${
                          selectedDate === d.value ? 'text-[#0D47A1] bg-[#F1F5F9]' : 'text-[#1E293B]'
                        }`}
                      >
                        <span>{d.label}</span>
                        {selectedDate === d.value && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Search Icon Button */}
        <button 
          onClick={() => triggerToast('Opening search panel')}
          className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-full transition-colors cursor-pointer"
        >
          <Search size={18} />
        </button>

        {/* Notifications Icon Button with Badge */}
        <button 
          onClick={() => triggerToast('Opening notifications')}
          className="relative p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-full transition-colors cursor-pointer"
        >
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-[9px] font-extrabold text-white rounded-full flex items-center justify-center border border-white">
            2
          </span>
        </button>

        {/* User initials badge with active status */}
        <div className="relative flex items-center gap-2 cursor-pointer pl-2 border-l border-slate-200">
          <div 
            onClick={() => { setIsUserOpen(!isUserOpen); setIsLocationOpen(false); setIsDateOpen(false); }}
            className="w-8.5 h-8.5 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-xs select-none relative"
          >
            SA
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
          </div>

          {isUserOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsUserOpen(false)} />
              <div className="absolute right-0 mt-12 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <button
                  onClick={() => {
                    setIsUserOpen(false);
                    navigate('/super-admin/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2 transition-colors font-semibold"
                >
                  <Settings size={14} className="text-[#64748B]" />
                  <span>System Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold border-t border-[#F1F5F9]"
                >
                  <LogOut size={14} className="text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Local success message Toast */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0D47A1] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check size={14} />
          {toastMsg}
        </div>
      )}

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-1">Log Out</h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  navigate('/super-admin/login');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;
