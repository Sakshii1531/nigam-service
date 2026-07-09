import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { BarChart2, Clock, Zap, PhoneCall, RefreshCcw, AlertTriangle, CheckCircle2, X, Search, Filter } from 'lucide-react';

const complaints = [
  { id: 'TKT/250521/001756', customer: 'Amit Sharma', mobile: '9876543210', product: 'Refrigerator', model: 'GL-T292SBS', tech: 'Rahul Kumar', status: 'In Progress', sla: '2h 30m', priority: 'High', zone: 'Delhi' },
  { id: 'TKT/250521/001351', customer: 'Priya Verma', mobile: '9823456781', product: 'Washing Machine', model: 'FHM1408BDL', tech: 'Amit Singh', status: 'Customer NA', sla: '5h 10m', priority: 'Medium', zone: 'Mumbai' },
  { id: 'TKT/250521/001354', customer: 'Rohit Kumar', mobile: '9901234567', product: 'Air Conditioner', model: '5 Star 1.5T', tech: 'Suresh Raina', status: 'SLA Breached', sla: '0m', priority: 'Critical', zone: 'Bangalore' },
  { id: 'TKT/250521/001253', customer: 'Neha Singh', mobile: '9845678901', product: 'Television', model: 'OLED 55"', tech: 'Vikram Batra', status: 'In Progress', sla: '1h 00m', priority: 'High', zone: 'Chennai' },
  { id: 'TKT/250521/001052', customer: 'Vikas Yadav', mobile: '9812345670', product: 'Microwave Oven', model: 'MC3286BRUM', tech: 'Deepak Patel', status: 'Scheduled', sla: '4h 45m', priority: 'Low', zone: 'Pune' },
  { id: 'TKT/250521/000945', customer: 'Sanjana Mehta', mobile: '9867890123', product: 'Refrigerator', model: 'GN-H702HLHQ', tech: 'Unassigned', status: 'Pending', sla: '6h 20m', priority: 'Medium', zone: 'Hyderabad' },
];

const statusColors = {
  'In Progress': 'bg-blue-100 text-blue-700',
  'Customer NA': 'bg-yellow-100 text-yellow-700',
  'SLA Breached': 'bg-red-100 text-red-700',
  'Scheduled': 'bg-purple-100 text-purple-700',
  'Pending': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-green-100 text-green-700',
};

const priorityColors = {
  'Critical': 'bg-red-500',
  'High': 'bg-orange-500',
  'Medium': 'bg-yellow-500',
  'Low': 'bg-green-500',
};

const ComplaintMonitoring = () => {
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const filtered = complaints.filter(c => {
    const matchSearch = c.customer.toLowerCase().includes(searchQ.toLowerCase()) || c.id.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpis = [
    { label: "Today's Complaints", value: '189', icon: <BarChart2 size={18} />, bg: 'bg-blue-600' },
    { label: 'SLA Breached', value: '12', icon: <AlertTriangle size={18} />, bg: 'bg-red-600' },
    { label: 'Avg Resolution Time', value: '3h 24m', icon: <Clock size={18} />, bg: 'bg-purple-600' },
    { label: 'First-Call Resolution', value: '74.5%', icon: <Zap size={18} />, bg: 'bg-green-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Complaint Monitoring" subtitle="Live monitoring of all active complaint statuses" />
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center text-white`}>{k.icon}</div>
                <div>
                  <p className="text-lg font-black text-[#1E293B]">{k.value}</p>
                  <p className="text-[10px] font-semibold text-[#64748B]">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  placeholder="Search by complaint ID or customer..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              {['All', 'In Progress', 'Customer NA', 'SLA Breached', 'Scheduled', 'Pending'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
                >{s}</button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Ticket ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Technician</th>
                    <th className="px-3 py-3">Zone</th>
                    <th className="px-3 py-3">SLA Remaining</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((c, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${priorityColors[c.priority]}`} />
                          <span className="text-[10px] font-semibold text-[#64748B]">{c.priority}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold">{c.id}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#1E293B]">{c.customer}</p>
                        <p className="text-[#94A3B8] text-[9px]">{c.mobile}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-[#1E293B] font-medium">{c.product}</p>
                        <p className="text-[#94A3B8] text-[9px]">{c.model}</p>
                      </td>
                      <td className="px-3 py-3 text-[#64748B]">{c.tech}</td>
                      <td className="px-3 py-3 text-[#64748B]">{c.zone}</td>
                      <td className="px-3 py-3">
                        <span className={`font-bold text-xs ${c.sla === '0m' ? 'text-red-600' : 'text-[#1E293B]'}`}>{c.sla || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => toast(`Calling ${c.customer}...`)} title="Call Customer" className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors"><PhoneCall size={13} /></button>
                          <button onClick={() => toast(`Reassigning complaint ${c.id}...`)} title="Reassign" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><RefreshCcw size={13} /></button>
                          <button onClick={() => toast(`Resolving complaint ${c.id}...`)} title="Mark Resolved" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default ComplaintMonitoring;
