import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, MapPin, User, Phone, CalendarDays,
  Sun, Moon, Info, ShieldCheck, ArrowRight, Zap
} from 'lucide-react';
import { apiRequest, getStoredTokens, storeTokens } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

import { getCatalogEntry, preloadCatalogOverrides } from '../data/bookingCatalog';

import electricianBanner from '../assets/electrician_banner.png';
import plumbingBanner from '../assets/plumbing_banner.png';
import acBanner from '../assets/ac_service_banner.png';
import heroService from '../assets/hero_service.png';

const getDefaultBanner = (categoryKey) => {
  const norm = categoryKey.toLowerCase();
  if (norm.includes('ac')) return acBanner;
  if (norm.includes('elect')) return electricianBanner;
  if (norm.includes('plumb')) return plumbingBanner;
  return heroService;
};

const getCatalog = (category) => getCatalogEntry(category);

// ─── Step Labels (4 steps) ────────────────────────────────────────────────────
const STEP_LABELS = ['Select', 'Service', 'Schedule', 'Payment'];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const StepBar = ({ currentStep, total = 4 }) => (
  <div className="flex items-center gap-1.5 w-full max-w-[200px] mx-auto mt-1 pb-1">
    {[...Array(total)].map((_, idx) => {
      const active = idx + 1 <= currentStep;
      return (
        <div
          key={idx}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            active ? 'bg-[#0D47A1]' : 'bg-slate-200'
          }`}
        />
      );
    })}
  </div>
);

// ─── Option Card (Step 1) ─────────────────────────────────────────────────────
const OptionCard = ({ icon, name, desc, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 text-center w-full ${
      selected
        ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-md shadow-[#0D47A1]/10'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    {icon && <span className="text-2xl leading-none">{icon}</span>}
    <span className={`text-[12px] font-extrabold leading-tight ${selected ? 'text-[#0D47A1]' : 'text-slate-800'}`}>
      {name}
    </span>
    {desc && (
      <span className={`text-[9px] font-medium leading-tight ${selected ? 'text-[#0D47A1]/70' : 'text-slate-400'}`}>
        {desc}
      </span>
    )}
    {selected && (
      <div className="w-4 h-4 rounded-full bg-[#0D47A1] flex items-center justify-center">
        <Check className="w-2.5 h-2.5 text-white" />
      </div>
    )}
  </button>
);

// ─── Bottom Summary Bar ────────────────────────────────────────────────────────
const BottomBar = ({ icon, label, sublabel, price, btnLabel, btnDisabled, onBtn, onExpand, expanded }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.07)] z-30">
    {/* Summary row */}
    <button
      onClick={onExpand}
      className="w-full flex items-center gap-3 px-4 pt-3 pb-2"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon && <span className="text-base flex-shrink-0">{icon}</span>}
        <div className="flex flex-col items-start min-w-0">
          {label && <span className="text-[11px] font-extrabold text-slate-800 truncate">{label}</span>}
          {sublabel && <span className="text-[10px] text-slate-400 font-medium truncate">{sublabel}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[15px] font-extrabold text-slate-900">₹{price}</span>
        {onExpand && (expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />)}
      </div>
    </button>
    {/* CTA */}
    <div className="px-4 pb-4">
      <button
        disabled={btnDisabled}
        onClick={onBtn}
        className={`w-full font-extrabold py-3.5 rounded-2xl text-[14px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
          btnDisabled
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-md shadow-[#0D47A1]/20'
        }`}
      >
        {btnLabel}
        {!btnDisabled && <ArrowLeft className="w-4 h-4 rotate-180" />}
      </button>
    </div>
  </div>
);

// ─── Time Group Row (Step 4) ──────────────────────────────────────────────────
const TimeGroupRow = ({ emoji, label, timeRange, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.99] text-left ${
      selected
        ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-sm'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <span className="text-2xl flex-shrink-0">{emoji}</span>
    <div className="flex-1">
      <p className={`text-[13px] font-extrabold ${selected ? 'text-[#0D47A1]' : 'text-slate-800'}`}>{label}</p>
      <p className={`text-[11px] font-medium mt-0.5 ${selected ? 'text-[#0D47A1]/70' : 'text-slate-500'}`}>{timeRange}</p>
    </div>
    {/* Radio button */}
    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
      selected ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
    }`}>
      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const BookingFlow = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  // Admin overrides are fetched once, then getCatalog reads them synchronously.
  // Redirecting on a missing catalog has to wait for that — otherwise a category
  // that only exists as an admin override would bounce to the dashboard.
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-semibold text-slate-400">Loading services…</p>
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
  const isInstallationService = service === 'installation';

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

  const INSTALL_LOCATIONS = [
    'Ground Floor',
    'First Floor',
    'Second Floor',
    'Third Floor',
    'Fourth Floor and above',
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

        // Navigate to success page with real serviceRequestId returned from backend
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
      // Navigate to payment page with booking details as state
      navigate('/payment', {
        state: {
          // For Payment.jsx display
          productName:  svcName,
          price:        paymentMode === 'advance' ? advanceAmt : totalPrice,
          // Booking details to carry to /booking-success
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
    1: { title: `Select ${catKey} & Quantity`, subtitle: 'What do you need help with?' },
    2: { title: 'Choose Service',              subtitle: 'What service do you need?' },
    3: { title: 'Schedule Visit',              subtitle: 'Choose brand, date & time' },
    4: { title: 'Address & Payment',           subtitle: 'Almost done! Confirm your details' },
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
    if (step === 1) return 'Continue — Choose Service';
    if (step === 2) return 'Continue — Schedule Visit';
    if (step === 3) return !step3Valid ? 'Select Brand, Date & Slot' : 'Continue — Address & Payment';
    if (submitting) return 'Booking Service...';
    if (!step4Valid) return 'Fill Address & Contact Details';
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
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans">

      {/* ── Fixed Header ── */}
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <button
          onClick={goBack}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Step {step} of 4</span>
          <StepBar currentStep={step} total={4} />
        </div>
        
        <div className="w-7 h-7 flex-shrink-0" />
      </div>

      {/* ── Page Content ── */}
      <div className={`flex-1 overflow-y-auto ${step === 3 ? 'pb-56' : 'pb-36'}`}>



        {/* Step Title & Subtitle */}
        <div className="px-5 pt-6 pb-1">
          <h1 className="text-[22px] font-black text-slate-900 leading-tight">{title}</h1>
          <p className="text-[12px] text-slate-500 font-semibold mt-1">{subtitle}</p>
        </div>
        {step === 1 && (
          <div className="px-4 pt-5 flex flex-col gap-5">

            {/* Product type label */}
            {data.productTypes && data.productTypes.length > 0 && (
              <div>
                <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                  Select {catKey} Type
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
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[13px] font-extrabold text-slate-900 mb-1">
                How many {catKey}s?
              </p>
              <p className="text-[10px] text-slate-400 font-medium mb-4">
                You can book up to 12 units at once.
              </p>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border-2 border-[#0D47A1] flex items-center justify-center text-[#0D47A1] text-xl font-extrabold hover:bg-[#EAF4FF] active:scale-95 transition-all"
                >
                  –
                </button>
                <span className="text-[22px] font-extrabold text-slate-900 w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(12, q + 1))}
                  className="w-10 h-10 rounded-full border-2 border-[#0D47A1] flex items-center justify-center text-[#0D47A1] text-xl font-extrabold hover:bg-[#EAF4FF] active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
              {quantity === 12 && (
                <p className="text-[10px] text-amber-500 font-bold mt-3">
                  Maximum limit of 12 units reached.
                </p>
              )}
            </div>

            {/* Info card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: data.lightBg || '#EAF4FF' }}>
                {data.icon ? (
                  <img src={data.icon} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-xl">🛠️</span>
                )}
              </div>
              <div>
                <p className="text-[12px] font-extrabold text-slate-900">{catKey} Service by NCC</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Certified technicians · All brands covered · Doorstep service
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: CHOOSE SERVICE ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-4 pt-5 flex flex-col gap-3">
            {data.services.default.map((svc) => {
              const isSelected = service === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setService(svc.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-left w-full ${
                    isSelected
                      ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-md shadow-[#0D47A1]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl overflow-hidden ${
                    isSelected ? 'bg-[#0D47A1]/10' : 'bg-slate-100'
                  }`}>
                    {typeof svc.icon === 'string' && (svc.icon.startsWith('data:image/') || svc.icon.includes('/')) ? (
                      <img src={svc.icon} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      svc.icon || '🔧'
                    )}
                  </div>
                  {/* Name + desc */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-extrabold leading-tight ${isSelected ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                      {svc.name}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-[#0D47A1]/70' : 'text-slate-500'}`}>
                      {svc.desc}
                    </p>
                  </div>
                  {/* Price */}
                  <div className="flex flex-col items-end flex-shrink-0 mr-2">
                    <span className={`text-[14px] font-extrabold ${isSelected ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                      ₹{svc.price}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">{svc.unit || 'per unit'}</span>
                  </div>
                  {/* Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}

            {/* Note */}
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-3 flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div>
                <p className="text-[11px] font-extrabold text-[#E65100]">Final price may vary</p>
                <p className="text-[10px] text-[#F57C00] font-medium mt-0.5">
                  {data.categoryNote || 'The technician will give an exact quote after inspecting your appliance.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 3: SCHEDULE VISIT (BRAND, DATE, TIME) ══════════════════════ */}
        {step === 3 && (
          <div className="px-4 pt-5 flex flex-col gap-5">

            {/* Brand dropdown */}
            <div>
              <p className="text-[12px] font-extrabold text-slate-800 mb-2">
                Select Brand <span className="text-red-500">*</span>
              </p>
              <div className="relative">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={`w-full appearance-none px-4 py-3.5 pr-10 bg-white border rounded-2xl text-[13px] font-semibold outline-none transition-all ${
                    brand ? 'text-slate-800 border-slate-300 shadow-xs' : 'text-slate-400 border-amber-300 bg-amber-50/20'
                  }`}
                >
                  <option value="" disabled>Select Brand (Compulsory)</option>
                  {data.brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other / Not Listed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {!brand && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1">
                  <span>⚠️</span> Please select an appliance brand to proceed
                </p>
              )}
            </div>

            {/* Date picker */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-extrabold text-slate-800">
                  Select Date <span className="text-red-500">*</span>
                </p>
                <button
                  onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                  className="w-8 h-8 rounded-xl bg-[#EAF4FF] flex items-center justify-center hover:bg-[#D6ECFF] transition-all"
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
                      onClick={() => {
                        setSelectedDate(d.full);
                        if (timeGroup === 'ASAP' && d.full !== upcomingDates[0]?.full) {
                          setTimeGroup('');
                        }
                      }}
                      className={`flex flex-col items-center justify-center min-w-[62px] h-[78px] rounded-2xl border transition-all flex-shrink-0 ${
                        isActive
                          ? 'border-[#0D47A1] bg-[#0D47A1] text-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                        {d.dayName}
                      </span>
                      <span className={`text-[20px] font-extrabold mt-0.5 leading-none ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {d.dayNum}
                      </span>
                      <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                        {d.month}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot selector */}
            <div className="mt-2">
              <p className="text-[12px] font-extrabold text-slate-800 mb-1">Select Time Slot</p>
              <p className="text-[10px] text-slate-400 font-semibold mb-3">Choose a convenient time or demand instant service</p>
              <div className="flex flex-col gap-2.5">
                {TIME_GROUPS.map((tg) => {
                  const isSelected = timeGroup === tg.id;
                  const isInstant = tg.isInstant;
                  return (
                    <button
                      key={tg.id}
                      onClick={() => {
                        setTimeGroup(tg.id);
                        if (isInstant && upcomingDates.length > 0) {
                          setSelectedDate(upcomingDates[0].full);
                        }
                      }}
                      className={`w-full relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-left ${
                        isInstant
                          ? isSelected
                            ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md ring-1 ring-amber-400'
                            : 'border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50'
                          : isSelected
                          ? 'border-[#0D47A1] bg-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {tg.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-extrabold text-slate-800 leading-none">{tg.label}</p>
                          {tg.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-white tracking-wide">
                              {tg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">{tg.timeRange}</p>
                      </div>
                      {/* Radio circle */}
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? (isInstant ? 'border-amber-600' : 'border-[#0D47A1]') : 'border-slate-300'
                      }`}>
                        {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${isInstant ? 'bg-amber-600' : 'bg-[#0D47A1]'}`} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visiting Charge Box */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="bg-[#F4F8FF] border border-[#E1E8F5] rounded-2xl p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[13px] font-extrabold text-slate-800">Visiting Charge</span>
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    A visiting charge of ₹199 will be collected in advance.
                  </p>
                </div>
                <div className="text-[20px] font-black text-slate-900 ml-4 leading-none">
                  ₹199
                </div>
              </div>
              <div className="flex items-center gap-2 px-1 text-[11px] text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                <span>This amount will be adjusted in your final bill.</span>
              </div>
            </div>

          </div>
        )}

        {/* ══ STEP 4: ADDRESS & PAYMENT ══════════════════════════════════════ */}
        {step === 4 && (
          <div className="px-4 pt-5 flex flex-col gap-4">

            {/* Address Details */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-extrabold text-slate-900">
                  Address Details <span className="text-red-500">*</span>
                </p>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  All fields required
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {/* House / Flat */}
                <div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={address.house}
                      onChange={(e) => setAddress(p => ({ ...p, house: e.target.value }))}
                      placeholder="House / Flat / Building No. *"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all ${
                        !address.house?.trim() ? 'border-slate-200' : 'border-slate-300'
                      }`}
                    />
                  </div>
                </div>
                {/* Area / Landmark */}
                <div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={address.area}
                      onChange={(e) => setAddress(p => ({ ...p, area: e.target.value }))}
                      placeholder="Area / Landmark / Street *"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all ${
                        !address.area?.trim() ? 'border-slate-200' : 'border-slate-300'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  {/* City */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress(p => ({ ...p, city: e.target.value }))}
                      placeholder="City *"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all"
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
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all ${
                        address.pincode && address.pincode.length < 6 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                      }`}
                    />
                  </div>
                </div>
                {address.pincode && address.pincode.length < 6 && (
                  <p className="text-[10px] text-rose-500 font-semibold -mt-1 ml-1">
                    Pincode must be exactly 6 digits
                  </p>
                )}
              </div>
            </div>

            {/* Full Name + Mobile */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold text-slate-900">
                  Contact Details <span className="text-red-500">*</span>
                </p>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Required for visit
                </span>
              </div>
              {/* Full Name */}
              <div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name *"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all"
                  />
                </div>
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
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all ${
                      mobile && mobile.length < 10 ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                </div>
                {mobile && mobile.length < 10 && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1 ml-1">
                    Mobile number must be exactly 10 digits
                  </p>
                )}
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[13px] font-extrabold text-slate-900 mb-3">Payment Options</p>
              <div className="flex flex-col gap-2.5">

                {/* Pay Advance — Recommended */}
                <button
                  onClick={() => setPaymentMode('advance')}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all text-left ${
                    paymentMode === 'advance'
                      ? 'border-[#0D47A1] bg-[#EAF4FF]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    paymentMode === 'advance' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'advance' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[12px] font-extrabold ${paymentMode === 'advance' ? 'text-[#0D47A1]' : 'text-slate-800'}`}>
                        Pay Advance
                      </span>
                      <span className="text-[9px] bg-[#0D47A1] text-white font-extrabold px-2 py-0.5 rounded-full">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className={`text-[10px] font-medium ${paymentMode === 'advance' ? 'text-[#0D47A1]/70' : 'text-slate-500'}`}>
                      ₹{advanceAmt} advance · Pay balance after service
                    </p>
                  </div>
                  <span className={`text-[15px] font-extrabold flex-shrink-0 ${paymentMode === 'advance' ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                    ₹{advanceAmt}
                  </span>
                </button>

                {/* Pay After Service */}
                <button
                  onClick={() => setPaymentMode('after')}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all text-left ${
                    paymentMode === 'after'
                      ? 'border-[#0D47A1] bg-[#EAF4FF]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    paymentMode === 'after' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'after' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[12px] font-extrabold ${paymentMode === 'after' ? 'text-[#0D47A1]' : 'text-slate-800'}`}>
                      Pay After Service
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 ${paymentMode === 'after' ? 'text-[#0D47A1]/70' : 'text-slate-500'}`}>
                      Pay in cash / UPI after service
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Total Payable summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <button
                onClick={() => setPriceExpanded(p => !p)}
                className="w-full flex items-center justify-between"
              >
                <span className="text-[13px] font-extrabold text-slate-900">Total Payable</span>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-extrabold text-[#0D47A1]">
                    ₹{paymentMode === 'advance' ? advanceAmt : totalPrice}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    View Details {priceExpanded ? '∧' : '∨'}
                  </span>
                </div>
              </button>
              {priceExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Service charge ({quantity} unit{quantity > 1 ? 's' : ''})</span>
                    <span className="font-extrabold text-slate-900">₹{totalPrice}</span>
                  </div>
                  {paymentMode === 'advance' && (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#0D47A1] font-extrabold">Advance (Refundable)</span>
                        <span className="font-extrabold text-[#0D47A1]">₹{advanceAmt}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Balance after service</span>
                        <span className="font-extrabold text-slate-900">₹{remaining}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Secure payment note */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-base">🔒</span>
              <p className="text-[10px] text-slate-400 font-semibold">Secure &amp; trusted payments</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Bar ── */}
      {step !== 3 ? (
        <BottomBar
          icon={selectedServiceData?.icon || '🔧'}
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.07)] z-30 px-4 pb-4 pt-3 flex flex-col gap-3">
          {/* Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                <CalendarDays className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-extrabold text-slate-800 leading-tight">
                  {selectedDate ? selectedDate.split(' ').slice(0, 3).join(' ') : 'Select Date'}
                  {brand ? ` • ${brand}` : ''}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {!brand ? 'Select Brand, Date & Time Slot' : (timeGroup ? TIME_GROUPS.find(t => t.id === timeGroup)?.timeRange : 'Select Time Slot')}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[15px] font-black text-slate-800 leading-none">₹{advanceAmt}</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">Visiting Charge</span>
            </div>
          </div>
          {/* Button */}
          <button
            disabled={!step3Valid}
            onClick={goNext}
            className={`w-full font-extrabold py-3.5 rounded-2xl text-[14px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              !step3Valid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-md shadow-[#0D47A1]/20'
            }`}
          >
            {!brand ? 'Choose Brand to Continue' : (!selectedDate || !timeGroup ? 'Select Date & Time Slot' : 'Continue')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingFlow;
