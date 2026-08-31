import React from 'react';
import { ArrowLeft, Star, Home as HomeIcon, Calendar, LayoutGrid, User, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/layout/Footer';

import mostBookedAc1 from '../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../assets/most_booked_ac_2.png';
import mostBookedWm from '../assets/most_booked_wm.png';
import mostBookedCleaning from '../assets/most_booked_cleaning.png';
import mostBookedSalon from '../assets/most_booked_salon.png';
import applianceFridge from '../assets/appliance_fridge.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';

const AllServices = () => {
  const navigate = useNavigate();

  const allServiceCards = [
    { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, price: 649, badge: "Instant", rating: 4.76 },
    { id: 2, title: "AC repair", image: mostBookedAc2, price: 299, badge: "Instant", rating: 4.74 },
    { id: 3, title: "Washing Machine", image: mostBookedWm, price: 499, badge: "Instant", rating: 4.85 },
    { id: 4, title: "Home Cleaning", image: mostBookedCleaning, price: 999, badge: "Trending", rating: 4.9 },
    { id: 5, title: "Women Salon", image: mostBookedSalon, price: 799, badge: "Best Seller", rating: 4.8 },
    { id: 6, title: "Refrigerator Repair", image: applianceFridge, price: 899, badge: "Popular", rating: 4.82 },
    { id: 7, title: "Electrician Service", image: electricianImg, price: 199, badge: "Instant", rating: 4.75 },
    { id: 8, title: "Plumbing Checkup", image: plumberImg, price: 199, badge: "Instant", rating: 4.8 },
    { id: 9, title: "Deep Clean AC", image: mostBookedAc1, price: 1198, badge: "2 ACs", rating: 4.84 },
    { id: 10, title: "WM Complete Checkup", image: mostBookedWm, price: 199, badge: "Instant", rating: 4.7 },
    { id: 11, title: "Full Home Sanitize", image: cleaningImg, price: 1299, badge: "Premium", rating: 4.92 },
    { id: 12, title: "Gas Refilling", image: mostBookedAc2, price: 1499, badge: "Best Price", rating: 4.88 }
  ];

  const handleCardClick = (service) => {
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
    const nameNorm = service.title.toLowerCase();
    const bookCat = Object.keys(APPLIANCE_ROUTES).find(k => nameNorm.includes(k));
    if (bookCat) {
      navigate(`/book/${encodeURIComponent(APPLIANCE_ROUTES[bookCat])}`);
    } else {
      navigate(`/booking?service=${encodeURIComponent(service.title)}&price=${service.price}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-12">
      {/* Top Header */}
      <div className="bg-[#E3ECF9] p-6 lg:py-8 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl lg:text-3xl font-black text-text-primary">All Services & Repairs</h1>
      </div>

      {/* Services Grid */}
      <div className="p-6 md:p-10 lg:px-16 xl:px-20 max-w-screen-2xl mx-auto w-full flex-1 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
          {allServiceCards.map((service) => (
            <div 
              key={service.id}
              onClick={() => handleCardClick(service)}
              className="flex flex-col gap-2.5 cursor-pointer border border-border-color rounded-2xl p-2.5 md:p-4 bg-white hover:border-brand-blue hover:shadow-md transition-all"
            >
              <div className="w-full h-32 md:h-44 lg:h-48 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full bg-[#E3F2FD] text-[#0D47A1]">
                  {service.badge}
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-sm md:text-base font-semibold md:font-bold text-text-primary truncate">
                  {service.title}
                </span>
                {service.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-text-secondary">{service.rating}</span>
                  </div>
                )}
                <span className="text-sm md:text-base font-bold md:font-extrabold text-[#0B4EA2]">
                  ₹{service.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-10 overflow-visible lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default AllServices;
