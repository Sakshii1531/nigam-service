import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, IndianRupee,
  Package, ArrowUpRight, ArrowDownRight, Eye, Plus, Upload,
  Search, Truck, ShieldCheck, FileText, RefreshCcw, BarChart2,
  PhoneCall, X
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-IN');

/* ── KPI Card ── */
const KPICard = ({ title, value, icon, iconBg, trend, trendUp, link, onLink }) => (
  <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={onLink}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
    </div>
    <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">{title}</p>
    <p className="text-xl font-black text-[#1E293B]">{value}</p>
    <button onClick={onLink} className="text-[10px] font-semibold text-[#0D47A1] hover:underline mt-1 flex items-center gap-0.5">
      View Details <ArrowUpRight size={10} />
    </button>
  </div>
);

/* ── Quick Stat Card ── */
const QuickStat = ({ label, value, color, onView }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`} />
      <div>
        <p className="text-lg font-black text-[#1E293B]">{value}</p>
        <p className="text-[10px] font-semibold text-[#64748B] leading-tight">{label}</p>
      </div>
    </div>
    <button onClick={onView} className="text-[10px] font-semibold text-[#0D47A1] hover:underline">View</button>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchCustomer, setSearchCustomer] = useState('');
  const [tollFreeInput, setTollFreeInput] = useState('1800-123-4567');
  const [successMsg, setSuccessMsg] = useState('');

  // Graph interaction states
  const [activeTrendIndex, setActiveTrendIndex] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(null);
  const [activeProductIndex, setActiveProductIndex] = useState(null);

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleTrendMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const viewBoxX = relativeX * 500;
    const index = Math.min(6, Math.max(0, Math.round(viewBoxX / 83.3)));
    setActiveTrendIndex(index);
  };

  const handleTrendClick = () => {
    if (activeTrendIndex !== null) {
      if (trendData[activeTrendIndex] === undefined) return;
      toast(`Complaints on ${trendLabels[activeTrendIndex]}: ${trendData[activeTrendIndex].toLocaleString()}`);
    }
  };

  /* ── KPI data ── */
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [dash, recent] = await Promise.all([
          apiRequest('/brand/dashboard', { auth: true }),
          apiRequest('/service-requests?limit=5&sort=-createdAt', { auth: true }),
        ]);
        if (cancelled) return;
        // apiRequest resolves the { data, error, meta } envelope — storing the
        // envelope itself meant every KPI on this page read zero.
        setMetrics(dash?.data || null);
        setRecent((recent?.data || []).map((r) => ({
          id: r.humanId || r.id,
          customer: r.user?.name || 'Customer',
          product: r.category || '—',
          status: r.status || 'New',
          date: r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        })));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  // The `trend` percentages that sat on each card are gone — nothing stores a
  // prior-period snapshot, so there is no comparison to compute.
  const kpis = [
    { title: 'Total Complaints', value: number.format(metrics?.totalComplaints || 0), icon: <ClipboardList size={18} />, iconBg: 'bg-blue-500', path: '/brand-admin/complaints' },
    { title: 'Completed Calls', value: number.format(metrics?.completed || 0), icon: <CheckCircle2 size={18} />, iconBg: 'bg-green-500', path: '/brand-admin/complaints' },
    { title: 'In Progress', value: number.format(metrics?.inProgress || 0), icon: <Clock size={18} />, iconBg: 'bg-orange-500', path: '/brand-admin/complaint-monitoring' },
    { title: 'Escalations', value: number.format(metrics?.escalations || 0), icon: <AlertTriangle size={18} />, iconBg: 'bg-red-500', path: '/brand-admin/escalations' },
    { title: 'Total Invoice Value', value: currency.format(metrics?.totalInvoiceValue || 0), icon: <IndianRupee size={18} />, iconBg: 'bg-purple-500', path: '/brand-admin/invoices' },
    { title: 'FOC Parts Approved', value: number.format(metrics?.focPartsApproved || 0), icon: <Package size={18} />, iconBg: 'bg-teal-500', path: '/brand-admin/warranty-claims' },
  ];

  /* ── Donut chart segments ── */
  // "Out of Warranty" was a slice here, but warranty is a property of a request
  // rather than a status — it can't be a segment of a status breakdown.
  const statusParts = [
    { label: 'Completed', value: metrics?.completed || 0, color: '#22C55E' },
    { label: 'In Progress', value: metrics?.inProgress || 0, color: '#3B82F6' },
    { label: 'Open', value: metrics?.open || 0, color: '#0EA5E9' },
    { label: 'Customer Not Available', value: metrics?.customerNotAvailable || 0, color: '#F59E0B' },
    { label: 'Tomorrow / Reschedule', value: metrics?.reschedule || 0, color: '#8B5CF6' },
    { label: 'Cancelled', value: metrics?.cancelled || 0, color: '#94A3B8' },
  ];
  const statusTotal = statusParts.reduce((sum, p) => sum + p.value, 0);
  const statusSegments = statusParts.map((p) => ({
    ...p,
    pct: statusTotal ? Number(((p.value / statusTotal) * 100).toFixed(1)) : 0,
  }));

  /* ── Trend line: real requests per day over the last week. This was a fixed
     seven-point series labelled 15–21 May that never moved. ── */
  const trend = metrics?.trend || [];
  const trendData = trend.map((t) => t.count);
  const trendLabels = trend.map((t) => new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  const maxTrend = Math.max(1, ...trendData);

  /* ── Product wise: real category breakdown, previously a fixed five-row
     table with invented counts and percentages. ── */
  const PRODUCT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9'];
  const productWise = (metrics?.byProduct || []).map((p, i) => ({
    ...p,
    color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
  }));

  /* ── Quick stats ── */
  // Only the counts the dashboard endpoint really reports. The rows for
  // "No Invoice / Bill Available", "Document Pending" and "Repeat Calls" had
  // fixed numbers behind them and nothing tracks those states, so they are gone
  // rather than shown as fiction.
  const quickStats = [
    { label: 'Customer Not Available', value: metrics?.customerNotAvailable || 0, color: 'bg-blue-100', path: '/brand-admin/complaint-monitoring' },
    { label: 'Call Tomorrow/Reschedule', value: metrics?.reschedule || 0, color: 'bg-yellow-100', path: '/brand-admin/complaint-monitoring' },
    { label: 'Open Escalations', value: metrics?.escalations || 0, color: 'bg-red-100', path: '/brand-admin/escalations' },
    { label: 'FOC Parts Approved', value: metrics?.focPartsApproved || 0, color: 'bg-teal-100', path: '/brand-admin/warranty-claims' },
  ];

  /* ── Recent complaints: the brand's real latest requests. This was five
     hardcoded tickets with invented customers and May-2025 timestamps. ── */
  const STATUS_COLORS = {
    'In Progress': 'bg-blue-100 text-blue-700',
    Closed: 'bg-green-100 text-green-700',
    'Customer NA': 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-700',
    Reschedule: 'bg-purple-100 text-purple-700',
  };
  const recentComplaints = recent.map((r) => ({
    ...r,
    statusColor: STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-700',
  }));

  /* ── Quick actions ── */
  const quickActions = [
    { label: 'Register Complaint', icon: <Plus size={16} />, color: 'bg-blue-600', path: '/brand-admin/requests' },
    { label: 'Approve FOC Parts', icon: <ShieldCheck size={16} />, color: 'bg-green-600', path: '/brand-admin/warranty-claims' },
    { label: 'Send Replacement Letter', icon: <FileText size={16} />, color: 'bg-purple-600', path: '/brand-admin/documents' },
    { label: 'Verify Warranty', icon: <CheckCircle2 size={16} />, color: 'bg-teal-600', path: '/brand-admin/warranty' },
    { label: 'Escalate Case', icon: <AlertTriangle size={16} />, color: 'bg-red-600', path: '/brand-admin/escalations' },
    { label: 'Generate Invoice', icon: <IndianRupee size={16} />, color: 'bg-orange-600', path: '/brand-admin/invoices' },
    { label: 'View Reports', icon: <BarChart2 size={16} />, color: 'bg-indigo-600', path: '/brand-admin/reports' },
    { label: 'Customer Support', icon: <PhoneCall size={16} />, color: 'bg-slate-600', path: '/brand-admin/chat' },
  ];

  // Calculate SVG Donut segments dynamically
  let accumulatedPercent = 0;
  const statusSegmentsWithSVGProps = statusSegments.map((segment) => {
    const dashOffset = -accumulatedPercent * 2.512;
    const dashArray = `${segment.pct * 2.512} 251.2`;
    accumulatedPercent += segment.pct;
    return {
      ...segment,
      dashArray,
      dashOffset
    };
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Brand Dashboard" subtitle="Welcome back! Here's your after sales performance overview." />

        <div className="p-5 space-y-5 flex-1">

          {/* ── Row 1: 6 KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((k, i) => (
              <KPICard key={i} {...k} onLink={() => navigate(k.path)} />
            ))}
          </div>

          {/* ── Row 2: Complaints Trend & Status Overview ── */}
          <div className="grid grid-cols-12 gap-4">

            {/* Complaints Trend — line chart */}
            <div className="col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-[#1E293B]">Complaints Trend</h2>
                <span className="text-[9px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-lg">Last 7 Days ▾</span>
              </div>
              <div className="relative h-32">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 500 100" 
                  preserveAspectRatio="none"
                  onMouseMove={handleTrendMouseMove}
                  onMouseLeave={() => setActiveTrendIndex(null)}
                  onClick={handleTrendClick}
                  className="cursor-pointer"
                >
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d={`M ${trendData.map((v, i) => `${i * 83.3},${100 - (v / maxTrend) * 85}`).join(' L ')} L ${(trendData.length - 1) * 83.3},100 L 0,100 Z`}
                    fill="url(#trendGrad)"
                  />
                  {/* Line */}
                  <polyline
                    points={trendData.map((v, i) => `${i * 83.3},${100 - (v / maxTrend) * 85}`).join(' ')}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Node Circles */}
                  {trendData.map((v, i) => {
                    const cx = i * 83.3;
                    const cy = 100 - (v / maxTrend) * 85;
                    return (
                      <circle 
                        key={i}
                        cx={cx} 
                        cy={cy} 
                        r={activeTrendIndex === i ? 5 : 3.5} 
                        fill={activeTrendIndex === i ? '#3B82F6' : '#2563EB'} 
                        stroke="white"
                        strokeWidth={activeTrendIndex === i ? 1.5 : 1}
                        className="transition-all duration-150"
                      />
                    );
                  })}

                  {/* Active Tooltip and Guide */}
                  {activeTrendIndex !== null && (() => {
                    const val = trendData[activeTrendIndex];
                    const cx = activeTrendIndex * 83.3;
                    const cy = 100 - (val / maxTrend) * 85;
                    const tooltipY = cy > 40 ? cy - 35 : cy + 10;
                    return (
                      <>
                        <line 
                          x1={cx} 
                          y1="0" 
                          x2={cx} 
                          y2="100" 
                          stroke="#3B82F6" 
                          strokeWidth="1" 
                          strokeDasharray="2 2" 
                          pointerEvents="none"
                        />
                        <g pointerEvents="none">
                          <rect 
                            x={Math.max(5, Math.min(415, cx - 40))} 
                            y={tooltipY} 
                            width="80" 
                            height="28" 
                            rx="4" 
                            fill="#1E293B" 
                            opacity="0.9"
                          />
                          <text 
                            x={Math.max(5, Math.min(415, cx - 40)) + 40} 
                            y={tooltipY + 10} 
                            textAnchor="middle" 
                            fill="#94A3B8" 
                            fontSize="6" 
                            fontWeight="bold"
                          >
                            {trendLabels[activeTrendIndex]}
                          </text>
                          <text 
                            x={Math.max(5, Math.min(415, cx - 40)) + 40} 
                            y={tooltipY + 21} 
                            textAnchor="middle" 
                            fill="#60A5FA" 
                            fontSize="8" 
                            fontWeight="extrabold"
                          >
                            {val.toLocaleString()}
                          </text>
                        </g>
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between mt-1">
                {trendLabels.map((l, i) => (
                  <span key={i} className="text-[8px] text-[#94A3B8]">{l}</span>
                ))}
              </div>
            </div>

            {/* Complaint Status Overview — donut */}
            <div className="col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xs font-bold text-[#1E293B]">Complaint Status Overview</h2>
                <span className="text-[9px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-lg">Last 7 Days ▾</span>
              </div>
              <div className="flex items-center gap-6 justify-center flex-1 py-2">
                <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F8FAFC" strokeWidth="12" />
                    {statusSegmentsWithSVGProps.map((s, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={s.color}
                        strokeWidth={activeStatusIndex === i ? 15 : 12}
                        strokeDasharray={s.dashArray}
                        strokeDashoffset={s.dashOffset}
                        className="cursor-pointer transition-all duration-200 hover:opacity-90"
                        onMouseEnter={() => setActiveStatusIndex(i)}
                        onMouseLeave={() => setActiveStatusIndex(null)}
                        onClick={() => {
                          toast(`Filtering by ${s.label} complaints`);
                          navigate(`/brand-admin/complaint-monitoring?status=${s.label}`);
                        }}
                      />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center leading-none text-center pointer-events-none">
                    <span className="text-sm font-black text-[#1E293B] transition-all">
                      {activeStatusIndex !== null ? statusSegments[activeStatusIndex].value.toLocaleString() : '12,568'}
                    </span>
                    <span className="text-[7px] text-[#64748B] font-bold uppercase mt-0.5 tracking-tight transition-all">
                      {activeStatusIndex !== null ? statusSegments[activeStatusIndex].label : 'Total'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 flex-1">
                  {statusSegments.map((s, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between text-[9px] gap-2 p-1 rounded transition-all cursor-pointer ${
                        activeStatusIndex === i ? 'bg-slate-50 scale-[1.02]' : 'hover:bg-slate-50'
                      }`}
                      onMouseEnter={() => setActiveStatusIndex(i)}
                      onMouseLeave={() => setActiveStatusIndex(null)}
                      onClick={() => {
                        toast(`Filtering by ${s.label} complaints`);
                        navigate(`/brand-admin/complaint-monitoring?status=${s.label}`);
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className={`text-[#64748B] font-medium truncate ${activeStatusIndex === i ? 'text-blue-600 font-bold' : ''}`}>{s.label}</span>
                      </span>
                      <span className="font-bold text-[#1E293B] flex-shrink-0">{s.value.toLocaleString()} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── Row 3: Product Wise Complaints & Complaint Registration ── */}
          <div className="grid grid-cols-12 gap-4">

            {/* Product Wise Complaints */}
            <div className="col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-[#1E293B]">Product Wise Complaints</h2>
                <span className="text-[9px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-lg">Last 7 Days ▾</span>
              </div>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                {productWise.map((p, i) => (
                  <div 
                    key={i}
                    className="cursor-pointer group p-1 rounded-lg hover:bg-slate-50 transition-all duration-200"
                    onMouseEnter={() => setActiveProductIndex(i)}
                    onMouseLeave={() => setActiveProductIndex(null)}
                    onClick={() => {
                      toast(`Viewing complaints for ${p.name}`);
                      navigate(`/brand-admin/complaints?product=${p.name}`);
                    }}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-[10px] font-semibold transition-colors ${activeProductIndex === i ? 'text-blue-600 font-bold' : 'text-[#64748B]'}`}>{p.name}</span>
                      <span className="text-[10px] font-bold text-[#1E293B]">{p.value.toLocaleString()} ({p.pct}%)</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full transition-all duration-300 group-hover:scale-y-110" 
                        style={{ width: `${p.pct}%`, background: p.color }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complaint Registration panel */}
            <div className="col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col gap-3 justify-between">
              <h2 className="text-xs font-bold text-[#1E293B]">Complaint Registration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-semibold text-[#64748B] uppercase block mb-1">Toll Free Number</label>
                  <div className="flex gap-1">
                    <input
                      value={tollFreeInput}
                      onChange={e => setTollFreeInput(e.target.value)}
                      className="flex-1 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[11px] bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1]"
                    />
                    <button className="bg-[#0D47A1] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-700">OK</button>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-[#64748B] uppercase block mb-1">Search Customer</label>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
                    <input
                      placeholder="Enter Mobile / Ticket / Name"
                      value={searchCustomer}
                      onChange={e => setSearchCustomer(e.target.value)}
                      className="w-full pl-7 pr-3 border border-[#E2E8F0] rounded-lg py-1.5 text-[11px] bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/brand-admin/requests')}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-700 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={13} /> Register New Complaint
                </button>
                <button
                  onClick={() => toast('Bulk upload started!')}
                  className="flex-1 border border-[#0D47A1] text-[#0D47A1] hover:bg-[#EEF4FF] text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload size={13} /> Bulk Upload Complaints
                </button>
              </div>
            </div>

          </div>

          {/* ── Row 3: 6 Quick Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickStats.map((s, i) => (
              <div
                key={i}
                onClick={() => navigate(s.path)}
                className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-all"
              >
                <div className={`w-8 h-8 ${s.color} rounded-xl flex items-center justify-center mb-1`}>
                  <span className="text-base font-black text-[#1E293B]">{String(s.value)[0]}</span>
                </div>
                <p className="text-lg font-black text-[#1E293B]">{s.value}</p>
                <p className="text-[9px] font-semibold text-[#64748B] leading-tight">{s.label}</p>
                <button className="text-[10px] font-bold text-[#0D47A1] hover:underline mt-auto text-left">View</button>
              </div>
            ))}
          </div>

          {/* ── Row 4: 3-column bottom section ── */}
          <div className="grid grid-cols-12 gap-4">

            {/* Recent Complaints */}
            <div className="col-span-5 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex justify-between items-center">
                <h2 className="text-xs font-bold text-[#1E293B]">Recent Complaints</h2>
                <button onClick={() => navigate('/brand-admin/complaints')} className="text-[10px] font-semibold text-[#0D47A1] hover:underline">View All</button>
              </div>
              <table className="w-full text-[10px]">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[#64748B]">Ticket ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#64748B]">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#64748B]">Product</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#64748B]">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#64748B]">Raised On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {recentComplaints.map((c, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-2 text-[#0D47A1] font-semibold">{c.id}</td>
                      <td className="px-3 py-2 text-[#1E293B]">{c.customer}</td>
                      <td className="px-3 py-2 text-[#64748B]">{c.product}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${c.statusColor}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-2 text-[#64748B]">{c.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Spare Parts Overview */}
            <div className="col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-[#1E293B]">Spare Parts Overview</h2>
                <button onClick={() => navigate('/brand-admin/inventory')} className="text-[10px] font-semibold text-[#0D47A1] hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Inventory', value: '15,230', sub: 'Pcs', icon: <Package size={16} />, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { label: 'Parts in Transit', value: '1,845', sub: 'Pcs', icon: <Truck size={16} />, bg: 'bg-purple-50', color: 'text-purple-600' },
                  { label: 'FOC Parts Approved', value: '2,356', sub: 'Pcs', icon: <CheckCircle2 size={16} />, bg: 'bg-green-50', color: 'text-green-600' },
                  { label: 'Dispatch Today', value: '256', sub: 'Pcs', icon: <Truck size={16} />, bg: 'bg-orange-50', color: 'text-orange-600' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-3`}>
                    <div className={`${s.color} mb-1`}>{s.icon}</div>
                    <p className="text-base font-black text-[#1E293B]">{s.value}</p>
                    <p className="text-[9px] text-[#64748B] font-semibold">{s.sub}</p>
                    <p className="text-[9px] text-[#64748B] font-medium leading-tight mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Overview */}
            <div className="col-span-3 bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-[#1E293B]">Financial Overview</h2>
                <button onClick={() => navigate('/brand-admin/invoices')} className="text-[10px] font-semibold text-[#0D47A1] hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Total Invoice Value', value: '₹48,75,230', valueColor: 'text-[#1E293B]' },
                  { label: 'Pending Invoice Value', value: '₹8,45,210', valueColor: 'text-red-500' },
                  { label: 'Paid Amount', value: '₹40,30,020', valueColor: 'text-green-600' },
                  { label: 'Overdue Amount', value: '₹2,15,780', valueColor: 'text-red-500' },
                ].map((f, i) => (
                  <div key={i} className="flex justify-between items-center pb-2 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                    <span className="text-[10px] font-semibold text-[#64748B]">{f.label}</span>
                    <span className={`text-[11px] font-black ${f.valueColor}`}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Row 5: Quick Actions bar ── */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <h2 className="text-xs font-bold text-[#1E293B] mb-3">Quick Actions</h2>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {quickActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm`}>
                    {a.icon}
                  </div>
                  <span className="text-[9px] font-semibold text-[#64748B] text-center leading-tight group-hover:text-[#0D47A1] transition-colors">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
