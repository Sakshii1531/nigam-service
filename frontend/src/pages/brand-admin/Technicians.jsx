import React from 'react';
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
  MapPin
} from 'lucide-react';

const Technicians = () => {
  const stats = [
    { title: 'Total Technicians', value: '124', icon: <Users size={20} />, color: 'bg-blue-600' },
    { title: 'Active (On Duty)', value: '86', icon: <UserCheck size={20} />, color: 'bg-green-600' },
    { title: 'Busy (In Job)', value: '54', icon: <Briefcase size={20} />, color: 'bg-yellow-600' },
    { title: 'Offline', value: '38', icon: <UserX size={20} />, color: 'bg-gray-500' },
  ];

  const [technicians, setTechnicians] = React.useState([
    { id: 'TECH-001', name: 'Rahul Kumar', skill: 'AC & Refrigerator', city: 'Delhi', rating: 4.8, activeJobs: 2, completedJobs: 145, status: 'Active', availability: 'Available' },
    { id: 'TECH-002', name: 'Amit Singh', skill: 'Washing Machine', city: 'Mumbai', rating: 4.5, activeJobs: 1, completedJobs: 98, status: 'Active', availability: 'Busy' },
    { id: 'TECH-003', name: 'Suresh Raina', skill: 'Microwave & TV', city: 'Bangalore', rating: 4.9, activeJobs: 0, completedJobs: 210, status: 'Active', availability: 'Available' },
    { id: 'TECH-004', name: 'Vikram Batra', skill: 'All Appliances', city: 'Pune', rating: 4.2, activeJobs: 3, completedJobs: 67, status: 'Inactive', availability: 'Offline' },
  ]);

  const handleSuspend = (id) => {
    setTechnicians(technicians.map(t => {
      if (t.id === id) {
        const isInactive = t.availability === 'Offline';
        return { 
          ...t, 
          availability: isInactive ? 'Available' : 'Offline',
          status: isInactive ? 'Active' : 'Inactive'
        };
      }
      return t;
    }));
  };

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
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Technician Name or ID..."
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
                <option>All Cities</option>
                <option>Delhi</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Availability</option>
                <option>Available</option>
                <option>Busy</option>
                <option>Offline</option>
              </select>
            </div>

            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
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
                  {technicians.map((tech) => (
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
                          <button className="p-2 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg transition-colors" title="Edit Profile">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleSuspend(tech.id)}
                            className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                            title={tech.availability === 'Offline' ? 'Activate' : 'Suspend'}
                          >
                            <Power size={16} />
                          </button>
                          <button className="p-2 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-lg transition-colors">
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
    </div>
  );
};

export default Technicians;
