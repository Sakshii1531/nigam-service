import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cleaningBathroom1 from '../assets/cleaning_bathroom_1.png';
import cleaningBathroom2 from '../assets/cleaning_bathroom_2.png';
import cleaningSofa from '../assets/cleaning_sofa.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';

const AllCleaningServices = () => {
  const navigate = useNavigate();

  const services = [
    { id: 1, title: "Intense cleaning (2 bathrooms)", image: cleaningBathroom1, rating: 4.80, price: 872, originalPrice: 1038, badge: "8% OFF" },
    { id: 2, title: "Classic cleaning (2 bathrooms)", image: cleaningBathroom2, rating: 4.82, price: 794, originalPrice: 858, badge: "7% OFF" },
    { id: 3, title: "Sofa Deep Cleaning", image: cleaningSofa, rating: 4.75, price: 569, originalPrice: 699, badge: "18% OFF" },
    { id: 4, title: "Carpet Cleaning", image: cleaningCarpet, rating: 4.70, price: 899, originalPrice: 1199, badge: "25% OFF" },
    { id: 5, title: "Kitchen Deep Cleaning", image: cleaningKitchen, rating: 4.88, price: 1299, originalPrice: 1599, badge: "18% OFF" }
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Cleaning Essentials</h1>
      </div>

      {/* Services Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {services.map((service) => (
            <div 
              key={service.id}
              onClick={() => navigate('/booking')}
              className="flex flex-col gap-2 cursor-pointer border border-border-color rounded-2xl p-2 bg-white hover:border-[#0D47A1] transition-all"
            >
              <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center overflow-hidden relative">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 bg-[#2E7D32] text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0D47A1]">
                    ₹{service.price}
                  </span>
                  <span className="text-xs text-text-secondary line-through">
                    ₹{service.originalPrice}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllCleaningServices;
