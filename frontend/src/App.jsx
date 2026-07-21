import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Warranty from './pages/Warranty';
import Payment from './pages/Payment';
import CardPayment from './pages/CardPayment';
import UpiPayment from './pages/UpiPayment';
import NetBankingPayment from './pages/NetBankingPayment';
import PaymentFailure from './pages/PaymentFailure';
import Booking from './pages/Booking';
import BookingFlow from './pages/BookingFlow';
import { BookingProvider } from './context/BookingContext';
import { AuthProvider } from './context/AuthContext';
import Chat from './pages/Chat';
import AllServices from './pages/AllServices';
import Categories from './pages/Categories';
import AllCleaningServices from './pages/AllCleaningServices';
import AllApplianceServices from './pages/AllApplianceServices';
import BookingSuccess from './pages/BookingSuccess';
import RefrigeratorDetails from './pages/RefrigeratorDetails';
import Bookings from './pages/Bookings';
import Profile from './pages/Profile';
import ServiceDetails from './pages/ServiceDetails';
import HelpSupport from './pages/HelpSupport';
import SavedAddresses from './pages/SavedAddresses';
import EditProfile from './pages/EditProfile';
import Buy from './pages/Buy';
import AMC from './pages/AMC';
import Exchange from './pages/Exchange';
import BuyNew from './pages/BuyNew';
import ExtendWarranty from './pages/ExtendWarranty';
import BuyProduct from './pages/BuyProduct';
import PartnerWarranty from './pages/PartnerWarranty';
import SelectBrand from './pages/SelectBrand';
import SelectProduct from './pages/SelectProduct';
import SelectIssue from './pages/SelectIssue';
import RaiseWarrantyRequest from './pages/RaiseWarrantyRequest';
import TicketSuccess from './pages/TicketSuccess';
import TrackTicket from './pages/TrackTicket';
import TicketDetails from './pages/TicketDetails';
import ServiceUpdates from './pages/ServiceUpdates';
import RateService from './pages/RateService';
import ProductDetails from './pages/ProductDetails';
import Rewards from './pages/Rewards';
import Wishlist from './pages/Wishlist';
import MyWishlist from './pages/MyWishlist';
import Coupons from './pages/Coupons';
import FinanceDetails from './pages/FinanceDetails';
import MembershipPlans from './pages/MembershipPlans';
import RewardsPlayZone from './pages/RewardsPlayZone';
import MyBookings from './pages/MyBookings';
import MyOrders from './pages/MyOrders';
import ExchangeDetails from './pages/ExchangeDetails';
import ReferEarn from './pages/ReferEarn';
import ServicePartner from './pages/ServicePartner';
import PaymentMethods from './pages/PaymentMethods';
import NotificationSettings from './pages/NotificationSettings';
import AboutNCC from './pages/AboutNCC';
import AllBrands from './pages/AllBrands';
import Onboarding from './pages/Onboarding';
import TechLogin from './pages/technician/Login';
import { TechProvider } from './context/TechContext';
import BrandLogin from './pages/brand-admin/Login';
import BrandDashboard from './pages/brand-admin/Dashboard';
import BrandRequests from './pages/brand-admin/Requests';
import BrandWarranty from './pages/brand-admin/Warranty';
import BrandTechnicians from './pages/brand-admin/Technicians';
import BrandInventory from './pages/brand-admin/Inventory';
import BrandPartRequests from './pages/brand-admin/PartRequests';
import BrandInvoices from './pages/brand-admin/Invoices';
import BrandCustomers from './pages/brand-admin/Customers';
import BrandNotifications from './pages/brand-admin/Notifications';
import BrandReports from './pages/brand-admin/Reports';
import BrandSettings from './pages/brand-admin/Settings';
import BrandAMCs from './pages/brand-admin/AMCs';
import BrandExchanges from './pages/brand-admin/Exchanges';
import BrandWarrantyClaims from './pages/brand-admin/WarrantyClaims';
import BrandCatalog from './pages/brand-admin/Catalog';
import BrandReviews from './pages/brand-admin/Reviews';
import BrandChat from './pages/brand-admin/Chat';
import BrandAcademy from './pages/brand-admin/Academy';
import BrandReverseLogistics from './pages/brand-admin/ReverseLogistics';
import BrandComplaintMonitoring from './pages/brand-admin/ComplaintMonitoring';
import BrandEscalations from './pages/brand-admin/Escalations';
import BrandServiceCompletionMonitor from './pages/brand-admin/ServiceCompletionMonitor';
import BrandReplacementApprovals from './pages/brand-admin/ReplacementApprovals';
import BrandLetterDocumentCenter from './pages/brand-admin/LetterDocumentCenter';
import BrandCallRatesCharges from './pages/brand-admin/CallRatesCharges';
import BrandPayments from './pages/brand-admin/Payments';
import BrandUserRoleManagement from './pages/brand-admin/UserRoleManagement';
import BrandTeamsDepartments from './pages/brand-admin/TeamsDepartments';
import BrandRegisterComplaint from './pages/brand-admin/RegisterComplaint';
import TechApply from './pages/technician/Apply';
import SuperAdminLogin from './pages/super-admin/Login';
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SuperAdminUsers from './pages/super-admin/Users';
import SuperAdminTechnicians from './pages/super-admin/Technicians';
import SuperAdminBrands from './pages/super-admin/Brands';
import SuperAdminRequests from './pages/super-admin/Requests';
import SuperAdminWarranty from './pages/super-admin/Warranty';
import SuperAdminAssignment from './pages/super-admin/Assignment';
import SuperAdminTracking from './pages/super-admin/Tracking';
import SuperAdminInventory from './pages/super-admin/Inventory';
import SuperAdminOrders from './pages/super-admin/Orders';
import SuperAdminBilling from './pages/super-admin/Billing';
import SuperAdminComplaints from './pages/super-admin/Complaints';
import SuperAdminSupport from './pages/super-admin/Support';
import SuperAdminNotifications from './pages/super-admin/Notifications';
import SuperAdminReports from './pages/super-admin/Reports';
import SuperAdminCities from './pages/super-admin/Cities';
import SuperAdminRoles from './pages/super-admin/Roles';
import SuperAdminSettings from './pages/super-admin/Settings';
import SuperAdminLogs from './pages/super-admin/Logs';
import CustomerAppCustomization from './pages/super-admin/CustomerAppCustomization';
import SuperAdminExchangeOffers from './pages/super-admin/ExchangeOffers';
import SuperAdminASM from './pages/super-admin/ASM';
import SuperAdminServicePartners from './pages/super-admin/ServicePartners';
import SuperAdminAMC from './pages/super-admin/AMC';
import SuperAdminProducts from './pages/super-admin/Products';
import SuperAdminWarrantyVerification from './pages/super-admin/WarrantyVerification';
import SuperAdminSpareParts from './pages/super-admin/SpareParts';
import SuperAdminEscalationDesk from './pages/super-admin/EscalationDesk';
import SuperAdminStories from './pages/super-admin/Stories';
import SuperAdminVideos from './pages/super-admin/Videos';
import SuperAdminAdvertisements from './pages/super-admin/Advertisements';
import SuperAdminRevenue from './pages/super-admin/Revenue';
import SuperAdminPayouts from './pages/super-admin/Payouts';
import SuperAdminTransactions from './pages/super-admin/Transactions';
import SuperAdminCMS from './pages/super-admin/CMS';
import SuperAdminLoyaltyProgram from './pages/super-admin/LoyaltyProgram';
import SuperAdminTechnicianAppCustomization from './pages/super-admin/TechnicianAppCustomization';
import TechDashboard from './pages/technician/Dashboard';
import ActiveJob from './pages/technician/ActiveJob';
import Schedule from './pages/technician/Schedule';
import ProfilePage from './pages/technician/Profile';
import EarningsPage from './pages/technician/Earnings';
import RecentEarnings from './pages/technician/RecentEarnings';
import PersonalInfo from './pages/technician/PersonalInfo';
import PayoutSettings from './pages/technician/PayoutSettings';
import Verification from './pages/technician/Verification';
import HelpSupportTech from './pages/technician/HelpSupport';
import RaisePartRequest from './pages/technician/RaisePartRequest';
import TechNotifications from './pages/technician/Notifications';
import AIAssistant from './pages/technician/AIAssistant';
import Analytics from './pages/technician/Analytics';
import Inventory from './pages/technician/Inventory';
import BillingEstimate from './pages/technician/BillingEstimate';
import SkillsCertifications from './pages/technician/SkillsCertifications';
import TechSettings from './pages/technician/TechSettings';
import PartnerLevel from './pages/technician/PartnerLevel';
import Academy from './pages/technician/Academy';
import TechnicalSupport from './pages/technician/TechnicalSupport';
import Announcements from './pages/technician/Announcements';
import EarningDetailPage from './pages/technician/EarningDetail';

// Auth (OTP + password recovery) — all panels
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TechVerifyOtp from './pages/technician/VerifyOtp';
import TechForgotPassword from './pages/technician/ForgotPassword';
import BrandVerifyOtp from './pages/brand-admin/VerifyOtp';
import BrandForgotPassword from './pages/brand-admin/ForgotPassword';
import SuperAdminVerifyOtp from './pages/super-admin/VerifyOtp';
import SuperAdminForgotPassword from './pages/super-admin/ForgotPassword';

// Notifications
import NotificationsFeed from './pages/Notifications';
import NotificationDetail from './pages/NotificationDetail';


const PageHandler = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
        <div className="w-16 h-16 bg-[#E3ECF9] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-[#0D47A1] font-bold text-2xl">!</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page Coming Soon</h1>
        <p className="text-sm text-gray-500 mb-6">This feature is under development.</p>
        <button 
          onClick={() => navigate(-1)}
          className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Toggle application specific styling class on body
    if (pathname.startsWith('/technician')) {
      document.body.classList.add('tech-app-active');
      document.body.classList.remove('super-admin-active', 'brand-admin-active', 'customer-app-active');
    } else if (pathname.startsWith('/super-admin')) {
      document.body.classList.add('super-admin-active');
      document.body.classList.remove('tech-app-active', 'brand-admin-active', 'customer-app-active');
    } else if (pathname.startsWith('/brand-admin')) {
      document.body.classList.add('brand-admin-active');
      document.body.classList.remove('tech-app-active', 'super-admin-active', 'customer-app-active');
    } else if (pathname === '/home' || pathname === '/about-ncc') {
      document.body.classList.remove('tech-app-active', 'super-admin-active', 'brand-admin-active', 'customer-app-active');
    } else {
      document.body.classList.add('customer-app-active');
      document.body.classList.remove('tech-app-active', 'super-admin-active', 'brand-admin-active');
    }

    // Scroll window and document immediately
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // Reset scroll of any scrollable container after render
    const resetScroll = () => {
      const scrollables = document.querySelectorAll('.overflow-y-auto, [class*="overflow-y-auto"], .overflow-auto');
      scrollables.forEach(el => {
        // Do not reset scroll on sidebar/navigation panels
        if (el.closest('.w-64') || el.closest('.w-72') || el.closest('aside') || el.closest('nav')) return;
        el.scrollTop = 0;
      });
    };

    // Run immediately and also after a short delay to catch deferred layouts
    resetScroll();
    const timer = setTimeout(resetScroll, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
      <BookingProvider>
      <TechProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard defaultType="non-warranty" />} />
        <Route path="/dashboard/non-warranty" element={<Dashboard defaultType="non-warranty" />} />
        <Route path="/dashboard/in-warranty" element={<Dashboard defaultType="in-warranty" />} />
        <Route path="/partner-warranty" element={<PartnerWarranty />} />
        <Route path="/partner-warranty/brands/:category" element={<SelectBrand />} />
        <Route path="/partner-warranty/products/:category/:brand" element={<SelectProduct />} />
        <Route path="/partner-warranty/issues/:category/:brand/:product" element={<SelectIssue />} />
        <Route path="/partner-warranty/raise-request/:category/:brand/:product" element={<RaiseWarrantyRequest />} />
        <Route path="/partner-warranty/ticket-success" element={<TicketSuccess />} />
        <Route path="/partner-warranty/track-ticket" element={<TrackTicket />} />
        <Route path="/partner-warranty/ticket-details" element={<TicketDetails />} />
        <Route path="/partner-warranty/service-updates" element={<ServiceUpdates />} />
        <Route path="/partner-warranty/rate-service" element={<RateService />} />
        <Route path="/services" element={<AllServices />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/cleaning-services" element={<AllCleaningServices />} />
        <Route path="/appliance-services" element={<AllApplianceServices />} />
        <Route path="/warranty" element={<Warranty />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/buy/select-appliance" element={<Buy />} />
        <Route path="/buy/select-tier/:appliance" element={<Buy />} />
        <Route path="/buy/enter-details/:appliance/:tierIndex" element={<Buy />} />
        <Route path="/buy/review/:appliance/:tierIndex" element={<Buy />} />
        <Route path="/buy/payment/:appliance/:tierIndex" element={<Buy />} />
        <Route path="/buy/success/:appliance/:tierIndex" element={<Buy />} />
        <Route path="/buy/my-warranty" element={<Buy />} />
        <Route path="/buy/how-it-works" element={<Buy />} />
        <Route path="/buy/warranty-details" element={<Buy />} />
        <Route path="/buy/amc-details" element={<Buy />} />
        <Route path="/buy/file-claim" element={<Buy />} />
        <Route path="/buy/claim-success" element={<Buy />} />
        <Route path="/buy/all-appliances" element={<Buy />} />
        <Route path="/buy/accessories" element={<Buy />} />
        <Route path="/buy/amc" element={<AMC />} />
        <Route path="/buy/amc/select-appliance" element={<AMC />} />
        <Route path="/buy/amc/plans/:appliance" element={<AMC />} />
        <Route path="/buy/amc/enter-details/:appliance/:planIndex" element={<AMC />} />
        <Route path="/buy/amc/review/:appliance/:planIndex" element={<AMC />} />
        <Route path="/buy/amc/payment/:appliance/:planIndex" element={<AMC />} />
        <Route path="/buy/amc/success/:appliance/:planIndex" element={<AMC />} />
        <Route path="/buy/exchange" element={<Exchange />} />
        <Route path="/buy/exchange/product/:category" element={<Exchange />} />
        <Route path="/buy/exchange/offer/:category/:brand/:model/:condition" element={<Exchange />} />
        <Route path="/buy/exchange/checkout/:category/:brand/:model/:condition" element={<Exchange />} />
        <Route path="/buy/exchange/payment/:category/:brand/:model/:condition" element={<Exchange />} />
        <Route path="/buy/exchange/success/:category/:brand/:model/:condition" element={<Exchange />} />
        <Route path="/buy-new" element={<BuyNew />} />
        <Route path="/buy-new/products/:category" element={<BuyNew />} />
        <Route path="/buy-new/details/:category/:productName" element={<BuyNew />} />
        <Route path="/buy-new/cart" element={<BuyNew />} />
        <Route path="/buy-new/payment" element={<BuyNew />} />
        <Route path="/buy-new/success" element={<BuyNew />} />
        <Route path="/extend-warranty" element={<ExtendWarranty />} />
        <Route path="/buy-product" element={<BuyProduct />} />
        <Route path="/product-details" element={<ProductDetails />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/card" element={<CardPayment />} />
        <Route path="/payment/upi" element={<UpiPayment />} />
        <Route path="/payment/netbanking" element={<NetBankingPayment />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/refrigerator-details" element={<RefrigeratorDetails />} />
        <Route path="/service-details" element={<ServiceDetails />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/book/:category" element={<BookingFlow />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/help-support" element={<HelpSupport />} />
        <Route path="/saved-addresses" element={<SavedAddresses />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/my-wishlist" element={<MyWishlist />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/finance/:type" element={<FinanceDetails />} />
        <Route path="/membership-plans" element={<MembershipPlans />} />
        <Route path="/rewards-play-zone" element={<RewardsPlayZone />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/exchange-details" element={<ExchangeDetails />} />
        <Route path="/refer-earn" element={<ReferEarn />} />
        <Route path="/service-partner" element={<ServicePartner />} />
        <Route path="/payment-methods" element={<PaymentMethods />} />
        <Route path="/notification-settings" element={<NotificationSettings />} />
        <Route path="/notifications" element={<NotificationsFeed />} />
        <Route path="/notifications/:id" element={<NotificationDetail />} />
        <Route path="/about-ncc" element={<AboutNCC />} />
        <Route path="/all-brands" element={<AllBrands />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/technician/login" element={<TechLogin />} />
        <Route path="/technician/verify-otp" element={<TechVerifyOtp />} />
        <Route path="/technician/forgot-password" element={<TechForgotPassword />} />
        <Route path="/brand-admin/login" element={<BrandLogin />} />
        <Route path="/brand-admin/verify-otp" element={<BrandVerifyOtp />} />
        <Route path="/brand-admin/forgot-password" element={<BrandForgotPassword />} />
        <Route path="/brand-admin/dashboard" element={<BrandDashboard />} />
        <Route path="/brand-admin/requests" element={<BrandRegisterComplaint />} />
        <Route path="/brand-admin/warranty" element={<BrandWarranty />} />
        <Route path="/brand-admin/technicians" element={<BrandTechnicians />} />
        <Route path="/brand-admin/inventory" element={<BrandInventory />} />
        <Route path="/brand-admin/part-requests" element={<BrandPartRequests />} />
        <Route path="/brand-admin/invoices" element={<BrandInvoices />} />
        <Route path="/brand-admin/customers" element={<BrandCustomers />} />
        <Route path="/brand-admin/notifications" element={<BrandNotifications />} />
        <Route path="/brand-admin/reports" element={<BrandReports />} />
        <Route path="/brand-admin/settings" element={<BrandSettings />} />
        <Route path="/brand-admin/amcs" element={<BrandAMCs />} />
        <Route path="/brand-admin/exchanges" element={<BrandExchanges />} />
        <Route path="/brand-admin/warranty-claims" element={<BrandWarrantyClaims />} />
        <Route path="/brand-admin/catalog" element={<BrandCatalog />} />
        <Route path="/brand-admin/reviews" element={<BrandReviews />} />
        <Route path="/brand-admin/chat" element={<BrandChat />} />
        <Route path="/brand-admin/academy" element={<BrandAcademy />} />
        <Route path="/brand-admin/reverse-logistics" element={<BrandReverseLogistics />} />
        <Route path="/brand-admin/complaints" element={<BrandRequests />} />
        <Route path="/brand-admin/complaint-monitoring" element={<BrandComplaintMonitoring />} />
        <Route path="/brand-admin/escalations" element={<BrandEscalations />} />
        <Route path="/brand-admin/service-completion" element={<BrandServiceCompletionMonitor />} />
        <Route path="/brand-admin/replacement-approvals" element={<BrandReplacementApprovals />} />
        <Route path="/brand-admin/documents" element={<BrandLetterDocumentCenter />} />
        <Route path="/brand-admin/call-rates" element={<BrandCallRatesCharges />} />
        <Route path="/brand-admin/payments" element={<BrandPayments />} />
        <Route path="/brand-admin/users" element={<BrandUserRoleManagement />} />
        <Route path="/brand-admin/teams" element={<BrandTeamsDepartments />} />
        <Route path="/technician/apply" element={<TechApply />} />
        <Route path="/technician/dashboard" element={<TechDashboard />} />
        <Route path="/technician/active-job" element={<ActiveJob />} />
        <Route path="/technician/schedule" element={<Schedule />} />
        <Route path="/technician/profile" element={<ProfilePage />} />
        <Route path="/technician/earnings" element={<EarningsPage />} />
        <Route path="/technician/recent-earnings" element={<RecentEarnings />} />
        <Route path="/technician/personal-info" element={<PersonalInfo />} />
        <Route path="/technician/payout-settings" element={<PayoutSettings />} />
        <Route path="/technician/verification" element={<Verification />} />
        <Route path="/technician/support" element={<HelpSupportTech />} />
        <Route path="/technician/raise-part-request" element={<RaisePartRequest />} />
        <Route path="/technician/notifications" element={<TechNotifications />} />
        <Route path="/technician/ai-assistant" element={<AIAssistant />} />
        <Route path="/technician/analytics" element={<Analytics />} />
        <Route path="/technician/inventory" element={<Inventory />} />
        <Route path="/technician/billing-estimate" element={<BillingEstimate />} />
        <Route path="/technician/skills-certifications" element={<SkillsCertifications />} />
        <Route path="/technician/settings" element={<TechSettings />} />
        <Route path="/technician/partner-level" element={<PartnerLevel />} />
        <Route path="/technician/academy" element={<Academy />} />
        <Route path="/technician/technical-support" element={<TechnicalSupport />} />
        <Route path="/technician/announcements" element={<Announcements />} />
        <Route path="/technician/earning-detail/:id" element={<EarningDetailPage />} />
        
        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<Navigate to="/super-admin/login" replace />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin/verify-otp" element={<SuperAdminVerifyOtp />} />
        <Route path="/super-admin/forgot-password" element={<SuperAdminForgotPassword />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/users" element={<SuperAdminUsers />} />
        <Route path="/super-admin/technicians" element={<SuperAdminTechnicians />} />
        <Route path="/super-admin/brands" element={<SuperAdminBrands />} />
        <Route path="/super-admin/customer-app-customization" element={<CustomerAppCustomization />} />
        <Route path="/super-admin/requests" element={<SuperAdminRequests />} />
        <Route path="/super-admin/warranty" element={<SuperAdminWarranty />} />
        <Route path="/super-admin/assignment" element={<SuperAdminAssignment />} />
        <Route path="/super-admin/tracking" element={<SuperAdminTracking />} />
        <Route path="/super-admin/inventory" element={<SuperAdminInventory />} />
        <Route path="/super-admin/orders" element={<SuperAdminOrders />} />
        <Route path="/super-admin/billing" element={<SuperAdminBilling />} />
        <Route path="/super-admin/complaints" element={<SuperAdminComplaints />} />
        <Route path="/super-admin/support" element={<SuperAdminSupport />} />
        <Route path="/super-admin/notifications" element={<SuperAdminNotifications />} />
        <Route path="/super-admin/reports" element={<SuperAdminReports />} />
        <Route path="/super-admin/cities" element={<SuperAdminCities />} />
        <Route path="/super-admin/roles" element={<SuperAdminRoles />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
        <Route path="/super-admin/logs" element={<SuperAdminLogs />} />
        <Route path="/super-admin/exchange-offers" element={<SuperAdminExchangeOffers />} />
        <Route path="/super-admin/asm" element={<SuperAdminASM />} />
        <Route path="/super-admin/service-partners" element={<SuperAdminServicePartners />} />
        <Route path="/super-admin/amc" element={<SuperAdminAMC />} />
        <Route path="/super-admin/products" element={<SuperAdminProducts />} />
        <Route path="/super-admin/warranty-verification" element={<SuperAdminWarrantyVerification />} />
        <Route path="/super-admin/spare-parts" element={<SuperAdminSpareParts />} />
        <Route path="/super-admin/escalation-desk" element={<SuperAdminEscalationDesk />} />
        <Route path="/super-admin/stories" element={<SuperAdminStories />} />
        <Route path="/super-admin/videos" element={<SuperAdminVideos />} />
        <Route path="/super-admin/advertisements" element={<SuperAdminAdvertisements />} />
        <Route path="/super-admin/revenue" element={<SuperAdminRevenue />} />
        <Route path="/super-admin/payouts" element={<SuperAdminPayouts />} />
        <Route path="/super-admin/transactions" element={<SuperAdminTransactions />} />
        <Route path="/super-admin/cms" element={<SuperAdminCMS />} />
        <Route path="/super-admin/loyalty-program" element={<SuperAdminLoyaltyProgram />} />
        <Route path="/super-admin/technician-app-customization" element={<SuperAdminTechnicianAppCustomization />} />

        <Route path="*" element={<PageHandler />} />
      </Routes>
      </TechProvider>
      </BookingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
