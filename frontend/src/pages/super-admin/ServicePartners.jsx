import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Filter, Building, Mail, Phone, MapPin, UserCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const ServicePartners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const [partners, setPartners] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function fetchPartners() {
      try {
        // Same envelope bug as Brands.jsx: the real list was always discarded
        // in favour of six invented partners.
        const res = await apiRequest('/super-admin/service-partners?limit=200', { auth: true });
        setPartners((res.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          manager: item.manager || '—',
          email: item.email || '—',
          phone: item.phone || '—',
          city: item.city?.name || '—',
          technicians: item.technicianCount ?? 0,
          rating: item.rating ?? null,
          status: item.status || 'Active',
        })));
      } catch (err) {
        setLoadError(err.message || 'Could not load service partners.');
      }
    }
    fetchPartners();
  }, []);

  const activeCentersCount = partners.filter(p => p.status === 'Active').length;
  const totalTechniciansCount = partners.reduce((sum, p) => sum + (p.technicians || 0), 0);

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
              <p className="text-2xl font-black text-green-600 mt-2">{activeCentersCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Technicians Employed</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{totalTechniciansCount}</p>
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
                    <td className="p-4 font-bold text-xs text-amber-500">{p.rating == null ? '—' : `★ ${p.rating}`}</td>
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
