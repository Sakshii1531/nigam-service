import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, IndianRupee,
  Package, ArrowUpRight, ArrowDownRight, Eye, Plus, Upload,
  Search, Truck, ShieldCheck, FileText, RefreshCcw, BarChart2,
  PhoneCall, X
} from 'lucide-react';

/* ── KPI Card ── */
const KPICard = ({ title, value, icon, iconBg, trend, trendUp, link, onLink }) => (
  <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={onLink}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
      <div className={`flex items-center text-xs font-semibold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
        {trend}
        {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      </div>
    </div>
    <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">{title}</p>
    <p className="text-xl font-black text-[#1E293B]">{value}</p>
    <p className="text-[10px] text-[#94A3B8] mt-0.5">vs last 7 days</p>
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

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  /* ── KPI data ── */
  const kpis = [
    { title: 'Total Complaints', value: '12,568', icon: <ClipboardList size={18} />, iconBg: 'bg-blue-500', trend: '+12.5%', trendUp: true, path: '/brand-admin/complaints' },
    { title: 'Completed Calls', value: '10,523', icon: <CheckCircle2 size={18} />, iconBg: 'bg-green-500', trend: '+15.2%', trendUp: true, path: '/brand-admin/complaints' },
    { title: 'In Progress', value: '1,248', icon: <Clock size={18} />, iconBg: 'bg-orange-500', trend: '+5.6%', trendUp: true, path: '/brand-admin/complaint-monitoring' },
    { title: 'Escalations', value: '156', icon: <AlertTriangle size={18} />, iconBg: 'bg-red-500', trend: '+18.3%', trendUp: false, path: '/brand-admin/escalations' },
    { title: 'Total Invoice Value', value: '₹48,75,230', icon: <IndianRupee size={18} />, iconBg: 'bg-purple-500', trend: '+13.7%', trendUp: true, path: '/brand-admin/invoices' },
    { title: 'FOC Parts Approved', value: '2,356', icon: <Package size={18} />, iconBg: 'bg-teal-500', trend: '+10.9%', trendUp: true, path: '/brand-admin/warranty-claims' },
  ];

  /* ── Donut chart segments ── */
  const statusSegments = [
    { label: 'Completed', value: 10523, pct: 83.8, color: '#22C55E' },
    { label: 'In Progress', value: 1248, pct: 9.9, color: '#3B82F6' },
    { label: 'Customer Not Available', value: 342, pct: 2.7, color: '#F59E0B' },
    { label: 'Tomorrow / Reschedule', value: 215, pct: 1.7, color: '#8B5CF6' },
    { label: 'Out of Warranty', value: 180, pct: 1.4, color: '#EF4444' },
    { label: 'Cancelled', value: 60, pct: 0.5, color: '#94A3B8' },
  ];

  /* ── Trend line data (simulated) ── */
  const trendData = [1456, 1523, 1389, 1565, 1842, 2178, 2515];
  const trendLabels = ['15 May', '16 May', '17 May', '18 May', '19 May', '20 May', '21 May'];
  const maxTrend = Math.max(...trendData);

  /* ── Product wise ── */
  const productWise = [
    { name: 'Refrigerator', value: 4125, pct: 32.8, color: '#3B82F6' },
    { name: 'Washing Machine', value: 2854, pct: 22.7, color: '#10B981' },
    { name: 'Air Conditioner', value: 2315, pct: 18.4, color: '#F59E0B' },
    { name: 'Television', value: 1876, pct: 14.9, color: '#8B5CF6' },
    { name: 'Microwave Oven', value: 1398, pct: 11.1, color: '#EF4444' },
  ];

  /* ── Quick stats ── */
  const quickStats = [
    { label: 'Customer Not Available', value: 342, color: 'bg-blue-100', path: '/brand-admin/complaint-monitoring' },
    { label: 'Call Tomorrow/Reschedule', value: 215, color: 'bg-yellow-100', path: '/brand-admin/complaint-monitoring' },
    { label: 'Out of Warranty (Chargeable)', value: 160, color: 'bg-red-100', path: '/brand-admin/complaints' },
    { label: 'No Invoice / Bill Available', value: 98, color: 'bg-purple-100', path: '/brand-admin/complaints' },
    { label: 'Document Pending', value: 76, color: 'bg-orange-100', path: '/brand-admin/documents' },
    { label: 'Repeat Calls', value: 132, color: 'bg-teal-100', path: '/brand-admin/complaints' },
  ];

  /* ── Recent complaints ── */
  const recentComplaints = [
    { id: 'TKT/250521/001756', customer: 'Amit Sharma', product: 'Refrigerator', status: 'In Progress', statusColor: 'bg-blue-100 text-blue-700', date: '21 May 2025, 10:30 AM' },
    { id: 'TKT/250521/001351', customer: 'Priya Verma', product: 'Washing Machine', status: 'Completed', statusColor: 'bg-green-100 text-green-700', date: '21 May 2025, 09:45 AM' },
    { id: 'TKT/250521/001354', customer: 'Rohit Kumar', product: 'Air Conditioner', status: 'Customer NA', statusColor: 'bg-yellow-100 text-yellow-700', date: '21 May 2025, 09:12 AM' },
    { id: 'TKT/250521/001253', customer: 'Neha Singh', product: 'Television', status: 'Out of Warranty', statusColor: 'bg-red-100 text-red-700', date: '21 May 2025, 08:50 AM' },
    { id: 'TKT/250521/001052', customer: 'Vikas Yadav', product: 'Microwave Oven', status: 'Tomorrow Call', statusColor: 'bg-purple-100 text-purple-700', date: '21 May 2025, 08:20 AM' },
  ];

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

  /* Build conic-gradient for donut */
  let cumulative = 0;
  const conicStops = statusSegments.map(s => {
    const start = cumulative;
    cumulative += s.pct;
    return `${s.color} ${start.toFixed(1)}% ${cumulative.toFixed(1)}%`;
  }).join(', ');

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
                <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
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
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Dots + labels */}
                  {trendData.map((v, i) => (
                    <g key={i}>
                      <circle cx={i * 83.3} cy={100 - (v / maxTrend) * 85} r="3" fill="#3B82F6" />
                      <text x={i * 83.3} y={100 - (v / maxTrend) * 85 - 7} textAnchor="middle" fontSize="7" fill="#1E293B" fontWeight="700">{v.toLocaleString()}</text>
                    </g>
                  ))}
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
                  <div
                    className="w-28 h-28 rounded-full"
                    style={{ background: `conic-gradient(${conicStops})` }}
                  />
                  <div className="absolute w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-sm font-black text-[#1E293B]">12,568</span>
                    <span className="text-[8px] text-[#64748B]">Total</span>
                  </div>
                </div>
                <div className="space-y-1 flex-1">
                  {statusSegments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[#64748B] font-medium truncate">{s.label}</span>
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
                  <div key={i}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-semibold text-[#64748B]">{p.name}</span>
                      <span className="text-[10px] font-bold text-[#1E293B]">{p.value.toLocaleString()} ({p.pct}%)</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.color }} />
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
