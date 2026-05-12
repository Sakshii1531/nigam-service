import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Building, 
  ClipboardList, 
  FileCheck, 
  UserPlus, 
  MapPin, 
  Package, 
  Truck, 
  CreditCard, 
  AlertTriangle, 
  Headphones, 
  Bell, 
  BarChart3, 
  Map, 
  Lock, 
  Settings, 
  Clock,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { path: '/super-admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/super-admin/users', icon: <Users size={20} />, label: 'User Management' },
    { path: '/super-admin/technicians', icon: <UserCheck size={20} />, label: 'Technician Management' },
    { path: '/super-admin/brands', icon: <Building size={20} />, label: 'Brand Management' },
    { path: '/super-admin/requests', icon: <ClipboardList size={20} />, label: 'Service Requests' },
    { path: '/super-admin/warranty', icon: <FileCheck size={20} />, label: 'Warranty Management' },
    { path: '/super-admin/assignment', icon: <UserPlus size={20} />, label: 'Tech Assignment' },
    { path: '/super-admin/tracking', icon: <MapPin size={20} />, label: 'Live Tracking' },
    { path: '/super-admin/inventory', icon: <Package size={20} />, label: 'Spare Parts & Inventory' },
    { path: '/super-admin/orders', icon: <Truck size={20} />, label: 'Orders & Dispatch' },
    { path: '/super-admin/billing', icon: <CreditCard size={20} />, label: 'Billing & Payments' },
    { path: '/super-admin/complaints', icon: <AlertTriangle size={20} />, label: 'Complaints & Escalations' },
    { path: '/super-admin/support', icon: <Headphones size={20} />, label: 'Customer Support' },
    { path: '/super-admin/notifications', icon: <Bell size={20} />, label: 'Notifications' },
    { path: '/super-admin/reports', icon: <BarChart3 size={20} />, label: 'Reports & Analytics' },
    { path: '/super-admin/cities', icon: <Map size={20} />, label: 'Cities & Areas' },
    { path: '/super-admin/roles', icon: <Lock size={20} />, label: 'Roles & Permissions' },
    { path: '/super-admin/settings', icon: <Settings size={20} />, label: 'Settings' },
    { path: '/super-admin/logs', icon: <Clock size={20} />, label: 'Activity Logs' },
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-[#E2E8F0] flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#0D47A1]">NIGAM</span>
          <span className="text-2xl font-black text-[#FFB300]">CARE</span>
        </div>
        <p className="text-xs text-[#64748B] font-medium mt-1">SUPER ADMIN PANEL</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors
              ${isActive 
                ? 'text-[#0D47A1] bg-[#EEF4FF] border-r-4 border-[#0D47A1]' 
                : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'}
            `}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
