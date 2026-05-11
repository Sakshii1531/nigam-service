import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mostBookedAc1 from '../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../assets/most_booked_ac_2.png';
import mostBookedWm from '../assets/most_booked_wm.png';
import applianceFridge from '../assets/appliance_fridge.png';

const AllApplianceServices = () => {
  const navigate = useNavigate();

  const services = [
    { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant" },
    { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant" },
    { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant" },
    { id: 4, title: "Refrigerator Repair", image: applianceFridge, rating: 4.80, price: 899, badge: "Instant" },
    { id: 5, title: "Deep Clean AC", image: mostBookedAc1, rating: 4.76, price: 1198, badge: "2 ACs" },
    { id: 6, title: "WM Checkup", image: mostBookedWm, rating: 4.85, price: 199, badge: "Instant" }
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Appliance Repair & Service</h1>
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
  );
};

export default AllApplianceServices;
