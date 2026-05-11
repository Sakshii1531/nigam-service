import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, MapPin, Star } from 'lucide-react';

const Tracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isRefrigerator = searchParams.get('service') === 'refrigerator';

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      
      {/* Header (Floating) */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl flex items-center shadow-sm border border-border-color">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-sm font-bold text-text-primary ml-3">Track Order</h1>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <iframe 
          className="absolute inset-0 w-full h-full border-0"
          src="https://maps.google.com/maps?q=28.6139,77.2090&z=14&output=embed"
          allowFullScreen=""
          loading="lazy"
          title="Map"
        ></iframe>

        {/* Floating ETA Card */}
        <div className="absolute top-20 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-border-color max-w-[130px]">
          <span className="text-xs text-text-secondary block font-medium">ETA</span>
          <span className="text-base font-bold text-[#0D47A1]">12 Mins</span>
          <span className="text-xs text-text-secondary block mt-0.5">Distance: 2.4 km</span>
        </div>
      </div>

      {/* Bottom Card (Technician Details) */}
      <div className="bg-[#E3ECF9] p-5 rounded-t-[30px] shadow-lg z-10 border-t border-border-color">
        
        {/* Status */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs text-text-secondary block font-medium">Status</span>
            <span className="text-xs font-bold text-text-primary">On the way for AC Repair</span>
          </div>
          <span className="text-xs font-bold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-full">
            Live
          </span>
        </div>

        {/* Profile */}
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-5 flex items-center gap-3">
          <div className="w-11 h-11 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            R
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Rahul Sharma</h3>
            {isRefrigerator && (
              <span className="text-xs text-[#0D47A1] font-semibold block">Refrigerator Specialist</span>
            )}
            <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-text-primary">4.8</span>
              <span>(120+ reviews)</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="p-2.5 bg-[#E3ECF9] rounded-full hover:bg-[#D0E0F5] transition-colors">
              <Phone className="h-4.5 w-4.5 text-[#0D47A1]" />
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="p-2.5 bg-[#E3ECF9] rounded-full hover:bg-[#D0E0F5] transition-colors"
            >
              <MessageCircle className="h-4.5 w-4.5 text-[#0D47A1]" />
            </button>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-white/80 p-3 rounded-xl text-center text-xs text-text-secondary flex items-center justify-center gap-1.5 shadow-sm">
          <span>🔒</span>
          <span>Your phone number is masked for security.</span>
        </div>

      </div>

    </div>
  );
};

export default Tracking;
