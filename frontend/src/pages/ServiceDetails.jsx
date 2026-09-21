import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Star, ChevronRight, Menu, X, CheckCircle2 } from 'lucide-react';

// Assets
import electricianBanner from '../assets/electrician_banner.png';
import plumbingBanner from '../assets/plumbing_banner.png';
import acBanner from '../assets/ac_service_banner.png';
import heroService from '../assets/hero_service.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import acIconImg from '../assets/categories/ac.png';
import washingIconImg from '../assets/categories/wasing.png';
import cleaningIconImg from '../assets/categories/cleaning.png';
import tvImg from '../assets/categories/television.png';
import roImg from '../assets/categories/water_purifier.png';
import serviceProviderImg1 from '../assets/working/Gemini_Generated_Image_h5cyvch5cyvch5cy-removebg-preview.png';
import { apiRequest } from '../lib/apiClient';

// ─── Service config ───────────────────────────────────────────────────────────
// ─── Service config ───────────────────────────────────────────────────────────
const SERVICE_CONFIG = {
  'Carpenter': {
    tagline: 'Precision Woodwork',
    subtitle: 'Experienced Carpenters for\nRepairs, Assembly & Mounting',
    bannerImg: heroService,
    subServices: [
      { name: 'Book a consultation', img: heroService },
      { name: 'Furniture Assembly', img: heroService },
      { name: 'Door & Lock Repair', img: heroService },
      { name: 'Drill & Hang', img: heroService },
      { name: 'Custom Woodwork', img: heroService },
    ],
  },
  'Electrician': {
    tagline: 'Power Back On',
    subtitle: 'Certified Electricians for\nSafe & Reliable Repairs',
    bannerImg: electricianBanner,
    subServices: [
      { name: 'Book a consultation', img: electricianImg },
      { name: 'Installation Services', img: acIconImg },
      { name: 'Repair & Maintenance', img: plumberImg },
      { name: 'UPS Inverter', img: tvImg },
      { name: 'Water Motor', img: roImg },
    ],
  },
  'Plumber': {
    tagline: 'Leak Fixed Fast',
    subtitle: 'Expert Plumbers at\nYour Doorstep in 60 min',
    bannerImg: plumbingBanner,
    subServices: [
      { name: 'Book a consultation', img: plumberImg },
      { name: 'Pipe Leakage', img: acIconImg },
      { name: 'Tap & Fitting', img: electricianImg },
      { name: 'Drainage', img: washingIconImg },
      { name: 'Geyser Install', img: roImg },
    ],
  },
  'AC Repair': {
    tagline: 'Cool Again Today',
    subtitle: 'Certified AC ServiceProviders\nFor All Brands',
    bannerImg: acBanner,
    subServices: [
      { name: 'Book a consultation', img: acIconImg },
      { name: 'AC Installation', img: electricianImg },
      { name: 'Gas Refilling', img: plumberImg },
      { name: 'Deep Cleaning', img: cleaningIconImg },
      { name: 'AMC Plan', img: roImg },
    ],
  },
};

const DEFAULT_CONFIG = {
  tagline: 'Expert Help at Your Door',
  subtitle: 'Verified Professionals\nFor Every Home Need',
  bannerImg: heroService,
  subServices: [
    { name: 'Book a consultation', img: electricianImg },
    { name: 'Installation', img: acIconImg },
    { name: 'Repair', img: plumberImg },
    { name: 'Maintenance', img: washingIconImg },
    { name: 'AMC Plan', img: roImg },
  ],
};

const CARPENTER_CATALOG = [
  {
    section: 'Book a consultation',
    items: [
      {
        name: 'Carpentry Consultation & Inspection',
        price: '₹149',
        time: '1 hrs',
        bullets: [
          'Expert carpenter inspection for custom furniture, woodwork repair, or mounting.',
          'Consultation fee adjusted against final service invoice.',
        ],
        img: heroService,
      },
    ],
  },
  {
    section: 'Furniture Assembly & Repair',
    items: [
      {
        name: 'Bed & Wardrobe Assembly / Repair',
        price: '₹449',
        time: '1-2 hrs',
        bullets: [
          'Assembly and dismantle of king, queen, or single beds and wardrobes.',
          'Hinge adjustment, door alignment, and tight fitting.',
        ],
        img: heroService,
      },
      {
        name: 'Table & Chair Repair',
        price: '₹249',
        time: '1 hrs',
        bullets: [
          'Fix loose wooden legs, wobbly dining chairs, and squeaky joints.',
          'High-strength adhesive and industrial screws included.',
        ],
        img: heroService,
      },
    ],
  },
  {
    section: 'Door, Window & Lock Repair',
    items: [
      {
        name: 'Door Lock Installation & Repair',
        price: '₹299',
        time: '1 hrs',
        bullets: [
          'Installation of mortise lock, handle set, cylindrical lock, or latch fix.',
          'Ensures smooth latching and deadbolt alignment.',
        ],
        img: heroService,
      },
      {
        name: 'Window & Mesh Fitting',
        price: '₹199',
        time: '45 mins',
        bullets: [
          'Fix sliding window channels, wooden shutters, and mosquito mesh.',
          'Smooth gliding guaranteed.',
        ],
        img: heroService,
      },
    ],
  },
  {
    section: 'Drill & Wall Hanging',
    items: [
      {
        name: 'Wall Hangings & Mirror Mounting',
        price: '₹149',
        time: '30 mins',
        bullets: [
          'Drill and hang wall art, mirrors, clocks, bathroom accessories, and shelves.',
          'Clean, precise drilling with zero wall chipping.',
        ],
        img: heroService,
      },
    ],
  },
];

const PLUMBER_CATALOG = [
  {
    section: 'Book a consultation',
    items: [
      {
        name: 'Plumber Inspection & Diagnosis',
        price: '₹149',
        time: '1 hrs',
        bullets: [
          'Complete diagnosis for concealed leakage, low water pressure, and pipe issues.',
          'Inspection charge waived off on repair.',
        ],
        img: plumberImg,
      },
    ],
  },
  {
    section: 'Taps & Showers',
    items: [
      {
        name: 'Tap & Mixer Repair / Replacement',
        price: '₹199',
        time: '45 mins',
        bullets: [
          'Fix continuous dripping, spindle replacement, and angle valve installation.',
          'Compatible with Jaguar, Kohler, Hindware, and all major brands.',
        ],
        img: plumberImg,
      },
      {
        name: 'Shower & Diverter Servicing',
        price: '₹299',
        time: '1 hrs',
        bullets: [
          'Unclog shower nozzles, fix diverter cartridge, and clean hard water deposits.',
        ],
        img: plumberImg,
      },
    ],
  },
  {
    section: 'Pipes & Drainage',
    items: [
      {
        name: 'Drainage Blockage Clearing',
        price: '₹299',
        time: '1 hrs',
        bullets: [
          'Unclog kitchen sink, bathroom floor trap, and balcony drainage.',
          'High-pressure rotary snake tool used for deep clearance.',
        ],
        img: plumberImg,
      },
      {
        name: 'Pipeline Leakage Repair',
        price: '₹349',
        time: '1-2 hrs',
        bullets: [
          'Repair damaged CPVC/UPVC pipes and solvent joint sealing.',
        ],
        img: plumberImg,
      },
    ],
  },
];

const ELECTRICIAN_CATALOG = [
  {
    section: 'Book a consultation',
    items: [
      {
        name: 'Electrician Consultancy',
        price: '₹149',
        time: '1 hrs',
        bullets: [
          'Not sure where to start? Book a consultation to diagnose tripping or wiring.',
          'Consultation fee adjusted against final service invoice.',
        ],
        img: serviceProviderImg1,
      },
    ],
  },
  {
    section: 'Installation Services',
    items: [
      {
        name: 'Socket & Switchboard Repair/Installation',
        price: '₹199',
        time: '45 mins',
        bullets: [
          'Switchboard installation, modular socket repair & replacement.',
          'Safe, spark-free testing with genuine parts.',
        ],
        img: tvImg,
      },
      {
        name: 'Fan Installation & Repair',
        price: '₹249',
        time: '1 hrs',
        bullets: [
          'Ceiling fan, exhaust fan, and wall fan installation.',
          'Fan repair including capacitor replacement and blade alignment.',
        ],
        img: acIconImg,
      },
    ],
  },
  {
    section: 'Repair & Maintenance',
    items: [
      {
        name: 'Wiring & Short Circuit Repair',
        price: '₹399',
        time: '1-2 hrs',
        bullets: [
          'Diagnose and fix faulty wiring, trips, and short circuits.',
          'Safe, insulated tools and certified electricians.',
        ],
        img: electricianImg,
      },
      {
        name: 'MCB / DB Box Repair',
        price: '₹349',
        time: '1 hrs',
        bullets: [
          'MCB replacement and distribution box servicing.',
          'All ratings (6A to 63A) supported with genuine ISI parts.',
        ],
        img: plumberImg,
      },
    ],
  },
];

const AC_CATALOG = [
  {
    section: 'AC Service & Cleaning',
    items: [
      {
        name: 'Foam Jet AC Deep Service',
        price: '₹599',
        time: '1 hrs',
        bullets: [
          'High-pressure foam-jet washing of cooling coils, blower fan, and outdoor unit.',
          'Eliminates foul smell and boosts cooling efficiency by 2x.',
        ],
        img: acIconImg,
      },
      {
        name: 'Anti-Bacterial AC Cleaning',
        price: '₹449',
        time: '45 mins',
        bullets: [
          'Antimicrobial spray on indoor filters, drain tray, and evaporator coils.',
        ],
        img: acIconImg,
      },
    ],
  },
  {
    section: 'Repair & Gas Refill',
    items: [
      {
        name: 'AC Gas Leak Check & Refill',
        price: '₹1,899',
        time: '1-2 hrs',
        bullets: [
          'Nitrogen pressure leak detection, copper brazing fix, and complete gas recharge.',
          'Includes 60-day cooling warranty.',
        ],
        img: acIconImg,
      },
      {
        name: 'AC Diagnosis & Checkup',
        price: '₹249',
        time: '45 mins',
        bullets: [
          'Comprehensive inspection of PCB, compressor capacitor, thermostat, and motor.',
        ],
        img: acIconImg,
      },
    ],
  },
];

const CLEANING_CATALOG = [
  {
    section: 'Deep Cleaning',
    items: [
      {
        name: 'Complete Full Home Deep Cleaning',
        price: '₹2,499',
        time: '4-5 hrs',
        bullets: [
          'Deep scrubbing and sanitization of bedrooms, living room, balconies, and windows.',
          'Hospital-grade eco-friendly chemicals used.',
        ],
        img: cleaningIconImg,
      },
      {
        name: 'Bathroom Deep Cleaning',
        price: '₹449',
        time: '1 hrs',
        bullets: [
          'Tile stain removal, hard water descaling, mirror shine, and toilet bowl sanitization.',
        ],
        img: cleaningIconImg,
      },
      {
        name: 'Kitchen Deep Cleaning',
        price: '₹899',
        time: '2 hrs',
        bullets: [
          'Oil and grease removal from slab, tiles, stove, and chimney exteriors.',
        ],
        img: cleaningIconImg,
      },
    ],
  },
];

const getDynamicCatalog = (name) => [
  {
    section: 'Book a consultation',
    items: [
      {
        name: `${name} Consultation & Checkup`,
        price: '₹149',
        time: '1 hrs',
        bullets: [
          `Expert inspection and diagnosis for ${name} by certified technicians.`,
          'Consultation charge is adjusted against your final service invoice.',
        ],
        img: heroService,
      },
    ],
  },
  {
    section: 'Standard Service & Repair',
    items: [
      {
        name: `Standard ${name} Service`,
        price: '₹299',
        time: '1 hrs',
        bullets: [
          `Comprehensive repair, servicing, and inspection for ${name}.`,
          'Includes genuine replacement parts and workmanship warranty.',
        ],
        img: heroService,
      },
      {
        name: `Advanced ${name} Installation & Tune-up`,
        price: '₹499',
        time: '1-2 hrs',
        bullets: [
          `Complete setup, alignment, and multi-point safety testing for ${name}.`,
          'Guaranteed zero hassle service with sanitized tools.',
        ],
        img: heroService,
      },
    ],
  },
];

// ─── Catalog Card sub-component (uses quantity state from parent) ─────────────
const CatalogCard = ({ item, onViewDetails, quantity = 0, onQuantityChange }) => {
  return (
    <div className="py-3.5 sm:py-4 border-b border-slate-100">
      {/* Top row */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs min-[360px]:text-[13px] font-extrabold text-slate-900 leading-snug">{item.name}</p>
          {item.rating ? (
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] min-[360px]:text-[11px] font-bold text-slate-800">{item.rating}</span>
              {item.reviews ? <span className="text-[9px] text-slate-400">({item.reviews} reviews)</span> : null}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5 min-[360px]:gap-2 mt-1">
            <span className="text-[11px] min-[360px]:text-[12px] font-extrabold text-slate-900">{item.price}</span>
            <span className="text-slate-300 text-xs">•</span>
            <span className="text-[10px] min-[360px]:text-[11px] text-slate-500">{item.time}</span>
          </div>
        </div>
        {/* Right image + Add / Numbering Selector */}
        <div className="flex-shrink-0 relative pb-3.5 sm:pb-4">
          <div className="w-16 h-14 min-[360px]:w-20 min-[360px]:h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
            <img src={item.img} alt={item.name} className="w-full h-full object-contain p-1" />
          </div>
          {/* Button pinned to bottom of image, overlapping slightly */}
          <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-16 min-[360px]:w-20">
            {quantity > 0 ? (
              <div className="w-16 min-[360px]:w-20 flex items-center justify-between border border-brand-blue bg-white rounded-xl text-[11px] min-[360px]:text-[12px] font-extrabold overflow-hidden h-7 min-[360px]:h-8 shadow-xs">
                <button
                  onClick={() => onQuantityChange(quantity - 1)}
                  className="w-5 min-[360px]:w-7 h-full flex items-center justify-center text-brand-blue hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="text-brand-blue flex-1 text-center select-none">{quantity}</span>
                <button
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="w-5 min-[360px]:w-7 h-full flex items-center justify-center text-brand-blue hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => onQuantityChange(1)}
                className="w-16 min-[360px]:w-20 py-1 min-[360px]:py-1.5 rounded-xl text-[10.5px] min-[360px]:text-[11px] font-extrabold border bg-white text-brand-blue border-brand-blue hover:bg-[#EAF4FF] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Add
              </button>
            )}
          </div>
        </div>

      </div>
      {/* Bullets */}
      <ul className="mt-2.5 sm:mt-3 flex flex-col gap-1">
        {item.bullets.map((b, bi) => (
          <li key={bi} className="flex items-start gap-1.5">
            <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
            <span className="text-[10px] min-[360px]:text-[11px] text-slate-600 leading-snug">{b}</span>
          </li>
        ))}
      </ul>
      {/* View details */}
      <button
        onClick={() => onViewDetails(item)}
        className="flex items-center gap-1 mt-2.5 sm:mt-3 text-brand-blue text-[10.5px] min-[360px]:text-[11px] font-bold cursor-pointer hover:underline"
      >
        View details <ChevronRight className="h-3 w-3 min-[360px]:h-3.5 min-[360px]:w-3.5" />
      </button>
    </div>
  );
};

// Helper to resolve generic icons for custom sub-services
const getSubServiceIcon = (name) => {
  const norm = name.toLowerCase();
  if (norm.includes('ac') || norm.includes('cool')) return acIconImg;
  if (norm.includes('wash') || norm.includes('machine')) return washingIconImg;
  if (norm.includes('clean') || norm.includes('salon')) return cleaningIconImg;
  if (norm.includes('elect') || norm.includes('power')) return electricianImg;
  if (norm.includes('plumb') || norm.includes('pipe') || norm.includes('leak')) return plumberImg;
  if (norm.includes('tv') || norm.includes('smart') || norm.includes('screen')) return tvImg;
  if (norm.includes('water') || norm.includes('ro') || norm.includes('purif')) return roImg;
  return heroService; // default fallback
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ServiceDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query params for service name
  const query = new URLSearchParams(location.search);
  const serviceName = query.get('service') || 'Electrician';

  // Hero copy and catalog both come from this service's CMS page config; the
  // bundled constants remain the fallback when nothing is published for it.
  const [pageConfig, setPageConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest(`/cms/service-pages/${encodeURIComponent(serviceName)}`);
        if (!cancelled) setPageConfig(data || null);
      } catch {
        // 404 simply means this service has no configured page yet.
        if (!cancelled) setPageConfig(null);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceName]);

  const rawConfig = pageConfig
    ? {
        tagline: pageConfig.tagline,
        subtitle: pageConfig.subtitle,
        subServices: pageConfig.subServices,
      }
    : SERVICE_CONFIG[serviceName] || DEFAULT_CONFIG;

  // Normalize subServices into an array whether it comes as a string or array
  const rawSubServices = Array.isArray(rawConfig.subServices)
    ? rawConfig.subServices
    : typeof rawConfig.subServices === 'string'
    ? rawConfig.subServices.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Resolve subServices with preset icons if necessary
  const resolvedSubServices = rawSubServices.map(sub => {
    if (typeof sub === 'string') {
      return { name: sub, img: getSubServiceIcon(sub) };
    }
    if (sub && sub.name) {
      return { name: sub.name, img: sub.img || getSubServiceIcon(sub.name) };
    }
    return sub;
  });

  const config = {
    ...rawConfig,
    subServices: resolvedSubServices
  };

  const [selectedSub, setSelectedSub] = useState(config.subServices[0]?.name || '');
  const [showMenu, setShowMenu] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailAdded, setDetailAdded] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [cart, setCart] = useState({});

  // Load catalog dynamically based on service name
  const currentCatalog = useMemo(() => {
    if (pageConfig?.catalog?.length) return pageConfig.catalog;
    const n = (serviceName || '').toLowerCase();
    if (n.includes('carpenter')) return CARPENTER_CATALOG;
    if (n.includes('plumb')) return PLUMBER_CATALOG;
    if (n.includes('ac') || n.includes('air condition')) return AC_CATALOG;
    if (n.includes('clean')) return CLEANING_CATALOG;
    if (n.includes('electr')) return ELECTRICIAN_CATALOG;
    return getDynamicCatalog(serviceName || 'Service');
  }, [pageConfig, serviceName]);

  const allCatalogItems = currentCatalog.flatMap(group => group.items);

  const handleQuantityChange = (itemName, qty) => {
    setCart(prev => {
      const updated = { ...prev };
      if (qty <= 0) {
        delete updated[itemName];
      } else {
        updated[itemName] = qty;
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((sum, [name, qty]) => {
      const item = allCatalogItems.find(it => it.name === name);
      if (item) {
        const itemPrice = parseInt(item.price.replace('₹', '')) || 0;
        return sum + itemPrice * qty;
      }
      return sum;
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const handleProceed = () => {
    const firstCartItemName = Object.keys(cart)[0];
    const firstCartItem = allCatalogItems.find(it => it.name === firstCartItemName);
    if (firstCartItem) {
      const itemPrice = firstCartItem.price.replace('₹', '');
      navigate(`/booking?service=${encodeURIComponent(firstCartItemName)}&price=${itemPrice}&qty=${cart[firstCartItemName]}`);
    } else {
      navigate('/booking');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col pb-0 relative">


      {/* ── Top Bar — mobile only ── */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 lg:top-16 z-30 border-b border-slate-100 shadow-2xs">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm sm:text-[15px] font-extrabold text-slate-900 truncate px-2">
          {serviceName}
        </h1>
        <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
          <Search className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      {/* Container wrapper for desktop */}
      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col pb-24">

      {/* ── Hero Banner ── */}
      <div className="mx-3 min-[360px]:mx-4 md:mx-6 mt-2.5 sm:mt-3 rounded-2xl overflow-hidden relative h-36 min-[360px]:h-40 sm:h-48 md:h-56 lg:h-64 bg-slate-800 shadow-md">
        <img
          src={config.bannerImg}
          alt={serviceName}
          className="w-full h-full object-cover opacity-80"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-5">
          <h2 className="text-white text-2xl font-black leading-tight drop-shadow-md">
            {config.tagline}
          </h2>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-white/90 text-[11px] font-semibold leading-tight whitespace-pre-line">
              {config.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── What service do you need? ── */}
      <div className="px-3 min-[360px]:px-4 pt-3.5 sm:pt-4">
        <h3 className="text-xs min-[360px]:text-[13px] font-extrabold text-slate-900 mb-2.5 sm:mb-3">What service do you need?</h3>
        <div className="grid grid-cols-3 gap-2 min-[360px]:gap-3">
          {config.subServices.map((sub) => (
            <button
              key={sub.name}
              onClick={() => setSelectedSub(sub.name)}
              className={`flex flex-col items-center gap-1 min-[360px]:gap-1.5 p-2 min-[360px]:p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                selectedSub === sub.name
                  ? 'border-brand-blue bg-[#EAF4FF] shadow-xs'
                  : 'border-slate-200 bg-white hover:border-brand-blue/40'
              }`}
            >
              <div className="w-11 h-11 min-[360px]:w-14 min-[360px]:h-14 flex items-center justify-center">
                <img src={sub.img} alt={sub.name} className="w-full h-full object-contain" />
              </div>
              <span className={`text-[9px] min-[360px]:text-[10px] font-bold text-center leading-tight line-clamp-2 ${
                selectedSub === sub.name ? 'text-brand-blue' : 'text-slate-700'
              }`}>
                {sub.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detailed Service Catalog ── */}
      <div className="px-3 min-[360px]:px-4 pb-32 flex flex-col gap-4 sm:gap-6 pt-5 sm:pt-8">
        {currentCatalog.map((group, gi) => (
          <div key={gi} id={group.section}>
            <h3 className="text-[14px] font-extrabold text-slate-900 mb-3">{group.section}</h3>
            <div className="flex flex-col gap-4">
              {group.items.map((item, ii) => (
                <CatalogCard 
                  key={ii} 
                  item={item} 
                  navigate={navigate} 
                  serviceName={serviceName} 
                  onViewDetails={(it) => { setDetailItem(it); setDetailAdded(false); }} 
                  quantity={cart[item.name] || 0}
                  onQuantityChange={(qty) => handleQuantityChange(item.name, qty)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Floating Menu Button ── */}
      <div className={`fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${getCartCount() > 0 ? 'bottom-[86px]' : 'bottom-6'}`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-full shadow-xl text-[13px] hover:bg-[#1565C0] transition-colors"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
      </div>

      {/* ── Sticky Proceed Bottom Bar ── */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(100%,48rem)] md:rounded-t-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Total Price</span>
            <span className="text-[18px] font-black text-slate-900 leading-none mt-0.5">₹{getCartTotal()}</span>
          </div>
          <button
            onClick={handleProceed}
            className="bg-[#2F80ED] text-white font-extrabold px-8 py-3 rounded-xl text-[13px] shadow-md hover:bg-blue-600 active:scale-95 transition-all focus:outline-none"
          >
            Proceed
          </button>
        </div>
      )}

      {/* ── Menu Modal ── */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-end p-4 pb-24"
          onClick={() => setShowMenu(false)}
        >
          {/* Wrapper to align card and close button */}
          <div 
            className="w-full max-w-[320px] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card */}
            <div className="bg-white rounded-[28px] p-6 shadow-2xl w-full flex flex-col items-center justify-center">
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 md:gap-4 w-full py-1">
                {config.subServices.map((sub) => (
                  <button
                    key={sub.name}
                    onClick={() => {
                      setSelectedSub(sub.name);
                      setShowMenu(false);
                      const element = document.getElementById(sub.name);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="flex flex-col items-center text-center focus:outline-none active:opacity-75 transition-opacity"
                  >
                    <div className="w-[76px] h-[76px] bg-[#F8F9FA] rounded-2xl flex items-center justify-center p-2 border border-slate-100/50 shadow-sm mb-1.5 hover:bg-slate-100 transition-colors">
                      <img src={sub.img} alt={sub.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight max-w-[76px]">
                      {sub.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Squircle Close Button below the card */}
            <button
              onClick={() => setShowMenu(false)}
              className="mt-6 w-14 h-14 bg-[#3B82F6] rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 active:scale-95 transition-all focus:outline-none z-10"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Bottom Sheet ── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Hero image */}
              <div className="relative w-full h-48 bg-slate-100 flex-shrink-0">
                <img src={detailItem.img} alt={detailItem.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => setDetailItem(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
                >
                  <X className="h-4 w-4 text-slate-700" />
                </button>
              </div>

              <div className="px-5 pt-4 pb-8 flex flex-col gap-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-extrabold text-slate-900 leading-snug">{detailItem.name}</h2>
                    {detailItem.rating ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-800">{detailItem.rating}</span>
                        {detailItem.reviews ? <span className="text-[10px] text-slate-400">({detailItem.reviews} reviews)</span> : null}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] font-extrabold text-slate-900">{detailItem.price}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500">{detailItem.time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailAdded(!detailAdded)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-extrabold border transition-all ${
                      detailAdded ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-brand-blue border-brand-blue'
                    }`}
                  >
                    {detailAdded ? 'Added ✓' : 'Add'}
                  </button>
                </div>

                <div className="h-px bg-slate-100" />

                {/* How it works */}
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-3">How it works</h3>
                  <ol className="flex flex-col gap-3">
                    {(detailItem.howItWorks || [
                      { step: 'Consult', desc: 'A professional visits your home to understand the requirement.' },
                      { step: 'Get a quote', desc: 'You receive a clear price estimate for the required work.' },
                      { step: 'Approve or decline', desc: `Approve → Work starts.\nDecline → Only a ${detailItem.price} visit charge applies.` },
                      { step: 'Service completion', desc: 'The professional completes the job as agreed.' },
                      { step: 'Clean-up & support', desc: 'Area is cleaned after work, and you get a 30-day service warranty.' },
                    ]).map((hw, hi) => (
                      <li key={hi} className="flex gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EAF4FF] text-brand-blue text-[10px] font-extrabold flex items-center justify-center mt-0.5">{hi + 1}</span>
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">{hw.step}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">{hw.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="h-px bg-slate-100" />

                {/* What's included */}
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-3">What's Included</h3>
                  <ul className="flex flex-col gap-2">
                    {(detailItem.included || detailItem.bullets).map((inc, ii2) => (
                      <li key={ii2} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2E7D32] flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-700 leading-snug">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Common concerns */}
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-3">Common Concerns</h3>
                  <ul className="flex flex-col gap-2">
                    {(detailItem.concerns || [
                      'Frequent power trips or breaker issues',
                      'Faulty or non-working switches and sockets',
                      'Flickering lights or voltage fluctuations',
                      'Planning new wiring or extension board setup',
                    ]).map((c, ci) => (
                      <li key={ci} className="flex items-start gap-2">
                        <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>
                        <span className="text-[11px] text-slate-700 leading-snug">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Consultation Time */}
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-2">Consultation Time</h3>
                  <ul className="flex flex-col gap-1">
                    {(detailItem.consultationTime || [
                      '30-90 minutes (based on requirement)',
                    ]).map((t, ti) => (
                      <li key={ti} className="flex items-start gap-2">
                        <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>
                        <span className="text-[11px] text-slate-700 leading-snug">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Vetted ServiceProviders Banner */}
                <div className="rounded-2xl overflow-hidden bg-[#1a2744] flex items-center relative" style={{minHeight: '140px'}}>
                  <div className="flex-1 px-4 py-5 z-10">
                    <p className="text-white text-[15px] font-extrabold mb-3 leading-tight">Vetted ServiceProviders</p>
                    {[
                      'Trusted for Quality',
                      'Background Verified',
                      'Certified Professionals',
                      'Skilled in Electrical Repairs',
                    ].map((q, qi) => (
                      <div key={qi} className="flex items-center gap-2 mb-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand-yellow flex-shrink-0" />
                        <span className="text-white/90 text-[11px] font-medium">{q}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 w-28 h-full flex items-end justify-center overflow-hidden">
                    <img
                      src={detailItem.img}
                      alt="service provider"
                      className="h-36 w-28 object-contain object-bottom"
                    />
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* FAQ */}
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-2">Frequently Asked Questions</h3>
                  <div className="flex flex-col">
                    {(detailItem.faqs || [
                      { q: 'What is included in this consultation?', a: 'The serviceProvider will assess your requirements, provide a quote, and suggest the best solution for your needs.' },
                      { q: 'Will the electrician perform repairs during the consultation?', a: 'The consultation is for assessment and quoting. Repairs are done only after your approval.' },
                      { q: 'Does the consultation fee include service work?', a: 'No, the consultation fee is separate. The service fee is charged only after you approve the quote.' },
                      { q: 'Will the consultation fee be adjusted in the final bill?', a: 'Yes, the consultation fee will be adjusted against the final service bill if you proceed.' },
                      { q: 'How long does the consultation take?', a: 'Typically 30–90 minutes depending on the complexity of the requirement.' },
                    ]).map((faq, fi) => (
                      <div key={fi} className="border-b border-slate-100 py-3">
                        <button
                          className="w-full flex items-center justify-between gap-2 text-left"
                          onClick={() => setOpenFaq(openFaq === fi ? null : fi)}
                        >
                          <span className="text-[12px] font-semibold text-slate-800 leading-snug flex-1">{faq.q}</span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${
                              openFaq === fi ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        {openFaq === fi && (
                          <p className="text-[11px] text-slate-500 mt-2 leading-snug">{faq.a}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Ratings Breakdown */}
                <div 
                  className="cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => setShowReviewsModal(true)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {detailItem.rating ? (
                      <div className="flex flex-col items-center">
                        <Star className="h-6 w-6 fill-amber-400 text-amber-400 mb-1" />
                        <span className="text-[22px] font-extrabold text-slate-900 leading-none">{detailItem.rating}</span>
                        {detailItem.reviews ? <span className="text-[10px] text-slate-400 mt-0.5">({detailItem.reviews} reviews)</span> : null}
                      </div>
                    ) : null}
                    <div className="flex-1 flex flex-col gap-1">
                      {[
                        { star: 5, count: Math.round(detailItem.reviews * 0.83) },
                        { star: 4, count: Math.round(detailItem.reviews * 0.17) },
                        { star: 3, count: 0 },
                        { star: 2, count: 0 },
                        { star: 1, count: 0 },
                      ].map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                          <span className="text-[10px] text-slate-500 w-3">{star}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: detailItem.reviews > 0 ? `${(count / detailItem.reviews) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-7 text-right">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Customer Reviews */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-extrabold text-slate-900">Top recent customer reviews</h3>
                    <button 
                      onClick={() => setShowReviewsModal(true)}
                      className="text-brand-blue text-[11px] font-extrabold flex items-center gap-0.5 hover:underline"
                    >
                      See All
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {[
                      {
                        name: 'Parveen',
                        date: 'Sep, 24 2025',
                        rating: 5,
                        avatarBg: '#E0F2F1',
                        avatarText: '#00796B',
                        review: 'Trust customer satisfied response overall job respectful genuine value thorough guidance solution issue completed wiring approach pro...'
                      },
                      {
                        name: 'Naveen',
                        date: 'Sep, 24 2025',
                        rating: 5,
                        avatarBg: '#E8F5E9',
                        avatarText: '#2E7D32',
                        review: 'Quick electrician efficient genuine issue attention wiring thorough trustworthy job excellent friendly dedicated detail courteous value behavior o...'
                      },
                    ].map((rev, ri) => (
                      <div key={ri} className="pb-4 border-b border-slate-100 last:border-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px]"
                              style={{ backgroundColor: rev.avatarBg, color: rev.avatarText }}
                            >
                              {rev.name[0]}
                            </div>
                            <span className="text-[12px] font-bold text-slate-900">{rev.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{rev.date}</span>
                        </div>
                        <div className="flex gap-0.5 mb-1.5">
                          {Array.from({ length: rev.rating }).map((_, si) => (
                            <Star key={si} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          {rev.review}
                          <button
                            onClick={() => setShowReviewsModal(true)}
                            className="text-brand-blue font-bold ml-1 hover:underline text-[11px]"
                          >
                            Show More
                          </button>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Recent Customer Reviews Drawer ── */}
      {showReviewsModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center"
          onClick={() => setShowReviewsModal(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 ease-out"
            style={{ height: '80vh', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-slate-100 relative">
              <h2 className="text-[14px] font-extrabold text-slate-900 mx-auto">Top recent customer reviews</h2>
              <button
                onClick={() => setShowReviewsModal(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            {/* Scrollable list of reviews */}
            <div className="overflow-y-auto flex-1 px-5 py-2 divide-y divide-slate-100">
              {[
                {
                  name: 'Parveen',
                  date: 'Sep, 24 2025',
                  rating: 5,
                  avatarBg: '#E0F2F1',
                  avatarText: '#00796B',
                  truncated: 'Trust customer satisfied response overall job respectful genuine value thorough guidance solution issue completed wiring approach pro...',
                  full: 'Trust customer satisfied response overall job respectful genuine value thorough guidance solution issue completed wiring approach professional and timely.'
                },
                {
                  name: 'Naveen',
                  date: 'Sep, 24 2025',
                  rating: 5,
                  avatarBg: '#E8F5E9',
                  avatarText: '#2E7D32',
                  truncated: 'Quick electrician efficient genuine issue attention wiring thorough trustworthy job excellent friendly dedicated detail courteous value behavior o...',
                  full: 'Quick electrician efficient genuine issue attention wiring thorough trustworthy job excellent friendly dedicated detail courteous value behavior outstanding.'
                },
                {
                  name: 'Vikas',
                  date: 'Sep, 24 2025',
                  rating: 5,
                  avatarBg: '#E0F2F1',
                  avatarText: '#00695C',
                  truncated: 'Courteous responsive quality helpful support reliable response requirements attention detail fixing genuine repair service installation trust com...',
                  full: 'Courteous responsive quality helpful support reliable response requirements attention detail fixing genuine repair service installation trust completely.'
                },
                {
                  name: 'Alok',
                  date: 'Sep, 24 2025',
                  rating: 5,
                  avatarBg: '#E1F5FE',
                  avatarText: '#0288D1',
                  truncated: 'Attention experience support affordable detail timely friendly satisfied approach response excellent reliable respectful fixing genuine pro...',
                  full: 'Attention experience support affordable detail timely friendly satisfied approach response excellent reliable respectful fixing genuine professionals.'
                },
                {
                  name: 'Rajat',
                  date: 'Sep, 18 2025',
                  rating: 5,
                  avatarBg: '#E0F7FA',
                  avatarText: '#00838F',
                  truncated: 'The service quality was very professional and I felt confident with the work done.',
                  full: 'The service quality was very professional and I felt confident with the work done.'
                }
              ].map((rev, ri) => {
                const isExpanded = !!expandedReviews[ri];
                const hasShowMore = rev.truncated !== rev.full;
                return (
                  <div key={ri} className="py-4 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px]"
                          style={{ backgroundColor: rev.avatarBg, color: rev.avatarText }}
                        >
                          {rev.name[0]}
                        </div>
                        <span className="text-[12px] font-extrabold text-slate-800">{rev.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{rev.date}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, si) => (
                        <Star key={si} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal mt-0.5">
                      {isExpanded ? rev.full : rev.truncated}
                      {hasShowMore && !isExpanded && (
                        <button
                          onClick={() => setExpandedReviews(prev => ({ ...prev, [ri]: true }))}
                          className="text-brand-blue font-bold ml-1 hover:underline text-[11px]"
                        >
                          Show More
                        </button>
                      )}
                      {hasShowMore && isExpanded && (
                        <button
                          onClick={() => setExpandedReviews(prev => ({ ...prev, [ri]: false }))}
                          className="text-brand-blue font-bold ml-1 hover:underline text-[11px]"
                        >
                          Show Less
                        </button>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default ServiceDetails;
