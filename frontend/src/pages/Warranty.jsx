import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Shield, Calendar, CreditCard } from 'lucide-react';

const Warranty = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px]">
        
        {/* Header */}
        <div className="p-6 flex items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
          </button>
          <h1 className="text-xl font-bold text-[#0d47a1] ml-4">Warranty Status</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center p-8">
          
          {/* Glassmorphic Success Card */}
          <div className="w-full bg-white border border-white/20 rounded-[20px] p-6 shadow-lg mb-8 relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD600] opacity-10 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 mb-2">
                Active
              </span>
              
              <h2 className="text-xl font-bold text-text-primary mb-1">Warranty Active!</h2>
              <p className="text-sm text-text-secondary mb-4">We found your appliance in the database.</p>
              
              <div className="w-full border-t border-dashed border-border-color my-4"></div>
              
              <div className="w-full flex justify-between items-center text-sm">
                <div className="text-left">
                  <span className="text-xs text-text-secondary block">Product</span>
                  <span className="font-semibold text-text-primary">Voltas Split AC 1.5 Ton</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-secondary block">Valid Until</span>
                  <span className="font-semibold text-text-primary">15 Aug 2027</span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="w-full">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">Benefits Applied</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <Shield className="h-5 w-5 text-[#0D47A1]" />
                <div>
                  <span className="text-sm font-semibold text-text-primary block">Free Labor</span>
                  <span className="text-xs text-text-secondary">No service charge for this repair.</span>
                </div>
                <span className="ml-auto text-sm font-bold text-green-600">Saved $20</span>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                <div>
                  <span className="text-sm font-semibold text-text-primary block">Part Discount</span>
                  <span className="text-xs text-text-secondary">50% off on replacement parts.</span>
                </div>
                <span className="ml-auto text-sm font-bold text-green-600">Saved $25</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-8">
          <button
            onClick={() => navigate('/payment')}
            className="w-full bg-[#FFD600] text-[#0D47A1] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-md"
          >
            Apply Warranty & Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default Warranty;
