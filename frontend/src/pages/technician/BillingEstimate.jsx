import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { useTech } from '../../context/TechContext';

const WhatsAppIcon = () => (
  <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.617-1.008-5.078-2.848-6.92C16.39 2.043 13.934.802 12.01.802c-5.409 0-9.81 4.403-9.813 9.811-.001 1.51.393 2.986 1.14 4.3l-.38 1.396 1.432-.375c1.233.67 2.455.992 3.633.992.003 0 .004 0 .006 0zm9.734-7.273c-.299-.149-1.767-.872-2.04-.972-.272-.1-.471-.149-.669.149-.198.299-.768.972-.942 1.171-.173.199-.348.224-.647.075-.3-.15-1.267-.467-2.414-1.491-.892-.797-1.495-1.782-1.67-2.08-.174-.299-.018-.461.13-.61.134-.133.3-.348.449-.522.15-.174.199-.299.299-.498.1-.199.05-.374-.025-.523-.075-.15-.669-1.612-.917-2.209-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.299-1.04 1.018-1.04 2.485 0 1.467 1.067 2.882 1.216 3.081.149.199 2.099 3.205 5.086 4.495.71.307 1.265.49 1.696.627.713.227 1.363.195 1.876.118.571-.085 1.767-.722 2.015-1.418.248-.696.248-1.293.173-1.418-.074-.125-.272-.199-.57-.348z"/>
  </svg>
);

const BillingEstimate = () => {
  const navigate = useNavigate();
  const { activeJob, selectJobForDetails, setActiveStep, collectPayment } = useTech();

  const handleCollectPayment = () => {
    if (activeJob) {
      collectPayment();
    } else {
      // Setup the first job if none is active to demonstrate the success step
      selectJobForDetails('8842');
      setActiveStep('completed');
    }
    navigate('/technician/active-job');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-between pb-6 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Billing & Estimate</h1>
      </div>

      {/* Main Billing Card Area */}
      <div className="flex-1 p-3.5 flex flex-col gap-5 justify-start">
        
        {/* Main white card */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 text-left flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium text-[#052355]">D2C Paid Service</h3>
            <p className="text-[11px] text-slate-600 font-normal mt-0.5">Estimate for Customer</p>
          </div>

          <div className="flex flex-col gap-3.5 text-xs font-normal text-slate-600 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Service Charge</span>
              <span className="text-[#052355] font-medium">₹500</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Spare Part (Capacitor)</span>
              <span className="text-[#052355] font-medium">₹440</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Spare Part (Gas Kit)</span>
              <span className="text-[#052355] font-medium">₹850</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Tax (18%)</span>
              <span className="text-[#052355] font-medium">₹322</span>
            </div>
          </div>

          {/* Dotted Divider */}
          <div className="border-t border-dashed border-slate-200 my-2"></div>

          {/* Customer Payable Row */}
          <div className="flex justify-between items-center py-1">
            <span className="text-xs font-normal text-[#0D47A1]">Customer Payable</span>
            <span className="text-xl font-medium text-[#00C853]">₹2,112</span>
          </div>
        </div>

        {/* Technician Earnings Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3.5 py-3.5 text-left flex justify-between items-center">
          <span className="text-xs font-normal text-slate-800">Technician Earnings</span>
          <span className="text-base font-medium text-[#052355]">₹650</span>
        </div>

        {/* File Actions Row */}
        <div className="grid grid-cols-2 gap-4 mt-1">
          <button 
            onClick={() => alert('PDF Estimate invoice generated.')}
            className="bg-[#E8F0FE]/70 hover:bg-[#E8F0FE] text-[#0D47A1] font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
          >
            <FileText className="h-4.5 w-4.5 text-[#0D47A1]" />
            Generate PDF
          </button>
          <button 
            onClick={() => alert('Estimate invoice link sent on WhatsApp.')}
            className="bg-[#E6F4EA]/70 hover:bg-[#E6F4EA] text-green-700 font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
          >
            <WhatsAppIcon />
            Send on WhatsApp
          </button>
        </div>

      </div>

      {/* Collect Payment Bottom Button */}
      <div className="px-3.5 pb-6">
        <button 
          onClick={handleCollectPayment}
          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center"
        >
          Collect Payment
        </button>
      </div>

    </div>
  );
};

export default BillingEstimate;
