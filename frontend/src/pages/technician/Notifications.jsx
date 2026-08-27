import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Briefcase, Check, CreditCard, Bell, BookOpen
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { relativeTime } from '../../lib/relativeTime';
import { useNotifications } from '../../context/NotificationContext';
import TechTopNav from '../../components/TechTopNav';

// The backend's notification `type` vocabulary mapped onto this screen's three
// filter tabs. Anything unmapped (a platform broadcast, a service update) is
// still listed under "All" — it just has no tab of its own.
const TAB_FOR_TYPE = {
  jobs: 'Jobs', assigned: 'Jobs', tech: 'Jobs', service: 'Jobs', dispatch: 'Jobs',
  claims: 'Claims',
  payments: 'Payments', payment: 'Payments',
};

const Notifications = () => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Jobs', 'Claims', 'Payments'

  // This screen used to read TechContext's in-memory list, which started empty
  // and was only ever appended to locally when a job was accepted in the mock
  // branch. It never fetched, so a technician saw none of what the platform
  // actually sent them — not an assignment, not a super-admin broadcast.
  const [notifications, setNotifications] = useState([]);
  const [loadError, setLoadError] = useState('');
  const { subscribe, refreshUnread } = useNotifications();

  const shape = useCallback((n) => ({
    id: n.id,
    type: TAB_FOR_TYPE[n.type] || 'Updates',
    title: n.title,
    message: n.message || '',
    time: n.createdAt ? relativeTime(n.createdAt) : 'Just now',
    read: Boolean(n.read),
  }), []);

  useEffect(() => {
    apiRequest('/notifications?limit=50', { auth: true })
      .then((res) => setNotifications((res || []).map(shape)))
      .catch((err) => setLoadError(err.message || 'Could not load your notifications.'));
  }, [shape]);

  // Live arrivals go to the top instead of waiting for a reload.
  useEffect(() => subscribe((incoming) => {
    setNotifications((prev) => (prev.some((x) => x.id === incoming.id) ? prev : [shape(incoming), ...prev]));
  }), [subscribe, shape]);

  const markAllNotificationsRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH', auth: true });
    } catch (err) {
      setNotifications(previous);
      setLoadError(err.message || 'Could not mark notifications read.');
    }
    refreshUnread();
  };

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-8 lg:pt-14 relative font-sans">
      
      {/* Desktop Top Nav */}
      <TechTopNav activePage="jobs" />

      {/* Header — mobile only */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 lg:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Notifications</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-5 max-w-screen-md mx-auto w-full">
        
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {['All', 'Jobs', 'Claims', 'Payments'].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilterTab(pill)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-normal border-0 whitespace-nowrap transition-all ${
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
                className="py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/30 transition-all text-left px-1"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon wrapper */}
                  <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center ${getIconBg(n.title)}`}>
                    {getIcon(n.title)}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-xs font-medium text-[#052355]">{n.title}</h4>
                    <p className="text-[10px] text-slate-600 font-normal mt-0.5 leading-normal">
                      {n.message}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-600 font-normal whitespace-nowrap self-start mt-1 pl-2">
                  {n.time}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-600 px-3.5">
              <Bell className="h-10 w-10 mx-auto text-slate-500 mb-2" />
              {/* An empty list and a failed fetch look identical otherwise. */}
              <p className="text-sm font-normal">{loadError || 'No notifications found.'}</p>
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <button 
            onClick={() => markAllNotificationsRead()}
            className="w-full bg-white border border-[#0D47A1]/30 hover:border-[#0D47A1] text-[#0D47A1] font-normal py-3.5 rounded-2xl text-xs transition-all shadow-sm mt-6 text-center"
          >
            Mark all as read
          </button>
        )}

      </div>

    </div>
  );
};

export default Notifications;
