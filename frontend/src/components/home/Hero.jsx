import React from 'react';
import { Search, Star, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import heroImg from '../../assets/home.png';

const Hero = () => {
  return (
    <section className="relative bg-bg-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pt-10 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left md:-mt-16"
          >
            <span className="text-sm font-semibold text-[#fcd801] uppercase tracking-wider border border-[#fcd801] rounded-full px-3 py-1 inline-block">Nigam Care Company (NCC)</span>
            <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight">
              Smart Appliance & <br />
              <span className="text-[#014492]">Home Service Platform</span>
            </h1>
            <p className="mt-5 text-base text-text-secondary max-w-xl">
              Book verified professionals for AC repair, cleaning, plumbing, and more. Transparent pricing and smart warranty tracking included.
            </p>

            {/* Search Bar */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="flex-1 flex items-center bg-white border border-border-color rounded-xl px-4 py-2 hover:border-brand-blue/30 transition-colors">
                <Search className="h-4 w-4 text-text-secondary mr-3" />
                <input 
                  type="text" 
                  placeholder="What service do you need?" 
                  className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-secondary"
                />
              </div>
              <button className="bg-brand-blue text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm whitespace-nowrap">
                Book a Service
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-text-secondary max-w-2xl">
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#014492]/30 p-4 rounded-xl shadow-sm hover:border-brand-blue/50 hover:shadow-md transition-all h-24 cursor-pointer group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-brand-yellow mb-2 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="text-[#014492] font-semibold text-sm">4.8/5 Star</p>
                  <p className="text-xs text-text-secondary">Rating</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#014492]/30 p-4 rounded-xl shadow-sm hover:border-brand-blue/50 hover:shadow-md transition-all h-24 cursor-pointer group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-brand-blue mb-2 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[#014492] font-semibold text-sm">Verified</p>
                  <p className="text-xs text-text-secondary">Professionals</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#014492]/30 p-4 rounded-xl shadow-sm hover:border-brand-blue/50 hover:shadow-md transition-all h-24 cursor-pointer group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-brand-blue mb-2 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[#014492] font-semibold text-sm">Instant</p>
                  <p className="text-xs text-text-secondary">Booking</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative justify-self-center lg:justify-self-end"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-lg mx-auto">
              {/* Decorative background shapes */}
              <div className="absolute top-10 right-10 w-72 h-72 bg-section-bg rounded-full filter blur-3xl opacity-70 -z-10"></div>
              
              <img 
                src={heroImg} 
                alt="Service Technician" 
                className="w-full h-auto rounded-3xl subtle-shadow bg-white"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
