import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Users, Plus, Shield, Eye, Edit2, CheckCircle2, X, Search, ToggleLeft, ToggleRight } from 'lucide-react';

const rolesInfo = [
  { role: 'Brand Admin', permissions: ['All Access', 'User Management', 'Financial Reports', 'Settings'], color: 'bg-red-100 text-red-700', count: 2 },
  { role: 'Support Agent', permissions: ['View Complaints', 'Register Complaint', 'Monitor Complaints', 'Chat'], color: 'bg-blue-100 text-blue-700', count: 5 },
  { role: 'Finance', permissions: ['Invoices', 'Payments', 'Reports'], color: 'bg-green-100 text-green-700', count: 2 },
  { role: 'Viewer', permissions: ['View Only — No Actions'], color: 'bg-gray-100 text-gray-700', count: 3 },
];

const initialUsers = [
  { id: 1, name: 'Rajiv Kapoor', email: 'rajiv@brand.com', role: 'Brand Admin', lastLogin: '21 May 2025, 09:30 AM', active: true },
  { id: 2, name: 'Sunita Mehta', email: 'sunita@brand.com', role: 'Support Agent', lastLogin: '21 May 2025, 10:15 AM', active: true },
  { id: 3, name: 'Arjun Verma', email: 'arjun@brand.com', role: 'Finance', lastLogin: '20 May 2025, 04:30 PM', active: true },
  { id: 4, name: 'Preeti Singh', email: 'preeti@brand.com', role: 'Support Agent', lastLogin: '19 May 2025, 02:00 PM', active: false },
  { id: 5, name: 'Aman Tiwari', email: 'aman@brand.com', role: 'Viewer', lastLogin: '18 May 2025, 11:45 AM', active: true },
];

const roleColors = {
  'Brand Admin': 'bg-red-100 text-red-700',
  'Support Agent': 'bg-blue-100 text-blue-700',
  Finance: 'bg-green-100 text-green-700',
  Viewer: 'bg-gray-100 text-gray-700',
};

const UserRoleManagement = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchQ, setSearchQ] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Support Agent' });
  const [successMsg, setSuccessMsg] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const toggleActive = (id) => {
    setUsers(u => u.map(user => user.id === id ? { ...user, active: !user.active } : user));
    toast('User status updated!');
  };

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) { toast('Please fill all fields!'); return; }
    setUsers(u => [...u, { id: u.length + 1, ...newUser, lastLogin: 'Never', active: true }]);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'Support Agent' });
    toast(`User ${newUser.name} added successfully!`);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="User & Role Management" subtitle="Manage brand panel users and their access levels" />
        <div className="p-5 space-y-5">

          {/* Role Cards */}
          <div className="grid grid-cols-4 gap-4">
            {rolesInfo.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${r.color}`}>{r.role}</span>
                  <span className="text-xl font-black text-[#1E293B]">{r.count}</span>
                </div>
                <div className="space-y-1 mt-2">
                  {r.permissions.map((p, pi) => (
                    <div key={pi} className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
                      <div className="w-1 h-1 rounded-full bg-[#94A3B8]" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <div className="flex gap-3 mb-4 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input placeholder="Search by name, email, or role..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
              </div>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700">
                <Plus size={13} /> Add New User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-[10px]">
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-semibold text-[#1E293B]">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{u.lastLogin}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(u.id)} className="flex items-center gap-1.5">
                          {u.active
                            ? <ToggleRight size={20} className="text-green-500" />
                            : <ToggleLeft size={20} className="text-[#94A3B8]" />
                          }
                          <span className={`text-[10px] font-semibold ${u.active ? 'text-green-600' : 'text-[#94A3B8]'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toast(`Editing ${u.name}...`)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Edit2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] text-sm">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Rajiv Kapoor' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'rajiv@brand.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newUser[f.key]}
                    onChange={e => setNewUser({ ...newUser, [f.key]: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]">
                  {['Brand Admin', 'Support Agent', 'Finance', 'Viewer'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 border border-[#E2E8F0] py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={handleAddUser} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Add User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default UserRoleManagement;
