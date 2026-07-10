import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, AlertTriangle, ShieldCheck, Clock, User } from 'lucide-react';

const EscalationDesk = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [escalations, setEscalations] = useState([
    { id: 1, ticket: '#ESC-5554', description: 'AC not cooling - Delay in service', city: 'Lucknow', priority: 'High', manager: 'Rajesh Kumar', status: 'Unassigned', date: '25 mins ago' },
    { id: 2, ticket: '#ESC-5553', description: 'Technician behavior complaint', city: 'Kanpur', priority: 'High', manager: 'Amit Singh', status: 'In Progress', date: '35 mins ago' },
    { id: 3, ticket: '#ESC-5552', description: 'Warranty claim rejected by brand', city: 'Delhi', priority: 'Critical', manager: 'System', status: 'Resolved', date: '1 hr ago' },
    { id: 4, ticket: '#ESC-5551', description: 'Spare part not available', city: 'Gorakhpur', priority: 'High', manager: 'Suresh Yadav', status: 'Unassigned', date: '1 hr ago' },
  ]);

  const handleAssign = (id, managerName) => {
    setEscalations(prev => prev.map(esc => esc.id === id ? { ...esc, manager: managerName, status: 'In Progress' } : esc));
  };

  const filteredEscalations = escalations.filter(esc => 
    esc.ticket.toLowerCase().includes(searchQuery.toLowerCase()) || 
    esc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Escalation Desk" subtitle="Monitor and resolve critical escalated complaints" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Escalations</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{escalations.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unassigned</p>
              <p className="text-2xl font-black text-red-600 mt-2">2</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-black text-yellow-600 mt-2">1</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved Today</p>
              <p className="text-2xl font-black text-green-600 mt-2">1</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Ticket, Issue..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Ticket Code</th>
                  <th className="p-4">Escalation Issue</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assigned Mgr</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEscalations.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> {esc.ticket}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{esc.description}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{esc.date}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{esc.city}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esc.priority === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {esc.priority}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600 flex items-center gap-1.5"><User size={12} /> {esc.manager}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esc.status === 'Unassigned' ? 'bg-red-50 text-red-600 border border-red-100' :
                        esc.status === 'In Progress' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {esc.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {esc.status === 'Unassigned' ? (
                        <button onClick={() => handleAssign(esc.id, 'Super Admin')} className="text-xs bg-[#0D47A1] text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">Assign to Self</button>
                      ) : esc.status === 'In Progress' ? (
                        <button onClick={() => handleAssign(esc.id, esc.manager)} className="text-xs bg-green-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors cursor-pointer">Resolve</button>
                      ) : (
                        <span className="text-green-600 font-bold text-xs flex items-center justify-end gap-1"><ShieldCheck size={14} /> Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EscalationDesk;
