import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    id: 1,
    question: 'How do I book a service?',
    answer: 'You can book a service by searching for the category on our homepage, selecting the specific service, choosing a convenient date and time, and completing the payment.'
  },
  {
    id: 2,
    question: 'Are the technicians verified?',
    answer: 'Yes, all technicians on our platform undergo a thorough background check and skill assessment before they are allowed to serve customers.'
  },
  {
    id: 3,
    question: 'How does smart warranty detection work?',
    answer: 'When you upload your appliance details and invoice, our system automatically extracts the purchase date and warranty terms. If a service is requested within the warranty period, we handle it according to the brand guidelines.'
  },
  {
    id: 4,
    question: 'What if I need to cancel or reschedule?',
    answer: 'You can cancel or reschedule your booking up to 2 hours before the scheduled time through your dashboard without any penalty.'
  },
  {
    id: 5,
    question: 'Is my phone number shared with the technician?',
    answer: 'No, we use a number masking system. Both you and the technician can call each other through a secure relay number without revealing your personal phone numbers.'
  }
];

const FAQ = () => {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">

          <h2 className="mt-3 text-3xl font-bold text-[#0d47a1] sm:text-4xl">Frequently Asked Questions</h2>
          <p className="mt-1 text-lg text-text-secondary">
            Find answers to common questions about our platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${openId === faq.id ? 'border-blue-600 shadow-md' : 'border-border-color shadow-sm'}`}
            >
              <button
                className={`w-full text-left px-6 py-4 flex justify-between items-center transition-colors ${openId === faq.id ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'}`}
                onClick={() => toggle(faq.id)}
              >
                <span className={`font-semibold transition-colors ${openId === faq.id ? 'text-blue-600' : 'text-text-primary'}`}>{faq.question}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${openId === faq.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-text-secondary'}`}>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${openId === faq.id ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              <AnimatePresence>
                {openId === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden bg-white"
                  >
                    <div className="px-6 py-4 text-text-secondary text-sm leading-relaxed border-t border-border-color">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
