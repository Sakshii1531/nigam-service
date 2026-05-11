import React, { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
  {
    id: 1,
    name: 'Anjali Sharma',
    role: 'Homeowner',
    content: 'The AC repair service was incredibly fast. The technician arrived on time and fixed the issue within 30 minutes. Highly recommended!',
    rating: 5,
    initials: 'AS',
    color: 'bg-blue-50 text-brand-blue'
  },
  {
    id: 2,
    name: 'Rohan Mehta',
    role: 'Software Engineer',
    content: 'I love the live tracking feature. I could see exactly when the plumber would arrive, so I didn\'t have to waste my whole day waiting.',
    rating: 5,
    initials: 'RM',
    color: 'bg-blue-50 text-brand-blue'
  },
  {
    id: 3,
    name: 'Priya Patel',
    role: 'Business Owner',
    content: 'The smart warranty feature saved me money. It automatically detected that my washing machine was still under warranty. Great experience!',
    rating: 4,
    initials: 'PP',
    color: 'bg-blue-50 text-brand-blue'
  }
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 bg-bg-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="text-left">
            <span className="inline-block text-xs font-semibold text-yellow-600 uppercase tracking-wider bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">Reviews</span>
            <h2 className="mt-3 text-3xl font-bold text-[#0d47a1] sm:text-4xl">What Our Customers Say</h2>
            <p className="mt-2 text-lg text-text-secondary max-w-lg">
              Don't just take our word for it. Here is what our users have to say about their experience with our platform.
            </p>
            
            {/* Trust Stats */}
            <div className="mt-8 grid grid-cols-2 gap-6 max-w-md">
              <div className="border-l-4 border-yellow-500 pl-4">
                <p className="text-2xl font-bold text-text-primary">4.9/5</p>
                <p className="text-xs font-medium text-text-secondary mt-1">Average Rating</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <p className="text-2xl font-bold text-text-primary">10k+</p>
                <p className="text-xs font-medium text-text-secondary mt-1">Happy Customers</p>
              </div>
            </div>
          </div>

          {/* Right Side Carousel */}
          <div className="relative h-[350px] flex items-center justify-center" style={{ perspective: "1000px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, rotateY: 45, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -45, x: -100 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="bg-white p-8 rounded-3xl border border-border-color shadow-xl w-full max-w-md absolute"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Large Decorative Quote Icon */}
                <div className="absolute top-2 right-8 text-slate-100/80 text-7xl font-serif leading-none select-none">”</div>
                
                {/* Verified Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </div>
                
                {/* Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                  {[...Array(5 - currentTestimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-slate-200 fill-none" />
                  ))}
                </div>
                
                {/* Content */}
                <p className="text-text-primary text-base font-medium leading-relaxed mb-6">
                  "{currentTestimonial.content}"
                </p>
                
                {/* Author */}
                <div className="flex items-center gap-4 pt-5 border-t border-slate-100">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-sm border-2 border-white ring-2 ring-blue-50 ${currentTestimonial.color}`}>
                    {currentTestimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{currentTestimonial.name}</p>
                    <p className="text-xs font-medium text-text-secondary">{currentTestimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Testimonials;
