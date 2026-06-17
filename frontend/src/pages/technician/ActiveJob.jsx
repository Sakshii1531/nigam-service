import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, User, Wrench, 
  MapPin, Phone, MessageSquare, Shield, Share2, MoreVertical, CheckCircle, 
  Clock, Plus, Info, Upload, Check, Video, Mic, FileText, Send, Sparkles,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import splitAcImg from '../../assets/categories/split_ac.png';
import wasingImg from '../../assets/categories/wasing.png';
import fridgeImg from '../../assets/appliance_fridge.png';
import capacitorImg from '../../assets/capacitor_part.png';
import gasRefillImg from '../../assets/gas_refill_part.png';
import fanMotorImg from '../../assets/fan_motor_part.png';
import manifoldGaugeImg from '../../assets/manifold_gauge_tool.png';
import screwdriverImg from '../../assets/screwdriver_tool.png';
import allenKeyImg from '../../assets/allen_key_tool.png';
import AMCHistoryDrawer from './job-flows/AMCHistoryDrawer';
import AMCOverview from './job-flows/AMCOverview';
import BrandWarrantyOverview from './job-flows/BrandWarrantyOverview';
import ExtendedWarrantyOverview from './job-flows/ExtendedWarrantyOverview';

const CrownIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path d="M5 20h14" />
  </svg>
);

const ShieldCheckIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z" />
    <polyline points="9 11 11 13 15 9" />
  </svg>
);

const FileIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// Canvas drawing component for signature (Screen 8)
const SignatureCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#052355';
    ctx.lineCap = 'round';
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    onSave(canvasRef.current.toDataURL());
  };

  return (
    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/50 mt-2">
      <h4 className="text-xs font-normal text-[#052355] mb-2 uppercase tracking-wide">Draw Signature Below</h4>
      <canvas 
        ref={canvasRef}
        width={320}
        height={150}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="bg-white rounded-2xl border border-slate-200 cursor-crosshair touch-none w-full h-[150px]"
      />
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={clear} className="flex-1 bg-slate-200 py-2.5 rounded-xl text-xs font-normal text-slate-700">Clear</button>
        <button type="button" onClick={save} className="flex-1 bg-[#0D47A1] py-2.5 rounded-xl text-xs font-normal text-white shadow-sm">Save</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-xs font-normal text-slate-600">Cancel</button>
      </div>
    </div>
  );
};

const ActiveJob = () => {
  const navigate = useNavigate();
  const { 
    activeJob, 
    activeStep, 
    advanceStep, 
    setActiveStep,
    resetActiveJob, 
    collectPayment,
    decrementAmcVisit,
    decrementEwClaim,
    selectedParts,
    setSelectedParts,
    proofs,
    setProofs,
    addChatMessage,
    chatMessages
  } = useTech();

  const isSpecialWarrantyJob = activeJob && (
    activeJob.type === 'AMC Visit' || 
    activeJob.type === 'AMC VISIT' || 
    activeJob.type === 'NCC Extended Warranty' || 
    activeJob.type === 'NCC EXTENDED WARRANTY' || 
    activeJob.type === 'Brand Warranty' || 
    activeJob.type === 'BRAND WARRANTY'
  );

  const getProductImage = (job) => {
    if (!job) return splitAcImg;
    const prodName = (job.product || '').toLowerCase();
    const catName = (job.category || '').toLowerCase();
    
    if (prodName.includes('ac') || catName.includes('ac')) {
      return splitAcImg;
    }
    if (prodName.includes('wash') || prodName.includes('wm') || catName.includes('wash')) {
      return wasingImg;
    }
    if (prodName.includes('ref') || prodName.includes('fridge') || catName.includes('ref')) {
      return fridgeImg;
    }
    return splitAcImg;
  };

  // Navigation tabs inside active job inspection (Screen 5)
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Diagnosis', 'Parts', 'Notes', 'History'
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [notesText, setNotesText] = useState('AC compressor draws high current initially. Fan motor runs, but cooling is zero. Suspect run capacitor degradation.');
  const [enteredInspection, setEnteredInspection] = useState(false);
  const [additionalServices, setAdditionalServices] = useState([
    { id: 'deep', name: 'Deep Cleaning', price: 599, checked: true },
    { id: 'drain', name: 'Drain Pipe Cleaning', price: 199, checked: true },
    { id: 'foam', name: 'AC Foam Wash', price: 399, checked: false }
  ]);
  const [showAddServicesModal, setShowAddServicesModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [showInvoicePdfModal, setShowInvoicePdfModal] = useState(false);
  // AMC: show history drawer before entering inspection tabs
  const [showAmcHistoryDrawer, setShowAmcHistoryDrawer] = useState(false);

  // Checkboxes for diagnosis verification (Screen 6)
  const [actionsChecked, setActionsChecked] = useState({
    checkCapacitor: true,
    checkGasPressure: true,
    verifyFanMotor: false
  });

  // Recommended Parts cart matching Screen 7
  const [partsCartChecked, setPartsCartChecked] = useState([
    { id: 'part-1', name: 'Capacitor 45/5 MFD', sku: 'CP-45/5', price: 220, match: 79, checked: true, image: capacitorImg },
    { id: 'part-2', name: 'Gas Refill Kit (R410A)', sku: 'GRK-410', price: 850, match: 60, checked: true, image: gasRefillImg },
    { id: 'part-3', name: 'Outdoor Fan Motor', sku: 'PM-18V', price: 1250, match: 40, checked: false, image: fanMotorImg }
  ]);

  // AI Chat Drawer State (Screen 16)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  if (!activeJob) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-between pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/technician/dashboard')} className="p-1 hover:bg-slate-50 rounded-full">
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            <h1 className="text-lg font-normal text-[#052355]">Active Job Details</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 bg-[#E3ECF9] rounded-full flex items-center justify-center text-[#0D47A1]">
            <Briefcase className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-normal text-[#052355]">No Active Job In Progress</h2>
            <p className="text-sm text-slate-600 mt-1">Please accept a job from your dashboard to begin the service process.</p>
          </div>
          <button 
            onClick={() => navigate('/technician/dashboard')}
            className="mt-4 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3 px-3.5 rounded-2xl text-sm transition-all shadow-sm"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
          <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <Briefcase className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Jobs</span>
          </button>
          <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <ClipboardList className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Requests</span>
          </button>
          <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <Wrench className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Inventory</span>
          </button>
          <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <Calendar className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Schedule</span>
          </button>
          <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <User className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Profile</span>
          </button>
        </div>
      </div>
    );
  }

  // Helper function to render Stepper states (Screen 4 style)
  const renderStepper = (isPage = false) => {
    const steps = [
      { id: 'assigned', label: 'Assigned', desc: 'Job has been assigned to you', time: '09:20 AM' },
      { id: 'ontheway', label: 'On The Way', desc: 'You are on the way to customer', time: '09:35 AM' },
      { id: 'inspection', label: 'Inspection', desc: 'Inspect and confirm the issue', time: '09:50 AM' },
      { id: 'spareapproval', label: 'Estimate Approval', desc: 'Waiting for customer approval' },
      { id: 'repaircomplete', label: 'Repair Complete', desc: 'Complete the repair work' },
      { id: 'billing', label: 'Payment Collected', desc: 'Collect payment from customer' },
      { id: 'completed', label: 'Job Closed', desc: 'Job completed successfully' }
    ];

    const getStepStatus = (id) => {
      const stepOrder = ['assigned', 'ontheway', 'inspection', 'spareapproval', 'repaircomplete', 'billing', 'completed'];
      const currentIndex = stepOrder.indexOf(activeStep);
      const targetIndex = stepOrder.indexOf(id);

      if (targetIndex < currentIndex) return 'completed';
      if (targetIndex === currentIndex) return 'active';
      return 'pending';
    };

    const stepperContent = (
      <div className={`flex flex-col relative ${isPage ? 'gap-4 px-1 py-2' : 'gap-0 pl-7 mt-2'}`}>

        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isActive = status === 'active';
          
          if (isPage) {
            return (
              <div 
                key={step.id} 
                className={`relative flex items-center py-2 px-4 rounded-2xl transition-all ${
                  isActive ? 'bg-[#F0F6FF]' : ''
                }`}
              >
                {/* Segmented Timeline Line */}
                {idx < steps.length - 1 && (
                  <div className={`absolute left-[32px] -translate-x-1/2 top-[36px] bottom-[-28px] w-[2px] z-0 ${
                    status === 'completed' ? 'bg-[#00C853]' : 'bg-slate-200'
                  }`} />
                )}

                {/* Step Icon Indicator — 3 distinct states */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 transition-all flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-[#00C853] text-white shadow-sm'
                    : isActive
                      ? 'bg-[#0D47A1] text-white ring-4 ring-[#C7DAFF]'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {status === 'completed' ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="ml-4 flex-1 text-left flex justify-between items-center">
                  <div>
                    <h4 className={`text-sm transition-all ${
                      status === 'completed'
                        ? 'font-semibold text-[#00853A]'
                        : isActive
                          ? 'font-semibold text-[#052355]'
                          : 'font-normal text-slate-400'
                    }`}>
                      {step.label}
                    </h4>
                    <p className={`text-xs font-normal mt-0.5 ${
                      status === 'completed'
                        ? 'text-[#00C853]'
                        : isActive
                          ? 'text-slate-600'
                          : 'text-slate-400'
                    }`}>
                      {step.desc}
                    </p>
                  </div>
                  {step.time ? (
                    <span className={`text-[10px] font-normal ml-2 ${
                      status === 'completed' ? 'text-[#00C853]' : isActive ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {step.time}
                    </span>
                  ) : status === 'pending' ? (
                    <span className="text-[10px] font-normal ml-2 text-slate-300">—</span>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <div key={step.id} className="relative flex gap-3 pb-0">
              {/* Left column: circle + connector line */}
              <div className="flex flex-col items-center" style={{ minWidth: 20 }}>
                {/* Step Icon Indicator — 3 distinct states */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 text-[10px] font-semibold z-10 transition-all flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-[#00C853] border-[#00C853] text-white'
                    : status === 'active'
                      ? 'bg-white border-[#0D47A1] text-[#0D47A1] ring-4 ring-[#C7DAFF]'
                      : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {status === 'completed' ? (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {/* Per-step connector line */}
                {idx < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-1 mb-1 ${
                    status === 'completed' ? 'bg-[#00C853]' : 'bg-slate-200'
                  }`} style={{ minHeight: 22 }} />
                )}
              </div>

              {/* Right column: label + desc + time */}
              <div className={`flex-1 flex justify-between items-start ${ idx < steps.length - 1 ? 'pb-3' : 'pb-0' }`}>
                <div>
                  <h4 className={`text-xs transition-all ${
                    status === 'completed'
                      ? 'font-semibold text-[#00853A]'
                      : status === 'active'
                        ? 'font-semibold text-[#052355]'
                        : 'font-normal text-slate-400'
                  }`}>
                    {step.label}
                  </h4>
                  {(status === 'active' || status === 'completed') && (
                    <p className={`text-[10px] font-normal mt-0.5 ${
                      status === 'completed' ? 'text-[#00C853]' : 'text-slate-600'
                    }`}>{step.desc}</p>
                  )}
                </div>
                {step.time ? (
                  <span className={`text-[9px] font-normal ml-2 ${
                    status === 'completed' ? 'text-[#00C853]' : status === 'active' ? 'text-slate-400' : 'text-slate-300'
                  }`}>
                    {step.time}
                  </span>
                ) : status === 'pending' ? (
                  <span className="text-[9px] font-normal ml-2 text-slate-300">—</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );

    if (isPage) {
      return stepperContent;
    }

    return (
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-55">
          <span className="text-[10px] font-normal text-[#0D47A1] bg-[#E3ECF9] px-2.5 py-1 rounded-full uppercase tracking-wider">Job Progress</span>
          <span className="text-xs font-normal text-slate-500">#{activeJob.id}</span>
        </div>
        {stepperContent}
      </div>
    );
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    addChatMessage(chatInput, 'user');
    setChatInput('');
  };

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans ${
      activeStep === 'inspection' && !enteredInspection ? 'bg-white pb-1' : 'bg-[#F5F8FC] pb-24'
    }`}>
      
      {/* Header */}
      {activeStep === 'details' && activeJob && isSpecialWarrantyJob ? (
        /* White Header for Special Warranty Details */
        <div className="bg-white px-3.5 py-4 flex justify-between items-center z-10 border-b border-slate-200">
          <button 
            onClick={() => {
              setActiveStep('idle');
              navigate('/technician/dashboard');
            }} 
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-[#052355]"
          >
            <ArrowLeft className="h-6 w-6 stroke-[2]" />
          </button>
          
          <h1 className="text-base font-normal text-[#052355]">
            {activeJob.type === 'AMC Visit' || activeJob.type === 'AMC VISIT'
              ? 'AMC Visit Details'
              : activeJob.type === 'NCC Extended Warranty' || activeJob.type === 'NCC EXTENDED WARRANTY'
                ? 'Extended Warranty Details'
                : 'Brand Warranty Details'}
          </h1>
          
          <button className="p-1 hover:bg-slate-100 rounded-full transition-colors text-[#052355]">
            <MoreVertical className="h-6 w-6 stroke-[2]" />
          </button>
        </div>
      ) : activeStep === 'details' && activeJob ? (
        /* Navy Blue Header for Job Details Screen 3 */
        <div className="bg-[#052355] text-white pt-4 pb-12 px-3.5 flex flex-col gap-4 rounded-b-[2.5rem] relative z-10 shadow-md">
          {/* Top Bar */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => {
                setActiveStep('idle');
                navigate('/technician/dashboard');
              }} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="text-center">
              <h1 className="text-sm font-normal text-white tracking-wide">Job Details</h1>
              <span className="text-[10px] text-white/70 block font-normal mt-0.5">#{activeJob.id}</span>
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Subheader Badges Row */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="bg-[#00C853] text-white text-[9px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wider">
              {activeJob.type === 'D2C Paid Service' ? 'D2C PAID SERVICE' : activeJob.type.toUpperCase()}
            </span>
            <span className="text-xs text-white/90 font-normal">
              {activeJob.warrantyStatus}
            </span>
          </div>
        </div>
      ) : activeStep === 'inspection' && !enteredInspection ? (
        /* White Header for Job Progress Stepper View (Screen 4) */
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => {
              setActiveStep('details');
            }} 
            className="p-1 hover:bg-slate-50 rounded-full text-slate-700"
          >
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          
          <div className="text-center">
            <h1 className="text-base font-normal text-[#052355]">Job Progress</h1>
            <span className="text-[10px] text-slate-600 block font-normal mt-0.5">#{activeJob.id}</span>
          </div>

          <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-700">
            <MoreVertical className="h-5 w-5 text-slate-700" />
          </button>
        </div>
      ) : activeStep === 'inspection' && enteredInspection ? (
        /* White Header for Job Details worksheets View (Screen 5) */
        activeTab === 'Diagnosis' && selectedParts.length === 0 ? (
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
            <button 
              onClick={() => {
                if (showAIModal) {
                  setShowAIModal(false);
                } else {
                  setActiveTab('Overview');
                }
              }} 
              className="p-1 hover:bg-slate-50 rounded-full"
            >
              <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
            </button>
            
            <div className="flex-1 text-center pr-8">
              <h1 className="text-base font-medium text-[#0D47A1]">
                {showAIModal ? 'Recommended Parts' : 'AI Diagnostic Assistant'}
              </h1>
            </div>
          </div>
        ) : activeTab === 'Diagnosis' && selectedParts.length > 0 ? (
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10">
            <button 
              onClick={() => {
                setSelectedParts([]);
                setShowAIModal(true);
              }} 
              className="p-1 hover:bg-slate-50 rounded-full"
            >
              <ArrowLeft className="h-6 w-6 text-[#0D47A1]" />
            </button>
            
            <div className="flex-1 text-center pr-8">
              <h1 className="text-base font-medium text-[#0D47A1]">Upload Proof</h1>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <button 
              onClick={() => {
                setEnteredInspection(false);
              }} 
              className="p-1 hover:bg-slate-50 rounded-full text-slate-700"
            >
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            
            <div className="text-center">
              <h1 className="text-base font-normal text-[#052355]">Job Details</h1>
            </div>

            <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-700">
              <MoreVertical className="h-5 w-5 text-slate-700" />
            </button>
          </div>
        )
      ) : (
        /* Regular White Header for Job Progress Stepper */
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (activeStep === 'inspection' && enteredInspection) {
                  setEnteredInspection(false);
                } else if (activeStep === 'completed') {
                  resetActiveJob();
                  navigate('/technician/dashboard');
                } else {
                  navigate('/technician/dashboard');
                }
              }} 
              className="p-1 hover:bg-slate-50 rounded-full"
            >
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            <h1 className="text-base font-normal text-[#052355]">
              Job Progress
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* AI Sparkles Button (Screen 16 Toggle) */}
            <button 
              onClick={() => setChatOpen(true)}
              className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-sm hover:scale-105 transition-transform flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4 fill-white" />
              <span className="text-[10px] font-medium tracking-wider uppercase">AI Assist</span>
            </button>

            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${
        activeStep === 'inspection' && !enteredInspection 
          ? 'p-3 gap-6' 
          : activeStep === 'inspection' && enteredInspection
            ? 'pt-2 px-3.5 pb-5 gap-4'
            : 'p-3.5 gap-4'
      }`}>
        
        {/* STEP A: UNACCEPTED DETAILS VIEW (Screen 3) */}
        {activeStep === 'details' && activeJob && (
          <div className={`flex flex-col gap-4 ${isSpecialWarrantyJob ? 'mt-4' : 'mt-[-2.5rem]'} relative z-20 px-1`}>
            
            {isSpecialWarrantyJob ? (
              /* Special Warranty Mockup layout cards */
              activeJob.type === 'AMC Visit' || activeJob.type === 'AMC VISIT' ? (
                <div className="flex flex-col gap-4">
                  {/* Badge and Subtitle */}
                  <div className="flex items-center gap-3 px-1 text-left">
                    <span className="bg-[#FFA000] text-white text-[9px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                      AMC VISIT
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      Free Preventive Service
                    </span>
                  </div>

                  {/* AMC Plan Details Card */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3.5 text-left">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AMC Plan Details</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#FFA000] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <CrownIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-[#052355]">AMC Gold Plan</h4>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Expiry Date</span>
                            <span className="text-[#052355] font-semibold">15 Jan 2027</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Visits Remaining</span>
                            <span className="text-[#052355] font-semibold">3</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Plan Type</span>
                            <span className="text-[#052355] font-semibold">Quarterly</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeJob.type === 'NCC Extended Warranty' || activeJob.type === 'NCC EXTENDED WARRANTY' ? (
                <div className="flex flex-col gap-4">
                  {/* Badge and Subtitle */}
                  <div className="flex items-center gap-3 px-1 text-left">
                    <span className="bg-[#7C4DFF] text-white text-[9px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                      NCC EXTENDED WARRANTY
                    </span>
                    <span 
                      onClick={() => navigate(`/partner-warranty/raise-request/${activeJob.category || 'General'}/${activeJob.brand || 'NCC'}/${activeJob.product || 'General'}`, { state: { issueName: activeJob.complaint || 'Extended Warranty Claim' } })}
                      className="text-xs text-slate-650 hover:text-[#7C4DFF] hover:underline cursor-pointer select-none font-normal"
                    >
                      Claim Job
                    </span>
                  </div>

                  {/* Coverage Details Card */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3.5 text-left">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coverage Details</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#7C4DFF] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <ShieldCheckIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-[#052355]">NCC Protect Plus</h4>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Plan Name</span>
                            <span className="text-[#052355] font-semibold">NCC Protect Plus</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Valid Till</span>
                            <span className="text-[#052355] font-semibold">15 Jan 2028</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Claims Remaining</span>
                            <span className="text-[#052355] font-semibold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Badge and Subtitle */}
                  <div className="flex items-center gap-3 px-1 text-left">
                    <span className="bg-[#1E6BDB] text-white text-[9px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                      BRAND WARRANTY
                    </span>
                    <span 
                      onClick={() => navigate('/partner-warranty/track-ticket', { state: { ticketId: 'LG-IN-8842' } })}
                      className="text-xs text-slate-650 hover:text-[#1E6BDB] hover:underline cursor-pointer select-none font-normal"
                    >
                      LG Warranty Call
                    </span>
                  </div>

                  {/* Warranty Information Card */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col text-left">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3.5">Warranty Information</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#1E6BDB] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <ShieldCheckIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Warranty Status</span>
                            <span className="text-green-600 font-semibold">In Warranty</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Warranty Till</span>
                            <span className="text-[#052355] font-semibold">15 Jan 2027</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Case ID</span>
                            <span className="text-[#052355] font-semibold">LG-IN-8842</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separator inside card */}
                    <div className="h-[1px] bg-slate-100 my-4 w-full"></div>

                    {/* Purchase Invoice inside card */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Purchase Invoice</h4>
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                            <FileIcon className="w-6 h-6 text-slate-500" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold text-[#052355] truncate max-w-[150px]">invoice_voltas_ac.pdf</p>
                            <p className="text-[10px] text-slate-500 font-normal">PDF • 420 KB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowInvoicePdfModal(true)}
                          className="bg-[#EEF4FE] text-[#1E6BDB] hover:bg-[#DCE7FC] px-5 py-2 rounded-full text-xs font-semibold transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Unified Main Info Card */
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200/60 shadow-sm flex flex-col gap-4">
                {/* Job Summary Section */}
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-medium text-[#052355] text-left">
                    {activeJob.product} Repair
                  </h2>
                  <p className="text-xs text-slate-600 font-normal text-left">
                    {activeJob.model && activeJob.model.toLowerCase().startsWith(activeJob.brand.toLowerCase())
                      ? activeJob.model
                      : `${activeJob.brand} ${activeJob.model || ''}`}
                  </p>

                  {/* Dynamic Image for Product */}
                  <div className="my-3 flex items-center justify-center w-full">
                    <img 
                      src={getProductImage(activeJob)} 
                      alt={activeJob.product} 
                      className="w-full h-20 object-contain" 
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-slate-100 w-full"></div>

                {/* Customer Information */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-normal text-slate-600 uppercase tracking-wider block">Customer</span>
                    <p className="text-base font-medium text-[#052355] mt-1">{activeJob.customerName}</p>
                    <p className="text-xs text-slate-600 mt-0.5 font-normal">{activeJob.phone}</p>
                  </div>
                  <div className="flex gap-2.5">
                    <a 
                      href={`tel:${activeJob.phone}`} 
                      className="w-10 h-10 rounded-full bg-[#E8F1FF] flex items-center justify-center text-[#1A73E8] hover:bg-[#D4E5FF] transition-colors"
                    >
                      <Phone className="h-4.5 w-4.5 stroke-[2.5]" />
                    </a>
                    <button 
                      onClick={() => setChatOpen(true)} 
                      className="w-10 h-10 rounded-full bg-[#E8F1FF] flex items-center justify-center text-[#1A73E8] hover:bg-[#D4E5FF] transition-colors"
                    >
                      <MessageSquare className="h-4.5 w-4.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-slate-100 w-full"></div>

                {/* Service Address & Navigation */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-normal text-slate-600 uppercase tracking-wider block">Service Address</span>
                  <p className="text-sm font-normal text-[#052355] mt-1 leading-relaxed">{activeJob.address}</p>
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-normal text-slate-600">• {activeJob.distance} km away</span>
                    <button 
                      onClick={() => alert(`Opening Google Maps navigation to: ${activeJob.address}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F1FF] text-[#1A73E8] font-normal rounded-full text-[11px] hover:bg-[#D4E5FF] transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#1A73E8]" />
                      Navigate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Estimates & Payable (Only for standard non-warranty jobs) */}
            {!isSpecialWarrantyJob && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200/60 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-normal">Customer Payable</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase ${
                    activeJob.price > 0 ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#E3ECF9] text-[#1E6BDB]'
                  }`}>
                    {activeJob.price > 0 ? 'PAID SERVICE' : 'FREE SERVICE'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-normal">Est. Spare Cost</span>
                  <span className="text-sm font-medium text-[#052355]">₹{activeJob.price > 0 ? '950' : '0'}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-normal">Est. Earn</span>
                  <span className="text-sm font-medium text-[#052355]">₹{activeJob.estEarnings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-normal">Payment Mode</span>
                  <span className="text-xs font-normal text-slate-600">
                    {activeJob.price > 0 ? 'UPI / Cash / Card' : 'NCC Claim Payout'}
                  </span>
                </div>
              </div>
            )}
            {/* Bottom Actions — all 4 card types get Accept Job */}
            <div className="flex gap-3.5 mt-2">
              {!isSpecialWarrantyJob && (
                <button 
                  onClick={() => { setActiveStep('inspection'); setActiveTab('Overview'); }}
                  className="flex-1 bg-white hover:bg-slate-50 text-[#0D47A1] font-normal py-3 px-4 rounded-xl text-xs transition-all border border-[#0D47A1]/20 shadow-sm"
                >
                  View Details
                </button>
              )}
              <button 
                onClick={() => { setActiveStep('assigned'); }}
                className={`flex-1 font-normal py-3 px-4 rounded-xl text-xs transition-all shadow-sm ${
                  activeJob?.type === 'AMC Visit'
                    ? 'bg-[#FFA000] hover:bg-amber-500 text-white'
                    : activeJob?.type === 'NCC Extended Warranty'
                      ? 'bg-[#7C4DFF] hover:bg-purple-600 text-white'
                      : activeJob?.type === 'Brand Warranty'
                        ? 'bg-[#1E6BDB] hover:bg-blue-700 text-white'
                        : 'bg-[#0D47A1] hover:bg-[#0A3F91] text-white'
                }`}
              >
                {activeJob?.type === 'AMC Visit'
                  ? 'Accept AMC Visit'
                  : activeJob?.type === 'NCC Extended Warranty'
                    ? 'Accept Claim Job'
                    : activeJob?.type === 'Brand Warranty'
                      ? 'Accept Warranty Job'
                      : 'Accept Job'
                }
              </button>
            </div>

          </div>
        )}

        {/* STEP B: ACTIVE PROGRESS STEPS (Screen 4 / Stepper Views) */}
        {activeStep !== 'details' && activeStep !== 'completed' && (
          <div className="flex flex-col gap-4">
            
            {/* 1. Progress Stepper / Step Details conditional flow */}
            {activeStep === 'inspection' && !enteredInspection ? (
              /* If in inspection but not entered diagnostic tabs yet, just show stepper and Mark as Inspection button */
              <div className="flex-1 flex flex-col justify-between">
                {renderStepper(true)}
                
                <button 
                  onClick={() => setEnteredInspection(true)}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-3.5 rounded-xl text-xs transition-all shadow-md mt-8 mb-1"
                >
                  Mark as Inspection
                </button>
              </div>
            ) : (
              /* Normal stepper list flow */
              <>
                {!(activeStep === 'inspection' && enteredInspection) && renderStepper()}

            {/* 2. Step Details Panel */}
            {/* Step: ASSIGNED (Step 1) */}
            {activeStep === 'assigned' && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-normal text-[#052355]">Assigned Job Details</h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-sm font-normal text-[#052355]">{activeJob.brand} {activeJob.product}</p>
                  <p className="text-xs text-slate-600 mt-1 font-normal">Client: {activeJob.customerName}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">{activeJob.address}</p>
                </div>
                
                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  Start Trip (On My Way)
                </button>
              </div>
            )}

            {/* Step: ON THE WAY (Step 2) */}
            {activeStep === 'ontheway' && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-normal text-[#052355]">En-Route to Client</h3>
                
                <div className="h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-blue-50/20 flex flex-col items-center justify-center text-center p-4">
                    <MapPin className="h-10 w-10 text-red-500 animate-bounce mb-2" />
                    <span className="text-xs font-normal text-[#052355]">Simulated Navigation Route</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">Alex is 0.4 km away from Rohit Sharma</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    advanceStep();
                    // For AMC jobs: show history drawer before entering inspection
                    if (activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT') {
                      setShowAmcHistoryDrawer(true);
                    }
                  }}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md"
                >
                  Mark as Inspection Arrived
                </button>
              </div>
            )}
            {/* Step: INSPECTION (Step 3 - Details Tabs & Diagnosis Screen 5/6/7/8) */}
            {activeStep === 'inspection' && (
              <div className="flex flex-col gap-4">
                
                {/* Tabs Selector (Screen 5 Overview) */}
                {activeTab !== 'Diagnosis' && (
                  <div className="flex justify-between items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm gap-1 mx-[-10px]">
                    {['Overview', 'Diagnosis', 'Parts', 'Notes', 'History'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-center py-2.5 rounded-xl text-xs font-medium transition-all ${
                          activeTab === tab 
                            ? 'bg-[#0D47A1] text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab 1 Content: Overview — card-type-aware */}
                {activeTab === 'Overview' && (() => {

                  // Brand Warranty
                  if (activeJob?.type === 'Brand Warranty' || activeJob?.type === 'BRAND WARRANTY') {
                    return (
                      <div className="flex flex-col gap-2">
                        <BrandWarrantyOverview
                          job={activeJob}
                          additionalServices={additionalServices}
                          setAdditionalServices={setAdditionalServices}
                          setShowAddServicesModal={setShowAddServicesModal}
                          getProductImage={getProductImage}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          <button
                            onClick={() => setShowInvoicePreviewModal(true)}
                            className="flex-1 bg-white border border-[#1E6BDB] hover:bg-slate-50 text-[#1E6BDB] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                          >
                            View Invoice
                          </button>
                          <button
                            onClick={() => setActiveStep('billing')}
                            className="flex-1 bg-[#1E6BDB] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                          >
                            Generate Invoice
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // NCC Extended Warranty
                  if (activeJob?.type === 'NCC Extended Warranty' || activeJob?.type === 'NCC EXTENDED WARRANTY') {
                    return (
                      <div className="flex flex-col gap-2">
                        <ExtendedWarrantyOverview
                          job={activeJob}
                          additionalServices={additionalServices}
                          setAdditionalServices={setAdditionalServices}
                          setShowAddServicesModal={setShowAddServicesModal}
                          getProductImage={getProductImage}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          <button
                            onClick={() => setShowInvoicePreviewModal(true)}
                            className="flex-1 bg-white border border-[#7C4DFF] hover:bg-slate-50 text-[#7C4DFF] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                          >
                            View Claim Invoice
                          </button>
                          <button
                            onClick={() => setActiveStep('billing')}
                            className="flex-1 bg-[#7C4DFF] hover:bg-purple-600 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                          >
                            Generate Invoice
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // AMC Visit
                  if (activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT') {
                    return (
                      <div className="flex flex-col gap-2">
                        <AMCOverview
                          job={activeJob}
                          additionalServices={additionalServices}
                          setAdditionalServices={setAdditionalServices}
                          setShowAddServicesModal={setShowAddServicesModal}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          <button
                            onClick={() => setShowInvoicePreviewModal(true)}
                            className="flex-1 bg-white border border-[#FFA000] hover:bg-slate-50 text-[#FFA000] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                          >
                            Preview Report
                          </button>
                          <button
                            onClick={() => setActiveStep('billing')}
                            className="flex-1 bg-[#FFA000] hover:bg-amber-500 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                          >
                            Complete Visit
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Default: NCC Paid Service (Card 1)
                  const additionalServicesTotal = additionalServices
                    .filter(s => s.checked)
                    .reduce((sum, s) => sum + s.price, 0);
                  const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 2200;
                  const totalAmount = baseServicePrice + additionalServicesTotal;

                  return (
                    <div className="flex flex-col gap-4">
                      
                      {/* Card 1: Product Details */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                        <h4 className="text-sm font-medium text-[#052355] text-left">Product Details</h4>
                        
                        {/* AC Product Row */}
                        <div className="flex gap-4 items-center">
                          <img 
                            src={getProductImage(activeJob)} 
                            alt={activeJob.product} 
                            className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                          />
                          <div className="text-left flex-1">
                            <h5 className="text-sm font-medium text-[#052355]">{activeJob.brand} Split AC 1.5 Ton Inverter</h5>
                            <p className="text-xs text-slate-600 font-normal mt-0.5">Model: {activeJob.model || 'Voltas Split AC 1.5 Ton Inverter'}</p>
                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">S/N: {activeJob.serialNo || 'VLT18GN123348X'}</p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-slate-100 w-full"></div>

                        {/* Installation & Warranty Rows */}
                        <div className="flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-normal">Installation Date</span>
                            <span className="text-xs text-[#052355] font-medium">{activeJob.installDate || '12 Jan 2023'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600 font-normal">Warranty Status</span>
                            <span className="text-xs font-medium bg-red-50 text-red-600 px-2.5 py-0.5 rounded-lg">
                              {activeJob.warrantyStatus || 'Out of Warranty'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Complaint */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-2 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Complaint</h4>
                        <p className="text-sm text-slate-700 font-normal mt-1">
                          {activeJob.complaint || 'AC not cooling properly'}
                        </p>
                      </div>

                      {/* Card 3: Additional Services (Add-on) */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Additional Services (Add-on)</h4>
                        
                        <div className="flex flex-col gap-3.5 mt-1">
                          {additionalServices.map((service) => (
                            <div key={service.id} className="flex justify-between items-center">
                              <label className="flex items-center gap-3.5 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={service.checked}
                                  onChange={() => {
                                    setAdditionalServices(prev => 
                                      prev.map(s => s.id === service.id ? { ...s, checked: !s.checked } : s)
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-[#0D47A1] focus:ring-[#0D47A1]"
                                />
                                <span className="text-xs font-normal text-slate-700">{service.name}</span>
                              </label>
                              <span className="text-xs font-medium text-[#052355]">₹{service.price}</span>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => setShowAddServicesModal(true)}
                          className="text-xs font-medium text-[#0D47A1] text-left hover:underline mt-2.5 flex items-center gap-1"
                        >
                          + Add More Service
                        </button>
                      </div>

                      {/* Card 4: Invoice Summary */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Invoice Summary</h4>
                        
                        <div className="flex flex-col gap-3.5 mt-1 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Service</span>
                            <span className="font-medium text-[#052355]">₹{baseServicePrice.toLocaleString('en-IN')}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Additional Services</span>
                            <span className="font-medium text-[#052355]">₹{additionalServicesTotal.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="h-[1px] bg-slate-100 my-1"></div>

                          <div className="flex justify-between items-center text-[#052355] font-semibold text-sm">
                            <span>Total Amount</span>
                            <span className="text-[#00C853] font-bold">₹{totalAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* View / Generate Invoice Actions */}
                      <div className="flex gap-3.5 mt-2 mb-2">
                        <button 
                          onClick={() => setShowInvoicePreviewModal(true)}
                          className="flex-1 bg-white border border-[#0D47A1] hover:bg-slate-50 text-[#0D47A1] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                        >
                          View Invoice
                        </button>
                        <button 
                          onClick={() => setActiveStep('billing')}
                          className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                        >
                          Generate Invoice
                        </button>
                      </div>

                    </div>
                  );
                })()}

                {/* Tab 2 Content: Diagnosis (AI Diagnosis & Parts Screens 6/7/8) */}
                {activeTab === 'Diagnosis' && (
                  <div className="flex flex-col gap-4">
                    
                    {/* Screen 6: AI Diagnostic Assistant */}
                    {!showAIModal && selectedParts.length === 0 && (
                      <div className="flex flex-col gap-4">
                        {/* Card 1: Complaint */}
                        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-1.5 text-left">
                          <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Complaint</span>
                          <p className="text-sm font-medium text-[#052355]">
                            {activeJob.complaint || "AC not cooling properly"}
                          </p>
                        </div>

                        {/* Card 2: AI Analysis */}
                        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-medium text-[#052355]">AI Analysis</h4>
                              <p className="text-[10px] text-slate-600 font-normal mt-0.5 leading-relaxed">
                                Based on similar cases, these could be the possible issues.
                              </p>
                            </div>
                            <span className="text-[9px] font-normal text-slate-600 uppercase tracking-wider pt-1">Probability</span>
                          </div>

                          {/* Probability items */}
                          <div className="flex flex-col mt-2">
                            {/* Capacitor Fault */}
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
                              <span className="text-xs font-medium text-[#052355]">Capacitor Fault</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#FFA000] rounded-full"></div>
                                <span className="text-xs font-medium text-[#FFA000]">75%</span>
                              </div>
                            </div>
                            {/* Low Refrigerant */}
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
                              <span className="text-xs font-medium text-[#052355]">Low Refrigerant</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#4CAF50] rounded-full"></div>
                                <span className="text-xs font-medium text-[#4CAF50]">60%</span>
                              </div>
                            </div>
                            {/* Fan Motor Issue */}
                            <div className="flex justify-between items-center py-2.5">
                              <span className="text-xs font-medium text-[#052355]">Fan Motor Issue</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#81C784] rounded-full"></div>
                                <span className="text-xs font-medium text-[#81C784]">40%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Suggested Actions */}
                        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
                          <h4 className="text-sm font-medium text-[#052355]">Suggested Actions</h4>
                          
                          <div className="flex flex-col gap-3.5 mt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-medium text-slate-700">Check capacitor</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-medium text-slate-700">Check gas pressure</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-medium text-slate-700">Verify fan motor operation</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Button */}
                        <button 
                          onClick={() => setShowAIModal(true)}
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-4 rounded-2xl text-sm transition-all shadow-md mt-4"
                        >
                          View Recommended Parts
                        </button>
                      </div>
                    )}

                    {/* Screen 7: Recommended Parts list selection */}
                    {showAIModal && (
                      <div className="flex flex-col gap-4">
                        {/* Parts List */}
                        <div className="flex flex-col gap-3.5">
                          {partsCartChecked.map((part) => (
                            <div 
                              key={part.id} 
                              className={`bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between transition-all ${
                                part.checked ? 'ring-2 ring-[#0D47A1]/10 bg-slate-50/20' : ''
                              }`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Image container */}
                                <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center p-1.5 flex-shrink-0">
                                  <img 
                                    src={part.image} 
                                    alt={part.name} 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                
                                {/* Text details */}
                                <div className="text-left flex-1">
                                  <h5 className="text-xs font-medium text-[#052355] leading-snug">{part.name}</h5>
                                  <p className="text-[10px] text-slate-600 font-normal mt-0.5">SKU: {part.sku}</p>
                                  <p className="text-xs font-medium text-[#052355] mt-1">₹{part.price}</p>
                                  <p className="text-[10px] text-green-600 font-medium mt-0.5">{part.match}% Match</p>
                                </div>
                              </div>

                              {/* Toggle Button */}
                              <button 
                                onClick={() => {
                                  setPartsCartChecked(partsCartChecked.map(p => p.id === part.id ? { ...p, checked: !p.checked } : p));
                                }}
                                className="w-8 h-8 rounded-xl bg-[#0D47A1] hover:bg-[#0A3F91] text-white flex items-center justify-center transition-all shadow-sm"
                              >
                                {part.checked ? <Check className="h-4 w-4 stroke-[3.5]" /> : <Plus className="h-4 w-4 stroke-[3.5]" />}
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Tools Needed */}
                        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
                          <h4 className="text-xs font-medium text-[#052355] uppercase tracking-wider">Tools Needed</h4>
                          
                          <div className="flex justify-start gap-6 mt-1.5 px-1">
                            {/* Manifold Gauge */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={manifoldGaugeImg} alt="Manifold Gauge" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">Manifold Gauge</span>
                            </div>

                            {/* Screw Driver */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={screwdriverImg} alt="Screw Driver" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">Screw Driver</span>
                            </div>

                            {/* Allen Key Set */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={allenKeyImg} alt="Allen Key Set" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-medium text-slate-500 text-center leading-tight">Allen Key Set</span>
                            </div>
                          </div>
                        </div>

                        {/* Not Covered Under Warranty Card (Mockup) */}
                        <div className="bg-white rounded-3xl p-4 border border-red-200/60 shadow-sm flex flex-col gap-3 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Not Covered Under Warranty</span>
                          </div>

                          <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-[#052355]">Seat Cover (AC)</span>
                              <span className="bg-red-50 text-red-600 text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Not Covered
                              </span>
                            </div>

                            <div className="space-y-1.5 text-[11px] mt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-normal">Reason</span>
                                <span className="text-slate-700 font-semibold">Physical Damage / Wear & Tear</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-normal">Customer Payable</span>
                                <span className="text-xs font-bold text-[#052355]">₹850</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-normal">Availability</span>
                                <span className="bg-green-50 text-green-600 text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  In Stock
                                </span>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              alert('Seat Cover (AC) added to customer invoice payable!');
                              const seatCoverPart = { id: 'part-seat-cover', name: 'Seat Cover (AC)', sku: 'SC-AC-99', price: 850, checked: true, image: gasRefillImg };
                              if (!partsCartChecked.find(p => p.id === 'part-seat-cover')) {
                                setPartsCartChecked([...partsCartChecked, seatCoverPart]);
                              }
                            }}
                            className="w-full py-2.5 border border-[#1E6BDB] hover:bg-blue-50/40 text-[#1E6BDB] rounded-xl text-xs font-semibold text-center transition-colors mt-1"
                          >
                            Add to Invoice
                          </button>
                        </div>

                        {/* Add selected to Cart */}
                        <button 
                          onClick={() => {
                            const selected = partsCartChecked.filter(p => p.checked);
                            setSelectedParts(selected);
                            setShowAIModal(false);
                          }}
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                        >
                          Add Selected to Cart
                        </button>
                      </div>
                    )}

                    {/* Screen 8: Upload Proof Form after parts are added */}
                    {selectedParts.length > 0 && !showAIModal && (
                      <div className="flex flex-col gap-4">
                        {/* Photos & Videos Row */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Photos Card */}
                          <div 
                            onClick={() => setProofs({ ...proofs, photos: Math.min(6, proofs.photos + 1) })}
                            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer text-left"
                          >
                            <div className="bg-[#F4F8FF] p-2 rounded-xl text-[#0D47A1] flex-shrink-0">
                              <svg className="w-5 h-5 text-[#0D47A1]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-medium text-[#052355]">Photos</h5>
                              <p className="text-[9px] text-slate-600 font-normal mt-0.5 truncate">Upload images</p>
                              <p className="text-[10px] font-medium text-[#0D47A1] mt-1">{proofs.photos}/6</p>
                            </div>
                          </div>

                          {/* Videos Card */}
                          <div 
                            onClick={() => setProofs({ ...proofs, videos: Math.min(2, proofs.videos + 1) })}
                            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 cursor-pointer text-left"
                          >
                            <div className="bg-[#F4F8FF] p-2 rounded-xl text-[#0D47A1] flex-shrink-0">
                              <Video className="h-5 w-5 stroke-[2.5]" />
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-medium text-[#052355]">Videos</h5>
                              <p className="text-[9px] text-slate-600 font-normal mt-0.5 truncate">Upload videos</p>
                              <p className="text-[10px] font-medium text-[#0D47A1] mt-1">{proofs.videos}/2</p>
                            </div>
                          </div>
                        </div>

                        {/* Voice Note Card */}
                        <div 
                          onClick={() => setProofs({ ...proofs, voiceNote: !proofs.voiceNote })}
                          className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3.5 cursor-pointer text-left"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                                <Mic className="h-5 w-5 stroke-[2]" />
                              </div>
                              <div>
                                <h5 className="text-xs font-medium text-[#052355]">Voice Note</h5>
                                <p className="text-[9px] text-slate-600 font-normal mt-0.5">
                                  {proofs.voiceNote ? 'Recorded' : 'Tap to record'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-[#052355]">
                              {proofs.voiceNote ? '0:24' : '0:00'}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-[#0D47A1] transition-all duration-300 ${proofs.voiceNote ? 'w-3/4' : 'w-0'}`}></div>
                          </div>
                        </div>

                        {/* Customer Signature Card */}
                        <div 
                          onClick={() => {
                            if (proofs.signature) {
                              setProofs({ ...proofs, signature: null });
                            } else {
                              setShowSignaturePad(true);
                            }
                          }}
                          className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                              <svg className="w-5 h-5 text-[#0D47A1]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-xs font-medium text-[#052355]">Customer Signature</h5>
                              <p className="text-[9px] text-slate-600 font-normal mt-0.5">
                                {proofs.signature ? 'Signature Captured' : 'Tap to sign'}
                              </p>
                            </div>
                          </div>
                          
                          {proofs.signature ? (
                            <span className="text-[10px] font-medium text-red-500 hover:underline">Reset</span>
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-600" />
                          )}
                        </div>

                        {/* Geo Location Card */}
                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between text-left">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                              <MapPin className="h-5 w-5 stroke-[2]" />
                            </div>
                            <div>
                              <h5 className="text-xs font-medium text-[#052355]">Geo Location</h5>
                              <p className="text-[9px] text-slate-600 font-normal mt-0.5">Capture location</p>
                            </div>
                          </div>
                          <span className="bg-green-50 text-green-600 font-medium rounded-full px-3 py-1 text-[10px]">
                            Captured
                          </span>
                        </div>

                        {/* Signature Canvas Drawing Overlay */}
                        {showSignaturePad && (
                          <div className="mt-2">
                            <SignatureCanvas 
                              onSave={(data) => {
                                setProofs({ ...proofs, signature: data });
                                setShowSignaturePad(false);
                              }}
                              onCancel={() => setShowSignaturePad(false)}
                            />
                          </div>
                        )}

                        {/* Complete diagnostics advance stepper */}
                        <button 
                          onClick={() => {
                            setEnteredInspection(false);
                            advanceStep();
                          }}
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-4 rounded-2xl text-sm transition-all shadow-md mt-4"
                        >
                          Save & Continue
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Tab 2.5 Content: Parts */}
                {activeTab === 'Parts' && (
                  <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4 text-left">
                    <h4 className="text-sm font-medium text-[#052355]">Parts Details</h4>
                    <div className="flex flex-col gap-3.5">
                      {partsCartChecked.map(part => (
                        <div key={part.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1">
                              <img src={part.image} alt={part.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-medium text-[#052355]">{part.name}</p>
                              <p className="text-[10px] text-slate-500 font-normal mt-0.5">SKU: {part.sku}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[#0D47A1]">₹{part.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3 Content: Notes */}
                {activeTab === 'Notes' && (
                  <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-medium text-[#0D47A1] uppercase tracking-wide">Job Diagnosis Notes</h4>
                    <textarea 
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      className="w-full h-32 border border-slate-200 rounded-2xl p-4 text-xs font-normal text-[#052355] focus:outline-none focus:border-[#0D47A1] resize-none bg-slate-50"
                      placeholder="Add diagnostic comments, client concerns, or parts details..."
                    />
                    <button 
                      onClick={() => alert('Notes saved successfully!')}
                      className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3 rounded-2xl text-xs transition-all"
                    >
                      Save Notes
                    </button>
                  </div>
                )}

                {/* Tab 4 Content: History */}
                {activeTab === 'History' && (
                  <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-medium text-[#0D47A1] uppercase tracking-wide">Appliance Service History</h4>
                    
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-start">
                        <div>
                          <p className="text-xs font-normal text-[#052355]">Routine Wet Cleaning</p>
                          <p className="text-[10px] text-slate-600 font-normal mt-0.5">Technician: Inderjeet Singh</p>
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">24 May 2025</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-start">
                        <div>
                          <p className="text-xs font-normal text-[#052355]">Power Cord Replacement</p>
                          <p className="text-[10px] text-slate-600 font-normal mt-0.5">Technician: Inderjeet Singh</p>
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">11 Jan 2024</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Step: SPARE APPROVAL (Step 4) */}
            {activeStep === 'spareapproval' && (() => {
              const isWarrantyType = activeJob?.type === 'Brand Warranty' || activeJob?.type === 'BRAND WARRANTY' || activeJob?.type === 'NCC Extended Warranty' || activeJob?.type === 'NCC EXTENDED WARRANTY';
              const isAMC = activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT';
              const approvalColor = isWarrantyType ? 'bg-[#1E6BDB]' : isAMC ? 'bg-[#FFA000]' : 'bg-[#0D47A1]';
              const approvalIconColor = isWarrantyType ? 'text-blue-500 bg-blue-50' : isAMC ? 'text-amber-500 bg-amber-50' : 'text-amber-500 bg-amber-50';
              return (
                <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4 text-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${approvalIconColor}`}>
                    <Clock className="h-7 w-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-normal text-[#052355]">
                      {isWarrantyType ? 'Claim Parts Authorization' : isAMC ? 'AMC Parts Approval' : 'Spare Approval Pending'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-normal">
                      {isWarrantyType
                        ? 'Verifying NCC coverage for selected parts. Parts covered under warranty will be FOC. Usually approved within 5 minutes.'
                        : isAMC
                          ? 'Verifying if selected parts fall under your AMC plan scope. Usually approved within 5 minutes.'
                          : 'We are verifying extended warranty coverage for your selected parts. Usually approved within 5 minutes.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
                    <span className="text-[10px] font-medium tracking-wider text-slate-600 uppercase">Items for Approval</span>
                    {selectedParts.map(part => (
                      <div key={part.id} className="flex justify-between text-xs font-normal text-slate-600">
                        <span>{part.name}</span>
                        <span className="text-green-600 font-normal">Checked</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => advanceStep()}
                    className={`w-full ${approvalColor} text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2`}
                  >
                    Simulate Approval (Next Step)
                  </button>
                </div>
              );
            })()}

            {/* Step: REPAIR COMPLETE (Step 5) */}
            {activeStep === 'repaircomplete' && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-normal text-[#052355]">Repair Work Resolution</h3>
                <p className="text-xs text-slate-600 font-normal">Parts are approved and fitted. Please confirm repair resolution with the client and proceed to close payment.</p>
                
                <div className="bg-[#E3ECF9]/50 border border-[#0D47A1]/10 rounded-2xl p-4 flex items-center gap-3">
                  <Info className="h-5 w-5 text-[#0D47A1]" />
                  <span className="text-xs font-normal text-[#0D47A1]">Verify all checklist items are ticked off.</span>
                </div>

                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md"
                >
                  Proceed to Invoice & Billing
                </button>
              </div>
            )}

            {/* Step: BILLING (Step 6 / Screen 12: Billing & Estimate) */}
            {activeStep === 'billing' && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-3">
                  <span className="inline-block text-[10px] font-normal text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200">
                    D2C Paid Service
                  </span>
                  <h3 className="text-base font-medium text-[#052355] mt-2">Billing & Estimate</h3>
                  <p className="text-xs text-slate-600 font-normal">Estimate breakdown for Rohit Sharma</p>
                </div>

                <div className="flex flex-col gap-3.5 border-b border-slate-200 pb-4 text-xs font-normal text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Service Charge</span>
                    <span className="text-[#052355]">₹500</span>
                  </div>
                  
                  {selectedParts.map(part => (
                    <div key={part.id} className="flex justify-between">
                      <span className="text-slate-600">Spare Part ({part.name})</span>
                      <span className="text-[#052355]">₹{part.price}</span>
                    </div>
                  ))}

                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (18% GST)</span>
                    <span className="text-[#052355]">₹282</span>
                  </div>
                </div>

                {/* Payable vs Earnings */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-slate-500">Customer Payable</span>
                    <span className="text-xl font-medium text-green-600">₹2,112</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-slate-500">Technician Earnings</span>
                    <span className="text-base font-medium text-[#0D47A1]">₹{activeJob.estEarnings.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                 {/* File Action PDF / Whatsapp */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button 
                    onClick={() => {
                      const additionalServicesTotal = additionalServices
                        .filter(s => s.checked)
                        .reduce((sum, s) => sum + s.price, 0);
                      const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 2200;
                      const totalAmount = baseServicePrice + additionalServicesTotal;

                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Invoice - #${activeJob.id}</title>
                            <style>
                              body { font-family: sans-serif; padding: 40px; color: #333; }
                              .header { border-bottom: 2px solid #052355; padding-bottom: 20px; margin-bottom: 20px; }
                              .title { font-size: 24px; color: #052355; font-weight: bold; }
                              .details { margin-bottom: 30px; font-size: 14px; line-height: 1.6; }
                              .items { width: 100%; border-collapse: collapse; }
                              .items th { border-bottom: 2px solid #eee; padding: 10px; text-align: left; }
                              .items td { border-bottom: 1px solid #eee; padding: 10px; }
                              .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; color: #00C853; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="title">NCC Partner Service Invoice</div>
                              <div>Invoice: #INV-${activeJob.id}</div>
                            </div>
                            <div class="details">
                              <strong>Customer:</strong> ${activeJob.customerName}<br>
                              <strong>Phone:</strong> ${activeJob.phone}<br>
                              <strong>Product:</strong> ${activeJob.brand} ${activeJob.product}<br>
                              <strong>Status:</strong> Paid / Closed
                            </div>
                            <table class="items">
                              <thead>
                                <tr>
                                  <th>Item Description</th>
                                  <th>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Base Service Charge</td>
                                  <td>₹${baseServicePrice}</td>
                                </tr>
                                ${additionalServices.filter(s => s.checked).map(service => '<tr><td>' + service.name + '</td><td>₹' + service.price + '</td></tr>').join('')}
                              </tbody>
                            </table>
                            <div class="total">Grand Total: ₹${totalAmount.toLocaleString('en-IN')}</div>
                            <script>
                              window.onload = function() { window.print(); }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-[#052355] font-normal py-3 rounded-2xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText className="h-4 w-4 text-[#0D47A1]" />
                    Generate PDF
                  </button>
                  <button 
                    onClick={() => {
                      const additionalServicesTotal = additionalServices
                        .filter(s => s.checked)
                        .reduce((sum, s) => sum + s.price, 0);
                      const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 2200;
                      const totalAmount = baseServicePrice + additionalServicesTotal;

                      const whatsappText = `Hi ${activeJob.customerName || 'Customer'}, here is the invoice of ₹${totalAmount.toLocaleString('en-IN')} for your ${activeJob.brand} ${activeJob.product} service: http://nccpartner.com/invoice/INV-${activeJob.id}`;
                      const whatsappUrl = `https://api.whatsapp.com/send?phone=91${activeJob.phone || '9876543210'}&text=${encodeURIComponent(whatsappText)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-green-600 font-normal py-3 rounded-2xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Send WhatsApp
                  </button>
                </div>

                <button 
                  onClick={() => {
                    collectPayment();
                    // Decrement AMC visits remaining
                    if ((activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT') && activeJob?.id) {
                      decrementAmcVisit(activeJob.id);
                    }
                    // Decrement EW claims remaining
                    if ((activeJob?.type === 'NCC Extended Warranty' || activeJob?.type === 'NCC EXTENDED WARRANTY') && activeJob?.id) {
                      decrementEwClaim(activeJob.id);
                    }
                  }}
                  className="w-full bg-[#FFD400] hover:bg-yellow-400 text-[#052355] font-medium py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  {activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT'
                    ? 'Close Visit & Generate Report'
                    : activeJob?.type === 'NCC Extended Warranty' || activeJob?.type === 'NCC EXTENDED WARRANTY'
                      ? 'Close Claim Job'
                      : activeJob?.type === 'Brand Warranty' || activeJob?.type === 'BRAND WARRANTY'
                        ? 'Close Warranty Job'
                        : 'Collect Payment (Complete Job)'}
                </button>
              </div>
            )}
            </>
          )}

          </div>
        )}

        {/* STEP C: JOB COMPLETED SUCCESS VIEW (Screen 4 Outcome) */}
        {activeStep === 'completed' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm text-center flex flex-col gap-6 py-10 my-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto border border-green-100 shadow-sm">
              <CheckCircle className="h-10 w-10 stroke-[2.5]" />
            </div>
            
            <div>
              <h2 className="text-2xl font-medium text-[#052355]">Job Completed!</h2>
              <p className="text-sm text-slate-600 mt-2 font-normal">Great work! The diagnostics and service records have been closed successfully.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs font-normal text-slate-600 space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/50 pb-2">
                <span className="text-slate-600">Job Reference</span>
                <span className="text-[#052355]">#8842</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-2">
                <span className="text-slate-600">Total Earnings Added</span>
                <span className="text-[#0D47A1]">₹850</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status</span>
                <span className="text-green-600 font-normal bg-green-50 px-2 py-0.5 rounded-md text-[10px]">Closed & Paid</span>
              </div>
            </div>

            <button 
              onClick={() => {
                resetActiveJob();
                navigate('/technician/dashboard');
              }}
              className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
            >
              Back to Dashboard
            </button>
          </div>
        )}

      </div>

      {/* Add More Services Overlay Card Modal */}
      {showAddServicesModal && (() => {
        const AVAILABLE_ADDONS = [
          { id: 'foam', name: 'AC Foam Wash', price: 399 },
          { id: 'coil', name: 'Condenser Coil Cleaning', price: 299 },
          { id: 'leak', name: 'Gas Leakage Fix', price: 499 },
          { id: 'capacitor', name: 'Capacitor Replacement', price: 440 },
          { id: 'wiring', name: 'Wiring Repair', price: 199 }
        ];

        // Filter out addons that are currently checked/active in the additionalServices list
        const filteredAddons = AVAILABLE_ADDONS.filter(
          addon => !additionalServices.some(s => s.name.toLowerCase() === addon.name.toLowerCase() && s.checked)
        );

        return (
          <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 border border-slate-100">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-[#052355]">Add More Services</h3>
                <button 
                  onClick={() => setShowAddServicesModal(false)}
                  className="text-slate-400 hover:text-slate-650 text-xs font-semibold hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col gap-3.5 max-h-64 overflow-y-auto pr-1">
                {filteredAddons.length > 0 ? (
                  filteredAddons.map(addon => (
                    <div key={addon.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-[#052355]">{addon.name}</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">₹{addon.price}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setAdditionalServices(prev => {
                            const existingIndex = prev.findIndex(s => s.name.toLowerCase() === addon.name.toLowerCase());
                            if (existingIndex > -1) {
                              return prev.map((s, idx) => idx === existingIndex ? { ...s, checked: true } : s);
                            }
                            return [
                              ...prev,
                              { id: addon.id, name: addon.name, price: addon.price, checked: true }
                            ];
                          });
                          setShowAddServicesModal(false);
                        }}
                        className="bg-[#E3ECF9] hover:bg-[#c2d7f5] text-[#0D47A1] text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-5">All available services have been added.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Invoice Preview Overlay Card Modal */}
      {showInvoicePreviewModal && (() => {
        const additionalServicesTotal = additionalServices
          .filter(s => s.checked)
          .reduce((sum, s) => sum + s.price, 0);
        const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 2200;
        const totalAmount = baseServicePrice + additionalServicesTotal;

        return (
          <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#052355] flex items-center justify-center text-white text-xs font-bold">N</div>
                  <span className="text-sm font-semibold text-[#052355]">NCC Invoice Preview</span>
                </div>
                <button 
                  onClick={() => setShowInvoicePreviewModal(false)}
                  className="text-slate-400 hover:text-slate-650 text-xs font-semibold hover:underline"
                >
                  Close
                </button>
              </div>

              <div className="text-left flex flex-col gap-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Invoice No:</span>
                  <span className="font-semibold text-[#052355]">#INV-8842</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Customer:</span>
                  <span className="font-semibold text-[#052355]">{activeJob?.customerName || 'Rohit Sharma'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Product:</span>
                  <span className="font-semibold text-[#052355]">{activeJob?.brand} {activeJob?.product}</span>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <span className="font-semibold text-[#052355] text-[11px] uppercase tracking-wider">Line Items</span>
                  <div className="flex justify-between pl-2">
                    <span>Base Service Charge:</span>
                    <span className="font-medium text-[#052355]">₹{baseServicePrice}</span>
                  </div>
                  {additionalServices.filter(s => s.checked).map(service => (
                    <div key={service.id} className="flex justify-between pl-2">
                      <span>{service.name}:</span>
                      <span className="font-medium text-[#052355]">₹{service.price}</span>
                    </div>
                  ))}
                </div>

                <div className="h-[1px] bg-slate-200 my-2"></div>

                <div className="flex justify-between text-sm text-[#052355] font-bold">
                  <span>Total Payable:</span>
                  <span className="text-[#00C853]">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button 
                onClick={() => setShowInvoicePreviewModal(false)}
                className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md mt-2"
              >
                Okay, Got it
              </button>
            </div>
          </div>
        );
      })()}

      {/* Screen 16: AI Assistant Chat Panel Slide-over Drawer Overlay */}
      {chatOpen && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 transition-all flex flex-col justify-end">
          <div className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col shadow-2xl relative border-t border-slate-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-[#052355] text-white rounded-t-[2.5rem]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="h-5 w-5 text-[#FFD400] fill-[#FFD400]" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-white">AI Diagnostic Assistant</h3>
                  <p className="text-[10px] text-slate-500 font-normal">Online • Ready to assist</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors"
              >
                <ChevronRight className="h-6 w-6 rotate-90" />
              </button>
            </div>

            {/* Chat Messages viewport */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 max-h-[45vh] min-h-[300px] no-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-3xl p-3.5 text-xs font-normal leading-relaxed shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1]/20 rounded-br-none' 
                      : 'bg-slate-50 text-[#052355] border-slate-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions (Screen 16 pills) */}
            <div className="px-3.5 pb-3 flex gap-2 overflow-x-auto no-scrollbar -mx-2">
              {[
                'Find Spare Parts',
                'Diagnostic Help',
                'Warranty Check',
                'Estimate Help'
              ].map(action => (
                <button
                  key={action}
                  onClick={() => addChatMessage(action, 'user')}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#052355] text-[10px] font-normal px-3.5 py-2 rounded-full whitespace-nowrap transition-all shadow-sm"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-4 border-t border-slate-200 flex gap-2.5 bg-slate-50 rounded-b-none items-center">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Ask AI Assistant about diagnostics..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-normal focus:outline-none focus:border-[#0D47A1]"
              />
              <button 
                onClick={handleSendChatMessage}
                className="p-3 bg-[#0D47A1] hover:bg-[#0A3F91] text-white rounded-2xl transition-all shadow-sm"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Invoice PDF Preview Modal */}
      {showInvoicePdfModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-[#0D47A1]" />
                <span className="text-sm font-semibold text-[#052355]">invoice_voltas_ac.pdf</span>
              </div>
              <button 
                onClick={() => setShowInvoicePdfModal(false)}
                className="text-slate-400 hover:text-slate-655 text-xs font-semibold hover:underline"
              >
                Close
              </button>
            </div>

            {/* Styled Mock PDF Invoice Content */}
            <div className="bg-slate-55 border border-slate-200 rounded-2xl p-4 text-left flex flex-col gap-3.5 text-xs text-slate-600 font-sans shadow-inner">
              {/* Logo / Company */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-[#052355] tracking-wide">Croma Electronics</h3>
                  <p className="text-[10px] text-slate-500 font-normal">Lucknow Retail Store, Hazratganj</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold bg-[#E8F5E9] text-green-700 px-2 py-0.5 rounded uppercase">PAID</span>
                </div>
              </div>

              <div className="h-[1px] bg-slate-200 w-full"></div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-normal leading-relaxed">
                <div>
                  <span className="text-slate-400 block uppercase font-medium">Invoice Number</span>
                  <span className="text-[#052355] font-semibold">CRM-2023-889120</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-medium">Date</span>
                  <span className="text-[#052355] font-semibold">12 Jan 2023</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block uppercase font-medium">Customer</span>
                  <span className="text-[#052355] font-semibold">Rohit Sharma</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block uppercase font-medium">Payment Mode</span>
                  <span className="text-[#052355] font-semibold">Credit Card (Visa)</span>
                </div>
              </div>

              <div className="h-[1px] bg-slate-200 w-full"></div>

              {/* Table details */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Line Items</span>
                <div className="flex justify-between items-center text-[11px]">
                  <div className="text-left">
                    <p className="font-semibold text-[#052355]">Voltas Split AC 1.5 Ton</p>
                    <p className="text-[9px] text-slate-500 font-normal">Model: VLT18GN123348X • Inverter 3-Star</p>
                  </div>
                  <span className="font-semibold text-[#052355]">₹38,990</span>
                </div>
                <div className="flex justify-between items-center text-[11px] mt-1">
                  <div className="text-left">
                    <p className="font-semibold text-[#052355]">Standard Installation Service</p>
                    <p className="text-[9px] text-slate-500 font-normal">Nigam Care verified partner installation</p>
                  </div>
                  <span className="font-semibold text-[#052355]">₹1,500</span>
                </div>
              </div>

              <div className="h-[1px] bg-slate-200 w-full"></div>

              {/* Totals */}
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#052355]">₹40,490</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span className="font-semibold text-[#052355]">₹7,288</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#052355] pt-1.5 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-green-600">₹47,778</span>
                </div>
              </div>

            </div>

            {/* Action button */}
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Purchase Invoice - CRM-2023-889120</title>
                      <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 600px; margin: auto; }
                        .header { border-bottom: 2px solid #052355; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                        .brand { font-size: 22px; color: #052355; font-weight: bold; }
                        .status { font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: sans-serif; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 13px; }
                        .details-label { color: #888; text-transform: uppercase; font-size: 10px; font-weight: bold; }
                        .details-value { font-weight: 600; color: #052355; margin-top: 2px; }
                        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .items-table th { border-bottom: 2px solid #eee; padding: 10px 5px; text-align: left; font-size: 11px; color: #888; text-transform: uppercase; }
                        .items-table td { border-bottom: 1px solid #eee; padding: 12px 5px; font-size: 13px; }
                        .item-desc { font-weight: bold; color: #052355; }
                        .item-sub { font-size: 10px; color: #666; margin-top: 2px; }
                        .totals-section { margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px; font-size: 13px; }
                        .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                        .grand-total { font-size: 16px; font-weight: bold; color: #052355; border-top: 2px solid #052355; padding-top: 12px; margin-top: 10px; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div>
                          <div class="brand">Croma Electronics</div>
                          <div style="font-size: 11px; color: #666; margin-top: 2px;">Lucknow Retail Store, Hazratganj</div>
                        </div>
                        <div class="status">PAID</div>
                      </div>
                      <div class="details-grid">
                        <div>
                          <div class="details-label">Invoice Number</div>
                          <div class="details-value">CRM-2023-889120</div>
                        </div>
                        <div>
                          <div class="details-label">Date</div>
                          <div class="details-value">12 Jan 2023</div>
                        </div>
                        <div>
                          <div class="details-label">Customer</div>
                          <div class="details-value">Rohit Sharma</div>
                        </div>
                        <div>
                          <div class="details-label">Payment Mode</div>
                          <div class="details-value">Credit Card (Visa)</div>
                        </div>
                      </div>
                      <table class="items-table">
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th style="text-align: right;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div class="item-desc">Voltas Split AC 1.5 Ton</div>
                              <div class="item-sub">Model: VLT18GN123348X • Inverter 3-Star</div>
                            </td>
                            <td style="text-align: right; font-weight: 600; color: #052355;">₹38,990</td>
                          </tr>
                          <tr>
                            <td>
                              <div class="item-desc">Standard Installation Service</div>
                              <div class="item-sub">Nigam Care verified partner installation</div>
                            </td>
                            <td style="text-align: right; font-weight: 600; color: #052355;">₹1,500</td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="totals-section">
                        <div class="totals-row">
                          <span>Subtotal</span>
                          <span style="font-weight: 600; color: #052355;">₹40,490</span>
                        </div>
                        <div class="totals-row">
                          <span>GST (18%)</span>
                          <span style="font-weight: 600; color: #052355;">₹7,288</span>
                        </div>
                        <div class="totals-row grand-total">
                          <span>Grand Total</span>
                          <span style="color: #2e7d32;">₹47,778</span>
                        </div>
                      </div>
                      <script>
                        window.onload = function() { window.print(); }
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
            >
              Download PDF Invoice
            </button>
          </div>
        </div>
      )}

      {/* AMC Service History Drawer — shown after "Mark as Inspection Arrived" for AMC jobs */}
      {showAmcHistoryDrawer && (
        <AMCHistoryDrawer
          job={activeJob}
          onStartVisit={() => {
            setShowAmcHistoryDrawer(false);
            setEnteredInspection(true);
          }}
        />
      )}

      {/* Bottom Navigation */}
      {!(activeStep === 'inspection' && !enteredInspection) && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
          <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
            <Briefcase className="h-6 w-6 stroke-[2.5]" />
            <span className="text-[10px] font-medium tracking-wide">Jobs</span>
          </button>
          <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <ClipboardList className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Requests</span>
          </button>
          <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <Wrench className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Inventory</span>
          </button>
          <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <Calendar className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Schedule</span>
          </button>
          <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
            <User className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-normal tracking-wide">Profile</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default ActiveJob;
