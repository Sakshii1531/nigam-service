import React, { useRef } from 'react';
import { ClipboardList, ShieldCheck, UserCheck, PhoneForwarded, CheckCircle2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const steps = [
  { id: 1, title: 'Raise Request', desc: 'Select a service and book a convenient slot.', icon: ClipboardList },
  { id: 2, title: 'Smart Warranty', desc: 'System automatically detects product warranty.', icon: ShieldCheck },
  { id: 3, title: 'Tech Assignment', desc: 'Verified technician is assigned instantly.', icon: UserCheck },
  { id: 5, title: 'Secure Comms', desc: 'Masked calling for privacy and security.', icon: PhoneForwarded },
  { id: 6, title: 'Payment & Completion', desc: 'Rate the service and pay securely.', icon: CheckCircle2 },
];

const HowItWorks = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section className="py-20 bg-bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-[#f6d506] sm:text-5xl">Smart Workflow</h2>
          <p className="mt-1 text-lg text-[#002d62]">
            A seamless experience from booking to completion.
          </p>
        </div>

        <div ref={containerRef} className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 relative">
          {/* SVG for connecting lines (Desktop) */}
          <svg className="absolute inset-0 w-full h-full z-0 hidden lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path
              d="M 16.6 25 L 83.3 25 L 83.3 50 L 16.6 50 L 16.6 75 L 83.3 75"
              fill="none"
              stroke="#005c8a"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="0, 10"
              style={{ pathLength }}
            />
          </svg>

          {/* SVG for connecting lines (Mobile) */}
          <svg className="absolute inset-0 w-full h-full z-0 lg:hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path
              d="M 50 5 L 50 95"
              fill="none"
              stroke="#005c8a"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="0, 10"
              style={{ pathLength }}
            />
          </svg>
          
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden z-10 relative h-[200px] flex flex-col justify-between border-l-8 border-[#005c8a]"
            >
              {/* Dark blue shape on the right with centered number */}
              <div className="absolute bottom-0 right-0 w-1/2 h-2/3 bg-[#005c8a] rounded-tl-full z-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-white">{step.id}</span>
              </div>

              <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                <div>
                  {/* Badge */}
                  <span className="inline-block bg-[#fcee21] text-black font-bold px-2 py-0.5 text-xs rounded-md mb-3">
                    0{step.id}
                  </span>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-black">{step.title}</h3>
                  
                  {/* Description */}
                  <p className="mt-1 text-gray-600 text-sm max-w-[60%]">{step.desc}</p>
                </div>

                {/* Arrow */}
                <div className="text-[#005c8a] mt-auto">
                  <svg className="w-8 h-8 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </div>
              </div>


            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
