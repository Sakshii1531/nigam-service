import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, Calendar, Briefcase, ClipboardList, Wrench, User, CreditCard, ShieldCheck, HelpCircle, LogOut, X } from 'lucide-react';
import { useTech } from '../../context/TechContext';

const Schedule = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { jobs, notifications, selectJobForDetails, acceptJob, earningsTally } = useTech();

  const [selectedDate, setSelectedDate] = useState('Today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const calendarDays = [
    { day: 'Sun', num: '12', current: false },
    { day: 'Mon', num: '13', current: true },
    { day: 'Tue', num: '14', current: true },
    { day: 'Wed', num: '15', current: true },
    { day: 'Thu', num: '16', current: true },
    { day: 'Fri', num: '17', current: true },
    { day: 'Sat', num: '18', current: true },
    { day: 'Sun', num: '19', current: true }
  ];

  const activeSchedules = jobs.map(j => ({
    id: j.id,
    time: '09:00 AM',
    category: j.category || j.product,
    customer: j.customerName || 'Customer',
    address: j.address || 'Location',
    status: j.isAvailableRequest ? 'Pending' : 'Confirmed'
  }));

  const handleJobClick = (jobId, status) => {
    if (status === 'Confirmed') {
      acceptJob(jobId);
    } else {
      selectJobForDetails(jobId);
    }
    navigate('/technician/active-job');
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
        
        <h1 className="text-base font-extrabold text-[#052355] flex-1 text-center pr-8">Schedule</h1>
        
        <div className="w-8"></div> {/* Spacer to center the title */}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col gap-6">
        
        {/* Horizontal Calendar Date Ribbon */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-extrabold text-[#052355]">May 2026</span>
          </div>

          <div className="flex gap-1 justify-between overflow-x-auto no-scrollbar py-2">
            {calendarDays.map((dayItem) => {
              const dateStr = `${dayItem.day} ${dayItem.num}`;
              const isSelected = selectedDate === dateStr;
              const isFaded = !dayItem.current;
              
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    if (dayItem.current) {
                      setSelectedDate(dateStr);
                    }
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl min-w-[42px] transition-all ${
                    isSelected
                      ? 'bg-[#0D47A1] text-white shadow-xs'
                      : isFaded
                        ? 'opacity-30 text-slate-400 cursor-not-allowed'
                        : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-450'}`}>
                    {dayItem.day}
                  </span>
                  <span className={`text-sm font-black mt-1 ${isSelected ? 'text-white' : 'text-[#052355]'}`}>
                    {dayItem.num}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Slot List */}
        <div className="flex-1 flex flex-col relative min-h-[360px]">
          {activeSchedules.length > 0 ? (
            <div className="flex flex-col gap-6 relative pl-4 mt-2">
              
              {/* Blue Vertical Timeline Line */}
              <div className="absolute left-[108px] top-[22px] bottom-[22px] w-[2px] bg-[#B9D1F9]"></div>

              {activeSchedules.map((item, idx) => (
                <div key={item.id} className="flex gap-4 items-start relative">
                  
                  {/* Left Side: Time column */}
                  <div className="w-16 flex flex-col items-center flex-shrink-0 pt-0.5">
                    <span className="text-xs font-black text-[#052355] whitespace-nowrap">{item.time}</span>
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 mt-1">
                      G
                    </div>
                  </div>

                  {/* Middle Side: Timeline node circle */}
                  <div className="relative flex items-center justify-center h-6 w-6 z-10 flex-shrink-0">
                    <div className={`rounded-full bg-white border-[#1E6BDB] ${
                      idx === 0 
                        ? 'w-3.5 h-3.5 border-[2.5px]' 
                        : 'w-2.5 h-2.5 border-2'
                    }`}></div>
                  </div>

                  {/* Right Side: Appointment Detail Card */}
                  <div 
                    onClick={() => handleJobClick(item.id, item.status)}
                    className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex justify-between items-start"
                  >
                    <div className="text-left flex-1 min-w-0 pr-2">
                      <h4 className="text-sm font-extrabold text-[#052355] truncate leading-tight">{item.category}</h4>
                      <p className="text-xs text-slate-400 font-semibold mt-1 truncate">{item.customer}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{item.address}</p>
                    </div>

                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full tracking-wide whitespace-nowrap ${
                      item.status === 'Confirmed'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-orange-55 text-orange-700 border border-orange-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-3 border border-dashed border-slate-200 rounded-3xl my-2">
              <Calendar className="h-10 w-10 text-slate-300" />
              <div>
                <h4 className="text-sm font-bold text-[#052355]">No appointments scheduled</h4>
                <p className="text-xs text-slate-400 mt-1">Bookings made from customer app will appear here when assigned.</p>
              </div>
            </div>
          )}
        </div>

        {/* Today's Summary Card */}
        <div className="bg-[#EBF3FC] rounded-3xl p-5 border border-[#1A73E8]/10 shadow-2xs flex flex-col gap-4">
          <span className="text-xs font-extrabold text-[#052355] text-left">Today's Summary</span>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#052355]">{activeSchedules.length}</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase mt-1">Jobs</span>
            </div>
            
            <div className="flex flex-col items-center justify-center border-x border-slate-200">
              <span className="text-2xl font-black text-[#052355]">₹{earningsTally.today.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase mt-1">Earnings</span>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#052355]">{earningsTally.completedToday}</span>
              <span className="text-[10px] font-bold text-slate-450 uppercase mt-1">Completed</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sidebar Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 transition-all flex justify-start"
          onClick={() => setIsSidebarOpen(false)}
        >
          {/* Drawer Container */}
          <div 
            className="bg-white w-72 h-full shadow-2xl flex flex-col z-40 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Dark Blue Profile Section */}
            <div className="bg-[#052355] text-white p-5 flex flex-col gap-3 relative">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md border-2 border-white/20 mt-2">
                AR
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              
              {/* Dashboard / Jobs */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/dashboard'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Dashboard (Jobs)</span>
              </button>

              {/* My Schedule */}
              <button 
                onClick={() => { setIsSidebarOpen(false); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 bg-blue-50/50 text-[#0D47A1] transition-colors text-left"
              >
                <Calendar className="h-5 w-5 text-[#0D47A1]" />
                <span className="text-xs font-bold">My Schedule</span>
              </button>

              {/* Part Requests */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/raise-part-request?tab=claims'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ClipboardList className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Part Requests</span>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/inventory'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Wrench className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">My Inventory</span>
              </button>

              {/* Payout Settings */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/payout-settings'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Payout Settings</span>
              </button>

              {/* KYC Verification */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/verification'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">KYC Verification</span>
              </button>

              {/* Help & Support */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/support'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <HelpCircle className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Help & Support</span>
              </button>

              {/* Divider */}
              <div className="h-[1px] bg-slate-100 my-2 mx-5"></div>

              {/* Logout */}
              <button 
                onClick={() => { setIsSidebarOpen(false); setShowLogoutConfirm(true); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-red-50/20 text-red-500 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-xs font-bold">Logout</span>
              </button>

            </div>

            {/* Version Info */}
            <div className="p-5 border-t border-slate-100 text-left">
              <span className="text-[10px] font-bold text-slate-400">Partner App v2.4.1</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 px-6 flex justify-around items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <Calendar className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-black tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Profile</span>
        </button>
      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#052355] mb-1">Log Out</h4>
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
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  // Clearing the session is what actually logs the user out;
                  // navigating alone left the tokens in place, so the route
                  // guard saw an authenticated user and sent them straight back.
                  await logout();
                  navigate('/technician/login', { replace: true });
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

export default Schedule;
