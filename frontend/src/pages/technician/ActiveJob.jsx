import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home as HomeIcon, Calendar, Wrench, User, ClipboardList, Briefcase, Star } from 'lucide-react';

const SchedulePage = () => {
  const navigate = useNavigate();

  const timeline = [
    {
      id: 1,
      time: '09:00 AM - 10:30 AM',
      title: 'Dishwasher Repair',
      location: '124 Oak Street, Suite 4',
      active: true,
    },
    {
      id: 2,
      time: '01:00 PM - 02:30 PM',
      title: 'Oven Calibration',
      location: '892 Pine Ave',
      active: false,
    },
    {
      id: 3,
      time: '04:00 PM - 05:00 PM',
      title: 'HVAC Inspection',
      location: 'Commercial Plaza B',
      active: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            A
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Technician Panel</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Today's Schedule Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
            <Calendar className="h-5 w-5 text-slate-700" />
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-4 relative">
            {/* Vertical Line */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>

            {timeline.map((item) => (
              <div key={item.id} className="flex gap-4 relative">
                {/* Dot */}
                <div className={`w-5 h-5 rounded-full border-2 bg-white z-10 flex-shrink-0 mt-1 ${
                  item.active ? 'border-[#0D47A1]' : 'border-slate-300'
                }`}>
                  {item.active && (
                    <div className="w-2 h-2 bg-[#0D47A1] rounded-full m-auto mt-0.5"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${
                    item.active ? 'text-[#0D47A1]' : 'text-slate-500'
                  }`}>
                    {item.time}
                  </span>
                  <div className={`mt-1 p-4 rounded-xl border ${
                    item.active 
                      ? 'bg-white border-[#0D47A1] border-l-4' 
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View Full Calendar Button */}
          <button 
            onClick={() => alert('Calendar feature coming soon!')}
            className="w-full mt-6 border border-[#0D47A1] text-[#0D47A1] font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            View Full Calendar
          </button>
        </div>

        {/* Weekly Overview */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-slate-900">Weekly Overview</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Earnings</span>
              <p className="text-xl font-semibold text-[#0D47A1] mt-1">$1,240</p>
            </div>
            {/* Completed */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Completed</span>
              <p className="text-xl font-semibold text-slate-900 mt-1">18</p>
            </div>
            {/* Rating */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Rating</span>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xl font-semibold text-slate-900">4.9</p>
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            {/* On Time */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">On Time</span>
              <p className="text-xl font-semibold text-slate-900 mt-1">98%</p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button 
          onClick={() => navigate('/technician/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </button>
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs font-medium">Requests</span>
        </button>
        <button 
          onClick={() => navigate('/technician/active-job')}
          className="flex flex-col items-center text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Schedule</span>
        </button>
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default SchedulePage;
