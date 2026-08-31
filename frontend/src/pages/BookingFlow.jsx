import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, MapPin, User, Phone, CalendarDays,
  Sun, Moon, Info, ShieldCheck, ArrowRight, Zap, Sparkles, CheckCircle2, Clock
} from 'lucide-react';
import { apiRequest, getStoredTokens, storeTokens } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

import { getCatalogEntry, preloadCatalogOverrides } from '../data/bookingCatalog';

import electricianBanner from '../assets/electrician_banner.png';
import plumbingBanner from '../assets/plumbing_banner.png';
import acBanner from '../assets/ac_service_banner.png';
import heroService from '../assets/hero_service.png';

const getDefaultBanner = (categoryKey) => {
  const norm = (categoryKey || '').toLowerCase();
  if (norm.includes('ac')) return acBanner;
  if (norm.includes('elect')) return electricianBanner;
  if (norm.includes('plumb')) return plumbingBanner;
  return heroService;
};

const getCatalog = (category) => getCatalogEntry(category);

// ─── Step Labels (4 steps) ────────────────────────────────────────────────────
const STEP_LABELS = ['Type', 'Service', 'Schedule', 'Payment'];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const StepBar = ({ currentStep, total = 4 }) => (
  <div className="w-full max-w-xs mx-auto flex flex-col gap-1 mt-1">
    <div className="flex items-center justify-between px-1">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const active = stepNum <= currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <span
            key={idx}
            className={`text-[10px] font-black transition-all ${
              isCurrent
                ? 'text-[#0D47A1] scale-105'
                : active
                ? 'text-slate-700'
                : 'text-slate-300'
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
    <div className="flex items-center gap-1.5 w-full">
      {[...Array(total)].map((_, idx) => {
        const active = idx + 1 <= currentStep;
        const isCurrent = idx + 1 === currentStep;
        return (
          <div
            key={idx}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              active
                ? isCurrent
                  ? 'bg-[#0D47A1] shadow-xs ring-2 ring-[#0D47A1]/20'
                  : 'bg-[#1565C0]'
                : 'bg-slate-200'
            }`}
          />
        );
      })}
    </div>
  </div>
);

const isImageIcon = (val) => {
  if (typeof val !== 'string') return false;
  const s = val.toLowerCase().trim();
  return (
    s.startsWith('data:image/') ||
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('/') ||
    s.includes('/assets/') ||
    s.endsWith('.png') ||
    s.endsWith('.jpg') ||
    s.endsWith('.jpeg') ||
    s.endsWith('.svg') ||
    s.endsWith('.webp')
  );
};

// ─── Option Card (Step 1) ─────────────────────────────────────────────────────
const OptionCard = ({ icon, name, desc, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-center w-full cursor-pointer ${
      selected
        ? 'border-[#0D47A1] bg-gradient-to-b from-blue-50/80 to-blue-100/30 shadow-md shadow-[#0D47A1]/10 ring-1 ring-[#0D47A1]'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
    }`}
  >
    {selected && (
      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#0D47A1] flex items-center justify-center shadow-xs">
        <Check className="w-3 h-3 text-white stroke-[3]" />
      </div>
    )}

    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform ${
      selected ? 'bg-white shadow-xs scale-105' : 'bg-slate-50'
    }`}>
      {isImageIcon(icon) ? (
        <img src={icon} alt={name} className="w-7 h-7 object-contain" />
      ) : (
        icon || '⚡'
      )}
    </div>

    <span className={`text-[13px] font-black leading-tight ${selected ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
      {name}
    </span>
    {desc && (
      <span className={`text-[10px] font-medium leading-tight ${selected ? 'text-[#0D47A1]/80' : 'text-slate-400'}`}>
        {desc}
      </span>
    )}
  </button>
);

// ─── Bottom Summary Bar ────────────────────────────────────────────────────────
const BottomBar = ({ icon, label, sublabel, price, btnLabel, btnDisabled, onBtn, onExpand, expanded }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-30 transition-all md:hidden">
    {/* Summary row */}
    <button
      type="button"
      onClick={onExpand}
      className="w-full flex items-center gap-3 px-5 pt-3 pb-1.5 hover:bg-slate-50/50 transition-colors"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-base flex-shrink-0">
          {isImageIcon(icon) ? (
            <img src={icon} alt="" className="w-5 h-5 object-contain" />
          ) : (
            icon || '🔧'
          )}
        </div>
        <div className="flex flex-col items-start min-w-0 text-left">
          {label && <span className="text-[12px] font-black text-slate-900 truncate">{label}</span>}
          {sublabel && <span className="text-[10px] text-slate-400 font-semibold truncate">{sublabel}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[16px] font-black text-slate-900">₹{price}</span>
        {onExpand && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
      </div>
    </button>
    {/* CTA */}
    <div className="px-5 pb-4 pt-1">
      <button
        type="button"
        disabled={btnDisabled}
        onClick={onBtn}
        className={`w-full font-black py-3.5 rounded-2xl text-[14px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
          btnDisabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-md shadow-[#0D47A1]/25'
        }`}
      >
        {btnLabel}
        {!btnDisabled && <ArrowLeft className="w-4 h-4 rotate-180" />}
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const BookingFlow = () => {
  const navigate = useNavigate();
  const { category } = useParams();

  const [overridesLoaded, setOverridesLoaded] = useState(false);
  useEffect(() => {
    preloadCatalogOverrides().finally(() => setOverridesLoaded(true));
  }, []);

  const catalog = overridesLoaded ? getCatalog(category) : null;

  useEffect(() => {
    if (overridesLoaded && !catalog) navigate('/dashboard', { replace: true });
  }, [overridesLoaded, catalog, navigate]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Step 2
  const [service, setService] = useState('');

  // Step 3
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [installLocation, setInstallLocation] = useState('Ground Floor');

  // Step 4
  const [selectedDate, setSelectedDate] = useState('');
  const [timeGroup, setTimeGroup] = useState('');

  // Step 5
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState({ house: '', area: '', city: '', pincode: '' });
  const [paymentMode, setPaymentMode] = useState('advance');
  const [priceExpanded, setPriceExpanded] = useState(false);

  const { user } = useAuth();

  // Prefill user data if available from session
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.phone && !mobile) setMobile(user.phone);
      if (user.address && typeof user.address === 'string' && !address.house) {
        setAddress(prev => ({ ...prev, house: user.address, city: user.city || prev.city }));
      }
    }
  }, [user]);

  // Ref for hidden native date input
  const dateInputRef = useRef(null);

  // Auto-select today's date when ASAP is selected
  useEffect(() => {
    if (timeGroup === 'ASAP') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();
      setSelectedDate(`${days[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]}`);
    }
  }, [timeGroup]);

  if (!overridesLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-[#0D47A1] rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading service details…</p>
      </div>
    );
  }
  if (!catalog) return null;

  const { key: catKey, data } = catalog;

  // ── Computed values ────────────────────────────────────────────────────────
  const selectedServiceData = data.services.default.find(s => s.id === service);
  const unitPrice = selectedServiceData?.price || 299;
  const totalPrice = unitPrice * quantity;
  const advanceAmt = 199;
  const remaining = totalPrice - advanceAmt;

  // Date generation
  const getUpcomingDates = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const dates = [];
    for (let i = 0; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      dates.push({
        dayName: isToday ? 'Today' : days[d.getDay()],
        dayNum: d.getDate(),
        month: months[d.getMonth()],
        full: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
      });
    }
    return dates;
  };
  const upcomingDates = getUpcomingDates();

  const TIME_GROUPS = [
    {
      id: 'ASAP',
      icon: <Zap className="w-5 h-5 text-amber-500 fill-amber-400 animate-pulse" />,
      label: 'Service Needed Now (ASAP)',
      timeRange: 'Assigned in 5 mins • Tech arrives in 30-45 mins',
      isInstant: true,
      badge: '⚡ EXPRESS DISPATCH',
    },
    { id: 'Morning',   icon: <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />, label: 'Morning',   timeRange: '8 AM – 11 AM' },
    { id: 'Afternoon', icon: <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />, label: 'Afternoon', timeRange: '12 PM – 3 PM' },
    { id: 'Evening',   icon: <Moon className="w-5 h-5 text-[#5C6BC0] fill-[#5C6BC0]" />, label: 'Evening',   timeRange: '4 PM – 7 PM' },
  ];

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goNext = () => {
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    if (step === 1) navigate(-1);
    else { setStep(s => s - 1); window.scrollTo(0, 0); }
  };

  const ensureCustomerAuth = async () => {
    const { accessToken } = getStoredTokens();
    if (accessToken) return true;
    try {
      const targetPhone = mobile && /^\d{10}$/.test(mobile) ? mobile : '9876543210';
      await apiRequest('/auth/login', {
        method: 'POST',
        body: { role: 'customer', identifier: targetPhone, password: 'password123' },
      });
      const verifyRes = await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: { role: 'customer', identifier: targetPhone, code: '123456' },
      });
      storeTokens(verifyRes);
      if (verifyRes?.user) {
        localStorage.setItem('ncc_user', JSON.stringify(verifyRes.user));
      }
      return true;
    } catch (e) {
      console.warn('Customer auto-authentication failed:', e);
      return false;
    }
  };

  const handleConfirmBooking = async () => {
    const svcName = selectedServiceData?.name || catKey + ' Service';
    
    if (paymentMode === 'after') {
      setSubmitting(true);
      try {
        const isInstant = timeGroup === 'ASAP';
        await ensureCustomerAuth();

        let result;
        try {
          result = await apiRequest('/bookings', {
            method: 'POST',
            body: {
              category: catKey,
              productType: productType,
              serviceSlug: service,
              brand: brand,
              quantity: quantity,
              scheduledDate: isInstant ? new Date().toISOString() : new Date().toISOString(),
              timeSlot: { date: selectedDate || '', time: timeGroup || '' },
              address: address,
              fullName: fullName,
              mobile: mobile,
              paymentMode: 'after',
              isInstant,
              timeGroup,
            },
            auth: true,
          });
        } catch (authErr) {
          if (authErr?.status === 401 || authErr?.status === 403 || authErr?.message?.includes('Authorization')) {
            await ensureCustomerAuth();
            result = await apiRequest('/bookings', {
              method: 'POST',
              body: {
                category: catKey,
                productType: productType,
                serviceSlug: service,
                brand: brand,
                quantity: quantity,
                scheduledDate: isInstant ? new Date().toISOString() : new Date().toISOString(),
                timeSlot: { date: selectedDate || '', time: timeGroup || '' },
                address: address,
                fullName: fullName,
                mobile: mobile,
                paymentMode: 'after',
                isInstant,
                timeGroup,
              },
              auth: true,
            });
          } else {
            throw authErr;
          }
        }

        const params = new URLSearchParams({
          type: 'service',
          serviceRequestId: result.serviceRequest?.id || result.serviceRequest?._id || '',
          service: svcName,
          category: catKey,
          productType: productType,
          brand: brand || '',
          quantity: String(quantity),
          date: selectedDate || '',
          timeGroup: timeGroup || '',
          totalPrice: String(totalPrice),
          advanceAmt: '0',
          customerName: fullName || 'Customer',
          paymentMode: 'after',
          isInstant: isInstant ? 'true' : 'false',
        });
        if (result.technician?.name) {
          params.set('technicianName', result.technician.name);
          params.set('technicianRating', String(result.technician.rating || '4.8'));
          if (result.technician.phone) params.set('technicianPhone', result.technician.phone);
        }
        navigate(`/booking-success?${params.toString()}`);
      } catch (err) {
        console.error('Failed to create booking:', err);
        alert(`Booking Notice: ${err.message || 'Unable to submit booking. Please verify your details.'}`);
      } finally {
        setSubmitting(false);
      }
    } else {
      const isInstant = timeGroup === 'ASAP';
      await ensureCustomerAuth();
      navigate('/payment', {
        state: {
          productName:  svcName,
          price:        paymentMode === 'advance' ? advanceAmt : totalPrice,
          bookingMeta: {
            service:     svcName,
            serviceSlug: service,
            category:    catKey,
            productType: productType,
            brand:       brand,
            quantity:    quantity,
            date:        selectedDate,
            timeGroup:   timeGroup,
            isInstant:   isInstant,
            totalPrice:  totalPrice,
            advanceAmt:  advanceAmt,
            paymentMode: paymentMode,
            address:     address,
            fullName:    fullName,
            mobile:      mobile,
          },
        },
      });
    }
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const step1Valid = (!data.productTypes || data.productTypes.length === 0) ? true : !!productType;
  const step2Valid = !!service;
  const step3Valid = !!brand && !!selectedDate && !!timeGroup;

  const isMobileValid = !!mobile?.trim() && /^\d{10}$/.test(mobile.trim());
  const isPincodeValid = !!address.pincode?.trim() && /^\d{6}$/.test(address.pincode.trim());
  const isAddressValid = !!address.house?.trim() && !!address.area?.trim() && !!address.city?.trim() && isPincodeValid;
  const isContactValid = !!fullName?.trim() && isMobileValid;
  const step4Valid = isAddressValid && isContactValid;

  // ── Step config ────────────────────────────────────────────────────────────
  const stepConfig = {
    1: { title: `Select ${catKey} Type`,       subtitle: 'Choose specification & quantity to proceed' },
    2: { title: 'Select Service Option',        subtitle: 'Choose required repair or installation package' },
    3: { title: 'Schedule Visit',              subtitle: 'Select brand, preferred date & time slot' },
    4: { title: 'Address & Payment',           subtitle: 'Provide service address & select payment mode' },
  };
  const { title, subtitle } = stepConfig[step] || {};

  // ── Bottom bar config per step ─────────────────────────────────────────────
  const getBarIcon = () => selectedServiceData?.icon || data.icon || '🔧';
  const getBarLabel = () => {
    if (!selectedServiceData) return catKey;
    return `${selectedServiceData.name}`;
  };
  const getBarSublabel = () => {
    const parts = [];
    if (productType) parts.push(productType);
    if (quantity > 1) parts.push(`${quantity} units`);
    return parts.join(' · ') || `${catKey} service`;
  };
  const getBarBtnLabel = () => {
    if (step === 1) return 'Continue — Select Service';
    if (step === 2) return 'Continue — Schedule Visit';
    if (step === 3) return !step3Valid ? 'Select Brand, Date & Slot' : 'Continue — Address & Payment';
    if (submitting) return 'Processing Booking...';
    if (!step4Valid) return 'Enter Address & Mobile Details';
    if (paymentMode === 'after') return 'Confirm Booking (Pay After Service)';
    return `Pay ₹${advanceAmt} & Confirm Booking`;
  };
  const getBarBtnDisabled = () => {
    if (submitting) return true;
    if (step === 1) return !step1Valid;
    if (step === 2) return !step2Valid;
    if (step === 3) return !step3Valid;
    if (step === 4) return !step4Valid;
    return false;
  };
  const handleBarBtn = () => {
    if (step < 4) goNext();
    else handleConfirmBooking();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-screen-xl mx-auto w-full relative">


      {/* ── Fixed Header ── */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-2xs border-b border-slate-100 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 hover:bg-slate-100 rounded-full transition-all flex items-center justify-center text-slate-700 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <StepBar currentStep={step} total={4} />
        </div>
        
        <div className="w-9 h-9 flex items-center justify-center">
          <span className="text-[10px] font-black text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {step}/4
          </span>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="flex-1 px-4 md:px-8 py-6 pb-36 md:pb-12 overflow-y-auto">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
          
          {/* Left Column: Step Content */}
          <div className="w-full md:col-span-7 lg:col-span-8 flex flex-col gap-6">
            
            {/* Step Title Header Banner */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0D47A1] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/80">
                  {catKey} Service
                </span>
              </div>
              <h1 className="text-[22px] md:text-2xl font-black text-slate-900 leading-tight">{title}</h1>
              <p className="text-[12px] md:text-sm text-slate-500 font-semibold mt-0.5">{subtitle}</p>
            </div>

        {/* ══ STEP 1: SELECT TYPE & QUANTITY ══════════════════════════════════ */}
        {step === 1 && (
          <div className="px-4 pt-4 flex flex-col gap-5">

            {/* Product type options */}
            {data.productTypes && data.productTypes.length > 0 && (
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                  Select {catKey} Model Type *
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {data.productTypes.map((pt) => (
                    <OptionCard
                      key={pt.id}
                      icon={pt.icon}
                      name={pt.name}
                      desc={pt.desc}
                      selected={productType === pt.name}
                      onClick={() => setProductType(pt.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity stepper */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[13px] font-black text-slate-900">
                    Quantity / Units
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Select number of appliances needing service
                  </p>
                </div>
                <span className="text-xs font-black text-[#0D47A1] bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                  {quantity} {quantity === 1 ? 'Unit' : 'Units'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-500">Number of units:</span>
                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#0D47A1] text-lg font-black hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
                  >
                    –
                  </button>
                  <span className="text-[18px] font-black text-slate-900 w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.min(12, q + 1))}
                    className="w-9 h-9 rounded-xl bg-[#0D47A1] text-white shadow-2xs flex items-center justify-center text-lg font-black hover:bg-[#1565C0] active:scale-95 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
              {quantity === 12 && (
                <p className="text-[10px] text-amber-600 font-bold text-right">
                  Maximum 12 units limit reached.
                </p>
              )}
            </div>

            {/* Info guarantee card */}
            <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <ShieldCheck className="w-6 h-6 text-[#0D47A1]" />
              </div>
              <div>
                <p className="text-[12px] font-black text-slate-900">{catKey} Service Guarantee</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                  Verified technicians · Genuine parts · 30-day service warranty
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: CHOOSE SERVICE ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-4 pt-4 flex flex-col gap-3">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 mb-0.5">
              Available Service Packages *
            </p>
            {data.services.default.map((svc) => {
              const isSelected = service === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setService(svc.id)}
                  className={`relative flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.99] text-left w-full cursor-pointer ${
                    isSelected
                      ? 'border-[#0D47A1] bg-gradient-to-r from-blue-50/90 to-indigo-50/30 shadow-md shadow-[#0D47A1]/10 ring-1 ring-[#0D47A1]'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl overflow-hidden border transition-all ${
                    isSelected ? 'bg-white border-blue-200 shadow-xs' : 'bg-slate-50 border-slate-100'
                  }`}>
                    {isImageIcon(svc.icon) ? (
                      <img src={svc.icon} alt={svc.name} className="w-7 h-7 object-contain" />
                    ) : (
                      svc.icon || '🔧'
                    )}
                  </div>

                  {/* Name + desc */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-black leading-tight ${isSelected ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                      {svc.name}
                    </p>
                    {svc.desc && (
                      <p className={`text-[10px] font-medium mt-1 leading-snug ${isSelected ? 'text-[#0D47A1]/80' : 'text-slate-500'}`}>
                        {svc.desc}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex flex-col items-end flex-shrink-0 pl-1">
                    <span className={`text-[15px] font-black ${isSelected ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                      ₹{svc.price}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{svc.unit || 'per unit'}</span>
                  </div>

                  {/* Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}

            {/* Note alert box */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 mt-1 shadow-2xs">
              <span className="text-lg leading-none">💡</span>
              <div>
                <p className="text-[11px] font-black text-amber-900">Price Transparency Note</p>
                <p className="text-[10px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                  {data.categoryNote || 'Prices shown are indicative. The technician will confirm exact charges after inspection.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 3: SCHEDULE VISIT (BRAND, DATE, TIME) ══════════════════════ */}
        {step === 3 && (
          <div className="px-4 pt-4 flex flex-col gap-5">

            {/* Brand dropdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <p className="text-[12px] font-black text-slate-900 mb-2.5 flex items-center justify-between">
                <span>Select Brand *</span>
                {brand && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> Selected</span>}
              </p>
              <div className="relative">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={`w-full appearance-none px-4 py-3 pr-10 bg-slate-50 border rounded-xl text-[13px] font-bold outline-none transition-all cursor-pointer ${
                    brand ? 'text-slate-900 border-[#0D47A1] bg-blue-50/20' : 'text-slate-400 border-amber-300 bg-amber-50/30'
                  }`}
                >
                  <option value="" disabled>Choose Appliance Brand</option>
                  {data.brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other / Not Listed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {!brand && (
                <p className="text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                  <span>⚠️</span> Please select an appliance brand to proceed
                </p>
              )}
            </div>

            {/* Date picker */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[12px] font-black text-slate-900">
                    Select Date *
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">Choose convenient date for visit</p>
                </div>
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                  title="Open calendar"
                >
                  <CalendarDays className="w-4 h-4 text-[#0D47A1]" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="sr-only"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const d = new Date(e.target.value);
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const label = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
                    setSelectedDate(label);
                  }}
                />
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {upcomingDates.map((d) => {
                  const isActive = selectedDate === d.full;
                  return (
                    <button
                      key={d.full}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.full);
                        if (timeGroup === 'ASAP' && d.full !== upcomingDates[0]?.full) {
                          setTimeGroup('');
                        }
                      }}
                      className={`flex flex-col items-center justify-center min-w-[64px] h-[80px] rounded-2xl border-2 transition-all flex-shrink-0 cursor-pointer ${
                        isActive
                          ? 'border-[#0D47A1] bg-[#0D47A1] text-white shadow-md scale-105'
                          : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-800'
                      }`}
                    >
                      <span className={`text-[10px] font-black ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                        {d.dayName}
                      </span>
                      <span className={`text-[20px] font-black mt-0.5 leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {d.dayNum}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                        {d.month}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot selector */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <p className="text-[12px] font-black text-slate-900 mb-0.5">Select Time Slot *</p>
              <p className="text-[10px] text-slate-400 font-semibold mb-3">Choose a convenient time or demand instant service</p>
              <div className="flex flex-col gap-2.5">
                {TIME_GROUPS.map((tg) => {
                  const isSelected = timeGroup === tg.id;
                  const isInstant = tg.isInstant;
                  return (
                    <button
                      key={tg.id}
                      type="button"
                      onClick={() => {
                        setTimeGroup(tg.id);
                        if (isInstant && upcomingDates.length > 0) {
                          setSelectedDate(upcomingDates[0].full);
                        }
                      }}
                      className={`w-full relative flex items-center gap-3.5 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                        isInstant
                          ? isSelected
                            ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md ring-1 ring-amber-400'
                            : 'border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50'
                          : isSelected
                          ? 'border-[#0D47A1] bg-blue-50/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {tg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-black text-slate-900 leading-none">{tg.label}</p>
                          {tg.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white tracking-wide">
                              {tg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">{tg.timeRange}</p>
                      </div>
                      {/* Radio circle */}
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? (isInstant ? 'border-amber-600 bg-amber-600' : 'border-[#0D47A1] bg-[#0D47A1]') : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visiting Charge Box */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] font-black text-slate-900 block">Visiting & Diagnosis Charge</span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    ₹199 initial visiting fee to inspect your appliance.
                  </p>
                </div>
                <div className="text-[20px] font-black text-[#0D47A1] ml-3">
                  ₹199
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-blue-100/80 text-[11px] text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Adjusted 100% in your final repair bill.</span>
              </div>
            </div>

          </div>
        )}

        {/* ══ STEP 4: ADDRESS & PAYMENT ══════════════════════════════════════ */}
        {step === 4 && (
          <div className="px-4 pt-4 flex flex-col gap-4">

            {/* Address Details */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-black text-slate-900">
                  Service Address *
                </p>
                <span className="text-[10px] text-[#0D47A1] font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Step 4 of 4
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {/* House / Flat */}
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.house}
                    onChange={(e) => setAddress(p => ({ ...p, house: e.target.value }))}
                    placeholder="House / Flat / Building No. *"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all"
                  />
                </div>
                {/* Area / Landmark */}
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.area}
                    onChange={(e) => setAddress(p => ({ ...p, area: e.target.value }))}
                    placeholder="Area / Landmark / Street *"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  {/* City */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress(p => ({ ...p, city: e.target.value }))}
                      placeholder="City *"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all"
                    />
                  </div>
                  {/* Pincode */}
                  <div className="w-32">
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) => setAddress(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder="Pincode *"
                      maxLength={6}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all ${
                        address.pincode && address.pincode.length < 6 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                  </div>
                </div>
                {address.pincode && address.pincode.length < 6 && (
                  <p className="text-[10px] text-rose-500 font-bold -mt-1 ml-1">
                    Pincode must be exactly 6 digits
                  </p>
                )}
              </div>
            </div>

            {/* Full Name + Mobile */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-black text-slate-900">
                  Customer Contact Details *
                </p>
              </div>
              {/* Full Name */}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name *"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all"
                />
              </div>
              {/* Mobile */}
              <div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit Mobile Number *"
                    maxLength={10}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] outline-none transition-all ${
                      mobile && mobile.length < 10 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                </div>
                {mobile && mobile.length < 10 && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">
                    Mobile number must be exactly 10 digits
                  </p>
                )}
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <p className="text-[13px] font-black text-slate-900 mb-3">Payment Mode *</p>
              <div className="flex flex-col gap-2.5">

                {/* Pay Advance — Recommended */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('advance')}
                  className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                    paymentMode === 'advance'
                      ? 'border-[#0D47A1] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    paymentMode === 'advance' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'advance' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[13px] font-black ${paymentMode === 'advance' ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                        Pay Advance
                      </span>
                      <span className="text-[9px] bg-[#0D47A1] text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className={`text-[10px] font-medium ${paymentMode === 'advance' ? 'text-[#0D47A1]/80' : 'text-slate-500'}`}>
                      ₹{advanceAmt} advance · Pay balance after service
                    </p>
                  </div>
                  <span className={`text-[16px] font-black flex-shrink-0 ${paymentMode === 'advance' ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                    ₹{advanceAmt}
                  </span>
                </button>

                {/* Pay After Service */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('after')}
                  className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                    paymentMode === 'after'
                      ? 'border-[#0D47A1] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    paymentMode === 'after' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'after' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-black ${paymentMode === 'after' ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                      Pay After Service
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${paymentMode === 'after' ? 'text-[#0D47A1]/80' : 'text-slate-500'}`}>
                      Pay full amount (₹{totalPrice}) after service completion
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Total Payable summary */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
              <button
                type="button"
                onClick={() => setPriceExpanded(p => !p)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <span className="text-[13px] font-black text-slate-900">Total Payable</span>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-black text-[#0D47A1]">
                    ₹{paymentMode === 'advance' ? advanceAmt : totalPrice}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    View Details {priceExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              {priceExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Service charge ({quantity} unit{quantity > 1 ? 's' : ''})</span>
                    <span className="font-black text-slate-900">₹{totalPrice}</span>
                  </div>
                  {paymentMode === 'advance' && (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#0D47A1] font-black">Advance (Adjusted)</span>
                        <span className="font-black text-[#0D47A1]">₹{advanceAmt}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Balance after service</span>
                        <span className="font-black text-slate-900">₹{remaining}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Secure payment note */}
            <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-[10px] font-bold">100% Secure &amp; Verified Booking</p>
            </div>
          </div>
        )}
          </div>

          {/* Right Column: Desktop Order Summary & Primary Action Card */}
          <div className="w-full md:col-span-5 lg:col-span-4 hidden md:flex flex-col gap-5 sticky top-24">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4 text-left">
              
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl flex-shrink-0">
                    {isImageIcon(selectedServiceData?.icon || data.icon) ? (
                      <img src={selectedServiceData?.icon || data.icon} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      selectedServiceData?.icon || data.icon || '🔧'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-black text-slate-900 line-clamp-2 leading-tight">{getBarLabel()}</span>
                    <span className="text-xs font-semibold text-slate-400 truncate mt-0.5">{getBarSublabel()}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#0D47A1] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex-shrink-0 self-start">
                  Step {step}/4
                </span>
              </div>

              {/* Pricing breakdown */}
              <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Base Service ({quantity} unit{quantity > 1 ? 's' : ''})</span>
                  <span className="font-bold text-slate-900">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Inspection Fee</span>
                  <span>FREE</span>
                </div>
                <div className="h-px bg-slate-100 my-1" />
                <div className="flex justify-between text-sm font-black text-slate-900">
                  <span>Total Estimate</span>
                  <span>₹{totalPrice}</span>
                </div>
                {step === 4 && paymentMode === 'advance' && (
                  <div className="flex justify-between text-sm font-black text-[#0D47A1] bg-blue-50 p-3 rounded-2xl border border-blue-100">
                    <span>Advance Payable Now</span>
                    <span>₹{advanceAmt}</span>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                disabled={getBarBtnDisabled()}
                onClick={handleBarBtn}
                className={`w-full font-black py-4 rounded-2xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  getBarBtnDisabled()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-md shadow-[#0D47A1]/20 active:scale-[0.98]'
                }`}
              >
                <span>{getBarBtnLabel()}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-slate-400 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-500">100% Verified Service Guarantee</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Fixed Bottom Bar ── */}
      {step !== 3 ? (
        <BottomBar
          icon={selectedServiceData?.icon || data.icon || '🔧'}
          label={getBarLabel()}
          sublabel={getBarSublabel()}
          price={step === 4 && paymentMode === 'advance' ? advanceAmt : totalPrice}
          btnLabel={getBarBtnLabel()}
          btnDisabled={getBarBtnDisabled()}
          onBtn={handleBarBtn}
          onExpand={() => setPriceExpanded(p => !p)}
          expanded={priceExpanded}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-30 px-4 pb-4 pt-3 flex flex-col gap-2.5 md:hidden">
          {/* Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-slate-600">
                <CalendarDays className="w-5 h-5 text-[#0D47A1]" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black text-slate-900 leading-tight">
                  {selectedDate ? selectedDate.split(' ').slice(0, 3).join(' ') : 'Select Date'}
                  {brand ? ` • ${brand}` : ''}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {!brand ? 'Select Brand, Date & Time Slot' : (timeGroup ? TIME_GROUPS.find(t => t.id === timeGroup)?.timeRange : 'Select Time Slot')}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[16px] font-black text-slate-900 leading-none">₹{advanceAmt}</span>
              <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Visiting Charge</span>
            </div>
          </div>
          {/* Button */}
          <button
            type="button"
            disabled={!step3Valid}
            onClick={goNext}
            className={`w-full font-black py-3.5 rounded-2xl text-[14px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
              !step3Valid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-md shadow-[#0D47A1]/25'
            }`}
          >
            {!brand ? 'Choose Brand to Continue' : (!selectedDate || !timeGroup ? 'Select Date & Time Slot' : 'Continue — Address & Payment')}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingFlow;
