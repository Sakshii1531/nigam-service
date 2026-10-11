import { useWarrantyClaimLive } from '../../hooks/useWarrantyClaimLive';
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
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
  Headphones,

  Wrench,
  SlidersHorizontal
} from 'lucide-react';

const Sidebar = () => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openEscalations, setOpenEscalations] = useState(0);
  const [workCount,setWorkCount]=useState(0);
  const [supportPhone, setSupportPhone] = useState('');
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  // Re-reads the user's permissions every minute and on focus (docs/brand-crm Phase 2).
  const { canOpen, can } = useBrandPermissions({ poll: true });
  const anyOpen = (...paths) => paths.some((path) => canOpen(path));

  const [sparePartsOpen, setSparePartsOpen] = useState(
    location.pathname === '/brand-admin/part-requests' ||
    location.pathname === '/brand-admin/inventory'
  );

  useEffect(() => {
    if (location.pathname === '/brand-admin/part-requests' || location.pathname === '/brand-admin/inventory') {
      setSparePartsOpen(true);
    }
  }, [location.pathname]);

  const canEditTickets=can('tickets:edit');
  useEffect(()=>{
    if(!canEditTickets)return undefined;
    let active=true;
    const load=async()=>{try{const result=await apiRequest('/brand/my-work',{auth:true});if(active)setWorkCount(Object.values(result.counts).reduce((sum,v)=>sum+v,0));}catch{if(active)setWorkCount(0);}};
    load();const timer=setInterval(load,60000);window.addEventListener('brand:my-work-changed',load);
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('brand:my-work-changed',load);};
  },[canEditTickets]);
  const canSeeEscalations = can('escalations:view');
  useWarrantyClaimLive(() => window.dispatchEvent(new Event('brand:escalations-changed')), null, 'brand_admin');
  useEffect(() => {
    let cancelled = false;
    if (!canSeeEscalations) return undefined;

    const loadEscalationCount = async () => {
      try {
        const result = await apiRequest('/brand/escalations/open-count', { auth: true });
        if (!cancelled) {
          setOpenEscalations(Number.isFinite(result?.count) ? result.count : 0);
        }
      } catch {
        // A navigation badge must never prevent the brand panel from rendering.
        if (!cancelled) setOpenEscalations(0);
      }
    };

    loadEscalationCount();
    window.addEventListener('brand:escalations-changed', loadEscalationCount);
    return () => {
      cancelled = true;
      window.removeEventListener('brand:escalations-changed', loadEscalationCount);
    };
  }, [canSeeEscalations]);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/brand/settings', { auth: true, silentError: true })
      .then((settings) => { if (!cancelled) setSupportPhone(settings?.supportPhone || ''); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <span className="text-[#0D47A1] font-black text-sm">BP</span>
          </div>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">Brand Admin</span>
            <span className="text-[10px] text-blue-200 font-bold tracking-widest uppercase">Brand Panel</span>
          </div>
        </div>

        {/* Dashboard standalone */}
        {canOpen('/brand-admin/dashboard') && (
          <NavLink to="/brand-admin/dashboard" onClick={saveScroll}
            className={({ isActive }) =>
              'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all mb-4 whitespace-nowrap ' +
              (isActive ? 'bg-[#1565C0] text-white shadow-md' : 'text-blue-100 hover:bg-[#1a3a8a] hover:text-white')
            }
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>
        )}

        <nav className="space-y-5">

          {/* COMPLAINT MANAGEMENT */}
          {anyOpen('/brand-admin/requests', '/brand-admin/tickets', '/brand-admin/complaint-monitoring', '/brand-admin/escalations') && (<div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Complaint Management
            </span>
            <div className="space-y-0.5">
              {canEditTickets&&<NavLink to="/brand-admin/my-work" onClick={saveScroll} className={navLink}><Headphones size={14}/><span>My Work</span><span className="ml-auto text-[10px]">{workCount}</span></NavLink>}
              {canOpen('/brand-admin/requests') && (
                <NavLink to="/brand-admin/requests" onClick={saveScroll} className={navLink}>
                  <Plus size={14} /><span>Register Complaint</span>
                  <span className="ml-auto bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">New</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/tickets') && (
                <NavLink to="/brand-admin/tickets" onClick={saveScroll} className={p=>navLink({...p,isActive:p.isActive&&!location.search.includes('bucket=')})}>
                  <ClipboardList size={14} /><span>All Tickets</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/tickets')&&<NavLink to="/brand-admin/tickets?bucket=pending_approval" onClick={saveScroll} className={p=>navLink({...p,isActive:p.isActive&&location.search.includes('bucket=pending_approval')})}><ClipboardList size={14}/><span>Pending Approval</span></NavLink>}
              {canOpen('/brand-admin/complaint-monitoring') && (
                <NavLink to="/brand-admin/complaint-monitoring" onClick={saveScroll} className={navLink}>
                  <BarChart3 size={14} /><span>Complaint Monitoring</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/escalations') && (
                <NavLink to="/brand-admin/escalations" onClick={saveScroll}
                  className={({ isActive }) =>
                    'flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap ' +
                    (isActive ? 'bg-[#1565C0] text-white' : 'text-blue-100 hover:bg-[#1a3a8a] hover:text-white')
                  }
                >
                  <span className="flex items-center gap-2.5"><AlertTriangle size={14} /><span>Escalations</span></span>
                  {canSeeEscalations && openEscalations > 0 && (
                    <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {openEscalations}
                    </span>
                  )}
                </NavLink>
              )}
            </div>
          </div>)}

          {/* SERVICE & OPERATIONS */}
          {anyOpen('/brand-admin/service-completion', '/brand-admin/part-requests', '/brand-admin/inventory', '/brand-admin/catalog', '/brand-admin/warranty-claims', '/brand-admin/warranty', '/brand-admin/parts-claims', '/brand-admin/warranty-settings', '/brand-admin/replacement-approvals', '/brand-admin/documents') && (<div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Service &amp; Operations
            </span>
            <div className="space-y-0.5">
              {canOpen('/brand-admin/service-completion') && (
                <NavLink to="/brand-admin/service-completion" onClick={saveScroll} className={navLink}>
                  <CheckSquare size={14} /><span>Service Completion Monitor</span>
                </NavLink>
              )}

              {/* Spare Parts collapsible */}
              {anyOpen('/brand-admin/part-requests', '/brand-admin/inventory') && (<>
              <button
                onClick={() => setSparePartsOpen(!sparePartsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-blue-100 hover:bg-[#1a3a8a] hover:text-white transition-all whitespace-nowrap"
              >
                <span className="flex items-center gap-2.5 shrink-0"><Package size={14} /><span>Spare Parts Management</span></span>
                <ChevronRight size={12} className={'transition-transform duration-200 shrink-0 ' + (sparePartsOpen ? 'rotate-90' : '')} />
              </button>
              {sparePartsOpen && (
                <div className="ml-4 space-y-0.5 border-l-2 border-blue-700/50 pl-3 pb-1">
                  {canOpen('/brand-admin/part-requests') && (
                    <NavLink to="/brand-admin/part-requests" onClick={saveScroll}
                      className={({ isActive }) =>
                        'flex items-center px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ' +
                        (isActive ? 'bg-[#1565C0] text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-[#1a3a8a]')
                      }
                    >Part Requests</NavLink>
                  )}
                  {canOpen('/brand-admin/inventory') && (
                    <NavLink to="/brand-admin/inventory" onClick={saveScroll}
                      className={({ isActive }) =>
                        'flex items-center px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ' +
                        (isActive ? 'bg-[#1565C0] text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-[#1a3a8a]')
                      }
                    >Inventory</NavLink>
                  )}
                </div>
              )}
              </>)}

              {canOpen('/brand-admin/catalog') && (
                <NavLink to="/brand-admin/catalog" onClick={saveScroll} className={navLink}>
                  <Package size={14} /><span>Sub-Brands &amp; Catalog</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/warranty') && (
                <NavLink to="/brand-admin/warranty" onClick={saveScroll} className={navLink}>
                  <ShieldCheck size={14} /><span>Warranty Verification</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/parts-claims') && (
                <NavLink to="/brand-admin/parts-claims" onClick={saveScroll} className={navLink}>
                  <Wrench size={14} /><span>Parts Claims</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/warranty-settings') && (
                <NavLink to="/brand-admin/warranty-settings" onClick={saveScroll} className={navLink}>
                  <SlidersHorizontal size={14} /><span>Warranty Settings</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/replacement-approvals') && (
                <NavLink to="/brand-admin/replacement-approvals" onClick={saveScroll} className={navLink}>
                  <RefreshCcw size={14} /><span>Replacement Approvals</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/documents') && (
                <NavLink to="/brand-admin/documents" onClick={saveScroll} className={navLink}>
                  <FileText size={14} /><span>Letter &amp; Document Center</span>
                </NavLink>
              )}
            </div>
          </div>)}

          {/* FINANCE & BILLING */}
          {anyOpen('/brand-admin/invoices', '/brand-admin/call-rates', '/brand-admin/payments', '/brand-admin/reports') && (<div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Finance &amp; Billing
            </span>
            <div className="space-y-0.5">
              {canOpen('/brand-admin/invoices') && (
                <NavLink to="/brand-admin/invoices" onClick={saveScroll} className={navLink}>
                  <Receipt size={14} /><span>Invoices &amp; Billing</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/call-rates') && (
                <NavLink to="/brand-admin/call-rates" onClick={saveScroll} className={navLink}>
                  <Phone size={14} /><span>Call Rates &amp; Charges</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/payments') && (
                <NavLink to="/brand-admin/payments" onClick={saveScroll} className={navLink}>
                  <CreditCard size={14} /><span>Payments</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/reports') && (
                <NavLink to="/brand-admin/reports" onClick={saveScroll} className={navLink}>
                  <TrendingUp size={14} /><span>Reports &amp; Analytics</span>
                </NavLink>
              )}
            </div>
          </div>)}

          {/* ADMINISTRATION */}
          {anyOpen('/brand-admin/users', '/brand-admin/teams', '/brand-admin/settings', '/brand-admin/audit-log') && (<div>
            <span className="text-[11px] font-black text-[#93C5FD] uppercase tracking-widest px-3 block mb-1.5">
              Administration
            </span>
            <div className="space-y-0.5">
              {canOpen('/brand-admin/users') && (
                <NavLink to="/brand-admin/users" onClick={saveScroll} className={navLink}>
                  <Users size={14} /><span>User &amp; Role Management</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/teams') && (
                <NavLink to="/brand-admin/teams" onClick={saveScroll} className={navLink}>
                  <Building2 size={14} /><span>Teams &amp; Departments</span>
                </NavLink>
              )}
              {canOpen('/brand-admin/audit-log') && (<NavLink to="/brand-admin/audit-log" onClick={saveScroll} className={navLink}><FileText size={16}/>Audit log</NavLink>)}
              {canOpen('/brand-admin/settings') && (
                <NavLink to="/brand-admin/settings" onClick={saveScroll} className={navLink}>
                  <Settings size={14} /><span>Settings</span>
                </NavLink>
              )}
            </div>
          </div>)}

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
          <p className="text-xs font-bold text-[#FFD600]">{supportPhone || 'Not configured'}</p>
          <p className="text-[9px] text-blue-300 mt-0.5">24x7 Support Available</p>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-[11px] font-medium text-blue-300 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
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
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                  navigate('/brand-admin/login');
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
