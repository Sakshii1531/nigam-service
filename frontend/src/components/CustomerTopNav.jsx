import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, Calendar, User, Bell, ChevronDown } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useAppLogo } from "../context/LogoContext";
import defaultLogo from "../assets/nigam-care.png";

/**
 * CustomerTopNav — Enhanced Sticky Top Navigation for Customer Panel (Desktop lg+).
 */
const CustomerTopNav = ({ activePage = "home" }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { logoUrl, rawLogoUrl } = useAppLogo();

  const navItems = [
    { id: "home",       label: "Home",       Icon: Home,         path: "/dashboard" },
    { id: "categories", label: "Categories", Icon: LayoutGrid,   path: "/categories" },
    { id: "buy",        label: "Buy",        Icon: ShoppingCart, path: "/buy" },
    { id: "bookings",   label: "Bookings",   Icon: Calendar,     path: "/bookings" },
    { id: "account",    label: "Account",    Icon: User,         path: "/profile" },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const firstName = user?.name ? user.name.split(" ")[0] : "Account";

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-16 bg-[#051F42]/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_20px_rgba(5,31,66,0.25)]">
      <div className="max-w-screen-xl mx-auto w-full px-6 xl:px-8 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
          onClick={() => navigate("/dashboard")}
        >
          <img
            src={logoUrl}
            alt="Nigam Care"
            className={`h-8.5 w-auto object-contain group-hover:scale-105 transition-transform duration-200 ${
              rawLogoUrl ? '' : 'invert brightness-200'
            }`}
          />
        </div>

        {/* Navigation Items Pill Container */}
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

        {/* Right Side Actions: Bell & User Profile */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notification Bell */}
          <button
            onClick={() => navigate("/notifications")}
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

          {/* User Profile Pill */}
          <div
            onClick={() => navigate("/profile")}
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

export default CustomerTopNav;
