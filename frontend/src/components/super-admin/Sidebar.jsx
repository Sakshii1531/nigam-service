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
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle,
  Video,
  Megaphone,
  TrendingUp,
  FileText,
  LayoutGrid,
  Wrench,
  Sparkles,
  DollarSign,
  Image,
  LogOut,
  Gift,
  Coins,
  Ticket,
  Award,
  RefreshCw
} from 'lucide-react';
import logo from '../../assets/nigam-care.png';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Track collapsible sections open/close states
  const [openSections, setOpenSections] = useState({
    customerApp: location.pathname.includes('/super-admin/customer-app-customization'),
    loyalty: location.pathname.includes('/super-admin/loyalty-program')
  });
  
  // Track Profile Menu open/close
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let timer;
    const savedScroll = sessionStorage.getItem('super-sidebar-scroll');
    if (savedScroll) {
      const scrollVal = parseInt(savedScroll, 10);
      container.scrollTop = scrollVal;
      timer = setTimeout(() => {
        container.scrollTop = scrollVal;
      }, 50);
    }

    const handleScroll = () => {
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

  const menuSections = [
    {
      type: 'link',
      label: 'Dashboard',
      path: '/super-admin/dashboard',
      icon: <LayoutDashboard size={18} />
    },
    {
      type: 'header',
      label: 'OPERATIONS'
    },
    {
      type: 'link',
      label: 'Service Requests',
      path: '/super-admin/requests',
      icon: <ClipboardList size={18} />
    },
    {
      type: 'link',
      label: 'Live Tracking',
      path: '/super-admin/tracking',
      icon: <MapPin size={18} />
    },
    {
      type: 'link',
      label: 'Job Assignment',
      path: '/super-admin/assignment',
      icon: <ClipboardList size={18} />
    },
    {
      type: 'link',
      label: 'Escalations',
      path: '/super-admin/complaints',
      icon: <AlertTriangle size={18} />
    },
    {
      type: 'header',
      label: 'NETWORK'
    },
    {
      type: 'link',
      label: 'ASM Management',
      path: '/super-admin/asm',
      icon: <Users size={18} />
    },
    {
      type: 'link',
      label: 'Service Partners',
      path: '/super-admin/service-partners',
      icon: <Building size={18} />
    },
    {
      type: 'link',
      label: 'Technical Team',
      path: '/super-admin/technicians',
      icon: <UserCheck size={18} />
    },
    {
      type: 'header',
      label: 'BUSINESS'
    },
    {
      type: 'link',
      label: 'NCC AMC',
      path: '/super-admin/amc',
      icon: <ClipboardList size={18} />
    },
    {
      type: 'link',
      label: 'NCC Shield (Warranty)',
      path: '/super-admin/warranty',
      icon: <Shield size={18} />
    },
    {
      type: 'link',
      label: 'NCC Products',
      path: '/super-admin/products',
      icon: <Package size={18} />
    },
    {
      type: 'link',
      label: 'Orders & Returns',
      path: '/super-admin/orders',
      icon: <Truck size={18} />
    },
    {
      type: 'link',
      label: 'Inventory Management',
      path: '/super-admin/inventory',
      icon: <Package size={18} />
    },
    {
      type: 'collapsible',
      id: 'customerApp',
      label: 'Customer App Section',
      icon: <LayoutGrid size={18} />,
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
    {
      type: 'header',
      label: 'REWARDS & OFFERS'
    },
    {
      type: 'link',
      label: 'Rewards Program',
      path: '/super-admin/loyalty-program?tab=rewards',
      icon: <Coins size={18} />
    },
    {
      type: 'link',
      label: 'Membership Plans',
      path: '/super-admin/loyalty-program?tab=membership',
      icon: <Award size={18} />
    },
    {
      type: 'link',
      label: 'Spin Wheel Config',
      path: '/super-admin/loyalty-program?tab=spinwheel',
      icon: <RefreshCw size={18} />
    },
    {
      type: 'link',
      label: 'Referrals Program',
      path: '/super-admin/loyalty-program?tab=referrals',
      icon: <Users size={18} />
    },
    {
      type: 'link',
      label: 'Coupon Codes',
      path: '/super-admin/loyalty-program?tab=coupons',
      icon: <Ticket size={18} />
    },
    {
      type: 'header',
      label: 'BRANDS'
    },
    {
      type: 'link',
      label: 'Brand Partners',
      path: '/super-admin/brands',
      icon: <Building size={18} />
    },
    {
      type: 'link',
      label: 'Warranty Verification',
      path: '/super-admin/warranty-verification',
      icon: <CheckCircle size={18} />
    },
    {
      type: 'link',
      label: 'Spare Parts Control',
      path: '/super-admin/spare-parts',
      icon: <Wrench size={18} />
    },
    {
      type: 'link',
      label: 'Escalation Desk',
      path: '/super-admin/escalation-desk',
      icon: <Headphones size={18} />
    },
    {
      type: 'header',
      label: 'MARKETING & MEDIA'
    },
    {
      type: 'link',
      label: 'Videos Management',
      path: '/super-admin/videos',
      icon: <Video size={18} />
    },
    {
      type: 'link',
      label: 'Advertisements',
      path: '/super-admin/advertisements',
      icon: <Megaphone size={18} />
    },
    {
      type: 'link',
      label: 'Push Notifications',
      path: '/super-admin/notifications',
      icon: <Bell size={18} />
    },
    {
      type: 'header',
      label: 'FINANCE'
    },
    {
      type: 'link',
      label: 'Revenue Dashboard',
      path: '/super-admin/revenue',
      icon: <TrendingUp size={18} />
    },
    {
      type: 'link',
      label: 'Partner Payouts',
      path: '/super-admin/payouts',
      icon: <CreditCard size={18} />
    },
    {
      type: 'link',
      label: 'Invoices & GST',
      path: '/super-admin/billing',
      icon: <FileText size={18} />
    },
    {
      type: 'link',
      label: 'Transactions',
      path: '/super-admin/transactions',
      icon: <DollarSign size={18} />
    },
    {
      type: 'header',
      label: 'SYSTEM'
    },
    {
      type: 'link',
      label: 'Roles & Permissions',
      path: '/super-admin/roles',
      icon: <Lock size={18} />
    },
    {
      type: 'link',
      label: 'Cities & Territories',
      path: '/super-admin/cities',
      icon: <MapPin size={18} />
    },
    {
      type: 'link',
      label: 'CMS & Pages',
      path: '/super-admin/cms',
      icon: <FileText size={18} />
    },
    {
      type: 'link',
      label: 'Audit Logs',
      path: '/super-admin/logs',
      icon: <Clock size={18} />
    },
    {
      type: 'link',
      label: 'Settings',
      path: '/super-admin/settings',
      icon: <Settings size={18} />
    }
  ];

  return (
    <div className="w-64 bg-[#F4F7FE] h-screen border-r border-[#E2E8F0] flex flex-col fixed left-0 top-0 z-20">
      {/* Premium Logo Header */}
      <div className="p-5 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Nigam Care Logo" className="h-9 w-9 object-contain" />
          <div>
            <div className="flex items-center">
              <span className="text-base font-extrabold text-[#0D47A1] tracking-tight">NIGAM</span>
              <span className="text-base font-extrabold text-[#FFB300] tracking-tight ml-1">CARE</span>
            </div>
            <p className="text-[10px] text-[#64748B] font-bold tracking-wider leading-none mt-0.5">SUPER ADMIN</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {menuSections.map((item, idx) => {
          if (item.type === 'header') {
            return (
              <div 
                key={idx} 
                className="px-6 pt-5 pb-1 text-[10px] font-black text-[#8A95A5] tracking-widest"
              >
                {item.label}
              </div>
            );
          }

          if (item.type === 'collapsible') {
            const isAnySubActive = item.subItems.some(sub => 
              location.pathname + location.search === sub.path || 
              (sub.path.includes('categories') && location.pathname + location.search === '/super-admin/customer-app-customization')
            );
            const isOpen = openSections[item.id];
            return (
              <div key={idx} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setOpenSections(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`flex items-center justify-between w-full mx-3 py-2 text-sm font-semibold transition-colors cursor-pointer text-left rounded-lg max-w-[232px] px-3 ${
                    isAnySubActive 
                      ? 'text-[#0D47A1] bg-[#E8F0FE]' 
                      : 'text-[#5F6368] hover:text-[#1E293B] hover:bg-[#EAEFF9]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {isOpen && (
                  <div className="flex flex-col pl-4 border-l border-slate-200 ml-8 mb-1 mt-1 gap-1">
                    {item.subItems.map((sub, sIdx) => {
                      const isSubActive = 
                        location.pathname + location.search === sub.path || 
                        (sub.path.includes('categories') && location.pathname + location.search === '/super-admin/customer-app-customization');
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
                            pl-3 py-1.5 text-xs font-semibold rounded-md transition-colors block max-w-[180px]
                            ${isSubActive 
                              ? 'text-[#0D47A1] bg-[#E8F0FE] font-bold' 
                              : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#EAEFF9]'}
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

          // Default link item
          const isLinkActive = item.path.includes('?') 
            ? location.pathname + location.search === item.path 
            : location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (scrollContainerRef.current) {
                  sessionStorage.setItem('super-sidebar-scroll', scrollContainerRef.current.scrollTop.toString());
                }
              }}
              className={`
                flex items-center gap-3 mx-3 px-3 py-2 text-sm font-semibold rounded-lg transition-colors max-w-[232px]
                ${isLinkActive 
                  ? 'text-[#0D47A1] bg-[#E8F0FE]' 
                  : 'text-[#5F6368] hover:text-[#1E293B] hover:bg-[#EAEFF9]'}
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Profile Box Footer with popup options */}
      <div className="relative p-4 border-t border-[#E2E8F0] bg-white">
        {isProfileMenuOpen && (
          <div className="absolute bottom-16 left-4 right-4 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button 
              onClick={() => {
                setIsProfileMenuOpen(false);
                navigate('/super-admin/settings');
              }}
              className="w-full text-left px-4 py-2 text-xs text-[#1E293B] hover:bg-[#F8FAFC] transition-colors font-semibold"
            >
              System Settings
            </button>
            <button 
              onClick={() => {
                setIsProfileMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold border-t border-[#F1F5F9]"
            >
              Logout
            </button>
          </div>
        )}
        <div 
          onClick={() => setIsProfileMenuOpen(prev => !prev)}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-xs select-none flex-shrink-0">
              SA
            </div>
            <div className="truncate min-w-0 leading-tight">
              <p className="text-xs font-bold text-[#1E293B] truncate">Super Admin</p>
              <p className="text-[10px] text-[#64748B] truncate">superadmin@ncc.com</p>
            </div>
          </div>
          <ChevronDown size={14} className={`text-[#64748B] flex-shrink-0 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-1">Log Out</h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  navigate('/super-admin/login');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
