import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Users,
  UserCheck,
  ClipboardList,
  IndianRupee,
  CheckCircle2,
  Shield,
  AlertTriangle,
  Megaphone,
  BarChart3,
  FileText,
  Package
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-IN');

// The donuts are hand-drawn SVG arcs, so each slice needs a stroke-dasharray and
// a running offset. Circumference is 2πr for the r=40 circles the markup uses.
const CIRCUMFERENCE = 251.2;

function buildSegments(parts) {
  const total = parts.reduce((sum, p) => sum + p.count, 0);
  let consumed = 0;
  return parts.map((part) => {
    const fraction = total ? part.count / total : 0;
    const length = fraction * CIRCUMFERENCE;
    const segment = {
      ...part,
      value: number.format(part.count),
      pct: Math.round(fraction * 100),
      dashArray: `${length.toFixed(1)} ${CIRCUMFERENCE}`,
      dashOffset: `${(-consumed).toFixed(1)}`,
    };
    consumed += length;
    return segment;
  });
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTabRevenue, setActiveTabRevenue] = useState('7days');
  const [activeTabRequest, setActiveTabRequest] = useState('7days');

  // Chart interactivity states
  const [activeRevenueIndex, setActiveRevenueIndex] = useState(null);
  const [activeDoughnutIndex, setActiveDoughnutIndex] = useState(null);
  const [activeRequestBar, setActiveRequestBar] = useState(null);
  const [activeTechSegment, setActiveTechSegment] = useState(null);

  // Revenue trend comes from /analytics/revenue-trend; the SVG coordinates are
  // derived from it rather than being the source of truth as they were before.
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [requestTrend, setRequestTrend] = useState(null);

  useEffect(() => {
    setActiveRevenueIndex(null);
    const days = activeTabRevenue === '30days' ? 30 : 7;
    let cancelled = false;
    Promise.all([
      apiRequest(`/super-admin/analytics/revenue-trend?days=${days}`, { auth: true }),
      apiRequest(`/super-admin/analytics/request-trend?days=${days}`, { auth: true }),
    ])
      .then(([rev, req]) => {
        if (cancelled) return;
        setRevenueTrend(rev.data);
        setRequestTrend(req.data);
      })
      .catch((err) => console.error('[dashboard] Trend load failed:', err.message));
    return () => { cancelled = true; };
  }, [activeTabRevenue]);

  const revenuePoints = React.useMemo(() => {
    const pts = revenueTrend?.points || [];
    if (!pts.length) return [];
    // Scale into the 400x130 viewBox. A flat series (max === 0) would divide by
    // zero, so it pins to the baseline instead.
    const max = Math.max(...pts.map((p) => p.gross), 0);
    const span = pts.length > 1 ? pts.length - 1 : 1;
    return pts.map((p, i) => ({
      x: 10 + (i / span) * 380,
      y: max > 0 ? 115 - (p.gross / max) * 90 : 115,
      date: new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: currency.format(p.gross),
    }));
  }, [revenueTrend]);

  const revenuePath = React.useMemo(
    () => revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
    [revenuePoints],
  );

  const handleRevenueMouseMove = (e) => {
    if (!revenuePoints.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const viewBoxX = relativeX * 400;
    let minDiff = Infinity;
    let nearestIndex = 0;
    revenuePoints.forEach((pt, i) => {
      const diff = Math.abs(pt.x - viewBoxX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    });
    setActiveRevenueIndex(nearestIndex);
  };

  const handleRevenueClick = () => {
    if (activeRevenueIndex !== null && revenuePoints[activeRevenueIndex]) {
      showToast(`Revenue on ${revenuePoints[activeRevenueIndex].date}: ${revenuePoints[activeRevenueIndex].value}`);
    }
  };

  // Top KPI Metrics
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const data = await apiRequest('/super-admin/analytics/dashboard', { auth: true });
        if (!cancelled) setMetrics(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  // Recent Escalations and Live Activity — real rows (Escalation docs, audit
  // log entries), replacing what used to be two hardcoded fake lists.
  const [recentEscalations, setRecentEscalations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest('/super-admin/escalations?limit=4&sort=-createdAt', { auth: true }).catch(() => []),
      apiRequest('/super-admin/audit-logs?limit=5', { auth: true }).catch(() => []),
    ])
      .then(([esc, logs]) => {
        if (cancelled) return;
        setRecentEscalations(Array.isArray(esc) ? esc : []);
        setRecentActivity(Array.isArray(logs) ? logs : []);
      })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const doughnutSegments = buildSegments([
    { label: 'Open', count: metrics?.requests?.open || 0, stroke: '#0D47A1', routeVal: 'open' },
    { label: 'Completed', count: metrics?.requests?.completed || 0, stroke: '#10B981', routeVal: 'completed' },
    { label: 'Assigned', count: metrics?.requests?.assigned || 0, stroke: '#38BDF8', routeVal: 'assigned' },
    { label: 'In-Progress', count: metrics?.requests?.inProgress || 0, stroke: '#F59E0B', routeVal: 'in-progress' },
    { label: 'Cancelled', count: metrics?.requests?.cancelled || 0, stroke: '#EF4444', routeVal: 'cancelled' },
  ]);

  const serviceProviderSegments = buildSegments([
    { label: 'Online', count: metrics?.serviceProviders?.Available || 0, stroke: '#10B981', statusKey: 'online' },
    { label: 'On Job', count: metrics?.serviceProviders?.Busy || 0, stroke: '#0D47A1', statusKey: 'on-job' },
    { label: 'Offline', count: metrics?.serviceProviders?.Offline || 0, stroke: '#94A3B8', statusKey: 'offline' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // The per-card `trend` strings ("18.6% vs last 7 days") are gone: nothing
  // stores a prior-period snapshot, so no comparison can be computed. The same
  // goes for "Today's Revenue", "Active Cities", "Active Service Partners" and
  // "Customer Satisfaction" — each needed a figure this API does not produce.
  const pendingServiceProviders = metrics?.pendingServiceProviders || 0;
  const stats = [
    // First and amber-flagged whenever non-zero — matches the same "needs
    // attention" treatment Service Providers/Zone Dashboard give this same
    // count, so it's visible from the landing page too, not just once you've
    // already navigated into the list.
    {
      title: 'Pending Service Providers',
      value: number.format(pendingServiceProviders),
      icon: <AlertTriangle size={16} />,
      iconColor: pendingServiceProviders > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50',
      path: '/super-admin/service-providers?status=Pending',
      flagged: pendingServiceProviders > 0,
    },
    { title: 'Open Escalations', value: number.format(metrics?.openEscalations || 0), icon: <AlertTriangle size={16} />, iconColor: metrics?.openEscalations > 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50', path: '/super-admin/escalation-desk', flagged: metrics?.openEscalations > 0 },
    { title: 'Total Revenue', value: currency.format(metrics?.revenue?.gross || 0), icon: <IndianRupee size={16} />, iconColor: 'text-[#0D47A1] bg-[#E8F0FE]', path: '/super-admin/revenue' },
    { title: 'Active Requests', value: number.format(metrics?.activeRequests || 0), icon: <ClipboardList size={16} />, iconColor: 'text-red-500 bg-red-50', path: '/super-admin/requests' },
    { title: 'AMC Customers', value: number.format(metrics?.amcCustomers || 0), icon: <Users size={16} />, iconColor: 'text-purple-600 bg-purple-50', path: '/super-admin/amc' },
    { title: 'NCC Shield Customers', value: number.format(metrics?.extendedWarrantyCustomers || 0), icon: <Shield size={16} />, iconColor: 'text-orange-600 bg-orange-50', path: '/super-admin/warranty' },
  ];

  // Quick Action List — "Add Service Partner" used to live here too, but
  // ServicePartner was removed from the app entirely; it pointed at a route
  // that no longer exists.
  const quickActions = [
    { label: 'Add ASM', icon: <Users size={18} />, color: 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-100', path: '/super-admin/asm' },
    { label: 'Add Service Provider', icon: <UserCheck size={18} />, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100', path: '/super-admin/service-providers?add=true' },
    { label: 'Create AMC Plan', icon: <FileText size={18} />, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-100', path: '/super-admin/amc' },
    { label: 'Add Product', icon: <Package size={18} />, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-100', path: '/super-admin/products' },
    { label: 'Add Brand', icon: <Shield size={18} />, color: 'text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-100', path: '/super-admin/brands?add=true' },
    { label: 'Send Notification', icon: <Megaphone size={18} />, color: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border border-cyan-100', path: '/super-admin/notifications' },
    { label: 'View Reports', icon: <BarChart3 size={18} />, color: 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100', path: '/super-admin/reports' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        {/* showFilters used to be on here — a location/date "filter" that
            never actually filtered anything on this page, just changed its
            own label and showed a toast. Decorative, not real. */}
        <Topbar
          title="Executive Dashboard"
          subtitle="Welcome back! Here's what's happening with NCC today."
        />

        {/* Dashboard Body */}
        <div className="p-6 space-y-6 flex-1 max-w-400 mx-auto w-full">

          {/* KPI Stats Grid — trimmed to what's actually actionable at a
              glance; Platform Net Share/Product Orders/Total Requests lived
              here too but only duplicated what Revenue and the charts below
              already show. */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`bg-white p-4 rounded-xl border flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer ${
                  stat.flagged ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#E2E8F0]'
                }`}
                onClick={() => navigate(stat.path)}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconColor}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-3.5">
                  <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">{stat.title}</p>
                  <p className="text-lg font-black text-[#1E293B] tracking-tight">
                    {loading ? '…' : stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Revenue Trend (Line Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-extrabold text-sm text-[#1E293B] tracking-tight">Revenue Trend</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-[#1E293B]">
                      {currency.format(revenueTrend?.total || 0)}
                    </span>
                    {revenueTrend?.changePercent !== null && revenueTrend?.changePercent !== undefined && (
                      <span className={`text-[10px] font-bold flex items-center ${revenueTrend.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {revenueTrend.changePercent >= 0 ? '↑' : '↓'} {Math.abs(revenueTrend.changePercent)}%
                        <span className="text-slate-400 font-medium ml-1">
                          vs previous {revenueTrend.days} days
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <select 
                  value={activeTabRevenue} 
                  onChange={(e) => setActiveTabRevenue(e.target.value)}
                  className="text-xs text-[#64748B] border border-[#E2E8F0] rounded-md px-2 py-1 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {/* Line Chart SVG */}
              <div className="relative h-44 w-full flex items-end">
                <svg 
                  className="w-full h-full cursor-pointer" 
                  viewBox="0 0 400 130" 
                  preserveAspectRatio="none"
                  onMouseMove={handleRevenueMouseMove}
                  onMouseLeave={() => setActiveRevenueIndex(null)}
                  onClick={handleRevenueClick}
                >
                  <defs>
                    <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D47A1" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#0D47A1" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="0" y1="110" x2="400" y2="110" stroke="#F1F5F9" strokeWidth="1" />
                  
                  {/* Shaded Area */}
                  {revenuePoints.length > 1 && (
                    <path
                      d={`${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x.toFixed(1)} 120 L ${revenuePoints[0].x.toFixed(1)} 120 Z`}
                      fill="url(#revenue-gradient)"
                    />
                  )}

                  {/* Line Path */}
                  {revenuePoints.length > 1 && (
                    <path
                      d={revenuePath}
                      fill="none"
                      stroke="#0D47A1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  
                  {/* Node Circles */}
                  {revenuePoints.map((pt, i) => (
                    <circle 
                      key={i}
                      cx={pt.x} 
                      cy={pt.y} 
                      r={activeRevenueIndex === i ? 6 : 4} 
                      fill={activeRevenueIndex === i ? '#38BDF8' : '#0D47A1'} 
                      stroke="white" 
                      strokeWidth={activeRevenueIndex === i ? 2 : 1.5}
                      className="transition-all duration-150"
                    />
                  ))}

                  {/* Active Tooltip and Guide */}
                  {activeRevenueIndex !== null && revenuePoints[activeRevenueIndex] && (() => {
                    const activePt = revenuePoints[activeRevenueIndex];
                    const tooltipY = activePt.y > 50 ? activePt.y - 45 : activePt.y + 15;
                    return (
                      <>
                        <line 
                          x1={activePt.x} 
                          y1="20" 
                          x2={activePt.x} 
                          y2="120" 
                          stroke="#0D47A1" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3" 
                          pointerEvents="none"
                        />
                        <g pointerEvents="none">
                          <rect 
                            x={Math.max(10, Math.min(270, activePt.x - 60))} 
                            y={tooltipY} 
                            width="120" 
                            height="36" 
                            rx="6" 
                            fill="#1E293B" 
                            className="shadow-lg"
                          />
                          <text 
                            x={Math.max(10, Math.min(270, activePt.x - 60)) + 60} 
                            y={tooltipY + 13} 
                            textAnchor="middle" 
                            fill="#94A3B8" 
                            fontSize="9" 
                            fontWeight="bold"
                          >
                            {activePt.date}
                          </text>
                          <text 
                            x={Math.max(10, Math.min(270, activePt.x - 60)) + 60} 
                            y={tooltipY + 27} 
                            textAnchor="middle" 
                            fill="#38BDF8" 
                            fontSize="10" 
                            fontWeight="extrabold"
                          >
                            {activePt.value}
                          </text>
                        </g>
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-2">
                <span>15 May</span>
                <span>16 May</span>
                <span>17 May</span>
                <span>18 May</span>
                <span>19 May</span>
                <span>20 May</span>
                <span>21 May</span>
              </div>
            </div>

            {/* Chart 2: Service Requests Overview (Doughnut Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-extrabold text-sm text-[#1E293B] tracking-tight">Service Requests Overview</h3>
              </div>

              <div className="flex items-center justify-between gap-4 flex-1">
                {/* SVG Doughnut */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="12"/>
                    
                    {doughnutSegments.map((segment, i) => (
                      <circle 
                        key={i}
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke={segment.stroke} 
                        strokeWidth={activeDoughnutIndex === i ? 16 : 12}
                        strokeDasharray={segment.dashArray} 
                        strokeDashoffset={segment.dashOffset}
                        className="cursor-pointer transition-all duration-200 hover:opacity-90"
                        onMouseEnter={() => setActiveDoughnutIndex(i)}
                        onMouseLeave={() => setActiveDoughnutIndex(null)}
                        onClick={() => {
                          showToast(`Filtering by ${segment.label} requests`);
                          navigate(`/super-admin/requests?status=${segment.routeVal}`);
                        }}
                      />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center leading-none text-center">
                    <span className="text-sm font-extrabold text-[#1E293B] transition-all">
                      {activeDoughnutIndex !== null ? doughnutSegments[activeDoughnutIndex].value : number.format(metrics?.requests?.total || 0)}
                    </span>
                    <span className="text-[8px] text-[#64748B] font-bold uppercase mt-0.5 tracking-tight transition-all">
                      {activeDoughnutIndex !== null ? doughnutSegments[activeDoughnutIndex].label : 'Requests'}
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="flex-1 space-y-1.5 pl-2">
                  {doughnutSegments.map((segment, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between text-xs font-semibold p-1 rounded-lg transition-all cursor-pointer ${
                        activeDoughnutIndex === i ? 'bg-slate-50 scale-[1.02]' : 'hover:bg-slate-50'
                      }`}
                      onMouseEnter={() => setActiveDoughnutIndex(i)}
                      onMouseLeave={() => setActiveDoughnutIndex(null)}
                      onClick={() => {
                        showToast(`Filtering by ${segment.label} requests`);
                        navigate(`/super-admin/requests?status=${segment.routeVal}`);
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.stroke }} />
                        <span className={activeDoughnutIndex === i ? 'text-[#0D47A1] font-bold' : 'text-slate-700'}>
                          {segment.label}
                        </span>
                      </span>
                      <span className="text-slate-500 text-[11px] font-semibold">
                        {segment.value} ({segment.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Request Trend (Bar Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-extrabold text-sm text-[#1E293B] tracking-tight">Request Trend</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-[#1E293B]">
                      {number.format(requestTrend?.total || 0)}
                    </span>
                    {requestTrend?.changePercent !== null && requestTrend?.changePercent !== undefined && (
                      <span className={`text-[10px] font-bold flex items-center ${requestTrend.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {requestTrend.changePercent >= 0 ? '↑' : '↓'} {Math.abs(requestTrend.changePercent)}%
                        <span className="text-slate-400 font-medium ml-1">
                          vs previous {requestTrend.days} days
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <select 
                  value={activeTabRequest} 
                  onChange={(e) => setActiveTabRequest(e.target.value)}
                  className="text-xs text-[#64748B] border border-[#E2E8F0] rounded-md px-2 py-1 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {/* Bar Chart bars */}
              <div className="flex items-end justify-between h-40 pt-4 px-2">
                {(requestTrend?.points || []).map((pt, i) => {
                  const val = pt.count;
                  // Scale to the tallest bar in the window; an all-zero window
                  // renders flat rather than dividing by zero.
                  const maxVal = Math.max(...(requestTrend?.points || []).map((p) => p.count), 1);
                  const heightPct = (val / maxVal) * 100;
                  const day = new Date(pt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <div 
                      key={i} 
                      className="flex flex-col items-center gap-1.5 w-7 relative group cursor-pointer" 
                      onMouseEnter={() => setActiveRequestBar(i)}
                      onMouseLeave={() => setActiveRequestBar(null)}
                      onClick={() => {
                        setActiveRequestBar(i);
                        showToast(`Requests on ${day}: ${val}`);
                      }}
                    >
                      {/* Tooltip */}
                      {(activeRequestBar === i) && (
                        <div className="absolute -top-7 bg-[#1E293B] text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md z-10 whitespace-nowrap">
                          {val} reqs
                        </div>
                      )}
                      <div className="w-full bg-[#F1F5F9] rounded-md h-32 flex items-end">
                        <div 
                          className={`w-full rounded-md transition-all duration-200 ${
                            activeRequestBar === i ? 'bg-[#38BDF8] scale-x-105 shadow-sm' : 'bg-[#0D47A1]'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        ></div>
                      </div>
                      <span className={`text-[10px] font-bold transition-colors ${
                        activeRequestBar === i ? 'text-[#0D47A1]' : 'text-slate-400'
                      }`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Third Row: real-data-only now — the three "leaderboard" cards
              that used to live here (Top Cities by Requests, Top Performing
              ASMs, Top Service Partners) were 100% hardcoded fake rows with
              no backing endpoint, and "Top Service Partners" linked to a
              route that no longer exists (ServicePartner was removed from
              the app entirely). Cut rather than faked-until-real. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Live ServiceProvider Status (Circular Ring Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-extrabold text-xs text-[#1E293B] tracking-wider uppercase">Live Service Provider Status</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {/* Status Doughnut Ring */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="8"/>
                    {serviceProviderSegments.map((segment, i) => (
                      <circle 
                        key={i}
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke={segment.stroke} 
                        strokeWidth={activeTechSegment === i ? 11 : 8}
                        strokeDasharray={segment.dashArray} 
                        strokeDashoffset={segment.dashOffset}
                        className="cursor-pointer transition-all duration-200 hover:opacity-95"
                        onMouseEnter={() => setActiveTechSegment(i)}
                        onMouseLeave={() => setActiveTechSegment(null)}
                        onClick={() => {
                          showToast(`Viewing all ${segment.label} serviceProviders`);
                          navigate(`/super-admin/service-providers?status=${segment.statusKey}`);
                        }}
                      />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center leading-none text-center">
                    <span className="text-base font-extrabold text-[#1E293B] transition-all">
                      {activeTechSegment !== null
                        ? serviceProviderSegments[activeTechSegment].value
                        : number.format((metrics?.serviceProviders?.Available || 0) + (metrics?.serviceProviders?.Busy || 0) + (metrics?.serviceProviders?.Offline || 0))}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 transition-all">
                      {activeTechSegment !== null ? serviceProviderSegments[activeTechSegment].label : 'Total Providers'}
                    </span>
                  </div>
                </div>

                {/* Legend list below */}
                <div className="w-full space-y-1.5 px-2">
                  {serviceProviderSegments.map((segment, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between text-[11px] font-bold p-1 rounded-lg transition-all cursor-pointer ${
                        activeTechSegment === i ? 'bg-slate-50 scale-[1.02]' : 'hover:bg-slate-50'
                      }`}
                      onMouseEnter={() => setActiveTechSegment(i)}
                      onMouseLeave={() => setActiveTechSegment(null)}
                      onClick={() => {
                        showToast(`Viewing all ${segment.label} serviceProviders`);
                        navigate(`/super-admin/service-providers?status=${segment.statusKey}`);
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.stroke }} />
                        <span className={activeTechSegment === i ? 'text-[#0D47A1]' : 'text-slate-700'}>
                          {segment.label}
                        </span>
                      </span>
                      <span className="text-slate-500 font-semibold">{segment.value} ({segment.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Escalations — real Escalation docs, replacing a
                hardcoded #ESC-5554-style fake list. */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between h-90">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-[#1E293B]">Recent Escalations</h3>
                <button
                  onClick={() => navigate('/super-admin/complaints')}
                  className="text-xs font-bold text-[#0D47A1] hover:underline"
                >
                  View All
                </button>
              </div>

              {activityLoading ? (
                <p className="text-xs text-slate-400 font-semibold py-2">Loading...</p>
              ) : recentEscalations.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-2">No escalations — everything's on track.</p>
              ) : (
                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                  {recentEscalations.map((esc) => (
                    <div key={esc.id} className="flex items-start justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                          <span className="font-bold text-[#1E293B]">{esc.humanId}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{esc.daysOpen === 0 ? 'Today' : `${esc.daysOpen}d open`}</span>
                        </div>
                        <p className="text-slate-600 font-semibold pl-3.5 leading-tight">{esc.reason || esc.description || 'Escalation'}</p>
                        <p className="text-[10px] text-slate-400 font-bold pl-3.5">{esc.city?.name || 'Unassigned zone'}</p>
                      </div>
                      <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-100 uppercase shrink-0">
                        {esc.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Activity Feed — real audit log entries (super-admin's
                Audit Logs page), replacing a hardcoded fake feed. */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between h-90">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-[#1E293B]">Live Activity Feed</h3>
                <button
                  onClick={() => navigate('/super-admin/logs')}
                  className="text-xs font-bold text-[#0D47A1] hover:underline"
                >
                  View All
                </button>
              </div>

              {activityLoading ? (
                <p className="text-xs text-slate-400 font-semibold py-2">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-2">No recent activity logged yet.</p>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="flex gap-3 text-xs leading-normal">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-[#0D47A1] font-black">
                        •
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 font-semibold">
                          {act.action} {act.user?.name && <span className="text-[10px] text-slate-400 font-medium">({act.user.name})</span>}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {act.createdAt ? new Date(act.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0]">
            <h3 className="font-extrabold text-sm text-[#1E293B] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    showToast(`Navigating to: ${action.label}`);
                    setTimeout(() => navigate(action.path), 600);
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-[#F8FAFC] hover:bg-slate-100 transition-all duration-200 group cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 shadow-sm ${action.color}`}>
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 text-center tracking-tight leading-tight select-none">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Dashboard Footer */}
        <div className="mt-auto py-5 px-8 border-t border-[#E2E8F0] bg-white flex flex-col sm:flex-row justify-between items-center text-slate-400 text-[10px] font-bold tracking-wider gap-2">
          <span>© {new Date().getFullYear()} NIGAM CARE COMPANY (NCC). ALL RIGHTS RESERVED.</span>
          <span>VERSION 2.0.0</span>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
