import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, MapPin, Wrench, Zap, Droplet, Thermometer, Shield, Home as HomeIcon, Calendar, MessageSquare, User, Star, X, Wind, WashingMachine, Refrigerator, Droplets, Sparkles, ShoppingCart, Tv, Flame, MousePointerClick, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import acBanner from '../assets/ac_service_banner.png';
import electricianBanner from '../assets/electrician_banner.png';
import plumbingBanner from '../assets/plumbing_banner.png';
import warrantyBanner1 from '../assets/warranty_banner_1.png';
import warrantyBanner2 from '../assets/warranty_banner_2.png';
import mostBookedAc1 from '../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../assets/most_booked_ac_2.png';
import mostBookedWm from '../assets/most_booked_wm.png';
import mostBookedCleaning from '../assets/most_booked_cleaning.png';
import mostBookedSalon from '../assets/most_booked_salon.png';
import cleaningBathroom1 from '../assets/cleaning_bathroom_1.png';
import cleaningBathroom2 from '../assets/cleaning_bathroom_2.png';
import cleaningSofa from '../assets/cleaning_sofa.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import applianceFridge from '../assets/appliance_fridge.png';
import acImg from '../assets/categories/ac.png';
import splitAcImg from '../assets/categories/split_ac.png';
import wasingImg from '../assets/categories/wasing.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';
import saloonImg from '../assets/categories/saloon.png';
import spaImg from '../assets/categories/spa.png';
import logo from '../assets/nigam-care.png';
import clickIcon from '../assets/CLICK.png';
import handshakeIcon from '../assets/HANDSHAKE.png';

// Import realistic spare parts assets
import roPreFilterImg from '../assets/ro_pre_filter_candle.png';
import roMembraneImg from '../assets/ro_membrane.png';
import roSedimentImg from '../assets/ro_sediment_filter.png';
import roCarbonImg from '../assets/ro_carbon_filter.png';
import roPostCarbonImg from '../assets/ro_post_carbon.png';
import Stories from '../components/home/Stories';
import star3d from '../assets/star_3d.png';
import ac3d from '../assets/icon_3d_ac.png';
import wm3d from '../assets/icon_3d_wm.png';
import fridge3d from '../assets/icon_3d_fridge.png';
import tv3d from '../assets/icon_3d_tv.png';
import geyser3d from '../assets/icon_3d_geyser.png';
import ro3d from '../assets/icon_3d_ro.png';
import oven3d from '../assets/icon_3d_oven.png';
import chimney3d from '../assets/icon_3d_chimney.png';
import cooler3d from '../assets/icon_3d_cooler.png';

const Dashboard = ({ defaultType }) => {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const [activeType, setActiveType] = useState(defaultType || 'non-warranty'); // 'non-warranty' or 'in-warranty'

  useEffect(() => {
    if (defaultType === 'in-warranty') {
      navigate('/partner-warranty');
    } else if (defaultType) {
      setActiveType(defaultType);
    }
  }, [defaultType, navigate]);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [isUnderWarranty, setIsUnderWarranty] = useState(null);
  const [billNo, setBillNo] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [selectedServiceForWarranty, setSelectedServiceForWarranty] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (bannerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = bannerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          bannerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          bannerRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { id: 1, name: 'AC Repair', img: acImg },
    { id: 2, name: 'Washing Machine', img: wasingImg },
    { id: 3, name: 'Electrician', img: electricianImg },
    { id: 4, name: 'Plumber', img: plumberImg },
    { id: 5, name: 'Full Home Cleaning', img: cleaningImg },
    { id: 6, name: 'Salon for Women', img: saloonImg },
    { id: 7, name: 'Spa & Massage', img: spaImg },
  ];

  const getBrandsForCategory = (cat) => {
    const norm = cat?.toLowerCase() || '';
    if (norm.includes('ac')) {
      return ['Voltas', 'LG', 'Samsung', 'Daikin', 'Whirlpool', 'Lloyd', 'Panasonic', 'Blue Star', 'Hitachi'];
    }
    if (norm.includes('wm') || norm.includes('washing')) {
      return ['LG', 'Samsung', 'Whirlpool', 'IFB', 'Bosch', 'Haier', 'Godrej', 'Panasonic'];
    }
    if (norm.includes('fridge') || norm.includes('refrigerator')) {
      return ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Panasonic', 'Bosch'];
    }
    if (norm.includes('tv') || norm.includes('television')) {
      return ['LG', 'Samsung', 'Sony', 'Panasonic', 'Mi', 'OnePlus', 'TCL', 'Haier', 'VU'];
    }
    if (norm.includes('geyser') || norm.includes('heater')) {
      return ['Havells', 'AO Smith', 'Racold', 'Bajaj', 'V-Guard', 'Venus', 'Kenstar'];
    }
    if (norm.includes('ro') || norm.includes('purifier')) {
      return ['Kent', 'Eureka Forbes', 'Aquaguard', 'Pureit', 'Blue Star', 'AO Smith', 'Livpure'];
    }
    if (norm.includes('oven') || norm.includes('microwave')) {
      return ['LG', 'Samsung', 'IFB', 'Morphy Richards', 'Bajaj', 'Panasonic', 'Godrej'];
    }
    if (norm.includes('chimney')) {
      return ['Faber', 'Elica', 'Glen', 'Hindware', 'Kaff', 'Sunflame'];
    }
    if (norm.includes('cooler')) {
      return ['Symphony', 'Bajaj', 'Orient', 'Kenstar', 'Crompton', 'Hindware', 'Usha'];
    }
    return ['LG', 'Samsung', 'Whirlpool', 'Panasonic'];
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-16">
      
      {/* Warranty Modal */}
      {showWarrantyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0D47A1]">Warranty Verification</h2>
              <button 
                onClick={() => setShowWarrantyModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>
            
            <p className="text-sm text-text-primary">Please provide your bill details to claim free service under warranty.</p>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Bill Number</label>
                <input 
                  type="text" 
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. WAR123"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D47A1]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Upload Bill (Optional)</label>
                <input 
                  type="file" 
                  onChange={(e) => setBillFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#E3ECF9] file:text-[#0D47A1] hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => {
                  if (!billNo && !billFile) {
                    alert('Please provide Bill No or Upload Bill to claim warranty.');
                    return;
                  }
                  setShowWarrantyModal(false);
                  navigate(`/booking?service=${encodeURIComponent(selectedServiceForWarranty.title)}&price=0&warranty=true`);
                }}
                className="flex-1 bg-[#FFD600] text-[#0D47A1] font-bold py-2 rounded-xl hover:bg-yellow-400 transition-colors text-sm"
              >
                Verify & Proceed
              </button>
              <button 
                onClick={() => {
                  setShowWarrantyModal(false);
                  navigate(`/booking?service=${encodeURIComponent(selectedServiceForWarranty.title)}&price=${selectedServiceForWarranty.price}`);
                }}
                className="flex-1 bg-slate-100 text-text-primary font-semibold py-2 rounded-xl hover:bg-slate-200 transition-colors text-sm"
              >
                Skip / No Warranty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-section-bg px-6 pt-3 pb-0 rounded-b-[30px] shadow-sm">
        
        {/* Quick Access Toggle */}
        <div className="flex bg-brand-navy p-1 rounded-full border border-brand-blue/10 mb-5 shadow-inner items-center -mx-3">
          <button 
            onClick={() => {
              setActiveType('non-warranty');
              navigate('/dashboard/non-warranty');
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-full transition-all duration-300 flex items-center gap-2.5 text-left cursor-pointer ${
              activeType === 'non-warranty' 
                ? 'bg-brand-yellow text-[#212121] shadow-md transform scale-[1.01]' 
                : 'text-white hover:text-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeType === 'non-warranty' ? 'bg-white text-black shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <img 
                src={clickIcon} 
                alt="Book Service" 
                className={`w-8 h-8 object-contain ${
                  activeType === 'non-warranty' ? 'mix-blend-multiply' : 'invert mix-blend-screen'
                }`} 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black leading-tight">Book Service</span>
              <span className={`text-[8px] font-bold mt-0.5 leading-none ${
                activeType === 'non-warranty' ? 'text-slate-700' : 'text-slate-300'
              }`}>Any Brand. Any Product.</span>
            </div>
          </button>
          
          <button 
            onClick={() => {
              navigate('/partner-warranty');
            }}
            className={`flex-1 py-1.5 px-2.5 rounded-full transition-all duration-300 flex items-center gap-2.5 text-left cursor-pointer ${
              activeType === 'in-warranty' 
                ? 'bg-brand-yellow text-[#212121] shadow-md transform scale-[1.01]' 
                : 'text-white hover:text-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeType === 'in-warranty' ? 'bg-brand-navy text-white shadow-sm' : 'bg-white/10 text-white'
            }`}>
              <img 
                src={handshakeIcon} 
                alt="Partner Warranty" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black leading-tight">Partner Warranty</span>
              <span className={`text-[8px] font-bold mt-0.5 leading-none whitespace-nowrap ${
                activeType === 'in-warranty' ? 'text-slate-700' : 'text-slate-300'
              }`}>Only for NCC Partner Brands</span>
            </div>
          </button>
        </div>

        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-blue" />
            <div>
              <span className="text-xs text-text-secondary block">Location</span>
              <span className="text-sm font-bold text-text-primary">Civil Lines, Delhi</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="w-9 h-9 bg-slate-100 rounded-full relative flex items-center justify-center">
              <Bell className="h-5 w-5 text-text-primary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
            >
              U
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search for services (AC, Geyser...)"
            className="w-full pl-12 pr-4 py-1.5 bg-slate-50 border border-border-color rounded-2xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm"
          />
        </div>
        {/* Horizontal Categories */}
        <div className="flex overflow-x-auto gap-6 mt-2 pb-1.5 snap-x no-scrollbar">
          {[
            { name: 'For You', isForYou: true },
            { name: 'AC', service: 'AC Repair' },
            { name: 'Washing Machine', service: 'Washing Machine' },
            { name: 'Refrigerator', isFridge: true },
            { name: 'TV', service: 'Smart TV Service & Repair' },
            { name: 'RO Water Purifier', service: 'Water Purifier RO Service' },
            { name: 'Geyser', service: 'Geyser Service & Repair' },
            { name: 'More', isMore: true }
          ].map((cat, index) => (
            <div 
              key={index}
              className="flex flex-col items-center gap-0.5 cursor-pointer flex-shrink-0 snap-start group"
              onClick={() => {
                if (cat.isForYou) {
                  navigate('/dashboard');
                } else if (cat.isMore) {
                  navigate('/services');
                } else if (cat.isFridge) {
                  navigate('/book/Refrigerator');
                } else if (cat.name === 'AC') {
                  navigate('/book/AC');
                } else if (cat.name === 'Washing Machine') {
                  navigate('/book/Washing Machine');
                } else if (cat.name === 'TV') {
                  navigate('/book/TV');
                } else if (cat.name === 'RO Water Purifier') {
                  navigate('/book/RO Water Purifier');
                } else if (cat.name === 'Geyser') {
                  navigate('/book/Geyser');
                } else {
                  navigate(`/service-details?service=${encodeURIComponent(cat.service)}`);
                }
              }}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                {cat.name === 'For You' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
                    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z" opacity="0.5" />
                    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" opacity="0.5" />
                  </svg>
                )}
                {cat.name === 'AC' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="2" y="6" width="20" height="8" rx="2" />
                    <line x1="6" y1="14" x2="18" y2="14" />
                    <path d="M7 17l1.5 2" />
                    <path d="M12 17v2" />
                    <path d="M17 17l-1.5 2" />
                    <circle cx="18" cy="10" r="1" fill="currentColor" />
                  </svg>
                )}
                {cat.name === 'Washing Machine' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <circle cx="12" cy="13" r="4" />
                    <circle cx="12" cy="7" r="1" />
                  </svg>
                )}
                {cat.name === 'Refrigerator' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="5" y1="10" x2="19" y2="10" />
                    <line x1="9" y1="6" x2="9" y2="8" />
                    <line x1="9" y1="13" x2="9" y2="17" />
                  </svg>
                )}
                {cat.name === 'TV' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                )}
                {cat.name === 'RO Water Purifier' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
                  </svg>
                )}
                {cat.name === 'Geyser' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="6" y="2" width="12" height="16" rx="3" />
                    <path d="M9 22v-4" />
                    <path d="M15 22v-4" />
                    <circle cx="12" cy="10" r="2" />
                  </svg>
                )}
                {cat.isMore && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-blue">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] font-black text-brand-blue uppercase tracking-tighter text-center max-w-[80px]">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        {/* Service Banners */}
        <div ref={bannerRef} className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x no-scrollbar">
          {(activeType === 'non-warranty' 
            ? [{ id: 1, image: acBanner }, { id: 2, image: electricianBanner }, { id: 3, image: plumbingBanner }]
            : [{ id: 1, image: warrantyBanner1 }, { id: 2, image: warrantyBanner2 }]
          ).map((banner) => (
            <div 
              key={banner.id}
              className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden min-w-[300px] snap-center"
            >
              <div className="relative h-36 w-full">
                <img 
                  src={banner.image} 
                  alt="Service Banner" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>



        {/* Categories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Our Services</h2>
            <button 
              onClick={() => navigate('/services')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors"
            >
              See All
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 snap-x no-scrollbar">
            {services.map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty({ title: service.name, price: 499 });
                    setShowWarrantyModal(true);
                    return;
                  }
                  // Appliance categories → BookingFlow wizard
                  const APPLIANCE_ROUTES = {
                    'ac repair': 'AC',
                    'washing machine': 'Washing Machine',
                    'refrigerator': 'Refrigerator',
                    'tv': 'TV',
                    'television': 'TV',
                    'geyser': 'Geyser',
                    'water heater': 'Geyser',
                    'ro water purifier': 'RO Water Purifier',
                    'water purifier': 'RO Water Purifier',
                    'microwave': 'Microwave',
                    'chimney': 'Chimney',
                    'air cooler': 'Air Cooler',
                  };
                  const nameNorm = service.name.toLowerCase();
                  const bookCat = Object.keys(APPLIANCE_ROUTES).find(k => nameNorm.includes(k));
                  if (bookCat) {
                    navigate(`/book/${encodeURIComponent(APPLIANCE_ROUTES[bookCat])}`);
                  } else {
                    navigate(`/service-details?service=${encodeURIComponent(service.name)}`);
                  }
                }}
                className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 w-24 snap-start"
              >
                <div className="w-24 h-24 bg-transparent rounded-2xl flex items-center justify-center transition-all overflow-hidden">
                  <img src={service.img} alt={service.name} className="w-full h-full object-contain mix-blend-multiply p-2" />
                </div>
                <span className="text-xs font-semibold text-text-primary text-center truncate w-full">
                  {service.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warranty Offers / Smart Detection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">
              {activeType === 'in-warranty' ? 'Covered Benefits' : ''}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x no-scrollbar">
            {[
              { id: 1, image: warrantyBanner1 },
              { id: 2, image: warrantyBanner2 }
            ].map((banner) => (
              <div 
                key={banner.id}
                className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden min-w-[300px] snap-center"
              >
                <div className="relative h-36 w-full">
                  <img 
                    src={banner.image} 
                    alt="Warranty Banner" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brands & Offers */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">Brands & Offers</h2>
            </div>
            <button 
              onClick={() => navigate('/all-brands')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors"
            >
              See All
            </button>
          </div>

          {/* Horizontal Scrollable Carousel */}
          <div className="flex overflow-x-auto gap-4 pt-1.5 pb-4 -mx-2 px-2 snap-x no-scrollbar">
            {/* Lloyd Card */}
            <div 
              onClick={() => navigate(`/service-details?service=${encodeURIComponent('AC Repair')}&brand=Lloyd`)}
              className="w-full sm:max-w-[340px] flex-shrink-0 h-[200px] rounded-[24px] bg-gradient-to-br from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF] p-4 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 cursor-pointer snap-start"
            >
              <div className="flex flex-col items-start z-10 max-w-[65%]">
                <span className="font-sans font-black text-xl text-[#014694] tracking-tight">
                  LLOYD
                </span>
                <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight">
                  New Launch Glacier Series AC
                </h3>
                <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight">
                  Experience Superior Cooling & Comfort
                </p>
              </div>

              {/* Absolute AC Image */}
              <img 
                src={splitAcImg} 
                alt="Lloyd AC" 
                className="absolute -right-3 top-8 w-[140px] h-[80px] object-contain z-0 mix-blend-multiply" 
              />

              {/* CTA Button */}
              <div className="z-10 mt-auto flex items-center">
                <div className="bg-white text-[#0D47A1] text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80 hover:bg-slate-50 transition-colors">
                  <span>Explore on NCC</span>
                  <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1]" />
                </div>
              </div>
            </div>

            {/* Samsung Card */}
            <div 
              onClick={() => window.open('https://www.samsung.com', '_blank')}
              className="w-full sm:max-w-[340px] flex-shrink-0 h-[200px] rounded-[24px] bg-gradient-to-br from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4] p-4 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 cursor-pointer snap-start"
            >
              <div className="flex flex-col items-start z-10 max-w-[65%]">
                <span className="bg-[#1B5E20] text-white text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide">
                  Official Partner
                </span>
                <span className="font-sans font-black text-xl text-slate-800 tracking-[0.1em] mt-1.5">
                  SAMSUNG
                </span>
                <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight">
                  Bespoke AI Laundry Range
                </h3>
                <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight">
                  Smart. Gentle. Intelligent.
                </p>
              </div>

              {/* Absolute Washing Machine Image */}
              <img 
                src={mostBookedWm} 
                alt="Samsung WM" 
                className="absolute right-1 top-6 w-[110px] h-[110px] object-contain z-0" 
              />

              {/* CTA Button */}
              <div className="z-10 mt-auto flex items-center">
                <div className="bg-white text-[#0D47A1] text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80 hover:bg-slate-50 transition-colors">
                  <span>Visit Official Site</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#0D47A1]">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Daikin Card */}
            <div 
              onClick={() => navigate(`/service-details?service=${encodeURIComponent('AC Repair')}&brand=Daikin`)}
              className="w-full sm:max-w-[340px] flex-shrink-0 h-[200px] rounded-[24px] bg-gradient-to-br from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF] p-4 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 cursor-pointer snap-start"
            >
              <div className="flex flex-col items-start z-10 max-w-[65%]">
                <span className="bg-[#E3F2FD] text-[#0D47A1] text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide">
                  6pocine
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0091FF] fill-current flex-shrink-0">
                    <path d="M4 20 L20 4 L20 20 Z" />
                  </svg>
                  <span className="font-sans font-black text-xl text-[#00529C] tracking-wide">DAIKIN</span>
                </div>
                <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight">
                  Air Specialist Inverter Series
                </h3>
                <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight">
                  Perfect Comfort. Every Season.
                </p>
              </div>

              {/* Absolute AC Image */}
              <img 
                src={splitAcImg} 
                alt="Daikin AC" 
                className="absolute -right-3 top-8 w-[140px] h-[80px] object-contain z-0 mix-blend-multiply" 
              />

              {/* CTA Button */}
              <div className="z-10 mt-auto flex items-center">
                <div className="bg-white text-[#0D47A1] text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80 hover:bg-slate-50 transition-colors">
                  <span>Explore on NCC</span>
                  <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1]" />
                </div>
              </div>
            </div>

            {/* LG Card (Spillover for visual cue) */}
            <div 
              onClick={() => navigate(`/refrigerator-details`)}
              className="w-full sm:max-w-[340px] flex-shrink-0 h-[200px] rounded-[24px] bg-gradient-to-br from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0] p-4 flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100/50 cursor-pointer snap-start"
            >
              <div className="flex flex-col items-start z-10 max-w-[65%]">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="46" fill="#C30F42" />
                      <path d="M 50 22 A 28 28 0 1 0 78 50" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                      <path d="M 50 36 L 50 64 L 64 64" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="39" cy="45" r="5" fill="#FFFFFF" />
                    </svg>
                  </div>
                  <span className="font-sans font-black text-xl text-[#C30F42] tracking-wider">LG</span>
                </div>
                <h3 className="text-xs font-black text-slate-800 mt-1.5 leading-tight">
                  Double Door Frost Free Refrigerator
                </h3>
                <p className="text-[10px] font-semibold text-slate-600 mt-0.5 leading-tight">
                  Premium cooling. Maximum savings.
                </p>
              </div>

              {/* Absolute Refrigerator Image */}
              <img 
                src={applianceFridge} 
                alt="LG Refrigerator" 
                className="absolute right-2 top-6 w-[100px] h-[100px] object-contain z-0" 
              />

              {/* CTA Button */}
              <div className="z-10 mt-auto flex items-center">
                <div className="bg-white text-[#0D47A1] text-[11px] font-black py-2 px-4 rounded-full flex items-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-100/80 hover:bg-slate-50 transition-colors">
                  <span>Explore on NCC</span>
                  <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1]" />
                </div>
              </div>
            </div>
          </div>

          {/* Description Legend */}
          <div className="mt-1 pt-0 text-[9.5px] font-bold text-slate-500">
            <div className="flex flex-col items-start gap-1.5 w-max mx-auto px-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0" />
                <span>Click on 'Explore on NCC' to buy from our store</span>
              </div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>Click on 'Visit Official Site' to go to brand website</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Booked Services */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Most Booked Services</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar">
            {[
              { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant" },
              { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant" },
              { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant" },
              { id: 4, title: "Home Cleaning", image: mostBookedCleaning, rating: 4.90, price: 999, badge: "Trending" },
              { id: 5, title: "Women Salon", image: mostBookedSalon, rating: 4.80, price: 799, badge: "Best Seller" }
            ].map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty(service);
                    setShowWarrantyModal(true);
                  } else {
                    navigate(`/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
                  }
                }}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${activeType === 'in-warranty' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#E3F2FD] text-[#0D47A1]'}`}>
                    {service.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {service.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-text-secondary">{service.rating}</span>
                  </div>
                  <span className={`text-sm font-bold ${activeType === 'in-warranty' ? 'text-green-600' : 'text-[#0B4EA2]'}`}>
                    {activeType === 'in-warranty' ? '₹0 (Warranty)' : `₹${service.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appliance repair & service */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Appliance repair & service</h2>
            <button 
              onClick={() => navigate('/appliance-services')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors"
            >
              See all
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar">
            {[
              { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant", path: '/booking' },
              { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant", path: '/booking' },
              { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant", path: '/booking' },
              { id: 4, title: "Refrigerator Repair & Service", image: applianceFridge, rating: 4.80, price: 899, badge: "Instant", path: '/refrigerator-details' },
              { id: 5, title: "Deep Clean AC", image: mostBookedAc1, rating: 4.76, price: 1198, badge: "2 ACs", path: '/booking' },
              { id: 6, title: "WM Checkup", image: mostBookedWm, rating: 4.85, price: 199, badge: "Instant", path: '/booking' }
            ].map((service) => (
              <div 
                key={service.id}
                onClick={() => {
                  const titleNorm = service.title.toLowerCase();
                  const isAC = titleNorm.includes('ac');
                  const isWM = titleNorm.includes('washing') || titleNorm.includes('wm');
                  const isFridge = titleNorm.includes('refrigerator') || titleNorm.includes('fridge');
                  
                  if (isAC) {
                    navigate('/book/AC');
                  } else if (isWM) {
                    navigate('/book/Washing Machine');
                  } else if (isFridge) {
                    navigate('/book/Refrigerator');
                  } else if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty(service);
                    setShowWarrantyModal(true);
                  } else {
                    navigate(service.path || `/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
                  }
                }}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all h-[230px]"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${service.badge === "2 ACs" ? "bg-[#5C0632] text-white" : (activeType === 'in-warranty' ? "bg-[#E8F5E9] text-green-600" : "bg-[#E3F2FD] text-[#0D47A1]")}`}>
                    {service.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {service.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-text-secondary">{service.rating}</span>
                  </div>
                  <span className={`text-sm font-bold ${activeType === 'in-warranty' ? 'text-green-600' : 'text-[#0B4EA2]'}`}>
                    {activeType === 'in-warranty' ? '₹0 (Warranty)' : `₹${service.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spare Parts & Accessories */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Spare Parts & Accessories</h2>
            <button 
            onClick={() => navigate('/buy-product')}
              className="text-sm font-semibold text-[#0B4EA2] hover:text-blue-800 transition-colors cursor-pointer"
            >
              See all
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x no-scrollbar">
            {[
              { id: 1, title: 'Pre-Filter Candle', desc: 'RO Outer Candle', price: 199, image: roPreFilterImg, rating: 4.80, badge: 'Genuine' },
              { id: 2, title: 'RO Membrane', desc: 'High TDS Membrane', price: 899, image: roMembraneImg, rating: 4.92, badge: 'Best Seller' },
              { id: 3, title: 'Sediment Filter', desc: 'RO Inner Filter', price: 249, image: roSedimentImg, rating: 4.75, badge: 'Genuine' },
              { id: 4, title: 'Carbon Filter', desc: 'Active Carbon', price: 299, image: roCarbonImg, rating: 4.86, badge: 'Trending' },
              { id: 5, title: 'Post Carbon', desc: 'Taste Enhancer', price: 249, image: roPostCarbonImg, rating: 4.78, badge: 'Genuine' }
            ].map((item) => (
              <div 
                key={item.id}
                onClick={() => navigate('/buy-product')}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all h-[230px]"
              >
                <div className="w-full h-32 bg-slate-50/50 rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={item.image} alt={item.title} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#0D47A1]">
                    {item.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-text-secondary truncate">
                    {item.desc}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-text-secondary">{item.rating}</span>
                  </div>
                  <span className="text-sm font-bold text-[#0B4EA2]">
                    ₹{item.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Stories />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible">
        <button className="flex flex-col items-center text-brand-blue">
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
          onClick={() => {
            if (activeType === 'in-warranty') {
              navigate('/extend-warranty');
            } else {
              navigate('/buy');
            }
          }}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
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

      {/* Brand Selection Modal */}

    </div>
  );
};

export default Dashboard;
