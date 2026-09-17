import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  Calendar,
  User,
  Bell,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useAppLogo } from "../context/LogoContext";
import { useLocationContext } from "../context/LocationContext";
import clickIcon from "../assets/CLICK.png";
import handshakeIcon from "../assets/HANDSHAKE.png";

/**
 * CustomerTopNav — Enhanced Sticky Top Navigation for Customer Panel (Desktop lg+).
 */
const CustomerTopNav = ({ activePage = "home" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { logoUrl } = useAppLogo();
  const { currentLocation, openLocationModal } = useLocationContext();

  const isWarranty = location.pathname.includes("partner-warranty");

  const navItems = [
    { id: "home", label: "Home", Icon: Home, path: "/dashboard" },
    {
      id: "categories",
      label: "Categories",
      Icon: LayoutGrid,
      path: "/categories",
    },
    { id: "buy", label: "Buy", Icon: ShoppingCart, path: "/buy" },
    { id: "bookings", label: "Bookings", Icon: Calendar, path: "/bookings" },
    { id: "account", label: "Account", Icon: User, path: "/profile" },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const firstName = user?.name ? user.name.split(" ")[0] : "Account";

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-20 bg-brand-navy/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_20px_rgba(5,31,66,0.25)]">
      <div className="max-w-screen-2xl mx-auto w-full px-6 md:px-10 lg:px-16 xl:px-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
          onClick={() => navigate("/dashboard")}>
          <img
            src={logoUrl}
            alt="Nigam Care"
            className="h-14 lg:h-15 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Quick Access Toggle — Book Service vs Partner Warranty */}
        <div className="flex bg-black/30 p-1.5 rounded-full border border-white/10 shadow-inner items-center flex-shrink-0">
          <button
            onClick={() => navigate("/dashboard")}
            className={`py-1.5 px-3.5 rounded-full transition-all duration-200 flex items-center gap-2 text-left cursor-pointer ${
              !isWarranty
                ? "bg-brand-yellow text-brand-navy font-black shadow-md scale-[1.02]"
                : "text-slate-200 hover:text-white"
            }`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                !isWarranty ? "bg-white text-black shadow-xs" : "bg-white/10"
              }`}>
              <img
                src={clickIcon}
                alt="Book Service"
                className="w-4.5 h-4.5 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black leading-tight">
                Book Service
              </span>
              <span className="text-[8px] font-bold opacity-80 leading-none">
                Any Brand
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate("/partner-warranty")}
            className={`py-1.5 px-3.5 rounded-full transition-all duration-200 flex items-center gap-2 text-left cursor-pointer ${
              isWarranty
                ? "bg-brand-yellow text-brand-navy font-black shadow-md scale-[1.02]"
                : "text-slate-200 hover:text-white"
            }`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                isWarranty
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-white/10"
              }`}>
              <img
                src={handshakeIcon}
                alt="Partner Warranty"
                className="w-4.5 h-4.5 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black leading-tight">
                Partner Warranty
              </span>
              <span className="text-[8px] font-bold opacity-80 leading-none">
                Partner Brands
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Items Pill Container */}
        <div className="flex items-center gap-2 lg:gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xs flex-shrink-0">
          {navItems.map(({ id, label, Icon, path }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-brand-yellow to-brand-yellow/80 text-brand-navy shadow-[0_2px_10px_rgba(255,212,0,0.3)] scale-[1.02]"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}>
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-brand-navy" : "text-slate-300"}`}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Deliver To / Location Button */}
        <button
          type="button"
          onClick={openLocationModal}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 transition-all text-left cursor-pointer group flex-shrink-0"
          aria-label="Change location">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-[#FFD600] flex items-center justify-center">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-300 font-semibold leading-tight">
              Deliver &amp; Service to
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white group-hover:text-brand-yellow transition-colors max-w-[140px] truncate">
                {currentLocation?.area
                  ? `${currentLocation.area}, ${currentLocation.city}`
                  : currentLocation?.city || "Select Location"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-yellow transition-all shrink-0" />
            </div>
          </div>
        </button>

        {/* Right Side Actions: Bell & User Profile */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center transition-all cursor-pointer group shadow-2xs"
            title="Notifications">
            <Bell className="h-4.5 w-4.5 text-slate-200 group-hover:text-white group-hover:rotate-12 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-brand-navy animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 transition-all cursor-pointer group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-yellow to-brand-yellow/80 text-brand-navy flex items-center justify-center font-black text-xs shadow-xs">
              {userInitial}
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-white max-w-[100px] truncate">
              {firstName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default CustomerTopNav;
