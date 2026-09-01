import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ClipboardList, Wrench, Calendar, User, Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

/**
 * TechTopNav — Enhanced Sticky Top Navigation for Technician Panel (Desktop lg+).
 */
const TechTopNav = ({ activePage = "jobs" }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  const navItems = [
    { id: "jobs",      label: "Jobs",      Icon: Briefcase,    path: "/technician/dashboard" },
    { id: "requests",  label: "Requests",  Icon: ClipboardList,path: "/technician/raise-part-request?tab=claims" },
    { id: "inventory", label: "Inventory", Icon: Wrench,       path: "/technician/inventory" },
    { id: "schedule",  label: "Schedule",  Icon: Calendar,     path: "/technician/schedule" },
    { id: "profile",   label: "Profile",   Icon: User,         path: "/technician/profile" },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "T";
  const firstName = user?.name ? user.name.split(" ")[0] : "Partner";

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-20 bg-[#051F42]/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_20px_rgba(5,31,66,0.25)]">
      <div className="max-w-screen-xl mx-auto w-full px-6 xl:px-8 flex items-center justify-between">
        
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          onClick={() => navigate("/technician/dashboard")}
        >
          <div className="w-8.5 h-8.5 bg-gradient-to-tr from-[#FFD400] to-[#FFE566] rounded-xl flex items-center justify-center shadow-md ring-2 ring-white/20 group-hover:scale-105 transition-transform duration-200">
            <Wrench className="h-4.5 w-4.5 text-[#051F42]" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-sm tracking-wide leading-none">NCC Tech</span>
            <span className="text-[9px] font-bold text-amber-400 tracking-wider uppercase mt-0.5">Verified Partner</span>
          </div>
        </div>

        {/* Nav Items Pill Container */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs">
          {navItems.map(({ id, label, Icon, path }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#FFD400] to-[#FFCA00] text-[#051F42] shadow-[0_2px_10px_rgba(255,212,0,0.3)] scale-[1.02]"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#051F42]" : "text-slate-300"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Bell + Avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate("/technician/notifications")}
            className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5 text-slate-200 group-hover:text-white group-hover:rotate-12 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border-2 border-[#051F42] shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <div
            onClick={() => navigate("/technician/profile")}
            className="flex items-center gap-2.5 bg-white/5 hover:bg-white/12 border border-white/10 p-1 pr-3.5 rounded-full cursor-pointer transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFD400] to-[#FFE566] text-[#051F42] font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              {userInitial}
            </div>
            <span className="text-xs font-bold text-white max-w-[110px] truncate">
              {firstName}
            </span>
          </div>
        </div>

      </div>
    </nav>
  );
};

export default TechTopNav;
