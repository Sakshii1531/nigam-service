import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Warranty from './pages/Warranty';
import Payment from './pages/Payment';
import Booking from './pages/Booking';
import Tracking from './pages/Tracking';
import Chat from './pages/Chat';
import AllServices from './pages/AllServices';
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
import BuyNew from './pages/BuyNew';
import ExtendWarranty from './pages/ExtendWarranty';
import TechLogin from './pages/technician/Login';
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
import TechDashboard from './pages/technician/Dashboard';
import ActiveJob from './pages/technician/ActiveJob';
import Schedule from './pages/technician/Schedule';
import ProfilePage from './pages/technician/Profile';
import EarningsPage from './pages/technician/Earnings';
import PersonalInfo from './pages/technician/PersonalInfo';
import PayoutSettings from './pages/technician/PayoutSettings';
import Verification from './pages/technician/Verification';
import HelpSupportTech from './pages/technician/HelpSupport';
import RaisePartRequest from './pages/technician/RaisePartRequest';

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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard defaultType="non-warranty" />} />
        <Route path="/dashboard/non-warranty" element={<Dashboard defaultType="non-warranty" />} />
        <Route path="/dashboard/in-warranty" element={<Dashboard defaultType="in-warranty" />} />
        <Route path="/services" element={<AllServices />} />
        <Route path="/cleaning-services" element={<AllCleaningServices />} />
        <Route path="/appliance-services" element={<AllApplianceServices />} />
        <Route path="/warranty" element={<Warranty />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/buy-new" element={<BuyNew />} />
        <Route path="/extend-warranty" element={<ExtendWarranty />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/refrigerator-details" element={<RefrigeratorDetails />} />
        <Route path="/service-details" element={<ServiceDetails />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/help-support" element={<HelpSupport />} />
        <Route path="/saved-addresses" element={<SavedAddresses />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/technician/login" element={<TechLogin />} />
        <Route path="/brand-admin/login" element={<BrandLogin />} />
        <Route path="/brand-admin/dashboard" element={<BrandDashboard />} />
        <Route path="/brand-admin/requests" element={<BrandRequests />} />
        <Route path="/brand-admin/warranty" element={<BrandWarranty />} />
        <Route path="/brand-admin/technicians" element={<BrandTechnicians />} />
        <Route path="/brand-admin/inventory" element={<BrandInventory />} />
        <Route path="/brand-admin/part-requests" element={<BrandPartRequests />} />
        <Route path="/brand-admin/invoices" element={<BrandInvoices />} />
        <Route path="/brand-admin/customers" element={<BrandCustomers />} />
        <Route path="/brand-admin/notifications" element={<BrandNotifications />} />
        <Route path="/brand-admin/reports" element={<BrandReports />} />
        <Route path="/brand-admin/settings" element={<BrandSettings />} />
        <Route path="/technician/apply" element={<TechApply />} />
        <Route path="/technician/dashboard" element={<TechDashboard />} />
        <Route path="/technician/active-job" element={<ActiveJob />} />
        <Route path="/technician/schedule" element={<Schedule />} />
        <Route path="/technician/profile" element={<ProfilePage />} />
        <Route path="/technician/earnings" element={<EarningsPage />} />
        <Route path="/technician/personal-info" element={<PersonalInfo />} />
        <Route path="/technician/payout-settings" element={<PayoutSettings />} />
        <Route path="/technician/verification" element={<Verification />} />
        <Route path="/technician/support" element={<HelpSupportTech />} />
        <Route path="/technician/raise-part-request" element={<RaisePartRequest />} />
        
        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/users" element={<SuperAdminUsers />} />
        <Route path="/super-admin/technicians" element={<SuperAdminTechnicians />} />
        <Route path="/super-admin/brands" element={<SuperAdminBrands />} />
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

        <Route path="*" element={<PageHandler />} />
      </Routes>
    </Router>
  );
}

export default App;
