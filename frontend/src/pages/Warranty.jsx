import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Shield, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const Warranty = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px]">
        
        {/* Header */}
        <div className="p-6 flex items-center border-b border-border-color">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
          </button>
          <h1 className="text-lg font-bold text-[#0d47a1] ml-4">Warranty Status</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
          
          {/* Animated Success Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full bg-white border border-blue-50 rounded-[24px] p-6 shadow-xl mb-6 relative overflow-hidden bg-gradient-to-br from-[#F0F4FA] to-white"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFD600] opacity-20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#0D47A1] opacity-5 rounded-full blur-3xl"></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle className="h-10 w-10 text-green-500" />
              </motion.div>
              
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-2">
                Active
              </span>
              
              <h2 className="text-xl font-bold text-text-primary mb-1">Warranty Active!</h2>
              <p className="text-sm text-text-secondary mb-4">We found your appliance in the database.</p>
              
              <div className="w-full border-t border-dashed border-border-color my-4"></div>
              
              <div className="w-full flex justify-between items-center text-sm">
                <div className="text-left">
                  <span className="text-xs text-text-secondary block">Product</span>
                  <span className="font-bold text-text-primary">Voltas Split AC 1.5 Ton</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-secondary block">Valid Until</span>
                  <span className="font-bold text-text-primary">15 Aug 2027</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits */}
          <div className="w-full">
            <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Benefits Applied</h3>
            
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15,
                    delayChildren: 0.3
                  }
                }
              }}
              className="flex flex-col gap-3"
            >
              {/* Benefit 1 */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#0D47A1]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-text-primary block">Free Labor</span>
                  <span className="text-xs text-text-secondary">No service charge for this repair.</span>
                </div>
                <span className="ml-auto text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  Saved $20
                </span>
              </motion.div>
              
              {/* Benefit 2 */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-[#E3ECF9] rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-text-primary block">Part Discount</span>
                  <span className="text-xs text-text-secondary">50% off on replacement parts.</span>
                </div>
                <span className="ml-auto text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  Saved $25
                </span>
              </motion.div>
            </motion.div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-color">
          <button
            onClick={() => navigate('/payment')}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-md text-sm"
          >
            Apply Warranty & Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default Warranty;
