import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Briefcase, Check, CreditCard, Bell, BookOpen
} from 'lucide-react';
import { useTech } from '../../context/TechContext';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAllNotificationsRead } = useTech();
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Jobs', 'Claims', 'Payments'

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'All') return true;
    return n.type === filterTab;
  });

  const getIcon = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('job')) {
      return <Briefcase className="h-5 w-5 text-[#2E7D32]" />;
    } else if (lowerTitle.includes('claim')) {
      return <Check className="h-5 w-5 text-[#2E7D32]" />;
    } else if (lowerTitle.includes('payment')) {
      return <CreditCard className="h-5 w-5 text-[#2E7D32]" />;
    } else if (lowerTitle.includes('stock')) {
      return <Bell className="h-5 w-5 text-[#F57F17]" />;
    } else {
      return <BookOpen className="h-5 w-5 text-[#5E35B1]" />;
    }
  };

  const getIconBg = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('job') || lowerTitle.includes('claim') || lowerTitle.includes('payment')) {
      return 'bg-[#E8F5E9]'; // Light green
    } else if (lowerTitle.includes('stock')) {
      return 'bg-[#FFF9C4]'; // Light yellow
    } else {
      return 'bg-[#EDE7F6]'; // Light purple
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-8 max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-[#052355] flex-1 text-center pr-8">Notifications</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col gap-5">
        
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {['All', 'Jobs', 'Claims', 'Payments'].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilterTab(pill)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold border-0 whitespace-nowrap transition-all ${
                filterTab === pill
                  ? 'bg-[#0D47A1] text-white'
                  : 'bg-[#F1F5F9]/60 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="flex flex-col">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
              <div 
                key={n.id} 
                className="py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/30 transition-all text-left px-1"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon wrapper */}
                  <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center ${getIconBg(n.title)}`}>
                    {getIcon(n.title)}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-[#052355]">{n.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-normal">
                      {n.message}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap self-start mt-1 pl-2">
                  {n.time}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-400 px-6">
              <Bell className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No notifications found.</p>
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <button 
            onClick={() => {
              markAllNotificationsRead();
              alert('All notifications marked as read.');
            }}
            className="w-full bg-white border border-[#0D47A1]/30 hover:border-[#0D47A1] text-[#0D47A1] font-bold py-3.5 rounded-2xl text-xs transition-all shadow-2xs mt-6 text-center"
          >
            Mark all as read
          </button>
        )}

      </div>

    </div>
  );
};

export default Notifications;
