import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Users, Plus, Shield, Eye, Edit2, CheckCircle2, X, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const ROLE_PALETTE = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-gray-100 text-gray-700'];

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function shape(user) {
  const assigned = user.assignedRoles || [];
  return {
    id: user.id,
    name: user.name,
    email: user.email || user.phone || '—',
    // A user can hold several brand roles; the table shows one, so name the first
    // and note the rest in the title attribute.
    role: assigned[0]?.name || 'No role assigned',
    allRoles: assigned.map(r => r.name).join(', '),
    added: user.createdAt ? dateFormatter.format(new Date(user.createdAt)) : '—',
    active: user.status === 'Active',
  };
}

const UserRoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userData, roleData] = await Promise.all([
          apiRequest('/brand/users', { auth: true }),
          apiRequest('/brand/roles', { auth: true }).catch(() => []),
        ]);
        if (cancelled) return;
        setUsers((Array.isArray(userData) ? userData : []).map(shape));
        const roleList = Array.isArray(roleData) ? roleData : [];
        setRoles(roleList);
        if (roleList.length) setNewUser(prev => ({ ...prev, role: roleList[0].id }));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Role cards are derived from the brand's actual roles and current headcount,
  // not a fixed list — a brand defines whatever roles it needs.
  const rolesInfo = roles.map((r, i) => ({
    role: r.name,
    permissions: (r.permissions || []).map(p => (typeof p === 'string' ? p : p.key)),
    color: ROLE_PALETTE[i % ROLE_PALETTE.length],
    count: users.filter(u => u.allRoles.split(', ').includes(r.name)).length,
  }));

  const roleColors = Object.fromEntries(rolesInfo.map(r => [r.role, r.color]));

  const toggleActive = async (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const nextActive = !user.active;
    const previous = users;
    setUsers(u => u.map(x => (x.id === id ? { ...x, active: nextActive } : x)));
    try {
      await apiRequest(`/brand/users/${id}`, {
        method: 'PUT', auth: true, body: { status: nextActive ? 'Active' : 'Suspended' },
      });
      toast('User status updated!');
    } catch (err) {
      setUsers(previous);
      setError(`Could not update user: ${err.message}`);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) { toast('Please fill all fields!'); return; }
    // The API creates the account directly with an initial password — there is
    // no email-invite flow yet, so one has to be supplied here.
    if (newUser.password.length < 6) { toast('Password must be at least 6 characters.'); return; }
    try {
      const created = await apiRequest('/brand/users', {
        method: 'POST',
        auth: true,
        body: {
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          ...(newUser.role ? { assignedRoles: [newUser.role] } : {}),
        },
      });
      setUsers(u => [...u, shape(created)]);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: roles[0]?.id || '' });
      toast(`User ${created.name} added successfully!`);
    } catch (err) {
      setError(`Could not add user: ${err.message}`);
    }
  };

  const q = searchQ.toLowerCase();
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q)
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
                    <th className="px-4 py-3">Added</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[#64748B] font-semibold">Loading users…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[#64748B] font-semibold">No brand users yet.</td></tr>
                  )}
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
                        <span title={u.allRoles || u.role} className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{u.added}</td>
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
                { label: 'Initial Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters' },
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
                  {roles.length === 0 && <option value="">No roles defined for this brand</option>}
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
