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
  Edit2
} from 'lucide-react';

const Cities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Forms state
  const [newCity, setNewCity] = useState({ name: '', state: '', district: '', area: '', techs: '0', status: 'Active' });
  const [editingCity, setEditingCity] = useState(null);
  const [deletingCityId, setDeletingCityId] = useState(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [menuCity, setMenuCity] = useState(null);

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  const formatCity = (item) => ({
    id: item._id || item.id,
    cityId: item.cityId || '—',
    name: item.name,
    state: item.state || '—',
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
      // apiRequest already unwraps the { data, error, meta } envelope, so this
      // IS the array. Reading `.data` off it again yielded undefined and left
      // the table permanently empty — which made every successful "Add City"
      // look like it had silently failed, when the POST had in fact saved.
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
    }, 3000);
  };

  const handleAddCitySubmit = async (e) => {
    e.preventDefault();
    const cityName = (newCity.name || '').trim();
    if (!cityName || !newCity.state || !newCity.district) {
      showToast('Please fill in all required fields.');
      return;
    }

    // Client-side duplicate check
    const isDuplicate = cities.some(
      c => (c.name || '').toLowerCase().trim() === cityName.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`City "${cityName}" already exists in operational cities!`);
      return;
    }

    try {
      const payload = {
        name: cityName,
        state: newCity.state.trim(),
        district: newCity.district.trim(),
        coverageAreaSqkm: newCity.area ? Number(String(newCity.area).replace(/[^0-9.]/g, '')) || undefined : undefined,
        status: newCity.status,
      };
      await apiRequest('/super-admin/cities', { method: 'POST', auth: true, body: payload });
      setNewCity({ name: '', state: '', district: '', area: '', techs: '0', status: 'Active' });
      setShowAddModal(false);
      showToast(`City "${payload.name}" added successfully!`);
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to add city.');
    }
  };

  const handleEditCitySubmit = async (e) => {
    e.preventDefault();
    const cityName = (editingCity.name || '').trim();
    if (!cityName || !editingCity.state || !editingCity.district) {
      showToast('Please fill in all required fields.');
      return;
    }

    // Client-side duplicate check for edit
    const isDuplicate = cities.some(
      c => c.id !== editingCity.id && (c.name || '').toLowerCase().trim() === cityName.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`City "${cityName}" already exists in operational cities!`);
      return;
    }

    try {
      const payload = {
        name: cityName,
        state: editingCity.state.trim(),
        district: editingCity.district.trim(),
        coverageAreaSqkm: editingCity.area ? Number(String(editingCity.area).replace(/[^0-9.]/g, '')) || undefined : undefined,
        status: editingCity.status,
      };
      await apiRequest(`/super-admin/cities/${editingCity.id}`, { method: 'PUT', auth: true, body: payload });
      setShowEditModal(false);
      setEditingCity(null);
      showToast('City updated successfully!');
      await fetchCities();
    } catch (err) {
      showToast(err?.message || 'Failed to update city.');
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
            <h2 className="text-lg font-bold text-[#1E293B]">Operational Cities</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add City
            </button>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search City, District or State..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">City ID</th>
                    <th className="px-6 py-4">City Name</th>
                    <th className="px-6 py-4">District</th>
                    <th className="px-6 py-4">State</th>
                    <th className="px-6 py-4">Coverage Area</th>
                    <th className="px-6 py-4">Active Techs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loadingCities ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                        Loading cities from database...
                      </td>
                    </tr>
                  ) : filteredCities.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                        No operational cities found. Click <strong>+ Add City</strong> to get started.
                      </td>
                    </tr>
                  ) : filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-[#F8FAFC] transition-colors relative">
                      <td className="px-6 py-4 font-mono font-bold text-[#0D47A1] text-xs tracking-wide">{city.cityId}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#64748B]" /> {city.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-semibold">{city.district}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-semibold">{city.state}</td>
                      <td className="px-6 py-4 text-[#64748B]">{city.area}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{city.techs}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          city.status === 'Active' ? 'bg-green-50 text-green-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {city.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div className="flex gap-2 items-center">
                          {city.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Inactive')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                              title="Deactivate"
                            >
                              <XCircle size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          
                          <button 
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                              setMenuCity(city);
                              setActiveActionsMenu(activeActionsMenu === city.id ? null : city.id);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100 rounded transition-colors"
                          >
                            <MoreVertical size={16} />
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

      {/* Fixed-position action dropdown — rendered outside table overflow context */}
      {activeActionsMenu && menuCity && (
        <>
          {/* Backdrop to close on outside click */}
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
                setEditingCity(menuCity);
                setShowEditModal(true);
                setActiveActionsMenu(null);
                setMenuCity(null);
              }}
              className="w-full px-4 py-2.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 transition-colors"
            >
              <Edit2 size={14} /> Edit City
            </button>
            <button
              onClick={() => {
                setDeletingCityId(menuCity.id);
                setShowDeleteConfirm(true);
                setActiveActionsMenu(null);
                setMenuCity(null);
              }}
              className="w-full px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
            >
              <Trash2 size={14} /> Delete City
            </button>
          </div>
        </>
      )}

      {/* Add City Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Add New Operational City</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCitySubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">State *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. Uttar Pradesh"
                    value={newCity.state}
                    onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">District *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. Gautam Buddha Nagar"
                    value={newCity.district}
                    onChange={(e) => setNewCity({ ...newCity, district: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">City Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Noida"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Coverage Area (sq km) *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. 625"
                  value={newCity.area}
                  onChange={(e) => setNewCity({ ...newCity, area: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Active Technicians</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. 50"
                  value={newCity.techs}
                  onChange={(e) => setNewCity({ ...newCity, techs: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Status</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={newCity.status}
                  onChange={(e) => setNewCity({ ...newCity, status: e.target.value })}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save City
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit City Modal */}
      {showEditModal && editingCity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Edit City Details</h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCity(null);
                }}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditCitySubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">State *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.state}
                    onChange={(e) => setEditingCity({ ...editingCity, state: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">District *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={editingCity.district}
                    onChange={(e) => setEditingCity({ ...editingCity, district: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">City Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingCity.name}
                  onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Coverage Area *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingCity.area}
                  onChange={(e) => setEditingCity({ ...editingCity, area: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Active Technicians</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingCity.techs}
                  onChange={(e) => setEditingCity({ ...editingCity, techs: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Status</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={editingCity.status}
                  onChange={(e) => setEditingCity({ ...editingCity, status: e.target.value })}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCity(null);
                  }}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#1E293B] text-lg">Delete Operational Area?</h3>
              <p className="text-sm text-[#64748B]">This action cannot be undone and will remove service availability for this city.</p>
            </div>

            <div className="flex gap-3 justify-center text-sm pt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingCityId(null);
                }}
                className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex-1"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm flex-1"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Cities;
