import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Filter, Building, Mail, Phone, MapPin, UserCheck } from 'lucide-react';

const ServicePartners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const [partners] = useState([
    { id: 1, name: 'Care Tech Solutions', manager: 'Sunil Gupta', email: 'sunil.caretech@gmail.com', phone: '+91 95555 44433', city: 'Lucknow', technicians: 12, rating: 4.6, status: 'Active' },
    { id: 2, name: 'Perfect Services', manager: 'Vikas Mishra', email: 'vikas.perfect@gmail.com', phone: '+91 94444 33322', city: 'Kanpur', technicians: 8, rating: 4.5, status: 'Active' },
    { id: 3, name: 'Quick Fix India', manager: 'Anil Sen', email: 'anil.quickfix@gmail.com', phone: '+91 93333 22211', city: 'Gorakhpur', technicians: 15, rating: 4.7, status: 'Active' },
    { id: 4, name: 'Reliable Care', manager: 'Rita Dey', email: 'rita.reliable@gmail.com', phone: '+91 92222 11100', city: 'Varanasi', technicians: 7, rating: 4.2, status: 'Active' },
    { id: 5, name: 'Tech Seva Point', manager: 'Vijay Ray', email: 'vijay.techsevapoint@gmail.com', phone: '+91 91111 00099', city: 'Patna', technicians: 10, rating: 4.8, status: 'Active' },
    { id: 6, name: 'Apex Electrics', manager: 'Ganesh Pal', email: 'ganesh.apex@gmail.com', phone: '+91 90000 99988', city: 'Delhi', technicians: 11, rating: 3.9, status: 'Suspended' },
  ]);

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.manager.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Statuses' || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Service Partners" subtitle="Manage network service partners and centers" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Partners</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{partners.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Centers</p>
              <p className="text-2xl font-black text-green-600 mt-2">5</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Technicians Employed</p>
              <p className="text-2xl font-black text-slate-800 mt-2">63</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Partner, Manager..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Partner Center</th>
                  <th className="p-4">Manager Info</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Tech Count</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Building size={14} className="text-slate-400" /> {p.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: PART-{p.id + 100}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{p.manager}</p>
                      <p className="text-[11px] text-slate-400 font-semibold">{p.email} • {p.phone}</p>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-700 font-bold text-xs"><MapPin size={12} className="text-[#0D47A1]" /> {p.city}</span>
                    </td>
                    <td className="p-4 text-slate-800 font-bold">{p.technicians} Techs</td>
                    <td className="p-4 font-bold text-xs text-amber-500">★ {p.rating}</td>
                    <td className="p-4 pr-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {p.status}
                      </span>
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

export default ServicePartners;
