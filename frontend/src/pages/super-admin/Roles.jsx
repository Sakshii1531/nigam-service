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
  CreditCard 
} from 'lucide-react';

const Roles = () => {
  const [roles, setRoles] = useState([
    { id: 1, name: 'Super Admin', icon: <Shield size={16} />, color: 'bg-red-50 text-red-600', permissions: { users: true, techs: true, brands: true, billing: true, settings: true } },
    { id: 2, name: 'Support Manager', icon: <Headphones size={16} />, color: 'bg-blue-50 text-blue-600', permissions: { users: true, techs: true, brands: false, billing: false, settings: false } },
    { id: 3, name: 'Finance Manager', icon: <CreditCard size={16} />, color: 'bg-green-50 text-green-600', permissions: { users: false, techs: false, brands: true, billing: true, settings: false } },
  ]);

  const [selectedRole, setSelectedRole] = useState(roles[0]);

  const togglePermission = (roleId, permissionKey) => {
    setRoles(roles.map(r => {
      if (r.id === roleId) {
        const updatedPerms = { ...r.permissions, [permissionKey]: !r.permissions[permissionKey] };
        if (selectedRole.id === roleId) {
          setSelectedRole({ ...r, permissions: updatedPerms });
        }
        return { ...r, permissions: updatedPerms };
      }
      return r;
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={16} /> Create New Role
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Roles List */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
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
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
              {selectedRole ? (
                <>
                  <div className="flex justify-between items-center mb-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <h3 className="font-bold text-[#1E293B]">{selectedRole.name} Permissions</h3>
                      <p className="text-xs text-[#64748B]">Toggle access rights for this role.</p>
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
    </div>
  );
};

export default Roles;
