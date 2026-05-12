import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  ShieldCheck, 
  Users, 
  Package, 
  FileCheck, 
  Receipt, 
  UserSquare2, 
  Bell, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, text: 'Dashboard', path: '/brand-admin/dashboard' },
    { icon: <ClipboardList size={20} />, text: 'Service Requests', path: '/brand-admin/requests' },
    { icon: <ShieldCheck size={20} />, text: 'Warranty Verification', path: '/brand-admin/warranty' },
    { icon: <Users size={20} />, text: 'Technicians', path: '/brand-admin/technicians' },
    { icon: <Package size={20} />, text: 'Parts Inventory', path: '/brand-admin/inventory' },
    { icon: <FileCheck size={20} />, text: 'Part Requests', path: '/brand-admin/part-requests' },
    { icon: <Receipt size={20} />, text: 'Invoices', path: '/brand-admin/invoices' },
    { icon: <UserSquare2 size={20} />, text: 'Customers', path: '/brand-admin/customers' },
    { icon: <Bell size={20} />, text: 'Notifications', path: '/brand-admin/notifications' },
    { icon: <BarChart3 size={20} />, text: 'Reports & Analytics', path: '/brand-admin/reports' },
    { icon: <Settings size={20} />, text: 'Settings', path: '/brand-admin/settings' },
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-[#E2E8F0] flex flex-col justify-between fixed left-0 top-0 z-20">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#FFD600] rounded-lg flex items-center justify-center text-[#0D47A1] font-bold text-lg">
            N
          </div>
          <div>
            <span className="text-lg font-bold text-[#1E293B] block">Nigam Care</span>
            <span className="text-xs text-[#64748B]">Brand Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-[#EEF4FF] text-[#0D47A1]' 
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#0D47A1]' : 'text-[#64748B]'}>
                    {item.icon}
                  </span>
                  {item.text}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-6 border-top border-[#E2E8F0]">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
