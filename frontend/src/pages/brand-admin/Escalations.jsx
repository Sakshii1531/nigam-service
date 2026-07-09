import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { AlertTriangle, Clock, ArrowUpRight, CheckCircle2, Search, Filter, Download, Eye, X } from 'lucide-react';

const escalationData = [
  { id: 'TKT/250521/001354', customer: 'Rohit Kumar', product: 'Air Conditioner', reason: 'Repeated Failed Visits', raisedBy: 'Customer', date: '21 May 2025', priority: 'P1', status: 'Open', daysOpen: 4 },
  { id: 'TKT/250521/001253', customer: 'Neha Singh', product: 'Television', reason: 'Part Not Available', raisedBy: 'Technician', date: '20 May 2025', priority: 'P2', status: 'Under Review', daysOpen: 2 },
  { id: 'TKT/250520/000876', customer: 'Manish Gupta', product: 'Refrigerator', reason: 'Customer Threatening Legal Action', raisedBy: 'Customer', date: '20 May 2025', priority: 'P1', status: 'Open', daysOpen: 3 },
  { id: 'TKT/250519/000654', customer: 'Sunita Sharma', product: 'Washing Machine', reason: 'Out of SLA — No Resolution', raisedBy: 'System Auto', date: '19 May 2025', priority: 'P2', status: 'Assigned to Senior', daysOpen: 5 },
  { id: 'TKT/250518/000321', customer: 'Anil Tiwari', product: 'Air Conditioner', reason: 'Wrong Part Installed', raisedBy: 'QA Team', date: '18 May 2025', priority: 'P3', status: 'Resolved', daysOpen: 0 },
];

const priorityColors = {
  P1: { badge: 'bg-red-100 text-red-700 border border-red-300', dot: 'bg-red-500' },
  P2: { badge: 'bg-orange-100 text-orange-700 border border-orange-300', dot: 'bg-orange-500' },
  P3: { badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300', dot: 'bg-yellow-500' },
};

const statusColors = {
  'Open': 'bg-red-100 text-red-700',
  'Under Review': 'bg-orange-100 text-orange-700',
  'Assigned to Senior': 'bg-blue-100 text-blue-700',
  'Resolved': 'bg-green-100 text-green-700',
};

const Escalations = () => {
  const [searchQ, setSearchQ] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [selectedEsc, setSelectedEsc] = useState(null);
  const [data, setData] = useState(escalationData);
  const [successMsg, setSuccessMsg] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleDeescalate = (id) => {
    setData(d => d.map(e => e.id === id ? { ...e, status: 'Resolved', daysOpen: 0 } : e));
    setSelectedEsc(null);
    toast(`Complaint ${id} de-escalated and marked Resolved!`);
  };

  const handleAssignSenior = (id) => {
    setData(d => d.map(e => e.id === id ? { ...e, status: 'Assigned to Senior' } : e));
    setSelectedEsc(null);
    toast(`Complaint ${id} assigned to Senior Technician!`);
  };

  const filtered = data.filter(e => {
    const matchSearch = e.customer.toLowerCase().includes(searchQ.toLowerCase()) || e.id.toLowerCase().includes(searchQ.toLowerCase());
    const matchPriority = filterPriority === 'All' || e.priority === filterPriority;
    return matchSearch && matchPriority;
  });

  const kpis = [
    { label: 'Total Escalations', value: data.length, icon: <AlertTriangle size={18} />, bg: 'bg-red-600' },
    { label: 'P1 Critical', value: data.filter(d => d.priority === 'P1').length, icon: <AlertTriangle size={18} />, bg: 'bg-red-800' },
    { label: 'P2 High', value: data.filter(d => d.priority === 'P2').length, icon: <Clock size={18} />, bg: 'bg-orange-600' },
    { label: 'Resolved Today', value: data.filter(d => d.status === 'Resolved').length, icon: <CheckCircle2 size={18} />, bg: 'bg-green-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Escalations" subtitle="Manage critical and high-priority escalated complaints" />
        <div className="p-5 space-y-5">

          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center text-white`}>{k.icon}</div>
                <div>
                  <p className="text-xl font-black text-[#1E293B]">{k.value}</p>
                  <p className="text-[10px] font-semibold text-[#64748B]">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  placeholder="Search by ID or customer name..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div className="flex gap-2">
                {['All', 'P1', 'P2', 'P3'].map(p => (
                  <button key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterPriority === p ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
                  >{p}</button>
                ))}
              </div>
              <button onClick={() => toast('Escalations exported as CSV!')} className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]">
                <Download size={13} /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Ticket ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Escalation Reason</th>
                    <th className="px-3 py-3">Raised By</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Days Open</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((e, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColors[e.priority].badge}`}>{e.priority}</span>
                      </td>
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold text-[11px]">{e.id}</td>
                      <td className="px-3 py-3 font-semibold text-[#1E293B]">{e.customer}</td>
                      <td className="px-3 py-3 text-[#64748B]">{e.product}</td>
                      <td className="px-3 py-3 text-[#64748B] max-w-[180px]">{e.reason}</td>
                      <td className="px-3 py-3 text-[#64748B]">{e.raisedBy}</td>
                      <td className="px-3 py-3 text-[#64748B]">{e.date}</td>
                      <td className="px-3 py-3">
                        <span className={`font-bold ${e.daysOpen >= 3 ? 'text-red-600' : e.daysOpen >= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                          {e.daysOpen === 0 ? '—' : `${e.daysOpen}d`}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[e.status] || 'bg-gray-100 text-gray-700'}`}>{e.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedEsc(e)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Eye size={13} /></button>
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

      {/* Detail Modal */}
      {selectedEsc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-start bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Escalation Details</h3>
                <p className="text-[#0D47A1] font-semibold text-xs mt-0.5">{selectedEsc.id}</p>
              </div>
              <button onClick={() => setSelectedEsc(null)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                ['Customer', selectedEsc.customer], ['Product', selectedEsc.product],
                ['Escalation Reason', selectedEsc.reason], ['Raised By', selectedEsc.raisedBy],
                ['Priority', selectedEsc.priority], ['Status', selectedEsc.status], ['Days Open', selectedEsc.daysOpen === 0 ? 'Resolved' : `${selectedEsc.daysOpen} days`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#F1F5F9] pb-2 last:border-0">
                  <span className="text-[#64748B] font-semibold">{k}</span>
                  <span className="font-bold text-[#1E293B]">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDeescalate(selectedEsc.id)} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-700">De-escalate</button>
                <button onClick={() => handleAssignSenior(selectedEsc.id)} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Assign Senior</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default Escalations;
