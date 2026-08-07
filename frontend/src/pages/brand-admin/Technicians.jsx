import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Briefcase, 
  Star, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Power,
  MapPin,
  X,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

function shape(t) {
  return {
    id: t.id,
    name: t.name,
    phone: t.phone || '—',
    skill: t.skill || 'General Repair',
    city: t.city || '—',
    rating: t.rating ?? 0,
    // Scoped to this brand by the API — not the technician's platform-wide totals.
    activeJobs: t.activeJobs ?? 0,
    completedJobs: t.completedJobs ?? 0,
    status: t.status || 'Active',
    availability: t.availability || 'Offline',
  };
}

const Technicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadTechnicians() {
      try {
        // Technicians who have actually worked this brand's requests.
        const data = await apiRequest('/brand/technicians', { auth: true });
        if (!cancelled) setTechnicians((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTechnicians();
    return () => { cancelled = true; };
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [openMenuTechId, setOpenMenuTechId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [newTech, setNewTech] = useState({
    name: '',
    skill: 'AC & Refrigerator',
    city: 'Delhi',
    rating: 5.0,
    availability: 'Available'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedAvailability, setSelectedAvailability] = useState('All Availabilities');

  const countAvail = (a) => technicians.filter(t => t.availability === a).length;
  const stats = [
    { title: 'Total Technicians', value: String(technicians.length), icon: <Users size={20} />, color: 'bg-blue-600' },
    { title: 'Active (On Duty)', value: String(countAvail('Available')), icon: <UserCheck size={20} />, color: 'bg-green-600' },
    { title: 'Busy (In Job)', value: String(countAvail('Busy')), icon: <Briefcase size={20} />, color: 'bg-yellow-600' },
    { title: 'Offline', value: String(countAvail('Offline')), icon: <UserX size={20} />, color: 'bg-gray-500' },
  ];

  // Technicians belong to the platform, not to a brand — a brand admin sees who
  // has worked their requests but cannot change a technician's account. Those
  // actions live on super-admin's own technician directory
  // (PATCH /super-admin/technicians/:id/status).
  const READ_ONLY_NOTICE =
    'Technician accounts are managed by the platform — this view is read-only.';

  const handleSuspend = () => {
    setError(READ_ONLY_NOTICE);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowModal(false);
    setEditingTech(null);
    setError(READ_ONLY_NOTICE);
  };

  const filteredTechnicians = technicians.filter(tech => {
    const matchesSearch = tech.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tech.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = selectedSkill === 'All Skills' || tech.skill === selectedSkill;
    const matchesCity = selectedCity === 'All Cities' || tech.city === selectedCity;
    
    let matchesAvailability = true;
    if (selectedAvailability !== 'All Availabilities' && selectedAvailability !== 'Availability') {
      matchesAvailability = tech.availability === selectedAvailability;
    }
    
    return matchesSearch && matchesSkill && matchesCity && matchesAvailability;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Technician Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Technician Name or ID..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Skills</option>
                <option>AC & Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave & TV</option>
                <option>All Appliances</option>
              </select>

              <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Cities</option>
                <option>Delhi</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
                <option>Pune</option>
              </select>

              <select 
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option value="All Availabilities">Availability</option>
                <option>Available</option>
                <option>Busy</option>
                <option>Offline</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setEditingTech(null);
                setNewTech({
                  name: '',
                  skill: 'AC & Refrigerator',
                  city: 'Delhi',
                  rating: 5.0,
                  availability: 'Available'
                });
                setShowModal(true);
              }}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Users size={16} /> Add Technician
            </button>
          </div>

          {/* Technicians Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Skill Type</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Jobs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading technicians…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredTechnicians.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">No technicians have worked this brand's requests yet.</td></tr>
                  )}
                  {filteredTechnicians.map((tech) => (
                    <tr key={tech.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{tech.name}</p>
                            <p className="text-[#64748B] text-xs">{tech.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{tech.skill}</td>
                      <td className="px-6 py-4 text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {tech.city}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star size={16} fill="currentColor" />
                          {tech.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{tech.activeJobs} Active</p>
                          <p className="text-[#64748B] text-xs">{tech.completedJobs} Completed</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          tech.availability === 'Available' ? 'bg-green-50 text-green-600' :
                          tech.availability === 'Busy' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {tech.availability}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingTech(tech);
                              setNewTech({
                                name: tech.name,
                                skill: tech.skill,
                                city: tech.city,
                                rating: tech.rating,
                                availability: tech.availability
                              });
                              setShowModal(true);
                            }}
                            className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" 
                            title="Edit Profile"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleSuspend(tech.id)}
                            className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                            title={tech.availability === 'Offline' ? 'Activate' : 'Suspend'}
                          >
                            <Power size={16} />
                          </button>
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuTechId(openMenuTechId === tech.id ? null : tech.id);
                              }}
                              className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {openMenuTechId === tech.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setOpenMenuTechId(null)}
                                />
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-100 text-left">
                                  <button
                                    onClick={() => {
                                      setOpenMenuTechId(null);
                                      setEditingTech(tech);
                                      setNewTech({
                                        name: tech.name,
                                        skill: tech.skill,
                                        city: tech.city,
                                        rating: tech.rating,
                                        availability: tech.availability
                                      });
                                      setShowModal(true);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2"
                                  >
                                    <Edit size={14} className="text-[#64748B]" />
                                    <span>Edit Profile</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuTechId(null);
                                      handleSuspend(tech.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2"
                                  >
                                    <Power size={14} className="text-[#64748B]" />
                                    <span>{tech.availability === 'Offline' ? 'Activate' : 'Suspend'}</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuTechId(null);
                                      setSuccessMessage(`Viewing history of ${tech.name}...`);
                                      setTimeout(() => setSuccessMessage(''), 3000);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-[#1E293B] hover:bg-[#F8FAFC] flex items-center gap-2"
                                  >
                                    <Briefcase size={14} className="text-[#64748B]" />
                                    <span>View Job History</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenMenuTechId(null);
                                      setError(READ_ONLY_NOTICE);
                                      setTimeout(() => setSuccessMessage(''), 3000);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-[#F1F5F9]"
                                  >
                                    <X size={14} className="text-red-500" />
                                    <span>Delete Partner</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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

      {/* Add Technician Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">
                  {editingTech ? 'Edit Technician Profile' : 'Add New Technician'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {editingTech ? 'Modify service partner details' : 'Register a new service partner to the platform'}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#EEF2F6] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={newTech.name}
                  onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Skill Specialization</label>
                  <select
                    value={newTech.skill}
                    onChange={(e) => setNewTech({ ...newTech, skill: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none bg-[#F8FAFC] text-sm"
                  >
                    <option>AC & Refrigerator</option>
                    <option>Washing Machine</option>
                    <option>Microwave & TV</option>
                    <option>All Appliances</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">City</label>
                  <select
                    value={newTech.city}
                    onChange={(e) => setNewTech({ ...newTech, city: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none bg-[#F8FAFC] text-sm"
                  >
                    <option>Delhi</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                    <option>Pune</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Availability Status</label>
                  <select
                    value={newTech.availability}
                    onChange={(e) => setNewTech({ ...newTech, availability: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none bg-[#F8FAFC] text-sm"
                  >
                    <option>Available</option>
                    <option>Busy</option>
                    <option>Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase mb-1">Rating Initial</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    value={newTech.rating}
                    onChange={(e) => setNewTech({ ...newTech, rating: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white text-[#1E293B] border border-[#E2E8F0] py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0D47A1] text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingTech ? 'Update Details' : 'Save Technician'}
                </button>
              </div>
            </form>
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

export default Technicians;
