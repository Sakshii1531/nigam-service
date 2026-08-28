import React from 'react';
import { ArrowLeft, Home as HomeIcon, Calendar, LayoutGrid, User, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import acImg from '../assets/categories/ac.png';
import wasingImg from '../assets/categories/wasing.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';
import saloonImg from '../assets/categories/saloon.png';
import spaImg from '../assets/categories/spa.png';
import fridgeImg from '../assets/appliance_fridge.png';

const AllServices = () => {
  const navigate = useNavigate();

  const services = [
    { id: 1, name: 'AC Repair', img: acImg },
    { id: 2, name: 'Washing Machine', img: wasingImg },
    { id: 3, name: 'Electrician', img: electricianImg },
    { id: 4, name: 'Plumber', img: plumberImg },
    { id: 5, name: 'Full Home Cleaning', img: cleaningImg },
    { id: 6, name: 'Salon for Women', img: saloonImg },
    { id: 7, name: 'Spa & Massage', img: spaImg },
    { id: 8, name: 'Refrigerator Service', img: fridgeImg },
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20 lg:pb-8">
      

      {/* Header — mobile only */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">All Services</h1>
      </div>

      {/* Services Grid */}
      <div className="p-6 md:p-8 max-w-screen-lg mx-auto w-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-5">
          {services.map((service) => (
            <div 
              key={service.id}
              onClick={() => navigate(`/service-details?service=${encodeURIComponent(service.name)}`)}
              className="flex flex-col items-center gap-2 cursor-pointer md:bg-white md:border md:border-border-color md:rounded-2xl md:p-4 md:hover:border-brand-blue md:hover:shadow-sm md:transition-all"
            >
              <div className="w-20 h-20 md:w-full md:h-auto md:aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm md:shadow-none hover:border-[#0D47A1] border border-transparent md:border-0 transition-all overflow-hidden p-2">
                <img src={service.img} alt={service.name} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <span className="text-xs font-semibold text-text-primary text-center truncate md:whitespace-normal md:leading-tight w-full">
                {service.name}
              </span>
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

    </div>
  );
};

export default AllServices;
