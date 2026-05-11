import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Check, Shield, Award, Clock } from 'lucide-react';
import applianceFridge from '../assets/appliance_fridge.png';

const RefrigeratorDetails = () => {
  const navigate = useNavigate();
  const [selectedIssue, setSelectedIssue] = useState('');

  const issues = [
    'Not Cooling',
    'Water Leakage',
    'Strange Noise',
    'Refrigerator Not Starting',
    'Excess Ice Formation',
    'General Servicing'
  ];

  const includes = [
    'Deep cleaning',
    'Cooling check',
    'Gas inspection',
    'Internal maintenance'
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Service Details</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Hero Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
          <div className="w-full h-48 bg-[#F5F8FC] rounded-xl flex items-center justify-center overflow-hidden">
            <img src={applianceFridge} alt="Refrigerator" className="h-full object-contain p-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Refrigerator Repair & Service</h2>
            <p className="text-xs text-text-secondary mt-1">Expert repair and maintenance for all refrigerator types.</p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-text-primary">4.8</span>
              <span className="text-xs text-text-secondary">(150+ reviews)</span>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="h-3 w-3" /> 30-day Warranty
              </span>
              <span className="text-xs font-semibold text-[#0D47A1] bg-[#E3ECF9] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="h-3 w-3" /> Top Rated
              </span>
            </div>
          </div>
        </div>

        {/* Issue Selection */}
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-3">What issue are you facing?</h3>
          <div className="grid grid-cols-2 gap-3">
            {issues.map((issue) => (
              <div 
                key={issue}
                onClick={() => setSelectedIssue(issue)}
                className={`p-3 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-20 ${selectedIssue === issue ? 'border-[#0D47A1] bg-[#E3ECF9]/50 shadow-sm' : 'border-border-color bg-white hover:border-[#0D47A1]'}`}
              >
                <span className={`text-xs font-semibold ${selectedIssue === issue ? 'text-[#0D47A1]' : 'text-text-primary'}`}>
                  {issue}
                </span>
                <div className="flex justify-end">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedIssue === issue ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-text-secondary'}`}>
                    {selectedIssue === issue && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Includes */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-border-color">
          <h3 className="text-sm font-bold text-text-primary mb-3">Service Includes</h3>
          <div className="grid grid-cols-2 gap-3">
            {includes.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-[#E8F5E9] rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-[#2E7D32]" />
                </div>
                <span className="text-xs text-text-primary">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-[#E3ECF9]/50 border border-[#BACBE7] p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-xs text-text-secondary block">Price</span>
            <span className="text-lg font-bold text-[#0D47A1]">Starting from ₹499</span>
          </div>
          <span className="text-xs text-[#2E7D32] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded-full">
            Save up to 20%
          </span>
        </div>

      </div>

      {/* Footer / Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border-color shadow-lg flex justify-between items-center z-10">
        <div>
          <span className="text-xs text-text-secondary block">Total</span>
          <span className="text-base font-bold text-text-primary">₹499</span>
        </div>
        <button
          onClick={() => navigate(`/booking?service=Refrigerator Service`)}
          className="bg-[#FFD600] text-[#0D47A1] font-bold py-2.5 px-6 rounded-2xl hover:bg-yellow-400 transition-colors shadow-sm text-sm"
        >
          Book Service
        </button>
      </div>

    </div>
  );
};

export default RefrigeratorDetails;
