import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, Calendar, User } from "lucide-react";
import { getCustomerActiveTab } from "./AppChrome";

/**
 * CustomerBottomNav — the mobile (lg:hidden) tab bar for the customer panel.
 *
 * Previously copy-pasted into ~15 pages with drifting styles (Dashboard's
 * plain color-only active state vs Categories/Bookings/Profile's pill +
 * indicator treatment). This is the pill+indicator version, as one component,
 * so every page agrees. The active tab is derived from the current route via
 * the same table CustomerTopNav uses on desktop, so the two navs never
 * disagree about which tab is "on".
 *
 * `buyPath` lets a page override where the Buy tab goes (Dashboard sends
 * users with an in-warranty appliance to /extend-warranty instead of /buy).
 * `onBuyClick` lets a page fully override the Buy tab's click behavior
 * (Buy.jsx resets its own in-page wizard to step 1 instead of navigating).
 * `activePage` overrides the route-derived active tab, for a couple of pages
 * (e.g. Exchange) whose route isn't in CustomerTopNav's tab table but which
 * still conceptually belong under one of the five tabs.
 */
const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: Home, path: "/dashboard" },
  { id: "categories", label: "Categories", Icon: LayoutGrid, path: "/categories" },
  { id: "buy", label: "Buy", Icon: ShoppingCart, path: "/buy" },
  { id: "bookings", label: "Bookings", Icon: Calendar, path: "/bookings" },
  { id: "account", label: "Account", Icon: User, path: "/profile" },
];

const CustomerBottomNav = ({ buyPath, onBuyClick, activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = activePage || getCustomerActiveTab(location.pathname);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-border-color px-3 sm:px-8 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map(({ id, label, Icon, path }) => {
        const isActive = activeTab === id;
        const target = id === "buy" && buyPath ? buyPath : path;
        const handleClick = id === "buy" && onBuyClick ? onBuyClick : () => navigate(target);
        return (
          <button
            key={id}
            onClick={handleClick}
            className={`flex flex-col items-center justify-center relative py-1 px-2.5 cursor-pointer transition-colors ${
              isActive ? "text-brand-blue" : "text-slate-500 hover:text-brand-blue"
            }`}
          >
            {isActive && (
              <div className="absolute top-0 w-8 h-1 bg-brand-blue rounded-b-full shadow-2xs" />
            )}
            <div className={isActive ? "p-1 rounded-xl bg-blue-50/90 text-brand-blue" : ""}>
              <Icon className="h-5 w-5" />
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-bold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CustomerBottomNav;
