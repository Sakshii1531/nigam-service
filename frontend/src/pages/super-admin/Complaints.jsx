import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  UserPlus,
  ArrowUpRight
} from 'lucide-react';

const Complaints = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [complaints, setComplaints] = useState([
    { id: 'CMP-301', user: 'Amit Sharma', subject: 'Technician did not arrive', priority: 'High', status: 'Pending', date: '12 May, 2026' },
    { id: 'CMP-302', user: 'Priya Patel', subject: 'Overcharged for part', priority: 'Medium', status: 'In Progress', date: '12 May, 2026' },
    { id: 'CMP-303', user: 'Rajesh K.', subject: 'Bad behavior by tech', priority: 'High', status: 'Pending', date: '11 May, 2026' },
    { id: 'CMP-304', user: 'Neha Gupta', subject: 'Appliance not working after repair', priority: 'High', status: 'Resolved', date: '10 May, 2026' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredComplaints = complaints.filter(c => 
    c.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Complaints & Escalations" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Customer Complaints</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">High Priority</p>
                <p className="text-2xl font-bold text-[#1E293B]">5</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending Resolution</p>
                <p className="text-2xl font-bold text-[#1E293B]">12</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Resolved Today</p>
                <p className="text-2xl font-bold text-[#1E293B]">8</p>
              </div>
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
                  placeholder="Search Complaint ID, User..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Complaint ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredComplaints.map((cmp) => (
                    <tr key={cmp.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{cmp.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{cmp.user}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{cmp.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          cmp.priority === 'High' ? 'bg-red-50 text-red-600' :
                          cmp.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {cmp.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          cmp.status === 'Resolved' ? 'bg-green-50 text-green-600' :
                          cmp.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {cmp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{cmp.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Details">
                            <Eye size={16} />
                          </button>
                          
                          {cmp.status !== 'Resolved' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(cmp.id, 'In Progress')}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                title="Investigate"
                              >
                                <UserPlus size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(cmp.id, 'Resolved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Resolve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </>
                          )}

                          <button className="p-1.5 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded" title="Escalate">
                            <ArrowUpRight size={16} />
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

// Dummy Clock icon since it was missing in top import list but used in summary cards
const Clock = ({ size }) => <span style={{ fontSize: size }}>🕒</span>;

export default Complaints;
