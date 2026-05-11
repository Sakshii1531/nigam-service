import React from 'react';
import { motion } from 'framer-motion';

// Import images
import acImg from '../../assets/categories/ac.png';
import cleaningImg from '../../assets/categories/cleaning.png';
import electricianImg from '../../assets/categories/electrician_fixed.png';
import plumberImg from '../../assets/categories/plumber_fixed.png';
import saloonImg from '../../assets/categories/saloon.png';
import spaImg from '../../assets/categories/spa.png';
import wasingImg from '../../assets/categories/wasing.png';

const services = [
  { id: 1, name: 'AC Repair', img: acImg },
  { id: 2, name: 'Washing Machine', img: wasingImg },
  { id: 3, name: 'Electrician', img: electricianImg },
  { id: 4, name: 'Plumber', img: plumberImg },
  { id: 5, name: 'Full Home Cleaning', img: cleaningImg },
  { id: 6, name: 'Salon for Women', img: saloonImg },
  { id: 7, name: 'Spa & Massage', img: spaImg },
];

const PopularServices = () => {
  return (
    <section className="py-20 bg-[#fcd801]/20" style={{ borderTopLeftRadius: '50% 150px', borderTopRightRadius: '50% 150px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-4xl sm:text-5xl font-bold text-[#014492] uppercase tracking-wider">Categories</span>
          <p className="mt-1 text-lg text-black">
            Choose from our wide range of expert services. Quality guaranteed.
          </p>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-text-primary">Popular Services</h2>
        </div>

        <div className="mt-12 flex overflow-x-auto gap-16 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x no-scrollbar">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex flex-col items-center cursor-pointer group flex-shrink-0 w-60 snap-start"
            >
              <div className="w-52 h-52 overflow-hidden mb-3 flex items-center justify-center">
                <img src={service.img} alt={service.name} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <span className="text-sm font-medium text-text-primary text-center">{service.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularServices;
