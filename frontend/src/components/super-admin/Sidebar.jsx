import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  LogOut,
  Image,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const [isCustomerAppOpen, setIsCustomerAppOpen] = useState(location.pathname.includes('/super-admin/customer-app-customization'));

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let timer;
    const savedScroll = sessionStorage.getItem('super-sidebar-scroll');
    if (savedScroll) {
      const scrollVal = parseInt(savedScroll, 10);
      container.scrollTop = scrollVal;
      // Re-apply after a short delay for layout paint
      timer = setTimeout(() => {
        container.scrollTop = scrollVal;
      }, 50);
    }

    const handleScroll = () => {
      // Only save if the container still has overflow or we are at a non-zero scroll position
      if (container.scrollTop > 0 || container.scrollHeight > container.clientHeight) {
        sessionStorage.setItem('super-sidebar-scroll', container.scrollTop.toString());
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const menuItems = [
    { path: '/super-admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/super-admin/users', icon: <Users size={20} />, label: 'User Management' },
    { path: '/super-admin/technicians', icon: <UserCheck size={20} />, label: 'Technician Management' },
    { path: '/super-admin/brands', icon: <Building size={20} />, label: 'Brand Management' },
    { 
      label: 'Customer App Section', 
      icon: <LayoutDashboard size={20} />,
      hasSub: true,
      subItems: [
        { path: '/super-admin/customer-app-customization?tab=categories', label: 'Category Customization' },
        { path: '/super-admin/customer-app-customization?tab=banners', label: 'Banner Customization' },
        { path: '/super-admin/customer-app-customization?tab=services', label: 'Services Customization' },
        { path: '/super-admin/customer-app-customization?tab=brands', label: 'Brands & Offers' },
        { path: '/super-admin/customer-app-customization?tab=mostbooked', label: 'Most Booked Services' },
        { path: '/super-admin/customer-app-customization?tab=applianceservices', label: 'Appliance Repair & Service' },
        { path: '/super-admin/customer-app-customization?tab=stories', label: 'Stories Customization' }
      ]
    },
    { path: '/super-admin/requests', icon: <ClipboardList size={20} />, label: 'Service Requests' },
    { path: '/super-admin/warranty', icon: <FileCheck size={20} />, label: 'Warranty Management' },
    { path: '/super-admin/assignment', icon: <UserPlus size={20} />, label: 'Tech Assignment' },
    { path: '/super-admin/inventory', icon: <Package size={20} />, label: 'Spare Parts & Inventory' },
    { path: '/super-admin/exchange-offers', icon: <RefreshCw size={20} />, label: 'Exchange Offers' },
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
    <div className="w-64 bg-[#EEF4FF] h-screen border-r border-[#E2E8F0] flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#0D47A1]">NIGAM</span>
          <span className="text-2xl font-black text-[#FFB300]">CARE</span>
        </div>
        <p className="text-xs text-[#64748B] font-medium mt-1">SUPER ADMIN PANEL</p>
      </div>

      {/* Navigation */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-1"
      >
        {menuItems.map((item, idx) => {
          if (item.hasSub) {
            const isAnySubActive = item.subItems.some(sub => location.pathname + location.search === sub.path || (sub.path.includes('categories') && location.pathname + location.search === '/super-admin/customer-app-customization'));
            return (
              <div key={idx} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setIsCustomerAppOpen(prev => !prev)}
                  className={`flex items-center justify-between w-full px-6 py-2.5 text-sm font-bold transition-colors cursor-pointer text-left ${
                    isAnySubActive ? 'text-[#0D47A1]' : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isCustomerAppOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isCustomerAppOpen && (
                  <div className="flex flex-col pl-4 border-l border-slate-100 ml-8 mb-1 gap-1">
                    {item.subItems.map((sub, sIdx) => {
                      const isSubActive = location.pathname + location.search === sub.path || (sub.path.includes('categories') && location.pathname + location.search === '/super-admin/customer-app-customization');
                      return (
                        <NavLink
                          key={sIdx}
                          to={sub.path}
                          onClick={() => {
                            if (scrollContainerRef.current) {
                              sessionStorage.setItem('super-sidebar-scroll', scrollContainerRef.current.scrollTop.toString());
                            }
                          }}
                          className={`
                            pl-3 py-1 text-xs font-semibold rounded-md transition-colors block
                            ${isSubActive 
                              ? 'text-[#0D47A1] bg-[#EEF4FF] font-black' 
                              : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'}
                          `}
                        >
                          {sub.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (scrollContainerRef.current) {
                  sessionStorage.setItem('super-sidebar-scroll', scrollContainerRef.current.scrollTop.toString());
                }
              }}
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
          );
        })}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button 
          onClick={() => navigate('/super-admin/login')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
