import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Award, Check, ChevronRight, ShoppingCart, Star,
  Home as HomeIcon, Calendar, Wrench, User, Sparkles, Zap, PackageOpen,
  MapPin, Bell, Search, Wind, Tv, ShieldCheck, FileText, CheckCircle2, 
  ChevronLeft, Info, HelpCircle, Phone, Mail, Lock, Landmark, Wallet, 
  Percent, Upload, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';
import { useAuth } from '../context/AuthContext';

// Import premium cutout assets for high-fidelity rendering
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';
import kitchenApplianceImg from '../assets/categories/kitchen_appliance.png';
import warrantyBanner2 from '../assets/warranty_banner_2.png';
import star3d from '../assets/star_3d.png';
import ac3d from '../assets/icon_3d_ac.png';
import wm3d from '../assets/icon_3d_wm.png';
import fridge3d from '../assets/icon_3d_fridge.png';
import tv3d from '../assets/icon_3d_tv.png';
import geyser3d from '../assets/icon_3d_geyser.png';
import ro3d from '../assets/icon_3d_ro.png';

// Import realistic spare parts assets
import roPreFilterImg from '../assets/ro_pre_filter_candle.png';
import roMembraneImg from '../assets/ro_membrane.png';
import roSedimentImg from '../assets/ro_sediment_filter.png';
import roCarbonImg from '../assets/ro_carbon_filter.png';
import roPostCarbonImg from '../assets/ro_post_carbon.png';

const Buy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Derive step from URL pathname
  const pathname = location.pathname;
  let step = 1;
  if (pathname.includes('/buy/select-appliance')) step = 2;
  else if (pathname.includes('/buy/select-tier')) step = 3;
  else if (pathname.includes('/buy/enter-details')) step = 5;
  else if (pathname.includes('/buy/review')) step = 4;
  else if (pathname.includes('/buy/payment')) step = 6;
  else if (pathname.includes('/buy/success')) step = 7;
  else if (pathname.includes('/buy/my-warranty')) step = 8;
  else if (pathname.includes('/buy/how-it-works')) step = 9;
  else if (pathname.includes('/buy/warranty-details')) step = 10;
  else if (pathname.includes('/buy/amc-details')) step = 13;
  else if (pathname.includes('/buy/file-claim')) step = 14;
  else if (pathname.includes('/buy/claim-success')) step = 15;

  // Appliance & tier from URL params + query string
  const [searchParams] = useSearchParams();
  const selectedAppliance = params.appliance ? decodeURIComponent(params.appliance) : null;
  const selectedTierIndex = params.tierIndex 
    ? parseInt(params.tierIndex) 
    : searchParams.get('tier') 
      ? parseInt(searchParams.get('tier')) 
      : 0;

  // Helper to navigate to a step with current context
  const goTo = (targetStep, appliance, tierIndex) => {
    const app = encodeURIComponent(appliance || selectedAppliance || '');
    const ti = tierIndex !== undefined ? tierIndex : selectedTierIndex;
    if (targetStep === 1) navigate('/buy');
    else if (targetStep === 2) navigate('/buy/select-appliance');
    else if (targetStep === 3) navigate(`/buy/select-tier/${app}`);
    else if (targetStep === 5) navigate(`/buy/enter-details/${app}/${ti}`);
    else if (targetStep === 4) navigate(`/buy/review/${app}/${ti}`);
    else if (targetStep === 6) navigate(`/buy/payment/${app}/${ti}`);
    else if (targetStep === 7) navigate(`/buy/success/${app}/${ti}`);
    else if (targetStep === 8) navigate('/buy/my-warranty');
    else if (targetStep === 9) navigate('/buy/how-it-works');
    else if (targetStep === 10) navigate('/buy/warranty-details');
    else if (targetStep === 11) navigate('/buy/accessories');
    else if (targetStep === 12) navigate('/buy/all-appliances');
    else if (targetStep === 13) navigate('/buy/amc-details');
    else if (targetStep === 14) navigate('/buy/file-claim');
    else if (targetStep === 15) navigate('/buy/claim-success');
  };

  const setStep = (s) => goTo(s);

  // Carousel state for Banners
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    // Auto-slide every 4 seconds
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Form states for Step 5 & 6 & 8. These used to default to a fake persona
  // ("Rahul Sharma", "9876543210", "rahulsharma@gmail.com", "110054") — a
  // customer who didn't notice and overwrite it would have their extended
  // warranty registered under a stranger's contact details.
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [pincode, setPincode] = useState('');
  const [selectedBrand, setSelectedBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [activeWarrantyTab, setActiveWarrantyTab] = useState("Active");
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [cameFromMore, setCameFromMore] = useState(false);

  // Protection Plans & Claims States
  const [activePlanSection, setActivePlanSection] = useState("Extended Warranties"); // 'Extended Warranties' | 'AMC Plans'
  const [selectedAMC, setSelectedAMC] = useState(null);
  const [claimSubject, setClaimSubject] = useState(""); 
  const [claimOrderId, setClaimOrderId] = useState("");
  const [claimPlanType, setClaimPlanType] = useState(""); 
  const [claimIssue, setClaimIssue] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimTime, setClaimTime] = useState("10:00 AM - 1:00 PM");
  const [submittedTicketId, setSubmittedTicketId] = useState("");

  const [warranties, setWarranties] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (step === 8) {
      const fetchPlans = async () => {
        setPlansLoading(true);
        try {
          const wRes = await apiRequest('/warranty-amc/extended-warranty/orders', { auth: true });
          const aRes = await apiRequest('/warranty-amc/amc/subscriptions', { auth: true });
          
          if (wRes) {
            setWarranties(wRes);
          }
          if (aRes) {
            setAmcs(aRes);
          }
        } catch (err) {
          console.warn('Error loading protection plans:', err);
        } finally {
          setPlansLoading(false);
        }
      };
      fetchPlans();
    }
  }, [step]);

  // Product-specific brands per appliance
  const getBrandsForAppliance = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv'))
      return ['Samsung', 'LG', 'Sony', 'Panasonic', 'OnePlus', 'Mi'];
    if (n.includes('refrigerator') || n.includes('fridge'))
      return ['Samsung', 'LG', 'Whirlpool', 'Haier', 'Godrej', 'Voltas'];
    if (n.includes('washing') || n.includes('machine'))
      return ['Samsung', 'LG', 'Whirlpool', 'IFB', 'Bosch', 'Haier'];
    if (n.includes('ac') || n.includes('conditioner'))
      return ['Daikin', 'LG', 'Voltas', 'Blue Star', 'Hitachi', 'Carrier'];
    if (n.includes('purifier'))
      return ['Kent', 'Aquaguard', 'Livpure', 'Pureit', 'HUL', 'AO Smith'];
    if (n.includes('geyser'))
      return ['Havells', 'Bajaj', 'AO Smith', 'Racold', 'Crompton', 'V-Guard'];
    return ['Samsung', 'LG', 'Sony', 'Panasonic', 'Whirlpool', 'Daikin'];
  };

  // Product-specific model placeholder
  const getModelPlaceholder = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return 'e.g. UA32T4010ARXXL';
    if (n.includes('refrigerator') || n.includes('fridge')) return 'e.g. RT28T3032S8';
    if (n.includes('washing') || n.includes('machine')) return 'e.g. WA70T4262GG';
    if (n.includes('ac') || n.includes('conditioner')) return 'e.g. 1.5T FTKY50';
    if (n.includes('purifier')) return 'e.g. KIM11PM';
    return 'Enter model number';
  };

  // Product-specific invoice filename
  const getInvoiceLabel = (appliance) => {
    const n = appliance?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return 'invoice_tv.pdf';
    if (n.includes('refrigerator') || n.includes('fridge')) return 'invoice_fridge.pdf';
    if (n.includes('washing') || n.includes('machine')) return 'invoice_washing_machine.pdf';
    if (n.includes('ac') || n.includes('conditioner')) return 'invoice_ac.pdf';
    if (n.includes('purifier')) return 'invoice_water_purifier.pdf';
    return 'invoice.pdf';
  };

  // Dynamic pricing tiers by product category
  // The purchasable extension packs, from the admin-managed catalogue. This
  // screen carried its own per-appliance price tables, so the packs on offer
  // could not be changed without a redeploy — and the "Pay" button below simply
  // navigated to a success page, creating no policy and taking no money.
  const [ewPlans, setEwPlans] = useState([]);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    apiRequest('/warranty-amc/extended-warranty/plans', { auth: true })
      .then((res) => setEwPlans((res || []).map((pl) => ({
        id: pl.id,
        label: pl.name,
        price: pl.price,
        durationYears: pl.durationYears,
        features: pl.features || [],
      }))))
      .catch((err) => setPlansError(err.message || 'Could not load warranty plans.'));
  }, []);

  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [boughtOrder, setBoughtOrder] = useState(null);

  const selectedTiers = ewPlans;
  const selectedTier = selectedTiers[selectedTierIndex] || selectedTiers[0] || null;

  // Creates the policy and collects payment before the success screen. It used
  // to navigate straight to /buy/success — no policy, no charge.
  const handleBuyWarranty = async () => {
    if (!selectedTier) return;
    setBuyError('');
    setBuying(true);
    try {
      const res = await apiRequest('/warranty-amc/extended-warranty/orders', {
        method: 'POST',
        auth: true,
        body: {
          plan: selectedTier.id,
          category: selectedAppliance,
          brand: activeBrand,
          modelName: modelNumber || undefined,
        },
      });

      if (res.razorpay) {
        await payWithRazorpay({
          razorpay: res.razorpay,
          verifyPath: `/warranty-amc/extended-warranty/orders/${res.order.id}/verify-payment`,
          description: selectedTier.label,
        });
      }
      setBoughtOrder(res.order);
      navigate(`/buy/success/${encodeURIComponent(selectedAppliance || '')}/${selectedTierIndex}`);
    } catch (err) {
      setBuyError(err.message || 'The policy could not be activated. You have not been charged.');
    } finally {
      setBuying(false);
    }
  };
  const applianceBrands = getBrandsForAppliance(selectedAppliance);
  const defaultBrand = applianceBrands[0] || 'Samsung';
  const activeBrand = selectedBrand || defaultBrand;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 lg:pb-8 relative">
      

      {/* Header section with back navigation for sub-steps — mobile only */}
      {step > 1 && step !== 7 && step !== 15 && (
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-border-color shadow-sm sticky top-0 z-30 lg:hidden">
          <button 
            onClick={() => {
              if (step === 2) navigate('/buy');
              else if (step === 3) navigate('/buy/select-appliance');
              else if (step === 5) navigate(`/buy/select-tier/${encodeURIComponent(selectedAppliance || '')}`);
              else if (step === 4) navigate(`/buy/enter-details/${encodeURIComponent(selectedAppliance || '')}/${selectedTierIndex}`);
              else if (step === 6) navigate(`/buy/review/${encodeURIComponent(selectedAppliance || '')}/${selectedTierIndex}`);
              else if (step === 8) navigate(-1);
              else if (step === 9) navigate('/buy/select-appliance');
              else if (step === 10) navigate('/buy/my-warranty');
              else if (step === 11) navigate('/buy');
              else if (step === 12) navigate('/buy/select-appliance');
              else if (step === 13) navigate('/buy/my-warranty');
              else if (step === 14) {
                if (claimPlanType === "Extended Warranty") navigate('/buy/warranty-details');
                else navigate('/buy/amc-details');
              }
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer border border-slate-100"
          >
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </button>
          
          <h1 className="text-base font-extrabold text-brand-navy text-center flex-1 pr-9">
            {step === 2 && 'Select Appliance'}
            {step === 3 && selectedAppliance}
            {step === 4 && 'Review & Confirm'}
            {step === 5 && 'Enter Details'}
            {step === 6 && 'Payment'}
            {step === 8 && 'My Protection Plans'}
            {step === 9 && 'How it Works'}
            {step === 10 && 'Warranty Details'}
            {step === 11 && 'Products & Accessories'}
            {step === 12 && 'All Appliances'}
            {step === 13 && 'AMC Details'}
            {step === 14 && 'File a Claim'}
          </h1>
        </div>
      )}

      {/* Dynamic Content Pages */}
      <div className="flex-1 p-6 md:px-8 flex flex-col gap-6 md:gap-8 overflow-y-auto max-w-screen-xl mx-auto w-full">
        
        {/* STEP 1: BUY SECTION - HOME */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Location & Profile Bar */}
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
                  <Bell className="h-4.5 w-4.5 text-text-primary" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div 
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-blue-800 transition-colors shadow-sm"
                >
                  U
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search for services (AC, Geyser...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-xs shadow-sm"
              />
            </div>

            {/* Service Type Cards — NCC Shield, NCC AMC, Exchange, Buy New */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1 -mx-6 px-6 mt-[-10px] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:mx-0 md:px-1">
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
                  onClick: () => setStep(2)
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
                  className="flex-shrink-0 w-[136px] md:w-auto md:flex-shrink bg-white border border-slate-100 rounded-[24px] p-3.5 pt-4 pb-3.5 md:p-6 flex flex-col items-center text-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer min-h-[210px] md:min-h-[240px] group"
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

            {/* Promotional Banners Carousel */}
            <div className="relative w-full overflow-hidden rounded-2xl group">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeBanner * 100}%)` }}
              >
                
                {/* Banner 1: Extended Warranty */}
                <div className="w-full flex-shrink-0 px-0.5">
                  <div 
                    onClick={() => setStep(2)}
                    className="bg-gradient-to-br from-[#E8F1FF] to-[#C9DEFF] rounded-2xl p-4 border border-blue-100 shadow-sm flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-[142px]"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-300/20 rounded-full blur-2xl"></div>
                    
                    {/* Left shield illustration */}
                    <div className="w-[80px] h-[80px] flex-shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-brand-blue/90 to-[#0B4EA2] shadow-md">
                      <Shield className="h-10 w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-xs font-black text-brand-navy leading-tight mb-2">
                        Protect appliances with Extended Warranty
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2.5">
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Genuine Parts
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Expert Support
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Hassle Free Claims
                        </li>
                      </ul>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setStep(2);
                        }}
                        className="bg-brand-blue hover:bg-blue-800 text-white text-[9px] font-black px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Explore Plans
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner 2: Buy New Products */}
                <div className="w-full flex-shrink-0 px-0.5">
                  <div 
                    onClick={() => navigate('/buy-new')}
                    className="bg-gradient-to-br from-[#FFF5E6] to-[#FFE6C9] rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-[142px]"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-300/20 rounded-full blur-2xl"></div>
                    
                    {/* Left shopping cart illustration */}
                    <div className="w-[80px] h-[80px] flex-shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-[#F59E0B] to-[#D97706] shadow-md">
                      <ShoppingCart className="h-10 w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-xs font-black text-brand-navy leading-tight mb-2">
                        Shop Latest Appliances & Electronics
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2.5">
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Free Doorstep Installation
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> 1 Year Brand Warranty
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> No Cost EMI Options
                        </li>
                      </ul>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/buy-new');
                        }}
                        className="bg-[#D97706] hover:bg-amber-700 text-white text-[9px] font-black px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Shop New
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner 3: NCC AMC Plans */}
                <div className="w-full flex-shrink-0 px-0.5">
                  <div 
                    onClick={() => navigate('/buy/amc')}
                    className="bg-gradient-to-br from-[#E6F4EA] to-[#C9EAD2] rounded-2xl p-4 border border-emerald-100 shadow-sm flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-[142px]"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-300/20 rounded-full blur-2xl"></div>
                    
                    {/* Left check-shield illustration */}
                    <div className="w-[80px] h-[80px] flex-shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-[#10B981] to-[#059669] shadow-md">
                      <ShieldCheck className="h-10 w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-xs font-black text-brand-navy leading-tight mb-2">
                        NCC AMC Maintenance & Care Plans
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2.5">
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Regular Preventive Visits
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Free Spare Repairs
                        </li>
                        <li className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 flex-shrink-0" /> Zero Labor & Service Charges
                        </li>
                      </ul>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/buy/amc');
                        }}
                        className="bg-[#059669] hover:bg-emerald-700 text-white text-[9px] font-black px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        Explore AMC
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Dots indicator at the bottom center of the carousel wrapper */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBanner(idx);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                      activeBanner === idx ? 'bg-brand-navy w-3' : 'bg-slate-400/40'
                    }`}
                  />
                ))}
              </div>

            </div>

            {/* Shop by Category */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-brand-navy">Shop by Category</h3>
                <button 
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-brand-blue hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible">
                {[
                  { name: 'TV', img: tvImg, appliance: 'Television' },
                  { name: 'Refrigerator', img: fridgeImg, appliance: 'Refrigerator' },
                  { name: 'Washing Machine', img: washingImg, appliance: 'Washing Machine' },
                  { name: 'AC', img: splitAcImg, appliance: 'Air Conditioner' },
                  { name: 'Water Purifier', img: waterPurifierImg, appliance: 'Water Purifier' },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      navigate(`/buy/select-tier/${encodeURIComponent(item.appliance)}`);
                    }}
                    className="flex-shrink-0 w-[72px] md:w-auto md:flex-shrink bg-white border border-slate-200/60 rounded-2xl p-2 md:p-4 flex flex-col items-center justify-center gap-1.5 md:gap-2.5 cursor-pointer shadow-sm hover:border-brand-blue/30 hover:shadow-md transition-all text-center min-h-[88px] md:min-h-[120px]"
                  >
                    <div className="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center overflow-hidden">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <span className="text-[9px] md:text-xs font-semibold text-slate-700 leading-tight block text-center">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buy Brand New */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-brand-navy">Buy Brand New</h3>
                <button className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                  View All
                </button>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 md:gap-4">
                  {[
                    { name: 'SAMSUNG', color: '#1428A0' },
                    { name: 'LG', color: '#A50034' },
                    { name: 'Whirlpool', color: '#00205B' },
                    { name: 'VOLTAS', color: '#E31837' },
                    { name: 'PANASONIC', color: '#003087' },
                  ].map((brand, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex items-center justify-center py-2 md:py-4 px-1 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-blue-50/30 hover:border-brand-blue/30 cursor-pointer transition-all shadow-xs"
                    >
                      <span 
                        className="text-[8px] md:text-[11px] font-black tracking-tight text-center leading-tight"
                        style={{ color: brand.color }}
                      >
                        {brand.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* STEP 2: EXTENDED WARRANTY - SELECT APPLIANCE */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-lg font-black text-brand-navy">Extended Warranty</h2>
                <p className="text-xs text-text-secondary font-semibold">Select an appliance to buy</p>
              </div>
              <span 
                onClick={() => setStep(9)}
                className="text-xs font-bold text-[#0B4EA2] hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1 bg-blue-50/50 px-2.5 py-1.5 rounded-xl border border-blue-100 hover:border-blue-200"
              >
                <HelpCircle className="w-3.5 h-3.5" /> How it works?
              </span>
            </div>

            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
              {[
                { id: 'tv', name: 'Television', desc: 'Extended Warranty', price: '₹999', img: tvImg },
                { id: 'refrigerator', name: 'Refrigerator', desc: 'Extended Warranty', price: '₹999', img: fridgeImg },
                { id: 'washing-machine', name: 'Washing Machine', desc: 'Extended Warranty', price: '₹999', img: washingImg },
                { id: 'ac', name: 'Air Conditioner', desc: 'Extended Warranty', price: '₹1,199', img: splitAcImg },
                { id: 'water-purifier', name: 'Water Purifier', desc: 'Extended Warranty', price: '₹699', img: waterPurifierImg }
              ].map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    navigate(`/buy/select-tier/${encodeURIComponent(item.name)}`);
                  }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/40 shadow-sm hover:scale-[1.01] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">{item.name}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-medium">{item.desc}</p>
                      <span className="text-xs font-extrabold text-brand-blue block mt-1">From {item.price}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                </div>
              ))}

              {/* View More Appliances Button */}
              <div 
                onClick={() => {
                  navigate('/buy/all-appliances');
                }}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/40 shadow-sm"
              >
                <span className="text-xs font-black text-brand-navy pl-2">View More Appliances</span>
                <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SELECT PRODUCT & TIERS */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1">
              <h2 className="text-lg font-black text-brand-navy">{selectedAppliance || 'Appliance'}</h2>
              <p className="text-xs text-text-secondary font-semibold">Select your {selectedAppliance === 'Television' ? 'TV' : 'appliance'} category</p>
            </div>

            {/* Tier Selector cards */}
            <div className="flex flex-col gap-3">
              {selectedTiers.map((tier, idx) => {
                const isSelected = selectedTierIndex === idx;
                return (
                  <div
                    key={tier.id}
                    onClick={() => navigate(`/buy/select-tier/${encodeURIComponent(selectedAppliance || '')}?tier=${idx}`)}
                    className={`bg-white border rounded-2xl p-4.5 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-brand-blue bg-blue-50/10 shadow-sm ring-1 ring-brand-blue' 
                        : 'border-slate-250 hover:border-slate-350'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-black text-brand-navy block">{tier.label}</span>
                      <span className="text-xs font-extrabold text-brand-blue block mt-1">₹{tier.price} <span className="text-text-secondary font-medium text-[10px]">for 1 Year</span></span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-brand-blue bg-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* What's Covered list */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">What's Covered?</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  'Manufacturing Defects',
                  'Repair & Replacement',
                  'Expert Technician Support',
                  'Hassle Free Claims'
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue button */}
            <button 
              onClick={() => navigate(`/buy/enter-details/${encodeURIComponent(selectedAppliance || '')}/${selectedTierIndex}`)}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
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
                <img 
                  src={
                    selectedAppliance?.toLowerCase().includes('tv') || selectedAppliance?.toLowerCase().includes('television') ? tvImg :
                    selectedAppliance?.toLowerCase().includes('fridge') || selectedAppliance?.toLowerCase().includes('refrigerator') ? fridgeImg :
                    selectedAppliance?.toLowerCase().includes('washing') || selectedAppliance?.toLowerCase().includes('machine') ? washingImg :
                    selectedAppliance?.toLowerCase().includes('ac') || selectedAppliance?.toLowerCase().includes('conditioner') ? splitAcImg :
                    selectedAppliance?.toLowerCase().includes('purifier') ? waterPurifierImg : kitchenApplianceImg
                  } 
                  alt={selectedAppliance} 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>
              <div>
                <h4 className="text-sm font-black text-brand-navy leading-tight">{selectedAppliance}</h4>
                <p className="text-xs text-text-secondary mt-0.5">{selectedTier?.label}</p>
                <span className="text-xs text-text-secondary font-medium block mt-0.5">1 Year Extended Warranty</span>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Warranty Price (1 Year)</span>
                <span className="font-bold text-text-primary">₹{selectedTier?.price}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                {/* Same as AMC: the server bills the tier price, so a 10% line
                    here quoted the customer more than they were charged. */}
                <span className="text-text-secondary">Taxes</span>
                <span className="font-bold text-text-primary">Included</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-base font-black text-text-primary">Total Amount</span>
                <span className="text-xl font-black text-brand-blue">₹{Number(selectedTier.price || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Benefits Included */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
              <h4 className="text-xs font-black text-brand-navy mb-0.5">Benefits Included?</h4>
              {[
                'Manufacturing Defects',
                'Repair & Replacement',
                'Genuine Spare Parts',
                'Expert Technician Support',
                'Hassle Free Claims',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Action button + disclaimer */}
            <div className="flex flex-col items-center gap-2 mt-1">
              <button 
                onClick={() => setStep(6)}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Proceed to Payment
              </button>
              <p className="text-[10px] text-text-secondary text-center font-medium">
                ⓘ Warranty starts after the manufacturer warranty ends.
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 5: ENTER DETAILS */}
        {step === 5 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-lg font-black text-brand-navy">Enter Details</h2>
              <p className="text-xs text-text-secondary font-semibold">Please provide accurate details</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Full Name */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <User className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Phone className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Mail className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {/* Pincode */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <MapPin className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Pincode</label>
                  <input 
                    type="text" 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>

              {/* Select Brand */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Sparkles className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Select Brand</label>
                  <select 
                    value={activeBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5 cursor-pointer appearance-none"
                  >
                    {applianceBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
              </div>

              {/* Model Number */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Tv className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Model Number</label>
                  <input 
                    type="text" 
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5"
                    placeholder={getModelPlaceholder(selectedAppliance)}
                  />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
              </div>

              {/* Purchase Date */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Purchase Date</label>
                  <input 
                    type="date" 
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent mt-0.5 cursor-pointer"
                  />
                </div>
              </div>

              {/* Upload Invoice */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">Upload Invoice</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      {invoiceFile ? invoiceFile.name : "JPG, PNG or PDF (Max 5MB)"}
                    </span>
                  </div>
                </div>
                <label className="border border-brand-blue hover:bg-blue-50/50 text-brand-blue font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm select-none">
                  Upload
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      if(e.target.files[0]) {
                        setInvoiceFile(e.target.files[0]);
                      }
                    }} 
                  />
                </label>
              </div>

            </div>

            {/* Action Button */}
            <button 
              onClick={() => setStep(4)}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-3 cursor-pointer active:scale-98"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* STEP 6: PAYMENT */}
        {step === 6 && (
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

            {/* Recommended Section */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Recommended</span>
              
              <div 
                onClick={() => setPaymentMode("UPI")}
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

            {/* Other Options Section */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Other Options</span>

              {/* Debit/Credit Card */}
              <div 
                onClick={() => setPaymentMode("Card")}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'Card' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">Debit / Credit Card</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">Visa, Mastercard, Rupay</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'Card' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'Card' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>

              {/* Net Banking */}
              <div 
                onClick={() => setPaymentMode("NetBanking")}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'NetBanking' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Landmark className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">Net Banking</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">All major banks</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'NetBanking' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'NetBanking' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>

              {/* Wallets */}
              <div 
                onClick={() => setPaymentMode("Wallets")}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'Wallets' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Wallet className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">Wallets</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">Paytm, PhonePe, Amazon Pay</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'Wallets' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'Wallets' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>

              {/* EMI Options */}
              <div 
                onClick={() => setPaymentMode("EMI")}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'EMI' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <Percent className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">EMI Options</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">Easy EMI available</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'EMI' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'EMI' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>
            </div>

            {/* Total Payable Summary Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-2">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Payable</span>
                <span className="text-lg font-black text-brand-navy block mt-0.5">₹{Number(selectedTier.price || 0).toLocaleString('en-IN')}</span>
              </div>
              <span className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                View Details
              </span>
            </div>

            {/* Action Pay Button */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button 
                onClick={handleBuyWarranty}
                disabled={buying || !selectedTier}
                className="w-full bg-brand-yellow hover:bg-yellow-400 disabled:opacity-60 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Lock className="h-4.5 w-4.5" />
                {buying ? 'Opening secure checkout…' : `Pay ₹${Number(selectedTier?.price || 0).toLocaleString('en-IN')} Securely`}
              </button>
              {buyError && (
                <p className="text-[11px] font-bold text-red-600 text-center px-2">{buyError}</p>
              )}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                100% Secure Payment
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 7: PAYMENT SUCCESS / CERTIFICATE ISSUANCE */}
        {step === 7 && (
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
              <p className="text-xs text-text-secondary mt-1.5 font-medium">Your appliance is now covered under Nigam Shield.</p>
            </div>

            {/* Glassmorphic Policy Certificate Card */}
            <div className="w-full bg-gradient-to-br from-brand-navy via-[#0C3F85] to-brand-blue rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-brand-yellow text-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    NIGAM SHIELD
                  </span>
                  <h4 className="text-base font-black mt-2.5 truncate w-48">{selectedBrand} {selectedAppliance}</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                  <Shield className="h-5 w-5 text-brand-yellow" />
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Policy Plan:</span>
                  <span className="font-bold text-brand-yellow">{selectedTier?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Policy ID:</span>
                  {/* The real policy reference — a random NCCEW###### was shown
                      here, so the number the customer kept matched no policy. */}
                  <span className="font-mono tracking-wider font-semibold">{boughtOrder?.humanId || boughtOrder?.id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Coverage Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Active
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duration:</span>
                  <span className="font-bold text-white">1 Year Extended Cover</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Valid Till:</span>
                  <span className="font-bold text-white">12 May 2026</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full flex flex-col gap-3 mt-4">
              <button
                onClick={() => setStep(8)}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                View My Warranty
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 8: MY PROTECTION PLANS (VIEW) */}
        {step === 8 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2 text-left">
              <h2 className="text-lg font-black text-brand-navy">My Protection Plans</h2>
              <p className="text-xs text-text-secondary font-semibold">Track all your active plans & coverage</p>
            </div>

            {/* Extended Warranties vs AMC selector */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/40">
              {['Extended Warranties', 'AMC Plans'].map((sec) => {
                const isActive = activePlanSection === sec;
                return (
                  <button
                    key={sec}
                    onClick={() => setActivePlanSection(sec)}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-brand-blue text-white shadow-sm font-black' 
                        : 'text-slate-500 hover:text-slate-800 font-bold'
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>

            {plansLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-3xl p-4.5 flex gap-4 h-36"></div>
                ))}
              </div>
            ) : activePlanSection === 'Extended Warranties' ? (
              <>
                {/* Tab selection row */}
                <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
                  {['Active', 'Expiring Soon', 'Expired'].map((tab) => {
                    const isActive = activeWarrantyTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveWarrantyTab(tab)}
                        className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-white text-[#0B4EA2] shadow-sm font-black' 
                            : 'text-slate-500 hover:text-slate-800 font-bold'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* List based on active tab */}
                {(() => {
                  const filteredWarranties = warranties.filter(w => {
                    const daysLeft = (new Date(w.validTill) - new Date()) / (1000 * 60 * 60 * 24);
                    if (activeWarrantyTab === 'Active') {
                      return w.status === 'Active' && daysLeft > 30;
                    }
                    if (activeWarrantyTab === 'Expiring Soon') {
                      return w.status === 'Active' && daysLeft <= 30 && daysLeft > 0;
                    }
                    if (activeWarrantyTab === 'Expired') {
                      return w.status === 'Expired' || daysLeft <= 0;
                    }
                    return true;
                  });

                  if (filteredWarranties.length === 0) {
                    return (
                      <div className="bg-white border border-slate-150 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                          <Shield className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black text-brand-navy">No Warranties Found</span>
                        <span className="text-[10px] text-slate-400 font-semibold max-w-[200px] leading-relaxed">
                          There are no warranties recorded in this category.
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-4">
                      {filteredWarranties.map((w, idx) => {
                        const img = (() => {
                          const cat = w.category?.toLowerCase() || '';
                          if (cat.includes('tv') || cat.includes('television')) return tvImg;
                          if (cat.includes('ac') || cat.includes('air conditioner') || cat.includes('conditioner')) return splitAcImg;
                          if (cat.includes('fridge') || cat.includes('refrigerator')) return fridgeImg;
                          if (cat.includes('water') || cat.includes('purifier') || cat.includes('ro')) return waterPurifierImg;
                          if (cat.includes('wash') || cat.includes('washing')) return washingImg;
                          return kitchenApplianceImg;
                        })();

                        const orderId = w.humanId || w.id;
                        const validTillStr = new Date(w.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                        return (
                          <div key={w._id || idx} className="bg-white border border-slate-200 rounded-3xl p-4.5 flex gap-4 shadow-sm relative overflow-hidden text-left">
                            <div className="w-18 h-18 bg-slate-50 rounded-2xl flex items-center justify-center p-1 border border-slate-100 flex-shrink-0">
                              <img src={img} alt={w.category} className="w-full h-full object-contain mix-blend-multiply" />
                            </div>
                            <div className="flex-1 flex flex-col gap-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-black text-brand-navy leading-tight truncate">{w.category || 'Appliance'}</h4>
                                <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {w.status}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-bold">{w.brand}</span>
                              <span className="text-[10px] text-brand-blue font-extrabold block">{w.planDurationYears || 1} Year Extended Warranty</span>
                              
                              <div className="flex flex-col gap-0.5 mt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                                <div className="flex justify-between">
                                  <span>Order ID:</span>
                                  <strong className="text-slate-800 font-extrabold">{orderId}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Valid Till:</span>
                                  <strong className="text-slate-800 font-extrabold">{validTillStr}</strong>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => {
                                  setSelectedWarranty({
                                    title: w.category || 'Appliance',
                                    brand: w.brand || 'N/A',
                                    plan: `${w.planDurationYears || 1} Year Extended Warranty`,
                                    orderId,
                                    validTill: validTillStr,
                                    status: w.status,
                                    img,
                                    coverage: [
                                      "Screen panel failures and screen burn-in",
                                      "Internal circuit board (motherboard) errors",
                                      "Remote receiver or sensor issues",
                                      "Power supply and voltage adapter failures",
                                      "Speaker and audio driver malfunctioning"
                                    ],
                                    terms: "Mirrors the manufacturer's original coverage. Does not cover any accidental physical damage, liquid spills, or services performed by unauthorized local workshops."
                                  });
                                  setStep(10);
                                }}
                                className="w-full border border-[#0B4EA2]/30 hover:border-[#0B4EA2]/60 hover:bg-blue-50/20 text-[#0B4EA2] font-black text-xs py-2.5 rounded-xl mt-3 transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            ) : (
              // AMC Plans List
              (() => {
                const activeAmcs = amcs.filter(a => a.status === 'Active');

                if (activeAmcs.length === 0) {
                  return (
                    <div className="bg-white border border-slate-150 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <Wrench className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-black text-brand-navy">No AMC Subscriptions Found</span>
                      <span className="text-[10px] text-slate-400 font-semibold max-w-[200px] leading-relaxed">
                        You don't have any active AMC plans at the moment.
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-4">
                    {activeAmcs.map((a, idx) => {
                      const img = (() => {
                        const cat = a.category?.toLowerCase() || '';
                        if (cat.includes('tv') || cat.includes('television')) return tvImg;
                        if (cat.includes('ac') || cat.includes('air conditioner') || cat.includes('conditioner')) return splitAcImg;
                        if (cat.includes('fridge') || cat.includes('refrigerator')) return fridgeImg;
                        if (cat.includes('water') || cat.includes('purifier') || cat.includes('ro')) return waterPurifierImg;
                        if (cat.includes('wash') || cat.includes('washing')) return washingImg;
                        return kitchenApplianceImg;
                      })();

                      const orderId = a.humanId || a.id;
                      const expiryDateStr = new Date(a.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                      return (
                        <div key={a._id || idx} className="bg-white border border-slate-200 rounded-3xl p-4.5 flex gap-4 shadow-sm relative overflow-hidden text-left">
                          <div className="w-18 h-18 bg-slate-50 rounded-2xl flex items-center justify-center p-1 border border-slate-100 flex-shrink-0">
                            <img src={img} alt={a.category} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-black text-brand-navy leading-tight truncate">{a.category || 'Appliance'}</h4>
                              <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {a.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-bold">{a.brand}</span>
                            <span className="text-[10px] text-brand-blue font-extrabold block">{a.planName || 'Comprehensive AMC Plan'}</span>
                            
                            <div className="flex flex-col gap-0.5 mt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                              <div className="flex justify-between">
                                <span>Order ID:</span>
                                <strong className="text-slate-800 font-extrabold">{orderId}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Valid Till:</span>
                                <strong className="text-slate-800 font-extrabold">{expiryDateStr}</strong>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => {
                                setSelectedAMC({
                                  title: a.category || 'Appliance',
                                  brand: a.brand || 'N/A',
                                  plan: a.planName || 'Comprehensive AMC Plan',
                                  orderId,
                                  validTill: expiryDateStr,
                                  status: a.status,
                                  img,
                                  coverage: [
                                    "RO Membrane and Carbon filter replacement",
                                    "Free Sediment and Pre-filter candle replacement",
                                    "Unlimited breakdown service calls",
                                    "Zero repair labor charges",
                                    "Water TDS check and pH balancing"
                                  ],
                                  terms: "Includes replacement of consumable filters once per contract year. Excludes booster pump motor replacement or physical tank breakage."
                                });
                                setStep(13);
                              }}
                              className="w-full border border-[#0B4EA2]/30 hover:border-[#0B4EA2]/60 hover:bg-blue-50/20 text-[#0B4EA2] font-black text-xs py-2.5 rounded-xl mt-3 transition-colors cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </motion.div>
        )}

        {/* STEP 9: HOW IT WORKS DETAIL PAGE */}
        {step === 9 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 pb-8"
          >
            {/* Top Intro Section */}
            <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] rounded-3xl p-5 border border-blue-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-300/20 rounded-full blur-xl"></div>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-blue-200 shadow-sm flex-shrink-0">
                <ShieldCheck className="h-7 w-7 text-brand-blue animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] bg-brand-navy text-white font-extrabold px-2 py-0.5 rounded-full tracking-wider mb-1 uppercase">
                  Nigam Shield
                </span>
                <h3 className="text-sm font-black text-brand-navy leading-tight mt-1">
                  Extended Warranty Explained
                </h3>
                <p className="text-[10px] text-slate-700 leading-relaxed font-semibold mt-0.5">
                  100% cashless, completely paperless protection for your favorite home appliances.
                </p>
              </div>
            </div>

            {/* Simple 4-Step Process Visual Journey */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">How it works in 4 easy steps</h4>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-5">
                {[
                  {
                    stepNum: "01",
                    title: "Select Appliance & Price Tier",
                    desc: "Choose from our supported appliances and pick the price bracket matching your original purchase invoice.",
                    icon: <Wrench className="h-5 w-5 text-brand-blue" />
                  },
                  {
                    stepNum: "02",
                    title: "Upload Purchase Details",
                    desc: "Provide the brand, model, purchase date, and upload a snap of your purchase invoice or invoice receipt.",
                    icon: <Upload className="h-5 w-5 text-brand-blue" />
                  },
                  {
                    stepNum: "03",
                    title: "Instant Secure Payment",
                    desc: "Pay a low, one-time policy premium seamlessly using UPI apps, card, net banking, or easy e-wallets.",
                    icon: <Wallet className="h-5 w-5 text-brand-blue" />
                  },
                  {
                    stepNum: "04",
                    title: "Enjoy Active Digital Shield",
                    desc: "Your Digital Certificate is issued instantly. Extended coverage starts right after the brand warranty expires.",
                    icon: <Award className="h-5 w-5 text-brand-blue" />
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    {idx !== 3 && (
                      <div className="absolute left-[22px] top-10 bottom-[-24px] w-0.5 bg-slate-100"></div>
                    )}
                    <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm relative z-10">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#0B4EA2] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                          Step {item.stepNum}
                        </span>
                        <h5 className="text-xs font-black text-brand-navy">{item.title}</h5>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-relaxed font-semibold mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Benefits Grid Section */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">Why Choose Nigam Shield?</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    title: "100% Cashless Repairs",
                    desc: "No out-of-pocket expenses when scheduling repair visits.",
                    icon: <Lock className="h-4.5 w-4.5 text-brand-blue" />
                  },
                  {
                    title: "Brand Authorized",
                    desc: "Only certified technicians and genuine original brand parts are used.",
                    icon: <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                  },
                  {
                    title: "Completely Digital",
                    desc: "Zero physical paperwork. File claims and view status on your app.",
                    icon: <Sparkles className="h-4.5 w-4.5 text-yellow-500" />
                  },
                  {
                    title: "Unlimited Claims",
                    desc: "Claim multiple times up to the original invoice value of product.",
                    icon: <ShieldCheck className="h-4.5 w-4.5 text-brand-navy" />
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-2xs">
                      {item.icon}
                    </div>
                    <h5 className="text-[11px] font-extrabold text-brand-navy leading-snug">{item.title}</h5>
                    <p className="text-[9px] text-text-secondary leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Accordion FAQ Segment */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">Frequently Asked Questions</h4>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3.5">
                {[
                  {
                    q: "When does my extended warranty coverage begin?",
                    a: "It starts automatically the exact day after your manufacturer brand warranty expires, ensuring continuous protection without any coverage gap."
                  },
                  {
                    q: "What is covered under Nigam Shield?",
                    a: "It mirrors the original brand manufacturer's warranty. It covers all internal mechanical and electrical defects, spare parts, and labor fees."
                  },
                  {
                    q: "Is there any limit on the number of repairs?",
                    a: "You can raise unlimited claims! The total combined repair value is capped up to the original invoice price of your appliance."
                  }
                ].map((faq, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="text-[10px] font-extrabold text-[#0B4EA2] uppercase tracking-wider">FAQ {idx + 1}</span>
                    <h5 className="text-xs font-black text-brand-navy mt-0.5">{faq.q}</h5>
                    <p className="text-[10px] text-text-secondary leading-relaxed font-semibold mt-1">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA Block */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => setStep(2)}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Got It, Let's Protect
              </button>
            </div>

          </motion.div>
        )}

        {/* STEP 10: WARRANTY DETAILS */}
        {step === 10 && selectedWarranty && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 pb-8"
          >
            {/* Appliance cutout summary card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex gap-4 shadow-sm relative overflow-hidden">
              <div className="w-18 h-18 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-1.5 flex-shrink-0">
                <img src={selectedWarranty.img} alt={selectedWarranty.title} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-black text-brand-navy leading-tight truncate">{selectedWarranty.title}</h3>
                  <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {selectedWarranty.status}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-bold">{selectedWarranty.brand}</span>
                <span className="text-[11px] text-brand-blue font-extrabold block">{selectedWarranty.plan}</span>
              </div>
            </div>

            {/* Policy Specifications Card */}
            <div className="bg-gradient-to-br from-brand-navy to-brand-blue rounded-3xl p-6 text-white shadow-md flex flex-col gap-4 relative overflow-hidden border border-blue-900/10">
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-yellow">Policy Information</span>
                <Shield className="h-5 w-5 text-brand-yellow" />
              </div>
              
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60 font-semibold">Order ID:</span>
                  <strong className="font-mono tracking-wider text-white font-extrabold">{selectedWarranty.orderId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 font-semibold">Coverage Status:</span>
                  <span className="text-green-400 font-bold">100% Covered & Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 font-semibold">Warranty Plan:</span>
                  <span className="font-bold text-white">1 Year Extended Cover</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 font-semibold">Valid Till:</span>
                  <strong className="text-brand-yellow font-extrabold">{selectedWarranty.validTill}</strong>
                </div>
              </div>
            </div>

            {/* "What's Covered" Section */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">What is Covered</h4>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
                {selectedWarranty.coverage.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions Box */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">Terms & Exclusions</h4>
              
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                  {selectedWarranty.terms}
                </p>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={() => {
                  setClaimSubject(selectedWarranty.title);
                  setClaimOrderId(selectedWarranty.orderId);
                  setClaimPlanType("Extended Warranty");
                  setClaimIssue("");
                  setClaimDate("");
                  setClaimTime("10:00 AM - 1:00 PM");
                  goTo(14);
                }}
                className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Raise a Repair Request
              </button>
              
              <button
                onClick={() => {
                  alert("Your warranty certificate will be emailed once the purchase is confirmed.");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3 rounded-xl transition-all text-xs cursor-pointer"
              >
                Download Digital Certificate
              </button>
            </div>

          </motion.div>
        )}

        {/* STEP 11: PRODUCTS & ACCESSORIES PAGE */}
        {step === 11 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-0 -mb-14"
          >
            {/* 1. Shop by Category */}
            <div className="flex flex-col gap-2 px-1">
              <h3 className="text-sm font-black text-[#0B4EA2]">Shop by Category</h3>
              <div className="flex items-center gap-5 overflow-x-auto no-scrollbar pb-2.5 pt-1">
                {[
                  { name: 'For You', isForYou: true },
                  { name: 'AC', appliance: 'Air Conditioner' },
                  { name: 'Washing Machine', appliance: 'Washing Machine' },
                  { name: 'Refrigerator', appliance: 'Refrigerator' },
                  { name: 'TV', appliance: 'Television' },
                  { name: 'RO Water Purifier', appliance: 'Water Purifier' },
                  { name: 'Geyser', appliance: 'Geyser' },
                  { name: 'More', isMore: true }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex-shrink-0 flex flex-col items-center gap-0.5 cursor-pointer group"
                    onClick={() => {
                      if (item.isForYou) {
                        navigate('/dashboard');
                      } else if (item.isMore) {
                        setStep(12);
                      } else {
                        // Appliance and tier live in the URL; goTo writes them there.
                        goTo(3, item.appliance, 0);
                      }
                    }}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      {item.name === 'For You' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
                          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z" opacity="0.5" />
                          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" opacity="0.5" />
                        </svg>
                      )}
                      {item.name === 'AC' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="2" y="6" width="20" height="8" rx="2" />
                          <line x1="6" y1="14" x2="18" y2="14" />
                          <path d="M7 17l1.5 2" />
                          <path d="M12 17v2" />
                          <path d="M17 17l-1.5 2" />
                          <circle cx="18" cy="10" r="1" fill="currentColor" />
                        </svg>
                      )}
                      {item.name === 'Washing Machine' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="5" y="3" width="14" height="18" rx="2" />
                          <circle cx="12" cy="13" r="4" />
                          <circle cx="12" cy="7" r="1" />
                        </svg>
                      )}
                      {item.name === 'Refrigerator' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <line x1="5" y1="10" x2="19" y2="10" />
                          <line x1="9" y1="6" x2="9" y2="8" />
                          <line x1="9" y1="13" x2="9" y2="17" />
                        </svg>
                      )}
                      {item.name === 'TV' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8" />
                          <path d="M12 17v4" />
                        </svg>
                      )}
                      {item.name === 'RO Water Purifier' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
                        </svg>
                      )}
                      {item.name === 'Geyser' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="6" y="2" width="12" height="16" rx="3" />
                          <path d="M9 22v-4" />
                          <path d="M15 22v-4" />
                          <circle cx="12" cy="10" r="2" />
                        </svg>
                      )}
                      {item.isMore && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-[#0B4EA2] text-center leading-tight tracking-tighter group-hover:text-brand-blue transition-colors max-w-[80px]">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Top Brands */}
            <div className="flex flex-col gap-2 px-1">
              <h3 className="text-sm font-black text-[#0B4EA2]">Top Brands</h3>
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar pb-2 pt-0.5">
                {[
                  { name: 'LG', color: 'text-[#C6004E]', logo: 'LG' },
                  { name: 'SAMSUNG', color: 'text-[#034694]', logo: 'SAMSUNG', isText: true },
                  { name: 'Haier', color: 'text-[#005A9C]', logo: 'Haier', isText: true },
                  { name: 'Whirlpool', color: 'text-[#1E306E]', logo: 'Whirlpool', isText: true, special: 'gold-ring' },
                  { name: 'VOLTAS', color: 'text-[#0096C7]', logo: 'VOLTAS', isText: true, italic: true }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex-shrink-0 bg-slate-50/50 border border-slate-150 rounded-2xl px-4 py-3 flex items-center justify-center min-w-[75px] h-12 shadow-sm hover:border-[#0B4EA2]/30 transition-all cursor-pointer"
                  >
                    {item.isText ? (
                      <span className={`text-[10px] font-black tracking-wider ${item.color} ${item.italic ? 'italic font-black' : ''}`}>
                        {item.logo}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-4.5 h-4.5 rounded-full bg-[#C6004E] flex items-center justify-center text-white text-[8px] font-bold">L</div>
                        <span className="text-[10px] font-black text-slate-800">LG</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* View All Button */}
                <button 
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] font-extrabold text-[#0B4EA2] hover:underline cursor-pointer bg-blue-50/50 border border-blue-100 rounded-2xl px-3 py-3 h-12"
                  onClick={() => navigate('/buy-new')}
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 3. Popular Products */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-black text-brand-navy">Popular Products</h3>
                <span className="text-xs font-bold text-[#0B4EA2] hover:underline cursor-pointer">View All</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                {[
                  { name: 'Water Purifier', price: '₹6,999', img: waterPurifierImg, appliance: 'Water Purifier' },
                  { name: 'Desert Cooler', price: '₹7,499', img: kitchenApplianceImg, appliance: 'Cooler' },
                  { name: 'Smart TV', price: '₹10,999', img: tvImg, appliance: 'Television' },
                  { name: 'Split AC', price: '₹24,999', img: splitAcImg, appliance: 'Air Conditioner' },
                  { name: 'Refrigerator', price: '₹15,999', img: fridgeImg, appliance: 'Refrigerator' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex-shrink-0 w-[110px] bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm hover:border-[#0B4EA2]/30 transition-all cursor-pointer snap-start"
                    onClick={() => goTo(3, item.appliance, 0)}
                  >
                    <div className="w-full h-18 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-brand-navy leading-tight truncate">{item.name}</h4>
                      <span className="text-[9px] font-bold text-slate-500 block mt-0.5">From {item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Spare Parts & Accessories */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-black text-brand-navy">Spare Parts & Accessories</h3>
                <span className="text-xs font-bold text-[#0B4EA2] hover:underline cursor-pointer">View All</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                {[
                  { name: 'Pre-Filter Candle', price: '₹199', desc: 'RO Outer Candle', img: roPreFilterImg },
                  { name: 'RO Membrane', price: '₹899', desc: 'High TDS Membrane', img: roMembraneImg },
                  { name: 'Sediment Filter', price: '₹249', desc: 'RO Inner Filter', img: roSedimentImg },
                  { name: 'Carbon Filter', price: '₹299', desc: 'Active Carbon', img: roCarbonImg },
                  { name: 'Post Carbon', price: '₹249', desc: 'Taste Enhancer Filter', img: roPostCarbonImg }
                ].map((item, idx) => {
                  return (
                    <div 
                      key={idx}
                      className="flex-shrink-0 w-[110px] bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm hover:border-[#0B4EA2]/30 transition-all cursor-pointer snap-start"
                      onClick={() => navigate('/buy-new')}
                    >
                      <div className="w-full h-18 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5">
                        <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-brand-navy leading-tight truncate">{item.name}</h4>
                        <span className="text-[8px] text-slate-400 leading-tight block truncate mt-0.5">{item.desc}</span>
                        <span className="text-[9px] font-bold text-slate-500 block mt-1">From {item.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Trust Badges */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-4.5 flex justify-between items-center gap-2 mt-0">
              {[
                { 
                  title: 'Easy & Secure', 
                  sub: 'Payments', 
                  icon: <ShieldCheck className="h-5 w-5 text-brand-blue" /> 
                },
                { 
                  title: 'Expert Support', 
                  sub: '24/7 Assistance', 
                  icon: <Phone className="h-5 w-5 text-brand-blue" /> 
                },
                { 
                  title: 'Hassle Free', 
                  sub: 'Claim Process', 
                  icon: <CheckCircle2 className="h-5 w-5 text-brand-blue" /> 
                }
              ].map((badge, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center text-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-blue-50/70 border border-blue-100 flex items-center justify-center">
                    {badge.icon}
                  </div>
                  <div>
                    <h5 className="text-[9px] font-extrabold text-brand-navy leading-snug">{badge.title}</h5>
                    <p className="text-[8px] text-slate-500 leading-none mt-0.5 font-bold">{badge.sub}</p>
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        )}

        {/* STEP 12: ALL APPLIANCES CATALOG (VIEW MORE) */}
        {step === 12 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-lg font-black text-brand-navy">All Appliances</h2>
              <p className="text-xs text-text-secondary font-semibold">Select an appliance to get extended warranty protection</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Television', img: tvImg, desc: 'TV Extended Cover' },
                { name: 'Refrigerator', img: fridgeImg, desc: 'Fridge Extended Cover' },
                { name: 'Washing Machine', img: washingImg, desc: 'WM Extended Cover' },
                { name: 'Air Conditioner', img: splitAcImg, desc: 'AC Extended Cover' },
                { name: 'Water Purifier', img: waterPurifierImg, desc: 'RO Extended Cover' },
                { name: 'Desert Cooler', img: kitchenApplianceImg, desc: 'Cooler Extended Cover' },
                { name: 'Geyser', img: null, desc: 'Geyser Extended Cover', isGeyser: true },
                { name: 'Microwave Oven', img: null, desc: 'Oven Extended Cover', isMicrowave: true },
                { name: 'Chimney', img: null, desc: 'Chimney Extended Cover', isChimney: true },
                { name: 'Dishwasher', img: null, desc: 'Dishwasher Cover', isDishwasher: true }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => goTo(3, item.name, 0)}
                  className="bg-white border border-slate-200/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-3.5 cursor-pointer hover:border-brand-blue/40 shadow-sm hover:scale-[1.02] transition-all text-center min-h-[135px]"
                >
                  <div className="w-13 h-13 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 overflow-hidden">
                    {item.isGeyser ? (
                      <Zap className="h-7 w-7 text-brand-blue" />
                    ) : item.isMicrowave ? (
                      <Award className="h-7 w-7 text-brand-blue" />
                    ) : item.isChimney ? (
                      <Wind className="h-7 w-7 text-brand-blue" />
                    ) : item.isDishwasher ? (
                      <Wrench className="h-7 w-7 text-brand-blue" />
                    ) : (
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-navy leading-tight">{item.name}</h4>
                    <p className="text-[10px] text-text-secondary mt-1 font-bold">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 13: AMC DETAILS PAGE */}
        {step === 13 && selectedAMC && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 pb-8"
          >
            {/* Appliance cutout summary card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex gap-4 shadow-sm relative overflow-hidden text-left">
              <div className="w-18 h-18 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-1.5 flex-shrink-0">
                <img src={selectedAMC.img} alt={selectedAMC.title} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-black text-brand-navy leading-tight truncate">{selectedAMC.title}</h3>
                  <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {selectedAMC.status}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-bold">{selectedAMC.brand}</span>
                <span className="text-[11px] text-brand-blue font-extrabold block">{selectedAMC.plan}</span>
              </div>
            </div>

            {/* Policy Specifications Card */}
            <div className="bg-gradient-to-br from-brand-navy to-[#059669] rounded-3xl p-6 text-white shadow-md flex flex-col gap-4 relative overflow-hidden border border-emerald-900/10 text-left">
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFD54F]">AMC Plan Information</span>
                <Wrench className="h-5 w-5 text-[#FFD54F]" />
              </div>
              
              <div className="flex flex-col gap-3 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-white/60">Order ID:</span>
                  <strong className="font-mono tracking-wider text-white font-extrabold">{selectedAMC.orderId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Coverage Status:</span>
                  <span className="text-green-400 font-bold">100% Protected & Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">AMC Plan Type:</span>
                  <span className="font-bold text-white">{selectedAMC.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Valid Till:</span>
                  <strong className="text-[#FFD54F] font-extrabold">{selectedAMC.validTill}</strong>
                </div>
              </div>
            </div>

            {/* "What's Covered" Section */}
            <div className="flex flex-col gap-3 text-left">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">What is Covered</h4>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
                {selectedAMC.coverage.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions Box */}
            <div className="flex flex-col gap-3 text-left">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">Terms & Exclusions</h4>
              
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                  {selectedAMC.terms}
                </p>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={() => {
                  setClaimSubject(selectedAMC.title);
                  setClaimOrderId(selectedAMC.orderId);
                  setClaimPlanType("AMC Plan");
                  setClaimIssue("");
                  setClaimDate("");
                  setClaimTime("10:00 AM - 1:00 PM");
                  goTo(14);
                }}
                className="w-full bg-[#059669] hover:bg-emerald-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Schedule AMC Service / Claim
              </button>
              
              <button
                onClick={() => {
                  alert("Your certificate will be emailed once the purchase is confirmed.");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3 rounded-xl transition-all text-xs cursor-pointer"
              >
                Download AMC Certificate
              </button>
            </div>

          </motion.div>
        )}

        {/* STEP 14: FILE A CLAIM FORM */}
        {step === 14 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 pb-8 text-left"
          >
            <div className="px-1 -mt-2">
              <span className="text-[9px] bg-brand-navy text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {claimPlanType} Claim
              </span>
              <h2 className="text-lg font-black text-brand-navy mt-1.5">Raise claim for {claimSubject}</h2>
              <p className="text-xs text-text-secondary font-semibold">Policy Order ID: {claimOrderId}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-5 shadow-sm">
              
              {/* Issue description field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-navy uppercase tracking-wider pl-1 font-bold">Describe the Issue</label>
                <textarea
                  value={claimIssue}
                  onChange={(e) => setClaimIssue(e.target.value)}
                  placeholder="Describe details of the issue you are facing with your appliance..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
                />
              </div>

              {/* Appointment Date field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-navy uppercase tracking-wider pl-1 font-bold">Preferred Appointment Date</label>
                <input
                  type="date"
                  value={claimDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setClaimDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-blue transition-all"
                />
              </div>

              {/* Time slot field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-navy uppercase tracking-wider pl-1 font-bold">Preferred Time Slot</label>
                <select
                  value={claimTime}
                  onChange={(e) => setClaimTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-blue transition-all cursor-pointer"
                >
                  <option value="10:00 AM - 1:00 PM">10:00 AM - 1:00 PM (Morning)</option>
                  <option value="1:00 PM - 4:00 PM">1:00 PM - 4:00 PM (Afternoon)</option>
                  <option value="4:00 PM - 7:00 PM">4:00 PM - 7:00 PM (Evening)</option>
                </select>
              </div>

            </div>

            {/* Action buttons */}
            <div className="w-full flex flex-col gap-3 mt-2">
              <button
                onClick={() => {
                  if (!claimIssue.trim()) {
                    alert("Please describe the issue you are facing.");
                    return;
                  }
                  if (!claimDate) {
                    alert("Please select a preferred date for the appointment.");
                    return;
                  }
                  
                  const generatedId = 'NCC-CLM-' + Math.floor(100000 + Math.random() * 900000);
                  setSubmittedTicketId(generatedId);
                  goTo(15);
                }}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 text-center"
              >
                Submit Claim Request
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 15: CLAIM TICKET SUBMITTED SUCCESS SCREEN */}
        {step === 15 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center p-2 pb-8 gap-6"
          >
            {/* Success Check circle */}
            <div className="w-18 h-18 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-emerald-50">
              <Check className="h-9 w-9 text-emerald-600 stroke-[3px]" />
            </div>

            <div>
              <h2 className="text-xl font-black text-brand-navy leading-tight">Claim Ticket Raised!</h2>
              <p className="text-xs text-text-secondary font-semibold mt-1">Our technician team has been notified.</p>
            </div>

            {/* Claim details card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm w-full flex flex-col gap-3 text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-brand-navy uppercase tracking-wider font-bold">Ticket Summary</span>
                <span className="text-xs font-mono font-black text-[#0B4EA2]">{submittedTicketId}</span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="text-slate-800 font-extrabold">{claimSubject}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plan Type:</span>
                  <span className="text-slate-800 font-extrabold">{claimPlanType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled Date:</span>
                  <span className="text-slate-800 font-extrabold">{claimDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preferred Slot:</span>
                  <span className="text-slate-800 font-extrabold">{claimTime}</span>
                </div>
              </div>
            </div>

            {/* Tracking timeline */}
            <div className="flex flex-col gap-3 w-full text-left">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider px-1">Ticket Tracking Timeline</h4>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-5">
                {[
                  {
                    title: "Claim Ticket Raised",
                    desc: `Request submitted successfully with ID ${submittedTicketId}`,
                    status: "Done",
                    time: "Just Now"
                  },
                  {
                    title: "Technician Assignment",
                    desc: "An NCC certified service expert will be assigned to your ticket",
                    status: "Pending",
                    time: "Within 2 Hours"
                  },
                  {
                    title: "Inspection Scheduled",
                    desc: `Technician visit scheduled at your address on ${claimDate}`,
                    status: "Pending",
                    time: claimTime
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative text-left">
                    {idx !== 2 && (
                      <div className="absolute left-[18px] top-9 bottom-[-24px] w-0.5 bg-slate-100"></div>
                    )}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs relative z-10 border transition-all duration-300 bg-white">
                      {item.status === "Done" ? (
                        <Check className="h-4.5 w-4.5 text-emerald-600 stroke-[3px]" />
                      ) : (
                        <span className="text-xs font-extrabold text-slate-400">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-black text-brand-navy truncate">{item.title}</h5>
                        <span className="text-[9px] font-black text-[#0B4EA2] flex-shrink-0 bg-blue-50/80 px-2 py-0.5 rounded-full">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-relaxed font-semibold mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Back action */}
            <div className="w-full mt-2">
              <button
                onClick={() => {
                  setStep(8);
                }}
                className="w-full bg-brand-navy hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Back to My Protection Plans
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Bottom Tab Bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible lg:hidden">
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
          onClick={() => {
            setShowSuccess(false);
            goTo(1);
          }}
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

export default Buy;
