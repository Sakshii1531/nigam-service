import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Shield, Check, ChevronRight, ShoppingCart,
  Calendar, Wrench, Sparkles, Zap, PackageOpen,
  MapPin, Bell, Search, ShieldCheck, FileText, CheckCircle2,
  Lock, Landmark, Wallet, Percent, Home as HomeIcon, LayoutGrid, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';

import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';

const AMC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Derive step from URL
  const pathname = location.pathname;
  let step = 1;
  if (pathname.includes('/buy/amc/select-appliance')) step = 7;
  else if (pathname.includes('/buy/amc/plans')) step = 2;
  else if (pathname.includes('/buy/amc/enter-details')) step = 3;
  else if (pathname.includes('/buy/amc/review')) step = 4;
  else if (pathname.includes('/buy/amc/payment')) step = 5;
  else if (pathname.includes('/buy/amc/success')) step = 6;

  const selectedAppliance = params.appliance ? decodeURIComponent(params.appliance) : null;
  const selectedPlanIndex = params.planIndex
    ? parseInt(params.planIndex)
    : searchParams.get('plan') ? parseInt(searchParams.get('plan')) : 0;

  // Form states
  const [selectedBrand, setSelectedBrand] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [createdSubscription, setCreatedSubscription] = useState(null);
  const [modelNumber, setModelNumber] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [pincode, setPincode] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [paymentMode, setPaymentMode] = useState('UPI');

  useEffect(() => {
    if (location.state?.scrollToCategories) {
      setTimeout(() => {
        document.getElementById('amc-categories')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // The purchasable AMC plans, from the admin-managed catalogue. This screen
  // shipped its own per-appliance price list, so the plans on offer could not
  // be changed without a redeploy and did not have to match what was charged.
  const [amcPlans, setAmcPlans] = useState([]);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    apiRequest('/warranty-amc/amc/plans', { auth: true })
      .then((res) => setAmcPlans((res.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        tier: p.tier,
        visitsTotal: p.visitsTotal,
        popular: p.tier === 'Gold',
        benefits: [`${p.visitsTotal} scheduled visit(s)`, 'Priority booking', 'Free service charges on covered visits'],
      }))))
      .catch((err) => setPlansError(err.message || 'Could not load AMC plans.'));
  }, []);

  const getBrandsForAppliance = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('water purifier') || n.includes('purifier')) return ['Kent', 'Aquaguard', 'Livpure', 'Pureit', 'HUL', 'AO Smith'];
    if (n.includes('ac') || n.includes('conditioner')) return ['Daikin', 'LG', 'Voltas', 'Blue Star', 'Hitachi', 'Carrier'];
    if (n.includes('refrigerator') || n.includes('fridge')) return ['Samsung', 'LG', 'Whirlpool', 'Haier', 'Godrej', 'Voltas'];
    if (n.includes('washing') || n.includes('machine')) return ['Samsung', 'LG', 'Whirlpool', 'IFB', 'Bosch', 'Haier'];
    if (n.includes('television') || n.includes('tv')) return ['Samsung', 'LG', 'Sony', 'Panasonic', 'OnePlus', 'Mi'];
    return ['Samsung', 'LG', 'Sony', 'Panasonic', 'Whirlpool', 'Daikin'];
  };

  const getModelPlaceholder = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('water purifier') || n.includes('purifier')) return 'e.g. Grand Plus, Mineral Plus';
    if (n.includes('ac') || n.includes('conditioner')) return 'e.g. 1.5T Inverter LS-Q18YNZA';
    if (n.includes('refrigerator') || n.includes('fridge')) return 'e.g. RT28T3032S8';
    if (n.includes('washing') || n.includes('machine')) return 'e.g. WA70T4262GG';
    if (n.includes('television') || n.includes('tv')) return 'e.g. UA32T4010ARXXL';
    return 'Enter model number';
  };

  const getSubtitle = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('water purifier') || n.includes('purifier')) return 'your RO details';
    if (n.includes('ac') || n.includes('conditioner')) return 'your AC details';
    if (n.includes('refrigerator') || n.includes('fridge')) return 'your Refrigerator details';
    if (n.includes('washing') || n.includes('machine')) return 'your Washing Machine details';
    if (n.includes('television') || n.includes('tv')) return 'your TV details';
    return 'your product details';
  };

  const getApplianceImg = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('water purifier') || n.includes('purifier')) return waterPurifierImg;
    if (n.includes('ac') || n.includes('conditioner')) return splitAcImg;
    if (n.includes('refrigerator') || n.includes('fridge')) return fridgeImg;
    if (n.includes('washing') || n.includes('machine')) return washingImg;
    if (n.includes('television') || n.includes('tv')) return tvImg;
    return waterPurifierImg;
  };

  const selectedPlan = amcPlans[selectedPlanIndex] || amcPlans[0] || null;
  const applianceBrands = getBrandsForAppliance(selectedAppliance);
  const activeBrand = selectedBrand || applianceBrands[0];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 relative">

      {plansError && (
        <p className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold text-red-700">{plansError}</p>
      )}
      {!plansError && amcPlans.length === 0 && step > 1 && (
        <p className="mx-6 mt-4 text-[11px] font-semibold text-slate-500">Loading AMC plans…</p>
      )}

      {/* Header for sub-steps */}
      {step > 1 && step !== 6 && (
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-border-color shadow-sm sticky top-0 z-30">
          <button
            onClick={() => {
              if (step === 7) navigate('/buy/amc');
              else if (step === 2) navigate('/buy/amc/select-appliance');
              else if (step === 3) navigate(`/buy/amc/plans/${encodeURIComponent(selectedAppliance || '')}`);
              else if (step === 4) navigate(`/buy/amc/enter-details/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`);
              else if (step === 5) navigate(`/buy/amc/review/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`);
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer border border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </button>
          <h1 className="text-base font-extrabold text-brand-navy text-center flex-1 pr-9">
            {step === 7 && 'Select Appliance'}
            {step === 2 && `AMC Plans for ${selectedAppliance}`}
            {step === 3 && 'Enter Details'}
            {step === 4 && 'Review & Confirm'}
            {step === 5 && 'Payment'}
          </h1>
        </div>
      )}

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

        {/* ── STEP 1: AMC HOME ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Location & Profile */}
            <div className="flex justify-between items-center -mt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-blue" />
                <div>
                  <span className="text-[10px] text-text-secondary block font-semibold">Your Location</span>
                  <span className="text-sm font-bold text-text-primary">Civil Lines, Delhi</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="w-9 h-9 bg-white hover:bg-slate-50 rounded-full relative flex items-center justify-center border border-slate-200 shadow-sm">
                  <Bell className="h-4 w-4 text-text-primary" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-blue-800 transition-colors shadow-sm"
                >U</div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search for services (AC, Geyser...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-xs shadow-sm"
              />
            </div>

            {/* Service Type Cards — NCC Shield, NCC AMC, Exchange, Buy New */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1 -mx-6 px-6 mt-[-10px]">
              {[
                {
                  name: 'NCC Shield\nExtended Warranty',
                  desc: 'Extra protection for\nlonger peace of mind',
                  icon: (
                    <div className="relative w-16 h-16 flex items-center justify-center filter drop-shadow-[0_3px_6px_rgba(13,71,161,0.25)]">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                          <linearGradient id="bevelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#1E88E5" />
                            <stop offset="50%" stopColor="#1565C0" />
                            <stop offset="50%" stopColor="#0D47A1" />
                            <stop offset="100%" stopColor="#0A2D6E" />
                          </linearGradient>
                        </defs>
                        {/* Outer Shield Shape */}
                        <path
                          d="M50 6 C68 16 82 14 88 18 C88 38 86 52 86 58 C86 78 68 90 50 95 C32 90 14 78 14 58 C14 52 12 38 12 18 C18 14 32 16 50 6 Z"
                          fill="url(#bevelGrad)"
                        />
                        {/* Inner White Outline */}
                        <path
                          d="M50 14 C65 22 76 20 81 24 C81 40 79 51 79 56 C79 72 65 82 50 86 C35 82 21 72 21 56 C21 51 19 40 19 24 C24 20 35 22 50 14 Z"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeOpacity="0.9"
                        />
                        <text
                          x="50"
                          y="46"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                        >
                          NCC
                        </text>
                        <text
                          x="50"
                          y="60"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                          letterSpacing="0.6"
                        >
                          SHIELD
                        </text>
                      </svg>
                    </div>
                  ),
                  onClick: () => navigate('/buy/select-appliance')
                },
                {
                  name: 'NCC AMC\nPlans',
                  desc: 'Regular care for\nreliable performance',
                  icon: (
                    <div className="relative w-16 h-16 flex items-center justify-center filter drop-shadow-[0_3px_6px_rgba(13,71,161,0.25)]">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                          <linearGradient id="bevelGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#1E88E5" />
                            <stop offset="50%" stopColor="#1565C0" />
                            <stop offset="50%" stopColor="#0D47A1" />
                            <stop offset="100%" stopColor="#0A2D6E" />
                          </linearGradient>
                        </defs>
                        {/* Outer Shield Shape */}
                        <path
                          d="M50 6 C68 16 82 14 88 18 C88 38 86 52 86 58 C86 78 68 90 50 95 C32 90 14 78 14 58 C14 52 12 38 12 18 C18 14 32 16 50 6 Z"
                          fill="url(#bevelGrad2)"
                        />
                        {/* Inner White Outline */}
                        <path
                          d="M50 14 C65 22 76 20 81 24 C81 40 79 51 79 56 C79 72 65 82 50 86 C35 82 21 72 21 56 C21 51 19 40 19 24 C24 20 35 22 50 14 Z"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeOpacity="0.9"
                        />
                        <text
                          x="50"
                          y="46"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                        >
                          NCC
                        </text>
                        <text
                          x="50"
                          y="60"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                          letterSpacing="0.6"
                        >
                          AMC
                        </text>
                      </svg>
                    </div>
                  ),
                  onClick: () => navigate('/buy/amc/select-appliance')
                },

                {
                  name: 'Buy\nNew',
                  desc: 'Shop latest\nappliances & more',
                  icon: (
                    <div className="w-16 h-16 flex items-center justify-center text-[#0B4EA2]">
                      <svg viewBox="0 0 100 100" className="w-11 h-11 stroke-[#0B4EA2] stroke-[5.5] fill-none">
                        <circle cx="35" cy="80" r="5" fill="#0B4EA2" />
                        <circle cx="75" cy="80" r="5" fill="#0B4EA2" />
                        <path d="M15 20 H30 L45 60 H80 L90 30 H35" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ),
                  onClick: () => navigate('/buy-new')
                }
              ].map((card, idx) => (
                <div
                  key={idx}
                  onClick={card.onClick}
                  className="flex-shrink-0 w-[136px] bg-white border border-slate-100 rounded-[24px] p-3.5 pt-4 pb-3.5 flex flex-col items-center text-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer min-h-[210px] group"
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="group-hover:scale-105 transition-transform duration-300">
                      {card.icon}
                    </div>
                    <h3 className="text-[11px] font-black text-[#0A2D6E] leading-snug mt-3 mb-1 min-h-[30px] flex items-center justify-center whitespace-pre-line">
                      {card.name}
                    </h3>
                    <p className="text-[8.5px] text-slate-500 font-semibold leading-normal line-clamp-2 px-0.5 whitespace-pre-line">
                      {card.desc}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm mt-2.5 group-hover:bg-slate-50 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5 text-[#0B4EA2] stroke-[3]" />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-[#E8F1FF] to-[#C9DEFF] rounded-2xl p-4 border border-blue-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-300/20 rounded-full blur-2xl"></div>

              <div className="w-[100px] h-[120px] flex-shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-brand-blue/90 to-[#0B4EA2] shadow-md">
                <div className="absolute inset-0 flex items-end justify-center pb-2">
                  <img src={waterPurifierImg} alt="Water Purifier" className="w-16 h-20 object-contain mix-blend-luminosity opacity-70" />
                </div>
                <Wrench className="h-12 w-12 text-white drop-shadow-lg z-10 opacity-80" />
              </div>

              <div className="flex-1 flex flex-col items-start relative z-10">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  Water Purifier AMC
                </h3>
                <p className="text-[10px] font-semibold text-slate-600 mb-2">Keep your water pure & healthy</p>
                <ul className="flex flex-col gap-1 mb-3">
                  {['TDS check-up', 'Regular Filter change', 'Expert Service'].map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/buy/amc/plans/Water%20Purifier')}
                  className="bg-brand-blue hover:bg-blue-800 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  View AMC Plans
                </button>
              </div>
            </div>

            {/* Shop by Category */}
            <div id="amc-categories" className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-brand-navy">Shop by Category</h3>
                <button className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">View All</button>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                {[
                  { name: 'TV', img: tvImg, appliance: 'Television' },
                  { name: 'Refrigerator', img: fridgeImg, appliance: 'Refrigerator' },
                  { name: 'Washing Machine', img: washingImg, appliance: 'Washing Machine' },
                  { name: 'AC', img: splitAcImg, appliance: 'Air Conditioner' },
                  { name: 'Water Purifier', img: waterPurifierImg, appliance: 'Water Purifier' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/buy/amc/plans/${encodeURIComponent(item.appliance)}`)}
                    className="flex-shrink-0 w-[72px] bg-white border border-slate-200/60 rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:border-brand-blue/30 hover:shadow-md transition-all text-center min-h-[88px]"
                  >
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-700 leading-tight block text-center">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buy Brand New */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-brand-navy">Buy Brand New</h3>
                <button className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">View All</button>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  {[
                    { name: 'SAMSUNG', color: '#1428A0' },
                    { name: 'LG', color: '#A50034' },
                    { name: 'Whirlpool', color: '#00205B' },
                    { name: 'VOLTAS', color: '#E31837' },
                    { name: 'PANASONIC', color: '#003087' },
                  ].map((brand, idx) => (
                    <div key={idx} className="flex-1 flex items-center justify-center py-2 px-1 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-blue-50/30 hover:border-brand-blue/30 cursor-pointer transition-all shadow-xs">
                      <span className="text-[8px] font-black tracking-tight text-center leading-tight" style={{ color: brand.color }}>
                        {brand.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: SELECT AMC APPLIANCE ── */}
        {step === 7 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1">
              <h2 className="text-lg font-black text-brand-navy">NCC AMC Plans</h2>
              <p className="text-xs text-text-secondary font-semibold">Select an appliance for AMC plan</p>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { id: 'tv', name: 'Television', desc: 'NCC AMC Plans', price: '₹599', img: tvImg },
                { id: 'refrigerator', name: 'Refrigerator', desc: 'NCC AMC Plans', price: '₹799', img: fridgeImg },
                { id: 'washing-machine', name: 'Washing Machine', desc: 'NCC AMC Plans', price: '₹699', img: washingImg },
                { id: 'ac', name: 'Air Conditioner', desc: 'NCC AMC Plans', price: '₹999', img: splitAcImg },
                { id: 'water-purifier', name: 'Water Purifier', desc: 'NCC AMC Plans', price: '₹999', img: waterPurifierImg }
              ].map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    navigate(`/buy/amc/plans/${encodeURIComponent(item.name)}`);
                  }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/40 shadow-sm hover:scale-[1.01] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">{item.name}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-medium">{item.desc}</p>
                      <span className="text-xs font-extrabold text-brand-blue block mt-1">From {item.price}/Year</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: SELECT AMC PLAN ── */}
        {step === 2 && selectedPlan && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1">
              <p className="text-xs text-text-secondary font-semibold">Choose the plan that suits you</p>
            </div>

            <div className="flex flex-col gap-3">
              {amcPlans.map((plan, idx) => {
                const isSelected = selectedPlanIndex === idx;
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/buy/amc/plans/${encodeURIComponent(selectedAppliance || '')}?plan=${idx}`)}
                    className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all shadow-sm ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50/20 ring-1 ring-brand-blue'
                        : 'border-slate-200 hover:border-brand-blue/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xl font-black text-brand-blue">₹{plan.price.toLocaleString()}</span>
                          <span className="text-xs text-text-secondary font-semibold">/Year</span>
                          {plan.popular && (
                            <span className="bg-brand-yellow text-brand-navy text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Popular
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black text-brand-navy">{plan.name}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-1 ${
                        isSelected ? 'border-brand-blue bg-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
                      {plan.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-slate-700 font-semibold">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate(`/buy/amc/enter-details/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`)}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: ENTER DETAILS ── */}
        {step === 3 && selectedPlan && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-lg font-black text-brand-navy">Enter Details</h2>
              <p className="text-xs text-text-secondary font-semibold">Please provide {getSubtitle(selectedAppliance)}</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Brand */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Sparkles className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Brand *</label>
                  <select
                    value={activeBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5 cursor-pointer appearance-none"
                  >
                    {applianceBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
              </div>

              {/* Model Number */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Wrench className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Model Number *</label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder={getModelPlaceholder(selectedAppliance)}
                  />
                </div>
              </div>

              {/* Installation Date */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Installation Date *</label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Pincode */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <MapPin className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Pincode *</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>

              {/* Upload Invoice (Optional) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">Upload Invoice</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      {invoiceFile ? invoiceFile.name : 'Optional · JPG, PNG or PDF (Max 5MB)'}
                    </span>
                  </div>
                </div>
                <label className="border border-brand-blue hover:bg-blue-50/50 text-brand-blue font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm select-none">
                  {invoiceFile ? 'Change' : 'Upload'}
                  <input type="file" className="hidden" onChange={(e) => { if (e.target.files[0]) setInvoiceFile(e.target.files[0]); }} />
                </label>
              </div>
            </div>

            <button
              onClick={() => navigate(`/buy/amc/review/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`)}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-1 cursor-pointer active:scale-98"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ── STEP 4: REVIEW & CONFIRM ── */}
        {step === 4 && selectedPlan && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
          >
            <div className="px-1">
              <h2 className="text-lg font-black text-brand-navy">Review & Confirm</h2>
              <p className="text-xs text-text-secondary font-semibold">Please review your selection</p>
            </div>

            {/* Product Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                <img src={getApplianceImg(selectedAppliance)} alt={selectedAppliance} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div>
                <h4 className="text-sm font-black text-brand-navy leading-tight">
                  {activeBrand} {modelNumber || selectedAppliance}
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">{selectedPlan.name}</p>
                <span className="text-xs font-black text-brand-blue block mt-0.5">₹{selectedPlan.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Plan Price</span>
                <span className="font-bold text-text-primary">₹{selectedPlan.price}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                {/* The server charges the catalogue price. An 18% GST line was
                    added here that was never applied, so the customer was quoted
                    more than they were actually billed. */}
                <span className="text-text-secondary">Taxes</span>
                <span className="font-bold text-text-primary">Included</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-base font-black text-text-primary">Total Amount</span>
                <span className="text-xl font-black text-brand-blue">₹{Number(selectedPlan.price || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Plan Includes */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
              <h4 className="text-xs font-black text-brand-navy mb-0.5">Plan Includes</h4>
              {selectedPlan.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Action + disclaimer */}
            <div className="flex flex-col items-center gap-2 mt-1">
              <button
                onClick={() => navigate(`/buy/amc/payment/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`)}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Proceed to Payment
              </button>
              <p className="text-[10px] text-text-secondary text-center font-medium">
                ⓘ AMC will start from the date of purchase.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: PAYMENT ── */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-lg font-black text-brand-navy">Payment</h2>
              <p className="text-xs text-text-secondary font-semibold">Select a payment method</p>
            </div>

            {/* Recommended */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Recommended</span>
              <div
                onClick={() => setPaymentMode('UPI')}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'UPI' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue flex-shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">UPI</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">Pay using any UPI app</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'UPI' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'UPI' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>
            </div>

            {/* Other Options */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Other Options</span>
              {[
                { id: 'Card', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, Rupay', Icon: Lock },
                { id: 'NetBanking', label: 'Net Banking', sub: 'All major banks', Icon: Landmark },
                { id: 'Wallets', label: 'Wallets', sub: 'Paytm, PhonePe, Amazon Pay', Icon: Wallet },
                { id: 'EMI', label: 'EMI Options', sub: 'Easy EMI available', Icon: Percent },
              ].map(({ id, label, sub, Icon }) => (
                <div
                  key={id}
                  onClick={() => setPaymentMode(id)}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                    paymentMode === id ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-brand-navy block">{label}</span>
                      <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">{sub}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    paymentMode === id ? 'border-brand-blue bg-white' : 'border-slate-300'
                  }`}>
                    {paymentMode === id && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Payable */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-2">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Payable</span>
                <span className="text-lg font-black text-brand-navy block mt-0.5">₹{Number(selectedPlan.price || 0).toLocaleString('en-IN')}</span>
              </div>
              <span className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">View Details</span>
            </div>

            {/* Pay Button */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                // A failed subscription must not reach the success screen — the
                // customer would believe they were covered with no contract on file.
                onClick={async () => {
                  setPurchaseError('');
                  try {
                    const res = await apiRequest('/warranty-amc/amc/subscriptions', {
                      method: 'POST',
                      auth: true,
                      body: {
                        plan: selectedPlan?.id,
                        planName: selectedPlan?.name,
                        category: selectedAppliance || 'Appliance',
                        brand: selectedBrand || 'Nigam Care',
                        model: modelNumber || undefined,
                      },
                    });

                    setCreatedSubscription(res.data.subscription);

                    // Not covered until the payment clears.
                    if (res.data.razorpay) {
                      await payWithRazorpay({
                        razorpay: res.data.razorpay,
                        verifyPath: `/warranty-amc/amc/subscriptions/${res.data.subscription.id}/verify-payment`,
                        description: selectedPlan?.name,
                      });
                    }
                  } catch (err) {
                    setPurchaseError(err.message || 'We could not activate this plan. You have not been charged — please try again.');
                    return;
                  }
                  navigate(`/buy/amc/success/${encodeURIComponent(selectedAppliance || '')}/${selectedPlanIndex}`);
                }}
                className="w-full bg-brand-yellow hover:bg-yellow-400 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Pay ₹{Number(selectedPlan.price || 0).toLocaleString('en-IN')} Securely
              </button>
              {purchaseError && (
                <p className="text-[11px] font-bold text-red-600 text-center px-2">{purchaseError}</p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                100% Secure Payment
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: SUCCESS ── */}
        {step === 6 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 py-6 pb-8"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-brand-navy leading-tight">Payment Successful!</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-medium">Your AMC is now active with Nigam Service.</p>
            </div>

            <div className="w-full bg-gradient-to-br from-brand-navy via-[#0C3F85] to-brand-blue rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-brand-yellow text-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">NIGAM AMC</span>
                  <h4 className="text-base font-black mt-2.5">{selectedAppliance} AMC</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <Wrench className="h-5 w-5 text-brand-yellow" />
                </div>
              </div>
              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Plan:</span>
                  <span className="font-bold text-brand-yellow">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">AMC ID:</span>
                  {/* The real subscription reference. A random NCCAMC###### was
                      shown here, so a customer quoting it to support named a
                      contract that does not exist. */}
                  <span className="font-mono tracking-wider font-semibold">{createdSubscription?.humanId || createdSubscription?.id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> {createdSubscription?.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duration:</span>
                  <span className="font-bold text-white">1 Year AMC</span>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3 mt-4">
              <button onClick={() => navigate('/buy/amc')} className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98">
                View AMC Details
              </button>
              <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-brand-blue cursor-pointer transition-colors"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Account</span>
        </button>
      </div>

    </div>
  );
};

export default AMC;
