import React from 'react';
import { MapPin, Navigation, Clock, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveTrackingPreview = () => {
  return (
    <section className="py-20 bg-bg-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="text-left">
            <span className="inline-block text-xs font-semibold text-yellow-600 uppercase tracking-wider bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">Live Tracking</span>
            <h2 className="mt-2 text-3xl font-bold text-[#0d47a1] sm:text-4xl">Track Your Technician</h2>
            <p className="mt-2 text-lg text-text-secondary max-w-lg">
              No more waiting in the dark. Know exactly where your technician is and when they will arrive with our real-time tracking system.
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-3 max-w-md">
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-border-color shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Accurate ETA updates</p>
                  <p className="text-xs text-text-secondary mt-0.5">Real-time arrival estimation.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-border-color shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue flex-shrink-0">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Live route preview on map</p>
                  <p className="text-xs text-text-secondary mt-0.5">Visual journey tracking.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Mockup */}
          <div className="relative h-[400px] bg-[#e8eaed] rounded-3xl overflow-hidden border border-border-color shadow-2xl">
            {/* Google Maps Controls (Right side) */}
            <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
              <button className="w-9 h-9 bg-white rounded-md shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L10 7l6-3 5.447 2.724A1 1 0 0122 7.618v10.764a1 1 0 01-1.447.894L15 17l-6 3z" /></svg>
              </button>
              <button className="w-9 h-9 bg-white rounded-md shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
              <button className="w-9 h-9 bg-white rounded-md shadow-md flex items-center justify-center text-blue-600 hover:bg-slate-50">
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>

            {/* Fake Map Features (Parks & Water) */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Park */}
              <path d="M 0 50 Q 50 20 100 50 T 200 100 L 200 0 L 0 0 Z" fill="#c3e0b5" />
              {/* River */}
              <path d="M 0 350 Q 100 300 200 320 T 400 300 L 400 350 L 0 350 Z" fill="#aad1f8" />
              {/* Labels */}
              <text x="50" y="30" fill="#7da56d" fontSize="10" fontWeight="bold">City Park</text>
              <text x="250" y="340" fill="#7099c2" fontSize="10" fontWeight="bold">Yamuna River</text>
            </svg>

            {/* Fake Road Lines in background */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Yellow Highway */}
              <path d="M 0 150 L 400 150" stroke="#ffeb3b" strokeWidth="16" fill="none" />
              <path d="M 0 150 L 400 150" stroke="#fbc02d" strokeWidth="12" fill="none" />
              
              {/* White Local Roads */}
              <path d="M 200 0 L 200 400" stroke="#ffffff" strokeWidth="12" fill="none" />
              <path d="M 200 0 L 200 400" stroke="#e0e0e0" strokeWidth="1" fill="none" />
              
              <path d="M 50 0 L 350 400" stroke="#ffffff" strokeWidth="8" fill="none" />
              <path d="M 50 0 L 350 400" stroke="#e0e0e0" strokeWidth="1" fill="none" />

              {/* Road Names */}
              <text x="150" y="145" fill="#a0a0a0" fontSize="8">Main Highway</text>
              <text x="210" y="50" fill="#a0a0a0" fontSize="8" transform="rotate(90, 210, 50)">Sector 10 Road</text>
            </svg>
            
            {/* Mock Route Line (Google Blue) */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Glow effect for route */}
              <path d="M 100 300 Q 200 200 300 100" fill="none" stroke="#1a73e8" strokeWidth="8" strokeOpacity="0.2" />
              
              {/* Moving Dashed Line */}
              <motion.path 
                d="M 100 300 Q 200 200 300 100" 
                fill="none" 
                stroke="#1a73e8" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="1 12"
                animate={{ strokeDashoffset: [0, -13] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Completed Path */}
              <path d="M 300 100 L 350 50" fill="none" stroke="#9aa0a6" strokeWidth="6" strokeLinecap="round" />
            </svg>

            {/* User Location (Google Style Blue Dot) */}
            <div className="absolute bottom-[100px] left-[100px] transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-[#1a73e8] rounded-full border-2 border-white shadow-lg"></div>
              <div className="w-12 h-12 bg-[#1a73e8]/30 rounded-full absolute -top-4 -left-4 animate-pulse"></div>
            </div>

            {/* Tech Location (Google Style Red Pin) */}
            <div className="absolute top-[100px] left-[300px] transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Pulse */}
                <div className="w-12 h-12 bg-red-500/20 rounded-full absolute -top-3 -left-3 animate-ping"></div>
                {/* Red Pin SVG */}
                <svg className="w-6 h-6 text-red-500 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              {/* ETA Badge on map */}
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-[#1a73e8] text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                12 min
              </div>
            </div>

            {/* Floating Info Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-5 left-5 right-5 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white shadow-inner">
                    <span className="font-bold">RK</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary">Rahul Kumar</p>
                      <span className="bg-yellow-50 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        4.9 ★
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">White Activa • En Route</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-9 h-9 bg-slate-50 text-brand-blue rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors border border-slate-100">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LiveTrackingPreview;
