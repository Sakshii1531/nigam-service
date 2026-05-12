import React, { useState } from 'react';
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
  MapPin
} from 'lucide-react';

const Technicians = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [technicians, setTechnicians] = useState([
    { id: 'TECH-001', name: 'Rahul Kumar', skill: 'AC & Refrigerator', city: 'Delhi', rating: 4.8, activeJobs: 2, completedJobs: 145, status: 'Active', availability: 'Available' },
    { id: 'TECH-002', name: 'Amit Singh', skill: 'Washing Machine', city: 'Mumbai', rating: 4.5, activeJobs: 1, completedJobs: 98, status: 'Active', availability: 'Busy' },
    { id: 'TECH-003', name: 'Suresh Raina', skill: 'Microwave & TV', city: 'Bangalore', rating: 4.9, activeJobs: 0, completedJobs: 210, status: 'Active', availability: 'Available' },
    { id: 'TECH-004', name: 'Vikram Batra', skill: 'All Appliances', city: 'Pune', rating: 4.2, activeJobs: 3, completedJobs: 67, status: 'Inactive', availability: 'Offline' },
    { id: 'TECH-005', name: 'Deepak Chahar', skill: 'Chimney & Hob', city: 'Chennai', rating: 0.0, activeJobs: 0, completedJobs: 0, status: 'Pending', availability: 'Offline' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setTechnicians(technicians.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filteredTechs = technicians.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Technicians</h2>
            <div className="flex gap-2">
              <span className="text-sm text-[#64748B] font-medium">Total Technicians: <span className="text-[#0D47A1] font-bold">{technicians.length}</span></span>
            </div>
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
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Name, ID or Skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Skills</option>
                <option>AC & Refrigerator</option>
                <option>Washing Machine</option>
                <option>Microwave & TV</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Filter size={16} /> More Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
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
                    <th className="px-6 py-4">Actions</th>
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Profile">
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
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Technicians Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Technicians;
