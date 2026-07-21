import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight, Phone, Star,
  Wrench, Snowflake, Tag, Package, CalendarDays, Clock, Flame, CheckSquare,
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = new URLSearchParams(location.search);
  const [callLoading, setCallLoading] = useState(false);
  const serviceRequestId = p.get('serviceRequestId') || p.get('bookingId');

  const handleCallTechnician = async () => {
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

  const service     = p.get('service')     || 'Installation';
  const category    = p.get('category')    || 'AC';
  const productType = p.get('productType') || 'Split AC';
  const brand       = p.get('brand')       || '—';
  const quantity    = p.get('quantity')    || '1';
  const date        = p.get('date')        || '—';
  const timeGroup   = p.get('timeGroup')   || '—';
  const totalPrice  = p.get('totalPrice')  || '299';
  const advanceAmt  = p.get('advanceAmt')  || '49';
  const paymentMode = p.get('paymentMode') || 'advance';

  // Generate booking ID
  const bookingId = React.useMemo(() => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `NCC-${yy}${mm}${dd}-${rand}`;
  }, []);

  // Time slot display
  const timeSlotDisplay = {
    Morning:   '8 AM – 11 AM',
    Afternoon: '12 PM – 3 PM',
    Evening:   '4 PM – 7 PM',
  }[timeGroup] || timeGroup;

  // Rows for the booking summary table
  const rows = [
    { Icon: Wrench,       iconColor: '#9CA3AF', label: 'Service',            value: service },
    { Icon: Snowflake,    iconColor: '#3B82F6', label: `${category} Type`,   value: productType },
    { Icon: Tag,          iconColor: '#F59E0B', label: 'Brand',              value: brand },
    { Icon: Package,      iconColor: '#F97316', label: 'Quantity',           value: `${quantity} ${quantity === '1' ? category : category + 's'}` },
    { Icon: CalendarDays, iconColor: '#6366F1', label: 'Date',               value: date },
    { Icon: Clock,        iconColor: '#EF4444', label: 'Time Slot',          value: timeSlotDisplay },
    { Icon: Flame,        iconColor: '#F97316', label: 'Total Amount',       value: `₹${totalPrice}` },
    { Icon: CheckSquare,  iconColor: '#22C55E', label: 'Advance Paid',       value: `₹${advanceAmt}`, valueColor: '#0D47A1' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col font-sans">
      <div className="flex-1 overflow-y-auto pb-6">

        {/* ── Hero Section ── */}
        <div className="bg-gradient-to-b from-[#E8F0FF] to-[#F0F4FF] pt-12 pb-6 flex flex-col items-center gap-3 px-4">
          {/* Animated checkmark */}
          <div className="relative">
            {/* Sparkles */}
            <span className="absolute -top-3 -left-4 text-yellow-400 text-lg animate-pulse">✦</span>
            <span className="absolute -top-2 right-0 text-blue-300 text-sm animate-pulse delay-75">✦</span>
            <span className="absolute bottom-0 -right-5 text-yellow-300 text-sm animate-pulse delay-150">✦</span>
            <div className="w-20 h-20 rounded-full bg-[#0D47A1] flex items-center justify-center shadow-lg shadow-[#0D47A1]/30">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Booking Confirmed!</h1>
            <p className="text-[12px] text-slate-500 font-medium mt-1">
              We've received your booking request<br />and will be there on time.
            </p>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-4">

          {/* ── Booking ID ── */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-semibold">Booking ID</span>
            <span className="text-[12px] font-extrabold text-slate-900 tracking-wider">{bookingId}</span>
          </div>

          {/* ── Booking Details Table ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {rows.map((row, i) => {
              const { Icon, iconColor, label, value, valueColor } = row;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i < rows.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  {/* Colored icon — no background box */}
                  <Icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    style={{ color: iconColor }}
                    strokeWidth={1.8}
                  />
                  {/* Label */}
                  <span className="text-[12px] text-slate-500 font-medium flex-1">
                    {label}
                  </span>
                  {/* Value */}
                  <span
                    className="text-[13px] font-extrabold"
                    style={{ color: valueColor || '#0F172A' }}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Assigned Technician ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0D47A1] to-[#1565C0] flex items-center justify-center flex-shrink-0 text-white text-lg font-extrabold shadow-md">
                R
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-extrabold text-slate-900">Rahul Sharma</p>
                  <span className="text-[9px] bg-[#0D47A1] text-white font-extrabold px-2 py-0.5 rounded-full">
                    Expert
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-extrabold text-slate-700">4.8</span>
                  <span className="text-[10px] text-slate-400 font-medium">(128 jobs completed)</span>
                </div>
              </div>
              {/* Call button */}
              <button
                onClick={handleCallTechnician}
                disabled={callLoading}
                title={callLoading ? 'Connecting…' : 'Call Technician (masked relay)'}
                className="w-10 h-10 rounded-full bg-[#EAF4FF] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-50"
              >
                <Phone className="w-4 h-4 text-[#0D47A1]" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-3 text-center">
              Assigned Technician
            </p>
          </div>

          {/* ── Action Buttons ── */}
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

          {/* ── Bottom trust bar ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 mt-1">
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
      </div>
    </div>
  );
};

export default BookingSuccess;
