import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Map, 
  Plus, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  X, 
  CheckCircle2, 
  Trash2, 
  Edit2,
  Building2,
  ShieldCheck,
  Globe2,
  Sparkles,
  AlertCircle,
  Loader2,
  Layers
} from 'lucide-react';
import SearchableSelect from '../../components/common/SearchableSelect';
import { INDIAN_STATES, getCitiesForState, normalizeStateName } from '../../utils/indiaGeoData';

const Cities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Forms state
  const [newCity, setNewCity] = useState({ 
    name: '', 
    state: '', 
    district: '', 
    area: '', 
    techs: '0', 
    status: 'Active' 
  });
  const [editingCity, setEditingCity] = useState(null);
  const [deletingCityId, setDeletingCityId] = useState(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [menuCity, setMenuCity] = useState(null);

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [savingCity, setSavingCity] = useState(false);

  const formatCity = (item) => ({
    id: item._id || item.id,
    cityId: item.cityId || '—',
    name: item.name,
    state: normalizeStateName(item.state) || item.state || '—',
    district: item.district || item.name,
    area: item.coverageAreaSqkm ? `${item.coverageAreaSqkm} sq km` : (item.area || '—'),
    techs: item.techniciansCount || item.techs || 0,
    status: item.status || 'Active'
  });

  const fetchCities = async () => {
    setLoadingCities(true);
    try {
      let data;
      try {
        data = await apiRequest('/super-admin/cities', { auth: true });
      } catch (authErr) {
        console.warn('Super Admin cities endpoint error, using public endpoint fallback:', authErr.message);
        data = await apiRequest('/super-admin/cities/public');
      }
      const rawList = Array.isArray(data) ? data : [];
      setCities(rawList.map(formatCity));
    } catch (err) {
      console.warn('Failed to load cities:', err.message);
    } finally {
      setLoadingCities(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3500);
  };

  // State change handler for Add modal
  const handleAddStateChange = (selectedState) => {
    const canonicalState = normalizeStateName(selectedState);
    const validCities = getCitiesForState(canonicalState);
    const keepsCurrentCity = validCities.includes(newCity.name);
    
    setNewCity(prev => ({
      ...prev,
      state: canonicalState,
      name: keepsCurrentCity ? prev.name : '',
      district: keepsCurrentCity ? prev.district : ''
    }));
  };

  // City change handler for Add modal
  const handleAddCityChange = (selectedCity) => {
    setNewCity(prev => ({
      ...prev,
      name: selectedCity,
      // Auto-populate district if empty or was matching previous city name
      district: (!prev.district || prev.district === prev.name) ? selectedCity : prev.district,
      // Suggest default coverage area if empty
      area: prev.area || '250'
    }));
  };

  // State change handler for Edit modal
  const handleEditStateChange = (selectedState) => {
    const canonicalState = normalizeStateName(selectedState);
    const validCities = getCitiesForState(canonicalState);
    const keepsCurrentCity = validCities.includes(editingCity.name);
    
    setEditingCity(prev => ({
      ...prev,
      state: canonicalState,
      name: keepsCurrentCity ? prev.name : '',
      district: keepsCurrentCity ? prev.district : ''
    }));
  };

  // City change handler for Edit modal
  const handleEditCityChange = (selectedCity) => {
    setEditingCity(prev => ({
      ...prev,
      name: selectedCity,
      district: (!prev.district || prev.district === prev.name) ? selectedCity : prev.district
    }));
  };

  const handleAddCitySubmit = async (e) => {
    e.preventDefault();
    const cityName = (newCity.name || '').trim();
    const stateName = normalizeStateName(newCity.state);
    const districtName = (newCity.district || cityName).trim();

    if (!cityName || !stateName) {
      showToast('Please select both a State and an Operational City.');
      return;
    }

    // Duplicate check: checks both canonical name and state
    const isDuplicate = cities.some(
      c => (c.name || '').toLowerCase().trim() === cityName.toLowerCase() &&
           normalizeStateName(c.state).toLowerCase() === stateName.toLowerCase()
    );

    if (isDuplicate) {
      showToast(`City "${cityName}" (${stateName}) is already configured in operational cities!`);
      return;
    }

    setSavingCity(true);
    try {
      const payload = {
        name: cityName,
        state: stateName,
        district: districtName,
        coverageAreaSqkm: newCity.area ? Number(String(newCity.area).replace(/[^0-9.]/g, '')) || undefined : undefined,
        status: newCity.status,
      };
      await apiRequest('/super-admin/cities', { method: 'POST', auth: true, body: payload });
      setNewCity({ name: '', state: '', district: '', area: '', techs: '0', status: 'Active' });
      setShowAddModal(false);
      showToast(`Operational city "${payload.name}, ${payload.state}" added successfully!`);
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to add city.');
    } finally {
      setSavingCity(false);
    }
  };

  const handleEditCitySubmit = async (e) => {
    e.preventDefault();
    const cityName = (editingCity.name || '').trim();
    const stateName = normalizeStateName(editingCity.state);
    const districtName = (editingCity.district || cityName).trim();

    if (!cityName || !stateName) {
      showToast('Please select both a State and an Operational City.');
      return;
    }

    // Duplicate check for edit
    const isDuplicate = cities.some(
      c => c.id !== editingCity.id && 
           (c.name || '').toLowerCase().trim() === cityName.toLowerCase() &&
           normalizeStateName(c.state).toLowerCase() === stateName.toLowerCase()
    );

    if (isDuplicate) {
      showToast(`City "${cityName}" (${stateName}) already exists in operational cities!`);
      return;
    }

    setSavingCity(true);
    try {
      const payload = {
        name: cityName,
        state: stateName,
        district: districtName,
        coverageAreaSqkm: editingCity.area ? Number(String(editingCity.area).replace(/[^0-9.]/g, '')) || undefined : undefined,
        status: editingCity.status,
      };
      await apiRequest(`/super-admin/cities/${editingCity.id}`, { method: 'PUT', auth: true, body: payload });
      setShowEditModal(false);
      setEditingCity(null);
      showToast(`City "${payload.name}" updated successfully!`);
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to update city.');
    } finally {
      setSavingCity(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const city = cities.find(c => c.id === deletingCityId);
    try {
      await apiRequest(`/super-admin/cities/${deletingCityId}`, { method: 'DELETE', auth: true });
      setShowDeleteConfirm(false);
      setDeletingCityId(null);
      showToast(`City "${city ? city.name : ''}" deleted successfully!`);
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to delete city.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiRequest(`/super-admin/cities/${id}`, { method: 'PUT', auth: true, body: { status: newStatus } });
      showToast(`City status updated to ${newStatus}`);
      setActiveActionsMenu(null);
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to update status.');
    }
  };

  const filteredCities = cities.filter(c => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = (c.name || '').toLowerCase().includes(query) ||
                          (c.cityId || '').toLowerCase().includes(query) ||
                          (c.id || '').toLowerCase().includes(query) ||
                          (c.state || '').toLowerCase().includes(query) ||
                          (c.district || '').toLowerCase().includes(query);
    const matchesStatus = selectedStatus === 'All Statuses' || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Cities & Service Areas" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 text-left">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">Operational Cities & Territories</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage live service zones with standardized state and city registry.</p>
            </div>
            <button 
              onClick={() => {
                setNewCity({ name: '', state: '', district: '', area: '', techs: '0', status: 'Active' });
                setShowAddModal(true);
              }}
              className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all flex items-center gap-2 shadow-sm shadow-blue-900/10 active:scale-[0.98]"
            >
              <Plus size={16} /> Add Operational City
            </button>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-72">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-xs bg-[#F8FAFC] text-slate-800 font-medium"
                  placeholder="Search City, District, or State..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-semibold text-[#1E293B] border border-[#E2E8F0] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>

              {/* Total Count Badge */}
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                Total Hubs: <strong className="text-slate-800">{filteredCities.length}</strong>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">City ID</th>
                    <th className="px-6 py-4">Operational City</th>
                    <th className="px-6 py-4">State / Territory</th>
                    <th className="px-6 py-4">District</th>
                    <th className="px-6 py-4">Coverage Area</th>
                    <th className="px-6 py-4">Active Techs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loadingCities ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin text-[#0D47A1]" />
                          <span>Loading operational cities...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCities.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                        <MapPin size={24} className="mx-auto text-slate-300 mb-2" />
                        No operational cities found. Click <strong>+ Add Operational City</strong> to configure a service hub.
                      </td>
                    </tr>
                  ) : filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-[#F8FAFC]/80 transition-colors relative">
                      <td className="px-6 py-4 font-mono font-bold text-[#0D47A1] text-xs tracking-wide">{city.cityId}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0D47A1] flex items-center justify-center shrink-0">
                            <MapPin size={14} />
                          </div>
                          <span className="capitalize">{city.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {city.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{city.district}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{city.area}</td>
                      <td className="px-6 py-4 font-semibold text-[#1E293B]">{city.techs}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          city.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${city.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {city.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div className="flex gap-2 items-center">
                          {city.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Inactive')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                              title="Deactivate Service Hub"
                            >
                              <XCircle size={17} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Active')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                              title="Activate Service Hub"
                            >
                              <CheckCircle size={17} />
                            </button>
                          )}
                          
                          <button 
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                              setMenuCity(city);
                              setActiveActionsMenu(activeActionsMenu === city.id ? null : city.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={17} />
                          </button>
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

      {/* Fixed-position action dropdown */}
      {activeActionsMenu && menuCity && (
        <>
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => { setActiveActionsMenu(null); setMenuCity(null); }}
          />
          <div
            className="fixed z-[999] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl py-1.5 min-w-[160px] text-sm text-left"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <button
              onClick={() => {
                setEditingCity({
                  ...menuCity,
                  state: normalizeStateName(menuCity.state)
                });
                setShowEditModal(true);
                setActiveActionsMenu(null);
                setMenuCity(null);
              }}
              className="w-full px-4 py-2.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors text-xs font-semibold"
            >
              <Edit2 size={14} className="text-[#0D47A1]" /> Edit Territory Details
            </button>
            <button
              onClick={() => {
                setDeletingCityId(menuCity.id);
                setShowDeleteConfirm(true);
                setActiveActionsMenu(null);
                setMenuCity(null);
              }}
              className="w-full px-4 py-2.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 transition-colors text-xs font-semibold"
            >
              <Trash2 size={14} /> Remove City
            </button>
          </div>
        </>
      )}

      {/* ==================== ADD OPERATIONAL CITY MODAL ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full p-6 md:p-7 space-y-5 my-8 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Ambient decorative glow */}
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white flex items-center justify-center shadow-md shadow-blue-900/20">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1E293B] text-lg leading-tight">Add Operational City</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select state & city from the centralized customer registry.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddCitySubmit} className="space-y-4 relative z-10">
              
              {/* Centralized State & City Selection */}
              <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0D47A1] uppercase tracking-wider">
                  <ShieldCheck size={14} />
                  <span>Centralized Geographic Selection</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* State Selection */}
                  <div>
                    <SearchableSelect
                      value={newCity.state}
                      onChange={handleAddStateChange}
                      options={INDIAN_STATES}
                      placeholder="Select State..."
                      label="State / Union Territory"
                      required={true}
                      size="md"
                    />
                  </div>

                  {/* City Selection */}
                  <div>
                    <SearchableSelect
                      value={newCity.name}
                      onChange={handleAddCityChange}
                      options={getCitiesForState(newCity.state)}
                      placeholder={newCity.state ? "Select City..." : "Select State First"}
                      label="Operational City"
                      required={true}
                      disabled={!newCity.state}
                      size="md"
                      allowCustom={true}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500 shrink-0" />
                  <span>Uses the identical state & city dropdown as customer sign-up to guarantee 100% data consistency.</span>
                </p>
              </div>

              {/* District & Coverage Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    District / Region <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. Central Lucknow"
                    value={newCity.district}
                    onChange={(e) => setNewCity({ ...newCity, district: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    Coverage Area (sq km) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 350"
                    value={newCity.area}
                    onChange={(e) => setNewCity({ ...newCity, area: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Active Techs & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Active Technicians (Fleet)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    placeholder="0"
                    value={newCity.techs}
                    onChange={(e) => setNewCity({ ...newCity, techs: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Operational Status</label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-semibold text-slate-800 bg-[#F8FAFC]"
                    value={newCity.status}
                    onChange={(e) => setNewCity({ ...newCity, status: e.target.value })}
                  >
                    <option value="Active">🟢 Active (Open for Bookings)</option>
                    <option value="Inactive">🔴 Inactive (Coming Soon / Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Live Territory Preview Card */}
              {newCity.name && newCity.state && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0D47A1] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {newCity.name}, <span className="text-slate-600 font-medium">{newCity.state}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        District: {newCity.district || newCity.name} • {newCity.area || '250'} sq km
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    newCity.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {newCity.status}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-3 justify-end text-xs">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white text-slate-600 border border-[#E2E8F0] px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingCity || !newCity.name || !newCity.state}
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition-all shadow-sm shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingCity ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Saving City...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Save Operational City
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT OPERATIONAL CITY MODAL ==================== */}
      {showEditModal && editingCity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full p-6 md:p-7 space-y-5 my-8 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center border border-blue-100">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1E293B] text-lg leading-tight">Edit Territory: {editingCity.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">ID: {editingCity.cityId} • Update operational service configuration.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCity(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditCitySubmit} className="space-y-4">
              
              {/* Centralized State & City Selection */}
              <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0D47A1] uppercase tracking-wider">
                  <ShieldCheck size={14} />
                  <span>Centralized Geographic Selection</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* State Selection */}
                  <div>
                    <SearchableSelect
                      value={editingCity.state}
                      onChange={handleEditStateChange}
                      options={INDIAN_STATES}
                      placeholder="Select State..."
                      label="State / Union Territory"
                      required={true}
                      size="md"
                    />
                  </div>

                  {/* City Selection */}
                  <div>
                    <SearchableSelect
                      value={editingCity.name}
                      onChange={handleEditCityChange}
                      options={getCitiesForState(editingCity.state)}
                      placeholder="Select City..."
                      label="Operational City"
                      required={true}
                      disabled={!editingCity.state}
                      size="md"
                      allowCustom={true}
                    />
                  </div>
                </div>
              </div>

              {/* District & Coverage Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">District / Region *</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.district}
                    onChange={(e) => setEditingCity({ ...editingCity, district: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Coverage Area *</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.area}
                    onChange={(e) => setEditingCity({ ...editingCity, area: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Active Techs & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Active Technicians</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-medium text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.techs}
                    onChange={(e) => setEditingCity({ ...editingCity, techs: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Operational Status</label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-xs font-semibold text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.status}
                    onChange={(e) => setEditingCity({ ...editingCity, status: e.target.value })}
                  >
                    <option value="Active">🟢 Active (Open for Bookings)</option>
                    <option value="Inactive">🔴 Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-3 justify-end text-xs">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCity(null);
                  }}
                  className="bg-white text-slate-600 border border-[#E2E8F0] px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingCity || !editingCity.name || !editingCity.state}
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition-all shadow-sm shadow-blue-900/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCity ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRM MODAL ==================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-100">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-inner">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#1E293B] text-lg">Remove Operational Hub?</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                This will delete this city from operational hubs. Customers in this area will no longer be eligible for bookings.
              </p>
            </div>

            <div className="flex gap-3 justify-center text-xs pt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingCityId(null);
                }}
                className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-xl font-semibold hover:bg-[#F8FAFC] transition-colors flex-1"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-rose-700 transition-colors shadow-sm flex-1"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top-4 duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Cities;
