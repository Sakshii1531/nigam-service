import { useEffect, useRef } from 'react';
import Sidebar from '../super-admin/Sidebar';
import Topbar from '../super-admin/Topbar';
import { useAdminSidebar } from '../../context/AdminSidebarContext';
export default function AdminFrame({ title, subtitle, children }) {
  const { isSidebarOpen, closeSidebar } = useAdminSidebar();
  const initialized = useRef(false);
  useEffect(() => { if (!initialized.current) { initialized.current = true; if (window.innerWidth < 1024) closeSidebar(); } }, [closeSidebar]);
  return <div className="min-h-screen bg-[#F5F7FB] text-slate-800"><Sidebar /><main className={`min-w-0 transition-[margin] ${isSidebarOpen ? 'lg:ml-64' : ''}`}><Topbar title={title} subtitle={subtitle} /><div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 xl:p-8">{children}</div></main></div>;
}
