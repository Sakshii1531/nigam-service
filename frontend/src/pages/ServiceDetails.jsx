import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, Check, Shield, Award } from 'lucide-react';

// Import assets
import acImg from '../assets/most_booked_ac_1.png';
import wasingImg from '../assets/most_booked_wm.png';
import cleaningImg from '../assets/most_booked_cleaning.png';
import saloonImg from '../assets/most_booked_salon.png';
import fridgeImg from '../assets/appliance_fridge.png';
// For others we can use a fallback or default icon/image

const ServiceDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const serviceName = searchParams.get('service') || 'AC Repair';

  const [selectedIssue, setSelectedIssue] = useState('');

  // Data mapping for all services
  const serviceData = {
    'AC Repair': {
      image: acImg,
      desc: 'Expert AC repair and servicing for all brands.',
      rating: '4.8',
      reviews: '250+',
      price: '₹299',
      issues: ['Not Cooling', 'Making Noise', 'Water Leakage', 'Gas Leakage', 'General Servicing'],
      includes: ['Filter cleaning', 'Cooling check', 'Gas pressure check', 'Internal inspection']
    },
    'Washing Machine': {
      image: wasingImg,
      desc: 'Professional repair for top load and front load machines.',
      rating: '4.7',
      reviews: '180+',
      price: '₹499',
      issues: ['Not Spinning', 'Water Not Draining', 'Strange Noise', 'Not Starting', 'Error Codes'],
      includes: ['Drum check', 'Motor inspection', 'Drainage check', 'Wiring check']
    },
    'Refrigerator Service': {
      image: fridgeImg,
      desc: 'Expert repair and maintenance for all refrigerator types.',
      rating: '4.8',
      reviews: '150+',
      price: '₹499',
      issues: ['Not Cooling', 'Water Leakage', 'Strange Noise', 'Not Starting', 'Excess Ice Formation'],
      includes: ['Deep cleaning', 'Cooling check', 'Gas inspection', 'Internal maintenance']
    },
    'Full Home Cleaning': {
      image: cleaningImg,
      desc: 'Deep cleaning for your entire home by professionals.',
      rating: '4.9',
      reviews: '300+',
      price: '₹999',
      issues: ['Deep Cleaning', 'Move-in Cleaning', 'Post Party Cleaning', 'Festive Cleaning'],
      includes: ['Bathroom cleaning', 'Kitchen cleaning', 'Floor scrubbing', 'Dusting & vacuuming']
    },
    'Salon for Women': {
      image: saloonImg,
      desc: 'Premium salon services at the comfort of your home.',
      rating: '4.8',
      reviews: '400+',
      price: '₹799',
      issues: ['Facial & Cleanup', 'Manicure & Pedicure', 'Hair Care', 'Waxing', 'Threading'],
      includes: ['Disposable kits', 'Branded products', 'Sterilized tools', 'Post-service cleanup']
    }
  };

  // Fallback for services not in the list
  const defaultData = {
    image: acImg,
    desc: 'Professional service by verified experts.',
    rating: '4.7',
    reviews: '100+',
    price: '₹399',
    issues: ['General Checkup', 'Repair', 'Installation', 'Maintenance'],
    includes: ['Expert inspection', 'Quality parts', 'Post-service check', 'Clean up']
  };

  const currentData = serviceData[serviceName] || defaultData;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Service Details</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Hero Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
          <div className="w-full h-48 bg-[#F5F8FC] rounded-xl flex items-center justify-center overflow-hidden">
            <img src={currentData.image} alt={serviceName} className="h-full object-contain p-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{serviceName}</h2>
            <p className="text-xs text-text-secondary mt-1">{currentData.desc}</p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-text-primary">{currentData.rating}</span>
              <span className="text-xs text-text-secondary">({currentData.reviews} reviews)</span>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="h-3 w-3" /> 30-day Warranty
              </span>
              <span className="text-xs font-semibold text-[#0D47A1] bg-[#E3ECF9] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="h-3 w-3" /> Top Rated
              </span>
            </div>
          </div>
        </div>

        {/* Issue Selection */}
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-3">What issue are you facing?</h3>
          <div className="grid grid-cols-2 gap-3">
            {currentData.issues.map((issue) => (
              <div 
                key={issue}
                onClick={() => setSelectedIssue(issue)}
                className={`p-3 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-20 ${selectedIssue === issue ? 'border-[#0D47A1] bg-[#E3ECF9]/50 shadow-sm' : 'border-border-color bg-white hover:border-[#0D47A1]'}`}
              >
                <span className={`text-xs font-semibold ${selectedIssue === issue ? 'text-[#0D47A1]' : 'text-text-primary'}`}>
                  {issue}
                </span>
                <div className="flex justify-end">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedIssue === issue ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-text-secondary'}`}>
                    {selectedIssue === issue && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Includes */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-color">
          <h3 className="text-sm font-bold text-text-primary mb-3">Service Includes</h3>
          <div className="grid grid-cols-2 gap-3">
            {currentData.includes.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#E8F5E9] rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-[#2E7D32]" />
                </div>
                <span className="text-xs text-text-primary">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-[#E3ECF9]/50 border border-[#BACBE7] p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-xs text-text-secondary block">Price</span>
            <span className="text-lg font-bold text-[#0D47A1]">Starting from {currentData.price}</span>
          </div>
          <span className="text-xs text-[#2E7D32] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded-full">
            Save up to 20%
          </span>
        </div>

      </div>

      {/* Footer / Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border-color shadow-lg flex justify-between items-center z-10">
        <div>
          <span className="text-xs text-text-secondary block">Total</span>
          <span className="text-base font-bold text-text-primary">{currentData.price}</span>
        </div>
        <button
          onClick={() => navigate(`/booking?service=${encodeURIComponent(serviceName)}`)}
          className="bg-[#FFD600] text-[#0D47A1] font-bold py-2.5 px-6 rounded-2xl hover:bg-yellow-400 transition-colors shadow-sm text-sm"
        >
          Book Service
        </button>
      </div>

    </div>
  );
};

export default ServiceDetails;
