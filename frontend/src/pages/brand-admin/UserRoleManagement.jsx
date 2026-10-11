import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Plus, Edit2, CheckCircle2, X, Search, ToggleLeft, ToggleRight, Copy, Trash2, Lock, Users, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';

// User & Role Management (docs/brand-crm Phase 2). Users carry an employee ID,
// a department and any number of brand roles; roles are module × action
// permission sets edited as a matrix. Every rule here is also enforced by the
// server — the UI only hides what the signed-in user can't do.

const SUPER_ADMIN_TEMPLATE = 'brand_super_admin';
const ACTION_LABEL = {
  view: 'View', create: 'Create', edit: 'Edit', assign: 'Assign', priority: 'Priority', approve: 'Approve',
  export: 'Export', verify: 'Verify', policy_edit: 'Policy', manage: 'Manage',
};
const ACTION_ORDER = Object.keys(ACTION_LABEL);

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_USER = { name: '', email: '', phone: '', password: '', employeeId: '', department: '', roles: [] };

function shapeUser(user) {
  return {
    id: user.id,
    name: user.name,
    contact: user.email || user.phone || '—',
    email: user.email || '',
    phone: user.phone || '',
    employeeId: user.employeeId || '',
    department: user.department || '',
    roles: (user.assignedRoles || []).filter((r) => r && typeof r === 'object').map((r) => ({ id: r.id || r._id, name: r.name, template: r.template })),
    added: user.createdAt ? dateFormatter.format(new Date(user.createdAt)) : '—',
    active: user.status === 'Active',
  };
}

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full border border-[#E2E8F0] max-h-[90vh] flex flex-col ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
      <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] rounded-t-2xl">
        <h3 className="font-bold text-[#1E293B] text-sm">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">{label}</span>
    {children}
  </label>
);
const inputCls = 'w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1] disabled:opacity-60';

const UserRoleManagement = () => {
  const { user: me } = useAuth();
  const { can } = useBrandPermissions();
  const canEditUsers = can('users:edit');
  const canManageRoles = can('roles:manage');

  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({ modules: [], departments: [] });
  const [searchQ, setSearchQ] = useState('');
  const [userForm, setUserForm] = useState(null); // { mode: 'create'|'edit', id?, ...fields }
  const [roleForm, setRoleForm] = useState(null); // { mode: 'create'|'edit', id?, name, keys: Set, template }
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const fetchAll = () => Promise.all([
    apiRequest('/brand/users', { auth: true }),
    apiRequest('/brand/roles', { auth: true }),
    apiRequest('/brand/permissions/catalog', { auth: true }),
  ]);
  const apply = useCallback(([userData, roleData, catalogData]) => {
    setUsers((Array.isArray(userData) ? userData : []).map(shapeUser));
    setRoles(Array.isArray(roleData) ? roleData : []);
    setCatalog(catalogData || { modules: [], departments: [] });
    setError('');
  }, []);
  const load = useCallback(() => fetchAll().then(apply).catch((err) => setError(err.message)), [apply]);

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((data) => { if (!cancelled) apply(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apply]);

  // ── Users ──────────────────────────────────────────────────────────────────

  const isMe = (id) => me?.id && String(me.id) === String(id);

  const toggleActive = async (u) => {
    try {
      const updated = await apiRequest(`/brand/users/${u.id}`, {
        method: 'PUT', auth: true, body: { status: u.active ? 'Suspended' : 'Active' },
      });
      setUsers((list) => list.map((x) => (x.id === u.id ? shapeUser(updated) : x)));
      toast(`${u.name} is now ${u.active ? 'suspended' : 'active'}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const openUserForm = (u) => {
    setFormError('');
    setUserForm(u
      ? { mode: 'edit', id: u.id, ...EMPTY_USER, name: u.name, phone: u.phone, employeeId: u.employeeId, department: u.department, roles: u.roles.map((r) => String(r.id)) }
      : { mode: 'create', ...EMPTY_USER });
  };

  const saveUser = async () => {
    const f = userForm;
    if (!f.name.trim()) return setFormError('Name is required');
    if (f.mode === 'create') {
      if (!f.email.trim() && !f.phone.trim()) return setFormError('Give an email or a phone number to sign in with');
      if (f.password.length < 6) return setFormError('The initial password must be at least 6 characters');
      if (!f.roles.length) return setFormError('Pick at least one role — a user without a role can open nothing');
    }
    setSaving(true);
    setFormError('');
    try {
      const body = {
        name: f.name.trim(),
        ...(f.employeeId.trim() ? { employeeId: f.employeeId.trim() } : {}),
        ...(f.department ? { department: f.department } : {}),
        ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
        ...(f.mode === 'create' || !isMe(f.id) ? { assignedRoles: f.roles } : {}),
      };
      if (f.mode === 'create') {
        if (f.email.trim()) body.email = f.email.trim();
        body.password = f.password;
        const created = await apiRequest('/brand/users', { method: 'POST', auth: true, body });
        setUsers((list) => [shapeUser(created), ...list]);
        toast(`${created.name} added`);
      } else {
        const updated = await apiRequest(`/brand/users/${f.id}`, { method: 'PUT', auth: true, body });
        setUsers((list) => list.map((x) => (x.id === f.id ? shapeUser(updated) : x)));
        toast(`${updated.name} updated`);
      }
      setUserForm(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const q = searchQ.toLowerCase();
  const filteredUsers = users.filter((u) =>
    [u.name, u.contact, u.employeeId, u.department, ...u.roles.map((r) => r.name)].some((v) => (v || '').toLowerCase().includes(q)));

  // ── Roles ──────────────────────────────────────────────────────────────────

  const openRoleForm = (role, { duplicate = false } = {}) => {
    setFormError('');
    if (!role) return setRoleForm({ mode: 'create', name: '', keys: new Set(), template: null });
    const keys = new Set((role.permissions || []).map((p) => p.key));
    if (duplicate) return setRoleForm({ mode: 'create', name: `${role.name} (copy)`, keys, template: null });
    return setRoleForm({ mode: 'edit', id: role.id, name: role.name, keys, template: role.template });
  };

  const toggleKey = (key) => setRoleForm((f) => {
    const keys = new Set(f.keys);
    if (keys.has(key)) keys.delete(key); else keys.add(key);
    return { ...f, keys };
  });

  const toggleModule = (mod) => setRoleForm((f) => {
    const keys = new Set(f.keys);
    const all = mod.actions.every((a) => keys.has(a.key));
    mod.actions.forEach((a) => (all ? keys.delete(a.key) : keys.add(a.key)));
    return { ...f, keys };
  });

  const saveRole = async () => {
    const f = roleForm;
    if (!f.name.trim()) return setFormError('Give the role a name');
    setSaving(true);
    setFormError('');
    try {
      const body = { name: f.name.trim(), ...(f.template === SUPER_ADMIN_TEMPLATE ? {} : { permissionKeys: [...f.keys] }) };
      if (f.mode === 'create') await apiRequest('/brand/roles', { method: 'POST', auth: true, body });
      else await apiRequest(`/brand/roles/${f.id}`, { method: 'PUT', auth: true, body });
      setRoleForm(null);
      toast(`Role ${f.name.trim()} saved`);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role) => {
    if (!window.confirm(`Delete the role "${role.name}"?`)) return;
    try {
      await apiRequest(`/brand/roles/${role.id}`, { method: 'DELETE', auth: true });
      toast(`Role ${role.name} deleted`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const matrixActions = useMemo(() => {
    const present = new Set(catalog.modules.flatMap((m) => m.actions.map((a) => a.action)));
    return ACTION_ORDER.filter((a) => present.has(a));
  }, [catalog.modules]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="User & Role Management" subtitle="Brand users, their roles and what each role may do" />
        <div className="p-5 space-y-4">
          <div className="flex gap-2" role="tablist">
            {[['users', 'Users', Users], ['roles', 'Roles & permissions', ShieldCheck]].map(([key, label, Icon]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${tab === key ? 'bg-[#0D47A1] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0]'}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-3">{error}</div>}

          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex gap-3 mb-4 items-center">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                  <input aria-label="Search users" placeholder="Search by name, employee ID, department or role…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
                </div>
                {canEditUsers && (
                  <button onClick={() => openUserForm(null)} className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700">
                    <Plus size={13} /> Add user
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Sign-in</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Roles</th>
                      <th className="px-4 py-3">Added</th>
                      <th className="px-4 py-3">Status</th>
                      {canEditUsers && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-[#64748B] font-semibold">Loading users…</td></tr>}
                    {!loading && filteredUsers.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-[#64748B] font-semibold">No users match.</td></tr>}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-semibold text-[#1E293B]">
                          {u.name}{isMe(u.id) && <span className="ml-1.5 text-[9px] font-bold text-[#0D47A1] bg-[#EEF4FF] px-1.5 py-0.5 rounded-full">You</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#334155]">{u.employeeId || '—'}</td>
                        <td className="px-4 py-3 text-[#64748B]">{u.contact}</td>
                        <td className="px-4 py-3 text-[#64748B]">{u.department || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 && <span className="text-[10px] text-amber-700 font-semibold">No role — no access</span>}
                            {u.roles.map((r) => (
                              <span key={r.id} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.template === SUPER_ADMIN_TEMPLATE ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{r.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#64748B]">{u.added}</td>
                        <td className="px-4 py-3">
                          <button disabled={!canEditUsers || isMe(u.id)} onClick={() => toggleActive(u)} aria-label={`${u.active ? 'Suspend' : 'Activate'} ${u.name}`}
                            className="flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60">
                            {u.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-[#94A3B8]" />}
                            <span className={`text-[10px] font-semibold ${u.active ? 'text-green-600' : 'text-[#94A3B8]'}`}>{u.active ? 'Active' : 'Suspended'}</span>
                          </button>
                        </td>
                        {canEditUsers && (
                          <td className="px-4 py-3">
                            <button onClick={() => openUserForm(u)} aria-label={`Edit ${u.name}`} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Edit2 size={13} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="space-y-3">
              {canManageRoles && (
                <div className="flex justify-end">
                  <button onClick={() => openRoleForm(null)} className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700">
                    <Plus size={13} /> New role
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {roles.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">{r.name}</p>
                        <p className="text-[10px] text-[#64748B]">
                          {r.template ? 'Template' : 'Custom'} · {r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'} · {r.userCount} user{r.userCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      {r.template === SUPER_ADMIN_TEMPLATE && <Lock size={14} className="text-red-500 shrink-0" aria-label="Always has every permission" />}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {catalog.modules.filter((m) => m.actions.some((a) => r.permissions.some((p) => p.key === a.key))).map((m) => (
                        <span key={m.module} className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold">{m.label}</span>
                      ))}
                    </div>
                    <div className="flex gap-1.5 mt-auto pt-2">
                      <button onClick={() => openRoleForm(r)} className="flex items-center gap-1 text-[11px] font-bold text-[#0D47A1] hover:bg-[#EEF4FF] px-2 py-1 rounded-lg">
                        <Edit2 size={12} /> {canManageRoles ? 'Edit' : 'View'}
                      </button>
                      {canManageRoles && (
                        <button onClick={() => openRoleForm(r, { duplicate: true })} className="flex items-center gap-1 text-[11px] font-bold text-[#475569] hover:bg-[#F1F5F9] px-2 py-1 rounded-lg">
                          <Copy size={12} /> Duplicate
                        </button>
                      )}
                      {canManageRoles && r.template !== SUPER_ADMIN_TEMPLATE && (
                        <button onClick={() => deleteRole(r)} disabled={r.userCount > 0} title={r.userCount ? 'Reassign its users first' : undefined}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {userForm && (
        <Modal title={userForm.mode === 'create' ? 'Add user' : `Edit ${userForm.name}`} onClose={() => setUserForm(null)}>
          <div className="space-y-3">
            <Field label="Full name"><input className={inputCls} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee ID"><input className={inputCls} placeholder="e.g. LG-CC-014" value={userForm.employeeId} onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })} /></Field>
              <Field label="Department">
                <select className={inputCls} value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}>
                  <option value="">—</option>
                  {catalog.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            {userForm.mode === 'create' && (
              <Field label="Email (sign-in)"><input type="email" className={inputCls} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            )}
            <Field label="Phone"><input className={inputCls} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} /></Field>
            {userForm.mode === 'create' && (
              <Field label="Initial password"><input type="password" className={inputCls} placeholder="Min. 6 characters" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></Field>
            )}
            <fieldset disabled={isMe(userForm.id)}>
              <legend className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">Roles</legend>
              {isMe(userForm.id) && <p className="text-[10px] text-amber-700 mb-1">You can’t change your own roles.</p>}
              <div className="grid grid-cols-2 gap-1.5">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-xs text-[#334155] bg-[#F8FAFC] rounded-lg px-2 py-1.5">
                    <input type="checkbox" checked={userForm.roles.includes(String(r.id))}
                      onChange={() => setUserForm((f) => ({ ...f, roles: f.roles.includes(String(r.id)) ? f.roles.filter((x) => x !== String(r.id)) : [...f.roles, String(r.id)] }))} />
                    {r.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {formError && <p role="alert" className="text-xs text-red-600 font-semibold">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setUserForm(null)} className="flex-1 border border-[#E2E8F0] py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
              <button onClick={saveUser} disabled={saving} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : userForm.mode === 'create' ? 'Add user' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {roleForm && (
        <Modal wide title={roleForm.mode === 'create' ? 'New role' : canManageRoles ? `Edit role: ${roleForm.name}` : `Role: ${roleForm.name}`} onClose={() => setRoleForm(null)}>
          <div className="space-y-3">
            <Field label="Role name">
              <input className={inputCls} disabled={!canManageRoles} value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
            </Field>
            {roleForm.template === SUPER_ADMIN_TEMPLATE && (
              <p className="text-[11px] text-red-700 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><Lock size={12} /> Brand Super Admin always has every permission.</p>
            )}
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Module</th>
                    {matrixActions.map((a) => <th key={a} className="px-2 py-2 text-center">{ACTION_LABEL[a]}</th>)}
                    <th className="px-2 py-2 text-center">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {catalog.modules.map((m) => {
                    const locked = !canManageRoles || roleForm.template === SUPER_ADMIN_TEMPLATE;
                    const all = m.actions.every((a) => roleForm.keys.has(a.key));
                    return (
                      <tr key={m.module}>
                        <th scope="row" className="px-3 py-2 text-left font-semibold text-[#1E293B]">{m.label}</th>
                        {matrixActions.map((action) => {
                          const a = m.actions.find((x) => x.action === action);
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              {a && (
                                <input type="checkbox" title={a.description} aria-label={`${m.label}: ${a.description}`} disabled={locked}
                                  checked={roleForm.template === SUPER_ADMIN_TEMPLATE || roleForm.keys.has(a.key)} onChange={() => toggleKey(a.key)} />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" aria-label={`All of ${m.label}`} disabled={locked}
                            checked={roleForm.template === SUPER_ADMIN_TEMPLATE || all} onChange={() => toggleModule(m)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {formError && <p role="alert" className="text-xs text-red-600 font-semibold">{formError}</p>}
            {canManageRoles && (
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRoleForm(null)} className="border border-[#E2E8F0] px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={saveRole} disabled={saving} className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save role'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {successMsg && (
        <div role="status" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default UserRoleManagement;
