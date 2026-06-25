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
  X,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Tv,
  Refrigerator,
  Flame,
  Smartphone,
  MapPin,
  Mail,
  Phone,
  ArrowLeft
} from 'lucide-react';

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedSort, setSelectedSort] = useState('Sort By');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals / Drawer state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [minAppliances, setMinAppliances] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 4;

  const [users, setUsers] = useState([
    { id: 'USR-1001', name: 'Amit Sharma', email: 'amit@example.com', phone: '+91 98765 43210', appliances: 3, services: 5, status: 'Active', lastActive: '2 hours ago', addresses: ['H-44, Sector 6, Noida', 'B-102, Mansarovar Garden, Delhi'], applianceList: [{ type: 'TV', brand: 'LG', model: 'OLED55' }, { type: 'Refrigerator', brand: 'Samsung', model: 'Double Door 320L' }] },
    { id: 'USR-1002', name: 'Priya Patel', email: 'priya@example.com', phone: '+91 98765 43211', appliances: 1, services: 2, status: 'Active', lastActive: '1 day ago', addresses: ['504, Windsor Heights, Mumbai'], applianceList: [{ type: 'Washing Machine', brand: 'Whirlpool', model: 'Fully Auto 7kg' }] },
    { id: 'USR-1003', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 98765 43212', appliances: 2, services: 0, status: 'Suspended', lastActive: '3 days ago', addresses: ['Flat 12B, Green Glen Layout, Bangalore'], applianceList: [{ type: 'AC', brand: 'LG', model: '1.5 Ton Split' }] },
    { id: 'USR-1004', name: 'Neha Gupta', email: 'neha@example.com', phone: '+91 98765 43213', appliances: 4, services: 12, status: 'Active', lastActive: '10 mins ago', addresses: ['Pocket 1, Sector 9, Rohini, Delhi'], applianceList: [{ type: 'Microwave', brand: 'LG', model: 'Convection 28L' }, { type: 'Chimney', brand: 'Havells', model: 'Auto Clean 90cm' }] },
    { id: 'USR-1005', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 98765 43214', appliances: 0, services: 0, status: 'Pending', lastActive: 'New', addresses: ['C-12, Gomti Nagar, Lucknow'], applianceList: [] },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleStatusChange = (id, newStatus) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const updated = { ...u, status: newStatus };
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser(updated);
        }
        return updated;
      }
      return u;
    }));
    showToast(`User status updated to ${newStatus}`);
  };

  const handleDeleteClick = (id) => {
    setDeletingUserId(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    const user = users.find(u => u.id === deletingUserId);
    setUsers(users.filter(u => u.id !== deletingUserId));
    setShowDeleteConfirm(false);
    setDeletingUserId(null);
    if (selectedUser && selectedUser.id === deletingUserId) {
      setSelectedUser(null);
      setShowDrawer(false);
    }
    showToast(`User "${user ? user.name : ''}" account permanently deleted.`);
  };

  // Filter and Sort logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || u.status === selectedStatus;
    const matchesMinAppliances = !minAppliances || u.appliances >= Number(minAppliances);
    return matchesSearch && matchesStatus && matchesMinAppliances;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (selectedSort === 'Newest First') {
      return a.id.localeCompare(b.id) * -1;
    } else if (selectedSort === 'Most Active') {
      return b.services - a.services;
    }
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = sortedUsers.slice(indexOfFirstEntry, indexOfLastEntry);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="User Management" />

        {/* Body */}
        {showDrawer && selectedUser ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedUser(null);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Customers
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#0D47A1]">{selectedUser.id}</span>
                  <h3 className="text-lg font-black text-[#1E293B]">Customer Profile</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-[#EEF4FF] text-[#0D47A1] rounded-full flex items-center justify-center font-bold text-xl">
                      {selectedUser.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E293B] text-base">{selectedUser.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        selectedUser.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>{selectedUser.status}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border border-[#E2E8F0] rounded-xl p-3.5 bg-slate-50 font-medium">
                    <p className="flex items-center gap-2 text-slate-700"><Mail size={14} className="text-[#64748B]" /> {selectedUser.email}</p>
                    <p className="flex items-center gap-2 text-slate-700 mt-1.5"><Phone size={14} className="text-[#64748B]" /> {selectedUser.phone}</p>
                    <div className="flex gap-2 items-start text-slate-700 mt-1.5">
                      <MapPin size={14} className="text-[#64748B] flex-shrink-0 mt-0.5" /> 
                      <div className="space-y-1">
                        {selectedUser.addresses.map((addr, idx) => (
                          <p key={idx} className="bg-white px-2 py-0.5 border border-[#E2E8F0] rounded text-slate-600">{addr}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Registered Appliances ({selectedUser.appliances})</h4>
                    <div className="space-y-2">
                      {selectedUser.applianceList.map((app, idx) => (
                        <div key={idx} className="p-3 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-100 rounded-lg text-[#0D47A1]">
                              {app.type === 'TV' ? <Tv size={16} /> : <Refrigerator size={16} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#1E293B]">{app.brand} {app.type}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{app.model}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#0D47A1] font-bold bg-[#EEF4FF] px-2 py-0.5 rounded-full">Covered</span>
                        </div>
                      ))}
                      {selectedUser.applianceList.length === 0 && (
                        <p className="text-xs text-[#64748B] italic">No appliances registered yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedUser.status === 'Active' ? (
                  <button
                    onClick={() => handleStatusChange(selectedUser.id, 'Suspended')}
                    className="w-full bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <Ban size={16} /> Suspend Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(selectedUser.id, 'Active')}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Activate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Customers / Users</h2>
            <div className="flex gap-2">
              <span className="text-sm text-[#64748B] font-semibold">Total Users: <span className="text-[#0D47A1] font-bold">{users.length}</span></span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-col gap-4 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                    placeholder="Search Name, ID or Email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Filters */}
                <select 
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Pending</option>
                </select>

                <select 
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>Sort By</option>
                  <option>Newest First</option>
                  <option>Most Active</option>
                </select>
              </div>

              <button 
                onClick={() => setShowExtraFilters(!showExtraFilters)}
                className={`border px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  showExtraFilters ? 'bg-[#EEF4FF] border-[#0D47A1] text-[#0D47A1]' : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <Filter size={16} /> More Filters
              </button>
            </div>

            {/* Extra Filters panel */}
            {showExtraFilters && (
              <div className="border-t border-[#E2E8F0] pt-4 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Min Appliances:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={minAppliances}
                    onChange={(e) => {
                      setMinAppliances(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-[#E2E8F0] rounded px-3 py-1.5 outline-none text-xs w-20 text-slate-800 bg-[#F8FAFC]"
                  />
                </div>
                <button 
                  onClick={() => {
                    setMinAppliances('');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-[#0D47A1] font-semibold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
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
                  {currentEntries.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-bold text-sm">{user.name}</p>
                            <p className="text-[#64748B] text-xs font-medium">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] text-xs font-semibold">{user.email}</p>
                          <p className="text-[#64748B] text-xs mt-0.5 font-medium">{user.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{user.appliances}</td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{user.services}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'Active' ? 'bg-green-50 text-green-600' :
                          user.status === 'Suspended' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B] font-medium">{user.lastActive}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDrawer(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          {user.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Suspended')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors" 
                              title="Suspend"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteClick(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
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
            {sortedUsers.length === 0 && (
              <div className="text-center py-12 bg-white">
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4 opacity-50 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Users Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}

            {/* Pagination */}
            {sortedUsers.length > 0 && (
              <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm text-[#64748B] font-semibold">
                <span>Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, sortedUsers.length)} of {sortedUsers.length} entries</span>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => paginate(idx + 1)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === idx + 1 ? 'bg-[#0D47A1] text-white' : 'border border-[#E2E8F0] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>



      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#1E293B] text-lg">Delete Customer Account?</h3>
              <p className="text-sm text-[#64748B]">This action is permanent and will wipe out all service ticket histories, registered warranty configurations, and addresses associated with this user.</p>
            </div>

            <div className="flex gap-3 justify-center text-sm pt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUserId(null);
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

export default Users;
