import { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { usePageTitle } from "./hooks/usePageTitle";
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Warranty = lazy(() => import("./pages/Warranty"));
const Payment = lazy(() => import("./pages/Payment"));
const CardPayment = lazy(() => import("./pages/CardPayment"));
const UpiPayment = lazy(() => import("./pages/UpiPayment"));
const NetBankingPayment = lazy(() => import("./pages/NetBankingPayment"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const Booking = lazy(() => import("./pages/Booking"));
const OfferingLink = lazy(() => import("./pages/Booking").then((m) => ({ default: m.OfferingLink })));
const BookingFlow = lazy(() => import("./pages/BookingFlow"));
import { BookingProvider } from "./context/BookingContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AdminSidebarProvider } from "./context/AdminSidebarContext";
import { LogoProvider } from "./context/LogoContext";
import { ToastProvider } from "./context/ToastContext";
const Chat = lazy(() => import("./pages/Chat"));
const AllServices = lazy(() => import("./pages/AllServices"));
const Categories = lazy(() => import("./pages/Categories"));
const AllCleaningServices = lazy(() => import("./pages/AllCleaningServices"));
const AllApplianceServices = lazy(() => import("./pages/AllApplianceServices"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const SearchingPartner = lazy(() => import("./pages/SearchingPartner"));
const RefrigeratorDetails = lazy(() => import("./pages/RefrigeratorDetails"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingDetails = lazy(() => import("./pages/BookingDetails"));
const Profile = lazy(() => import("./pages/Profile"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const SavedAddresses = lazy(() => import("./pages/SavedAddresses"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Buy = lazy(() => import("./pages/Buy"));
const AMC = lazy(() => import("./pages/AMC"));
const Exchange = lazy(() => import("./pages/Exchange"));
const BuyNew = lazy(() => import("./pages/BuyNew"));
const ExtendWarranty = lazy(() => import("./pages/ExtendWarranty"));
const BuyProduct = lazy(() => import("./pages/BuyProduct"));
const PartnerWarranty = lazy(() => import("./pages/PartnerWarranty"));
const SelectBrand = lazy(() => import("./pages/SelectBrand"));
const SelectProduct = lazy(() => import("./pages/SelectProduct"));
const SelectIssue = lazy(() => import("./pages/SelectIssue"));
const RaiseWarrantyRequest = lazy(() => import("./pages/RaiseWarrantyRequest"));
const TicketSuccess = lazy(() => import("./pages/TicketSuccess"));
const TrackTicket = lazy(() => import("./pages/TrackTicket"));
const TicketDetails = lazy(() => import("./pages/TicketDetails"));
const ServiceUpdates = lazy(() => import("./pages/ServiceUpdates"));
const RateService = lazy(() => import("./pages/RateService"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const MyWishlist = lazy(() => import("./pages/MyWishlist"));
const Coupons = lazy(() => import("./pages/Coupons"));
const FinanceDetails = lazy(() => import("./pages/FinanceDetails"));
const RewardsPlayZone = lazy(() => import("./pages/RewardsPlayZone"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const ExchangeDetails = lazy(() => import("./pages/ExchangeDetails"));
const ReferEarn = lazy(() => import("./pages/ReferEarn"));
const ServicePartner = lazy(() => import("./pages/ServicePartner"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Faqs = lazy(() => import("./pages/Faqs"));
const AboutNCC = lazy(() => import("./pages/AboutNCC"));
const AreaNotServiceable = lazy(() => import("./pages/AreaNotServiceable"));
import { LocationProvider } from "./context/LocationContext";
import LocationModal from "./components/common/LocationModal";
import { getActiveCities, isCityServiceable } from "./utils/serviceableCities";
const CmsDocViewer = lazy(() => import("./pages/CmsDocViewer"));
const AllBrands = lazy(() => import("./pages/AllBrands"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ServiceProviderLogin = lazy(() => import("./pages/service-provider/Login"));
import { ServiceProviderProvider } from "./context/ServiceProviderContext";
const BrandLogin = lazy(() => import("./pages/brand-admin/Login"));
const BrandDashboard = lazy(() => import("./pages/brand-admin/Dashboard"));
const BrandRequests = lazy(() => import("./pages/brand-admin/Requests"));
const BrandWarranty = lazy(() => import("./pages/brand-admin/Warranty"));
const BrandServiceProviders = lazy(() => import("./pages/brand-admin/ServiceProviders"));
const BrandInventory = lazy(() => import("./pages/brand-admin/Inventory"));
const BrandPartRequests = lazy(() => import("./pages/brand-admin/PartRequests"));
const BrandInvoices = lazy(() => import("./pages/brand-admin/Invoices"));
const BrandCustomers = lazy(() => import("./pages/brand-admin/Customers"));
const BrandNotifications = lazy(() => import("./pages/brand-admin/Notifications"));
const BrandReports = lazy(() => import("./pages/brand-admin/Reports"));
const BrandSettings = lazy(() => import("./pages/brand-admin/Settings"));
const BrandAMCs = lazy(() => import("./pages/brand-admin/AMCs"));
const BrandExchanges = lazy(() => import("./pages/brand-admin/Exchanges"));
const BrandWarrantyClaims = lazy(() => import("./pages/brand-admin/WarrantyClaims"));
const BrandCatalog = lazy(() => import("./pages/brand-admin/Catalog"));
const BrandReviews = lazy(() => import("./pages/brand-admin/Reviews"));
const BrandChat = lazy(() => import("./pages/brand-admin/Chat"));
const BrandAcademy = lazy(() => import("./pages/brand-admin/Academy"));
const BrandReverseLogistics = lazy(() => import("./pages/brand-admin/ReverseLogistics"));
const BrandComplaintMonitoring = lazy(() => import("./pages/brand-admin/ComplaintMonitoring"));
const BrandEscalations = lazy(() => import("./pages/brand-admin/Escalations"));
const BrandServiceCompletionMonitor = lazy(() => import("./pages/brand-admin/ServiceCompletionMonitor"));
const BrandReplacementApprovals = lazy(() => import("./pages/brand-admin/ReplacementApprovals"));
const BrandLetterDocumentCenter = lazy(() => import("./pages/brand-admin/LetterDocumentCenter"));
const BrandCallRatesCharges = lazy(() => import("./pages/brand-admin/CallRatesCharges"));
const BrandPayments = lazy(() => import("./pages/brand-admin/Payments"));
const BrandUserRoleManagement = lazy(() => import("./pages/brand-admin/UserRoleManagement"));
const BrandTeamsDepartments = lazy(() => import("./pages/brand-admin/TeamsDepartments"));
const BrandRegisterComplaint = lazy(() => import("./pages/brand-admin/RegisterComplaint"));
const ServiceProviderApply = lazy(() => import("./pages/service-provider/Apply"));
const SuperAdminLogin = lazy(() => import("./pages/super-admin/Login"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const SuperAdminUsers = lazy(() => import("./pages/super-admin/Users"));
const SuperAdminServiceProviders = lazy(() => import("./pages/super-admin/ServiceProviders"));
const SuperAdminCityChangeRequests = lazy(() => import("./pages/super-admin/CityChangeRequests"));
const SuperAdminBrands = lazy(() => import("./pages/super-admin/Brands"));
const SuperAdminRequests = lazy(() => import("./pages/super-admin/Requests"));
const SuperAdminWarranty = lazy(() => import("./pages/super-admin/Warranty"));
const SuperAdminAssignment = lazy(() => import("./pages/super-admin/Assignment"));
const SuperAdminTracking = lazy(() => import("./pages/super-admin/Tracking"));
const SuperAdminInventory = lazy(() => import("./pages/super-admin/Inventory"));
const SuperAdminPartRequests = lazy(() => import("./pages/super-admin/PartRequests"));
const SuperAdminOrders = lazy(() => import("./pages/super-admin/Orders"));
const SuperAdminBilling = lazy(() => import("./pages/super-admin/Billing"));
const SuperAdminComplaints = lazy(() => import("./pages/super-admin/Complaints"));
const SuperAdminSupport = lazy(() => import("./pages/super-admin/Support"));
const SuperAdminNotifications = lazy(() => import("./pages/super-admin/Notifications"));
const SuperAdminReports = lazy(() => import("./pages/super-admin/Reports"));
const SuperAdminCities = lazy(() => import("./pages/super-admin/Cities"));
const SuperAdminRoles = lazy(() => import("./pages/super-admin/Roles"));
const SuperAdminSettings = lazy(() => import("./pages/super-admin/Settings"));
const SuperAdminLogs = lazy(() => import("./pages/super-admin/Logs"));
const CustomerAppCustomization = lazy(() => import("./pages/super-admin/CustomerAppCustomization"));
const SuperAdminExchangeOffers = lazy(() => import("./pages/super-admin/ExchangeOffers"));
const SuperAdminASM = lazy(() => import("./pages/super-admin/ASM"));
const SuperAdminASMDetail = lazy(() => import("./pages/super-admin/ASMDetail"));
const SuperAdminAMC = lazy(() => import("./pages/super-admin/AMC"));
const SuperAdminProducts = lazy(() => import("./pages/super-admin/Products"));
const SuperAdminProductCategories = lazy(() => import("./pages/super-admin/ProductCategories"));
const SuperAdminWarrantyVerification = lazy(() => import("./pages/super-admin/WarrantyVerification"));
const SuperAdminMasterCatalogue = lazy(() => import("./pages/super-admin/MasterCatalogue"));
const SuperAdminEscalationDesk = lazy(() => import("./pages/super-admin/EscalationDesk"));
const SuperAdminStories = lazy(() => import("./pages/super-admin/Stories"));
const SuperAdminVideos = lazy(() => import("./pages/super-admin/Videos"));
const SuperAdminAdvertisements = lazy(() => import("./pages/super-admin/Advertisements"));
const SuperAdminRevenue = lazy(() => import("./pages/super-admin/Revenue"));
const SuperAdminPlans = lazy(() => import("./pages/super-admin/Plans"));
const SuperAdminTransactions = lazy(() => import("./pages/super-admin/Transactions"));
const SuperAdminCMS = lazy(() => import("./pages/super-admin/CMS"));
const SuperAdminLoyaltyProgram = lazy(() => import("./pages/super-admin/LoyaltyProgram"));
const SuperAdminServiceProviderAppCustomization = lazy(() => import("./pages/super-admin/ServiceProviderAppCustomization"));
const SuperAdminReviewsCustomization = lazy(() => import("./pages/super-admin/ReviewsCustomization"));
const ServiceProviderDashboard = lazy(() => import("./pages/service-provider/Dashboard"));
const ActiveJob = lazy(() => import("./pages/service-provider/ActiveJob"));
const Schedule = lazy(() => import("./pages/service-provider/Schedule"));
const ProfilePage = lazy(() => import("./pages/service-provider/Profile"));
const EarningsPage = lazy(() => import("./pages/service-provider/Earnings"));
const RecentEarnings = lazy(() => import("./pages/service-provider/RecentEarnings"));
const PersonalInfo = lazy(() => import("./pages/service-provider/PersonalInfo"));
const PayoutSettings = lazy(() => import("./pages/service-provider/PayoutSettings"));
const Verification = lazy(() => import("./pages/service-provider/Verification"));
const HelpSupportTech = lazy(() => import("./pages/service-provider/HelpSupport"));
const RaisePartRequest = lazy(() => import("./pages/service-provider/RaisePartRequest"));
const ServiceProviderNotifications = lazy(() => import("./pages/service-provider/Notifications"));
const AIAssistant = lazy(() => import("./pages/service-provider/AIAssistant"));
const Analytics = lazy(() => import("./pages/service-provider/Analytics"));
const Inventory = lazy(() => import("./pages/service-provider/Inventory"));
const BillingEstimate = lazy(() => import("./pages/service-provider/BillingEstimate"));
const SkillsCertifications = lazy(() => import("./pages/service-provider/SkillsCertifications"));
const ServiceProviderSettings = lazy(() => import("./pages/service-provider/ServiceProviderSettings"));
const Academy = lazy(() => import("./pages/service-provider/Academy"));
const TechnicalSupport = lazy(() => import("./pages/service-provider/TechnicalSupport"));
const Announcements = lazy(() => import("./pages/service-provider/Announcements"));
const EarningDetailPage = lazy(() => import("./pages/service-provider/EarningDetail"));
const ServiceHistory = lazy(() => import("./pages/service-provider/ServiceHistory"));

// Auth (OTP + password recovery) — all panels
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ServiceProviderVerifyOtp = lazy(() => import("./pages/service-provider/VerifyOtp"));
const ServiceProviderForgotPassword = lazy(() => import("./pages/service-provider/ForgotPassword"));
const BrandVerifyOtp = lazy(() => import("./pages/brand-admin/VerifyOtp"));
const BrandForgotPassword = lazy(() => import("./pages/brand-admin/ForgotPassword"));
const SuperAdminVerifyOtp = lazy(() => import("./pages/super-admin/VerifyOtp"));
const SuperAdminForgotPassword = lazy(() => import("./pages/super-admin/ForgotPassword"));
const SuperAdminChangePassword = lazy(() => import("./pages/super-admin/ChangePassword"));
const SuperAdminProfile = lazy(() => import("./pages/super-admin/Profile"));
const SuperAdminZoneDashboard = lazy(() => import("./pages/super-admin/ZoneDashboard"));

// Desktop top navigation for the customer + service provider panels
import AppChrome, {
  isPhonePanelRoute,
  panelWidthClass,
} from "./components/AppChrome";

// Notifications
const NotificationsFeed = lazy(() => import("./pages/Notifications"));
const NotificationDetail = lazy(() => import("./pages/NotificationDetail"));

// Every panel's unmatched-URL fallback (a single flat "*" route covers all
// five: customer, service-provider, brand-admin, super-admin and ASM — the
// latter two share the /super-admin prefix, split by role). "Home" is
// resolved from the URL prefix rather than hardcoded, so a bad/typo'd link
// inside any panel sends the user back into that same panel, not out of it.
const PageHandler = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  let panelName = "page";
  let homeRoute = "/dashboard";
  if (pathname.startsWith("/super-admin")) {
    panelName = user?.role === "asm" ? "ASM" : "Super Admin";
    homeRoute =
      user?.role === "asm" ? "/super-admin/zone-dashboard" : "/super-admin/dashboard";
  } else if (pathname.startsWith("/service-provider")) {
    panelName = "Service Provider";
    homeRoute = "/service-provider/dashboard";
  } else if (pathname.startsWith("/brand-admin")) {
    panelName = "Brand Admin";
    homeRoute = "/brand-admin/dashboard";
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
        <div className="w-16 h-16 bg-[#E3ECF9] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-[#0D47A1] font-bold text-2xl">!</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          This {panelName} page doesn&apos;t exist or isn&apos;t available.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            Reload Page
          </button>
          <button
            onClick={() => navigate(homeRoute, { replace: true })}
            className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

import { useAuth } from "./context/AuthContext";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Strict Independent Portal Protection Guard
    const superAdminAuthPages = [
      "/super-admin/login",
      "/super-admin/verify-otp",
      "/super-admin/forgot-password",
    ];
    const brandAdminAuthPages = [
      "/brand-admin/login",
      "/brand-admin/verify-otp",
      "/brand-admin/forgot-password",
    ];
    const serviceProviderAuthPages = [
      "/service-provider/login",
      "/service-provider/verify-otp",
      "/service-provider/forgot-password",
      "/service-provider/apply",
    ];
    // An ASM logs in on this same super-admin panel (role-scoped access, not
    // a separate portal — see Sidebar.jsx's role-aware nav) and is confined
    // to this allowlist. This is real access control, not just hidden nav:
    // typing /super-admin/orders in the address bar must not work even
    // though the backend would 403 those API calls anyway. (pathname never
    // includes the query string, so /super-admin/service-providers?status=
    // Pending is covered by the same entry as the bare path.)
    const asmAllowedPaths = [
      "/super-admin/zone-dashboard",
      "/super-admin/service-providers",
      "/super-admin/city-change-requests",
      "/super-admin/requests",
      "/super-admin/tracking",
      "/super-admin/assignment",
      "/super-admin/profile",
    ];
    const customerAuthPages = [
      "/",
      "/login",
      "/signup",
      "/app/login",
      "/app",
      "/verify-otp",
      "/forgot-password",
      "/reset-password",
    ];
    const publicInfoPages = ["/about-ncc", "/area-not-serviceable"];

    // 1. SUPER ADMIN PANEL — shared by super_admin (full access) and asm
    // (role-scoped to their own zone's service providers).
    if (pathname.startsWith("/super-admin")) {
      if (user && (user.role === "super_admin" || user.role === "asm")) {
        if (user.role === "asm") {
          // A temporary credential (super-admin console) must be replaced
          // before anything else — enforced here too, not just VerifyOtp's
          // own redirect, so a direct URL visit or reload can't skip it.
          if (user.mustChangePassword) {
            if (pathname !== "/super-admin/change-password") {
              navigate("/super-admin/change-password", { replace: true });
              return;
            }
          } else if (
            pathname === "/super-admin/change-password" ||
            superAdminAuthPages.includes(pathname)
          ) {
            navigate("/super-admin/zone-dashboard", { replace: true });
            return;
          } else if (!asmAllowedPaths.includes(pathname)) {
            navigate("/super-admin/zone-dashboard", { replace: true });
            return;
          }
        } else if (superAdminAuthPages.includes(pathname)) {
          navigate("/super-admin/dashboard", { replace: true });
          return;
        }
      } else {
        if (!superAdminAuthPages.includes(pathname)) {
          navigate("/super-admin/login", { replace: true });
          return;
        }
      }
    }
    // 2. BRAND ADMIN PORTAL
    else if (pathname.startsWith("/brand-admin")) {
      if (user && user.role === "brand_admin") {
        if (brandAdminAuthPages.includes(pathname)) {
          navigate("/brand-admin/dashboard", { replace: true });
          return;
        }
      } else {
        if (!brandAdminAuthPages.includes(pathname)) {
          navigate("/brand-admin/login", { replace: true });
          return;
        }
      }
    }
    // 3. SERVICE_PROVIDER PORTAL
    else if (pathname.startsWith("/service-provider")) {
      if (user && user.role === "service_provider") {
        if (
          serviceProviderAuthPages.includes(pathname) &&
          pathname !== "/service-provider/apply"
        ) {
          navigate("/service-provider/dashboard", { replace: true });
          return;
        }
      } else {
        if (!serviceProviderAuthPages.includes(pathname)) {
          navigate("/service-provider/login", { replace: true });
          return;
        }
      }
    }
    // 4. CUSTOMER APP PORTAL (all other routes)
    else {
      if (user && user.role === "customer") {
        const defaultAddress =
          user?.addresses?.find((a) => a?.isDefault) || user?.addresses?.[0];
        const customerCity =
          localStorage.getItem("ncc_customer_city") ||
          user?.city ||
          defaultAddress?.city ||
          "";
        if (customerCity) {
          getActiveCities()
            .then((cities) => {
              const serviceable = isCityServiceable(customerCity, cities);
              if (!serviceable) {
                if (pathname !== "/area-not-serviceable") {
                  navigate("/area-not-serviceable", { replace: true });
                }
              } else {
                if (
                  pathname === "/area-not-serviceable" ||
                  customerAuthPages.includes(pathname)
                ) {
                  navigate("/dashboard", { replace: true });
                }
              }
            })
            .catch(() => {});
          return;
        }

        if (customerAuthPages.includes(pathname)) {
          navigate("/dashboard", { replace: true });
          return;
        }
      } else {
        const guestCity = localStorage.getItem("ncc_customer_city");
        if (guestCity) {
          getActiveCities()
            .then((cities) => {
              const serviceable = isCityServiceable(guestCity, cities);
              if (!serviceable) {
                if (
                  pathname !== "/area-not-serviceable" &&
                  !customerAuthPages.includes(pathname)
                ) {
                  navigate("/area-not-serviceable", { replace: true });
                }
              } else {
                if (pathname === "/area-not-serviceable") {
                  navigate("/login", { replace: true });
                }
              }
            })
            .catch(() => {});
        }
        if (
          !customerAuthPages.includes(pathname) &&
          !publicInfoPages.includes(pathname)
        ) {
          navigate("/login", { replace: true });
          return;
        }
      }
    }

    // Toggle application specific styling class on body
    if (pathname.startsWith("/service-provider")) {
      document.body.classList.add("service-provider-app-active");
      document.body.classList.remove(
        "super-admin-active",
        "brand-admin-active",
        "customer-app-active",
      );
    } else if (pathname.startsWith("/super-admin")) {
      document.body.classList.add("super-admin-active");
      document.body.classList.remove(
        "service-provider-app-active",
        "brand-admin-active",
        "customer-app-active",
      );
    } else if (pathname.startsWith("/brand-admin")) {
      document.body.classList.add("brand-admin-active");
      document.body.classList.remove(
        "service-provider-app-active",
        "super-admin-active",
        "customer-app-active",
      );
    } else if (pathname === "/home" || pathname === "/about-ncc") {
      document.body.classList.remove(
        "service-provider-app-active",
        "super-admin-active",
        "brand-admin-active",
        "customer-app-active",
      );
    } else {
      document.body.classList.add("customer-app-active");
      document.body.classList.remove(
        "service-provider-app-active",
        "super-admin-active",
        "brand-admin-active",
      );
    }

    // Scroll window and document immediately
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // Reset scroll of any scrollable container after render
    const resetScroll = () => {
      const scrollables = document.querySelectorAll(
        '.overflow-y-auto, [class*="overflow-y-auto"], .overflow-auto',
      );
      scrollables.forEach((el) => {
        // Do not reset scroll on sidebar/navigation panels
        if (
          el.closest(".w-64") ||
          el.closest(".w-72") ||
          el.closest("aside") ||
          el.closest("nav")
        )
          return;
        el.scrollTop = 0;
      });
    };

    // Run immediately and also after a short delay to catch deferred layouts
    resetScroll();
    const timer = setTimeout(resetScroll, 100);
    return () => clearTimeout(timer);
  }, [pathname, user, navigate]);

  return null;
};

/**
 * PanelContainer — centres the customer and service provider panels on wide screens.
 *
 * Both are authored at phone width, so without a ceiling a 1920px monitor just
 * stretches a 390px design across the whole display. Admin consoles and the
 * marketing site are laid out for width already and pass through untouched.
 */
function PanelContainer({ children }) {
  const { pathname } = useLocation();
  if (!isPhonePanelRoute(pathname)) return children;
  return (
    <div className={`w-full mx-auto ${panelWidthClass(pathname)}`}>
      {children}
    </div>
  );
}

// Runs inside Router so useLocation is available
function PageTitleManager() {
  usePageTitle();
  return null;
}

// Every route below is code-split (React.lazy) so a hard refresh on, say,
// /service-provider/dashboard only fetches that panel's page chunks instead
// of all five panels' — this is the fallback shown for the moment it takes
// to fetch the chunk for whichever route was just navigated to.
function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <Router>
      {/* Outermost so a failure in any other provider's own data fetch can still
          surface — see lib/apiClient.js's api:error dispatch. */}
      <ToastProvider>
        <LogoProvider>
          <AuthProvider>
            <LocationProvider>
              <AdminSidebarProvider>
                <NotificationProvider>
                  <BookingProvider>
                    <ServiceProviderProvider>
                      <PageTitleManager />
                      <ScrollToTop />
                      <AppChrome />
                      <PanelContainer>
                        <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                          <Route path="/" element={<Login />} />
                          <Route path="/home" element={<Home />} />
                          <Route path="/login" element={<Login />} />
                          <Route
                            path="/signup"
                            element={<Login initialSignup={true} />}
                          />
                          <Route
                            path="/app/login"
                            element={<Navigate to="/login" replace />}
                          />
                          <Route
                            path="/app"
                            element={<Navigate to="/login" replace />}
                          />
                          <Route path="/verify-otp" element={<VerifyOtp />} />
                          <Route
                            path="/area-not-serviceable"
                            element={<AreaNotServiceable />}
                          />
                          <Route
                            path="/forgot-password"
                            element={<ForgotPassword />}
                          />
                          <Route
                            path="/reset-password"
                            element={<ResetPassword />}
                          />
                          <Route
                            path="/dashboard"
                            element={<Dashboard defaultType="non-warranty" />}
                          />
                          <Route
                            path="/dashboard/non-warranty"
                            element={<Dashboard defaultType="non-warranty" />}
                          />
                          <Route
                            path="/dashboard/in-warranty"
                            element={<Dashboard defaultType="in-warranty" />}
                          />
                          <Route
                            path="/partner-warranty"
                            element={<PartnerWarranty />}
                          />
                          <Route
                            path="/partner-warranty/brands/:category"
                            element={<SelectBrand />}
                          />
                          <Route
                            path="/partner-warranty/products/:category/:brand"
                            element={<SelectProduct />}
                          />
                          <Route
                            path="/partner-warranty/issues/:category/:brand/:product"
                            element={<SelectIssue />}
                          />
                          <Route
                            path="/partner-warranty/raise-request/:category/:brand/:product"
                            element={<RaiseWarrantyRequest />}
                          />
                          <Route
                            path="/partner-warranty/ticket-success"
                            element={<TicketSuccess />}
                          />
                          <Route
                            path="/partner-warranty/track-ticket"
                            element={<TrackTicket />}
                          />
                          <Route
                            path="/partner-warranty/ticket-details"
                            element={<TicketDetails />}
                          />
                          <Route
                            path="/partner-warranty/service-updates"
                            element={<ServiceUpdates />}
                          />
                          <Route
                            path="/partner-warranty/rate-service"
                            element={<RateService />}
                          />
                          <Route path="/services" element={<AllServices />} />
                          <Route
                            path="/all-services"
                            element={<AllServices />}
                          />
                          <Route path="/categories" element={<Categories />} />
                          <Route
                            path="/cleaning-services"
                            element={<AllCleaningServices />}
                          />
                          <Route
                            path="/appliance-services"
                            element={<AllApplianceServices />}
                          />
                          <Route path="/warranty" element={<Warranty />} />
                          <Route path="/buy" element={<Buy />} />
                          <Route
                            path="/buy/select-appliance"
                            element={<Buy />}
                          />
                          <Route
                            path="/buy/select-tier/:appliance"
                            element={<Buy />}
                          />
                          <Route
                            path="/buy/enter-details/:appliance/:tierIndex"
                            element={<Buy />}
                          />
                          <Route
                            path="/buy/review/:appliance/:tierIndex"
                            element={<Buy />}
                          />
                          <Route
                            path="/buy/payment/:appliance/:tierIndex"
                            element={<Buy />}
                          />
                          <Route
                            path="/buy/success/:appliance/:tierIndex"
                            element={<Buy />}
                          />
                          <Route path="/buy/my-warranty" element={<Buy />} />
                          <Route path="/buy/how-it-works" element={<Buy />} />
                          <Route
                            path="/buy/warranty-details"
                            element={<Buy />}
                          />
                          <Route path="/buy/amc-details" element={<Buy />} />
                          <Route path="/buy/file-claim" element={<Buy />} />
                          <Route path="/buy/claim-success" element={<Buy />} />
                          <Route path="/buy/all-appliances" element={<Buy />} />
                          <Route path="/buy/accessories" element={<Buy />} />
                          <Route path="/buy/amc" element={<AMC />} />
                          <Route
                            path="/buy/amc/select-appliance"
                            element={<AMC />}
                          />
                          <Route
                            path="/buy/amc/plans/:appliance"
                            element={<AMC />}
                          />
                          <Route
                            path="/buy/amc/enter-details/:appliance/:planIndex"
                            element={<AMC />}
                          />
                          <Route
                            path="/buy/amc/review/:appliance/:planIndex"
                            element={<AMC />}
                          />
                          <Route
                            path="/buy/amc/payment/:appliance/:planIndex"
                            element={<AMC />}
                          />
                          <Route
                            path="/buy/amc/success/:appliance/:planIndex"
                            element={<AMC />}
                          />
                          <Route path="/buy/exchange" element={<Exchange />} />
                          <Route
                            path="/buy/exchange/product/:category"
                            element={<Exchange />}
                          />
                          <Route
                            path="/buy/exchange/offer/:category/:brand/:model/:condition"
                            element={<Exchange />}
                          />
                          <Route
                            path="/buy/exchange/checkout/:category/:brand/:model/:condition"
                            element={<Exchange />}
                          />
                          <Route
                            path="/buy/exchange/payment/:category/:brand/:model/:condition"
                            element={<Exchange />}
                          />
                          <Route
                            path="/buy/exchange/success/:category/:brand/:model/:condition"
                            element={<Exchange />}
                          />
                          <Route path="/buy-new" element={<BuyNew />} />
                          <Route
                            path="/buy-new/products/:category"
                            element={<BuyNew />}
                          />
                          <Route
                            path="/products/:category"
                            element={<BuyNew />}
                          />
                          <Route
                            path="/product/:category"
                            element={<BuyNew />}
                          />
                          <Route
                            path="/buy-new/details/:category/:productName"
                            element={<BuyNew />}
                          />
                          <Route path="/buy-new/cart" element={<BuyNew />} />
                          <Route
                            path="/buy-new/checkout"
                            element={<BuyNew />}
                          />
                          <Route path="/buy-new/address" element={<BuyNew />} />
                          <Route path="/buy-new/payment" element={<BuyNew />} />
                          <Route path="/buy-new/success" element={<BuyNew />} />
                          <Route
                            path="/extend-warranty"
                            element={<ExtendWarranty />}
                          />
                          <Route path="/buy-product" element={<BuyProduct />} />
                          <Route
                            path="/product-details"
                            element={<ProductDetails />}
                          />
                          <Route path="/payment" element={<Payment />} />
                          <Route
                            path="/payment/card"
                            element={<CardPayment />}
                          />
                          <Route path="/payment/upi" element={<UpiPayment />} />
                          <Route
                            path="/payment/netbanking"
                            element={<NetBankingPayment />}
                          />
                          <Route
                            path="/payment-failure"
                            element={<PaymentFailure />}
                          />
                          <Route
                            path="/refrigerator-details"
                            element={<RefrigeratorDetails />}
                          />
                          <Route path="/booking" element={<Booking />} />
                          <Route
                            path="/book/o/:offeringCode"
                            element={<OfferingLink />}
                          />
                          <Route
                            path="/book/:category"
                            element={<BookingFlow />}
                          />
                          <Route path="/bookings" element={<Bookings />} />
                          <Route
                            path="/bookings/:id"
                            element={<BookingDetails />}
                          />
                          <Route
                            path="/my-bookings/:id"
                            element={<BookingDetails />}
                          />
                          <Route path="/profile" element={<Profile />} />
                          <Route
                            path="/booking-success"
                            element={<BookingSuccess />}
                          />
                          <Route
                            path="/searching-partner"
                            element={<SearchingPartner />}
                          />
                          <Route path="/chat" element={<Chat />} />
                          <Route
                            path="/help-support"
                            element={<HelpSupport />}
                          />
                          <Route path="/faqs" element={<Faqs />} />
                          <Route
                            path="/privacy-policy"
                            element={<CmsDocViewer />}
                          />
                          <Route
                            path="/terms-and-conditions"
                            element={<CmsDocViewer />}
                          />
                          <Route
                            path="/saved-addresses"
                            element={<SavedAddresses />}
                          />
                          <Route
                            path="/edit-profile"
                            element={<EditProfile />}
                          />
                          {/* The real rewards screen is RewardsPlayZone. /rewards used to render a
            separate static mock (hardcoded 250 coins, no API) that Profile still
            links to — redirect rather than drop the path, so those links keep
            working. */}
                          <Route
                            path="/rewards"
                            element={
                              <Navigate to="/rewards-play-zone" replace />
                            }
                          />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/my-wishlist" element={<MyWishlist />} />
                          <Route path="/coupons" element={<Coupons />} />
                          <Route
                            path="/finance/:type"
                            element={<FinanceDetails />}
                          />
                          <Route
                            path="/membership-plans"
                            element={<Navigate to="/buy/amc" replace />}
                          />
                          <Route
                            path="/rewards-play-zone"
                            element={<RewardsPlayZone />}
                          />
                          <Route path="/my-bookings" element={<MyBookings />} />
                          <Route path="/my-orders" element={<MyOrders />} />
                          <Route
                            path="/exchange-details"
                            element={<ExchangeDetails />}
                          />
                          <Route path="/refer-earn" element={<ReferEarn />} />
                          <Route
                            path="/service-partner"
                            element={<ServicePartner />}
                          />
                          <Route
                            path="/payment-methods"
                            element={<PaymentMethods />}
                          />
                          <Route
                            path="/notification-settings"
                            element={<NotificationSettings />}
                          />
                          <Route
                            path="/notifications"
                            element={<NotificationsFeed />}
                          />
                          <Route
                            path="/notifications/:id"
                            element={<NotificationDetail />}
                          />
                          <Route path="/about-ncc" element={<AboutNCC />} />
                          <Route path="/all-brands" element={<AllBrands />} />
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route
                            path="/service-provider/login"
                            element={<ServiceProviderLogin />}
                          />
                          <Route
                            path="/service-provider/verify-otp"
                            element={<ServiceProviderVerifyOtp />}
                          />
                          <Route
                            path="/service-provider/forgot-password"
                            element={<ServiceProviderForgotPassword />}
                          />
                          <Route
                            path="/brand-admin/login"
                            element={<BrandLogin />}
                          />
                          <Route
                            path="/brand-admin/verify-otp"
                            element={<BrandVerifyOtp />}
                          />
                          <Route
                            path="/brand-admin/forgot-password"
                            element={<BrandForgotPassword />}
                          />
                          <Route
                            path="/brand-admin/dashboard"
                            element={<BrandDashboard />}
                          />
                          <Route
                            path="/brand-admin/requests"
                            element={<BrandRegisterComplaint />}
                          />
                          <Route
                            path="/brand-admin/warranty"
                            element={<BrandWarranty />}
                          />
                          <Route
                            path="/brand-admin/service-providers"
                            element={<BrandServiceProviders />}
                          />
                          <Route
                            path="/brand-admin/inventory"
                            element={<BrandInventory />}
                          />
                          <Route
                            path="/brand-admin/part-requests"
                            element={<BrandPartRequests />}
                          />
                          <Route
                            path="/brand-admin/invoices"
                            element={<BrandInvoices />}
                          />
                          <Route
                            path="/brand-admin/customers"
                            element={<BrandCustomers />}
                          />
                          <Route
                            path="/brand-admin/notifications"
                            element={<BrandNotifications />}
                          />
                          <Route
                            path="/brand-admin/reports"
                            element={<BrandReports />}
                          />
                          <Route
                            path="/brand-admin/settings"
                            element={<BrandSettings />}
                          />
                          <Route
                            path="/brand-admin/amcs"
                            element={<BrandAMCs />}
                          />
                          <Route
                            path="/brand-admin/exchanges"
                            element={<BrandExchanges />}
                          />
                          <Route
                            path="/brand-admin/warranty-claims"
                            element={<BrandWarrantyClaims />}
                          />
                          <Route
                            path="/brand-admin/catalog"
                            element={<BrandCatalog />}
                          />
                          <Route
                            path="/brand-admin/reviews"
                            element={<BrandReviews />}
                          />
                          <Route
                            path="/brand-admin/chat"
                            element={<BrandChat />}
                          />
                          <Route
                            path="/brand-admin/academy"
                            element={<BrandAcademy />}
                          />
                          <Route
                            path="/brand-admin/reverse-logistics"
                            element={<BrandReverseLogistics />}
                          />
                          <Route
                            path="/brand-admin/complaints"
                            element={<BrandRequests />}
                          />
                          <Route
                            path="/brand-admin/complaint-monitoring"
                            element={<BrandComplaintMonitoring />}
                          />
                          <Route
                            path="/brand-admin/escalations"
                            element={<BrandEscalations />}
                          />
                          <Route
                            path="/brand-admin/service-completion"
                            element={<BrandServiceCompletionMonitor />}
                          />
                          <Route
                            path="/brand-admin/replacement-approvals"
                            element={<BrandReplacementApprovals />}
                          />
                          <Route
                            path="/brand-admin/documents"
                            element={<BrandLetterDocumentCenter />}
                          />
                          <Route
                            path="/brand-admin/call-rates"
                            element={<BrandCallRatesCharges />}
                          />
                          <Route
                            path="/brand-admin/payments"
                            element={<BrandPayments />}
                          />
                          <Route
                            path="/brand-admin/users"
                            element={<BrandUserRoleManagement />}
                          />
                          <Route
                            path="/brand-admin/teams"
                            element={<BrandTeamsDepartments />}
                          />
                          <Route
                            path="/service-provider/apply"
                            element={<ServiceProviderApply />}
                          />
                          <Route
                            path="/service-provider/dashboard"
                            element={<ServiceProviderDashboard />}
                          />
                          <Route
                            path="/service-provider/active-job"
                            element={<ActiveJob />}
                          />
                          <Route
                            path="/service-provider/schedule"
                            element={<Schedule />}
                          />
                          <Route
                            path="/service-provider/profile"
                            element={<ProfilePage />}
                          />
                          <Route
                            path="/service-provider/earnings"
                            element={<EarningsPage />}
                          />
                          <Route
                            path="/service-provider/recent-earnings"
                            element={<RecentEarnings />}
                          />
                          <Route
                            path="/service-provider/personal-info"
                            element={<PersonalInfo />}
                          />
                          <Route
                            path="/service-provider/payout-settings"
                            element={<PayoutSettings />}
                          />
                          <Route
                            path="/service-provider/verification"
                            element={<Verification />}
                          />
                          <Route
                            path="/service-provider/support"
                            element={<HelpSupportTech />}
                          />
                          <Route
                            path="/service-provider/raise-part-request"
                            element={<RaisePartRequest />}
                          />
                          <Route
                            path="/service-provider/notifications"
                            element={<ServiceProviderNotifications />}
                          />
                          <Route
                            path="/service-provider/ai-assistant"
                            element={<AIAssistant />}
                          />
                          <Route
                            path="/service-provider/analytics"
                            element={<Analytics />}
                          />
                          <Route
                            path="/service-provider/inventory"
                            element={<Inventory />}
                          />
                          <Route
                            path="/service-provider/billing-estimate"
                            element={<BillingEstimate />}
                          />
                          <Route
                            path="/service-provider/skills-certifications"
                            element={<SkillsCertifications />}
                          />
                          <Route
                            path="/service-provider/settings"
                            element={<ServiceProviderSettings />}
                          />
                          <Route
                            path="/service-provider/academy"
                            element={<Academy />}
                          />
                          <Route
                            path="/service-provider/technical-support"
                            element={<TechnicalSupport />}
                          />
                          <Route
                            path="/service-provider/announcements"
                            element={<Announcements />}
                          />
                          <Route
                            path="/service-provider/earning-detail/:id"
                            element={<EarningDetailPage />}
                          />
                          <Route
                            path="/service-provider/history"
                            element={<ServiceHistory />}
                          />
                          <Route
                            path="/service-provider/service-history"
                            element={<ServiceHistory />}
                          />

                          {/* Super Admin Routes */}
                          <Route
                            path="/super-admin"
                            element={
                              <Navigate to="/super-admin/login" replace />
                            }
                          />
                          <Route
                            path="/super-admin/login"
                            element={<SuperAdminLogin />}
                          />
                          <Route
                            path="/super-admin/verify-otp"
                            element={<SuperAdminVerifyOtp />}
                          />
                          <Route
                            path="/super-admin/forgot-password"
                            element={<SuperAdminForgotPassword />}
                          />
                          <Route
                            path="/super-admin/change-password"
                            element={<SuperAdminChangePassword />}
                          />
                          <Route
                            path="/super-admin/profile"
                            element={<SuperAdminProfile />}
                          />
                          <Route
                            path="/super-admin/zone-dashboard"
                            element={<SuperAdminZoneDashboard />}
                          />
                          <Route
                            path="/super-admin/dashboard"
                            element={<SuperAdminDashboard />}
                          />
                          <Route
                            path="/super-admin/users"
                            element={<SuperAdminUsers />}
                          />
                          <Route
                            path="/super-admin/service-providers"
                            element={<SuperAdminServiceProviders />}
                          />
                          <Route
                            path="/super-admin/city-change-requests"
                            element={<SuperAdminCityChangeRequests />}
                          />
                          <Route
                            path="/super-admin/brands"
                            element={<SuperAdminBrands />}
                          />
                          <Route
                            path="/super-admin/customer-app-customization"
                            element={<CustomerAppCustomization />}
                          />
                          <Route
                            path="/super-admin/requests"
                            element={<SuperAdminRequests />}
                          />
                          <Route
                            path="/super-admin/warranty"
                            element={<SuperAdminWarranty />}
                          />
                          <Route
                            path="/super-admin/assignment"
                            element={<SuperAdminAssignment />}
                          />
                          <Route
                            path="/super-admin/tracking"
                            element={<SuperAdminTracking />}
                          />
                          <Route
                            path="/super-admin/inventory"
                            element={<SuperAdminInventory />}
                          />
                          <Route
                            path="/super-admin/part-requests"
                            element={<SuperAdminPartRequests />}
                          />
                          <Route
                            path="/super-admin/orders"
                            element={<SuperAdminOrders />}
                          />
                          <Route
                            path="/super-admin/billing"
                            element={<SuperAdminBilling />}
                          />
                          <Route
                            path="/super-admin/complaints"
                            element={<SuperAdminComplaints />}
                          />
                          <Route
                            path="/super-admin/support"
                            element={<SuperAdminSupport />}
                          />
                          <Route
                            path="/super-admin/notifications"
                            element={<SuperAdminNotifications />}
                          />
                          <Route
                            path="/super-admin/reports"
                            element={<SuperAdminReports />}
                          />
                          <Route
                            path="/super-admin/cities"
                            element={<SuperAdminCities />}
                          />
                          <Route
                            path="/super-admin/roles"
                            element={<SuperAdminRoles />}
                          />
                          <Route
                            path="/super-admin/settings"
                            element={<SuperAdminSettings />}
                          />
                          <Route
                            path="/super-admin/logs"
                            element={<SuperAdminLogs />}
                          />
                          <Route
                            path="/super-admin/exchange-offers"
                            element={<SuperAdminExchangeOffers />}
                          />
                          <Route
                            path="/super-admin/asm"
                            element={<SuperAdminASM />}
                          />
                          <Route
                            path="/super-admin/asm/:id"
                            element={<SuperAdminASMDetail />}
                          />
                          <Route
                            path="/super-admin/amc"
                            element={<SuperAdminAMC />}
                          />
                          <Route
                            path="/super-admin/products"
                            element={<SuperAdminProducts />}
                          />
                          <Route
                            path="/super-admin/product-categories"
                            element={<SuperAdminProductCategories />}
                          />
                          <Route
                            path="/super-admin/warranty-verification"
                            element={<SuperAdminWarrantyVerification />}
                          />
                          <Route
                            path="/super-admin/service-catalog"
                            element={<SuperAdminMasterCatalogue />}
                          />
                          <Route
                            path="/super-admin/escalation-desk"
                            element={<SuperAdminEscalationDesk />}
                          />
                          <Route
                            path="/super-admin/stories"
                            element={<SuperAdminStories />}
                          />
                          <Route
                            path="/super-admin/videos"
                            element={<SuperAdminVideos />}
                          />
                          <Route
                            path="/super-admin/advertisements"
                            element={<SuperAdminAdvertisements />}
                          />
                          <Route
                            path="/super-admin/revenue"
                            element={<SuperAdminRevenue />}
                          />
                          <Route
                            path="/super-admin/plans"
                            element={<SuperAdminPlans />}
                          />
                          <Route
                            path="/super-admin/transactions"
                            element={<SuperAdminTransactions />}
                          />
                          <Route
                            path="/super-admin/cms"
                            element={<SuperAdminCMS />}
                          />
                          <Route
                            path="/super-admin/loyalty-program"
                            element={<SuperAdminLoyaltyProgram />}
                          />
                          <Route
                            path="/super-admin/service-provider-app-customization"
                            element={
                              <SuperAdminServiceProviderAppCustomization />
                            }
                          />
                          <Route
                            path="/super-admin/reviews-customization"
                            element={<SuperAdminReviewsCustomization />}
                          />

                          <Route path="*" element={<PageHandler />} />
                        </Routes>
                        </Suspense>
                      </PanelContainer>
                      <LocationModal />
                    </ServiceProviderProvider>
                  </BookingProvider>
                </NotificationProvider>
              </AdminSidebarProvider>
            </LocationProvider>
          </AuthProvider>
        </LogoProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
