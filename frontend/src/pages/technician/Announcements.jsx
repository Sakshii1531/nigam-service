import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const SEVERITY_TONE = {
  Critical: { border: 'border-red-500', chip: 'bg-red-50 text-red-600' },
  Warning: { border: 'border-amber-500', chip: 'bg-amber-50 text-amber-600' },
  Info: { border: 'border-[#0D47A1]', chip: 'bg-blue-50 text-[#0D47A1]' },
};

/** Coarse relative time — enough for a notice board, no date library needed. */
function relativeTime(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const Announcements = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/tech/academy/announcements', { auth: true })
      .then((res) => setNotices((res || []).map((n) => ({
        id: n.id,
        message: n.message,
        severity: n.severity,
        region: n.scope === 'all' ? null : n.region,
        when: relativeTime(n.createdAt),
      }))))
      .catch((err) => setError(err.message || 'Could not load announcements.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-16 relative font-sans">
      {/* Header */}
      <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-base font-semibold text-white">Announcements</h1>
        </div>
        <Bell className="h-5.5 w-5.5 text-white/90" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 text-left pb-8">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notice & alert from Headquarters</span>

        {loading && <p className="text-[11px] text-slate-400 font-semibold py-6 text-center">Loading announcements…</p>}
        {error && <p className="text-[11px] text-rose-500 font-semibold py-6 text-center">{error}</p>}
        {!loading && !error && notices.length === 0 && (
          <p className="text-[11px] text-slate-400 font-semibold py-6 text-center">No announcements right now.</p>
        )}

        <div className="flex flex-col gap-4">
          {notices.map((n) => {
            const tone = SEVERITY_TONE[n.severity] || SEVERITY_TONE.Info;
            return (
              <div key={n.id} className={`bg-white rounded-3xl p-4 border-l-4 ${tone.border} border-y border-r border-slate-200 shadow-xs`}>
                <div className="flex justify-between items-center">
                  <span className={`${tone.chip} text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1`}>
                    {n.severity === 'Critical' && <AlertTriangle className="w-3 h-3" />}
                    {n.severity || 'Info'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">{n.when}</span>
                </div>
                <p className="text-[11px] text-slate-700 font-normal mt-2.5 leading-relaxed">{n.message}</p>
                {n.region && (
                  <span className="text-[9px] text-slate-400 font-semibold mt-2 block">Applies to: {n.region}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
