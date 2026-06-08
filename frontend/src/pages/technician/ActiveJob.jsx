import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, User, Wrench, 
  MapPin, Phone, MessageSquare, Shield, Share2, MoreVertical, CheckCircle, 
  Clock, Plus, Info, Upload, Check, Video, Mic, FileText, Send, Sparkles,
  ChevronRight
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
      <h4 className="text-xs font-bold text-[#052355] mb-2 uppercase tracking-wide">Draw Signature Below</h4>
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
        <button type="button" onClick={clear} className="flex-1 bg-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-700">Clear</button>
        <button type="button" onClick={save} className="flex-1 bg-[#0D47A1] py-2.5 rounded-xl text-xs font-bold text-white shadow-sm">Save</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-400">Cancel</button>
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
    selectedParts,
    setSelectedParts,
    proofs,
    setProofs,
    addChatMessage,
    chatMessages
  } = useTech();

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
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Diagnosis', 'Notes', 'History'
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [notesText, setNotesText] = useState('AC compressor draws high current initially. Fan motor runs, but cooling is zero. Suspect run capacitor degradation.');
  const [enteredInspection, setEnteredInspection] = useState(false);

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
      <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-between pb-24 max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/technician/dashboard')} className="p-1 hover:bg-slate-50 rounded-full">
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            <h1 className="text-lg font-bold text-[#052355]">Active Job Details</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 bg-[#E3ECF9] rounded-full flex items-center justify-center text-[#0D47A1]">
            <Briefcase className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#052355]">No Active Job In Progress</h2>
            <p className="text-sm text-slate-400 mt-1">Please accept a job from your dashboard to begin the service process.</p>
          </div>
          <button 
            onClick={() => navigate('/technician/dashboard')}
            className="mt-4 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all shadow-sm"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 py-3 px-6 flex justify-between items-center z-20 shadow-lg">
          <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <Briefcase className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Jobs</span>
          </button>
          <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <ClipboardList className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Requests</span>
          </button>
          <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <Wrench className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Inventory</span>
          </button>
          <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <Calendar className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Schedule</span>
          </button>
          <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <User className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Profile</span>
          </button>
        </div>
      </div>
    );
  }

  // Helper function to render Stepper states (Screen 4 style)
  const renderStepper = (isPage = false) => {
    const steps = [
      { id: 'assigned', label: 'Assigned', desc: 'Job has been assigned to you' },
      { id: 'ontheway', label: 'On The Way', desc: 'You are on the way to customer' },
      { id: 'inspection', label: 'Inspection', desc: 'Inspect and confirm the issue' },
      { id: 'spareapproval', label: 'Spare Approval', desc: 'Waiting for spare approval' },
      { id: 'repaircomplete', label: 'Repair Complete', desc: 'Complete the repair work' },
      { id: 'billing', label: 'Payment Closed', desc: 'Payment collected / Claim closed' }
    ];

    const getStepStatus = (id) => {
      const stepOrder = ['assigned', 'ontheway', 'inspection', 'spareapproval', 'repaircomplete', 'billing'];
      const currentIndex = stepOrder.indexOf(activeStep);
      const targetIndex = stepOrder.indexOf(id);

      if (targetIndex < currentIndex) return 'completed';
      if (targetIndex === currentIndex) return 'active';
      return 'pending';
    };

    const stepperContent = (
      <div className={`flex flex-col relative ${isPage ? 'gap-4 px-1 py-2' : 'gap-4 pl-7 mt-2'}`}>
        {/* Timeline Connector Line for non-page layout */}
        {!isPage && (
          <div className="absolute left-[9px] top-2 bottom-12 w-0.5 bg-slate-100"></div>
        )}

        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isActive = status === 'active';
          
          if (isPage) {
            return (
              <div 
                key={step.id} 
                className={`relative flex items-center py-2 px-4 rounded-2xl transition-all ${
                  isActive ? 'bg-[#F4F8FF]' : ''
                }`}
              >
                {/* Segmented Timeline Line */}
                {idx < steps.length - 1 && (
                  <div className={`absolute left-[32px] -translate-x-1/2 top-[24px] bottom-[-40px] w-[2px] z-0 ${
                    idx < 2 ? 'bg-[#00C853]' : 'bg-slate-200'
                  }`} />
                )}

                {/* Step Icon Indicator */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                  status === 'completed' 
                    ? 'bg-[#00C853] text-white' 
                    : isActive 
                      ? 'bg-[#0D47A1] text-white ring-4 ring-[#E3ECF9]' 
                      : 'bg-white border-2 border-slate-200 text-slate-350'
                }`}>
                  {idx + 1}
                </div>

                <div className="ml-4 flex-1 text-left">
                  <h4 className={`text-sm font-extrabold transition-all ${
                    isActive || status === 'completed' ? 'text-[#052355]' : 'text-slate-700'
                  }`}>
                    {step.label}
                  </h4>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    isActive || status === 'completed' ? 'text-slate-600' : 'text-slate-500'
                  }`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Step Icon Indicator */}
              <div className={`absolute -left-[28px] top-0 w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 text-[10px] font-bold z-10 transition-all ${
                status === 'completed' 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : status === 'active' 
                    ? 'bg-white border-[#0D47A1] text-[#0D47A1] ring-4 ring-[#E3ECF9]' 
                    : 'bg-white border-slate-200 text-slate-300'
              }`}>
                {status === 'completed' ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
              </div>

              <div className="flex-1">
                <h4 className={`text-xs font-bold transition-all ${
                  status === 'active' ? 'text-[#052355]' : 'text-slate-505'
                }`}>
                  {step.label}
                </h4>
                {status === 'active' && (
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{step.desc}</p>
                )}
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
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-55">
          <span className="text-[10px] font-bold text-[#0D47A1] bg-[#E3ECF9] px-2.5 py-1 rounded-full uppercase tracking-wider">Job Progress</span>
          <span className="text-xs font-bold text-slate-500">#{activeJob.id}</span>
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
    <div className={`min-h-screen flex flex-col max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans ${
      activeStep === 'inspection' && !enteredInspection ? 'bg-white pb-1' : 'bg-[#F5F8FC] pb-24'
    }`}>
      
      {/* Header */}
      {activeStep === 'details' && activeJob ? (
        /* Navy Blue Header for Job Details Screen 3 */
        <div className="bg-[#052355] text-white pt-4 pb-12 px-6 flex flex-col gap-4 rounded-b-[2.5rem] relative z-10 shadow-md">
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
              <h1 className="text-sm font-bold text-white tracking-wide">Job Details</h1>
              <span className="text-[10px] text-white/70 block font-semibold mt-0.5">#{activeJob.id}</span>
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Subheader Badges Row */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="bg-[#00C853] text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              {activeJob.type === 'D2C Paid Service' ? 'D2C PAID SERVICE' : activeJob.type.toUpperCase()}
            </span>
            <span className="text-xs text-white/90 font-bold">
              {activeJob.warrantyStatus}
            </span>
          </div>
        </div>
      ) : activeStep === 'inspection' && !enteredInspection ? (
        /* White Header for Job Progress Stepper View (Screen 4) */
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => {
              setActiveStep('details');
            }} 
            className="p-1 hover:bg-slate-50 rounded-full text-slate-700"
          >
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          
          <div className="text-center">
            <h1 className="text-base font-bold text-[#052355]">Job Progress</h1>
            <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">#{activeJob.id}</span>
          </div>

          <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-700">
            <MoreVertical className="h-5 w-5 text-slate-700" />
          </button>
        </div>
      ) : activeStep === 'inspection' && enteredInspection ? (
        /* White Header for Job Details worksheets View (Screen 5) */
        activeTab === 'Diagnosis' && selectedParts.length === 0 ? (
          <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center sticky top-0 z-10">
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
              <h1 className="text-base font-extrabold text-[#0D47A1]">
                {showAIModal ? 'Recommended Parts' : 'AI Diagnostic Assistant'}
              </h1>
            </div>
          </div>
        ) : activeTab === 'Diagnosis' && selectedParts.length > 0 ? (
          <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center sticky top-0 z-10">
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
              <h1 className="text-base font-extrabold text-[#0D47A1]">Upload Proof</h1>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <button 
              onClick={() => {
                setEnteredInspection(false);
              }} 
              className="p-1 hover:bg-slate-50 rounded-full text-slate-700"
            >
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            
            <div className="text-center">
              <h1 className="text-base font-bold text-[#052355]">Job Details</h1>
            </div>

            <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-700">
              <MoreVertical className="h-5 w-5 text-slate-700" />
            </button>
          </div>
        )
      ) : (
        /* Regular White Header for Job Progress Stepper */
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
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
            <h1 className="text-base font-bold text-[#052355]">
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
              <span className="text-[10px] font-black tracking-wider uppercase">AI Assist</span>
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
            ? 'pt-2 px-5 pb-5 gap-4'
            : 'p-5 gap-4'
      }`}>
        
        {/* STEP A: UNACCEPTED DETAILS VIEW (Screen 3) */}
        {activeStep === 'details' && activeJob && (
          <div className="flex flex-col gap-4 mt-[-2.5rem] relative z-20 px-1">
            
            {/* Unified Main Info Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex flex-col gap-4">
              {/* Job Summary Section */}
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-extrabold text-[#052355] text-left">
                  {activeJob.product} Repair
                </h2>
                <p className="text-xs text-slate-400 font-bold text-left">
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
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Customer</span>
                  <p className="text-base font-extrabold text-[#052355] mt-1">{activeJob.customerName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-bold">{activeJob.phone}</p>
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
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Service Address</span>
                <p className="text-sm font-bold text-[#052355] mt-1 leading-relaxed">{activeJob.address}</p>
                
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <span className="text-[11px] font-bold text-slate-450">• {activeJob.distance} km away</span>
                  <button 
                    onClick={() => alert(`Opening Google Maps navigation to: ${activeJob.address}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F1FF] text-[#1A73E8] font-bold rounded-full text-[11px] hover:bg-[#D4E5FF] transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#1A73E8]" />
                    Navigate
                  </button>
                </div>
              </div>
            </div>

            {/* Estimates & Payable */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-bold">Customer Payable</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                  activeJob.price > 0 ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#E3ECF9] text-[#1E6BDB]'
                }`}>
                  {activeJob.price > 0 ? 'PAID SERVICE' : 'FREE SERVICE'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-bold">Est. Spare Cost</span>
                <span className="text-sm font-black text-[#052355]">₹{activeJob.price > 0 ? '950' : '0'}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-bold">Est. Earn</span>
                <span className="text-sm font-black text-[#052355]">₹{activeJob.estEarnings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-bold">Payment Mode</span>
                <span className="text-xs font-bold text-slate-600">
                  {activeJob.price > 0 ? 'UPI / Cash / Card' : 'NCC Claim Payout'}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3.5 mt-2">
              <button 
                onClick={() => { setActiveStep('inspection'); setActiveTab('Overview'); }}
                className="flex-1 bg-white hover:bg-slate-50 text-[#0D47A1] font-bold py-3 px-4 rounded-xl text-xs transition-all border border-[#0D47A1]/20 shadow-xs"
              >
                View Details
              </button>
              <button 
                onClick={() => { setActiveStep('assigned'); }}
                className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                Accept Job
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
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md mt-8 mb-1"
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
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#052355]">Assigned Job Details</h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-[#052355]">{activeJob.brand} {activeJob.product}</p>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Client: {activeJob.customerName}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">{activeJob.address}</p>
                </div>
                
                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  Start Trip (On My Way)
                </button>
              </div>
            )}

            {/* Step: ON THE WAY (Step 2) */}
            {activeStep === 'ontheway' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#052355]">En-Route to Client</h3>
                
                <div className="h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-blue-50/20 flex flex-col items-center justify-center text-center p-4">
                    <MapPin className="h-10 w-10 text-red-500 animate-bounce mb-2" />
                    <span className="text-xs font-bold text-[#052355]">Simulated Navigation Route</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Alex is 0.4 km away from Rohit Sharma</span>
                  </div>
                </div>

                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md"
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
                  <div className="flex justify-between items-center bg-white p-1 rounded-2xl border border-slate-100 shadow-xs gap-1 mx-[-10px]">
                    {['Overview', 'Diagnosis', 'Notes', 'History'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-center py-2.5 rounded-xl text-xs font-black transition-all ${
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

                {/* Tab 1 Content: Overview */}
                {activeTab === 'Overview' && (
                  <div className="flex flex-col gap-4">
                    
                    {/* Card 1: Product Details */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                      <h4 className="text-sm font-extrabold text-[#052355] text-left">Product Details</h4>
                      
                      {/* AC Product Row */}
                      <div className="flex gap-4 items-center">
                        <img 
                          src={getProductImage(activeJob)} 
                          alt={activeJob.product} 
                          className="w-16 h-16 object-contain rounded-xl border border-slate-100 p-1"
                        />
                        <div className="text-left flex-1">
                          <h5 className="text-sm font-extrabold text-[#052355]">{activeJob.brand} Split AC 1.5 Ton</h5>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">Model: {activeJob.model || '183V Vectra'}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">S/N: {activeJob.serialNo || 'VLT183V123456'}</p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-[1px] bg-slate-100 w-full"></div>

                      {/* Installation & Warranty Rows */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-450 font-bold">Installation Date</span>
                          <span className="text-xs text-[#052355] font-extrabold">{activeJob.installDate || '12 Jan 2023'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-450 font-bold">Warranty Status</span>
                          <span className="text-xs font-extrabold bg-red-50 text-red-600 px-2.5 py-0.5 rounded-lg">
                            {activeJob.warrantyStatus || 'Out of Warranty'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Complaint */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-2 text-left">
                      <h4 className="text-sm font-extrabold text-[#052355]">Complaint</h4>
                      <p className="text-sm text-slate-700 font-bold mt-1">
                        {activeJob.complaint || 'AC not cooling properly'}
                      </p>
                    </div>

                    {/* Card 3: Invoice */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 text-left">
                      <h4 className="text-sm font-extrabold text-[#052355]">Invoice</h4>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-2.5 rounded-2xl flex-1 max-w-[70%]">
                          <div className="w-12 h-10 bg-white border border-slate-200 rounded-lg flex flex-col justify-between p-1 overflow-hidden shadow-2xs">
                            <div className="h-1 bg-slate-300 w-8 rounded-full"></div>
                            <div className="h-0.5 bg-slate-200 w-10 rounded-full"></div>
                            <div className="h-0.5 bg-slate-250 w-6 rounded-full"></div>
                            <div className="h-1 bg-[#0D47A1]/20 w-8 rounded-full"></div>
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-700 truncate">invoice_voltas_ac.pdf</p>
                            <p className="text-[10px] text-slate-400 font-bold">PDF Document • 420 KB</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => alert('Viewing Invoice PDF...')}
                          className="text-xs font-extrabold text-[#0D47A1] bg-[#E3ECF9] px-4.5 py-2 rounded-2xl hover:bg-[#c2d7f5] transition-all"
                        >
                          View
                        </button>
                      </div>
                    </div>

                    {/* Card 4: Brand Support */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 text-left">
                      <h4 className="text-sm font-extrabold text-[#052355]">Brand Support</h4>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-extrabold text-[#052355]">{activeJob.brand} Customer Care</p>
                          <a 
                            href="tel:18001234555" 
                            className="flex items-center gap-1 text-xs text-[#0D47A1] font-bold mt-1 hover:underline"
                          >
                            1800 123 4555
                          </a>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">0:00</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Tab 2 Content: Diagnosis (AI Diagnosis & Parts Screens 6/7/8) */}
                {activeTab === 'Diagnosis' && (
                  <div className="flex flex-col gap-4">
                    
                    {/* Screen 6: AI Diagnostic Assistant */}
                    {!showAIModal && selectedParts.length === 0 && (
                      <div className="flex flex-col gap-4">
                        {/* Card 1: Complaint */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1.5 text-left">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Complaint</span>
                          <p className="text-sm font-extrabold text-[#052355]">
                            {activeJob.complaint || "AC not cooling properly"}
                          </p>
                        </div>

                        {/* Card 2: AI Analysis */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-extrabold text-[#052355]">AI Analysis</h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                                Based on similar cases, these could be the possible issues.
                              </p>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-1">Probability</span>
                          </div>

                          {/* Probability items */}
                          <div className="flex flex-col mt-2">
                            {/* Capacitor Fault */}
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                              <span className="text-xs font-extrabold text-[#052355]">Capacitor Fault</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#FFA000] rounded-full"></div>
                                <span className="text-xs font-extrabold text-[#FFA000]">75%</span>
                              </div>
                            </div>
                            {/* Low Refrigerant */}
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                              <span className="text-xs font-extrabold text-[#052355]">Low Refrigerant</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#4CAF50] rounded-full"></div>
                                <span className="text-xs font-extrabold text-[#4CAF50]">60%</span>
                              </div>
                            </div>
                            {/* Fan Motor Issue */}
                            <div className="flex justify-between items-center py-2.5">
                              <span className="text-xs font-extrabold text-[#052355]">Fan Motor Issue</span>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-1 bg-[#81C784] rounded-full"></div>
                                <span className="text-xs font-extrabold text-[#81C784]">40%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Suggested Actions */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 text-left">
                          <h4 className="text-sm font-extrabold text-[#052355]">Suggested Actions</h4>
                          
                          <div className="flex flex-col gap-3.5 mt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-extrabold text-slate-700">Check capacitor</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-extrabold text-slate-700">Check gas pressure</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-[#4CAF50] flex items-center justify-center flex-shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></div>
                              </div>
                              <span className="text-xs font-extrabold text-slate-700">Verify fan motor operation</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Button */}
                        <button 
                          onClick={() => setShowAIModal(true)}
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-extrabold py-4 rounded-2xl text-sm transition-all shadow-md mt-4"
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
                              className={`bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between transition-all ${
                                part.checked ? 'ring-2 ring-[#0D47A1]/10 bg-slate-50/20' : ''
                              }`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Image container */}
                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-1.5 flex-shrink-0">
                                  <img 
                                    src={part.image} 
                                    alt={part.name} 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                
                                {/* Text details */}
                                <div className="text-left flex-1">
                                  <h5 className="text-xs font-black text-[#052355] leading-snug">{part.name}</h5>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">SKU: {part.sku}</p>
                                  <p className="text-xs font-black text-[#052355] mt-1">₹{part.price}</p>
                                  <p className="text-[10px] text-green-600 font-black mt-0.5">{part.match}% Match</p>
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
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 text-left">
                          <h4 className="text-xs font-black text-[#052355] uppercase tracking-wider">Tools Needed</h4>
                          
                          <div className="flex justify-start gap-6 mt-1.5 px-1">
                            {/* Manifold Gauge */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={manifoldGaugeImg} alt="Manifold Gauge" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-extrabold text-slate-500 text-center leading-tight">Manifold Gauge</span>
                            </div>

                            {/* Screw Driver */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={screwdriverImg} alt="Screw Driver" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-extrabold text-slate-500 text-center leading-tight">Screw Driver</span>
                            </div>

                            {/* Allen Key Set */}
                            <div className="flex flex-col items-center gap-1.5 w-18">
                              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shadow-sm">
                                <img src={allenKeyImg} alt="Allen Key Set" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-[9px] font-extrabold text-slate-500 text-center leading-tight">Allen Key Set</span>
                            </div>
                          </div>
                        </div>

                        {/* Add selected to Cart */}
                        <button 
                          onClick={() => {
                            const selected = partsCartChecked.filter(p => p.checked);
                            setSelectedParts(selected);
                            setShowAIModal(false);
                          }}
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-extrabold py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
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
                            className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer text-left"
                          >
                            <div className="bg-[#F4F8FF] p-2 rounded-xl text-[#0D47A1] flex-shrink-0">
                              <svg className="w-5 h-5 text-[#0D47A1]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-black text-[#052355]">Photos</h5>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">Upload images</p>
                              <p className="text-[10px] font-black text-[#0D47A1] mt-1">{proofs.photos}/6</p>
                            </div>
                          </div>

                          {/* Videos Card */}
                          <div 
                            onClick={() => setProofs({ ...proofs, videos: Math.min(2, proofs.videos + 1) })}
                            className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer text-left"
                          >
                            <div className="bg-[#F4F8FF] p-2 rounded-xl text-[#0D47A1] flex-shrink-0">
                              <Video className="h-5 w-5 stroke-[2.5]" />
                            </div>
                            <div className="truncate">
                              <h5 className="text-xs font-black text-[#052355]">Videos</h5>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">Upload videos</p>
                              <p className="text-[10px] font-black text-[#0D47A1] mt-1">{proofs.videos}/2</p>
                            </div>
                          </div>
                        </div>

                        {/* Voice Note Card */}
                        <div 
                          onClick={() => setProofs({ ...proofs, voiceNote: !proofs.voiceNote })}
                          className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3.5 cursor-pointer text-left"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                                <Mic className="h-5 w-5 stroke-[2]" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-[#052355]">Voice Note</h5>
                                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                  {proofs.voiceNote ? 'Recorded' : 'Tap to record'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-[#052355]">
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
                          className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                              <svg className="w-5 h-5 text-[#0D47A1]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-[#052355]">Customer Signature</h5>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                {proofs.signature ? 'Signature Captured' : 'Tap to sign'}
                              </p>
                            </div>
                          </div>
                          
                          {proofs.signature ? (
                            <span className="text-[10px] font-black text-red-500 hover:underline">Reset</span>
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        {/* Geo Location Card */}
                        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center justify-between text-left">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#F4F8FF] p-2.5 rounded-xl text-[#0D47A1]">
                              <MapPin className="h-5 w-5 stroke-[2]" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-[#052355]">Geo Location</h5>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Capture location</p>
                            </div>
                          </div>
                          <span className="bg-green-50 text-green-600 font-black rounded-full px-3 py-1 text-[10px]">
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
                          className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-extrabold py-4 rounded-2xl text-sm transition-all shadow-md mt-4"
                        >
                          Save & Continue
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Tab 3 Content: Notes */}
                {activeTab === 'Notes' && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-black text-[#0D47A1] uppercase tracking-wide">Job Diagnosis Notes</h4>
                    <textarea 
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      className="w-full h-32 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-[#052355] focus:outline-none focus:border-[#0D47A1] resize-none bg-slate-50"
                      placeholder="Add diagnostic comments, client concerns, or parts details..."
                    />
                    <button 
                      onClick={() => alert('Notes saved successfully!')}
                      className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-3 rounded-2xl text-xs transition-all"
                    >
                      Save Notes
                    </button>
                  </div>
                )}

                {/* Tab 4 Content: History */}
                {activeTab === 'History' && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-black text-[#0D47A1] uppercase tracking-wide">Appliance Service History</h4>
                    
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-[#052355]">Routine Wet Cleaning</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Technician: Inderjeet Singh</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">24 May 2025</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-[#052355]">Power Cord Replacement</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Technician: Inderjeet Singh</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">11 Jan 2024</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Step: SPARE APPROVAL (Step 4) */}
            {activeStep === 'spareapproval' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4 text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                  <Clock className="h-7 w-7 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#052355]">Spare Approval Pending</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">We are verifying extended warranty coverage for your selected parts. Usually approved within 5 minutes.</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Items for Approval</span>
                  {selectedParts.map(part => (
                    <div key={part.id} className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{part.name}</span>
                      <span className="text-green-600 font-semibold">Checked</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  Simulate Claims Approval (Next Step)
                </button>
              </div>
            )}

            {/* Step: REPAIR COMPLETE (Step 5) */}
            {activeStep === 'repaircomplete' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-bold text-[#052355]">Repair Work Resolution</h3>
                <p className="text-xs text-slate-400 font-semibold">Parts are approved and fitted. Please confirm repair resolution with the client and proceed to close payment.</p>
                
                <div className="bg-[#E3ECF9]/50 border border-[#0D47A1]/10 rounded-2xl p-4 flex items-center gap-3">
                  <Info className="h-5 w-5 text-[#0D47A1]" />
                  <span className="text-xs font-semibold text-[#0D47A1]">Verify all checklist items are ticked off.</span>
                </div>

                <button 
                  onClick={() => advanceStep()}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md"
                >
                  Proceed to Invoice & Billing
                </button>
              </div>
            )}

            {/* Step: BILLING (Step 6 / Screen 12: Billing & Estimate) */}
            {activeStep === 'billing' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200">
                    D2C Paid Service
                  </span>
                  <h3 className="text-base font-extrabold text-[#052355] mt-2">Billing & Estimate</h3>
                  <p className="text-xs text-slate-400 font-semibold">Estimate breakdown for Rohit Sharma</p>
                </div>

                <div className="flex flex-col gap-3.5 border-b border-slate-100 pb-4 text-xs font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Service Charge</span>
                    <span className="text-[#052355]">₹500</span>
                  </div>
                  
                  {selectedParts.map(part => (
                    <div key={part.id} className="flex justify-between">
                      <span className="text-slate-400">Spare Part ({part.name})</span>
                      <span className="text-[#052355]">₹{part.price}</span>
                    </div>
                  ))}

                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax (18% GST)</span>
                    <span className="text-[#052355]">₹282</span>
                  </div>
                </div>

                {/* Payable vs Earnings */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-bold text-slate-500">Customer Payable</span>
                    <span className="text-xl font-extrabold text-green-600">₹2,112</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-bold text-slate-500">Technician Earnings</span>
                    <span className="text-base font-extrabold text-[#0D47A1]">₹{activeJob.estEarnings.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* File Action PDF / Whatsapp */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button 
                    onClick={() => alert('PDF Estimate invoice generated.')}
                    className="bg-slate-50 hover:bg-slate-100 text-[#052355] font-bold py-3 rounded-2xl text-xs transition-all border border-slate-100 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText className="h-4 w-4 text-[#0D47A1]" />
                    Generate PDF
                  </button>
                  <button 
                    onClick={() => alert('Estimate invoice link sent on WhatsApp.')}
                    className="bg-slate-50 hover:bg-slate-100 text-green-600 font-bold py-3 rounded-2xl text-xs transition-all border border-slate-100 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Send WhatsApp
                  </button>
                </div>

                <button 
                  onClick={() => collectPayment()}
                  className="w-full bg-[#FFD400] hover:bg-yellow-400 text-[#052355] font-black py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  Collect Payment (Complete Job)
                </button>
              </div>
            )}
            </>
          )}

          </div>
        )}

        {/* STEP C: JOB COMPLETED SUCCESS VIEW (Screen 4 Outcome) */}
        {activeStep === 'completed' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center flex flex-col gap-6 py-10 my-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto border border-green-100 shadow-xs">
              <CheckCircle className="h-10 w-10 stroke-[2.5]" />
            </div>
            
            <div>
              <h2 className="text-2xl font-extrabold text-[#052355]">Job Completed!</h2>
              <p className="text-sm text-slate-400 mt-2 font-semibold">Great work! The diagnostics and service records have been closed successfully.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs font-bold text-slate-600 space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/50 pb-2">
                <span className="text-slate-400">Job Reference</span>
                <span className="text-[#052355]">#8842</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-2">
                <span className="text-slate-400">Total Earnings Added</span>
                <span className="text-[#0D47A1]">₹850</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md text-[10px]">Closed & Paid</span>
              </div>
            </div>

            <button 
              onClick={() => {
                resetActiveJob();
                navigate('/technician/dashboard');
              }}
              className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
            >
              Back to Dashboard
            </button>
          </div>
        )}

      </div>

      {/* Screen 16: AI Assistant Chat Panel Slide-over Drawer Overlay */}
      {chatOpen && (
        <div className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-30 transition-all flex flex-col justify-end">
          <div className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col shadow-2xl relative border-t border-slate-100">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#052355] text-white rounded-t-[2.5rem]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="h-5 w-5 text-[#FFD400] fill-[#FFD400]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Diagnostic Assistant</h3>
                  <p className="text-[10px] text-slate-300 font-semibold">Online • Ready to assist</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"
              >
                <ChevronRight className="h-6 w-6 rotate-90" />
              </button>
            </div>

            {/* Chat Messages viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[45vh] min-h-[300px] no-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-3xl p-3.5 text-xs font-semibold leading-relaxed shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1]/20 rounded-br-none' 
                      : 'bg-slate-50 text-[#052355] border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions (Screen 16 pills) */}
            <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar -mx-2">
              {[
                'Find Spare Parts',
                'Diagnostic Help',
                'Warranty Check',
                'Estimate Help'
              ].map(action => (
                <button
                  key={action}
                  onClick={() => addChatMessage(action, 'user')}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#052355] text-[10px] font-bold px-3.5 py-2 rounded-full whitespace-nowrap transition-all shadow-xs"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-4 border-t border-slate-100 flex gap-2.5 bg-slate-50 rounded-b-none items-center">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Ask AI Assistant about diagnostics..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]"
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

      {/* Bottom Navigation */}
      {!(activeStep === 'inspection' && !enteredInspection) && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 py-3 px-6 flex justify-between items-center z-20 shadow-lg">
          <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
            <Briefcase className="h-6 w-6 stroke-[2.5]" />
            <span className="text-[10px] font-black tracking-wide">Jobs</span>
          </button>
          <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <ClipboardList className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Requests</span>
          </button>
          <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <Wrench className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Inventory</span>
          </button>
          <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <Calendar className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Schedule</span>
          </button>
          <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
            <User className="h-6 w-6 stroke-[2]" />
            <span className="text-[10px] font-bold tracking-wide">Profile</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default ActiveJob;
