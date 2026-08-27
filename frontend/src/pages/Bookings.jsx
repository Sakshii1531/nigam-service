import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, Wrench, Home as HomeIcon, User, ShoppingCart, 
  LayoutGrid, Search, CheckCircle2, AlertTriangle, X, ChevronRight, Phone, 
  MapPin, CreditCard, FileText, RefreshCw, Star, ShieldCheck, Truck, 
  RotateCcw, Sparkles, HelpCircle, Package, Check
} from 'lucide-react';
import { apiRequest, getStoredTokens } from '../lib/apiClient';
import { io } from 'socket.io-client';
import CustomerTopNav from '../components/CustomerTopNav';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/v1\/?$/, '');

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled'];

const STATUS_BADGES = {
  Upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  Ongoing: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Parts Pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Spare Ordered': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  Rescheduled: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Revisit Scheduled': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

const CATEGORY_COLORS = {
  AC: 'bg-sky-100 text-sky-800',
  Refrigerator: 'bg-cyan-100 text-cyan-800',
  'Washing Machine': 'bg-indigo-100 text-indigo-800',
  RO: 'bg-blue-100 text-blue-800',
  TV: 'bg-purple-100 text-purple-800',
  Chimney: 'bg-amber-100 text-amber-800',
  Geyser: 'bg-orange-100 text-orange-800',
  Electrician: 'bg-yellow-100 text-yellow-800',
  Plumber: 'bg-teal-100 text-teal-800',
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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    // Poll every 5s if there are pending or upcoming bookings
    const interval = setInterval(() => {
      loadBookings(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  // Real-time socket updates for booking status and technician assignment
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('instant:status_update', () => {
      loadBookings(true);
    });

    socket.on('tracking:update', () => {
      loadBookings(true);
    });

    socket.on('service_request:updated', () => {
      loadBookings(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [loadBookings]);

  // Check if a specific booking was passed via navigation state to open directly
  useEffect(() => {
    if (location.state?.bookingId && bookings.length > 0) {
      const match = bookings.find(b => (b.id === location.state.bookingId || b.humanId === location.state.bookingId));
      if (match) setSelectedBooking(match);
    }
  }, [location.state, bookings]);

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setCancellingId(selectedBooking.id);
    try {
      await apiRequest(`/bookings/${selectedBooking.id}/cancel`, { method: 'POST', auth: true });
      setShowCancelModal(false);
      setToastMessage('Booking has been cancelled successfully.');
      setTimeout(() => setToastMessage(''), 4000);
      await loadBookings();
      // Update selected booking view
      setSelectedBooking(prev => prev ? { ...prev, status: 'Cancelled' } : null);
    } catch (err) {
      setError(err.message || 'Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const status = b.status || 'Upcoming';
    if (activeTab === 'Upcoming' && (status !== 'Upcoming' && status !== 'Ongoing')) return false;
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

  const getTimelineSteps = (booking) => {
    const sr = booking.serviceRequest;
    const tl = sr?.timeline || [];

    const hasTl = (label) => tl.some((t) => t.stepLabel?.toLowerCase().includes(label.toLowerCase()) || t.description?.toLowerCase().includes(label.toLowerCase()));
    const getTlItem = (label) => tl.find((t) => t.stepLabel?.toLowerCase().includes(label.toLowerCase()) || t.description?.toLowerCase().includes(label.toLowerCase()));

    const isSpareReq = hasTl('Spare Required') || hasTl('Spare Ordered') || sr?.status === 'Spare Required' || sr?.status === 'Spare Ordered' || booking.instantStatus === 'PARTS_PENDING' || booking.status === 'Parts Pending';
    const isSpareApproved = hasTl('Spare Approved');
    const isSpareDispatched = hasTl('Spare Dispatched');
    const isSpareReceived = hasTl('Spare Received') || sr?.status === 'Spare Received' || booking.instantStatus === 'RESCHEDULED' || booking.status === 'Rescheduled' || booking.status === 'Revisit Scheduled';
    const isCompleted = booking.status === 'Completed' || sr?.status === 'Repair Completed' || sr?.status === 'Closed';
    const isCancelled = booking.status === 'Cancelled' || sr?.status === 'Cancelled';

    const steps = [
      {
        id: 'confirmed',
        title: 'Booking Placed',
        desc: 'Booking received & scheduled',
        time: booking.createdAt ? new Date(booking.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Confirmed',
        completed: true,
        current: false,
      },
      {
        id: 'assigned',
        title: 'Technician Assigned',
        desc: booking.technician?.name ? `${booking.technician.name} (Verified Partner)` : 'Assigning nearest verified engineer',
        time: booking.technician ? 'Assigned' : '',
        completed: Boolean(booking.technician),
        current: false,
      },
    ];

    if (isSpareReq || isSpareReceived) {
      const spareItem = getTlItem('Spare Required') || getTlItem('Spare Ordered');
      steps.push({
        id: 'spare_pending',
        title: 'Spare Part Ordered',
        desc: spareItem?.description || 'Spare parts requested from warehouse for appliance repair',
        time: spareItem?.timestamp ? new Date(spareItem.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Ordered',
        completed: true,
        current: !isSpareApproved && !isSpareDispatched && !isSpareReceived && !isCompleted,
      });

      if (isSpareApproved || isSpareDispatched || isSpareReceived) {
        steps.push({
          id: 'spare_dispatched',
          title: isSpareDispatched ? 'Spare Part Dispatched' : 'Spare Part Approved',
          desc: isSpareDispatched ? 'Part dispatched to technician via logistics' : 'Approved by warehouse admin',
          time: 'Processed',
          completed: true,
          current: !isSpareReceived && !isCompleted,
        });
      }

      if (isSpareReceived) {
        const revisitDateStr = booking.scheduledDate 
          ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
          : 'Scheduled';
        const timeSlotStr = typeof booking.timeSlot === 'object' ? (booking.timeSlot?.time || '10:00 AM - 01:00 PM') : (booking.timeSlot || '10:00 AM - 01:00 PM');
        steps.push({
          id: 'revisit_scheduled',
          title: 'Revisit Scheduled',
          desc: `Spare delivered to technician. Revisit confirmed for ${revisitDateStr} (${timeSlotStr}) to complete repair.`,
          time: 'Scheduled',
          completed: true,
          current: !isCompleted,
        });
      }
    } else {
      steps.push({
        id: 'in_progress',
        title: 'Service In Progress',
        desc: sr?.status === 'Work in Progress' || sr?.status === 'Inspection' || sr?.status === 'Engineer Reached' ? 'Technician inspecting appliance' : 'Inspection & repair',
        time: '',
        completed: isCompleted,
        current: booking.status === 'Ongoing' && !isCompleted && !isCancelled,
      });
    }

    steps.push({
      id: 'completed',
      title: isCancelled ? 'Booking Cancelled' : 'Service Completed',
      desc: isCancelled ? 'Cancelled by customer' : 'Inspection complete & warranty active',
      time: booking.updatedAt && (isCompleted || isCancelled) ? new Date(booking.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
      completed: isCompleted || isCancelled,
      current: isCompleted,
      isCancelled,
    });

    return steps;
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 lg:pb-8 lg:pt-14">
      
      {/* Desktop Top Nav */}
      <CustomerTopNav activePage="bookings" />

      {/* Top App Header — mobile only */}
      <div className="bg-white border-b border-slate-100 px-5 pt-4 pb-3 sticky top-0 z-30 shadow-xs lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer border border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          
          <div className="text-center">
            <h1 className="text-base font-extrabold text-[#052355] tracking-tight">My Bookings</h1>
            <p className="text-[10px] text-slate-500 font-semibold">{bookings.length} total services</p>
          </div>

          <button 
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors cursor-pointer border border-slate-100 disabled:opacity-50 text-slate-700"
            title="Refresh Bookings"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin text-[#0D47A1]' : ''}`} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking ID, appliance, or brand..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D47A1] focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pt-1 pb-1">
          {TABS.map((tab) => {
            const count = tab === 'All' 
              ? bookings.length 
              : bookings.filter(b => tab === 'Upcoming' ? (b.status === 'Upcoming' || b.status === 'Ongoing') : b.status === tab).length;
            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List — Grid on desktop */}
      <div className="flex-1 p-4 flex flex-col gap-3.5 max-w-screen-xl mx-auto w-full lg:grid lg:grid-cols-2 lg:auto-rows-min overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs animate-pulse flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded-md w-24"></div>
                  <div className="h-5 bg-slate-200 rounded-full w-20"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded-md w-1/2"></div>
                <div className="h-10 bg-slate-100 rounded-2xl mt-1"></div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 my-12">
            <div className="w-16 h-16 bg-blue-50 text-[#0D47A1] rounded-3xl flex items-center justify-center shadow-xs">
              <Wrench className="h-8 w-8 text-[#0D47A1]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#052355]">No {activeTab !== 'All' ? activeTab : ''} Bookings Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                {searchQuery 
                  ? `No bookings matched "${searchQuery}". Try a different keyword.` 
                  : 'You have not placed any service bookings in this section.'}
              </p>
            </div>
            <button 
              onClick={() => navigate('/services')}
              className="mt-3 bg-[#0D47A1] hover:bg-[#09357a] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              Book a Service
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isPartsPending = b.instantStatus === 'PARTS_PENDING' || b.partPending || b.serviceRequest?.status === 'Spare Ordered' || b.serviceRequest?.status === 'Spare Required' || b.status === 'Parts Pending';
            const isRescheduled = b.instantStatus === 'RESCHEDULED' || b.serviceRequest?.status === 'Spare Received' || b.status === 'Rescheduled' || b.status === 'Revisit Scheduled';
            const status = isPartsPending ? 'Parts Pending' : isRescheduled ? 'Revisit Scheduled' : (b.status || 'Upcoming');
            const badge = STATUS_BADGES[status] || STATUS_BADGES.Upcoming;
            const categoryBadge = CATEGORY_COLORS[b.category] || 'bg-slate-100 text-slate-700';
            const scheduledDateStr = b.scheduledDate 
              ? new Date(b.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
              : 'Scheduled';
            const timeStr = typeof b.timeSlot === 'object' ? (b.timeSlot?.time || '10:00 AM - 01:00 PM') : (b.timeSlot || '10:00 AM - 01:00 PM');
            const price = b.totalPrice != null ? `₹${b.totalPrice}` : '₹499';

            return (
              <div
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className="bg-white rounded-3xl p-4 border border-slate-100/90 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group relative overflow-hidden text-left"
              >
                {/* Status Bar Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#052355]">{b.humanId || b.id?.slice(-8)}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${categoryBadge}`}>
                      {b.category}
                    </span>
                  </div>
                  
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {status}
                  </span>
                </div>

                {/* Service Details */}
                <div>
                  <h3 className="text-sm font-black text-[#052355] group-hover:text-[#0D47A1] transition-colors leading-tight">
                    {b.service?.name || `${b.category} Service`}
                  </h3>
                  {b.brand && (
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Brand: <span className="text-slate-800">{b.brand}</span>
                    </p>
                  )}
                </div>

                {/* Date & Time ribbon */}
                <div className="bg-slate-50/80 rounded-2xl p-2.5 flex items-center justify-between border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold text-[11px]">
                    <Calendar className="h-3.5 w-3.5 text-[#0D47A1]" />
                    <span>{scheduledDateStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-[#0D47A1]" />
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* Technician preview & Closure OTP if assigned */}
                {b.technician && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-blue-50/40 rounded-2xl px-3 py-2 border border-blue-100/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0D47A1] text-white flex items-center justify-center text-[10px] font-black">
                          {b.technician.name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#052355] leading-none">{b.technician.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Verified Technician</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">{b.technician.phone ? 'Tap to Call' : ''}</span>
                      </div>
                    </div>

                    {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl px-3.5 py-2 border border-blue-100">
                        <div className="flex items-center gap-1.5 text-xs text-[#052355] font-bold">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#0D47A1]" />
                          <span className="text-[11px]">Verification OTP:</span>
                        </div>
                        <span className="bg-[#052355] text-white text-xs font-black px-2.5 py-0.5 rounded-lg tracking-widest">
                          {b.completionOtp || b.serviceRequest?.completionOtp || '8745'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {b.technician?.rating && (
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                    ★ {b.technician.rating}
                  </span>
                )}

                {/* Card Footer: Price & Action */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Amount</span>
                    <span className="text-sm font-black text-[#052355]">{price}</span>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBooking(b);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0D47A1] hover:text-[#052355] bg-blue-50/80 hover:bg-blue-100/80 px-3.5 py-1.5 rounded-xl transition-all"
                  >
                    <span>View Details</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Details Modal / Sheet */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fade-in">
          <div 
            className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#052355] text-white p-5 flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Booking Summary</span>
                  {(() => {
                    const sr = selectedBooking.serviceRequest;
                    const tl = sr?.timeline || [];
                    const hasTl = (lbl) => tl.some((t) => t.stepLabel?.toLowerCase().includes(lbl.toLowerCase()) || t.description?.toLowerCase().includes(lbl.toLowerCase()));
                    const isPartsPending = selectedBooking.instantStatus === 'PARTS_PENDING' || selectedBooking.partPending || hasTl('Spare Required') || hasTl('Spare Ordered') || sr?.status === 'Spare Ordered' || sr?.status === 'Spare Required' || selectedBooking.status === 'Parts Pending';
                    const isRescheduled = selectedBooking.instantStatus === 'RESCHEDULED' || hasTl('Spare Received') || sr?.status === 'Spare Received' || selectedBooking.status === 'Rescheduled' || selectedBooking.status === 'Revisit Scheduled';
                    const modalStatus = selectedBooking.status === 'Completed' ? 'Completed' :
                                       selectedBooking.status === 'Cancelled' ? 'Cancelled' :
                                       isRescheduled ? 'Revisit Scheduled' :
                                       isPartsPending ? 'Parts Pending' :
                                       (selectedBooking.status || 'Upcoming');
                    const badgeClasses = 
                      modalStatus === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                      modalStatus === 'Cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                      modalStatus === 'Parts Pending' ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40' :
                      modalStatus === 'Revisit Scheduled' ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40' :
                      'bg-blue-400/20 text-blue-200 border border-blue-300/30';
                    return (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${badgeClasses}`}>
                        {modalStatus}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-base font-extrabold text-white leading-tight">
                  {selectedBooking.humanId || selectedBooking.id}
                </h2>
              </div>

              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#F8FAFC]">
              
              {/* Service Completion OTP Card */}
              {selectedBooking.status !== 'Completed' && selectedBooking.status !== 'Cancelled' && (
                <div className="bg-gradient-to-r from-[#052355] to-[#0D47A1] rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Service Verification OTP
                    </span>
                    <p className="text-[11px] text-blue-100 font-medium">Share this code with technician at job closure</p>
                  </div>
                  <div className="bg-white text-[#052355] px-4 py-2 rounded-xl font-black text-lg tracking-widest shadow-sm">
                    {selectedBooking.completionOtp || selectedBooking.serviceRequest?.completionOtp || '8745'}
                  </div>
                </div>
              )}

              {/* Service & Product Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#0D47A1] uppercase tracking-wider block">
                      {selectedBooking.category}
                    </span>
                    <h3 className="text-sm font-black text-[#052355] mt-0.5">
                      {selectedBooking.service?.name || `${selectedBooking.category} Repair`}
                    </h3>
                  </div>
                  <span className="text-sm font-black text-[#052355]">
                    ₹{selectedBooking.totalPrice ?? selectedBooking.service?.price ?? 499}
                  </span>
                </div>

                {selectedBooking.brand && (
                  <p className="text-xs text-slate-600 font-semibold">
                    Brand: <span className="text-slate-900 font-bold">{selectedBooking.brand}</span>
                    {selectedBooking.productType ? ` • ${selectedBooking.productType}` : ''}
                  </p>
                )}

                {selectedBooking.service?.desc && (
                  <p className="text-[11px] text-slate-500 font-normal leading-relaxed mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {selectedBooking.service.desc}
                  </p>
                )}
              </div>

              {/* Appointment Schedule & Address */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
                <h4 className="text-xs font-black text-[#052355] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#0D47A1]" /> Appointment & Location
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Date</span>
                    <span className="font-bold text-[#052355]">
                      {selectedBooking.scheduledDate ? new Date(selectedBooking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Time Slot</span>
                    <span className="font-bold text-[#052355]">
                      {typeof selectedBooking.timeSlot === 'object' ? (selectedBooking.timeSlot?.time || '10:00 AM - 01:00 PM') : (selectedBooking.timeSlot || '10:00 AM - 01:00 PM')}
                    </span>
                  </div>
                </div>

                {selectedBooking.address && (
                  <div className="flex gap-2.5 items-start bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <MapPin className="h-4 w-4 text-[#0D47A1] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">
                        {selectedBooking.fullName || 'Customer Address'} {selectedBooking.mobile ? `(${selectedBooking.mobile})` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">
                        {typeof selectedBooking.address === 'object' 
                          ? `${selectedBooking.address.street || selectedBooking.address.addressLine1 || ''} ${selectedBooking.address.city || ''} ${selectedBooking.address.pincode || ''}`
                          : selectedBooking.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Technician Info Card */}
              {selectedBooking.technician ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-2.5">
                  <h4 className="text-xs font-black text-[#052355] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#0D47A1]" /> Assigned Expert
                  </h4>

                  <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0D47A1] text-white flex items-center justify-center text-sm font-black shadow-xs">
                        {selectedBooking.technician.name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-[#052355]">{selectedBooking.technician.name}</h5>
                        <p className="text-[10px] text-slate-500 font-semibold">Nigam Verified Service Partner</p>
                        {selectedBooking.technician.rating && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold mt-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{selectedBooking.technician.rating} Rating</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedBooking.technician.phone && (
                      <button 
                        onClick={() => window.location.href = `tel:${selectedBooking.technician.phone}`}
                        className="p-2.5 bg-[#0D47A1] text-white rounded-xl shadow-xs hover:bg-[#09357a] transition-all cursor-pointer"
                        title="Call Technician"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#052355]">Assigning Technician</h5>
                    <p className="text-[10px] text-slate-500 font-normal">A verified engineer in your area will be allocated before appointment time.</p>
                  </div>
                </div>
              )}

              {/* Live Tracking Progress Timeline */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
                <h4 className="text-xs font-black text-[#052355] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-[#0D47A1]" /> Live Service Progress
                </h4>

                <div className="flex flex-col pl-2 mt-1">
                  {getTimelineSteps(selectedBooking).map((step, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={step.id} className="flex gap-3 relative">
                        {/* Dot & Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${
                            step.isCancelled 
                              ? 'bg-rose-500' 
                              : step.completed 
                                ? 'bg-emerald-500' 
                                : step.current 
                                  ? 'bg-[#0D47A1] ring-4 ring-blue-100' 
                                  : 'bg-slate-200'
                          }`}>
                            {step.completed && !step.isCancelled && <Check className="h-3 w-3 stroke-[3]" />}
                            {step.isCancelled && <X className="h-3 w-3 stroke-[3]" />}
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 flex-1 my-1 ${step.completed ? 'bg-emerald-400' : 'bg-slate-200'}`} style={{ minHeight: 28 }} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-4 flex flex-col gap-0.5 flex-1">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold ${step.completed || step.current ? 'text-[#052355]' : 'text-slate-400'}`}>
                              {step.title}
                            </span>
                            {step.time && <span className="text-[10px] text-slate-400 font-semibold">{step.time}</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-2.5">
                <h4 className="text-xs font-black text-[#052355] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-[#0D47A1]" /> Payment Summary
                </h4>

                <div className="flex flex-col gap-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-medium">Service Charge</span>
                    <span className="font-bold text-slate-800">₹{selectedBooking.totalPrice ?? 499}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 font-medium">Payment Mode</span>
                    <span className="font-bold text-[#0D47A1] uppercase text-[11px]">
                      {selectedBooking.paymentMode === 'advance' ? 'Advance Paid Online' : 'Pay After Service'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-sm">
                    <span className="font-black text-[#052355]">Total Amount</span>
                    <span className="font-black text-[#052355]">₹{selectedBooking.totalPrice ?? 499}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2.5">
              {selectedBooking.status === 'Upcoming' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 transition-colors cursor-pointer"
                >
                  Cancel Booking
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedBooking(null);
                  navigate('/services');
                }}
                className="flex-1 py-3 px-4 bg-[#0D47A1] hover:bg-[#09357a] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer text-center"
              >
                Book Another Service
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[60] animate-fade-in">
          <div className="bg-white rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#052355]">Cancel This Booking?</h4>
              <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                Are you sure you want to cancel booking {selectedBooking?.humanId || selectedBooking?.id}?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                disabled={Boolean(cancellingId)}
                onClick={handleCancelBooking}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                {cancellingId ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>
        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>
        <button 
          className="flex flex-col items-center text-brand-blue"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>

    </div>
  );
};

export default Bookings;
