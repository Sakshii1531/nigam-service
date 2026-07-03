import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ShieldCheck, PhoneOff, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    id: 1,
    title: "Book Services Instantly",
    description: "Get expert help at your doorstep with just a few taps. Reliable and fast.",
    icon: <Smartphone className="h-16 w-16 text-[#0D47A1]" />,
    bg: "bg-[#EEF4FF]"
  },
  {
    id: 2,
    title: "Smart Warranty Detection",
    description: "Upload invoices and automatically detect active warranties to save money.",
    icon: <ShieldCheck className="h-16 w-16 text-[#0D47A1]" />,
    bg: "bg-[#F0FDF4]"
  },
  {
    id: 3,
    title: "Secure Masked Chat",
    description: "Chat with your technician securely — your phone number always stays private and masked.",
    icon: <PhoneOff className="h-16 w-16 text-[#0D47A1]" />,
    bg: "bg-[#FFFBEB]"
  }
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/login');
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px]">
        
        {/* Header */}
        <div className="p-6 flex justify-between items-center">
          <span className="text-sm font-semibold text-text-secondary">
            {currentSlide + 1} / {slides.length}
          </span>
          <button 
            onClick={handleSkip}
            className="text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content (Slide) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className={`w-32 h-32 ${slides[currentSlide].bg} rounded-full flex items-center justify-center mb-8`}>
                {slides[currentSlide].icon}
              </div>
              
              <h1 className="text-2xl font-bold text-[#0d47a1] mb-4">
                {slides[currentSlide].title}
              </h1>
              
              <p className="text-text-secondary text-base max-w-sm">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer / Controls */}
        <div className="p-8 flex flex-col items-center gap-6">
          {/* Progress Dots */}
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <div 
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-6 bg-[#0D47A1]' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={handleNext}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-md"
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
