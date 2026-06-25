import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
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
  const [newCity, setNewCity] = useState({ name: '', area: '', techs: '0', status: 'Active' });
  const [editingCity, setEditingCity] = useState(null);
  const [deletingCityId, setDeletingCityId] = useState(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);

  const [cities, setCities] = useState([
    { id: 'CIT-01', name: 'Delhi NCR', area: '1,483 sq km', techs: 450, status: 'Active' },
    { id: 'CIT-02', name: 'Mumbai', area: '603 sq km', techs: 320, status: 'Active' },
    { id: 'CIT-03', name: 'Bangalore', area: '709 sq km', techs: 280, status: 'Active' },
    { id: 'CIT-04', name: 'Chennai', area: '426 sq km', techs: 150, status: 'Active' },
    { id: 'CIT-05', name: 'Kolkata', area: '205 sq km', techs: 0, status: 'Inactive' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setCities(cities.map(c => c.id === id ? { ...c, status: newStatus } : c));
    showToast(`City status updated to ${newStatus}`);
    setActiveActionsMenu(null);
  };

  const handleAddCitySubmit = (e) => {
    e.preventDefault();
    if (!newCity.name || !newCity.area) {
      showToast('Please fill in all required fields.');
      return;
    }
    const addedCity = {
      id: `CIT-0${cities.length + 1}`,
      name: newCity.name,
      area: newCity.area.toLowerCase().includes('sq km') ? newCity.area : `${newCity.area} sq km`,
      techs: Number(newCity.techs) || 0,
      status: newCity.status
    };
    setCities([...cities, addedCity]);
    setNewCity({ name: '', area: '', techs: '0', status: 'Active' });
    setShowAddModal(false);
    showToast(`City "${addedCity.name}" added successfully!`);
  };

  const handleEditCitySubmit = (e) => {
    e.preventDefault();
    if (!editingCity.name || !editingCity.area) {
      showToast('Please fill in all required fields.');
      return;
    }
    setCities(cities.map(c => c.id === editingCity.id ? {
      ...editingCity,
      area: editingCity.area.toLowerCase().includes('sq km') ? editingCity.area : `${editingCity.area} sq km`,
      techs: Number(editingCity.techs) || 0
    } : c));
    setShowEditModal(false);
    setEditingCity(null);
    showToast(`City details updated successfully!`);
  };

  const handleDeleteConfirm = () => {
    const city = cities.find(c => c.id === deletingCityId);
    setCities(cities.filter(c => c.id !== deletingCityId));
    setShowDeleteConfirm(false);
    setDeletingCityId(null);
    showToast(`City "${city ? city.name : ''}" deleted successfully!`);
  };

  const filteredCities = cities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="p-6 space-y-6 flex-1">
          
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
                  placeholder="Search City Name..."
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
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">City ID</th>
                    <th className="px-6 py-4">City Name</th>
                    <th className="px-6 py-4">Coverage Area</th>
                    <th className="px-6 py-4">Active Techs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-[#F8FAFC] transition-colors relative">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{city.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#64748B]" /> {city.name}
                        </div>
                      </td>
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center relative">
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
                            onClick={() => setActiveActionsMenu(activeActionsMenu === city.id ? null : city.id)}
                            className="p-1.5 text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100 rounded transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Popover Action Menu */}
                          {activeActionsMenu === city.id && (
                            <div className="absolute right-0 top-8 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 w-36 text-sm text-left">
                              <button 
                                onClick={() => {
                                  setEditingCity(city);
                                  setShowEditModal(true);
                                  setActiveActionsMenu(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                              >
                                <Edit2 size={14} /> Edit City
                              </button>
                              <button 
                                onClick={() => {
                                  setDeletingCityId(city.id);
                                  setShowDeleteConfirm(true);
                                  setActiveActionsMenu(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Delete City
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCities.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-[#64748B]">
                        <Map size={48} className="mx-auto mb-2 opacity-50 text-slate-400" />
                        <p className="text-sm font-medium">No cities found matching details.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

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

            <form onSubmit={handleAddCitySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">City Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Hyderabad"
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

            <form onSubmit={handleEditCitySubmit} className="space-y-4">
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
