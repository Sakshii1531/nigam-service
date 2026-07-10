import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Users, 
  UserCheck, 
  Building, 
  ClipboardList, 
  Clock, 
  FileCheck, 
  IndianRupee, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Search,
  CheckCircle2,
  Truck,
  Shield,
  Star,
  AlertTriangle,
  MapPin,
  Calendar,
  MessageSquare,
  HelpCircle,
  Briefcase,
  Play,
  Megaphone,
  BarChart3,
  LogOut,
  ArrowUpRight,
  ShieldAlert,
  Bell,
  Wrench,
  FileText,
  Package
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTabRevenue, setActiveTabRevenue] = useState('7days');
  const [activeTabRequest, setActiveTabRequest] = useState('7days');
  const [activeTabCity, setActiveTabCity] = useState('7days');
  const [activeTabASM, setActiveTabASM] = useState('7days');
  const [activeTabPartner, setActiveTabPartner] = useState('7days');

  // Chart interactivity states
  const [activeRevenueIndex, setActiveRevenueIndex] = useState(null);
  const [activeDoughnutIndex, setActiveDoughnutIndex] = useState(null);
  const [activeRequestBar, setActiveRequestBar] = useState(null);
  const [activeTechSegment, setActiveTechSegment] = useState(null);

  const revenuePoints = [
    { x: 10, y: 90, date: '15 May', value: '₹35,40,000' },
    { x: 73, y: 73, date: '16 May', value: '₹42,10,000' },
    { x: 130, y: 85, date: '17 May', value: '₹38,50,000' },
    { x: 190, y: 65, date: '18 May', value: '₹45,80,000' },
    { x: 250, y: 50, date: '19 May', value: '₹41,20,000' },
    { x: 310, y: 38, date: '20 May', value: '₹48,90,000' },
    { x: 390, y: 25, date: '21 May', value: '₹50,60,600' }
  ];

  const handleRevenueMouseMove = (e) => {
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
    if (activeRevenueIndex !== null) {
      showToast(`Revenue on ${revenuePoints[activeRevenueIndex].date}: ${revenuePoints[activeRevenueIndex].value}`);
    }
  };

  const doughnutSegments = [
    { label: 'Open', value: '1,632', pct: 28, stroke: '#0D47A1', dashArray: "70.3 251.2", dashOffset: "0", routeVal: 'open' },
    { label: 'Completed', value: '1,820', pct: 32, stroke: '#10B981', dashArray: "80.4 251.2", dashOffset: "-70.3", routeVal: 'completed' },
    { label: 'Assigned', value: '1,054', pct: 18, stroke: '#38BDF8', dashArray: "45.2 251.2", dashOffset: "-150.7", routeVal: 'assigned' },
    { label: 'In-Progress', value: '712', pct: 12, stroke: '#F59E0B', dashArray: "30.1 251.2", dashOffset: "-195.9", routeVal: 'in-progress' },
    { label: 'Cancelled', value: '112', pct: 10, stroke: '#EF4444', dashArray: "25.2 251.2", dashOffset: "-226", routeVal: 'cancelled' },
  ];

  const techSegments = [
    { label: 'Online', value: '824', pct: 64, stroke: '#10B981', dashArray: "160.7 251.2", dashOffset: "0", statusKey: 'online' },
    { label: 'On Job', value: '312', pct: 24, stroke: '#0D47A1', dashArray: "60.3 251.2", dashOffset: "-160.7", statusKey: 'on-job' },
    { label: 'Offline', value: '148', pct: 12, stroke: '#94A3B8', dashArray: "30.2 251.2", dashOffset: "-221", statusKey: 'offline' },
  ];

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Top KPI Metrics
  const stats = [
    { title: 'Total Revenue', value: '₹2,84,50,600', trend: '18.6% vs last 7 days', positive: true, icon: <IndianRupee size={16} />, iconColor: 'text-[#0D47A1] bg-[#E8F0FE]', path: '/super-admin/revenue' },
    { title: "Today's Revenue", value: '₹12,45,300', trend: '12.3% vs yesterday', positive: true, icon: <IndianRupee size={16} />, iconColor: 'text-green-600 bg-green-50', path: '/super-admin/revenue' },
    { title: 'Active Requests', value: '1,632', trend: '8.5% vs yesterday', positive: false, icon: <ClipboardList size={16} />, iconColor: 'text-red-500 bg-red-50', path: '/super-admin/requests' },
    { title: 'AMC Customers', value: '24,850', trend: '15.2% vs last 7 days', positive: true, icon: <Users size={16} />, iconColor: 'text-purple-600 bg-purple-50', path: '/super-admin/amc' },
    { title: 'NCC Shield Customers', value: '18,320', trend: '9.7% vs last 7 days', positive: true, icon: <Shield size={16} />, iconColor: 'text-orange-600 bg-orange-50', path: '/super-admin/warranty' },
    { title: 'Product Orders', value: '512', trend: '14.8% vs yesterday', positive: true, icon: <Briefcase size={16} />, iconColor: 'text-pink-600 bg-pink-50', path: '/super-admin/orders' },
    { title: 'Open Escalations', value: '74', trend: '6.3% vs yesterday', positive: false, icon: <AlertTriangle size={16} />, iconColor: 'text-red-600 bg-red-50', path: '/super-admin/escalation-desk' },
    { title: 'Active Cities', value: '52', trend: 'No change', neutral: true, icon: <MapPin size={16} />, iconColor: 'text-blue-500 bg-blue-50', path: '/super-admin/cities' },
    { title: 'Active Service Partners', value: '1,284', trend: '11.4% vs yesterday', positive: true, icon: <Building size={16} />, iconColor: 'text-emerald-600 bg-emerald-50', path: '/super-admin/service-partners' },
    { title: 'Customer Satisfaction', value: '4.7 / 5', trend: '0.2 vs last 7 days', positive: true, icon: <Star size={16} />, iconColor: 'text-yellow-600 bg-yellow-50', path: '/super-admin/reports' }
  ];

  // Quick Action List
  const quickActions = [
    { label: 'Add Service Partner', icon: <Building size={18} />, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100', path: '/super-admin/service-partners' },
    { label: 'Add ASM', icon: <Users size={18} />, color: 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-100', path: '/super-admin/asm' },
    { label: 'Add Technician', icon: <UserCheck size={18} />, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-100', path: '/super-admin/technicians?add=true' },
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
        <Topbar 
          title="Executive Dashboard" 
          subtitle="Welcome back! Here's what's happening with NCC today."
          showFilters={true}
        />

        {/* Dashboard Body */}
        <div className="p-6 space-y-6 flex-1 max-w-[1600px] mx-auto w-full">

          {/* 10 KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((stat, idx) => (
              <div 
                key={idx} 
                className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => navigate(stat.path)}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconColor}`}>
                    {stat.icon}
                  </div>
                  {!stat.neutral ? (
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {stat.positive ? '↑' : '↓'} {stat.trend.split(' ')[0]}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">
                      —
                    </span>
                  )}
                </div>
                <div className="mt-3.5">
                  <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">{stat.title}</p>
                  <p className="text-lg font-black text-[#1E293B] tracking-tight">{stat.value}</p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {stat.neutral ? 'No change' : `vs ${stat.trend.substring(stat.trend.indexOf('vs') + 3 || 0)}`}
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
                    <span className="text-xl font-black text-[#1E293B]">₹2,84,50,600</span>
                    <span className="text-[10px] font-bold text-green-600 flex items-center">↑ 18.6% <span className="text-slate-400 font-medium ml-1">vs last 7 days</span></span>
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
                  <path 
                    d="M 10 90 Q 70 70 130 85 T 250 50 T 310 38 T 390 25 L 390 120 L 10 120 Z" 
                    fill="url(#revenue-gradient)" 
                  />
                  
                  {/* Line Path */}
                  <path 
                    d="M 10 90 Q 70 70 130 85 T 250 50 T 310 38 T 390 25" 
                    fill="none" 
                    stroke="#0D47A1" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  
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
                  {activeRevenueIndex !== null && (() => {
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
                <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
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
                      {activeDoughnutIndex !== null ? doughnutSegments[activeDoughnutIndex].value : '5.3K'}
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
                    <span className="text-xl font-black text-[#1E293B]">4,568</span>
                    <span className="text-[10px] font-bold text-green-600 flex items-center">↑ 16.2% <span className="text-slate-400 font-medium ml-1">vs last 7 days</span></span>
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
                {[600, 800, 700, 900, 850, 950, 900].map((val, i) => {
                  const maxVal = 1000;
                  const heightPct = (val / maxVal) * 100;
                  const day = 15 + i;
                  return (
                    <div 
                      key={i} 
                      className="flex flex-col items-center gap-1.5 w-7 relative group cursor-pointer" 
                      onMouseEnter={() => setActiveRequestBar(i)}
                      onMouseLeave={() => setActiveRequestBar(null)}
                      onClick={() => {
                        setActiveRequestBar(i);
                        showToast(`Requests on ${day} May: ${val}`);
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

          {/* Third Row: Lists / Ranking & Technician Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Top Cities by Requests */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-xs text-[#1E293B] tracking-wider uppercase">Top Cities by Requests</h3>
                <select 
                  value={activeTabCity} 
                  onChange={(e) => setActiveTabCity(e.target.value)}
                  className="text-[10px] text-[#64748B] border border-[#E2E8F0] rounded-md px-1.5 py-0.5 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="space-y-3.5 flex-1">
                {[
                  { city: 'Lucknow', count: 842, max: 1000 },
                  { city: 'Kanpur', count: 512, max: 1000 },
                  { city: 'Gorakhpur', count: 413, max: 1000 },
                  { city: 'Varanasi', count: 308, max: 1000 },
                  { city: 'Delhi', count: 268, max: 1000 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                        {item.city}
                      </span>
                      <span className="text-[#0D47A1] font-bold">{item.count}</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0D47A1] h-full rounded-full" style={{ width: `${(item.count / item.max) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate('/super-admin/cities')}
                className="mt-4 w-full text-center text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-1 justify-center pt-3 border-t border-slate-100"
              >
                View All Cities →
              </button>
            </div>

            {/* Top Performing ASMs */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-xs text-[#1E293B] tracking-wider uppercase">Top Performing ASMs</h3>
                <select 
                  value={activeTabASM} 
                  onChange={(e) => setActiveTabASM(e.target.value)}
                  className="text-[10px] text-[#64748B] border border-[#E2E8F0] rounded-md px-1.5 py-0.5 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="space-y-3 flex-1">
                {[
                  { name: 'Rajesh Kumar', city: 'Lucknow', rating: '98%' },
                  { name: 'Amit Singh', city: 'Kanpur', rating: '95%' },
                  { name: 'Suresh Yadav', city: 'Gorakhpur', rating: '94%' },
                  { name: 'Pooja Verma', city: 'Varanasi', rating: '92%' },
                  { name: 'Vikram Singh', city: 'Patna', rating: '90%' }
                ].map((asm, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-semibold py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                      <div>
                        <p className="text-slate-800 font-bold">{asm.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{asm.city}</p>
                      </div>
                    </div>
                    <span className="text-green-600 font-bold">{asm.rating}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate('/super-admin/asm')}
                className="mt-4 w-full text-center text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-1 justify-center pt-3 border-t border-slate-100"
              >
                View All ASMs →
              </button>
            </div>

            {/* Top Service Partners */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-xs text-[#1E293B] tracking-wider uppercase">Top Service Partners</h3>
                <select 
                  value={activeTabPartner} 
                  onChange={(e) => setActiveTabPartner(e.target.value)}
                  className="text-[10px] text-[#64748B] border border-[#E2E8F0] rounded-md px-1.5 py-0.5 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="space-y-3 flex-1">
                {[
                  { name: 'Care Tech Solutions', score: '98%' },
                  { name: 'Perfect Services', score: '96%' },
                  { name: 'Quick Fix India', score: '94%' },
                  { name: 'Reliable Care', score: '92%' },
                  { name: 'Tech Seva Point', score: '90%' }
                ].map((partner, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-semibold py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                      <span className="text-slate-800 font-bold">{partner.name}</span>
                    </div>
                    <span className="text-green-600 font-bold">{partner.score}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate('/super-admin/service-partners')}
                className="mt-4 w-full text-center text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-1 justify-center pt-3 border-t border-slate-100"
              >
                View All Partners →
              </button>
            </div>

            {/* Live Technician Status (Circular Ring Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-extrabold text-xs text-[#1E293B] tracking-wider uppercase">Live Technician Status</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {/* Status Doughnut Ring */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="8"/>
                    {techSegments.map((segment, i) => (
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
                          showToast(`Viewing all ${segment.label} technicians`);
                          navigate(`/super-admin/technicians?status=${segment.statusKey}`);
                        }}
                      />
                    ))}
                  </svg>
                  <div className="absolute flex flex-col items-center leading-none text-center">
                    <span className="text-base font-extrabold text-[#1E293B] transition-all">
                      {activeTechSegment !== null ? techSegments[activeTechSegment].value : '1,284'}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 transition-all">
                      {activeTechSegment !== null ? techSegments[activeTechSegment].label : 'Total Techs'}
                    </span>
                  </div>
                </div>

                {/* Legend list below */}
                <div className="w-full space-y-1.5 px-2">
                  {techSegments.map((segment, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between text-[11px] font-bold p-1 rounded-lg transition-all cursor-pointer ${
                        activeTechSegment === i ? 'bg-slate-50 scale-[1.02]' : 'hover:bg-slate-50'
                      }`}
                      onMouseEnter={() => setActiveTechSegment(i)}
                      onMouseLeave={() => setActiveTechSegment(null)}
                      onClick={() => {
                        showToast(`Viewing all ${segment.label} technicians`);
                        navigate(`/super-admin/technicians?status=${segment.statusKey}`);
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

          </div>

          {/* Fourth Row: Live Activity, Recent Escalations & Upcoming Renewals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Activity Feed */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between h-[360px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-[#1E293B]">Live Activity Feed</h3>
                <button 
                  onClick={() => navigate('/super-admin/logs')}
                  className="text-xs font-bold text-[#0D47A1] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {[
                  { text: 'New service request #SR-125853 received from Amit Sharma', city: 'Lucknow', time: '2 mins ago', color: 'bg-blue-50 text-[#0D47A1]' },
                  { text: 'Technician Rahul Kumar started job #SR-125589', city: 'Kanpur', time: '5 mins ago', color: 'bg-green-50 text-green-600' },
                  { text: 'AMC plan sold: Gold Plan to Neha Gupta', city: 'Kanpur', time: '10 mins ago', color: 'bg-yellow-50 text-yellow-600' },
                  { text: 'NCC Shield claim #CLM-8893 approved for LG Refrigerator', city: 'Delhi', time: '15 mins ago', color: 'bg-purple-50 text-purple-600' },
                  { text: 'Spare part request #SPR-4458 approved and dispatched', city: 'Varanasi', time: '20 mins ago', color: 'bg-emerald-50 text-emerald-600' },
                ].map((act, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-normal">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${act.color} font-black`}>
                      •
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-semibold">{act.text} <span className="text-[10px] text-slate-400 font-medium">({act.city})</span></p>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Escalations */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between h-[360px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-[#1E293B]">Recent Escalations</h3>
                <button 
                  onClick={() => navigate('/super-admin/complaints')}
                  className="text-xs font-bold text-[#0D47A1] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                {[
                  { id: '#ESC-5554', desc: 'AC not cooling - Delay in service', city: 'Lucknow', time: '25 mins ago' },
                  { id: '#ESC-5553', desc: 'Technician behavior complaint', city: 'Kanpur', time: '35 mins ago' },
                  { id: '#ESC-5552', desc: 'Warranty claim rejected by brand', city: 'Delhi', time: '1 hr ago' },
                  { id: '#ESC-5551', desc: 'Spare part not available', city: 'Gorakhpur', time: '1 hr ago' },
                ].map((esc, idx) => (
                  <div key={idx} className="flex items-start justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        <span className="font-bold text-[#1E293B]">{esc.id}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{esc.time}</span>
                      </div>
                      <p className="text-slate-600 font-semibold pl-3.5 leading-tight">{esc.desc}</p>
                      <p className="text-[10px] text-slate-400 font-bold pl-3.5">{esc.city}</p>
                    </div>
                    <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-100 uppercase">
                      High
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Renewals */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between h-[360px]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-[#1E293B]">Upcoming Renewals</h3>
                <button 
                  onClick={() => showToast('Opening renewals board...')}
                  className="text-xs font-bold text-[#0D47A1] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3.5 flex-1">
                {[
                  { title: 'AMC Renewals', desc: 'Due in next 7 days', count: 265, icon: <FileCheck size={18} className="text-amber-500" />, iconBg: 'bg-amber-50 border-amber-100' },
                  { title: 'NCC Shield Renewals', desc: 'Due in next 7 days', count: 189, icon: <Shield size={18} className="text-indigo-500" />, iconBg: 'bg-indigo-50 border-indigo-100' },
                  { title: 'Expiring Today', desc: 'Renewals due today', count: 24, icon: <AlertTriangle size={18} className="text-red-500" />, iconBg: 'bg-red-50 border-red-100' }
                ].map((ren, idx) => (
                  <div key={idx} className="flex items-center justify-between border border-slate-100 p-3.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${ren.iconBg}`}>
                        {ren.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{ren.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{ren.desc}</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800">{ren.count}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0]">
            <h3 className="font-extrabold text-sm text-[#1E293B] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
