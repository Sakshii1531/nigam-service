import React, { useEffect, useRef } from 'react';
import { Search, Bell, MapPin, Wrench, Zap, Droplet, Thermometer, Shield, Home as HomeIcon, Calendar, MessageSquare, User, Star } from 'lucide-react';
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
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#0D47A1]" />
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
              className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
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
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-border-color rounded-2xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        
        {/* Service Banners */}
        <div ref={bannerRef} className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 1, image: acBanner },
            { id: 2, image: electricianBanner },
            { id: 3, image: plumbingBanner }
          ].map((banner) => (
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
              className="text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
            >
              See All
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {services.map((service) => (
              <div 
                key={service.id}
                onClick={() => navigate(`/service-details?service=${encodeURIComponent(service.name)}`)}
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

        {/* Smart Warranty Promo */}
        {/* Smart Warranty Banners */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">Warranty Offers</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant" },
              { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant" },
              { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant" },
              { id: 4, title: "Home Cleaning", image: mostBookedCleaning, rating: 4.90, price: 999, badge: "Trending" },
              { id: 5, title: "Women Salon", image: mostBookedSalon, rating: 4.80, price: 799, badge: "Best Seller" }
            ].map((service) => (
              <div 
                key={service.id}
                onClick={() => navigate('/booking')}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-[#0D47A1] transition-all"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold px-2 py-0.5 rounded-full">
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
                  <span className="text-sm font-bold text-[#0D47A1]">
                    ₹{service.price}
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
              className="text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
            >
              See all
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                onClick={() => navigate(service.path)}
                className="flex flex-col gap-2 cursor-pointer flex-shrink-0 w-40 snap-start border border-border-color rounded-2xl p-2 bg-white hover:border-[#0D47A1] transition-all"
              >
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${service.badge === "2 ACs" ? "bg-[#5C0632] text-white" : "bg-[#E8F5E9] text-[#2E7D32]"}`}>
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
                  <span className="text-sm font-bold text-[#0D47A1]">
                    ₹{service.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center">
        <button className="flex flex-col items-center text-[#0D47A1]">
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/services')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Wrench className="h-6 w-6" />
          <span className="text-xs font-medium">Services</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
