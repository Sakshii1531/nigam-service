import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, PhoneOff, Zap, CreditCard, Star, Bell, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  { id: 1, title: 'Live Tracking', desc: 'Real-time technician tracking on map.', icon: MapPin },
  { id: 2, title: 'Google Maps', desc: 'Seamless navigation and location services.', icon: MapPin },
  { id: 3, title: 'AI Assignment', desc: 'Smart matching for the best technician.', icon: Zap },
  { id: 4, title: 'Number Masking', desc: 'Secure communication for privacy.', icon: PhoneOff },
  { id: 5, title: 'Warranty Vault', desc: 'Automated warranty management.', icon: ShieldCheck },
  { id: 6, title: 'Secure Payments', desc: 'Safe transactions via Razorpay/Stripe.', icon: CreditCard },
  { id: 7, title: 'Push Alerts', desc: 'Real-time updates on booking status.', icon: Bell },
  { id: 8, title: 'Admin Analytics', desc: 'Powerful data insights for operations.', icon: BarChart3 },
];

const Features = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatic slide timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 4000); // Har 4 second me change hoga
    return () => clearInterval(timer);
  }, []);

  const currentFeature = features[currentIndex];

  return (
    <section className="py-20 bg-bg-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="mt-2 text-3xl font-bold text-[#0d47a1] sm:text-4xl">Platform Capabilities</h2>
          <p className="mt-2 text-lg text-text-secondary">
            Advanced features designed for a secure, transparent, and efficient service experience.
          </p>
        </div>

        {/* Carousel Wrapper with 3D Perspective */}
        <div className="relative h-[400px] flex items-center justify-center mt-0" style={{ perspective: "1000px" }}>
          
          {features.map((feature, index) => {
            let position = index - currentIndex;
            
            // Handle loop
            if (position < -features.length / 2) position += features.length;
            if (position > features.length / 2) position -= features.length;
            
            // We only want to show -1, 0, 1
            if (Math.abs(position) > 1) return null;
            
            const isCenter = position === 0;
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.id}
                animate={{
                  x: position * 320,
                  scale: isCenter ? 1 : 0.8,
                  opacity: isCenter ? 1 : 0.7,
                  rotateY: position * -25,
                  zIndex: isCenter ? 10 : 0,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 w-[350px] absolute flex flex-col items-center text-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0d47a1] mb-5 border border-blue-100 shadow-sm">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}

        </div>


      </div>
    </section>
  );
};

export default Features;
