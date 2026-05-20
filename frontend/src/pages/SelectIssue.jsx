import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// High-fidelity custom inline SVG icons for common issues
const ICONS = {
  cooling: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path d="M12 2l3 3M12 22l-3-3" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  water: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
    </svg>
  ),
  circuit: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  gas: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v4H6zM8 7v14h8V7" />
      <circle cx="12" cy="14" r="2" />
    </svg>
  ),
  noise: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
};

// Map product identifiers to customized dynamic issues list
const ISSUES_DATA = {
  'air-conditioner': [
    { id: 'cooling', name: 'Cooling Issue', icon: ICONS.cooling },
    { id: 'leakage', name: 'Water Leakage', icon: ICONS.water },
    { id: 'pcb', name: 'PCB / Circuit Issue', icon: ICONS.circuit },
    { id: 'gas', name: 'Gas Charging', icon: ICONS.gas },
    { id: 'noise', name: 'Noise Problem', icon: ICONS.noise },
    { id: 'install', name: 'Installation / Deinstallation', icon: ICONS.wrench }
  ],
  'refrigerator': [
    { id: 'not-cooling', name: 'Not Cooling Enough', icon: ICONS.cooling },
    { id: 'leakage', name: 'Water Leakage / Ice Melting', icon: ICONS.water },
    { id: 'noise', name: 'Excessive / Strange Noise', icon: ICONS.noise },
    { id: 'power', name: 'Power Failure / Not Turning On', icon: ICONS.power },
    { id: 'door-gasket', name: 'Door Gasket Replacement', icon: ICONS.wrench }
  ],
  'washing-machine': [
    { id: 'spin', name: 'Not Spinning / Vibrating', icon: ICONS.gear },
    { id: 'drain', name: 'Water Drainage Issue', icon: ICONS.water },
    { id: 'pcb', name: 'Program / PCB Error', icon: ICONS.circuit },
    { id: 'power', name: 'No Power / Won\'t Start', icon: ICONS.power },
    { id: 'install', name: 'Installation & Setup', icon: ICONS.wrench }
  ],
  'microwave-oven': [
    { id: 'heating', name: 'Not Heating / Sparking', icon: ICONS.power },
    { id: 'plate', name: 'Turntable Plate Not Spinning', icon: ICONS.gear },
    { id: 'buttons', name: 'Touch Panel / Buttons Not Working', icon: ICONS.circuit },
    { id: 'noise', name: 'Loud Buzzing Noise', icon: ICONS.noise }
  ],
  'television': [
    { id: 'display', name: 'Display Panel Lines / Blank Screen', icon: ICONS.circuit },
    { id: 'sound', name: 'Sound Output Issue', icon: ICONS.noise },
    { id: 'power', name: 'TV Not Powering On', icon: ICONS.power },
    { id: 'ports', name: 'HDMI / USB Ports Loose', icon: ICONS.wrench }
  ],
  'dishwasher': [
    { id: 'cleaning', name: 'Dishes Not Cleaned Properly', icon: ICONS.gear },
    { id: 'drain', name: 'Water Accumulation / Draining Issue', icon: ICONS.water },
    { id: 'leakage', name: 'Soap / Water Leakage', icon: ICONS.water },
    { id: 'power', name: 'Will Not Turn On / Control Lock', icon: ICONS.power }
  ],
  // Fallbacks for other categories
  'default': [
    { id: 'general-repair', name: 'General Performance Issue', icon: ICONS.gear },
    { id: 'breakdown', name: 'Complete Breakdown', icon: ICONS.power },
    { id: 'noise', name: 'Noise / Vibration Issue', icon: ICONS.noise },
    { id: 'part-replacement', name: 'Part Replacement / Repair', icon: ICONS.wrench },
    { id: 'leakage-commode', name: 'Water Leakage / Blockage', icon: ICONS.water }
  ]
};

const SelectIssue = () => {
  const navigate = useNavigate();
  const { category, brand, product } = useParams();

  // Find relevant issues list
  const issues = ISSUES_DATA[product] || ISSUES_DATA['default'];

  // Convert product ID to readable title
  const formatTitle = (str) => {
    if (!str) return 'Select Issue';
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const productTitle = formatTitle(product);

  const handleIssueSelect = (issue) => {
    navigate(`/partner-warranty/raise-request/${category}/${brand}/${product}`, {
      state: { issueName: issue.name }
    });
  };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button 
          onClick={() => navigate(`/partner-warranty/products/${category}/${brand}`)}
          className="p-2 bg-slate-50 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">
          {productTitle}
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        
        {/* Title */}
        <h2 className="text-lg font-black text-black tracking-wide pl-1">
          Select Issue
        </h2>

        {/* Issues List - individual rows */}
        <div className="flex flex-col gap-3">
          {issues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => handleIssueSelect(issue)}
              className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl"
            >
              <div className="flex items-center gap-4">
                {/* SVG Icon Wrapper */}
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  {issue.icon}
                </div>
                
                {/* Issue Name */}
                <span className="text-sm font-black text-brand-navy">
                  {issue.name}
                </span>
              </div>
              
              <ChevronRight className="h-5 w-5 text-text-secondary" />
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};

export default SelectIssue;
