import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Import local premium cutout assets for high-fidelity rendering
import acImg from '../assets/categories/split_ac.png';
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import microwaveImg from '../assets/categories/kitchen_appliance.png';
import tvImg from '../assets/categories/television.png';
import dishwasherImg from '../assets/categories/dishwasher.png';

// General placeholder icons/fallbacks for other categories
import plumberImg from '../assets/categories/plumber_fixed.png';
import laptopImg from '../assets/categories/laptop_peripheral.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import securityImg from '../assets/categories/security_system.png';

const PRODUCTS_DATA = {
  electrocare: [
    { id: 'air-conditioner', name: 'Air Conditioner', image: acImg },
    { id: 'refrigerator', name: 'Refrigerator', image: fridgeImg },
    { id: 'washing-machine', name: 'Washing Machine', image: washingImg },
    { id: 'microwave-oven', name: 'Microwave Oven', image: microwaveImg },
    { id: 'television', name: 'Television', image: tvImg },
    { id: 'dishwasher', name: 'Dishwasher', image: dishwasherImg }
  ],
  bathcare: [
    { id: 'faucet', name: 'Premium Faucet / Tap', image: plumberImg },
    { id: 'shower', name: 'Thermostatic Shower', image: plumberImg },
    { id: 'toilet-commode', name: 'Smart Commode / Water Closet', image: plumberImg },
    { id: 'wash-basin', name: 'Designer Wash Basin', image: plumberImg },
    { id: 'bathtub', name: 'Jacuzzi & Bathtub', image: plumberImg }
  ],
  'it-cpcare': [
    { id: 'laptop', name: 'Business Laptop', image: laptopImg },
    { id: 'desktop-pc', name: 'All-in-One Desktop', image: laptopImg },
    { id: 'monitor', name: 'UHD Gaming Monitor', image: laptopImg },
    { id: 'printer', name: 'LaserJet Printer', image: laptopImg },
    { id: 'router', name: 'Wi-Fi 6 Router', image: laptopImg }
  ],
  kitchencare: [
    { id: 'chimney', name: 'Auto-Clean Chimney', image: microwaveImg },
    { id: 'cooktop', name: 'Induction Cooktop', image: microwaveImg },
    { id: 'hob', name: 'Built-in Gas Hob', image: microwaveImg },
    { id: 'air-fryer', name: 'Digital Air Fryer', image: microwaveImg }
  ],
  aircare: [
    { id: 'split-ac', name: 'Inverter Split AC', image: acImg },
    { id: 'cassette-ac', name: 'Cassette AC', image: acImg },
    { id: 'air-cooler', name: 'Tower Air Cooler', image: acImg },
    { id: 'air-purifier', name: 'HEPA Air Purifier', image: acImg }
  ],
  watercare: [
    { id: 'water-purifier', name: 'RO + UV Water Purifier', image: waterPurifierImg },
    { id: 'water-softener', name: 'Whole House Water Softener', image: waterPurifierImg },
    { id: 'geyser', name: 'Digital Storage Geyser', image: waterPurifierImg },
    { id: 'instant-heater', name: 'Instant Water Heater', image: waterPurifierImg }
  ],
  securecare: [
    { id: 'smart-lock', name: 'Biometric Smart Lock', image: securityImg },
    { id: 'cctv-camera', name: '360° Wi-Fi CCTV Camera', image: securityImg },
    { id: 'video-doorbell', name: 'Smart Video Doorbell', image: securityImg },
    { id: 'alarm-system', name: 'Intrusion Alarm System', image: securityImg }
  ]
};

const SelectProduct = () => {
  const navigate = useNavigate();
  const { category, brand } = useParams();

  // Get products based on category key
  const products = PRODUCTS_DATA[category] || PRODUCTS_DATA['electrocare'];

  // Convert brand ID to readable uppercase word
  const brandTitle = brand ? brand.toUpperCase() : 'Brand';

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button 
          onClick={() => navigate(`/partner-warranty/brands/${category}`)}
          className="p-2 bg-slate-50 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">
          {brandTitle}
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        
        {/* Title */}
        <h2 className="text-lg font-black text-black tracking-wide pl-1">
          Select Product
        </h2>

        {/* Product List - individual rows */}
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/partner-warranty/issues/${category}/${brand}/${product.id}`)}
              className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl"
            >
              <div className="flex items-center gap-5">
                {/* Image Wrapper */}
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0 border border-slate-100/50">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-12 h-12 object-contain mix-blend-multiply" 
                  />
                </div>
                
                {/* Name */}
                <span className="text-sm font-black text-brand-navy">
                  {product.name}
                </span>
              </div>
              
              <ChevronRight className="h-5 w-5 text-text-secondary" />
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};

export default SelectProduct;
