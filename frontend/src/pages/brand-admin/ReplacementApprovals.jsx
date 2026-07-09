import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { RefreshCcw, Clock, CheckCircle2, X, Search, Download, Eye, MessageSquare } from 'lucide-react';

const replacements = [
  { id: 'RPL-001', complaintId: 'TKT/250521/001354', customer: 'Rohit Kumar', product: 'Air Conditioner', model: '5 Star 1.5T', reason: 'Motor burnt — beyond repair', techNotes: 'Tried 3 times, issue persists in compressor unit', tech: 'Suresh Raina', date: '21 May 2025', status: 'Pending' },
  { id: 'RPL-002', complaintId: 'TKT/250520/000812', customer: 'Meena Joshi', product: 'Television', model: 'OLED 55"', reason: 'Panel cracked — manufacturing defect', techNotes: 'Customer reported on second day of purchase. Panel replaced but recurred.', tech: 'Vikram Batra', date: '20 May 2025', status: 'Pending' },
  { id: 'RPL-003', complaintId: 'TKT/250519/000654', customer: 'Sunita Sharma', product: 'Washing Machine', model: 'FHM1408BDL', reason: 'PCB failure — part unavailable', techNotes: 'PCB not in stock, ETA 30+ days. Customer cannot wait.', tech: 'Amit Singh', date: '19 May 2025', status: 'Approved' },
  { id: 'RPL-004', complaintId: 'TKT/250518/000321', customer: 'Anil Tiwari', product: 'Refrigerator', model: 'GL-T292SBS', reason: 'Cooling not achieved after 2 compressor replacements', techNotes: 'Product appears to have systemic defect in this batch.', tech: 'Rahul Kumar', date: '18 May 2025', status: 'Rejected' },
];

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  'Info Requested': 'bg-blue-100 text-blue-700',
};

const ReplacementApprovals = () => {
  const [data, setData] = useState(replacements);
  const [searchQ, setSearchQ] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const updateStatus = (id, newStatus) => {
    setData(d => d.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setSelectedItem(null);
    toast(`Replacement request ${id} ${newStatus}!`);
  };

  const filtered = data.filter(r => {
    const matchSearch = r.customer.toLowerCase().includes(searchQ.toLowerCase()) || r.id.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpis = [
    { label: 'Total Requests', value: data.length, icon: <RefreshCcw size={18} />, bg: 'bg-blue-600' },
    { label: 'Pending Approval', value: data.filter(d => d.status === 'Pending').length, icon: <Clock size={18} />, bg: 'bg-yellow-600' },
    { label: 'Approved', value: data.filter(d => d.status === 'Approved').length, icon: <CheckCircle2 size={18} />, bg: 'bg-green-600' },
    { label: 'Rejected', value: data.filter(d => d.status === 'Rejected').length, icon: <X size={18} />, bg: 'bg-red-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Replacement Approvals" subtitle="Review and approve product replacement requests raised by technicians" />
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
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input placeholder="Search by ID or customer..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
              </div>
              {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
                >{s}</button>
              ))}
              <button onClick={() => toast('Exported as CSV!')} className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]">
                <Download size={13} /> Export
              </button>
            </div>

            <div className="space-y-3">
              {filtered.map((r, i) => (
                <div key={i} className="border border-[#E2E8F0] rounded-xl p-4 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[#0D47A1] text-xs">{r.id}</span>
                        <span className="text-[#94A3B8] text-[10px]">→</span>
                        <span className="text-[10px] text-[#64748B]">{r.complaintId}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[r.status]}`}>{r.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div><span className="text-[#94A3B8] font-semibold">Customer: </span><span className="text-[#1E293B] font-bold">{r.customer}</span></div>
                        <div><span className="text-[#94A3B8] font-semibold">Product: </span><span className="text-[#1E293B]">{r.product} ({r.model})</span></div>
                        <div><span className="text-[#94A3B8] font-semibold">Technician: </span><span className="text-[#1E293B]">{r.tech}</span></div>
                        <div><span className="text-[#94A3B8] font-semibold">Date: </span><span className="text-[#1E293B]">{r.date}</span></div>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-lg p-2 text-[10px]">
                        <p className="font-semibold text-[#64748B] mb-0.5">Reason: <span className="text-[#1E293B]">{r.reason}</span></p>
                        <p className="font-semibold text-[#64748B]">Tech Notes: <span className="text-[#1E293B]">{r.techNotes}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-4">
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'Approved')} className="bg-green-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-green-700">Approve</button>
                          <button onClick={() => updateStatus(r.id, 'Rejected')} className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-red-700">Reject</button>
                          <button onClick={() => updateStatus(r.id, 'Info Requested')} className="border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-[#F8FAFC]">Ask Info</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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

export default ReplacementApprovals;
