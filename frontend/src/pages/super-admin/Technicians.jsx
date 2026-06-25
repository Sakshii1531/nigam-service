import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle, 
  XCircle,
  Eye,
  Star,
  MapPin,
  X,
  CheckCircle2,
  Plus
} from 'lucide-react';

const Technicians = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newTech, setNewTech] = useState({ name: '', skill: 'AC & Refrigerator', city: 'Delhi', rating: '5.0', availability: 'Available', status: 'Active' });

  const [technicians, setTechnicians] = useState([
    { id: 'TECH-001', name: 'Rahul Kumar', skill: 'AC & Refrigerator', city: 'Delhi', rating: 4.8, activeJobs: 2, completedJobs: 145, status: 'Active', availability: 'Available' },
    { id: 'TECH-002', name: 'Amit Singh', skill: 'Washing Machine', city: 'Mumbai', rating: 4.5, activeJobs: 1, completedJobs: 98, status: 'Active', availability: 'Busy' },
    { id: 'TECH-003', name: 'Suresh Raina', skill: 'Microwave & TV', city: 'Bangalore', rating: 4.9, activeJobs: 0, completedJobs: 210, status: 'Active', availability: 'Available' },
    { id: 'TECH-004', name: 'Vikram Batra', skill: 'All Appliances', city: 'Pune', rating: 4.2, activeJobs: 3, completedJobs: 67, status: 'Inactive', availability: 'Offline' },
    { id: 'TECH-005', name: 'Deepak Chahar', skill: 'Chimney & Hob', city: 'Chennai', rating: 0.0, activeJobs: 0, completedJobs: 0, status: 'Pending', availability: 'Offline' },
  ]);

  useEffect(() => {
    if (location.search.includes('add=true')) {
      setShowModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setTechnicians(technicians.map(t => {
      if (t.id === id) {
        let avail = t.availability;
        if (newStatus === 'Inactive') avail = 'Offline';
        else if (newStatus === 'Active' && t.availability === 'Offline') avail = 'Available';
        return { ...t, status: newStatus, availability: avail };
      }
      return t;
    }));
    showToast(`Technician status updated to ${newStatus}`);
  };

  const handleAddTechSubmit = (e) => {
    e.preventDefault();
    if (!newTech.name) {
      showToast('Please enter a technician name.');
      return;
    }

    const addedTech = {
      id: `TECH-00${technicians.length + 1}`,
      name: newTech.name,
      skill: newTech.skill,
      city: newTech.city,
      rating: parseFloat(newTech.rating) || 5.0,
      activeJobs: 0,
      completedJobs: 0,
      status: newTech.status,
      availability: newTech.availability
    };

    setTechnicians([addedTech, ...technicians]);
    setNewTech({ name: '', skill: 'AC & Refrigerator', city: 'Delhi', rating: '5.0', availability: 'Available', status: 'Active' });
    setShowModal(false);
    showToast(`Technician "${addedTech.name}" onboarded successfully!`);
  };

  const filteredTechs = technicians.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = selectedSkill === 'All Skills' || t.skill === selectedSkill;
    const matchesStatus = selectedStatus === 'All Status' || t.status === selectedStatus;
    return matchesSearch && matchesSkill && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Technician Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Technicians</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Technician
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
                  placeholder="Search Name, ID or Skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <option>Chimney & Hob</option>
                <option>All Appliances</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedSkill('All Skills');
                setSelectedStatus('All Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Skill</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Jobs (Active/Comp)</th>
                    <th className="px-6 py-4">Availability</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredTechs.map((tech) => (
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
                          <MapPin size={14} /> {tech.city}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star size={14} fill="currentColor" /> {tech.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-[#1E293B] font-medium">{tech.activeJobs}</span>
                          <span className="text-[#64748B]"> / {tech.completedJobs}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${
                          tech.availability === 'Available' ? 'text-green-600' :
                          tech.availability === 'Busy' ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {tech.availability}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          tech.status === 'Active' ? 'bg-green-50 text-green-600' :
                          tech.status === 'Inactive' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {tech.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => showToast(`Opening profile details for ${tech.name}...`)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" 
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {tech.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(tech.id, 'Active')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(tech.id, 'Inactive')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {tech.status === 'Active' && (
                            <button 
                              onClick={() => handleStatusChange(tech.id, 'Inactive')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                              title="Suspend"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          {tech.status === 'Inactive' && (
                            <button 
                              onClick={() => handleStatusChange(tech.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredTechs.length === 0 && (
              <div className="text-center py-12 bg-white">
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Technicians Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Technician Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">Onboard Technician</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTechSubmit} className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Manish Sharma"
                  value={newTech.name}
                  onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Skill Specialization</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.skill}
                    onChange={(e) => setNewTech({ ...newTech, skill: e.target.value })}
                  >
                    <option>AC & Refrigerator</option>
                    <option>Washing Machine</option>
                    <option>Microwave & TV</option>
                    <option>Chimney & Hob</option>
                    <option>All Appliances</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">City</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.city}
                    onChange={(e) => setNewTech({ ...newTech, city: e.target.value })}
                  >
                    <option>Delhi</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                    <option>Pune</option>
                    <option>Chennai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Initial Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.rating}
                    onChange={(e) => setNewTech({ ...newTech, rating: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Availability</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.availability}
                    onChange={(e) => setNewTech({ ...newTech, availability: e.target.value })}
                  >
                    <option>Available</option>
                    <option>Busy</option>
                    <option>Offline</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Onboard Tech
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
