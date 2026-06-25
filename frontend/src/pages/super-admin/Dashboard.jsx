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
  Truck
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const stats = [
    { title: 'Total Users', value: '24,520', icon: <Users size={20} />, color: 'bg-blue-600', trend: '+12%', positive: true },
    { title: 'Total Technicians', value: '1,240', icon: <UserCheck size={20} />, color: 'bg-green-600', trend: '+5%', positive: true },
    { title: 'Total Brands', value: '45', icon: <Building size={20} />, color: 'bg-purple-600', trend: '+2', positive: true },
    { title: 'Active Requests', value: '342', icon: <ClipboardList size={20} />, color: 'bg-yellow-600', trend: '+18%', positive: false },
    { title: 'Pending Requests', value: '124', icon: <Clock size={20} />, color: 'bg-orange-600', trend: '-4%', positive: true },
    { title: 'Warranty Claims', value: '56', icon: <FileCheck size={20} />, color: 'bg-teal-600', trend: '+8%', positive: false },
    { title: 'Total Revenue', value: '₹12.4L', icon: <IndianRupee size={20} />, color: 'bg-emerald-600', trend: '+22%', positive: true },
    { title: 'Failed Services', value: '14', icon: <XCircle size={20} />, color: 'bg-red-600', trend: '-2%', positive: true },
  ];

  const activities = [
    { id: 1, text: 'New customer Amit Sharma registered', time: '5 mins ago', icon: <Users size={14} />, iconBg: 'bg-blue-50 text-blue-600' },
    { id: 2, text: 'New request raised for Smart TV', time: '12 mins ago', icon: <ClipboardList size={14} />, iconBg: 'bg-yellow-50 text-yellow-600' },
    { id: 3, text: 'Tech assigned to Request #SR-8902', time: '25 mins ago', icon: <UserCheck size={14} />, iconBg: 'bg-green-50 text-green-600' },
    { id: 4, text: 'Warranty approved for Invoice #INV-101', time: '45 mins ago', icon: <FileCheck size={14} />, iconBg: 'bg-teal-50 text-teal-600' },
    { id: 5, text: 'Spare part dispatched for ticket #890', time: '1 hour ago', icon: <Truck size={14} />, iconBg: 'bg-purple-50 text-purple-600' },
  ];

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const filteredActivities = activities.filter(act => 
    act.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Super Admin Dashboard" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => {
                showToast('Navigating to Brands Panel with registration...');
                setTimeout(() => navigate('/super-admin/brands?add=true'), 800);
              }}
              className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Brand
            </button>
            <button 
              onClick={() => {
                showToast('Navigating to Technicians Panel with registration...');
                setTimeout(() => navigate('/super-admin/technicians?add=true'), 800);
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Add Technician
            </button>
            <button 
              onClick={() => {
                showToast('Navigating to Service Requests...');
                setTimeout(() => navigate('/super-admin/requests'), 800);
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <FileCheck size={16} /> Approve Request
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                    {stat.icon}
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.trend}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium text-[#64748B]">{stat.title}</p>
                  <p className="text-2xl font-black text-[#1E293B]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Simulated Revenue */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[#1E293B]">Revenue & Service Trends</h3>
                <select 
                  onChange={(e) => showToast(`Selected timeframe: ${e.target.value}`)}
                  className="text-xs text-[#64748B] border border-[#E2E8F0] rounded-md px-2 py-1 outline-none bg-white font-medium"
                >
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              
              {/* Simulated Chart Bars */}
              <div className="flex items-end justify-between h-48 pt-4">
                {[45, 60, 30, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="w-12 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-[#0D47A1]/10 rounded-t-md relative group cursor-pointer" 
                      style={{ height: `${height}%` }}
                      onClick={() => showToast(`Day ${i+1} Revenue: ₹${height}k`)}
                    >
                      <div className="absolute inset-0 bg-[#0D47A1] rounded-t-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-medium whitespace-nowrap">
                        ₹{height}k
                      </div>
                    </div>
                    <span className="text-xs text-[#64748B] font-medium">Day {i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[320px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Activity</h3>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              
              <div className="relative mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter activity feed..."
                  className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-lg outline-none text-xs text-slate-700 focus:ring-2 focus:ring-[#0D47A1]"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#64748B]" />
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {filteredActivities.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start text-sm cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors" onClick={() => showToast(act.text)}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${act.iconBg}`}>
                      {act.icon}
                    </div>
                    <div>
                      <p className="text-[#1E293B] font-medium text-xs">{act.text}</p>
                      <p className="text-[#64748B] text-xs mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
                {filteredActivities.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center pt-8">No matching activities.</p>
                )}
              </div>
              
              <button 
                onClick={() => navigate('/super-admin/logs')}
                className="mt-3 text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-1 justify-center w-full pt-2 border-t border-slate-100"
              >
                View All Activity <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Bottom Row: Additional Simulated Charts/Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Issues */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h3 className="font-bold text-[#1E293B] mb-4">Top Appliance Issues</h3>
              <div className="space-y-3">
                {[
                  { label: 'AC Not Cooling', count: 145, pct: 70 },
                  { label: 'TV Display Crack', count: 89, pct: 45 },
                  { label: 'Fridge Gas Leak', count: 64, pct: 30 },
                  { label: 'WM Spin Error', count: 42, pct: 20 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1 cursor-pointer group" onClick={() => showToast(`${item.label}: ${item.count} total reports`)}>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1E293B] group-hover:text-[#0D47A1]">{item.label}</span>
                      <span className="text-[#64748B]">{item.count} cases</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#FFB300] h-full transition-all group-hover:opacity-85" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand Performance */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]">
              <h3 className="font-bold text-[#1E293B] mb-4">Top Performing Brands</h3>
              <div className="space-y-3">
                {[
                  { label: 'LG Electronics', count: '₹4.5L', pct: 85 },
                  { label: 'Samsung', count: '₹3.2L', pct: 60 },
                  { label: 'Whirlpool', count: '₹2.1L', pct: 40 },
                  { label: 'Havells', count: '₹1.4L', pct: 25 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1 cursor-pointer group" onClick={() => showToast(`${item.label} total billing: ${item.count}`)}>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1E293B] group-hover:text-[#0D47A1]">{item.label}</span>
                      <span className="text-[#0D47A1]">{item.count}</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0D47A1] h-full transition-all group-hover:opacity-85" style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Success Toast */}
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
