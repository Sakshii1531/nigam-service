import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Wrench, Search, CheckCircle2, AlertTriangle, X, ChevronRight, RefreshCw, ShieldCheck, Sparkles, Check, Copy, RotateCcw
} from 'lucide-react';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { apiRequest, getStoredTokens } from '../lib/apiClient';
import { io } from 'socket.io-client';
import CancelBookingModal from '../components/booking/CancelBookingModal';
import RescheduleBookingModal from '../components/booking/RescheduleBookingModal';

// 3D Category icons
import iconAc from '../assets/icon_3d_ac.png';
import iconGeyser from '../assets/icon_3d_geyser.png';
import iconRo from '../assets/icon_3d_ro.png';
import iconTv from '../assets/icon_3d_tv.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconOven from '../assets/icon_3d_oven.png';
import iconFridge from '../assets/icon_3d_fridge.png';
import iconWm from '../assets/icon_3d_wm.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/v1\/?$/, '');

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled'];

const STATUS_BADGES = {
  Upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80', dot: 'bg-blue-500' },
  Ongoing: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/80', dot: 'bg-indigo-500' },
  'Parts Pending': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/80', dot: 'bg-amber-500' },
  'Spare Ordered': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/80', dot: 'bg-amber-500' },
  Rescheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80', dot: 'bg-purple-500' },
  'Revisit Scheduled': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80', dot: 'bg-purple-500' },
  Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80', dot: 'bg-emerald-500' },
  Cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80', dot: 'bg-rose-500' },
};

const CATEGORY_COLORS = {
  AC: 'bg-sky-50 text-sky-700 border-sky-200',
  Refrigerator: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Washing Machine': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RO: 'bg-blue-50 text-blue-700 border-blue-200',
  TV: 'bg-purple-50 text-purple-700 border-purple-200',
  Chimney: 'bg-amber-50 text-amber-700 border-amber-200',
  Geyser: 'bg-orange-50 text-orange-700 border-orange-200',
  Electrician: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Plumber: 'bg-teal-50 text-teal-700 border-teal-200',
};

const getCategoryIcon = (category, serviceName) => {
  const cat = (category || '').toLowerCase();
  const sName = (serviceName || '').toLowerCase();

  if (cat.includes('ac') || sName.includes('ac')) return iconAc;
  if (cat.includes('fridge') || cat.includes('refrigerator') || sName.includes('fridge') || sName.includes('refrigerator')) return iconFridge;
  if (cat.includes('washing') || sName.includes('washing')) return iconWm;
  if (cat.includes('ro') || cat.includes('purifier') || sName.includes('purifier')) return iconRo;
  if (cat.includes('tv') || sName.includes('tv')) return iconTv;
  if (cat.includes('chimney') || sName.includes('chimney')) return iconChimney;
  if (cat.includes('geyser') || sName.includes('geyser')) return iconGeyser;
  if (cat.includes('oven') || sName.includes('oven') || sName.includes('gas')) return iconOven;
  if (cat.includes('electrician') || sName.includes('electrician')) return electricianImg;
  if (cat.includes('plumber') || sName.includes('plumber')) return plumberImg;
  if (cat.includes('cleaning') || sName.includes('cleaning')) return cleaningImg;

  return iconAc;
};

const Bookings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Cancel & Reschedule Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // If navigated with bookingId state, redirect to dedicated details page
  useEffect(() => {
    if (location.state?.bookingId) {
      navigate(`/bookings/${location.state.bookingId}`, { replace: true });
    }
  }, [location.state, navigate]);

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiRequest('/bookings', { auth: true });
      const list = Array.isArray(res) ? res : res?.items || [];
      setBookings(list);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(() => {
      loadBookings(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    const refresh = () => loadBookings(true);
    socket.on('booking:completed', refresh);
    socket.on('booking:updated', refresh);
    socket.on('instant:status_update', refresh);
    socket.on('tracking:update', refresh);
    socket.on('service_request:updated', refresh);
    socket.on('booking:cancelled', refresh);
    socket.on('booking:rescheduled', refresh);
    socket.on('job:completed', refresh);

    return () => {
      socket.disconnect();
    };
  }, [loadBookings]);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancelBooking = async (reason) => {
    if (!bookingToCancel) return;
    const targetId = bookingToCancel.id || bookingToCancel.humanId;
    setCancellingId(targetId);
    try {
      await apiRequest(`/bookings/${targetId}/cancel`, {
        method: 'POST',
        body: { reason },
        auth: true,
      });
      setShowCancelModal(false);
      setBookingToCancel(null);
      setToastMessage('Booking has been cancelled successfully.');
      setTimeout(() => setToastMessage(''), 4000);
      await loadBookings(true);
    } catch (err) {
      setError(err.message || 'Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleRescheduleBooking = async ({ scheduledDate, timeSlot, reason }) => {
    if (!bookingToReschedule) return;
    const targetId = bookingToReschedule.id || bookingToReschedule.humanId;
    setReschedulingId(targetId);
    try {
      await apiRequest(`/bookings/${targetId}/reschedule`, {
        method: 'POST',
        body: { scheduledDate, timeSlot, reason },
        auth: true,
      });
      setShowRescheduleModal(false);
      setBookingToReschedule(null);
      setToastMessage('Booking rescheduled successfully.');
      setTimeout(() => setToastMessage(''), 4000);
      await loadBookings(true);
    } catch (err) {
      setError(err.message || 'Could not reschedule booking.');
    } finally {
      setReschedulingId(null);
    }
  };

  // Whichever booking currently has a spare-part cost awaiting the
  // customer's sign-off — surfaced as a blocking popup right here on the
  // list, not just on that one booking's detail page, since that's where
  // the notification lands the customer before they've picked a booking.
  const [respondingPartApproval, setRespondingPartApproval] = useState(false);
  const pendingPartApprovalBooking = bookings.find((b) => b.partApproval?.status === 'Pending');

  const handleRespondPartRequest = async (approve) => {
    if (!pendingPartApprovalBooking) return;
    setRespondingPartApproval(true);
    try {
      await apiRequest(`/bookings/${pendingPartApprovalBooking.id || pendingPartApprovalBooking.humanId}/respond-part-request`, {
        method: 'POST',
        body: { approve },
        auth: true,
      });
      setToastMessage(approve ? 'Part request approved.' : 'Part request declined.');
      setTimeout(() => setToastMessage(''), 4000);
      await loadBookings(true);
    } catch (err) {
      setError(err.message || 'Could not record your response.');
    } finally {
      setRespondingPartApproval(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const status = b.status || 'Upcoming';
    if (activeTab === 'Upcoming' && (status !== 'Upcoming' && status !== 'Ongoing' && status !== 'Rescheduled' && status !== 'Parts Pending' && status !== 'Revisit Scheduled')) return false;
    if (activeTab === 'Completed' && status !== 'Completed') return false;
    if (activeTab === 'Cancelled' && status !== 'Cancelled') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchService = b.service?.name?.toLowerCase().includes(q);
      const matchCat = b.category?.toLowerCase().includes(q);
      const matchBrand = b.brand?.toLowerCase().includes(q);
      const matchId = (b.humanId || b.id)?.toLowerCase().includes(q);
      if (!matchService && !matchCat && !matchBrand && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col pb-24 lg:pb-12 font-sans text-slate-800">
      
      {/* ── Top Header: Mobile ── */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 shadow-2xs lg:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">My Bookings</h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {bookings.length} {bookings.length === 1 ? 'service booked' : 'services booked'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => loadBookings(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all cursor-pointer text-slate-700 disabled:opacity-50"
              title="Refresh Bookings"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking ID, appliance, or brand..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-0.5">
          {TABS.map((tab) => {
            const count = tab === 'All' 
              ? bookings.length 
              : bookings.filter(b => {
                  const s = b.status || 'Upcoming';
                  if (tab === 'Upcoming') return s === 'Upcoming' || s === 'Ongoing' || s === 'Rescheduled' || s === 'Parts Pending' || s === 'Revisit Scheduled';
                  return s === tab;
                }).length;
            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                  isSelected
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Desktop Header & Controls Bar ── */}
      <div className="hidden lg:flex flex-col gap-5 max-w-6xl mx-auto w-full px-6 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 transition-colors cursor-pointer flex-shrink-0"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Bookings</h1>
                <span className="bg-[#EAF4FF] text-brand-blue text-xs font-bold px-3 py-1 rounded-full">
                  {bookings.length} {bookings.length === 1 ? 'Service' : 'Services'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                View order status, reschedule appointment slots, or track your assigned service expert
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadBookings(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200/60 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
              <span>Refresh</span>
            </button>
            <button 
              onClick={() => navigate('/services')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-[#083679] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              <Wrench className="h-4 w-4" />
              <span>Book New Service</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {TABS.map((tab) => {
              const count = tab === 'All' 
                ? bookings.length 
                : bookings.filter(b => {
                    const s = b.status || 'Upcoming';
                    if (tab === 'Upcoming') return s === 'Upcoming' || s === 'Ongoing' || s === 'Rescheduled' || s === 'Parts Pending' || s === 'Revisit Scheduled';
                    return s === tab;
                  }).length;
              const isSelected = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-blue text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-100'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search booking ID, appliance, or brand..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast Alerts ── */}
      {toastMessage && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-3 animate-fade-in">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── Error Alert ── */}
      {error && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-3 animate-fade-in">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Bookings Cards Grid ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-2xs animate-pulse flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-200 rounded-md w-28" />
                  <div className="h-6 bg-slate-200 rounded-full w-24" />
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-2xl" />
                <div className="h-10 bg-slate-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center my-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#EAF4FF] text-brand-blue rounded-3xl flex items-center justify-center mb-4 shadow-2xs">
              <Wrench className="h-8 w-8 text-brand-blue" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              No {activeTab !== 'All' ? activeTab : ''} Bookings Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              {searchQuery 
                ? `No bookings matched "${searchQuery}". Try searching with a different keyword.` 
                : 'You have no service bookings in this tab right now.'}
            </p>
            <button 
              onClick={() => navigate('/services')}
              className="mt-6 bg-brand-blue hover:bg-[#083679] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Book a Service Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBookings.map((b) => {
              const orderId = b.humanId || b.id;
              const isPartsPending = b.instantStatus === 'PARTS_PENDING' || b.partPending || b.serviceRequest?.status === 'Spare Ordered' || b.serviceRequest?.status === 'Spare Required' || b.status === 'Parts Pending';
              const isRescheduled = b.instantStatus === 'RESCHEDULED' || b.serviceRequest?.status === 'Spare Received' || b.status === 'Rescheduled' || b.status === 'Revisit Scheduled' || (b.rescheduleCount > 0);
              const status = isPartsPending ? 'Parts Pending' : isRescheduled ? 'Rescheduled' : (b.status || 'Upcoming');
              const badge = STATUS_BADGES[status] || STATUS_BADGES.Upcoming;
              const categoryBadge = CATEGORY_COLORS[b.category] || 'bg-slate-100 text-slate-700 border-slate-200';
              
              const scheduledDateStr = b.scheduledDate 
                ? new Date(b.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
                : 'Scheduled';
              const timeStr = typeof b.timeSlot === 'object' ? (b.timeSlot?.time || '10:00 AM – 01:00 PM') : (b.timeSlot || '10:00 AM – 01:00 PM');
              const price = b.totalPrice != null ? `₹${b.totalPrice}` : '₹499';
              const canRescheduleOrCancel = b.status !== 'Completed' && b.status !== 'Cancelled';

              return (
                <div
                  key={b.id || orderId}
                  onClick={() => navigate(`/bookings/${orderId}`)}
                  className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-brand-blue/40 transition-all duration-250 cursor-pointer flex flex-col justify-between gap-4 text-left relative overflow-hidden"
                >
                  {/* Subtle top indicator on hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Top Header: Order ID + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70">
                        {orderId}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(e, orderId)}
                        className="p-1 rounded-md text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                        title="Copy Order ID"
                      >
                        {copiedId === orderId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {status}
                    </span>
                  </div>

                  {/* Appliance Icon & Service Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-[#EAF4FF]/70 p-2 flex items-center justify-center shrink-0 border border-slate-100 transition-colors">
                      <img 
                        src={getCategoryIcon(b.category, b.service?.name)} 
                        alt={b.category || 'Service'} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-250" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border ${categoryBadge}`}>
                          {b.category || 'Service'}
                        </span>
                        {b.brand && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {b.brand}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-brand-blue transition-colors leading-snug truncate">
                        {b.service?.name || `${b.category || 'Home'} Service`}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                        {b.productType ? `${b.productType} • Doorstep Service` : 'Professional Doorstep Service'}
                      </p>
                    </div>
                  </div>

                  {/* Reschedule Badge Notice if applicable */}
                  {b.rescheduleCount > 0 && (
                    <div className="bg-purple-50 border border-purple-200/70 text-purple-800 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                      <span>Rescheduled ({b.rescheduleCount}x) • Slot updated</span>
                    </div>
                  )}

                  {/* Date & Time Slot Ribbon */}
                  <div className="bg-slate-50/90 rounded-2xl p-2.5 flex items-center justify-between border border-slate-200/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Calendar className="h-4 w-4 text-brand-blue shrink-0" />
                      <span>{scheduledDateStr}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {/* Service Provider Snippet (if assigned) */}
                  {b.serviceProvider ? (
                    <div className="flex items-center justify-between bg-[#EAF4FF]/50 p-2.5 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-blue text-white flex items-center justify-center text-xs font-black shadow-2xs">
                          {b.serviceProvider.name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{b.serviceProvider.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">Verified Service Expert</p>
                        </div>
                      </div>

                      {canRescheduleOrCancel && (
                        <div className="bg-white px-2.5 py-1 rounded-xl border border-blue-200/80 flex items-center gap-1 text-[11px] font-bold text-brand-blue">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>OTP: <strong className="font-mono text-slate-900">{b.completionOtp || b.serviceRequest?.completionOtp || ''}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Card Footer: Price & Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5 mt-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estimated Total</span>
                        <span className="text-base font-black text-slate-900">{price}</span>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${orderId}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue bg-[#EAF4FF] hover:bg-brand-blue hover:text-white px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Reschedule and Cancel buttons for active bookings */}
                    {canRescheduleOrCancel && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingToReschedule(b);
                            setShowRescheduleModal(true);
                          }}
                          className="w-full py-2 px-3 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Reschedule
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingToCancel(b);
                            setShowCancelModal(true);
                          }}
                          className="w-full py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Spare Part Approval Popup — the customer must sign off on this cost
          before it's ever sent to the super-admin queue. */}
      {pendingPartApprovalBooking && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Spare Part Approval Needed</h3>
              <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-relaxed">
                Your service partner has requested{' '}
                <span className="font-black text-slate-900">
                  {(pendingPartApprovalBooking.partApproval.partNames || []).join(', ') || 'a spare part'}
                </span>{' '}
                worth{' '}
                <span className="font-black text-brand-blue">₹{pendingPartApprovalBooking.partApproval.amount ?? 0}</span>{' '}
                for booking #{pendingPartApprovalBooking.humanId || pendingPartApprovalBooking.id}.
                Did you approve this request? It won't be ordered until you do.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                disabled={respondingPartApproval}
                onClick={() => handleRespondPartRequest(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={respondingPartApproval}
                onClick={() => handleRespondPartRequest(true)}
                className="flex-1 bg-brand-blue hover:bg-[#083679] text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {respondingPartApproval ? 'Submitting…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Booking Modal ── */}
      <RescheduleBookingModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setBookingToReschedule(null);
        }}
        onConfirm={handleRescheduleBooking}
        booking={bookingToReschedule}
        isLoading={Boolean(reschedulingId)}
      />

      {/* ── Cancel Booking Modal ── */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setBookingToCancel(null);
        }}
        onConfirm={handleCancelBooking}
        booking={bookingToCancel}
        isLoading={Boolean(cancellingId)}
      />

      {/* ── Customer Bottom Navigation Bar ── */}
      <CustomerBottomNav />

    </div>
  );
};

export default Bookings;
