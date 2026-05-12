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
import TechLogin from './pages/technician/Login';
import TechApply from './pages/technician/Apply';
import TechDashboard from './pages/technician/Dashboard';
import ActiveJob from './pages/technician/ActiveJob';
import Schedule from './pages/technician/Schedule';
import ProfilePage from './pages/technician/Profile';
import EarningsPage from './pages/technician/Earnings';
import PersonalInfo from './pages/technician/PersonalInfo';
import PayoutSettings from './pages/technician/PayoutSettings';
import Verification from './pages/technician/Verification';
import HelpSupportTech from './pages/technician/HelpSupport';

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/services" element={<AllServices />} />
        <Route path="/cleaning-services" element={<AllCleaningServices />} />
        <Route path="/appliance-services" element={<AllApplianceServices />} />
        <Route path="/warranty" element={<Warranty />} />
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
        <Route path="*" element={<PageHandler />} />
      </Routes>
    </Router>
  );
}

export default App;
