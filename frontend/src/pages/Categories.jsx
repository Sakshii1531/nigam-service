import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home as HomeIcon, ShoppingCart, Calendar, Wrench, User, LayoutGrid } from 'lucide-react';

// Import images for Sidebar
import handymanSidebar from '../assets/categories/plumber_fixed.png';
import applianceSidebar from '../assets/categories/ac.png';
import cleaningSidebar from '../assets/categories/cleaning.png';
import paintingSidebar from '../assets/categories/spa.png';
import moversSidebar from '../assets/categories/security_system.png';

// Import images for Subcategories
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import sofaImg from '../assets/cleaning_sofa.png';
import tileImg from '../assets/cleaning_bathroom_1.png';
import tvImg from '../assets/categories/television.png';
import acImg from '../assets/categories/split_ac.png';
import roImg from '../assets/categories/water_purifier.png';
import wmImg from '../assets/categories/wasing.png';
import fridgeImg from '../assets/appliance_fridge.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';

// 3D premium icon assets
import iconAc from '../assets/icon_3d_ac.png';
import iconGeyser from '../assets/icon_3d_geyser.png';
import iconRo from '../assets/icon_3d_ro.png';
import iconTv from '../assets/icon_3d_tv.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconOven from '../assets/icon_3d_oven.png';
import iconFridge from '../assets/icon_3d_fridge.png';
import iconWm from '../assets/icon_3d_wm.png';

const Categories = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('handyman');

  // Sidebar Categories definition matching screenshots
  const sidebarCategories = [
    { id: 'handyman', name: 'Handyman Services', image: handymanSidebar },
    { id: 'appliance', name: 'Appliance Repair', image: applianceSidebar },
    { id: 'cleaning', name: 'Cleaning & Pest Control', image: cleaningSidebar },
    { id: 'painting', name: 'Painting & Water proofing', image: paintingSidebar },
    { id: 'movers', name: 'Movers & Storage', image: moversSidebar },
    { id: 'renovation', name: 'Renovation', image: handymanSidebar }
  ];

  // Render Subcategory content based on activeCategory
  const getSubcategoryContent = () => {
    switch (activeCategory) {
      case 'handyman':
        return (
          <>
            {/* Maintenance Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Maintenance</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Electrician', img: electricianImg },
                  { name: 'Carpenter', img: plumberImg },
                  { name: 'Plumber', img: plumberImg },
                  { name: 'Sofa Repair', img: sofaImg },
                  { name: 'Tile Grouting', img: tileImg }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Installation Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Installation</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Furniture Assembly', img: plumberImg },
                  { name: 'TV Installation', img: tvImg },
                  { name: 'Hanger Installation', img: plumberImg },
                  { name: 'Mosquito Mesh', img: electricianImg },
                  { name: 'Safety Net', img: electricianImg }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AC & Appliance Repair Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">AC & Appliance Repair</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'AC Repair & Services', img: iconAc },
                  { name: 'Geyser Repair & Services', img: iconGeyser },
                  { name: 'Water Purifier & Services', img: iconRo },
                  { name: 'TV Repair & Services', img: iconTv }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kitchen and Appliance Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Kitchen and Appliance</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Chimney Repair & Services', img: iconChimney },
                  { name: 'Gas Stove & Hob Services', img: iconOven },
                  { name: 'Microwave Repair & Services', img: iconOven },
                  { name: 'Refrigerator Repair & Services', img: iconFridge },
                  { name: 'Washing Machine Repair', img: iconWm },
                  { name: 'Gas Pipeline Installation', img: iconOven }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cleaning Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Cleaning</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Full house cleaning', img: cleaningSidebar },
                  { name: 'Bathroom cleaning', img: tileImg },
                  { name: 'Kitchen Cleaning', img: cleaningKitchen }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'appliance':
        return (
          <>
            {/* AC & Appliance Repair Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">AC & Appliance Repair</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'AC Repair & Services', img: iconAc },
                  { name: 'Geyser Repair & Services', img: iconGeyser },
                  { name: 'Water Purifier & Services', img: iconRo },
                  { name: 'TV Repair & Services', img: iconTv }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kitchen and Appliance Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Kitchen and Appliance</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Chimney Repair & Services', img: iconChimney },
                  { name: 'Gas Stove & Hob Services', img: iconOven },
                  { name: 'Microwave Repair & Services', img: iconOven },
                  { name: 'Refrigerator Repair & Services', img: iconFridge },
                  { name: 'Washing Machine Repair', img: iconWm },
                  { name: 'Gas Pipeline Installation', img: iconOven }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'cleaning':
        return (
          <>
            {/* Cleaning Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Cleaning</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Full house cleaning', img: cleaningSidebar },
                  { name: 'Bathroom cleaning', img: tileImg },
                  { name: 'Kitchen Cleaning', img: cleaningKitchen },
                  { name: 'Sofa, Carpet & Mattress Cleaning', img: sofaImg },
                  { name: 'Water Tank & Sump Cleaning', img: tileImg },
                  { name: 'Marble Polishing', img: cleaningCarpet }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pest Control Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Pest Control</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Pest control', img: cleaningSidebar },
                  { name: 'Cockroach Control Treatment', img: cleaningSidebar },
                  { name: 'Bed Bug Control Treatment', img: cleaningSidebar },
                  { name: 'Rodent Control Treatment', img: cleaningSidebar },
                  { name: 'Termite Control', img: cleaningSidebar }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Painting & Waterproofing Section */}
            <div>
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Painting & Water proofing</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { name: 'Wall Painting', img: electricianImg },
                  { name: 'Waterproofing', img: plumberImg }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                  >
                    <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'painting':
        return (
          <div>
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Painting & Water proofing</h3>
            <div className="grid grid-cols-3 gap-y-4 gap-x-2">
              {[
                { name: 'Wall Painting', img: electricianImg },
                { name: 'Waterproofing', img: plumberImg }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                >
                  <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                    <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'movers':
        return (
          <div>
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Movers & Storage</h3>
            <div className="grid grid-cols-3 gap-y-4 gap-x-2">
              {[
                { name: 'Home Shifting', img: moversSidebar },
                { name: 'Office Relocation', img: moversSidebar }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                >
                  <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                    <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'renovation':
        return (
          <div>
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-wider">Renovation</h3>
            <div className="grid grid-cols-3 gap-y-4 gap-x-2">
              {[
                { name: 'Home Renovation', img: moversSidebar },
                { name: 'Kitchen Renovation', img: moversSidebar },
                { name: 'Bathroom Renovation', img: moversSidebar }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => navigate(`/service-details?service=${encodeURIComponent(item.name)}`)}
                >
                  <div className="w-18 h-18 bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm hover:shadow-md transition-shadow">
                    <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 text-center mt-1.5 w-18 leading-tight">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden pb-16 relative">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-0 flex items-center gap-3 shadow-sm border-b border-slate-100 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 flex-1 text-center pr-8">Categories</h1>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-24 bg-[#EAF4FF]/50 border-r border-slate-100 flex flex-col py-3 overflow-y-auto select-none flex-shrink-0">
          {sidebarCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 py-4 cursor-pointer border-l-4 transition-all ${
                  isActive 
                    ? 'border-[#0D47A1] bg-white text-[#0D47A1]' 
                    : 'border-transparent text-slate-500 hover:bg-white/30'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center p-1 transition-all ${
                  isActive ? 'bg-[#EAF4FF] scale-105 shadow-sm' : 'bg-slate-100'
                }`}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                </div>
                <span className={`text-[11px] font-extrabold text-center px-1 leading-tight w-full mt-1 transition-colors ${
                  isActive ? 'text-[#0D47A1]' : 'text-slate-500'
                }`}>
                  {cat.name
                    .replace('Services', '')
                    .replace('& Pest Control', '')
                    .replace('& Water proofing', '')
                    .replace('& Storage', '')
                    .trim()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-[#F8FAFC] p-4.5 overflow-y-auto flex flex-col gap-6">
          {getSubcategoryContent()}
        </div>
      </div>

      {/* Bottom Menu Bar (Custom Tabs) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-6 flex justify-between items-center z-50 shadow-md overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-brand-blue"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        {/* Floating Buy Button */}
        <div className="relative flex flex-col items-center z-50">
          <button 
            onClick={() => navigate('/buy')}
            className="w-14 h-14 bg-[#0D47A1] rounded-full flex items-center justify-center border-[5px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.15)] text-white cursor-pointer active:scale-95 transition-all -mt-7"
          >
            <ShoppingCart className="h-5 w-5 text-white" />
          </button>
          <span className="text-[10px] font-black text-[#0D47A1] mt-1.5 uppercase tracking-wider">Buy</span>
        </div>

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
    </div>
  );
};

export default Categories;
