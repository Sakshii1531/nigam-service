import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  UserCheck, 
  Eye, 
  Star, 
  X, 
  User, 
  Wrench, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  UserPlus,
  CheckCircle2,
  UserMinus
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const ServicePartners = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const [partners, setPartners] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Technicians Modal State
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerTechs, setPartnerTechs] = useState([]);
  const [allAvailableTechs, setAllAvailableTechs] = useState([]);
  const [selectedAssignTechId, setSelectedAssignTechId] = useState('');
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [assigningTech, setAssigningTech] = useState(false);
  const [techError, setTechError] = useState('');

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const fetchPartners = async () => {
    try {
      const res = await apiRequest('/super-admin/service-partners?limit=200', { auth: true });
      setPartners((res || []).map((item) => ({
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
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (selectedPartner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPartner]);

  const openTechModal = async (partner) => {
    setSelectedPartner(partner);
    setLoadingTechs(true);
    setTechError('');
    setPartnerTechs([]);
    setSelectedAssignTechId('');

    try {
      const [partnerRes, allTechsRes] = await Promise.all([
        apiRequest(`/super-admin/technicians?servicePartner=${partner.id}&limit=100`, { auth: true }),
        apiRequest('/super-admin/technicians?limit=200', { auth: true }),
      ]);

      const items = partnerRes?.items || (Array.isArray(partnerRes) ? partnerRes : []);
      setPartnerTechs(items);

      const allItems = allTechsRes?.items || (Array.isArray(allTechsRes) ? allTechsRes : []);
      // Filter candidates not already in this center
      const candidates = allItems.filter(t => (t.servicePartner?._id || t.servicePartner?.id || t.servicePartner) !== partner.id);
      setAllAvailableTechs(candidates);
      if (candidates.length > 0) setSelectedAssignTechId(candidates[0].id || candidates[0]._id);
    } catch (err) {
      setTechError(err.message || 'Could not load technicians for this partner center.');
    } finally {
      setLoadingTechs(false);
    }
  };

  const closeTechModal = () => {
    setSelectedPartner(null);
    setPartnerTechs([]);
    setAllAvailableTechs([]);
    setTechError('');
  };

  const handleAssignTechnician = async () => {
    if (!selectedAssignTechId || !selectedPartner) return;
    setAssigningTech(true);
    try {
      await apiRequest(`/super-admin/technicians/${selectedAssignTechId}/partner`, {
        method: 'PATCH',
        auth: true,
        body: { servicePartner: selectedPartner.id },
      });
      showToast('Technician assigned to center successfully!');
      await openTechModal(selectedPartner);
      await fetchPartners();
    } catch (err) {
      setTechError(err.message || 'Could not assign technician.');
    } finally {
      setAssigningTech(false);
    }
  };

  const handleUnassignTechnician = async (techId, techName) => {
    if (!window.confirm(`Unassign ${techName} from this partner center?`)) return;
    try {
      await apiRequest(`/super-admin/technicians/${techId}/partner`, {
        method: 'PATCH',
        auth: true,
        body: { servicePartner: null },
      });
      showToast(`${techName} unassigned from center.`);
      await openTechModal(selectedPartner);
      await fetchPartners();
    } catch (err) {
      setTechError(err.message || 'Could not unassign technician.');
    }
  };

  const activeCentersCount = partners.filter(p => p.status === 'Active').length;
  const totalTechniciansCount = partners.reduce((sum, p) => sum + (p.technicians || 0), 0);

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.manager.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Statuses' || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 relative">
      <Sidebar />
      
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Service Partners" subtitle="Manage network service partners and centers" />
        
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Partners</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{partners.length}</p>
              </div>
              <div className="w-11 h-11 bg-blue-50 text-[#0D47A1] rounded-xl flex items-center justify-center font-bold">
                <Building size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Centers</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{activeCentersCount}</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Technicians Employed</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalTechniciansCount}</p>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                <UserCheck size={20} />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap gap-4 items-center justify-between shadow-xs">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Partner, Manager..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-semibold bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC] text-slate-700 cursor-pointer"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-400 text-[11px] font-black tracking-wider uppercase">
                    <th className="py-3.5 px-6">Partner Center</th>
                    <th className="py-3.5 px-4">Manager Info</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4">Tech Count</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredPartners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                          <Building size={15} className="text-slate-400" /> {p.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">ID: PART-{p.id.slice(-6).toUpperCase()}</span>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-800">{p.manager}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{p.email} • {p.phone}</p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-xs">
                          <MapPin size={13} className="text-[#0D47A1]" /> {p.city}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => openTechModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0D47A1] font-bold text-xs transition-colors cursor-pointer"
                        >
                          <UserCheck size={14} /> {p.technicians} Techs
                        </button>
                      </td>

                      <td className="py-4 px-4 font-bold text-xs text-amber-500">
                        {p.rating == null ? '—' : `★ ${p.rating}`}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openTechModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D47A1] text-white hover:bg-blue-700 transition-colors text-[10.5px] font-bold cursor-pointer"
                          title="View Employed Technicians"
                        >
                          <Eye size={12} /> View Techs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loadError && (
              <div className="text-center py-12 text-rose-600 font-semibold text-xs">{loadError}</div>
            )}
          </div>

        </div>
      </div>

      {/* Technician Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4 text-left">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#0D47A1] uppercase tracking-wider">Partner Center</span>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Building size={18} className="text-[#0D47A1]" /> {selectedPartner.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manager: {selectedPartner.manager} • Location: {selectedPartner.city}
                </p>
              </div>
              <button 
                onClick={closeTechModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Assign Toolbar inside Modal */}
            <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <UserPlus size={16} className="text-[#0D47A1] flex-shrink-0" />
                <span className="text-xs font-bold text-[#0D47A1]">Assign Technician to Center:</span>
                <select
                  value={selectedAssignTechId}
                  onChange={(e) => setSelectedAssignTechId(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none bg-white text-slate-800 flex-1 min-w-[160px] cursor-pointer"
                >
                  {allAvailableTechs.length === 0 && <option value="">No unassigned technicians</option>}
                  {allAvailableTechs.map(t => (
                    <option key={t.id || t._id} value={t.id || t._id}>
                      {t.name} ({t.city?.name || t.city || '—'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAssignTechnician}
                disabled={!selectedAssignTechId || assigningTech}
                className="px-3 py-1.5 bg-[#0D47A1] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningTech ? 'Assigning…' : 'Assign to Center'}
              </button>
            </div>

            {/* Modal Body - Technicians List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {loadingTechs ? (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
                  Fetching employed technicians...
                </div>
              ) : techError ? (
                <div className="text-center py-8 text-rose-600 font-semibold text-xs">{techError}</div>
              ) : partnerTechs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <UserCheck size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Technicians Employed</p>
                  <p className="text-xs text-slate-400 mt-1">There are currently no technicians registered under this service partner.</p>
                  <p className="text-xs text-[#0D47A1] font-semibold mt-2">Use the dropdown above to assign an available technician to this center.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <UserCheck size={14} className="text-[#0D47A1]" /> Employed Technicians ({partnerTechs.length})
                  </p>

                  {partnerTechs.map((tech) => (
                    <div 
                      key={tech._id || tech.id} 
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0D47A1] text-white flex items-center justify-center font-bold text-sm">
                          {tech.name ? tech.name.slice(0, 2).toUpperCase() : 'TC'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {tech.name}
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              tech.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {tech.status || 'Active'}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1"><Phone size={12} /> {tech.phone || '—'}</span>
                            <span className="flex items-center gap-1"><Mail size={12} /> {tech.email || '—'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold">
                        {tech.specs && tech.specs.length > 0 && (
                          <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1">
                            <Wrench size={12} className="text-[#0D47A1]" /> {tech.specs.join(', ')}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                          <Star size={14} className="fill-amber-500 text-amber-500" /> {tech.rating || 0}
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          tech.availability === 'Available' ? 'bg-emerald-50 text-emerald-600' :
                          tech.availability === 'Busy' ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tech.availability || 'Offline'}
                        </span>
                        <button
                          onClick={() => handleUnassignTechnician(tech._id || tech.id, tech.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-1"
                          title="Unassign technician from center"
                        >
                          <UserMinus size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button 
                onClick={closeTechModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ServicePartners;
