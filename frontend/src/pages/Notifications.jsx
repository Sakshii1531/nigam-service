import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings, UserCheck, FileText, CreditCard, CheckCircle2, Bell, ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { relativeTime } from '../lib/relativeTime';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
  assigned: { Icon: UserCheck, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
  created: { Icon: FileText, bg: 'bg-[#EDE7F6]', color: 'text-[#5E35B1]' },
  payment: { Icon: CreditCard, bg: 'bg-[#FFF3E0]', color: 'text-[#F57F17]' },
  completed: { Icon: CheckCircle2, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
};

const Notifications = () => {
  const navigate = useNavigate();
  // The feed used to be a bundled USER_NOTIFICATIONS array, so nothing the
  // platform actually emitted ever reached the customer, and "mark read" only
  // changed local state.
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const unread = items.filter((n) => !n.read).length;
  const { subscribe, markedRead, refreshUnread } = useNotifications();

  useEffect(() => {
    apiRequest('/notifications?limit=50', { auth: true })
      .then((res) => setItems(res || []))
      .catch((err) => setLoadError(err.message || 'Could not load your notifications.'));
  }, []);

  // Anything arriving while this screen is open goes straight to the top,
  // rather than waiting for the user to navigate away and back.
  useEffect(() => subscribe((incoming) => {
    setItems((prev) => (prev.some((x) => x.id === incoming.id) ? prev : [incoming, ...prev]));
  }), [subscribe]);

  const open = async (n) => {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (!n.read) markedRead(1);
    navigate(`/notifications/${n.id}`);
    if (!n.read) {
      try {
        await apiRequest(`/notifications/${n.id}/read`, { method: 'PATCH', auth: true });
      } catch {
        // The detail screen marks it read too; a failure here is not worth
        // interrupting navigation for.
      }
    }
  };

  const markAllRead = async () => {
    const previous = items;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH', auth: true });
      // Recount rather than zeroing: read-all clears this user's inbox, but the
      // badge should reflect the server, not this screen's 50-row page.
      refreshUnread();
    } catch (err) {
      setItems(previous);
      refreshUnread();
      setLoadError(err.message || 'Could not mark your notifications as read.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10 lg:pb-8">


      {/* Mobile Top Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 lg:hidden">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-slate-900">Notifications</h1>
          {unread > 0 && <span className="text-[11px] text-[#0D47A1] font-semibold">{unread} unread</span>}
        </div>
        <button
          onClick={() => navigate('/notification-settings')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Page Top Header Bar (lg+ only) */}
      <div className="hidden lg:block max-w-screen-2xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#052355] tracking-tight">Notifications</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Stay updated on your service bookings, warranty updates and account alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button 
                onClick={markAllRead} 
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-xs font-bold text-[#0D47A1] transition-all cursor-pointer shadow-xs"
              >
                Mark all read ({unread})
              </button>
            )}
            <button
              onClick={() => navigate('/notification-settings')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors text-slate-600 cursor-pointer"
              title="Notification Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col px-3.5 lg:px-6 xl:px-8">
      <div className="px-4 pt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent</span>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-[#0D47A1] hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {loadError && (
        <p className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold text-red-700">{loadError}</p>
      )}

      <div className="flex flex-col gap-2.5 px-4 pt-3">
        {!loadError && items.length === 0 && (
          <p className="text-center text-xs font-semibold text-slate-400 py-10">You have no notifications yet.</p>
        )}
        {items.map((n) => {
          const { Icon, bg, color } = ICONS[n.type] || { Icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };
          return (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`text-left bg-white border rounded-2xl p-4 flex gap-3 items-start shadow-sm transition-colors hover:border-[#0D47A1]/30 ${
                n.read ? 'border-slate-100' : 'border-[#0D47A1]/20 bg-[#FBFCFF]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{n.title}</h3>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                  {n.cta && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#0D47A1]">
                      {n.cta.label} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default Notifications;
