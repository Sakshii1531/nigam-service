import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  CheckSquare,
  Package,
  ShieldCheck,
  RefreshCcw,
  FileText,
  Receipt,
  Phone,
  CreditCard,
  TrendingUp,
  Users,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  Headphones
} from 'lucide-react';

const Sidebar = () => {
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sparePartsOpen, setSparePartsOpen] = useState(
    location.pathname === '/brand-admin/part-requests' ||
    location.pathname === '/brand-admin/inventory'
  );

  useEffect(() => {
    if (location.pathname === '/brand-admin/part-requests' || location.pathname === '/brand-admin/inventory') {
      setSparePartsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let timer;
    const savedScroll = sessionStorage.getItem('brand-sidebar-scroll');
    if (savedScroll) {
      const scrollVal = parseInt(savedScroll, 10);
      container.scrollTop = scrollVal;
      timer = setTimeout(() => { container.scrollTop = scrollVal; }, 50);
    }
    const handleScroll = () => {
      if (container.scrollTop > 0 || container.scrollHeight > container.clientHeight) {
        sessionStorage.setItem('brand-sidebar-scroll', container.scrollTop.toString());
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => { container.removeEventListener('scroll', handleScroll); if (timer) clearTimeout(timer); };
  }, []);

  const saveScroll = () => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem('brand-sidebar-scroll', scrollContainerRef.current.scrollTop.toString());
    }
  };

  const navLink = ({ isActive }) =>
    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap ' +
    (isActive ? 'bg-[#1565C0] text-white shadow-sm' : 'text-blue-100 hover:bg-[#1a3a8a] hover:text-white');

  return (
    <div className="w-64 bg-[#0D2B6B] h-screen flex flex-col fixed left-0 top-0 z-20">
      <div ref={scrollContainerRef} className="p-4 overflow-y-auto flex-1 pb-2 scrollbar-thin">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-5 px-1 py-1">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-[#0D47A1] font-black text-sm">BP</span>
          </div>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">Brand Admin</span>
            <span className="text-[10px] text-blue-200 font-bold tracking-widest uppercase">Brand Panel</span>
          </div>
        </div>

        {/* Dashboard standalone */}
        <NavLink to="/brand-admin/dashboard" onClick={saveScroll}
          className={({ isActive }) =>
            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all mb-4 whitespace-nowrap ' +
            (isActive ? 'bg-[#1565C0] text-white shadow-md' : 'text-blue-100 hover:bg-[#1a3a8a] hover:text-white')
          }
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        <nav className="space-y-5">

          {/* COMPLAINT MANAGEMENT */}
          <div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Complaint Management
            </span>
            <div className="space-y-0.5">
              <NavLink to="/brand-admin/requests" onClick={saveScroll} className={navLink}>
                <Plus size={14} /><span>Register Complaint</span>
                <span className="ml-auto bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">New</span>
              </NavLink>
              <NavLink to="/brand-admin/complaints" onClick={saveScroll} className={navLink}>
                <ClipboardList size={14} /><span>All Complaints</span>
              </NavLink>
              <NavLink to="/brand-admin/complaint-monitoring" onClick={saveScroll} className={navLink}>
                <BarChart3 size={14} /><span>Complaint Monitoring</span>
              </NavLink>
              <NavLink to="/brand-admin/escalations" onClick={saveScroll}
                className={({ isActive }) =>
                  'flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap ' +
                  (isActive ? 'bg-[#1565C0] text-white' : 'text-blue-100 hover:bg-[#1a3a8a] hover:text-white')
                }
              >
                <span className="flex items-center gap-2.5"><AlertTriangle size={14} /><span>Escalations</span></span>
                <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">23</span>
              </NavLink>
            </div>
          </div>

          {/* SERVICE & OPERATIONS */}
          <div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Service &amp; Operations
            </span>
            <div className="space-y-0.5">
              <NavLink to="/brand-admin/service-completion" onClick={saveScroll} className={navLink}>
                <CheckSquare size={14} /><span>Service Completion Monitor</span>
              </NavLink>

              {/* Spare Parts collapsible */}
              <button
                onClick={() => setSparePartsOpen(!sparePartsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-blue-100 hover:bg-[#1a3a8a] hover:text-white transition-all whitespace-nowrap"
              >
                <span className="flex items-center gap-2.5 flex-shrink-0"><Package size={14} /><span>Spare Parts Management</span></span>
                <ChevronRight size={12} className={'transition-transform duration-200 flex-shrink-0 ' + (sparePartsOpen ? 'rotate-90' : '')} />
              </button>
              {sparePartsOpen && (
                <div className="ml-4 space-y-0.5 border-l-2 border-blue-700/50 pl-3 pb-1">
                  <NavLink to="/brand-admin/part-requests" onClick={saveScroll}
                    className={({ isActive }) =>
                      'flex items-center px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ' +
                      (isActive ? 'bg-[#1565C0] text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-[#1a3a8a]')
                    }
                  >Part Requests</NavLink>
                  <NavLink to="/brand-admin/inventory" onClick={saveScroll}
                    className={({ isActive }) =>
                      'flex items-center px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ' +
                      (isActive ? 'bg-[#1565C0] text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-[#1a3a8a]')
                    }
                  >Inventory</NavLink>
                </div>
              )}

              <NavLink to="/brand-admin/warranty" onClick={saveScroll} className={navLink}>
                <ShieldCheck size={14} /><span>Warranty Verification</span>
              </NavLink>
              <NavLink to="/brand-admin/replacement-approvals" onClick={saveScroll} className={navLink}>
                <RefreshCcw size={14} /><span>Replacement Approvals</span>
              </NavLink>
              <NavLink to="/brand-admin/documents" onClick={saveScroll} className={navLink}>
                <FileText size={14} /><span>Letter &amp; Document Center</span>
              </NavLink>
            </div>
          </div>

          {/* FINANCE & BILLING */}
          <div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Finance &amp; Billing
            </span>
            <div className="space-y-0.5">
              <NavLink to="/brand-admin/invoices" onClick={saveScroll} className={navLink}>
                <Receipt size={14} /><span>Invoices &amp; Billing</span>
              </NavLink>
              <NavLink to="/brand-admin/call-rates" onClick={saveScroll} className={navLink}>
                <Phone size={14} /><span>Call Rates &amp; Charges</span>
              </NavLink>
              <NavLink to="/brand-admin/payments" onClick={saveScroll} className={navLink}>
                <CreditCard size={14} /><span>Payments</span>
              </NavLink>
              <NavLink to="/brand-admin/reports" onClick={saveScroll} className={navLink}>
                <TrendingUp size={14} /><span>Reports &amp; Analytics</span>
              </NavLink>
            </div>
          </div>

          {/* ADMINISTRATION */}
          <div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Administration
            </span>
            <div className="space-y-0.5">
              <NavLink to="/brand-admin/users" onClick={saveScroll} className={navLink}>
                <Users size={14} /><span>User &amp; Role Management</span>
              </NavLink>
              <NavLink to="/brand-admin/teams" onClick={saveScroll} className={navLink}>
                <Building2 size={14} /><span>Teams &amp; Departments</span>
              </NavLink>
              <NavLink to="/brand-admin/settings" onClick={saveScroll} className={navLink}>
                <Settings size={14} /><span>Settings</span>
              </NavLink>
            </div>
          </div>

        </nav>
      </div>

      {/* Bottom: Quick Help + Logout */}
      <div className="p-3 border-t border-[#1a3a8a]">
        <div className="bg-[#1a3580]/60 rounded-xl p-3 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Headphones size={13} className="text-blue-300" />
            <p className="text-[10px] font-bold text-white">Quick Help</p>
          </div>
          <p className="text-[9px] text-blue-300 mb-1">Customer Care Support</p>
          <p className="text-xs font-bold text-[#FFD600]">1800-123-4567</p>
          <p className="text-[9px] text-blue-300 mt-0.5">24x7 Support Available</p>
        </div>
        <button
          onClick={() => navigate('/brand-admin/login')}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-[11px] font-medium text-blue-300 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

