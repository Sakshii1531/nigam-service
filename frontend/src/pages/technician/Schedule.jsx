import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Briefcase, ClipboardList, Wrench, User, CreditCard, ShieldCheck, 
  HelpCircle, LogOut, CheckCircle2, ChevronLeft, ChevronRight, Bell, Clock, 
  MapPin, Phone, ArrowRight, RotateCw, Sparkles
} from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { useTech } from '../../context/TechContext';
import { useNotifications } from '../../context/NotificationContext';

const Schedule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { jobs, selectJobForDetails, acceptJob, earningsTally } = useTech();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const today = new Date();
  
  // Generate a dynamic 7-day rolling window starting from today
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = String(d.getDate()).padStart(2, '0');
    const fullDateStr = d.toISOString().split('T')[0];
    return {
      day: dayName,
      num: dayNum,
      dateStr: fullDateStr,
      isToday: i === 0,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${dayNum} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      current: true,
    };
  });

  const [selectedDateObj, setSelectedDateObj] = useState(calendarDays[0]);

  const activeSchedules = jobs
    .filter(j => {
      if (!selectedDateObj) return true;
      const jobDate = j.scheduledDate 
        ? new Date(j.scheduledDate).toISOString().split('T')[0] 
        : j.revisit?.scheduledDate 
          ? new Date(j.revisit.scheduledDate).toISOString().split('T')[0]
          : null;
      if (jobDate) return jobDate === selectedDateObj.dateStr;
      return selectedDateObj.isToday;
    })
    .map(j => ({
      id: j.id,
      time: j.timeSlot || (j.revisit?.timeSlot) || '09:00 AM - 12:00 PM',
      category: j.category || j.product || 'Service Request',
      customer: j.customerName || 'Customer',
      address: j.address || 'Address details in job sheet',
      phone: j.customerPhone || j.phone,
      isPriority: j.isPriority || j.priority === 'High',
      status: j.status === 'Completed' || j.activeStep === 'completed'
        ? 'Completed' 
        : j.revisit 
          ? 'Revisit' 
          : j.status === 'In Progress' || j.activeStep === 'ontheway' || j.activeStep === 'inspection'
            ? 'In Progress' 
            : 'Confirmed'
    }));

  const handleJobClick = (jobId, status) => {
    selectJobForDetails(jobId);
    if (status === 'Completed') {
      navigate('/technician/billing-estimate');
    } else {
      navigate('/technician/active-job');
    }
  };

  const currentMonthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col pb-28 lg:pb-8 font-sans relative">


      {/* Header — mobile only */}
      <div className="bg-gradient-to-b from-[#052355] to-[#0A337A] text-white pt-4 pb-5 px-4 shadow-md rounded-b-[2rem] sticky top-0 lg:top-16 z-20 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/technician/dashboard')} 
            className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-6 w-6 text-white stroke-[2.5]" />
          </button>
          <div className="text-center flex-1 pr-2">
            <h1 className="text-base font-extrabold text-white tracking-wide">Daily Schedule</h1>
            <span className="text-[11px] text-white/80 font-normal">{currentMonthYear}</span>
          </div>
          <button 
            onClick={() => navigate('/technician/notifications')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell className="h-5 w-5 text-white" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#052355]"></span>
            )}
          </button>
        </div>

        {/* Quick Day Stats Banner */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-1">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">Day Jobs</span>
            <span className="text-base font-black text-white">{activeSchedules.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">Earnings</span>
            <span className="text-base font-black text-emerald-300">₹{earningsTally.today.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/15">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">Completed</span>
            <span className="text-base font-black text-amber-300">{earningsTally.completedToday || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3.5 pt-3.5 flex flex-col gap-4 max-w-screen-lg mx-auto w-full">
        
        {/* Horizontal Calendar Date Ribbon */}
        <div className="bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-black text-[#052355] uppercase tracking-wider">Select Day</span>
            <span className="text-xs font-extrabold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-150">
              {selectedDateObj?.label}
            </span>
          </div>

          <div className="flex gap-1.5 justify-between overflow-x-auto no-scrollbar py-1 w-full">
            {calendarDays.map((dayItem) => {
              const isSelected = selectedDateObj?.dateStr === dayItem.dateStr;
              
              return (
                <button
                  key={dayItem.dateStr}
                  onClick={() => setSelectedDateObj(dayItem)}
                  className={`flex flex-col items-center py-2.5 px-2 rounded-2xl flex-1 min-w-[44px] transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#052355] text-white shadow-xs scale-105 border border-[#052355]'
                      : 'text-slate-500 hover:bg-slate-50 bg-slate-50/70 border border-slate-150'
                  }`}
                >
                  <span className={`text-[10px] font-extrabold uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {dayItem.day}
                  </span>
                  <span className={`text-sm font-black mt-0.5 ${isSelected ? 'text-white' : 'text-[#052355]'}`}>
                    {dayItem.num}
                  </span>
                  {dayItem.isToday && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-amber-400' : 'bg-[#0D47A1]'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Appointments List */}
        <div className="flex-1 flex flex-col relative min-h-[300px] w-full">
          <div className="flex justify-between items-center px-1 mb-1">
            <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">
              Appointments ({activeSchedules.length})
            </h3>
            {activeSchedules.length > 0 && (
              <span className="text-[11px] text-slate-500 font-semibold">Sorted by time slot</span>
            )}
          </div>

          {activeSchedules.length > 0 ? (
            <div className="flex flex-col gap-3 relative w-full mt-1 lg:grid lg:grid-cols-2">
              {activeSchedules.map((item, idx) => (
                <div 
                  key={item.id}
                  onClick={() => handleJobClick(item.id, item.status)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col gap-3 group"
                >
                  {/* Top Bar: Time Slot & Status Pill */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#052355]">
                      <Clock className="w-3.5 h-3.5 text-[#0D47A1]" />
                      <span>{item.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.isPriority && (
                        <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                          Priority
                        </span>
                      )}
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                        item.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'Revisit'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : item.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Category & Customer Info */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-[#052355] truncate group-hover:text-[#0D47A1] transition-colors">
                        {item.category}
                      </h4>
                      <p className="text-xs text-slate-700 font-bold mt-0.5">
                        Customer: <span className="text-slate-900 font-black">{item.customer}</span>
                      </p>
                      <div className="flex items-start gap-1 text-[11px] text-slate-500 font-medium mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1 break-words">{item.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-bold text-slate-400">Booking #{item.id?.slice(-6) || '8842'}</span>
                    <div className="flex items-center gap-1 font-bold text-[#0D47A1] group-hover:translate-x-0.5 transition-transform">
                      <span>{item.status === 'Completed' ? 'View Summary' : 'Open Active Job'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-3 border-2 border-dashed border-slate-200/80 rounded-3xl my-2 bg-white/60">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[#0D47A1]">
                <Calendar className="h-7 w-7 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#052355]">No appointments for {selectedDateObj?.label || 'this day'}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Bookings made by customers or follow-up visits will be scheduled here automatically.
                </p>
              </div>
              <button
                onClick={() => navigate('/technician/dashboard')}
                className="mt-2 text-xs font-bold text-[#0D47A1] hover:underline"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>

        {/* Daily Summary Card */}
        <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 rounded-3xl p-4 sm:p-5 border border-blue-100 shadow-2xs flex flex-col gap-3 w-full">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#052355] uppercase tracking-wider">Performance Tally</span>
            <span className="text-[10px] font-bold text-slate-500">Live Metric</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-2.5 border border-slate-150">
              <span className="text-lg sm:text-xl font-black text-[#052355]">{jobs.length}</span>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase mt-0.5">Total Jobs</span>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-2.5 border border-slate-150">
              <span className="text-lg sm:text-xl font-black text-[#16A34A]">₹{earningsTally.today.toLocaleString('en-IN')}</span>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase mt-0.5">Earnings</span>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-2.5 border border-slate-150">
              <span className="text-lg sm:text-xl font-black text-[#0D47A1]">{earningsTally.completedToday || 0}</span>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase mt-0.5">Completed</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="schedule" />

    </div>
  );
};

export default Schedule;
