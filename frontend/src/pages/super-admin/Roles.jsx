import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Lock, 
  Plus, 
  Check, 
  X, 
  Shield, 
  UserCheck, 
  Building, 
  Headphones, 
  CreditCard,
  CheckCircle2,
  LockKeyhole,
  Info
} from 'lucide-react';

const Roles = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', users: false, techs: false, brands: false, billing: false, settings: false });

  const [roles, setRoles] = useState([
    { id: 1, name: 'Super Admin', icon: <Shield size={16} />, color: 'bg-red-50 text-red-600', permissions: { users: true, techs: true, brands: true, billing: true, settings: true } },
    { id: 2, name: 'Support Manager', icon: <Headphones size={16} />, color: 'bg-blue-50 text-blue-600', permissions: { users: true, techs: true, brands: false, billing: false, settings: false } },
    { id: 3, name: 'Finance Manager', icon: <CreditCard size={16} />, color: 'bg-green-50 text-green-600', permissions: { users: false, techs: false, brands: true, billing: true, settings: false } },
  ]);

  const [selectedRole, setSelectedRole] = useState(roles[0]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const togglePermission = (roleId, permissionKey) => {
    let updatedPermName = '';
    const updated = roles.map(r => {
      if (r.id === roleId) {
        const updatedPerms = { ...r.permissions, [permissionKey]: !r.permissions[permissionKey] };
        const newPermState = updatedPerms[permissionKey] ? 'Granted' : 'Revoked';
        updatedPermName = `${permissionKey.charAt(0).toUpperCase() + permissionKey.slice(1)} permission ${newPermState} for ${r.name}`;
        
        const newRoleObj = { ...r, permissions: updatedPerms };
        if (selectedRole.id === roleId) {
          setSelectedRole(newRoleObj);
        }
        return newRoleObj;
      }
      return r;
    });

    setRoles(updated);
    if (updatedPermName) {
      showToast(updatedPermName);
    }
  };

  const handleCreateRoleSubmit = (e) => {
    e.preventDefault();
    if (!newRole.name) {
      showToast('Please enter a role name.');
      return;
    }

    const created = {
      id: roles.length + 1,
      name: newRole.name,
      icon: <LockKeyhole size={16} />,
      color: 'bg-purple-50 text-purple-600',
      permissions: {
        users: newRole.users,
        techs: newRole.techs,
        brands: newRole.brands,
        billing: newRole.billing,
        settings: newRole.settings
      }
    };

    setRoles([...roles, created]);
    setSelectedRole(created);
    setNewRole({ name: '', description: '', users: false, techs: false, brands: false, billing: false, settings: false });
    setShowAddModal(false);
    showToast(`Role "${created.name}" created and configured successfully!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Roles & Permissions" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Access Control Matrix</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Create New Role
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Roles List */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <h3 className="font-bold text-[#1E293B] mb-4">Available Roles</h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto">
                {roles.map((role) => (
                  <div 
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors flex justify-between items-center ${
                      selectedRole?.id === role.id 
                        ? 'border-[#0D47A1] bg-[#EEF4FF]' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${role.color}`}>
                        {role.icon}
                      </div>
                      <p className="font-bold text-[#1E293B] text-sm">{role.name}</p>
                    </div>
                    <Lock size={14} className="text-[#64748B]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Permission Matrix */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              {selectedRole ? (
                <>
                  <div className="flex justify-between items-center mb-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <h3 className="font-bold text-[#1E293B]">{selectedRole.name} Permissions</h3>
                      <p className="text-xs text-[#64748B] font-semibold mt-0.5">Toggle access rights for this role.</p>
                    </div>
                  </div>

                  {/* Matrix */}
                  <div className="space-y-4 flex-1 overflow-y-auto p-2">
                    {[
                      { key: 'users', label: 'Manage Users', desc: 'Can view, edit, suspend, and delete customers.' },
                      { key: 'techs', label: 'Manage Technicians', desc: 'Can approve, suspend, and assign jobs to techs.' },
                      { key: 'brands', label: 'Manage Brands', desc: 'Can approve brands and manage their requests.' },
                      { key: 'billing', label: 'Manage Billing', desc: 'Can view transactions, process refunds, and payouts.' },
                      { key: 'settings', label: 'Manage System Settings', desc: 'Full access to app configuration and logs.' },
                    ].map((perm) => (
                      <div key={perm.key} className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors">
                        <div>
                          <p className="font-bold text-[#1E293B] text-sm">{perm.label}</p>
                          <p className="text-xs text-[#64748B] mt-0.5">{perm.desc}</p>
                        </div>
                        <button 
                          onClick={() => togglePermission(selectedRole.id, perm.key)}
                          className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                            selectedRole.permissions[perm.key] ? 'bg-[#0D47A1]' : 'bg-gray-200'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                            selectedRole.permissions[perm.key] ? 'translate-x-6' : 'translate-x-0'
                          }`}></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748B]">
                  <Lock size={48} className="mb-2 opacity-50" />
                  <p>Select a role to view permissions</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Create Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Create System Access Role</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Role Title *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Regional Supervisor"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="Describe the duties of this role..."
                  rows={2}
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">Set Default Permissions</label>
                
                {[
                  { key: 'users', label: 'Manage Users' },
                  { key: 'techs', label: 'Manage Technicians' },
                  { key: 'brands', label: 'Manage Brands' },
                  { key: 'billing', label: 'Manage Billing' },
                  { key: 'settings', label: 'Manage System Settings' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <input 
                      type="checkbox"
                      checked={newRole[item.key]}
                      onChange={(e) => setNewRole({ ...newRole, [item.key]: e.target.checked })}
                      className="rounded border-[#E2E8F0] text-[#0D47A1] focus:ring-[#0D47A1] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Create Role
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

export default Roles;
