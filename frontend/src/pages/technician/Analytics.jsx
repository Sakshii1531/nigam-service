import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, MoreVertical, ChevronDown, TrendingUp, Briefcase, 
  ClipboardList, Wrench, Calendar, User, ShieldCheck, HelpCircle, LogOut, CreditCard, X,
  ArrowLeft
} from 'lucide-react';
import techAvatar from '../../assets/tech_avatar.png';
import TechBottomNav from '../../components/TechBottomNav';
import { apiRequest } from '../../lib/apiClient';

const TIMEFRAME_DAYS = { 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 90 Days': 90 };
const SLICE_COLORS = ['#0D47A1', '#2E7D32', '#7B1FA2', '#FFB300', '#EF6C00', '#00838F'];
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 45;

const Analytics = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // The old options ('This Week'/'This Month'/'This Year') did not correspond to
  // anything the API measures; these map directly onto its rolling windows.
  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 30 Days');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const days = TIMEFRAME_DAYS[selectedTimeframe] || 30;
    let cancelled = false;
    apiRequest(`/tech/earnings/analytics?days=${days}`, { auth: true })
      .then((res) => { if (!cancelled) { setStats(res); setError(''); } })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load your analytics.'); });
    return () => { cancelled = true; };
  }, [selectedTimeframe]);

  // Donut slices are laid out by accumulating each category's arc length.
  const slices = [];
  let offset = 0;
  for (const [i, c] of (stats?.byCategory || []).entries()) {
    const length = (c.percent / 100) * DONUT_CIRCUMFERENCE;
    slices.push({ ...c, color: SLICE_COLORS[i % SLICE_COLORS.length], length, offset: -offset });
    offset += length;
  }

  const changeTone = (v) => (v == null ? 'text-slate-400' : v >= 0 ? 'text-[#2E7D32]' : 'text-red-600');
  const changeLabel = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v}%`);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">
      

      {/* Header — mobile only */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 lg:top-16 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pl-8">Analytics</h1>
        {/* Opens the menu this screen already renders (Logout included). It had
            no handler at all, so the sidebar could never be shown here. */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <MoreVertical className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-4 max-w-screen-lg mx-auto w-full">
        
        {/* Timeframe Selector */}
        <div className="flex justify-start">
          <div className="relative">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-xs font-normal text-slate-600 focus:outline-none focus:border-slate-300 shadow-sm"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
            {error}
          </div>
        )}

        {/* 2x2 Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Earnings Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Earnings</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">₹{(stats?.earnings || 0).toLocaleString('en-IN')}</p>
            <div className={`flex items-center gap-1 mt-1 ${changeTone(stats?.earningsChangePercent)}`}>
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] font-normal">{changeLabel(stats?.earningsChangePercent)}</span>
            </div>
          </div>

          {/* Jobs Completed Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Jobs Completed</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">{stats?.completedCount ?? 0}</p>
            <div className={`flex items-center gap-1 mt-1 ${changeTone(stats?.completedChangePercent)}`}>
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] font-normal">{changeLabel(stats?.completedChangePercent)}</span>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Completion Rate</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">
              {stats?.completionRate != null ? `${stats.completionRate}%` : '—'}
            </p>
            <div className="flex items-center gap-1 mt-1 text-slate-400">
              <span className="text-[10px] font-normal">
                {stats?.previousCompletionRate != null ? `was ${stats.previousCompletionRate}%` : 'no prior data'}
              </span>
            </div>
          </div>

          {/* Customer Rating Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Customer Rating</span>
            <p className="text-lg font-medium text-[#052355] mt-1.5">{stats?.rating ? stats.rating.toFixed(1) : '—'}</p>
            <div className="flex items-center gap-1 mt-1 text-slate-400">
              <span className="text-[10px] font-normal">lifetime average</span>
            </div>
          </div>

        </div>

        {/* Top Services Donut Chart Section */}
        <div className="bg-white rounded-[2rem] p-3.5.5 border border-slate-200 shadow-sm text-left flex flex-col gap-4">
          <h3 className="text-xs font-medium text-[#052355] uppercase tracking-wider">Top Services</h3>
          
          <div className="flex items-center justify-between gap-5 py-2">
            
            {/* Custom SVG Donut Chart */}
            <div className="relative w-[110px] h-[110px] flex items-center justify-center flex-shrink-0">
              <svg width="110" height="110" viewBox="0 0 110 110" className="transform -rotate-90">
                {/* Background circle */}
                <circle cx="55" cy="55" r="45" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                {slices.map((sl) => (
                  <circle
                    key={sl.label}
                    cx="55" cy="55" r="45"
                    fill="transparent"
                    stroke={sl.color}
                    strokeWidth="12"
                    strokeDasharray={`${sl.length.toFixed(2)} ${DONUT_CIRCUMFERENCE.toFixed(2)}`}
                    strokeDashoffset={sl.offset.toFixed(2)}
                  />
                ))}
              </svg>
              {/* Inner hole overlay for text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-slate-600 uppercase">Jobs</span>
                <span className="text-base font-medium text-[#052355]">{stats?.completedCount ?? 0}</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="flex-1 flex flex-col gap-2.5">
              {slices.length === 0 && (
                <span className="text-[11px] text-slate-400 font-normal">No completed jobs in this period.</span>
              )}
              {slices.map((sl) => (
                <div key={sl.label} className="flex items-center justify-between text-xs font-normal">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: sl.color }}></span>
                    <span className="text-slate-500 font-normal text-[11px]">{sl.label}</span>
                  </div>
                  <span className="text-[#052355] text-[11px]">{sl.percent}%</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>



      {/* Bottom Navigation */}
      <TechBottomNav activeTab="profile" />

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

export default Analytics;
