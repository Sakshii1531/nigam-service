import { useState, useEffect } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Award,
  Check,
  ChevronRight,
  ShoppingCart,
  Wrench,
  Zap,
  MapPin,
  Bell,
  Search,
  Wind,
  Tv,
  ShieldCheck,
  CheckCircle2,
  Phone,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import CustomerBottomNav from "../components/CustomerBottomNav";
import { apiRequest } from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";
import { useLocationContext } from "../context/LocationContext";

// Import premium cutout assets for high-fidelity rendering
import fridgeImg from "../assets/appliance_fridge.png";
import washingImg from "../assets/categories/wasing.png";
import splitAcImg from "../assets/categories/split_ac.png";
import waterPurifierImg from "../assets/categories/water_purifier.png";
import tvImg from "../assets/categories/television.png";
import kitchenApplianceImg from "../assets/categories/kitchen_appliance.png";

// Import realistic spare parts assets
import roPreFilterImg from "../assets/ro_pre_filter_candle.png";
import roMembraneImg from "../assets/ro_membrane.png";
import roSedimentImg from "../assets/ro_sediment_filter.png";
import roCarbonImg from "../assets/ro_carbon_filter.png";
import roPostCarbonImg from "../assets/ro_post_carbon.png";
import { Skeleton, SkeletonCardRow, SkeletonList } from '../components/common/Skeleton';

const Buy = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLocation, openLocationModal } = useLocationContext();

  const pathname = location.pathname;
  const step = pathname.includes('/buy/accessories') ? 11 : pathname.includes('/buy/all-appliances') ? 12 : 1;
  const goTo = (targetStep, appliance) => {
    if (targetStep === 1) navigate('/buy');
    else if (targetStep === 2) navigate('/buy/select-appliance');
    else if (targetStep === 3) navigate(`/buy/select-appliance?category=${encodeURIComponent(appliance || '')}&view=plans`);
    else if (targetStep === 8) navigate('/protection-plans');
    else if (targetStep === 9) navigate('/buy/select-appliance');
    else if (targetStep === 11) navigate('/buy/accessories');
    else if (targetStep === 12) navigate('/buy/all-appliances');
  };
  const setStep = s => goTo(s);
  // Carousel state for Banners
  const [activeBanner, setActiveBanner] = useState(0);
  const [dynamicBrands,setDynamicBrands]=useState([]), [storeCategories,setStoreCategories]=useState([]);
  useEffect(()=>{
    apiRequest('/catalog/brands').then(setDynamicBrands).catch(()=>setDynamicBrands([]));
    apiRequest('/product-categories').then(setStoreCategories).catch(()=>setStoreCategories([]));
  },[]);

  useEffect(() => {
    // Auto-slide every 4 seconds
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const { user } = useAuth();
  // Product-specific brands per appliance
  // Bundled artwork by appliance / part name — an uploaded product image wins.
  const applianceArt = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("tv") || n.includes("television")) return tvImg;
    if (n.includes("refrigerator") || n.includes("fridge")) return fridgeImg;
    if (n.includes("washing")) return washingImg;
    if (/\bac\b/.test(n) || n.includes("conditioner")) return splitAcImg;
    if (n.includes("purifier") || /\bro\b/.test(n)) return waterPurifierImg;
    return kitchenApplianceImg;
  };
  const partArt = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("pre-filter") || n.includes("prefilter")) return roPreFilterImg;
    if (n.includes("membrane")) return roMembraneImg;
    if (n.includes("sediment")) return roSedimentImg;
    if (n.includes("post")) return roPostCarbonImg;
    if (n.includes("carbon")) return roCarbonImg;
    return roPreFilterImg;
  };

  const [ewAppliances, setEwAppliances] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => {
    apiRequest('/warranty-amc/extended-warranty/appliances').then(setEwAppliances).catch(e => { setCatalogError(e.message); setEwAppliances([]); });
  }, []);
  // Store products (Super Admin → NCC Products), one request per section so
  // each shows as soon as it lands. Spare parts are asked for by category —
  // filtering the first 100 products on the device dropped them once the
  // store held more than 100.
  const [popularList, setPopularList] = useState(null); // null = still loading
  const [sparePartList, setSparePartList] = useState(null);
  useEffect(() => {
    apiRequest("/products?limit=30&sort=-rating")
      .then((res) => setPopularList(Array.isArray(res) ? res : []))
      .catch(() => setPopularList([]));
    apiRequest("/products?category=Spare%20Parts&limit=20")
      .then((res) => setSparePartList(Array.isArray(res) ? res : []))
      .catch(() => setSparePartList([]));
  }, []);
  const popularLoading = popularList === null;
  const sparePartsLoading = sparePartList === null;
  const popularProducts = (popularList || []).filter((p) => p.category !== "Spare Parts").slice(0, 8);
  const spareParts = sparePartList || [];


  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 lg:pb-8 relative">
      {/* Header section with back navigation for sub-steps — mobile only */}
      {step > 1 && step !== 7 && step !== 15 && (
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-border-color shadow-sm sticky top-0 z-30 lg:hidden">
          <button
            onClick={() => {
              navigate(step === 12 || step === 11 ? '/buy' : -1);
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer border border-slate-100">
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </button>

          <h1 className="text-base font-extrabold text-brand-navy text-center flex-1 pr-9">
            {step === 11 && "Products & Accessories"}
            {step === 12 && "All Appliances"}
          </h1>
        </div>
      )}

      {/* Dynamic Content Pages */}
      {catalogError && <p role="alert" className="mx-6 mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{catalogError}</p>}
      <div className="flex-1 p-3.5 sm:p-6 md:px-8 flex flex-col gap-4 sm:gap-6 md:gap-8 overflow-y-auto max-w-screen-2xl mx-auto w-full">
        {/* STEP 1: BUY SECTION - HOME */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 sm:gap-5">
            {/* Location & Profile Bar */}
            <div className="flex justify-between items-center -mt-1 sm:-mt-2">
              <button
                type="button"
                onClick={openLocationModal}
                className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer group focus:outline-none"
                aria-label="Change location">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue shrink-0 group-hover:bg-blue-100 transition-colors">
                  <MapPin className="h-4 w-4 text-brand-blue shrink-0" />
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block font-semibold leading-tight">
                    Your Location
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-brand-blue transition-colors truncate max-w-42.5 sm:max-w-55">
                      {currentLocation?.area
                        ? `${currentLocation.area}, ${currentLocation.city}`
                        : currentLocation?.city || "Select Location"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-text-secondary group-hover:text-brand-blue group-hover:translate-y-0.5 transition-all shrink-0" />
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate("/notifications")}
                  className="w-8.5 h-8.5 sm:w-9 sm:h-9 bg-white hover:bg-slate-50 rounded-full relative flex items-center justify-center border border-slate-200 shadow-2xs cursor-pointer">
                  <Bell className="h-4 w-4 text-text-primary" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div
                  onClick={() => navigate("/profile")}
                  className="w-8.5 h-8.5 sm:w-9 sm:h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold cursor-pointer hover:bg-blue-800 transition-colors shadow-2xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search appliances, protection plans, warranties..."
                className="w-full pl-9.5 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200/90 rounded-xl focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all text-xs shadow-2xs placeholder:text-slate-400"
              />
            </div>

            {/* Service Type Cards — bento layout: NCC Shield is a wide hero
                banner, with NCC AMC and Buy New as two equal cells beneath
                it. This is a fixed grid (no horizontal scroll) at every
                breakpoint, so "Buy New" is always on screen without
                scrolling instead of being the 3rd card cut off in a
                horizontal-scroll row on narrow phones. */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {/* Hero cell: NCC Shield Extended Warranty */}
              <div
                onClick={() => setStep(2)}
                className="bg-white border border-slate-200/80 rounded-[20px] sm:rounded-[22px] p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group">
                <div className="shrink-0 relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center filter drop-shadow-[0_3px_6px_rgba(13,71,161,0.25)] group-hover:scale-105 transition-transform duration-300">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient
                        id="bevelGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%">
                        <stop offset="0%" stopColor="#1E88E5" />
                        <stop offset="50%" stopColor="#1565C0" />
                        <stop offset="50%" stopColor="#0B4EA2" />
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
                      textAnchor="middle">
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
                      letterSpacing="0.6">
                      SHIELD
                    </text>
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-xs sm:text-sm font-black text-[#0A2D6E] leading-snug">
                    NCC Shield Extended Warranty
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold leading-normal mt-0.5">
                    Extra protection for longer peace of mind
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-2xs shrink-0 group-hover:bg-slate-50 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 text-[#0B4EA2] stroke-[3]" />
                </div>
              </div>

              {/* Two compact cells beneath the hero: NCC AMC Plans | Buy New */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {[
                  {
                    name: "NCC AMC\nPlans",
                    desc: "Regular care for\nreliable performance",
                    icon: (
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center filter drop-shadow-[0_3px_6px_rgba(13,71,161,0.25)]">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <defs>
                            <linearGradient
                              id="bevelGrad2"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="0%">
                              <stop offset="0%" stopColor="#1E88E5" />
                              <stop offset="50%" stopColor="#1565C0" />
                              <stop offset="50%" stopColor="#0B4EA2" />
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
                            textAnchor="middle">
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
                            letterSpacing="0.6">
                            AMC
                          </text>
                        </svg>
                      </div>
                    ),
                    onClick: () => navigate("/buy/amc/select-appliance"),
                  },
                  {
                    name: "Buy\nNew",
                    desc: "Shop latest\nappliances & more",
                    icon: (
                      <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[#0B4EA2]">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-8 h-8 sm:w-9 sm:h-9 stroke-[#0B4EA2] stroke-[5.5] fill-none">
                          <circle cx="35" cy="80" r="5" fill="#0B4EA2" />
                          <circle cx="75" cy="80" r="5" fill="#0B4EA2" />
                          <path
                            d="M15 20 H30 L45 60 H80 L90 30 H35"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ),
                    onClick: () => navigate("/buy-new"),
                  },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    onClick={card.onClick}
                    className="bg-white border border-slate-200/80 rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 flex flex-col items-center text-center justify-between shadow-2xs hover:shadow-md transition-all cursor-pointer min-h-32 sm:min-h-35 group">
                    <div className="flex flex-col items-center w-full">
                      <div className="group-hover:scale-105 transition-transform duration-300">
                        {card.icon}
                      </div>
                      <h3 className="text-[11px] sm:text-xs font-black text-[#0A2D6E] leading-snug mt-2 mb-0.5 whitespace-pre-line">
                        {card.name}
                      </h3>
                      <p className="text-[8.5px] sm:text-[9px] text-slate-500 font-semibold leading-normal line-clamp-2 px-0.5 whitespace-pre-line">
                        {card.desc}
                      </p>
                    </div>
                    <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-2xs mt-2 group-hover:bg-slate-50 transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 text-[#0B4EA2] stroke-[3]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotional Banners Carousel */}
            <div className="relative w-full overflow-hidden rounded-2xl group shadow-2xs">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeBanner * 100}%)` }}>
                {/* Banner 1: Extended Warranty */}
                <div className="w-full shrink-0 px-0.5">
                  <div
                    onClick={() => setStep(2)}
                    className="bg-linear-to-br from-[#E8F1FF] to-[#C9DEFF] rounded-2xl p-3.5 sm:p-4 border border-blue-100 shadow-2xs flex items-center gap-3 sm:gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-33.75 sm:min-h-35.5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-300/20 rounded-full blur-2xl"></div>

                    {/* Left shield illustration */}
                    <div className="w-17 h-17 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-linear-to-b from-brand-blue/90 to-[#0B4EA2] shadow-sm">
                      <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-[11px] sm:text-xs font-black text-brand-navy leading-tight mb-1.5 sm:mb-2">
                        Protect appliances with Extended Warranty
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2">
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Compare Coverage
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Available Plans
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Track Requests
                        </li>
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStep(2);
                        }}
                        className="bg-brand-blue hover:bg-blue-800 text-white text-[8.5px] sm:text-[9px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer">
                        Explore Plans
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner 2: Buy New Products */}
                <div className="w-full shrink-0 px-0.5">
                  <div
                    onClick={() => navigate("/buy-new")}
                    className="bg-linear-to-br from-[#FFF5E6] to-[#FFE6C9] rounded-2xl p-3.5 sm:p-4 border border-amber-100 shadow-2xs flex items-center gap-3 sm:gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-33.75 sm:min-h-35.5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-300/20 rounded-full blur-2xl"></div>

                    {/* Left shopping cart illustration */}
                    <div className="w-17 h-17 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-linear-to-b from-[#F59E0B] to-[#D97706] shadow-sm">
                      <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-[11px] sm:text-xs font-black text-brand-navy leading-tight mb-1.5 sm:mb-2">
                        Shop Latest Appliances & Electronics
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2">
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Free Doorstep Installation
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          View product warranty
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          No Cost EMI Options
                        </li>
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/buy-new");
                        }}
                        className="bg-[#D97706] hover:bg-amber-700 text-white text-[8.5px] sm:text-[9px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer">
                        Shop New
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner 3: NCC AMC Plans */}
                <div className="w-full shrink-0 px-0.5">
                  <div
                    onClick={() => navigate("/buy/amc/select-appliance")}
                    className="bg-linear-to-br from-[#E6F4EA] to-[#C9EAD2] rounded-2xl p-3.5 sm:p-4 border border-emerald-100 shadow-2xs flex items-center gap-3 sm:gap-4 relative overflow-hidden cursor-pointer hover:shadow-md transition-all text-left min-h-33.75 sm:min-h-35.5">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-300/20 rounded-full blur-2xl"></div>

                    {/* Left check-shield illustration */}
                    <div className="w-17 h-17 sm:w-20 sm:h-20 shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden bg-linear-to-b from-[#10B981] to-[#059669] shadow-sm">
                      <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg z-10" />
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col items-start relative z-10">
                      <h3 className="text-[11px] sm:text-xs font-black text-brand-navy leading-tight mb-1.5 sm:mb-2">
                        NCC AMC Maintenance & Care Plans
                      </h3>
                      <ul className="flex flex-col gap-0.5 mb-2">
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Compare visit allowances
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          Review included benefits
                        </li>
                        <li className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-semibold text-slate-700">
                          <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />{" "}
                          View terms before you buy
                        </li>
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/buy/amc/select-appliance");
                        }}
                        className="bg-[#059669] hover:bg-emerald-700 text-white text-[8.5px] sm:text-[9px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer">
                        Explore AMC
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots indicator at the bottom center of the carousel wrapper */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBanner(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeBanner === idx
                        ? "bg-brand-navy w-3"
                        : "bg-slate-400/40 w-1.5"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Shop by Category */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-sm font-black text-brand-navy">
                  Shop by Category
                </h3>
                <button
                  onClick={() => navigate("/buy-new")}
                  className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                  View All
                </button>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible">
                {storeCategories.map(c=>({name:c.name,appliance:c.name,img:applianceArt(c.name)})).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      // This used to route into the Extended Warranty tier
                      // picker (/buy/select-tier) regardless of what the
                      // customer actually tapped — a category tile that says
                      // "Shop by Category" should shop the real product
                      // catalog for that category, the same route AllBrands
                      // and BuyNew use.
                      navigate(
                        `/buy-new/products/${encodeURIComponent(item.appliance)}`,
                      );
                    }}
                    className="shrink-0 w-19 sm:w-24 md:w-auto md:flex-shrink bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 md:p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:border-brand-blue/40 hover:shadow-md transition-all text-center min-h-21.5 md:min-h-30">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-slate-700 leading-tight block text-center truncate w-full px-0.5">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buy Brand New */}
            <div className="flex flex-col gap-2 sm:gap-2.5">
              <div className="flex justify-between items-center px-0.5">
                <h3 className="text-xs sm:text-sm font-black text-brand-navy">
                  Buy Brand New
                </h3>
                <button 
                  onClick={() => navigate('/buy-new')}
                  className="text-xs font-bold text-brand-blue hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-0.5">
                  {dynamicBrands.map((brand, idx) => (
                    <div
                      key={brand.name || idx}
                      onClick={() => navigate(`/buy-new?brand=${encodeURIComponent(brand.name)}`)}
                      className="shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-brand-blue/40 rounded-xl cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center"
                    >
                      <span
                        className="text-[10px] sm:text-[11px] font-black tracking-wide whitespace-nowrap"
                        style={{ color: brand.color || '#0D47A1' }}>
                        {brand.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 11: PRODUCTS & ACCESSORIES PAGE */}
        {step === 11 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-0 -mb-14">
            {/* 1. Shop by Category */}
            <div className="flex flex-col gap-2 px-1">
              <h3 className="text-sm font-black text-[#0B4EA2]">
                Shop by Category
              </h3>
              <div className="flex items-center gap-5 overflow-x-auto no-scrollbar pb-2.5 pt-1">
                {[{name:'For You',isForYou:true},...storeCategories.map(c=>({name:c.name,appliance:c.name})),{name:'More',isMore:true}].map((item, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 flex flex-col items-center gap-0.5 cursor-pointer group"
                    onClick={() => {
                      if (item.isForYou) {
                        navigate("/dashboard");
                      } else if (item.isMore) {
                        setStep(12);
                      } else {
                        // Appliance and tier live in the URL; goTo writes them there.
                        goTo(3, item.appliance, 0);
                      }
                    }}>
                    <div className="w-7 h-7 flex items-center justify-center">
                      {item.name === "For You" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
                          <path
                            d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"
                            opacity="0.5"
                          />
                          <path
                            d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"
                            opacity="0.5"
                          />
                        </svg>
                      )}
                      {item.name === "AC" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="2" y="6" width="20" height="8" rx="2" />
                          <line x1="6" y1="14" x2="18" y2="14" />
                          <path d="M7 17l1.5 2" />
                          <path d="M12 17v2" />
                          <path d="M17 17l-1.5 2" />
                          <circle cx="18" cy="10" r="1" fill="currentColor" />
                        </svg>
                      )}
                      {item.name === "Washing Machine" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="5" y="3" width="14" height="18" rx="2" />
                          <circle cx="12" cy="13" r="4" />
                          <circle cx="12" cy="7" r="1" />
                        </svg>
                      )}
                      {item.name === "Refrigerator" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <line x1="5" y1="10" x2="19" y2="10" />
                          <line x1="9" y1="6" x2="9" y2="8" />
                          <line x1="9" y1="13" x2="9" y2="17" />
                        </svg>
                      )}
                      {item.name === "TV" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8" />
                          <path d="M12 17v4" />
                        </svg>
                      )}
                      {item.name === "RO Water Purifier" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
                        </svg>
                      )}
                      {item.name === "Geyser" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="6" y="2" width="12" height="16" rx="3" />
                          <path d="M9 22v-4" />
                          <path d="M15 22v-4" />
                          <circle cx="12" cy="10" r="2" />
                        </svg>
                      )}
                      {item.isMore && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-7 h-7 text-[#0B4EA2]">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-[#0B4EA2] text-center leading-tight tracking-tighter group-hover:text-brand-blue transition-colors max-w-20">
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
                {dynamicBrands.map(brand => (
                  <div key={brand.id || brand.name} className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-blue-900">
                    {brand.name}
                  </div>
                ))}

                {/* View All Button */}
                <button
                  className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold text-[#0B4EA2] hover:underline cursor-pointer bg-blue-50/50 border border-blue-100 rounded-2xl px-3 py-3 h-12"
                  onClick={() => navigate("/buy-new")}>
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* 3. Popular Products */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-black text-brand-navy">
                  Popular Products
                </h3>
                <span className="text-xs font-bold text-[#0B4EA2] hover:underline cursor-pointer">
                  View All
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                {popularLoading && <SkeletonCardRow count={4} />}
                {!popularLoading && popularProducts.length === 0 && (
                  <p className="text-xs font-semibold text-slate-500 px-1">No products in the store yet.</p>
                )}
                {popularProducts.map((product) => (
                  <div
                    key={product.id}
                    className="shrink-0 w-27.5 bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm hover:border-[#0B4EA2] transition-all cursor-pointer"
                    onClick={() => navigate(`/buy-new/details/${encodeURIComponent(product.category)}/${encodeURIComponent(product.name)}`)}>
                    <div className="w-full h-18 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5">
                      <img
                        src={product.imageUrl || product.images?.[0] || applianceArt(product.category)}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-brand-navy leading-tight truncate">
                        {product.name}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-500 block mt-0.5">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Spare Parts & Accessories */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-black text-brand-navy">
                  Spare Parts & Accessories
                </h3>
                <span className="text-xs font-bold text-[#0B4EA2] hover:underline cursor-pointer">
                  View All
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                {sparePartsLoading && <SkeletonCardRow count={4} />}
                {!sparePartsLoading && spareParts.length === 0 && (
                  <p className="text-xs font-semibold text-slate-500 px-1">No spare parts in the store yet.</p>
                )}
                {spareParts.map((p) => ({
                  name: p.name,
                  desc: (p.specs || [])[0] || "",
                  price: `₹${Number(p.price).toLocaleString("en-IN")}`,
                  img: p.imageUrl || p.images?.[0] || partArt(p.name),
                })).map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      className="shrink-0 w-27.5 bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm hover:border-[#0B4EA2]/30 transition-all cursor-pointer snap-start"
                      onClick={() => navigate("/buy-new")}>
                      <div className="w-full h-18 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5">
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-brand-navy leading-tight truncate">
                          {item.name}
                        </h4>
                        <span className="text-[8px] text-slate-400 leading-tight block truncate mt-0.5">
                          {item.desc}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 block mt-1">
                          From {item.price}
                        </span>
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
                  title: "Easy & Secure",
                  sub: "Payments",
                  icon: <ShieldCheck className="h-5 w-5 text-brand-blue" />,
                },
                {
                  title: "Available Plans",
                  sub: "24/7 Assistance",
                  icon: <Phone className="h-5 w-5 text-brand-blue" />,
                },
                {
                  title: "Hassle Free",
                  sub: "Claim Process",
                  icon: <CheckCircle2 className="h-5 w-5 text-brand-blue" />,
                },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center text-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-blue-50/70 border border-blue-100 flex items-center justify-center">
                    {badge.icon}
                  </div>
                  <div>
                    <h5 className="text-[9px] font-extrabold text-brand-navy leading-snug">
                      {badge.title}
                    </h5>
                    <p className="text-[8px] text-slate-500 leading-none mt-0.5 font-bold">
                      {badge.sub}
                    </p>
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
            className="flex flex-col gap-5 pb-8">
            <div className="px-1 -mt-2">
              <h2 className="text-lg font-black text-brand-navy">
                All Appliances
              </h2>
              <p className="text-xs text-text-secondary font-semibold">
                Select an appliance to get extended warranty protection
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {ewAppliances === null && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36" rounded="rounded-2xl" />)}
              {(ewAppliances || []).map((a) => ({
                key: a.appliance,
                name: a.name,
                img: a.imageUrl || applianceArt(a.name),
                desc: `From ₹${Number(a.fromPrice).toLocaleString("en-IN")}`,
              })).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => goTo(3, item.key, 0)}
                  className="bg-white border border-slate-200/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-3.5 cursor-pointer hover:border-brand-blue/40 shadow-sm hover:scale-[1.02] transition-all text-center min-h-33.75">
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
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-navy leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-text-secondary mt-1 font-bold">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Sticky Bottom Tab Bar — mobile only */}
      <CustomerBottomNav
        onBuyClick={() => {
          goTo(1);
        }}
      />
    </div>
  );
};

export default Buy;
