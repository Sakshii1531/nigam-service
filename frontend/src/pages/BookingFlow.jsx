import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronRight, X, MapPin, User, Edit3, CreditCard,
  ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Centralized Booking Catalog ──────────────────────────────────────────────
import { getCatalogEntry } from '../data/bookingCatalog';

// ─── Category Lookup (delegated to bookingCatalog.js) ────────────────────────
const getCatalog = (category) => getCatalogEntry(category);

// ─── Step Progress Bar ────────────────────────────────────────────────────────
const STEP_LABELS = ['Product', 'Type/Size', 'Service', 'Brand', 'Time Slot', 'Address'];

const StepBar = ({ currentStep }) => (
  <div className="flex items-center gap-0 overflow-x-auto no-scrollbar px-1">
    {STEP_LABELS.map((label, idx) => {
      const stepNum = idx + 1;
      const done = stepNum < currentStep;
      const active = stepNum === currentStep;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
              done ? 'bg-[#0D47A1] text-white scale-90' :
              active ? 'bg-[#0D47A1] text-white ring-2 ring-[#0D47A1]/30 scale-110' :
              'bg-slate-200 text-slate-400'
            }`}>
              {done ? <Check className="w-2.5 h-2.5" /> : stepNum}
            </div>
            <span className={`text-[8px] font-bold mt-0.5 text-center leading-none w-12 ${
              active ? 'text-[#0D47A1]' : done ? 'text-slate-500' : 'text-slate-300'
            }`}>{label}</span>
          </div>
          {idx < STEP_LABELS.length - 1 && (
            <div className={`h-[2px] flex-1 min-w-[12px] mx-0.5 mb-3 rounded-full transition-all duration-500 ${
              done ? 'bg-[#0D47A1]' : 'bg-slate-200'
            }`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Option Card ──────────────────────────────────────────────────────────────
const OptionCard = ({ icon, name, desc, selected, onClick, big }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 text-center w-full ${
      selected
        ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-md shadow-[#0D47A1]/10'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    {icon && (
      <span className="text-2xl leading-none">{icon}</span>
    )}
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

// ─── Brand Pill ───────────────────────────────────────────────────────────────
const BrandPill = ({ name, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-2xl border-2 text-[12px] font-extrabold transition-all duration-200 active:scale-95 ${
      selected
        ? 'border-[#0D47A1] bg-[#0D47A1] text-white shadow-md shadow-[#0D47A1]/20'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
    }`}
  >
    {name}
  </button>
);

// ─── Booking Summary Chip ─────────────────────────────────────────────────────
const SummaryChip = ({ label, value, color }) => (
  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2.5 py-1 flex-shrink-0">
    <span className="text-[9px] text-slate-400 font-bold">{label}:</span>
    <span className="text-[10px] font-extrabold text-slate-800">{value}</span>
  </div>
);

// ─── Main BookingFlow Component ───────────────────────────────────────────────
const BookingFlow = () => {
  const navigate = useNavigate();
  const { category } = useParams();

  const catalog = getCatalog(category);

  // If category not found, redirect home
  useEffect(() => {
    if (!catalog) {
      navigate('/dashboard', { replace: true });
    }
  }, [catalog, navigate]);

  // Booking state
  const [step, setStep] = useState(2); // Start at step 2 (product auto-selected)
  const [productType, setProductType] = useState('');
  const [service, setService] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [address, setAddress] = useState({ house: '', landmark: '', name: '', saveAs: 'Home' });
  const [checkoutStep, setCheckoutStep] = useState(0); // 0=address, 1=datetime confirmed, 2=ready to pay
  const [showPayment, setShowPayment] = useState(false);
  const [upiExpanded, setUpiExpanded] = useState(true);
  const [animDir, setAnimDir] = useState('forward'); // for future animation reference

  if (!catalog) return null;

  const { key: catKey, data } = catalog;
  const price = service ? (data.services.default.find(s => s.id === service)?.price || 299) : 299;
  const advance = 49;
  const remaining = price - advance;

  // Generate next 5 days
  const getUpcomingDates = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(`${days[d.getDay()]} ${d.getDate()}`);
    }
    return dates;
  };

  const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

  const goNext = () => {
    setAnimDir('forward');
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setAnimDir('back');
    if (step === 2) {
      navigate(-1);
    } else {
      setStep(s => s - 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePaymentSuccess = () => {
    const selectedService = data.services.default.find(s => s.id === service);
    navigate(`/booking-success?service=${encodeURIComponent(selectedService?.name || catKey + ' Service')}&category=${encodeURIComponent(catKey)}&type=service&price=${price}`);
  };

  const isAddressValid = address.house.trim() && address.landmark.trim() && address.name.trim();

  // ─── STEP TITLES ────────────────────────────────────────────────────────────
  const stepConfig = {
    2: { title: `Select ${catKey} Type`, subtitle: 'What type of appliance do you have?' },
    3: { title: 'What do you need?', subtitle: 'Select the service required' },
    4: { title: 'Select Brand', subtitle: `Choose your ${catKey} brand` },
    5: { title: 'Choose Time Slot', subtitle: 'When should the professional arrive?' },
    6: { title: 'Address & Payment', subtitle: 'Almost done! Confirm your details' },
  };

  const currentStepConfig = stepConfig[step] || {};
  const selectedServiceData = data.services.default.find(s => s.id === service);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans">

      {/* ── Fixed Header ── */}
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-extrabold text-slate-900 leading-tight">{currentStepConfig.title}</h1>
            <p className="text-[10px] text-slate-500 font-medium">{currentStepConfig.subtitle}</p>
          </div>
          {/* Category badge */}
          <div className={`flex items-center gap-1.5 bg-[${data.lightBg}] border border-[${data.color}]/20 px-3 py-1.5 rounded-full flex-shrink-0`}
               style={{ backgroundColor: data.lightBg, borderColor: `${data.color}30` }}>
            <img src={data.icon} alt={catKey} className="w-4 h-4 object-contain" />
            <span className="text-[10px] font-extrabold" style={{ color: data.color }}>{catKey}</span>
          </div>
        </div>

        {/* Step progress bar */}
        <div className="px-3 pb-3">
          <StepBar currentStep={step} />
        </div>

        {/* Summary chips (show accumulated selections) */}
        {(productType || service || brand) && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2.5">
            {productType && <SummaryChip label="Type" value={productType} />}
            {service && <SummaryChip label="Service" value={selectedServiceData?.name || service} />}
            {brand && <SummaryChip label="Brand" value={brand} />}
          </div>
        )}
      </div>

      {/* ── Page Content ── */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* ══ STEP 2: PRODUCT TYPE ════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="px-4 pt-5 flex flex-col gap-5">
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

            {/* Info card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: data.lightBg }}>
                <img src={data.icon} alt="" className="w-5 h-5 object-contain" />
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

        {/* ══ STEP 3: SERVICE SELECTION ══════════════════════════════════════ */}
        {step === 3 && (
          <div className="px-4 pt-5 flex flex-col gap-3">
            {data.services.default.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setService(svc.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-left w-full ${
                  service === svc.id
                    ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-md shadow-[#0D47A1]/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
                  service === svc.id ? 'bg-[#0D47A1]/10' : 'bg-slate-100'
                }`}>
                  {svc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-extrabold leading-tight ${service === svc.id ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                    {svc.name}
                  </p>
                  <p className={`text-[10px] font-medium mt-0.5 ${service === svc.id ? 'text-[#0D47A1]/70' : 'text-slate-500'}`}>
                    {svc.desc}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-[14px] font-extrabold ${service === svc.id ? 'text-[#0D47A1]' : 'text-slate-900'}`}>
                    ₹{svc.price}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">onwards</span>
                </div>
                {service === svc.id && (
                  <div className="w-5 h-5 rounded-full bg-[#0D47A1] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}

            {/* Category-specific note */}
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-3 flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div>
                <p className="text-[11px] font-extrabold text-[#E65100]">Final price may vary</p>
                <p className="text-[10px] text-[#F57C00] font-medium mt-0.5">
                  {data.categoryNote || 'The technician will give an exact quote after inspecting your appliance. Prices shown are indicative.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 4: BRAND SELECTION ════════════════════════════════════════ */}
        {step === 4 && (
          <div className="px-4 pt-5 flex flex-col gap-4">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Available brands for {catKey}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {data.brands.map((b) => (
                <BrandPill
                  key={b}
                  name={b}
                  selected={brand === b}
                  onClick={() => setBrand(b)}
                />
              ))}
            </div>

            {/* Not in list option */}
            <button
              onClick={() => setBrand('Other')}
              className={`w-full py-3 rounded-2xl border-2 text-[12px] font-extrabold transition-all ${
                brand === 'Other'
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400'
              }`}
            >
              My brand is not listed
            </button>

            {/* Why brand matters */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-[12px] font-extrabold text-slate-900 mb-2">Why brand matters?</p>
              <div className="flex flex-col gap-1.5">
                {(data.whyBrandPoints || [
                  'Technicians carry brand-specific spare parts',
                  'Faster diagnosis with brand expertise',
                  'Correct refrigerant / chemicals used',
                ]).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#2E7D32]" />
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 5: TIME SLOT ══════════════════════════════════════════════ */}
        {step === 5 && (
          <div className="px-4 pt-5 flex flex-col gap-5">

            {/* Advance payment card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-[#0D47A1]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-extrabold text-slate-900">Pay ₹{advance} advance (Refundable)</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Balance ₹{remaining} payable after service completion
                </p>
              </div>
            </div>

            {/* Date picker */}
            <div>
              <p className="text-[12px] font-extrabold text-slate-900 mb-3">Select Date</p>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {[...getUpcomingDates(), 'Custom'].map((dateText) => {
                  const isActive = selectedDate === dateText;
                  const parts = dateText.split(' ');
                  const isCustom = dateText === 'Custom';
                  return (
                    <button
                      key={dateText}
                      onClick={() => setSelectedDate(dateText)}
                      className={`flex flex-col items-center justify-center min-w-[64px] h-[68px] rounded-2xl border-2 transition-all flex-shrink-0 ${
                        isActive
                          ? 'border-[#0D47A1] bg-[#EAF4FF] shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isCustom ? (
                        <span className={`text-[10px] font-extrabold text-center leading-tight px-1 ${isActive ? 'text-[#0D47A1]' : 'text-slate-600'}`}>
                          Select<br/>Custom
                        </span>
                      ) : (
                        <>
                          <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-[#0D47A1]' : 'text-slate-400'}`}>{parts[0]}</span>
                          <span className={`text-[18px] font-extrabold mt-0.5 ${isActive ? 'text-[#0D47A1]' : 'text-slate-800'}`}>{parts[1]}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-[12px] font-extrabold text-slate-900 mb-3">Select Time</p>
              <div className="grid grid-cols-3 gap-2.5">
                {TIME_SLOTS.map((time) => {
                  const isActive = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-xl border-2 text-[11px] font-extrabold text-center transition-all ${
                        isActive
                          ? 'border-[#0D47A1] bg-[#EAF4FF] text-[#0D47A1] shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Booking summary card */}
            {(productType || service || brand) && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-3">Your Booking Summary</p>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Category</span>
                    <span className="text-[11px] font-extrabold text-slate-900">{catKey}</span>
                  </div>
                  {productType && (
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Type</span>
                      <span className="text-[11px] font-extrabold text-slate-900">{productType}</span>
                    </div>
                  )}
                  {service && selectedServiceData && (
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Service</span>
                      <span className="text-[11px] font-extrabold text-slate-900">{selectedServiceData.name}</span>
                    </div>
                  )}
                  {brand && (
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Brand</span>
                      <span className="text-[11px] font-extrabold text-slate-900">{brand}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between">
                    <span className="text-[12px] font-extrabold text-slate-900">Estimated Price</span>
                    <span className="text-[13px] font-extrabold text-[#0D47A1]">₹{price}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 6: ADDRESS + PAYMENT ══════════════════════════════════════ */}
        {step === 6 && !showPayment && (
          <div className="px-4 pt-5 flex flex-col gap-4">

            {/* Booking summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <img src={data.icon} alt="" className="w-8 h-8 object-contain" />
                <div>
                  <p className="text-[13px] font-extrabold text-slate-900">
                    {catKey} – {selectedServiceData?.name || 'Service'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">{productType} · {brand}</p>
                </div>
              </div>
              <div className="h-px bg-slate-100 mb-3" />
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Service charge</span>
                  <span className="font-extrabold text-slate-900">₹{price}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Taxes & fees</span>
                  <span className="font-extrabold text-slate-900">₹0</span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between text-[12px]">
                  <span className="font-extrabold text-slate-900">Total</span>
                  <span className="font-extrabold text-slate-900">₹{price}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="font-extrabold text-[#0D47A1]">Advance (Refundable)</span>
                  <span className="font-extrabold text-[#0D47A1]">₹{advance}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium -mt-1">
                  ₹{remaining} payable after service completion
                </p>
              </div>
            </div>

            {/* Time slot display */}
            {selectedDate && selectedTime && (
              <div className="bg-[#EAF4FF] border border-[#0D47A1]/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D47A1]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-base">📅</span>
                </div>
                <div>
                  <p className="text-[12px] font-extrabold text-[#0D47A1]">Scheduled for {selectedDate}</p>
                  <p className="text-[10px] text-[#0D47A1]/70 font-medium mt-0.5">Professional arrives at {selectedTime}</p>
                </div>
                <button onClick={() => setStep(5)} className="ml-auto p-1.5 hover:bg-[#0D47A1]/10 rounded-full transition-colors">
                  <Edit3 className="w-3.5 h-3.5 text-[#0D47A1]" />
                </button>
              </div>
            )}

            {/* Address form */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-extrabold text-slate-900">Service Address</p>
                <span className="text-[10px] text-slate-400 font-medium">* Required</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Edit3 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.house}
                    onChange={(e) => setAddress(p => ({ ...p, house: e.target.value }))}
                    placeholder="House / Flat / Building No."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) => setAddress(p => ({ ...p, landmark: e.target.value }))}
                    placeholder="Landmark / Street / Area"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => setAddress(p => ({ ...p, name: e.target.value }))}
                    placeholder="Contact name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder-slate-400 focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all"
                  />
                </div>
                {/* Save as tags */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-2">Save address as</p>
                  <div className="flex gap-2">
                    {['Home', 'Office', 'Other'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setAddress(p => ({ ...p, saveAs: tag }))}
                        className={`px-4 py-1.5 rounded-xl border text-[11px] font-extrabold transition-all ${
                          address.saveAs === tag
                            ? 'bg-[#EAF4FF] text-[#0D47A1] border-[#0D47A1]'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-[#F8F9FA] border border-slate-100 rounded-2xl p-4">
              <p className="text-[11px] font-extrabold text-slate-700 mb-2">Please Note</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  'Advance payment of ₹49 is 100% refundable if booking is cancelled.',
                  'Final charges are confirmed by the technician after inspection.',
                  'Remaining amount is paid directly to the technician after service.',
                ].map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-slate-400 text-[10px] mt-0.5">•</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-snug">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ══ STEP 6 PAYMENT GATEWAY ════════════════════════════════════════ */}
        {step === 6 && showPayment && (
          <div className="px-4 pt-5 flex flex-col gap-5">

            {/* Available Offers */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Available Offers</p>
              <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#EAF4FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🏷️</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Upto 1.5% savings with UPI</span>
                </div>
                <button className="text-[#0D47A1] text-[11px] font-extrabold hover:underline">View all</button>
              </div>
            </div>

            {/* Recommended */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Recommended</p>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={handlePaymentSuccess} className="w-full px-4 py-3.5 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 bg-[#F8F9FA] flex items-center justify-center flex-shrink-0">
                      <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-[#EA4335]" />
                        <div className="w-2 h-2 rounded-full bg-[#4285F4]" />
                        <div className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                      </div>
                    </div>
                    <span className="text-[12px] font-extrabold text-slate-800">UPI – Google Pay</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={handlePaymentSuccess} className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-black text-[#002E6E]">Paytm</span>
                    </div>
                    <span className="text-[12px] font-extrabold text-slate-800">UPI – Paytm</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* All payment options */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">All Payment Options</p>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                {/* UPI accordion */}
                <button
                  onClick={() => setUpiExpanded(p => !p)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 bg-[#E0F2F1] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-[#00796B]">UPI</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[12px] font-extrabold text-slate-800">UPI</span>
                      <span className="bg-[#E8F5E9] text-[#2E7D32] text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5">
                        Upto 1.5% savings
                      </span>
                    </div>
                  </div>
                  {upiExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {upiExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 flex flex-col pl-14 pr-4">
                    {['Google Pay', 'PhonePe', 'Paytm', 'Any UPI ID'].map((opt, i, arr) => (
                      <button key={opt} onClick={handlePaymentSuccess}
                        className={`w-full py-3.5 flex items-center justify-between hover:bg-slate-100/50 transition-colors text-left ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <span className="text-[12px] font-bold text-slate-700">{opt}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Card */}
                <button onClick={handlePaymentSuccess} className="w-full px-4 py-3.5 flex items-center justify-between border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-[#0D47A1]" />
                    </div>
                    <span className="text-[12px] font-extrabold text-slate-800">Credit / Debit Card</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Net banking */}
                <button onClick={handlePaymentSuccess} className="w-full px-4 py-3.5 flex items-center justify-between border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-slate-100 bg-[#FFF8E1] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🏦</span>
                    </div>
                    <span className="text-[12px] font-extrabold text-slate-800">Net Banking</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Legal */}
            <p className="text-center text-[9px] text-slate-400 font-semibold leading-relaxed px-4">
              By proceeding, you agree to NCC's <span className="text-[#0D47A1] cursor-pointer">Privacy Policy</span> & <span className="text-[#0D47A1] cursor-pointer">Terms of Service</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
        {/* Payment gateway sticky bar */}
        {step === 6 && showPayment ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[20px] font-extrabold text-slate-900 leading-none">₹{advance}</span>
              <span className="text-[10px] text-slate-400 font-medium mt-1">Advance to confirm booking</span>
            </div>
            <button
              onClick={handlePaymentSuccess}
              className="bg-[#111111] text-white font-extrabold px-10 py-3.5 rounded-xl text-[13px] shadow-sm hover:bg-black active:scale-95 transition-all"
            >
              Pay & Confirm
            </button>
          </div>
        ) : (
          <button
            disabled={
              (step === 2 && !productType) ||
              (step === 3 && !service) ||
              (step === 4 && !brand) ||
              (step === 5 && (!selectedDate || !selectedTime)) ||
              (step === 6 && !showPayment && !isAddressValid)
            }
            onClick={() => {
              if (step < 6) {
                goNext();
              } else if (step === 6 && !showPayment) {
                setShowPayment(true);
                window.scrollTo(0, 0);
              }
            }}
            className={`w-full font-extrabold py-4 rounded-2xl text-[14px] shadow-md transition-all active:scale-[0.98] ${
              (step === 2 && !productType) ||
              (step === 3 && !service) ||
              (step === 4 && !brand) ||
              (step === 5 && (!selectedDate || !selectedTime)) ||
              (step === 6 && !showPayment && !isAddressValid)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-[#0D47A1]/20'
            }`}
          >
            {step === 2 ? 'Continue — Select Service' :
             step === 3 ? 'Continue — Select Brand' :
             step === 4 ? 'Continue — Choose Time Slot' :
             step === 5 ? 'Confirm Slot & Add Address' :
             'Review & Pay ₹' + advance}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingFlow;
