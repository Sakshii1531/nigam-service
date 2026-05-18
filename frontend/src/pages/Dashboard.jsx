import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, MapPin, Wrench, Zap, Droplet, Thermometer, Shield, Home as HomeIcon, Calendar, MessageSquare, User, Star, X, Wind, WashingMachine, Refrigerator, Droplets, Sparkles, ShoppingCart } from 'lucide-react';
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
import wasingImg from '../assets/categories/wasing.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';
import saloonImg from '../assets/categories/saloon.png';
import spaImg from '../assets/categories/spa.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const [activeType, setActiveType] = useState('non-warranty'); // 'non-warranty' or 'in-warranty'
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
        <div className="flex bg-brand-navy p-1 rounded-full border border-brand-blue/5 mb-5 shadow-inner">
          <button 
            onClick={() => setActiveType('non-warranty')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
              activeType === 'non-warranty' 
                ? 'bg-brand-yellow text-black shadow-md transform scale-[1.02]' 
                : 'text-white hover:text-white'
            }`}
          >
            <User className={`h-4 w-4 ${activeType === 'non-warranty' ? 'text-black' : 'text-white'}`} />
            Non-Warranty
          </button>
          <button 
            onClick={() => setActiveType('in-warranty')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
              activeType === 'in-warranty' 
                ? 'bg-brand-yellow text-black shadow-md transform scale-[1.02]' 
                : 'text-white hover:text-white'
            }`}
          >
            <Shield className={`h-4 w-4 ${activeType === 'in-warranty' ? 'text-black' : 'text-white'}`} />
            In-Warranty
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
            <button className="p-2 bg-slate-100 rounded-full relative">
              <Bell className="h-5 w-5 text-text-primary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
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
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-border-color rounded-2xl focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-sm"
          />
        </div>
        {/* Horizontal Categories */}
        <div className="flex overflow-x-auto gap-6 mt-4 pb-0 snap-x no-scrollbar">
          {[
            { name: 'For You', icon: <Sparkles className="h-5 w-5" />, path: '/dashboard' },
            { name: 'AC', icon: <Wind className="h-5 w-5" /> },
            { name: 'WM', icon: <WashingMachine className="h-5 w-5" /> },
            { name: 'Fridge', icon: <Refrigerator className="h-5 w-5" /> },
            { name: 'Electric', icon: <Zap className="h-5 w-5" /> },
            { name: 'Plumber', icon: <Droplets className="h-5 w-5" /> },
            { name: 'Cleaning', icon: <Sparkles className="h-5 w-5" /> }
          ].map((cat, index) => (
            <div 
              key={index}
              className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 snap-start"
              onClick={() => {
                if (activeType === 'in-warranty' && cat.name !== 'For You') {
                  setSelectedServiceForWarranty({ title: cat.name, price: 499 });
                  setShowWarrantyModal(true);
                } else if (cat.path) {
                  navigate(cat.path);
                } else {
                  navigate(`/service-details?service=${encodeURIComponent(cat.name)}`);
                }
              }}
            >
              <div className="text-brand-blue">
                {cat.icon}
              </div>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">
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
              {activeType === 'in-warranty' ? 'Covered Benefits' : 'Warranty Offers'}
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
                  if (activeType === 'in-warranty') {
                    setSelectedServiceForWarranty(service);
                    setShowWarrantyModal(true);
                  } else {
                    navigate(service.path || `/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
                  }
                }}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-brand-blue transition-all"
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
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40">
        <button className="flex flex-col items-center text-brand-blue">
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/services')}
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
          onClick={() => navigate('/services')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Wrench className="h-6 w-6" />
          <span className="text-xs font-medium">Services</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
