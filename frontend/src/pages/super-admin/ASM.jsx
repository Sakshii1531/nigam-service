import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Users, UserPlus, Search, Mail, Phone, Star, MapPin } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

function shape(asm) {
  return {
    id: asm.id,
    name: asm.name,
    email: asm.email || '—',
    phone: asm.phone || '—',
    city: asm.city?.name || '—',
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsmName, setNewAsmName] = useState('');
  const [newAsmEmail, setNewAsmEmail] = useState('');
  const [newAsmPhone, setNewAsmPhone] = useState('');
  // Holds a City id, not a name — the API keys ASMs to a City document.
  const [newAsmCity, setNewAsmCity] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [asmData, cityData] = await Promise.all([
          apiRequest('/super-admin/asms', { auth: true }),
          apiRequest('/super-admin/cities', { auth: true }),
        ]);
        if (cancelled) return;
        setAsms((Array.isArray(asmData) ? asmData : []).map(shape));
        const cityList = Array.isArray(cityData) ? cityData : [];
        setCities(cityList);
        if (cityList.length) setNewAsmCity(cityList[0].id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
      // The create response returns the raw city id; resolve it locally so the
      // new row reads the same as the ones the list endpoint populated.
      const city = cities.find(c => c.id === newAsmCity);
      setAsms(prev => [...prev, shape({ ...created, city })]);

      setNewAsmName('');
      setNewAsmEmail('');
      setNewAsmPhone('');
      setNewAsmCity(cities[0]?.id || '');
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      setError(`Could not create ASM: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredAsms = asms.filter(asm => {
    const matchesSearch = asm.name.toLowerCase().includes(q) || asm.email.toLowerCase().includes(q);
    const matchesCity = selectedCity === 'All Cities' || asm.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const activeCities = new Set(asms.map(a => a.city).filter(c => c !== '—')).size;
  const totalPartners = asms.reduce((acc, a) => acc + a.partners, 0);
  const avgRating = asms.length
    ? (asms.reduce((acc, a) => acc + a.rating, 0) / asms.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="ASM Management" subtitle="Manage Area Service Managers (ASMs) across regions" />
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total ASMs</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{asms.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Cities</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{activeCities}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Partners Monitored</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{totalPartners}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg ASM Performance</p>
              <p className="text-2xl font-black text-green-600 mt-2 flex items-center gap-1">
                {avgRating} <Star size={18} className="fill-green-600 text-green-600" />
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search ASM Name, Email..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Cities</option>
                {cities.map(city => (
                  <option key={city.id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <UserPlus size={16} /> Add New ASM
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">ASM Details</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Partners</th>
                  <th className="p-4">Active Jobs</th>
                  <th className="p-4 pr-6">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAsms.map((asm) => (
                  <tr key={asm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800">{asm.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {asm.id}</span>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <p className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold"><Mail size={12} /> {asm.email}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold"><Phone size={12} /> {asm.phone}</p>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-700 font-bold text-xs"><MapPin size={12} className="text-[#0D47A1]" /> {asm.city}</span>
                    </td>
                    <td className="p-4 text-slate-800 font-black">{asm.partners}</td>
                    <td className="p-4 text-slate-800 font-black">{asm.activeJobs}</td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                        <Star size={14} className="fill-amber-500 text-amber-500" /> {asm.rating}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="text-center py-12 text-[#64748B]">Loading ASMs…</div>
            )}
            {!loading && error && (
              <div className="text-center py-12 text-red-600 font-semibold">{error}</div>
            )}
            {!loading && !error && filteredAsms.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">No ASMs found matching filters.</div>
            )}
          </div>

        </div>
      </div>

      {/* Form Modal for Add ASM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Add New Area Service Manager</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-extrabold text-lg select-none cursor-pointer p-1"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddAsm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Kumar" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                  value={newAsmName}
                  onChange={(e) => setNewAsmName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. name@ncc.com" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                  value={newAsmEmail}
                  onChange={(e) => setNewAsmEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 98765 43210" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                  value={newAsmPhone}
                  onChange={(e) => setNewAsmPhone(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign City / Region</label>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm bg-white"
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
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save ASM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ASM;
