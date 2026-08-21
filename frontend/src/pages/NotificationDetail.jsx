import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, UserCheck, FileText, CreditCard, CheckCircle2, Bell, ChevronRight,
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { relativeTime } from '../lib/relativeTime';

const ICONS = {
  assigned: { Icon: UserCheck, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
  created: { Icon: FileText, bg: 'bg-[#EDE7F6]', color: 'text-[#5E35B1]' },
  payment: { Icon: CreditCard, bg: 'bg-[#FFF3E0]', color: 'text-[#F57F17]' },
  completed: { Icon: CheckCircle2, bg: 'bg-[#E8F5E9]', color: 'text-[#2E7D32]' },
};

const NotificationDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  // Reads the real notification and marks it read server-side. It used to fall
  // back to the first item of a bundled array, so an unknown id silently showed
  // someone else's notification text.
  const [n, setN] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest(`/notifications/${id}`, { auth: true })
      .then((res) => {
        if (cancelled) return;
        setN(res);
        // Broadcasts have no per-user read state, so this is best-effort.
        if (!res.read && res.recipient) {
          apiRequest(`/notifications/${id}/read`, { method: 'PATCH', auth: true }).catch(() => {});
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load this notification.'); });
    return () => { cancelled = true; };
  }, [id]);

  const { Icon, bg, color } = ICONS[n?.type] || { Icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };

  if (!n) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <p className="text-sm font-semibold text-slate-500 text-center">{loadError || 'Loading…'}</p>
        <button onClick={() => navigate('/notifications')} className="mt-4 text-xs font-bold text-[#0D47A1] hover:underline">
          Back to all notifications
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-bold text-slate-900">Notification</h1>
      </div>

      <div className="p-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${bg}`}>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-4">{n.title}</h2>
          <span className="text-xs text-slate-400 mt-1">{relativeTime(n.createdAt)}</span>
          <p className="text-sm text-slate-600 leading-relaxed mt-4">{n.detail || n.message}</p>
        </div>

        {n.cta && (
          <button
            onClick={() => navigate(n.cta.route)}
            className="w-full mt-5 bg-[#0D47A1] text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-all shadow-md"
          >
            {n.cta.label} <ChevronRight className="h-4.5 w-4.5" />
          </button>
        )}

        <button
          onClick={() => navigate('/notifications')}
          className="w-full mt-3 text-slate-500 font-semibold py-3 rounded-2xl hover:bg-slate-100 transition-colors text-sm"
        >
          Back to all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDetail;
