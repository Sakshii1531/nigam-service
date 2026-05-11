import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
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
      </Routes>
    </Router>
  );
}

export default App;
