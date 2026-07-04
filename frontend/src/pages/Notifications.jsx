import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings, UserCheck, FileText, CreditCard, CheckCircle2, Bell, ChevronRight,
} from 'lucide-react';
import { USER_NOTIFICATIONS } from '../data/userNotifications';

const ICONS = {
  assigned: { Icon: UserCheck, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
  created: { Icon: FileText, bg: 'bg-[#EDE7F6]', color: 'text-[#5E35B1]' },
  payment: { Icon: CreditCard, bg: 'bg-[#FFF3E0]', color: 'text-[#F57F17]' },
  completed: { Icon: CheckCircle2, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(USER_NOTIFICATIONS);
  const unread = items.filter((n) => !n.read).length;

  const open = (n) => {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    navigate(`/notifications/${n.id}`);
  };

  const markAllRead = () => setItems((prev) => prev.map((x) => ({ ...x, read: true })));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
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

      <div className="px-4 pt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent</span>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-[#0D47A1] hover:underline">
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4 pt-3">
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
                  <span className="text-[11px] text-slate-400">{n.time}</span>
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
  );
};

export default Notifications;
