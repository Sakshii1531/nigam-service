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
  LogOut,
  Wrench,
  RefreshCw,
  ShoppingBag,
  Star,
  MessageSquare,
  GraduationCap,
  RotateCcw
} from 'lucide-react';

const Sidebar = () => {
  const menuGroups = [
    {
      title: 'Core Dashboard',
      items: [
        { icon: <LayoutDashboard size={18} />, text: 'Dashboard', path: '/brand-admin/dashboard' },
        { icon: <Bell size={18} />, text: 'Notifications', path: '/brand-admin/notifications' },
        { icon: <BarChart3 size={18} />, text: 'Reports & Analytics', path: '/brand-admin/reports' },
      ]
    },
    {
      title: 'Service & Products',
      items: [
        { icon: <ClipboardList size={18} />, text: 'Service Requests', path: '/brand-admin/requests' },
        { icon: <Package size={18} />, text: 'Parts Inventory', path: '/brand-admin/inventory' },
        { icon: <ShoppingBag size={18} />, text: 'Product Catalog', path: '/brand-admin/catalog' },
      ]
    },
    {
      title: 'Warranties & Contracts',
      items: [
        { icon: <ShieldCheck size={18} />, text: 'Warranty Verification', path: '/brand-admin/warranty' },
        { icon: <FileCheck size={18} />, text: 'Warranty & FOC Claims', path: '/brand-admin/warranty-claims' },
        { icon: <Wrench size={18} />, text: 'AMC Management', path: '/brand-admin/amcs' },
      ]
    },
    {
      title: 'Exchanges & Logistics',
      items: [
        { icon: <RefreshCw size={18} />, text: 'Exchange Requests', path: '/brand-admin/exchanges' },
        { icon: <RotateCcw size={18} />, text: 'Reverse Logistics', path: '/brand-admin/reverse-logistics' },
      ]
    },
    {
      title: 'Partners & Customers',
      items: [
        { icon: <Users size={18} />, text: 'Technicians', path: '/brand-admin/technicians' },
        { icon: <UserSquare2 size={18} />, text: 'Customers', path: '/brand-admin/customers' },
        { icon: <MessageSquare size={18} />, text: 'Support Chat', path: '/brand-admin/chat' },
        { icon: <Star size={18} />, text: 'Customer Reviews', path: '/brand-admin/reviews' },
        { icon: <GraduationCap size={18} />, text: 'Academy & Training', path: '/brand-admin/academy' },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: <Settings size={18} />, text: 'Settings', path: '/brand-admin/settings' },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-[#E2E8F0] flex flex-col justify-between fixed left-0 top-0 z-20">
      <div className="p-4 overflow-y-auto flex-1 pb-4 scrollbar-thin">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 bg-[#FFD600] rounded-lg flex items-center justify-center text-[#0D47A1] font-bold text-lg">
            N
          </div>
          <div>
            <span className="text-base font-bold text-[#1E293B] block">Nigam Care</span>
            <span className="text-xs text-[#64748B]">Brand Portal</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-4">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-3 block mb-1">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((item, index) => (
                  <NavLink
                    key={index}
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
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
                        <span>{item.text}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs font-medium text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-all">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
