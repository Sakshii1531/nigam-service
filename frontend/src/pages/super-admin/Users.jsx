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
  Trash2,
  Eye,
  Edit
} from 'lucide-react';

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [users, setUsers] = useState([
    { id: 'USR-1001', name: 'Amit Sharma', email: 'amit@example.com', phone: '+91 98765 43210', appliances: 3, services: 5, status: 'Active', lastActive: '2 hours ago' },
    { id: 'USR-1002', name: 'Priya Patel', email: 'priya@example.com', phone: '+91 98765 43211', appliances: 1, services: 2, status: 'Active', lastActive: '1 day ago' },
    { id: 'USR-1003', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 98765 43212', appliances: 2, services: 0, status: 'Suspended', lastActive: '3 days ago' },
    { id: 'USR-1004', name: 'Neha Gupta', email: 'neha@example.com', phone: '+91 98765 43213', appliances: 4, services: 12, status: 'Active', lastActive: '10 mins ago' },
    { id: 'USR-1005', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 98765 43214', appliances: 0, services: 0, status: 'Pending', lastActive: 'New' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
  };

  const handleDelete = (id) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="User Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Customers / Users</h2>
            <div className="flex gap-2">
              <span className="text-sm text-[#64748B] font-medium">Total Users: <span className="text-[#0D47A1] font-bold">{users.length}</span></span>
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
                  placeholder="Search Name, ID or Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Active</option>
                <option>Suspended</option>
                <option>Pending</option>
              </select>

              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>Sort By</option>
                <option>Newest First</option>
                <option>Most Active</option>
              </select>
            </div>

            <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
              <Filter size={16} /> More Filters
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Appliances</th>
                    <th className="px-6 py-4">Service Count</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{user.name}</p>
                            <p className="text-[#64748B] text-xs">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] text-xs font-medium">{user.email}</p>
                          <p className="text-[#64748B] text-xs mt-0.5">{user.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{user.appliances}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{user.services}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-50 text-green-600' :
                          user.status === 'Suspended' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{user.lastActive}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Profile">
                            <Eye size={16} />
                          </button>
                          {user.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Suspended')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" 
                              title="Suspend"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 bg-white">
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Users Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}

            {/* Pagination */}
            <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm text-[#64748B]">
              <span>Showing {filteredUsers.length} of {users.length} entries</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">Previous</button>
                <button className="px-3 py-1 bg-[#0D47A1] text-white rounded">1</button>
                <button className="px-3 py-1 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC]">Next</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Users;
