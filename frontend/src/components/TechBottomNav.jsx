import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, ClipboardList, Wrench, Calendar, User } from 'lucide-react';

const TechBottomNav = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const currentSearch = location.search;

  const tabs = [
    {
      id: 'jobs',
      label: 'Jobs',
      icon: Briefcase,
      path: '/technician/dashboard',
      isActive: activeTab 
        ? activeTab === 'jobs' 
        : (currentPath === '/technician/dashboard' || currentPath === '/technician/active-job'),
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: ClipboardList,
      path: '/technician/raise-part-request?tab=claims',
      isActive: activeTab 
        ? activeTab === 'requests' 
        : (currentPath.includes('/technician/raise-part-request') && currentSearch.includes('tab=claims')),
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Wrench,
      path: '/technician/inventory',
      isActive: activeTab 
        ? activeTab === 'inventory' 
        : (currentPath === '/technician/inventory' || (currentPath.includes('/technician/raise-part-request') && currentSearch.includes('tab=inventory'))),
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      path: '/technician/schedule',
      isActive: activeTab 
        ? activeTab === 'schedule' 
        : currentPath === '/technician/schedule',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/technician/profile',
      isActive: activeTab 
        ? activeTab === 'profile' 
        : (currentPath === '/technician/profile' || currentPath.startsWith('/technician/personal-info')),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-40 px-3 py-2 flex justify-around items-center lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer select-none group relative ${
              active ? 'text-[#0D47A1]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Icon
                className={`h-5 w-5 transition-transform duration-200 ${
                  active ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
              {active && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#0D47A1] rounded-full animate-pulse" />
              )}
            </div>
            <span
              className={`text-[11px] mt-1 transition-all duration-200 ${
                active ? 'font-black text-[#0D47A1]' : 'font-semibold text-slate-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default TechBottomNav;
