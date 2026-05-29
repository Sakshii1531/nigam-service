import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Laptop, ShieldCheck, Flame, Wind, Droplet, Home as HomeIcon, ShoppingCart, Calendar, Wrench, User, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

// Import existing assets for high-fidelity rendering
import handshakeIcon from '../assets/HANDSHAKE.png';
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import laptopPeripheralImg from '../assets/categories/laptop_peripheral.png';
import kitchenApplianceImg from '../assets/categories/kitchen_appliance.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import securitySystemImg from '../assets/categories/security_system.png';

const PartnerWarranty = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-16">
      
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-border-color shadow-sm relative">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-text-primary" />
        </button>
        
        <h1 className="text-base font-bold text-text-primary text-center flex-1 pr-9">
          Partner Warranty
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        
        {/* Authorized Brand Support Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-blue-50 rounded-2xl p-5 border border-border-color shadow-sm flex items-center gap-4 relative overflow-hidden"
        >
          {/* Subtle blue accent background effect */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl"></div>
          
          <div className="w-14 h-14 bg-brand-navy rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <img 
              src={handshakeIcon} 
              alt="Authorized Brand Support" 
              className="w-10 h-10 object-contain" 
            />
          </div>
          
          <div className="flex flex-col flex-1 relative z-10">
            <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
              Authorized Brand Support
            </h3>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Raise a warranty request for your NCC Partner Brand products.
            </p>
          </div>
        </motion.div>

        {/* Section: Choose a Category */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black text-text-primary uppercase tracking-wider pl-1">
            Choose a Category
          </h2>

          {/* Category Cards List */}
          <div className="flex flex-col gap-3.5">
            
            {/* Card 1: ElectroCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              onClick={() => navigate('/partner-warranty/brands/electrocare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for Refrigerator + Washing Machine */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={fridgeImg} 
                  alt="Refrigerator" 
                  className="w-10 h-16 object-contain absolute left-1 bottom-1 mix-blend-multiply" 
                />
                <img 
                  src={washingImg} 
                  alt="Washing Machine" 
                  className="w-8 h-8 object-contain absolute right-1 bottom-1 mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  ElectroCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  Home Appliances & Electronics
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 2: BathCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              onClick={() => navigate('/partner-warranty/brands/bathcare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for BathCare/Plumbing */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={plumberImg} 
                  alt="Plumbing Care" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  BathCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  Sanitaryware & Bath Products
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 3: IT&CPCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              onClick={() => navigate('/partner-warranty/brands/it-cpcare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for IT Peripherals */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={laptopPeripheralImg} 
                  alt="Laptop & Peripherals" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  IT&CPCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  IT & Computer Peripherals
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 4: KitchenCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              onClick={() => navigate('/partner-warranty/brands/kitchencare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for KitchenCare */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={kitchenApplianceImg} 
                  alt="Kitchen Appliances" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  KitchenCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  Ovens, Chimneys & Kitchenware
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 5: AirCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              onClick={() => navigate('/partner-warranty/brands/aircare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for AirCare */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={splitAcImg} 
                  alt="Air Conditioner" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  AirCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  ACs, Coolers & Air Purifiers
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 6: WaterCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              onClick={() => navigate('/partner-warranty/brands/watercare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for WaterCare */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={waterPurifierImg} 
                  alt="Water Purifier" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  WaterCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  Water Purifiers & Geysers
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

            {/* Card 7: SecureCare */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              onClick={() => navigate('/partner-warranty/brands/securecare')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300"
            >
              {/* Image Container for SecureCare */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <img 
                  src={securitySystemImg} 
                  alt="Smart Security System" 
                  className="w-16 h-16 object-contain mix-blend-multiply" 
                />
              </div>

              {/* Text Container */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">
                  SecureCare
                </h3>
                <p className="text-[11px] text-text-secondary font-medium leading-tight">
                  Security Systems & Smart Locks
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
            </motion.div>

          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
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

export default PartnerWarranty;
