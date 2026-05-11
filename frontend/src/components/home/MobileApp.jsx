import React from 'react';
import { Smartphone, Download, Apple } from 'lucide-react';
import { motion } from 'framer-motion';
import appVideo from '../../assets/video.mp4';

const MobileApp = () => {
  return (
    <section className="py-20 bg-bg-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Mockup */}
          <div className="relative justify-self-center lg:justify-self-start">
            {/* Mock Tablet Frame */}
            <div className="relative w-[500px] h-[350px] bg-white rounded-[30px] border-[12px] border-text-primary shadow-2xl overflow-hidden">
              {/* Camera dot */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-text-primary rounded-full z-20"></div>
              
              {/* Screen Content - Video */}
              <video 
                src={appVideo} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            {/* Decorative background circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full -z-10 filter blur-2xl opacity-50"></div>
          </div>

          {/* Right Content */}
          <div className="text-left">
            <span className="inline-block text-xs font-semibold text-yellow-600 uppercase tracking-wider bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">Download App</span>
            <h2 className="mt-3 text-3xl font-bold text-[#0d47a1] sm:text-4xl">All Services in Your Pocket</h2>
            <p className="mt-1 text-lg text-text-secondary max-w-lg">
              Download the Nigam Care app to book services, track technicians, and manage your appliance warranties on the go.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-medium hover:bg-blue-800 transition-colors flex items-center gap-3 shadow-sm">
                <Apple className="h-6 w-6" />
                <div className="text-left">
                  <span className="text-xs block">Download on the</span>
                  <span className="text-sm font-bold">App Store</span>
                </div>
              </button>
              
              <button className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-medium hover:bg-blue-800 transition-colors flex items-center gap-3 shadow-sm">
                <Download className="h-6 w-6" />
                <div className="text-left">
                  <span className="text-xs block">Get it on</span>
                  <span className="text-sm font-bold">Google Play</span>
                </div>
              </button>
            </div>
            
            <div className="mt-8 flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-brand-yellow border-2 border-white flex items-center justify-center text-xs font-semibold text-text-primary">A</div>
                <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-brand-blue">B</div>
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-text-primary">C</div>
              </div>
              <span>Join 50,000+ users already using the app</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default MobileApp;
