import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Star, 
  MapPin, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  Briefcase, 
  TrendingUp, 
  ShieldCheck,
  X
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

function shape(asm) {
  return {
    id: asm.id,
    rawCityId: asm.city?._id || asm.city?.id || asm.city || '',
    name: asm.name,
    email: asm.email || '—',
    phone: asm.phone || '—',
    city: asm.city?.name || 'Unassigned',
    rating: asm.rating ?? 0,
    partners: asm.partners?.length ?? 0,
    activeJobs: asm.activeJobs ?? 0,
  };
}

const ASM = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [asms, setAsms] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal State for Create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsmName, setNewAsmName] = useState('');
  const [newAsmEmail, setNewAsmEmail] = useState('');
  const [newAsmPhone, setNewAsmPhone] = useState('');
  const [newAsmCity, setNewAsmCity] = useState('');

  // Modal State for Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsmId, setEditingAsmId] = useState(null);
  const [editAsmName, setEditAsmName] = useState('');
  const [editAsmEmail, setEditAsmEmail] = useState('');
  const [editAsmPhone, setEditAsmPhone] = useState('');
  const [editAsmCity, setEditAsmCity] = useState('');

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [asmData, cityData] = await Promise.all([
        apiRequest('/super-admin/asms', { auth: true }),
        apiRequest('/super-admin/cities', { auth: true }),
      ]);
      setAsms((Array.isArray(asmData) ? asmData : []).map(shape));
      const cityList = Array.isArray(cityData) ? cityData : [];
      setCities(cityList);
      if (cityList.length && !newAsmCity) setNewAsmCity(cityList[0].id);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load ASMs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Prevent background page scrolling when modal dialog is active
  useEffect(() => {
    if (isModalOpen || isEditModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, isEditModalOpen]);

  const handleAddAsm = async (e) => {
    e.preventDefault();
    if (!newAsmCity) {
      setError('Create a city first — an ASM must be assigned to one.');
      return;
    }
    setSaving(true);
    try {
      const created = await apiRequest('/super-admin/asms', {
        method: 'POST',
        auth: true,
        body: { name: newAsmName, email: newAsmEmail, phone: newAsmPhone, city: newAsmCity },
      });
      const cityObj = cities.find(c => c.id === newAsmCity);
      setAsms(prev => [...prev, shape({ ...created, city: cityObj })]);

      setNewAsmName('');
      setNewAsmEmail('');
      setNewAsmPhone('');
      setNewAsmCity(cities[0]?.id || '');
      setIsModalOpen(false);
      setError('');
      showToast('New Area Service Manager added successfully!');
    } catch (err) {
      setError(`Could not create ASM: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (asm) => {
    setEditingAsmId(asm.id);
    setEditAsmName(asm.name === '—' ? '' : asm.name);
    setEditAsmEmail(asm.email === '—' ? '' : asm.email);
    setEditAsmPhone(asm.phone === '—' ? '' : asm.phone);
    const matchedCity = cities.find(c => c.name === asm.city || c.id === asm.rawCityId);
    setEditAsmCity(matchedCity?.id || cities[0]?.id || '');
    setIsEditModalOpen(true);
  };

  const handleEditAsm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiRequest(`/super-admin/asms/${editingAsmId}`, {
        method: 'PUT',
        auth: true,
        body: {
          name: editAsmName,
          email: editAsmEmail,
          phone: editAsmPhone,
          city: editAsmCity,
        },
      });
      const cityObj = cities.find(c => c.id === editAsmCity);
      setAsms(prev => prev.map(a => a.id === editingAsmId ? shape({ ...updated, city: cityObj }) : a));
      setIsEditModalOpen(false);
      showToast('ASM details updated successfully!');
    } catch (err) {
      setError(`Could not update ASM: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsm = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await apiRequest(`/super-admin/asms/${id}`, {
        method: 'DELETE',
        auth: true,
      });
      setAsms(prev => prev.filter(a => a.id !== id));
      showToast(`ASM ${name} removed successfully.`);
    } catch (err) {
      setError(`Could not delete ASM: ${err.message}`);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredAsms = asms.filter(asm => {
    const matchesSearch = asm.name.toLowerCase().includes(q) || asm.email.toLowerCase().includes(q);
    const matchesCity = selectedCity === 'All Cities' || asm.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const activeCities = new Set(asms.map(a => a.city).filter(c => c !== 'Unassigned' && c !== '—')).size;
  const totalPartners = asms.reduce((acc, a) => acc + a.partners, 0);
  const avgRating = asms.length
    ? (asms.reduce((acc, a) => acc + a.rating, 0) / asms.length).toFixed(1)
    : '0.0';

  const getInitials = (name) => {
    if (!name || name === '—') return 'AS';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 relative">
      <Sidebar />
      
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="ASM Management" subtitle="Manage Area Service Managers (ASMs) across regions" />
        
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total ASMs</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{asms.length}</h3>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Regional managers</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Cities</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{activeCities}</h3>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Covered territories</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Partners Monitored</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPartners}</h3>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Service partners</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Performance</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1 flex items-center gap-1.5">
                  {avgRating} <Star size={18} className="fill-amber-500 text-amber-500" />
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">Overall rating</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp size={22} />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap gap-4 items-center justify-between shadow-xs">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search ASM name or email..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none text-xs font-semibold bg-[#F8FAFC] text-slate-800 transition-all placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC] text-slate-700 cursor-pointer"
              >
                <option>All Cities</option>
                {cities.map(city => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0D47A1] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
            >
              <UserPlus size={16} /> Add New ASM
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-400 text-[11px] font-black tracking-wider uppercase">
                    <th className="py-3.5 px-6">ASM Details</th>
                    <th className="py-3.5 px-4">Contact Details</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4 text-center">Partners</th>
                    <th className="py-3.5 px-4 text-center">Active Jobs</th>
                    <th className="py-3.5 px-4">Performance</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredAsms.map((asm) => (
                    <tr key={asm.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0D47A1] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                            {getInitials(asm.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-[#0D47A1] transition-colors">{asm.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {asm.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-4 px-4 space-y-1">
                        <p className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Mail size={13} className="text-slate-400" /> {asm.email}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Phone size={13} className="text-slate-400" /> {asm.phone}
                        </p>
                      </td>

                      {/* Region Badge */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          asm.city !== 'Unassigned' && asm.city !== '—'
                            ? 'bg-blue-50 text-[#0D47A1] border border-blue-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <MapPin size={12} className={asm.city !== 'Unassigned' && asm.city !== '—' ? 'text-[#0D47A1]' : 'text-slate-400'} /> 
                          {asm.city}
                        </span>
                      </td>

                      {/* Partners Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs">
                          {asm.partners}
                        </span>
                      </td>

                      {/* Active Jobs Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs">
                          {asm.activeJobs}
                        </span>
                      </td>

                      {/* Rating / Performance */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 font-bold text-xs">
                          <Star size={13} className="fill-amber-500 text-amber-500" /> 
                          <span>{asm.rating}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(asm)}
                            className="p-2 text-slate-500 hover:text-[#0D47A1] hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-100"
                            title="Edit ASM Details"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteAsm(asm.id, asm.name)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
                            title="Delete ASM"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
                Loading Area Service Managers...
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-12 text-red-600 font-semibold text-xs">{error}</div>
            )}

            {!loading && !error && filteredAsms.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-700">No ASMs Found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search filter or add a new ASM.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Form Modal for Add ASM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4 text-left">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Add New Area Manager</h3>
                <p className="text-xs text-slate-500 font-medium">Create a new ASM profile and assign region</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddAsm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Kumar" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={newAsmName}
                  onChange={(e) => setNewAsmName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. name@ncc.com" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={newAsmEmail}
                  onChange={(e) => setNewAsmEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 98765 43210" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={newAsmPhone}
                  onChange={(e) => setNewAsmPhone(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assign City / Region *</label>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800 bg-white"
                  value={newAsmCity}
                  onChange={(e) => setNewAsmCity(e.target.value)}
                >
                  {cities.length === 0 && <option value="">No cities configured</option>}
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save ASM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Modal for Edit ASM */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4 text-left">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Edit Area Manager</h3>
                <p className="text-xs text-slate-500 font-medium">Update ASM profile information and territory</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditAsm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Kumar" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={editAsmName}
                  onChange={(e) => setEditAsmName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. name@ncc.com" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={editAsmEmail}
                  onChange={(e) => setEditAsmEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 98765 43210" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800"
                  value={editAsmPhone}
                  onChange={(e) => setEditAsmPhone(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assign City / Region *</label>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-800 bg-white"
                  value={editAsmCity}
                  onChange={(e) => setEditAsmCity(e.target.value)}
                >
                  {cities.length === 0 && <option value="">No cities configured</option>}
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {saving ? 'Updating…' : 'Update ASM'}
                </button>
              </div>
            </form>
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

export default ASM;
