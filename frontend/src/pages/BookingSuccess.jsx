import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight, Phone, Star,
  Wrench, Snowflake, Tag, Package, CalendarDays, Clock, Flame, CheckSquare,
} from 'lucide-react';
import { apiRequest, getStoredTokens } from '../lib/apiClient';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/v1\/?$/, '');

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = new URLSearchParams(location.search);
  const [callLoading, setCallLoading] = useState(false);
  const serviceRequestId = p.get('serviceRequestId') || p.get('bookingId');

  const [bookingId, setBookingId] = useState('');
  const [technician, setTechnician] = useState(() => {
    const name = p.get('technicianName');
    if (!name) return null;
    return {
      name,
      rating: parseFloat(p.get('technicianRating') || '4.8'),
      phone: p.get('technicianPhone') || '',
    };
  });
  const [charged, setCharged] = useState(null);

  const handleCallTechnician = async () => {
    if (technician?.phone) {
      window.location.href = `tel:${technician.phone}`;
      return;
    }
    if (!serviceRequestId) return;
    setCallLoading(true);
    try {
      await apiRequest('/calls/initiate', {
        method: 'POST',
        body: { serviceRequestId },
        auth: true,
      });
    } catch (err) {
      console.error('[calls] Click-to-call failed:', err.message);
      if (err.status !== 503) {
        alert(`Call failed: ${err.message}`);
      }
    } finally {
      setCallLoading(false);
    }
  };

  const serviceParam     = p.get('service')     || 'Home Service';
  const categoryParam    = p.get('category')    || '';
  const productTypeParam = p.get('productType') || '';
  const brandParam       = p.get('brand')       || '';
  const quantityParam    = p.get('quantity')    || '1';
  const dateParam        = p.get('date')        || 'Today';
  const timeGroupParam   = p.get('timeGroup')   || '09:00 AM';
  const totalPriceParam  = p.get('totalPrice')  || '299';
  const advanceAmtParam  = p.get('advanceAmt')  || '49';
  const paymentMode      = p.get('paymentMode') || 'after';

  const isInstant = p.get('isInstant') === 'true' || timeGroupParam === 'ASAP' || timeGroupParam.includes('ASAP');
  const [instantStatus, setInstantStatus] = useState(isInstant ? 'SEARCHING' : null);

  const loadBookingData = useCallback(async () => {
    if (!serviceRequestId) return;
    try {
      const res = await apiRequest(`/service-requests/${serviceRequestId}`, { auth: true });
      if (res?.humanId || res?.id) {
        setBookingId(res?.humanId || res?.id);
      }
      if (res?.technician) {
        setTechnician(typeof res.technician === 'object' ? res.technician : { name: 'Assigned Technician' });
      }
      if (res?.instantStatus) {
        setInstantStatus(res.instantStatus);
      }

      if (res?.booking) {
        const bk = typeof res.booking === 'object'
          ? res.booking
          : await apiRequest(`/bookings/${res.booking}`, { auth: true }).catch(() => null);
        if (bk) {
          if (bk.technician && !res?.technician) {
            setTechnician(typeof bk.technician === 'object' ? bk.technician : { name: 'Assigned Technician' });
          }
          if (bk.instantStatus && !res?.instantStatus) {
            setInstantStatus(bk.instantStatus);
          }
          setCharged({
            total: bk.totalPrice ?? null,
            advance: bk.advanceAmount ?? null,
            service: bk.service?.name || null,
            category: bk.category || null,
            productType: bk.productType || null,
            brand: bk.brand || null,
            quantity: bk.quantity != null ? String(bk.quantity) : null,
            date: bk.timeSlot?.date || null,
            timeSlot: bk.timeSlot?.time || null,
          });
        }
      }
    } catch (err) {
      console.error('[booking] Could not load booking reference:', err.message);
    }
  }, [serviceRequestId]);

  // Initial load + interval polling every 3 seconds to catch live status changes
  useEffect(() => {
    loadBookingData();
    const interval = setInterval(loadBookingData, 3000);
    return () => clearInterval(interval);
  }, [loadBookingData]);

  // Real-time socket updates for instant dispatch and tracking
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('instant:status_update', (data) => {
      if (data?.bookingId || data?.serviceRequestId === serviceRequestId) {
        if (data.technician) setTechnician(data.technician);
        if (data.instantStatus) setInstantStatus(data.instantStatus);
        loadBookingData();
      }
    });

    socket.on('tracking:update', (data) => {
      if (data?.serviceRequestId === serviceRequestId) {
        if (data.technician) setTechnician(data.technician);
        loadBookingData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serviceRequestId, loadBookingData]);

  const service     = serviceParam     || charged?.service     || 'Home Service';
  const category    = categoryParam    || charged?.category    || '';
  const productType = productTypeParam || charged?.productType || '';
  const brand       = brandParam       || charged?.brand       || '';
  const quantity    = quantityParam    || charged?.quantity    || '1';
  const date        = dateParam        || charged?.date        || 'Today';
  const timeGroup   = timeGroupParam   || charged?.timeSlot    || '09:00 AM';
  const totalPrice  = totalPriceParam  || (charged?.total != null ? String(charged.total) : '0');
  const advanceAmt  = advanceAmtParam  || (charged?.advance != null ? String(charged.advance) : '0');

  // Time slot display
  const timeSlotDisplay = isInstant ? '⚡ Right Now (Instant ASAP Service)' : ({
    Morning:   '8 AM – 11 AM',
    Afternoon: '12 PM – 3 PM',
    Evening:   '4 PM – 7 PM',
  }[timeGroup] || timeGroup);

  // Rows for the booking summary table — rendered 100% dynamically based on actual booked details
  const rows = [
    { Icon: Wrench, iconColor: '#9CA3AF', label: 'Service', value: service },
  ];

  if (category && category.toLowerCase() !== 'all') {
    rows.push({ Icon: Package, iconColor: '#6366F1', label: 'Category', value: category });
  }

  if (productType && productType !== '—') {
    rows.push({
      Icon: Snowflake,
      iconColor: '#3B82F6',
      label: `${category ? category : 'Appliance'} Type`,
      value: productType,
    });
  }

  if (brand && brand !== '—') {
    rows.push({ Icon: Tag, iconColor: '#F59E0B', label: 'Brand', value: brand });
  }

  rows.push({
    Icon: Package,
    iconColor: '#F97316',
    label: 'Quantity',
    value: `${quantity} ${quantity === '1' ? 'Unit' : 'Units'}`,
  });

  rows.push({ Icon: CalendarDays, iconColor: '#6366F1', label: 'Date', value: date });
  rows.push({ Icon: Clock, iconColor: '#EF4444', label: 'Time Slot', value: timeSlotDisplay });
  rows.push({ Icon: Flame, iconColor: '#F97316', label: 'Total Amount', value: `₹${totalPrice}` });
  rows.push({ Icon: CheckSquare, iconColor: '#22C55E', label: 'Advance Paid', value: `₹${advanceAmt}`, valueColor: '#0D47A1' });

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col font-sans">
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 overflow-y-auto">

        {/* ── Hero Section ── */}
        <div className="bg-gradient-to-b from-[#E8F0FF] to-[#F0F4FF] pt-8 md:pt-12 pb-6 flex flex-col items-center gap-3 px-4 rounded-3xl md:border md:border-blue-100/50 mb-6 shadow-xs">
          {/* Animated checkmark */}
          <div className="relative">
            {/* Sparkles */}
            <span className="absolute -top-3 -left-4 text-yellow-400 text-lg animate-pulse">✦</span>
            <span className="absolute -top-2 right-0 text-blue-300 text-sm animate-pulse delay-75">✦</span>
            <span className="absolute bottom-0 -right-5 text-yellow-300 text-sm animate-pulse delay-150">✦</span>
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#0D47A1] flex items-center justify-center shadow-lg shadow-[#0D47A1]/30">
              <svg viewBox="0 0 24 24" className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-[22px] md:text-3xl font-extrabold text-slate-900 leading-tight">Booking Confirmed!</h1>
            <p className="text-[12px] md:text-sm text-slate-500 font-medium mt-1">
              We've received your booking request and will be there on time.
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">

          {/* Left Column: Details, Live Tracker & Technician */}
          <div className="w-full md:col-span-7 lg:col-span-8 flex flex-col gap-4 text-left">

            {/* ── Booking ID ── */}
            <div className="bg-white rounded-2xl md:rounded-3xl px-5 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
              <span className="text-[11px] md:text-xs text-slate-500 font-semibold">Booking ID</span>
              <span className="text-[12px] md:text-sm font-extrabold text-slate-900 tracking-wider">{bookingId || '—'}</span>
            </div>

            {/* ── Booking Details Table ── */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
              {rows.map((row, i) => {
                const { Icon, iconColor, label, value, valueColor } = row;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3.5 px-5 py-4 ${
                      i < rows.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <Icon
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: iconColor }}
                      strokeWidth={1.8}
                    />
                    <span className="text-xs md:text-sm text-slate-500 font-medium flex-1">
                      {label}
                    </span>
                    <span
                      className="text-xs md:text-sm font-black"
                      style={{ color: valueColor || '#0F172A' }}
                    >
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Instant Service Live Tracker ── */}
            {isInstant && (
              <div className={`text-white rounded-2xl md:rounded-3xl p-5 shadow-md transition-all ${
                technician ? 'bg-gradient-to-r from-blue-700 to-indigo-700 shadow-blue-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ⚡ Live Express Dispatch
                  </span>
                  <span className="text-[11px] md:text-xs font-extrabold">
                    {instantStatus === 'EN_ROUTE' ? '🚗 On The Way' : (technician ? '✅ Technician Assigned' : '⏳ Searching Nearby Tech...')}
                  </span>
                </div>
                <div className="flex items-center gap-3.5 mt-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {technician ? '👨‍🔧' : '⏱️'}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-black leading-tight">
                      {technician ? `${technician.name || 'Technician'} is on the way!` : 'Connecting with nearest certified technician'}
                    </p>
                    <p className="text-[11px] text-white/90 font-medium mt-0.5">
                      {technician ? 'Estimated arrival: within 20-35 minutes' : 'Estimated arrival: within 30-45 minutes'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Assigned Technician ── */}
            {technician ? (
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xs border border-blue-100 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-50 text-[#0D47A1] text-[9px] md:text-xs font-extrabold px-3.5 py-1 rounded-bl-2xl border-l border-b border-blue-100 uppercase tracking-wider">
                  Assigned Expert
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0D47A1] to-[#1565C0] flex items-center justify-center flex-shrink-0 text-white text-xl font-black shadow-md">
                    {(technician.name || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm md:text-base font-black text-slate-900 truncate">{technician.name || 'Technician'}</p>
                      <span className="text-[9px] md:text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {(technician.rating || 4.8) > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-black text-slate-700">{technician.rating || 4.8}</span>
                        </div>
                      )}
                      {(categoryParam || technician.specs?.[0]) && (
                        <span className="text-xs text-slate-400 font-medium truncate">
                          • {categoryParam || technician.specs?.[0]} Specialist
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleCallTechnician}
                    disabled={callLoading}
                    title="Call Assigned Technician"
                    className="w-12 h-12 rounded-2xl bg-[#EAF4FF] flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-xs border border-blue-200 hover:bg-[#D6ECFF] cursor-pointer"
                  >
                    <Phone className="w-5 h-5 text-[#0D47A1]" />
                  </button>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Technician Status</span>
                  <span className="text-[#0D47A1] font-black flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {instantStatus === 'EN_ROUTE' ? 'Driving to Location' : 'Accepted Job'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xs border border-slate-100 p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 font-black text-base animate-pulse">
                  ⌛
                </div>
                <p className="text-xs md:text-sm font-black text-slate-800">Connecting to nearest technician...</p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Your request is live. You'll see technician details as soon as accepted.
                </p>
              </div>
            )}

            {/* Mobile Actions */}
            <div className="flex flex-col gap-3 md:hidden mt-2">
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full bg-[#0D47A1] text-white font-extrabold py-4 rounded-2xl text-[15px] shadow-md shadow-[#0D47A1]/25 hover:bg-[#1565C0] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                View My Bookings
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-center text-[13px] font-extrabold text-slate-600 hover:text-slate-900 transition-colors py-1"
              >
                Go to Home
              </button>
            </div>

            {/* Mobile Bottom Trust Bar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 px-4 py-3 md:hidden">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '👨‍🔧', label: 'Verified\nTechnicians' },
                  { icon: '🔩',  label: 'Genuine\nSpare Parts' },
                  { icon: '🛡️', label: '7-Day\nWarranty' },
                  { icon: '🏠',  label: 'Doorstep\nService' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[9px] text-slate-500 font-semibold leading-tight whitespace-pre-line">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Desktop Actions & Trust Badges */}
          <div className="w-full md:col-span-5 lg:col-span-4 hidden md:flex flex-col gap-6 sticky top-24 text-left">
            
            {/* Desktop Actions Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Next Steps</h2>

              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full bg-[#0D47A1] text-white font-black py-4 rounded-2xl text-sm shadow-md shadow-[#0D47A1]/20 hover:bg-[#1565C0] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                View My Bookings
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-center text-xs font-black text-slate-600 hover:text-slate-900 transition-colors py-2 border border-slate-200 rounded-2xl hover:bg-slate-50 cursor-pointer"
              >
                Go to Home
              </button>
            </div>

            {/* Desktop Trust Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Service Assurances</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '👨‍🔧', title: 'Verified', sub: 'Certified Experts' },
                  { icon: '🔩',  title: 'Genuine', sub: 'Spare Parts' },
                  { icon: '🛡️', title: '7-Day', sub: 'Job Warranty' },
                  { icon: '🏠',  title: 'Doorstep', sub: 'Service Delivery' },
                ].map((item) => (
                  <div key={item.title} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-black text-slate-900">{item.title}</span>
                    <span className="text-[10px] font-semibold text-slate-400 leading-tight">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
