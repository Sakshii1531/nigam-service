import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';
import { 
  ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, User, Wrench, 
  MapPin, Phone, MessageSquare, Shield, Share2, MoreVertical, CheckCircle, 
  Clock, Plus, Info, Upload, Check, Video, Mic, FileText, Send, Sparkles,
  ChevronRight, AlertTriangle, AlertCircle, Package, CreditCard, Wallet, Banknote, QrCode,
  RotateCw, RefreshCw, Navigation
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import TechBottomNav from '../../components/TechBottomNav';
import splitAcImg from '../../assets/categories/split_ac.png';
import wasingImg from '../../assets/categories/wasing.png';
import fridgeImg from '../../assets/appliance_fridge.png';
import capacitorImg from '../../assets/capacitor_part.png';
import gasRefillImg from '../../assets/gas_refill_part.png';
import fanMotorImg from '../../assets/fan_motor_part.png';
import compressorImg from '../../assets/compressor_part.png';
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
    
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * (canvas.width / (rect.width || 1)),
      y: (clientY - rect.top) * (canvas.height / (rect.height || 1))
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
    setActiveJobId,
    acceptJob,
    dismissJob,
    resetActiveJob, 
    collectPayment,
    creditTravelFee,
    decrementAmcVisit,
    decrementEwClaim,
    selectedParts,
    setSelectedParts,
    proofs,
    setProofs,
    addChatMessage,
    chatMessages,
    inventory,
    selectJobForDetails,
    resumableJobs,
    stepBusy,
    stepError,
    setStepError,
    advanceStepsTo,
    requestSparePart,
    setDiagnosisNotes
  } = useTech();

  // ── Click-to-call relay ────────────────────────────────────────────────────
  // POST /api/v1/calls/initiate tells the backend to ring the customer via our
  // Twilio virtual number — neither party's real number is exposed to the other.
  const [callLoading, setCallLoading] = useState(false);

  const handleCallCustomer = async () => {
    if (!activeJob?.serviceRequestId && !activeJob?.id) return;
    const srId = activeJob.serviceRequestId || activeJob.id;
    setCallLoading(true);
    try {
      await apiRequest('/calls/initiate', {
        method: 'POST',
        body: { serviceRequestId: srId },
        auth: true,
      });
      // The customer's phone will ring from the Twilio virtual number.
      // No UI change needed — the call happens on the native phone layer.
    } catch (err) {
      console.error('[calls] Click-to-call failed:', err.message);
      // Graceful degradation: if Twilio is not yet configured (503), the
      // button just fails silently so UX is unaffected during dev/staging.
      if (err.status !== 503) {
        alert(`Call failed: ${err.message}`);
      }
    } finally {
      setCallLoading(false);
    }
  };

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
  // Mirrored into TechContext so completing the inspection submits these notes
  // with the diagnosis, not just the separate 'Save Notes' button.
  const [notesText, setNotesTextLocal] = useState('');
  const setNotesText = (v) => { setNotesTextLocal(v); setDiagnosisNotes(typeof v === 'string' ? v : ''); };
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState('');

  useEffect(() => {
    setNotesText(activeJob?.diagnosis?.notes || '');
  }, [activeJob?.id, activeJob?.diagnosis?.notes]);
  const [enteredInspection, setEnteredInspection] = useState(false);
  const [inspectionDiagnosed, setInspectionDiagnosed] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('confirmed'); // 'confirmed', 'different', 'none'
  const [productPhoto, setProductPhoto] = useState('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80');
  const [serialPhoto, setSerialPhoto] = useState('https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?auto=format&fit=crop&w=300&q=80');
  const [issuePhoto, setIssuePhoto] = useState('https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=300&q=80');
  const [additionalServices, setAdditionalServices] = useState([
    { id: 'deep', name: 'Deep Cleaning', price: 599, checked: false },
    { id: 'drain', name: 'Drain Pipe Cleaning', price: 199, checked: false },
    { id: 'foam', name: 'AC Foam Wash', price: 399, checked: false },
    { id: 'jet', name: 'Jet Pump Service', price: 299, checked: false },
    { id: 'outdoor', name: 'Outdoor Unit Cleaning', price: 249, checked: false }
  ]);
  const [showAddServicesModal, setShowAddServicesModal] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [partAvailability, setPartAvailability] = useState('not_available');
  const [showAddPartsModal, setShowAddPartsModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [showInvoicePdfModal, setShowInvoicePdfModal] = useState(false);
  // AMC: show history drawer before entering inspection tabs
  const [showAmcHistoryDrawer, setShowAmcHistoryDrawer] = useState(false);

  // Synchronize activeStep with the real job step if opened on an active job
  useEffect(() => {
    if (activeJob) {
      if (activeJob.activeStep === 'completed' || activeJob.status === 'Completed' || activeJob.status === 'Customer Confirmation' || activeJob.status === 'Closed') {
        setActiveJobId(null);
        setActiveStep('idle');
        navigate('/technician/dashboard', { replace: true });
        return;
      }
      if (!activeJob.isAvailableRequest && (activeStep === 'details' || activeStep === 'idle')) {
        const targetStep = activeJob.activeStep && activeJob.activeStep !== 'details' ? activeJob.activeStep : 'assigned';
        setActiveStep(targetStep);
      }
    }
  }, [activeJob, activeStep, setActiveStep, navigate, setActiveJobId]);

  // States for Spare Part Job Details page interactions
  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const [expectedRevisitDate, setExpectedRevisitDate] = useState(getTomorrowDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTempDate, setSelectedTempDate] = useState('');
  const [showOtherDetails, setShowOtherDetails] = useState(false);
  const [revisitRepairStatus, setRevisitRepairStatus] = useState('completed'); // 'completed', 'unable', 'cancelled'
  const [revisitReason, setRevisitReason] = useState('');

  // The brand's decision on the FOC parts claim for this job. Polled while the
  // approval step is on screen, so the technician sees the real outcome rather
  // than being able to wave the job through themselves.
  const [approvalClaimStatus, setApprovalClaimStatus] = useState(null);

  useEffect(() => {
    if (activeStep !== 'spareapproval' || !activeJob?.serviceRequestId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await apiRequest('/tech/claims', { auth: true });
        if (cancelled) return;
        const claim = (res || []).find(
          (c) => String(c.serviceRequest?.id || c.serviceRequest) === String(activeJob.serviceRequestId),
        );
        setApprovalClaimStatus(claim ? claim.status : null);
      } catch {
        // Leave the last known status on screen rather than implying a decision.
      }
    };

    poll();
    const timer = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeStep, activeJob?.serviceRequestId]);
  // What the server actually credited for this visit — null until it answers.
  const [travelPayout, setTravelPayout] = useState(null);
  const [revisitPaymentMethod, setRevisitPaymentMethod] = useState('razorpay');

  const [revisitOtp, setRevisitOtp] = useState(['8', '7', '4', '5']);
  const [hasSignedRevisit, setHasSignedRevisit] = useState(false);
  const revisitCanvasRef = useRef(null);
  const [isDrawingRevisit, setIsDrawingRevisit] = useState(false);

  const handleOtpChange = (val, idx) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...revisitOtp];
    newOtp[idx] = cleanVal;
    setRevisitOtp(newOtp);

    if (cleanVal && idx < 3) {
      const nextEl = document.getElementById(`revisit-otp-${idx + 1}`);
      if (nextEl) nextEl.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!revisitOtp[idx] && idx > 0) {
        const prevEl = document.getElementById(`revisit-otp-${idx - 1}`);
        if (prevEl) {
          const newOtp = [...revisitOtp];
          newOtp[idx - 1] = '';
          setRevisitOtp(newOtp);
          prevEl.focus();
        }
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      const prevEl = document.getElementById(`revisit-otp-${idx - 1}`);
      if (prevEl) prevEl.focus();
    } else if (e.key === 'ArrowRight' && idx < 3) {
      const nextEl = document.getElementById(`revisit-otp-${idx + 1}`);
      if (nextEl) nextEl.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      const newOtp = ['', '', '', ''];
      for (let i = 0; i < 4; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setRevisitOtp(newOtp);
      const targetIdx = Math.min(Math.max(pasted.length - 1, 0), 3);
      const el = document.getElementById(`revisit-otp-${targetIdx}`);
      if (el) el.focus();
    }
  };

  const getRevisitCoordinates = (e) => {
    const canvas = revisitCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * (canvas.width / (rect.width || 1)),
      y: (clientY - rect.top) * (canvas.height / (rect.height || 1))
    };
  };

  const startDrawingRevisit = (e) => {
    const canvas = revisitCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#052355';
    ctx.lineCap = 'round';
    
    const { x, y } = getRevisitCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingRevisit(true);
    setHasSignedRevisit(true);
  };

  const drawRevisit = (e) => {
    if (!isDrawingRevisit) return;
    const canvas = revisitCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getRevisitCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingRevisit = () => {
    setIsDrawingRevisit(false);
  };

  const clearRevisitSignature = () => {
    const canvas = revisitCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignedRevisit(false);
  };

  // Checkboxes for diagnosis verification (Screen 6)
  const [actionsChecked, setActionsChecked] = useState({
    checkCapacitor: true,
    checkGasPressure: true,
    verifyFanMotor: false
  });

  // Recommended Parts cart matching Screen 7
  // Parts offered here come from the technician's own stock. They were three
  // hardcoded items whose prices went straight onto the customer's invoice.
  const [partsCartChecked, setPartsCartChecked] = useState([]);

  useEffect(() => {
    setPartsCartChecked(
      (inventory || [])
        .filter((item) => item.qty > 0)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          stock: item.qty,
          checked: false,
          image: capacitorImg,
        })),
    );
  }, [inventory]);

  // AI Chat Drawer State (Screen 16)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const isWarrantyOrAMC = activeJob && (
    activeJob.type === 'Brand Warranty' || activeJob.type === 'BRAND WARRANTY' ||
    activeJob.type === 'NCC Extended Warranty' || activeJob.type === 'NCC EXTENDED WARRANTY' ||
    activeJob.type === 'AMC Visit' || activeJob.type === 'AMC VISIT'
  );

  const selectedSparePart = spareParts.find(p => p.checked) || { name: 'No part used', price: 0 };
  const dynamicPartName = selectedSparePart.name;
  const dynamicPartPrice = isWarrantyOrAMC ? 0 : selectedSparePart.price;

  // The server prices the visit; a covered job charges nothing for the base visit.
  const jobServiceCharge = activeJob?.billingEstimate?.serviceCharge ?? activeJob?.price ?? 0;
  const gstPercent = activeJob?.billingEstimate?.gstPercent ?? 18;
  const revisitServiceCharge = isWarrantyOrAMC ? 0 : jobServiceCharge;
  const revisitSparePartPrice = dynamicPartPrice;
  const revisitAdditionalServicesPrice = additionalServices
    .filter(s => s.checked)
    .reduce((sum, s) => sum + s.price, 0);
  
  const revisitTaxableAmount = revisitServiceCharge + revisitSparePartPrice + revisitAdditionalServicesPrice;
  const revisitTax = Math.round(revisitTaxableAmount * (gstPercent / 100));
  const revisitTotal = revisitTaxableAmount + revisitTax;

  const finalAmountCollected = activeJob?.billingEstimate?.total != null
    ? Math.round(activeJob.billingEstimate.total)
    : revisitTotal;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (showDatePicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDatePicker]);

  if (!activeJob) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-between pb-20 relative font-sans">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
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
            <h2 className="text-lg font-bold text-[#052355]">
              {resumableJobs.length > 0 ? 'Pick up where you left off' : 'No Active Job In Progress'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {resumableJobs.length > 0
                ? 'These jobs are accepted and still open.'
                : 'Please accept a job from your dashboard to begin the service process.'}
            </p>
          </div>

          {/* Jobs already accepted but not finished */}
          {resumableJobs.length > 0 && (
            <div className="w-full flex flex-col gap-2.5 max-h-72 overflow-y-auto">
              {resumableJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => selectJobForDetails(job.id)}
                  className="w-full text-left bg-white border border-slate-200 hover:border-[#0D47A1] rounded-2xl p-3.5 transition-colors"
                >
                  <p className="text-sm font-semibold text-[#052355]">{job.customerName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{job.category} · {job.type}</p>
                  <span className="inline-block mt-1.5 text-[9.5px] font-bold uppercase tracking-wider text-[#0D47A1] bg-[#E3ECF9] px-2 py-0.5 rounded">
                    {String(job.activeStep || 'assigned').replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/technician/dashboard')}
            className="mt-2 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-3 px-4 rounded-2xl text-sm transition-all shadow-sm cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Bottom Nav */}
        <TechBottomNav activeTab="jobs" />
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
    <div className={`min-h-screen flex flex-col relative font-sans ${
      activeStep === 'inspection' && !enteredInspection ? 'bg-white pb-1' :
      (activeStep === 'revisit_complete' || activeStep === 'customer_update_preview' || activeStep === 'spare_part_required' || activeStep === 'completed_pending' || activeStep === 'spare_part_job_details' || activeStep === 'cancellation_summary' || activeStep === 'unable_to_fix_summary' || activeStep === 'revisit_billing' || activeStep === 'revisit_payment' || activeStep === 'revisit_payment_upi' || activeStep === 'revisit_payment_cash' || activeStep === 'revisit_payment_card' || activeStep === 'revisit_payment_wallet' || activeStep === 'revisit_otp') ? 'bg-[#F5F8FC] pb-0' :
      'bg-[#F5F8FC] pb-20'
    }`}>

      {/* A step that failed to save server-side must say so. The flow used to
          advance on local state alone, so a rejected write looked like success
          and the job silently fell out of sync with the server. */}
      {stepError && (
        <div className="sticky top-0 z-[120] bg-rose-600 text-white px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-semibold leading-snug flex-1">{stepError}</span>
          <button onClick={() => setStepError(null)} className="text-white/80 hover:text-white text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      {activeStep === 'spare_part_required' || activeStep === 'completed_pending' || activeStep === 'customer_update_preview' || activeStep === 'spare_part_job_details' || activeStep === 'revisit_scheduled' || activeStep === 'revisit_ontheway' || activeStep === 'revisit_arrived' || activeStep === 'revisit_complete' || activeStep === 'cancellation_summary' || activeStep === 'unable_to_fix_summary' || activeStep === 'revisit_billing' || activeStep === 'revisit_payment' || activeStep === 'revisit_payment_upi' || activeStep === 'revisit_payment_cash' || activeStep === 'revisit_payment_card' || activeStep === 'revisit_payment_wallet' || activeStep === 'revisit_otp' ? null : activeStep === 'details' && activeJob && isSpecialWarrantyJob ? (
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
                navigate(-1);
              }} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
      ) : activeStep === 'inspection' && enteredInspection && !inspectionDiagnosed ? (
        /* Navy Blue Header for the NEW Inspection page */
        <div className="bg-[#052355] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => {
              setEnteredInspection(false);
            }} 
            className="p-1 hover:bg-white/10 rounded-full text-white"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          
          <div className="text-center">
            <h1 className="text-base font-normal text-white">
              Inspection
            </h1>
            <span className="text-[10px] text-white/70 block font-normal mt-0.5">#{activeJob?.id}</span>
          </div>

          <button className="p-1.5 hover:bg-white/10 rounded-full text-white">
            <MoreVertical className="h-5 w-5 text-white" />
          </button>
        </div>
      ) : activeStep === 'inspection' && enteredInspection && inspectionDiagnosed ? (
        /* White Header for Job Details worksheets View (Screen 5) */
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => {
              if (activeTab === 'Diagnosis') {
                if (selectedParts.length > 0) {
                  setSelectedParts([]);
                  setShowAIModal(true);
                } else if (showAIModal) {
                  setShowAIModal(false);
                } else {
                  setInspectionDiagnosed(false);
                }
              } else {
                setInspectionDiagnosed(false);
              }
            }} 
            className="p-1 hover:bg-slate-50 rounded-full text-slate-700"
          >
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          
          <div className="text-center">
            <h1 className="text-base font-normal text-[#052355]">
              {activeTab === 'Diagnosis' && selectedParts.length > 0
                ? 'Upload Proof'
                : activeTab === 'Diagnosis' && showAIModal
                  ? 'Recommended Parts'
                  : activeTab === 'Diagnosis'
                    ? 'AI Diagnostic Assistant'
                    : 'Job Details'}
            </h1>
          </div>

          <button className="p-1.5 hover:bg-slate-50 rounded-full text-slate-700">
            <MoreVertical className="h-5 w-5 text-slate-700" />
          </button>
        </div>
      ) : (
        /* Regular White Header for Job Progress Stepper */
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (activeStep === 'inspection' && enteredInspection) {
                  if (inspectionDiagnosed) {
                    setInspectionDiagnosed(false);
                  } else {
                    setEnteredInspection(false);
                  }
                } else if (activeStep === 'completed') {
                  resetActiveJob();
                  navigate(-1);
                } else {
                  navigate(-1);
                }
              }} 
              className="p-1 hover:bg-slate-50 rounded-full cursor-pointer"
            >
              <ArrowLeft className="h-6 w-6 text-slate-700" />
            </button>
            <h1 className="text-base font-normal text-[#052355]">
              Job Progress
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
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

                  {/* AMC Plan Details Card — the customer's real subscription.
                      This used to be a fixed "AMC Gold Plan / 15 Jan 2027 / 3
                      visits remaining / Quarterly" for every AMC job, regardless
                      of which plan (or how many visits) the customer actually
                      had left. */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3.5 text-left">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AMC Plan Details</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#FFA000] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <CrownIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-[#052355]">{activeJob.amcPlanName || 'AMC Plan'}</h4>

                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Expiry Date</span>
                            <span className="text-[#052355] font-semibold">
                              {activeJob.amcPlanExpiry ? new Date(activeJob.amcPlanExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Visits Remaining</span>
                            <span className="text-[#052355] font-semibold">
                              {activeJob.amcVisitsRemaining != null ? `${activeJob.amcVisitsRemaining}${activeJob.amcVisitsTotal != null ? ` / ${activeJob.amcVisitsTotal}` : ''}` : 'Not recorded'}
                            </span>
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

                  {/* Coverage Details Card — the customer's real policy. This
                      used to be a fixed "NCC Protect Plus / 15 Jan 2028 / 2
                      claims remaining" for every extended-warranty job. */}
                  <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3.5 text-left">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coverage Details</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#7C4DFF] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <ShieldCheckIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-[#052355]">Extended Warranty</h4>

                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Valid Till</span>
                            <span className="text-[#052355] font-semibold">
                              {activeJob.ewValidTill ? new Date(activeJob.ewValidTill).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-normal">Claims Remaining</span>
                            <span className="text-[#052355] font-semibold">
                              {activeJob.ewClaimsRemaining != null ? `${activeJob.ewClaimsRemaining}${activeJob.ewClaimsTotal != null ? ` / ${activeJob.ewClaimsTotal}` : ''}` : 'Not recorded'}
                            </span>
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
                            <p className="text-xs font-semibold text-[#052355] truncate max-w-[150px]">
                              {activeJob?.invoiceUrl ? activeJob.invoiceUrl.split('/').pop() : 'No invoice uploaded'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-normal">
                              {activeJob?.invoiceAvailable ? 'Customer confirmed invoice available' : 'Not provided by the customer'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowInvoicePdfModal(true)}
                          disabled={!activeJob?.invoiceUrl}
                          className="bg-[#EEF4FE] text-[#1E6BDB] hover:bg-[#DCE7FC] px-5 py-2 rounded-full text-xs font-semibold transition-colors disabled:opacity-40"
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
                    <p className="text-xs text-slate-600 mt-0.5 font-normal">{activeJob.phone || 'No phone on file'}</p>
                  </div>
                  <div className="flex gap-2.5">
                  <button
                      onClick={handleCallCustomer}
                      disabled={callLoading}
                      title={callLoading ? 'Connecting…' : 'Call Customer (masked relay)'}
                      className="w-10 h-10 rounded-full bg-[#E8F1FF] flex items-center justify-center text-[#1A73E8] hover:bg-[#D4E5FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Phone className="h-4.5 w-4.5 stroke-[2.5]" />
                    </button>
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

                {/* Service Address */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-normal text-slate-600 uppercase tracking-wider block">Service Address</span>
                  <p className="text-sm font-normal text-[#052355] mt-1 leading-relaxed">{activeJob.address}</p>

                  {/* No live location feed exists yet to compute this — it used
                      to be a flat "2.3 km away" for every job. */}
                  {activeJob.distance != null && (
                    <div className="flex items-center mt-3 pt-3 border-t border-slate-200">
                      <span className="text-[11px] font-normal text-slate-600">• {activeJob.distance} km away</span>
                    </div>
                  )}
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
            {/* Bottom Actions for Available Offers — Decline and Accept Job */}
            <div className="flex gap-3.5 mt-2">
              <button 
                onClick={async () => {
                  if (activeJob?.id) {
                    await dismissJob(activeJob.id);
                  }
                  navigate(-1);
                }}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-normal py-3 px-4 rounded-xl text-xs transition-all border border-slate-300 shadow-sm cursor-pointer"
              >
                Decline
              </button>
              <button 
                onClick={async () => {
                  if (activeJob?.id) {
                    await acceptJob(activeJob.id);
                  }
                  setActiveStep('assigned');
                }}
                className={`flex-1 font-normal py-3 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer ${
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
                  onClick={() => { setEnteredInspection(true); setInspectionDiagnosed(false); }}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-3.5 rounded-xl text-xs transition-all shadow-md mt-8 mb-1"
                >
                  Start Inspection
                </button>
              </div>
            ) : (
              /* Normal stepper list flow */
              <>
                {!(activeStep === 'inspection' && enteredInspection) && activeStep !== 'spare_part_required' && activeStep !== 'completed_pending' && activeStep !== 'customer_update_preview' && activeStep !== 'spare_part_job_details' && activeStep !== 'revisit_scheduled' && activeStep !== 'revisit_ontheway' && activeStep !== 'revisit_arrived' && activeStep !== 'revisit_complete' && activeStep !== 'cancellation_summary' && activeStep !== 'unable_to_fix_summary' && activeStep !== 'revisit_billing' && activeStep !== 'revisit_payment' && activeStep !== 'revisit_payment_upi' && activeStep !== 'revisit_payment_cash' && activeStep !== 'revisit_payment_card' && activeStep !== 'revisit_payment_wallet' && activeStep !== 'revisit_otp' && renderStepper()}

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
                  disabled={stepBusy}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] disabled:opacity-60 text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2"
                >
                  {stepBusy ? 'Saving…' : 'Start Trip (On My Way)'}
                </button>
              </div>
            )}

            {/* Step: ON THE WAY (Step 2) */}
            {activeStep === 'ontheway' && (
              <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-base font-normal text-[#052355]">En-Route to Client</h3>
                
                {/* Opens real turn-by-turn directions in the device's maps app.
                    This used to be a static panel captioned "Simulated
                    Navigation Route" that navigated nowhere. */}
                <a
                  href={activeJob?.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeJob.address)}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`h-44 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative ${activeJob?.address ? 'cursor-pointer hover:border-blue-400' : 'pointer-events-none'}`}
                >
                  <div className="absolute inset-0 bg-blue-50/20 flex flex-col items-center justify-center text-center p-4">
                    <MapPin className="h-10 w-10 text-red-500 animate-bounce mb-2" />
                    <span className="text-xs font-normal text-[#052355]">
                      {activeJob?.address ? 'Open navigation' : 'No address on this job'}
                    </span>
                    <span className="text-[10px] text-slate-600 mt-0.5 px-4">
                      {activeJob?.address || `On the way to ${activeJob?.customerName || 'the customer'}`}
                    </span>
                  </div>
                </a>

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
                {!inspectionDiagnosed ? (
                  /* New Inspection Screen matching mockup exactly */
                  <div className="flex flex-col gap-5 text-left pb-4 bg-white rounded-3xl p-1">
                    {/* Section 1: Upload Product Photos */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-semibold text-[#052355]">Upload Product Photos</h3>
                      <p className="text-xs text-slate-500 font-normal">Required for verification</p>
                      
                      {/* Three Column Photo Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {/* Box 1: Product Photo */}
                        <div className="flex flex-col items-center">
                          <label className="w-full aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setProductPhoto(URL.createObjectURL(e.target.files[0]));
                                }
                              }}
                            />
                            <img 
                              src={productPhoto} 
                              alt="Product" 
                              className="w-full h-full object-cover" 
                            />
                          </label>
                          <span className="text-[10px] font-semibold text-[#052355] text-center mt-2 leading-tight">Product Photo</span>
                          <span className="text-[9px] text-slate-500 text-center leading-tight">(Indoor Unit)</span>
                        </div>

                        {/* Box 2: Serial Number Photo */}
                        <div className="flex flex-col items-center">
                          <label className="w-full aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setSerialPhoto(URL.createObjectURL(e.target.files[0]));
                                }
                              }}
                            />
                            <img 
                              src={serialPhoto} 
                              alt="Serial Number" 
                              className="w-full h-full object-cover" 
                            />
                          </label>
                          <span className="text-[10px] font-semibold text-[#052355] text-center mt-2 leading-tight">Serial Number</span>
                          <span className="text-[9px] text-slate-500 text-center leading-tight">Photo</span>
                        </div>

                        {/* Box 3: Issue Photo */}
                        <div className="flex flex-col items-center">
                          <label className="w-full aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setIssuePhoto(URL.createObjectURL(e.target.files[0]));
                                }
                              }}
                            />
                            <img 
                              src={issuePhoto} 
                              alt="Issue" 
                              className="w-full h-full object-cover" 
                            />
                          </label>
                          <span className="text-[10px] font-semibold text-[#052355] text-center mt-2 leading-tight">Issue Photo</span>
                          <span className="text-[9px] text-slate-500 text-center leading-tight">(Problem Area)</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: What did you find? */}
                    <div className="flex flex-col gap-1.5 mt-3">
                      <h3 className="text-sm font-semibold text-[#052355]">What did you find?</h3>
                      <p className="text-xs text-slate-500 font-normal">Select diagnosis result</p>

                      {/* Diagnosis Options List */}
                      <div className="flex flex-col gap-2.5 mt-2">
                        {/* Option 1: Issue Confirmed */}
                        <button
                          type="button"
                          onClick={() => setSelectedDiagnosis('confirmed')}
                          className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl transition-all text-left shadow-sm ${
                            selectedDiagnosis === 'confirmed'
                              ? 'border-green-500 ring-1 ring-green-500/20 bg-green-50/5'
                              : 'border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#00C853] flex items-center justify-center text-white flex-shrink-0">
                              <Check className="h-4.5 w-4.5 stroke-[3]" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-green-700">Issue Confirmed</p>
                              <p className="text-[10px] text-slate-500 font-normal mt-0.5">The reported issue is correct</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>

                        {/* Option 2: Different Issue Found */}
                        <button
                          type="button"
                          onClick={() => setSelectedDiagnosis('different')}
                          className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl transition-all text-left shadow-sm ${
                            selectedDiagnosis === 'different'
                              ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/5'
                              : 'border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FFA000] flex items-center justify-center text-white flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4.5 h-4.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-amber-700">Different Issue Found</p>
                              <p className="text-[10px] text-slate-500 font-normal mt-0.5">Found a different issue</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>

                        {/* Option 3: No Issue Found */}
                        <button
                          type="button"
                          onClick={() => setSelectedDiagnosis('none')}
                          className={`flex items-center justify-between p-3.5 bg-white border rounded-2xl transition-all text-left shadow-sm ${
                            selectedDiagnosis === 'none'
                              ? 'border-slate-500 ring-1 ring-slate-500/20 bg-slate-50/5'
                              : 'border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#5E7A9C] flex items-center justify-center text-white flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4.5 h-4.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700">No Issue Found</p>
                              <p className="text-[10px] text-slate-500 font-normal mt-0.5">No issue found with product</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Section 3: Continue Button */}
                    <button
                      type="button"
                      onClick={() => setInspectionDiagnosed(true)}
                      className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-3.5 rounded-xl text-xs transition-all shadow-md mt-6"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Tabs Selector (Screen 5 Overview) */}
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

                {/* Tab 1 Content: Overview — card-type-aware */}
                {activeTab === 'Overview' && (() => {
                  const hasSpareParts = spareParts.filter(p => p.checked).length > 0;

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
                          spareParts={spareParts}
                          setSpareParts={setSpareParts}
                          setShowAddPartsModal={setShowAddPartsModal}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          {hasSpareParts ? (
                            <button
                              onClick={() => setActiveStep('spare_part_required')}
                              className="w-full bg-[#1E6BDB] hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md text-center"
                            >
                              Review Estimate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setShowInvoicePreviewModal(true)}
                                className="flex-1 bg-white border border-[#1E6BDB] hover:bg-slate-50 text-[#1E6BDB] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                              >
                                View Invoice
                              </button>
                              <button
                                onClick={() => advanceStepsTo('billing')}
                                className="flex-1 bg-[#1E6BDB] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                              >
                                Generate Invoice
                              </button>
                            </>
                          )}
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
                          spareParts={spareParts}
                          setSpareParts={setSpareParts}
                          setShowAddPartsModal={setShowAddPartsModal}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          {hasSpareParts ? (
                            <button
                              onClick={() => setActiveStep('spare_part_required')}
                              className="w-full bg-[#7C4DFF] hover:bg-purple-600 text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md text-center"
                            >
                              Review Estimate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setShowInvoicePreviewModal(true)}
                                className="flex-1 bg-white border border-[#7C4DFF] hover:bg-slate-50 text-[#7C4DFF] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                              >
                                View Claim Invoice
                              </button>
                              <button
                                onClick={() => advanceStepsTo('billing')}
                                className="flex-1 bg-[#7C4DFF] hover:bg-purple-600 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                              >
                                Generate Invoice
                              </button>
                            </>
                          )}
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
                          spareParts={spareParts}
                          setSpareParts={setSpareParts}
                          setShowAddPartsModal={setShowAddPartsModal}
                        />
                        <div className="flex gap-3.5 mt-2 mb-2">
                          {hasSpareParts ? (
                            <button
                              onClick={() => setActiveStep('spare_part_required')}
                              className="w-full bg-[#FFA000] hover:bg-amber-500 text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md text-center"
                            >
                              Review Estimate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setShowInvoicePreviewModal(true)}
                                className="flex-1 bg-white border border-[#FFA000] hover:bg-slate-50 text-[#FFA000] font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-sm"
                              >
                                Preview Report
                              </button>
                              <button
                                onClick={() => advanceStepsTo('billing')}
                                className="flex-1 bg-[#FFA000] hover:bg-amber-500 text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md"
                              >
                                Complete Visit
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Default: NCC Paid Service (Card 1)
                  const additionalServicesTotal = additionalServices
                    .filter(s => s.checked)
                    .reduce((sum, s) => sum + s.price, 0);
                  const sparePartsTotal = spareParts
                    .filter(p => p.checked)
                    .reduce((sum, p) => sum + p.price, 0);
                  const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 0;
                  const totalAmount = baseServicePrice + additionalServicesTotal + sparePartsTotal;

                  const selectedAddons = additionalServices.filter(s => s.checked);
                  const unselectedAddons = additionalServices.filter(s => !s.checked);

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
                            {/* The product title, model, and serial were a fixed
                                "Voltas Split AC 1.5 Ton Inverter" / "VLT18GN123348X"
                                for every job, regardless of the actual appliance. */}
                            <h5 className="text-sm font-medium text-[#052355]">{activeJob.brand} {activeJob.product}</h5>
                            <p className="text-xs text-slate-600 font-normal mt-0.5">Model: {activeJob.model || 'Not recorded'}</p>
                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">S/N: {activeJob.serialNo || 'Not recorded'}</p>
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

                      {/* Card 3: Selected Services */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Selected Services</h4>
                        
                        <div className="flex flex-col gap-3 mt-1">
                          {/* Base Service */}
                          <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-[#00C853] rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                                <svg className="w-3 h-3 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-xs font-medium text-slate-700">
                                {activeJob.product.toLowerCase().includes('ac') ? 'AC Gas Charging' : activeJob.product + ' Repair'}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[#052355]">₹{baseServicePrice.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Checked Addons */}
                          {selectedAddons.map((service) => (
                            <div key={service.id} className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdditionalServices(prev => 
                                      prev.map(s => s.id === service.id ? { ...s, checked: false } : s)
                                    );
                                  }}
                                  className="w-5 h-5 bg-[#00C853] hover:bg-red-500 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm group transition-colors"
                                  title="Unselect Service"
                                >
                                  <span className="group-hover:hidden">
                                    <svg className="w-3 h-3 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                  <span className="hidden group-hover:block text-xs font-bold leading-none">×</span>
                                </button>
                                <span className="text-xs font-normal text-slate-700">{service.name}</span>
                              </div>
                              <span className="text-xs font-semibold text-[#052355]">₹{service.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card 3.2: Add More Services */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Add More Services</h4>
                        
                        <div className="flex flex-col gap-3 mt-1">
                          {unselectedAddons.map((service) => (
                            <div key={service.id} className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                              <label className="flex items-center gap-3.5 cursor-pointer select-none flex-1">
                                <input 
                                  type="checkbox" 
                                  checked={false}
                                  onChange={() => {
                                    setAdditionalServices(prev => 
                                      prev.map(s => s.id === service.id ? { ...s, checked: true } : s)
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-[#0D47A1] focus:ring-[#0D47A1]"
                                />
                                <span className="text-xs font-normal text-slate-700">{service.name}</span>
                              </label>
                              <span className="text-xs font-semibold text-[#052355]">₹{service.price}</span>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => setShowAddServicesModal(true)}
                          className="text-xs font-medium text-[#0D47A1] text-left hover:underline mt-2 flex items-center gap-1"
                        >
                          + Add More Service
                        </button>
                      </div>

                      {/* Card 3.5: Required Spare Parts */}
                      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3.5 text-left">
                        <h4 className="text-sm font-medium text-[#052355]">Required Spare Parts</h4>
                        
                        <div className="flex flex-col gap-3 mt-1">
                          {spareParts.filter(p => p.checked).map((part) => (
                            <div key={part.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#0D47A1]">
                                  <svg className="w-5 h-5 text-[#0D47A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12h8a4 4 0 0 0 4-4V4" />
                                    <path d="M8 12a4 4 0 0 1 4-4" />
                                    <rect x="2" y="10" width="2" height="4" rx="0.5" fill="currentColor" />
                                    <rect x="14" y="2" width="4" height="2" rx="0.5" fill="currentColor" />
                                    <path d="M12 16a4 4 0 0 0 4 4h4" />
                                    <rect x="20" y="18" width="2" height="4" rx="0.5" fill="currentColor" />
                                  </svg>
                                </div>
                                <span className="text-xs font-normal text-slate-700">{part.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-[#052355]">₹{part.price}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpareParts(prev => 
                                      prev.map(p => p.id === part.id ? { ...p, checked: false } : p)
                                    );
                                  }}
                                  className="text-slate-400 hover:text-red-500 font-semibold text-xs px-1"
                                  title="Remove Part"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => setShowAddPartsModal(true)}
                          className="text-xs font-medium text-[#0D47A1] text-left hover:underline mt-2 flex items-center justify-center gap-1 w-full pt-1.5 border-t border-slate-100"
                        >
                          + Add Part
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

                          {sparePartsTotal > 0 && (
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Spare Parts</span>
                              <span className="font-medium text-[#052355]">₹{sparePartsTotal.toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          <div className="h-[1px] bg-slate-100 my-1"></div>

                          <div className="flex justify-between items-center text-[#052355] font-semibold text-sm">
                            <span>Total Amount</span>
                            <span className="text-[#00C853] font-bold">₹{totalAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-2 mb-2">
                        {hasSpareParts ? (
                          <button 
                            onClick={() => setActiveStep('spare_part_required')}
                            className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md text-center cursor-pointer"
                          >
                            Review Estimate & Spare Parts
                          </button>
                        ) : (
                          <button 
                            onClick={() => advanceStepsTo('billing')}
                            className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md text-center cursor-pointer"
                          >
                            Proceed to Billing & Invoice
                          </button>
                        )}
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

                        {/* Card 3: Standard checks — a fixed reminder list, not a
                            per-job recommendation. */}
                        <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-3 text-left">
                          <h4 className="text-sm font-medium text-[#052355]">Standard Checks</h4>
                          
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
                      onClick={async () => {
                        // Diagnosis notes belong on the job, not in a toast.
                        if (!activeJob?.id || !notesText.trim()) return;
                        try {
                          await apiRequest(`/tech/jobs/${activeJob.id}/diagnosis`, {
                            method: 'POST',
                            auth: true,
                            body: { notes: notesText },
                          });
                          setNotesSaved(true);
                          setTimeout(() => setNotesSaved(false), 2500);
                        } catch (err) {
                          setNotesError(err.message || 'Could not save your notes.');
                        }
                      }}
                      className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-normal py-3 rounded-2xl text-xs transition-all"
                    >
                      {notesSaved ? 'Saved' : 'Save Notes'}
                    </button>
                    {notesError && (
                      <p className="text-[11px] font-semibold text-rose-600">{notesError}</p>
                    )}
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

                  </>
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

                  {/* Advancing on covered work is gated on the brand's real
                      decision (this was once a "Simulate Approval" button, so a
                      technician could self-approve FOC parts nobody authorised).
                      A D2C job has no claim to approve — the customer is billed
                      for the parts — and job.service.js only raises claims when
                      !isD2C, so gating those too left every paid job stuck here
                      forever on "No claim has been raised for these parts yet." */}
                  {activeJob?.isD2C || approvalClaimStatus === 'Approved' ? (
                    <button
                      onClick={() => advanceStep()}
                      disabled={stepBusy}
                      className={`w-full ${approvalColor} disabled:opacity-60 text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md mt-2`}
                    >
                      {stepBusy ? 'Saving…' : activeJob?.isD2C ? 'Parts Billed to Customer — Continue' : 'Approved — Continue'}
                    </button>
                  ) : approvalClaimStatus === 'Rejected' ? (
                    <div className="w-full bg-red-50 border border-red-200 text-red-700 font-semibold py-3 rounded-2xl text-xs mt-2 px-3">
                      The claim was rejected. Bill these parts to the customer or contact Technical Support.
                    </div>
                  ) : (
                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-500 font-semibold py-3 rounded-2xl text-xs mt-2 px-3">
                      {approvalClaimStatus === null
                        ? 'No claim has been raised for these parts yet.'
                        : 'Waiting for the brand to approve. This screen updates automatically.'}
                    </div>
                  )}
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
                  disabled={stepBusy}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] disabled:opacity-60 text-white font-normal py-4 rounded-2xl text-sm transition-all shadow-md"
                >
                  {stepBusy ? 'Saving…' : 'Proceed to Invoice & Billing'}
                </button>
              </div>
            )}

            {/* Step: SPARE PART REQUIRED (Mockup Page) */}
            {activeStep === 'spare_part_required' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveStep('inspection')} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-normal text-white">Spare Part Required</h1>
                      <span className="text-[10px] text-white/70 block font-normal mt-0.5">#{activeJob.id}</span>
                    </div>
                  </div>
                </div>

                {/* Required Part Card */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3.5 mt-2">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50/50 border border-amber-100/50 px-3 py-1.5 rounded-xl w-fit">
                    <AlertTriangle className="h-4 w-4 fill-amber-50" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Required Part</span>
                  </div>

                  <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1 flex-shrink-0">
                      <img 
                        src={getProductImage(activeJob)} 
                        alt={dynamicPartName} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left flex-1">
                      <h5 className="text-sm font-semibold text-[#052355]">{dynamicPartName}</h5>
                      <p className="text-xs text-slate-500 font-normal mt-1">Qty: 1</p>
                    </div>
                  </div>
                </div>

                {/* Estimated Cost Section */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Estimated Cost</span>
                  <span className="text-lg font-bold text-[#052355]">
                    ₹{dynamicPartPrice === 0 ? '0 (Covered)' : dynamicPartPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Availability Section */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Availability</h4>
                  
                  <div className="flex flex-col gap-3 mt-1">
                    {/* Option 1: In Technician Stock */}
                    <label 
                      onClick={() => setPartAvailability('technician_stock')}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer select-none border transition-all ${
                        partAvailability === 'technician_stock' 
                          ? 'bg-blue-50/40 border-[#0D47A1]' 
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          partAvailability === 'technician_stock' ? 'border-[#0D47A1]' : 'border-slate-300'
                        }`}>
                          {partAvailability === 'technician_stock' && <div className="w-2 h-2 rounded-full bg-[#0D47A1]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-800">In Technician Stock</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 font-semibold rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider border border-emerald-150">
                        In Hand
                      </span>
                    </label>

                    {/* Option 2: NCC Warehouse */}
                    <label 
                      onClick={() => setPartAvailability('warehouse')}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer select-none border transition-all ${
                        partAvailability === 'warehouse' 
                          ? 'bg-blue-50/40 border-[#0D47A1]' 
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          partAvailability === 'warehouse' ? 'border-[#0D47A1]' : 'border-slate-300'
                        }`}>
                          {partAvailability === 'warehouse' && <div className="w-2 h-2 rounded-full bg-[#0D47A1]" />}
                        </div>
                        <span className="text-xs font-medium text-slate-800">NCC Warehouse</span>
                      </div>
                      <span className="bg-green-50 text-green-600 font-medium rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider">
                        Available
                      </span>
                    </label>

                    {/* Option 3: Not Available */}
                    <label 
                      onClick={() => setPartAvailability('not_available')}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer select-none border transition-all ${
                        partAvailability === 'not_available' 
                          ? 'bg-blue-50/40 border-[#0D47A1]' 
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            partAvailability === 'not_available' ? 'border-[#0D47A1]' : 'border-slate-300'
                          }`}>
                            {partAvailability === 'not_available' && <div className="w-2 h-2 rounded-full bg-[#0D47A1]" />}
                          </div>
                          <span className="text-xs font-semibold text-[#052355]">Not Available</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal pl-7">Need to order / Part Pending</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notice */}
                {partAvailability === 'not_available' ? (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-3xl p-4 flex gap-3 text-left">
                    <div className="flex flex-col">
                      <p className="text-[11px] text-amber-800 font-normal leading-relaxed">
                        Customer will be notified. You can revisit within 48 hours after part is available.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/50 rounded-3xl p-4 flex gap-3 text-left">
                    <div className="flex flex-col">
                      <p className="text-[11px] text-emerald-800 font-normal leading-relaxed">
                        Part is available! You can install the part and complete the repair now without scheduling a revisit.
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Action Button */}
                {partAvailability === 'not_available' ? (
                  <button 
                    onClick={() => {
                      setActiveStep('customer_update_preview');
                    }}
                    className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md mt-auto mb-1 text-center cursor-pointer"
                  >
                    Mark as Spare Part Pending
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      advanceStepsTo('repaircomplete');
                    }}
                    className="w-full bg-[#00C853] hover:bg-[#00A844] text-white font-semibold py-4 rounded-2xl text-xs transition-all shadow-md mt-auto mb-1 text-center cursor-pointer"
                  >
                    Install Part & Complete Repair
                  </button>
                )}
              </div>
            )}

            {/* Step: CUSTOMER UPDATE PREVIEW (Mockup Page) */}
            {activeStep === 'customer_update_preview' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setActiveStep('spare_part_required')} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Customer Update</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">(Preview)</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col mt-1">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col gap-4">
                    {/* NCC Service Update */}
                    <div className="flex items-center gap-3">
                      <Bell className="h-6 w-6 text-[#0A3F91] stroke-[2]" />
                      <span className="text-base font-bold text-[#052355]">NCC Service Update</span>
                    </div>
                    
                    {/* Greeting */}
                    <div className="text-left space-y-2 mt-1">
                      <p className="text-sm font-semibold text-[#052355]">Hi {activeJob?.customerName || 'there'},</p>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed">
                        During inspection, the following part is required:
                      </p>
                    </div>

                    {/* Sub-card 1: Compressor & Cost */}
                    <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden shadow-sm">
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1 flex-shrink-0">
                          <img src={getProductImage(activeJob)} alt={dynamicPartName} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-[#0D47A1]">Required Part</span>
                          <span className="text-base font-bold text-[#052355] mt-1">{dynamicPartName}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 px-4 py-3.5 flex justify-between items-center">
                        <span className="text-xs font-normal text-slate-600">Estimated Cost</span>
                        <span className="text-xl font-extrabold text-[#052355]">
                          ₹{dynamicPartPrice === 0 ? '0 (Covered)' : dynamicPartPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Sub-card 2: Expected Visit & Current Status */}
                    <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden p-4 flex flex-col gap-3.5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                          <Calendar className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-normal text-slate-600">Expected Visit</span>
                          <span className="text-xs font-semibold text-[#0D47A1] mt-0.5">Within 48 Hours</span>
                        </div>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5 text-left">
                        <span className="text-xs font-normal text-slate-600">Current Status</span>
                        <span className="bg-[#FFF3E0] text-[#E65100] font-bold rounded-lg px-3 py-1 text-[11px] w-fit">
                          Spare Part Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <p className="text-xs text-slate-600 font-normal leading-relaxed text-left mt-3 px-1">
                    You will be updated once the part is available and technician visits again to complete the repair.
                  </p>

                  {/* Send Update Button */}
                  <button 
                    disabled={stepBusy}
                    onClick={async () => {
                      const partsToRequest = spareParts.filter(p => p.checked);
                      const partName = partsToRequest.length > 0
                        ? partsToRequest.map(p => p.name).join(', ')
                        : (dynamicPartName && dynamicPartName !== 'No part used' ? dynamicPartName : 'Spare Part');
                      const price = partsToRequest.reduce((sum, p) => sum + (p.price || 0), 0) || (dynamicPartPrice || 0);

                      const payload = {
                        partName,
                        price,
                        qty: 1,
                        orderSource: 'NCC Warehouse',
                        parts: partsToRequest.length > 0 ? partsToRequest : [{ name: partName, price, qty: 1 }],
                      };

                      const res = await requestSparePart(activeJob?.id, payload);
                      if (res.ok) {
                        setActiveStep('completed_pending');
                      }
                    }}
                    className="w-full bg-[#052355] hover:bg-[#031c45] disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-6 mb-1 text-center"
                  >
                    {stepBusy ? 'Sending Request…' : 'Send Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Step: COMPLETED PENDING (Outcome) */}
            {activeStep === 'completed_pending' && (
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm text-center flex flex-col gap-6 py-10 my-4">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border border-amber-100 shadow-sm">
                  <Clock className="h-10 w-10 stroke-[2.5]" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-medium text-[#052355]">Spare Part Pending</h2>
                  <p className="text-sm text-slate-600 mt-2 font-normal">Customer notified. Job is marked as pending. Revisit will be scheduled once the spare part becomes available.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs font-normal text-slate-600 space-y-2.5">
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-600">Job Reference</span>
                    <span className="text-[#052355]">#{activeJob.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status</span>
                    <span className="text-amber-600 font-normal bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">Awaiting Spare Part</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <button 
                    onClick={() => {
                      setActiveStep('spare_part_job_details');
                    }}
                    className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-4 rounded-2xl text-sm transition-all shadow-md text-center"
                  >
                    View Job Details
                  </button>
                  
                  <button 
                    onClick={() => {
                      resetActiveJob();
                      navigate('/technician/dashboard');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-250 text-[#052355] font-semibold py-4 rounded-2xl text-sm transition-all border border-slate-200 shadow-sm text-center"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Step: SPARE PART JOB DETAILS (Mockup Page) */}
            {activeStep === 'spare_part_job_details' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setActiveStep('completed_pending')} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Job Details</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">#{activeJob.id}</span>
                    </div>
                    <button className="p-1 hover:bg-white/10 rounded-full transition-colors">
                      <MoreVertical className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col gap-5 mt-2">
                  {/* Status Badge */}
                  <span className="bg-[#FF9100] text-white font-bold rounded-lg px-3 py-1.5 text-[10px] w-fit uppercase tracking-wider">
                    Spare Part Pending
                  </span>

                  {/* Title & Subtitle */}
                  <div className="text-left space-y-1 mt-1">
                    <h2 className="text-lg font-bold text-[#052355] leading-snug">
                      {activeJob?.complaint || 'Split AC Gas Charging'}
                    </h2>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed">
                      {activeJob?.brand || 'Voltas'} {activeJob?.product || 'Split AC'} {activeJob?.details || '1.5 Ton Inverter'}
                    </p>
                  </div>

                  {/* Product Image */}
                  <div className="w-full flex justify-center py-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <div className="w-36 h-36 flex items-center justify-center p-1 flex-shrink-0">
                      <img 
                        src={getProductImage(activeJob)} 
                        alt="Product" 
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Status Box */}
                  <div className="space-y-2 text-left">
                    <span className="text-xs font-normal text-slate-500">Status</span>
                    <h4 className="text-base font-bold text-[#FF9100]">Spare Part Pending</h4>
                    <p className="text-xs text-slate-600 font-normal leading-relaxed">
                      Waiting for part availability. <br />
                      Technician will revisit within 48 hours.
                    </p>
                  </div>

                  <hr className="border-slate-150" />

                  {/* Details List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-normal">Required Part</span>
                      <span className="text-[#052355] font-semibold">{dynamicPartName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-normal">Estimated Cost</span>
                      <span className="text-[#052355] font-semibold">
                        ₹{dynamicPartPrice === 0 ? '0 (Covered)' : dynamicPartPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-normal">Expected Revisit</span>
                      <span className="text-[#052355] font-semibold">
                        {expectedRevisitDate}
                      </span>
                    </div>
                  </div>

                  {/* Update Expected Date Button */}
                  <button 
                    onClick={() => {
                      setSelectedTempDate(expectedRevisitDate);
                      setShowDatePicker(true);
                    }}
                    className="w-full border border-blue-200 text-[#0D47A1] font-semibold py-3 rounded-2xl text-xs hover:bg-blue-50 transition-all text-center mt-2 shadow-sm"
                  >
                    Update Expected Date
                  </button>

                  <hr className="border-slate-150 mt-1" />

                  {/* Other Details Dropdown */}
                  <div 
                    onClick={() => setShowOtherDetails(!showOtherDetails)}
                    className="flex justify-between items-center py-2 cursor-pointer select-none"
                  >
                    <span className="text-sm font-bold text-[#052355]">Other Details</span>
                    <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showOtherDetails ? 'rotate-90' : ''}`} />
                  </div>

                  {showOtherDetails && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs text-left animate-fadeIn">
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-normal">Service Category</span>
                        <span className="text-[#052355] font-semibold">AC Service & Repair</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-normal">Fault Description</span>
                        <span className="text-slate-650 font-normal leading-relaxed">
                          AC compressor drawing high current on startup. The fan motor runs normally but there is zero cooling. Diagnostics confirm compressor run capacitor has degraded.
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block font-normal">Customer Remarks</span>
                        <span className="text-slate-650 font-normal leading-relaxed">
                          AC is completely shut down. Please replace the compressor part as soon as possible.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Go to Dashboard Button */}
                  <button 
                    onClick={() => {
                      resetActiveJob();
                      navigate('/technician/dashboard');
                    }}
                    className="w-full bg-[#052355] hover:bg-[#031c45] text-white font-semibold py-4 rounded-2xl text-sm transition-all shadow-md mt-4 text-center"
                  >
                    Go to Dashboard
                  </button>
                </div>

                {/* Date Picker Modal */}
                {showDatePicker && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 -mx-4">
                    <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-5 shadow-xl flex flex-col gap-4 text-left animate-slideUp">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="text-base font-bold text-[#052355]">Select Revisit Date</h3>
                        <button 
                          onClick={() => setShowDatePicker(false)}
                          className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2.5 py-2">
                        {(() => {
                          const nextDays = [];
                          for (let i = 1; i <= 8; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() + i);
                            nextDays.push({
                              full: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                              dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                              dayNum: date.getDate(),
                              monthName: date.toLocaleDateString('en-US', { month: 'short' })
                            });
                          }
                          return nextDays.map((day, idx) => {
                            const isSelected = selectedTempDate === day.full || (!selectedTempDate && idx === 0);
                            return (
                              <button
                                key={day.full}
                                onClick={() => setSelectedTempDate(day.full)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                                  isSelected 
                                    ? 'border-[#0D47A1] bg-blue-50/50 text-[#0D47A1] font-bold shadow-sm'
                                    : 'border-slate-200 hover:border-slate-350 text-slate-700 bg-white font-normal'
                                }`}
                              >
                                <span className={`text-[10px] uppercase ${isSelected ? 'text-[#0D47A1]/85 font-semibold' : 'text-slate-400'}`}>
                                  {day.dayName}
                                </span>
                                <span className="text-base mt-1">{day.dayNum}</span>
                                <span className={`text-[10px] ${isSelected ? 'text-[#0D47A1]/85 font-semibold' : 'text-slate-400'}`}>
                                  {day.monthName}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      <button
                        onClick={() => {
                          if (selectedTempDate) {
                            setExpectedRevisitDate(selectedTempDate);
                          }
                          setShowDatePicker(false);
                        }}
                        className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-4 rounded-2xl text-sm transition-all shadow-md mt-2 text-center"
                      >
                        Confirm New Revisit Date
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: REVISIT SCHEDULED / ON THE WAY / ARRIVED */}
            {(activeStep === 'revisit_scheduled' || activeStep === 'revisit_ontheway' || activeStep === 'revisit_arrived') && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => navigate('/technician/dashboard')} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Revisit Job</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || 'SR-Revisit'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 mt-2">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1]">
                        <RotateCw className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#052355]">Spare Part Received & Scheduled</h3>
                        <p className="text-xs text-slate-500 font-medium">Revisit for installation</p>
                      </div>
                    </div>

                    {activeJob?.revisitScheduledDate && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3 mt-1">
                        <Calendar className="w-5 h-5 text-[#0D47A1]" />
                        <div>
                          <p className="text-xs font-bold text-[#052355]">
                            {new Date(activeJob.revisitScheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {activeJob.revisitTimeSlot && (
                            <p className="text-[11px] font-semibold text-slate-600">Slot: {activeJob.revisitTimeSlot}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer:</span>
                        <span className="font-bold text-[#052355]">{activeJob?.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Address:</span>
                        <span className="font-semibold text-slate-700 text-right max-w-[200px] truncate">{activeJob?.address}</span>
                      </div>
                    </div>
                  </div>

                  {activeStep === 'revisit_scheduled' && (
                    <button
                      onClick={() => advanceStep('revisit_scheduled')}
                      disabled={stepBusy}
                      className="w-full bg-[#0D47A1] hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md text-center flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      {stepBusy ? 'Updating…' : 'Start Travel to Customer'}
                    </button>
                  )}

                  {activeStep === 'revisit_ontheway' && (
                    <button
                      onClick={() => advanceStep('revisit_ontheway')}
                      disabled={stepBusy}
                      className="w-full bg-[#16A34A] hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md text-center flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      {stepBusy ? 'Updating…' : 'Reached Customer Location'}
                    </button>
                  )}

                  {activeStep === 'revisit_arrived' && (
                    <div className="flex flex-col gap-3">
                      {activeJob?.revisitRepairStatus === 'completed' || activeJob?.activeStep === 'revisit_billing' || activeJob?.activeStep === 'revisit_payment' || activeJob?.activeStep === 'revisit_otp' ? (
                        <div className="flex flex-col gap-2.5">
                          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-left">
                            <Check className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                              You have already completed the repair for this job. Please continue to billing.
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveStep('revisit_billing')}
                            className="w-full bg-[#052355] hover:bg-[#0a2c66] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md text-center flex items-center justify-center gap-2"
                          >
                            Continue to Billing
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveStep('revisit_complete')}
                          className="w-full bg-[#052355] hover:bg-blue-900 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md text-center flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Proceed to Part Installation & Inspection
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step: REVISIT & COMPLETE (Mockup Page) */}
            {activeStep === 'revisit_complete' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('idle');
                        navigate('/technician/dashboard');
                      }} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Revisit & Complete</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 mt-2">
                  {/* Card 1: Part Received? */}
                  <div className="bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col">
                    {/* Top Alert Info */}
                    <div className="bg-[#FFF8E1] p-4 flex gap-3.5 items-start text-left border-b border-amber-50">
                      <div className="w-10 h-10 bg-white border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0 shadow-xs">
                        <Package className="h-5 w-5 stroke-[2]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <h4 className="text-sm font-bold text-[#052355]">Part Received?</h4>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Confirm part availability to continue
                        </p>
                      </div>
                    </div>

                    {/* Part Details */}
                    <div className="p-4 flex flex-col gap-1 text-left">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Required Part</span>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-sm font-bold text-[#052355]">{dynamicPartName}</span>
                        <span className="text-sm font-bold text-[#052355]">
                          ₹{dynamicPartPrice === 0 ? '0 (Covered)' : dynamicPartPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section Label */}
                  <h3 className="text-xs font-bold text-[#052355] uppercase tracking-wider text-left mt-2">
                    Mark Repair Status
                  </h3>

                  {/* Status Options Single Card Container */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs flex flex-col">
                    {/* Option 1: Part Installed & Repair Completed */}
                    <div 
                      onClick={() => {
                        setRevisitRepairStatus('completed');
                        setRevisitReason('');
                      }}
                      className={`p-4 flex items-start gap-3.5 cursor-pointer select-none transition-all ${
                        revisitRepairStatus === 'completed'
                          ? 'bg-green-50/20'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {revisitRepairStatus === 'completed' ? (
                          <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={`text-xs font-bold ${revisitRepairStatus === 'completed' ? 'text-green-700' : 'text-[#052355]'}`}>
                          Part Installed & Repair Completed
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Customer appliance working fine
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-slate-100"></div>

                    {/* Option 2: Unable to Fix */}
                    <div 
                      onClick={() => {
                        setRevisitRepairStatus('unable');
                        setRevisitReason('');
                      }}
                      className={`p-4 flex flex-col gap-3 cursor-pointer select-none transition-all ${
                        revisitRepairStatus === 'unable'
                          ? 'bg-blue-50/15'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {revisitRepairStatus === 'unable' ? (
                            <div className="w-5 h-5 rounded-full bg-[#0D47A1] flex items-center justify-center text-white">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={`text-xs font-bold ${revisitRepairStatus === 'unable' ? 'text-[#0D47A1]' : 'text-[#052355]'}`}>
                            Unable to Fix
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                            Issue still not resolved
                          </span>
                        </div>
                      </div>

                      {/* Inline Reason List for Unable to Fix */}
                      {revisitRepairStatus === 'unable' && (
                        <div className="pl-8.5 pr-2 py-2 flex flex-col gap-2.5 border-t border-slate-100 mt-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Select Reason</span>
                          {[
                            "Appliance Beyond Economical Repair (BER)",
                            "Required part is obsolete / unavailable",
                            "Incorrect initial diagnosis",
                            "Requires senior specialist intervention"
                          ].map((reason) => (
                            <label key={reason} className="flex items-center gap-2.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name="unableReason" 
                                value={reason}
                                checked={revisitReason === reason}
                                onChange={(e) => setRevisitReason(e.target.value)}
                                className="w-3.5 h-3.5 text-[#0D47A1] focus:ring-0"
                              />
                              <span className="text-xs text-slate-600 font-normal">{reason}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="h-[1px] bg-slate-100"></div>

                    {/* Option 3: Customer Cancelled */}
                    <div 
                      onClick={() => {
                        setRevisitRepairStatus('cancelled');
                        setRevisitReason('');
                      }}
                      className={`p-4 flex flex-col gap-3 cursor-pointer select-none transition-all ${
                        revisitRepairStatus === 'cancelled'
                          ? 'bg-red-50/15'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {revisitRepairStatus === 'cancelled' ? (
                            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={`text-xs font-bold ${revisitRepairStatus === 'cancelled' ? 'text-red-700' : 'text-[#052355]'}`}>
                            Customer Cancelled
                          </span>
                        </div>
                      </div>

                      {/* Inline Reason List for Customer Cancelled */}
                      {revisitRepairStatus === 'cancelled' && (
                        <div className="pl-8.5 pr-2 py-2 flex flex-col gap-2.5 border-t border-slate-100 mt-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Select Reason</span>
                          {[
                            "Repair estimate / spare part cost too high",
                            "Customer decided to purchase new appliance",
                            "Customer resolved through third party",
                            "Customer not reachable / unavailable"
                          ].map((reason) => (
                            <label key={reason} className="flex items-center gap-2.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name="cancelledReason" 
                                value={reason}
                                checked={revisitReason === reason}
                                onChange={(e) => setRevisitReason(e.target.value)}
                                className="w-3.5 h-3.5 text-red-650 focus:ring-0"
                              />
                              <span className="text-xs text-slate-650 font-normal">{reason}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <button 
                    disabled={(revisitRepairStatus === 'unable' || revisitRepairStatus === 'cancelled') && !revisitReason}
                    onClick={() => {
                      if (revisitRepairStatus === 'completed') {
                        // Go to billing worksheet
                        setActiveStep('revisit_billing');
                      } else if (revisitRepairStatus === 'unable') {
                        setActiveStep('unable_to_fix_summary');
                      } else if (revisitRepairStatus === 'cancelled') {
                        setActiveStep('cancellation_summary');
                        creditTravelFee(activeJob?.id).then((res) => setTravelPayout(res || { amount: 0 }));
                      }
                    }}
                    className={`w-full text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-6 mb-6 text-center ${
                      ((revisitRepairStatus === 'unable' || revisitRepairStatus === 'cancelled') && !revisitReason)
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-[#052355] hover:bg-[#0a2c66]'
                    }`}
                  >
                    {revisitRepairStatus === 'completed' 
                      ? 'Continue to Billing' 
                      : revisitRepairStatus === 'unable'
                        ? 'Complete & Close Job'
                        : 'Proceed to Cancellation Summary'
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Step: CANCELLATION SUMMARY (Prepaid Travel Payout) */}
            {activeStep === 'cancellation_summary' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_complete');
                      }} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Cancellation Summary</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 mt-4">
                  {/* Status Indicator Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-650 shadow-xs">
                      <Check className="h-8 w-8 stroke-[3.5] text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#052355]">Job Cancelled</h3>
                      <p className="text-xs text-slate-500 mt-1">Ticket has been closed successfully</p>
                    </div>
                  </div>

                  {/* Summary Details Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-[#052355] uppercase tracking-wider border-b border-slate-100 pb-2">
                      Details
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-normal">Customer Name</span>
                        <span className="text-[#052355] font-semibold">{activeJob?.customerName || 'Amit Singh'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-550 font-normal">Cancellation Reason</span>
                        <span className="text-slate-700 font-semibold text-right max-w-[200px] truncate">{revisitReason}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-[#052355]">Travel Payout</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {travelPayout === null ? 'Crediting…' : travelPayout.amount > 0 ? `₹${travelPayout.amount} credited` : 'Not applicable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 items-start">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                      Since the customer paid the visiting charges upfront, no payment collection is required. {travelPayout?.amount > 0 ? `Your travel payout of ₹${travelPayout.amount} has been added to your pending earnings and will be released with your next payout cycle.` : 'Your travel payout will be confirmed on your earnings screen.'}
                    </p>
                  </div>

                  {/* Complete Button */}
                  <button 
                    onClick={() => {
                      setActiveStep('idle');
                      resetActiveJob();
                      navigate('/technician/dashboard');
                    }}
                    className="w-full bg-[#052355] hover:bg-[#0a2c66] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-auto mb-6 text-center"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Step: UNABLE TO FIX SUMMARY */}
            {activeStep === 'unable_to_fix_summary' && (
              <div className="bg-[#F5F8FC] flex flex-col gap-4 text-left font-sans -mx-4 -my-4 p-4 min-h-screen">
                {/* Custom Navy Header */}
                <div className="bg-[#052355] text-white pt-4 pb-6 px-4 flex flex-col gap-3 rounded-b-[2.5rem] relative z-10 shadow-md -mx-4 -mt-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_complete');
                      }} 
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-base font-semibold text-white">Job Closed - Unresolved</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 mt-4">
                  {/* Status Indicator Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 shadow-xs">
                      <AlertTriangle className="h-8 w-8 stroke-[2.5] text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#052355]">Closed Unresolved</h3>
                      <p className="text-xs text-slate-500 mt-1">Ticket has been closed as incomplete</p>
                    </div>
                  </div>

                  {/* Summary Details Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-[#052355] uppercase tracking-wider border-b border-slate-100 pb-2">
                      Details
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-normal">Customer Name</span>
                        <span className="text-[#052355] font-semibold">{activeJob?.customerName || 'Amit Singh'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-normal">Failure Reason</span>
                        <span className="text-[#052355] font-semibold text-right max-w-[200px] truncate">{revisitReason}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-[#052355]">Customer Charged</span>
                        <span className="text-sm font-bold text-slate-700">₹0</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#052355]">Technician Payout</span>
                        <span className="text-sm font-bold text-slate-700">₹0</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-4 flex gap-3 items-start">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 leading-relaxed font-normal">
                      The job has been logged as unresolved due to technician/part issue. A refund or re-assignment request has been initiated for the customer.
                    </p>
                  </div>

                  {/* Complete Button */}
                  <button 
                    onClick={() => {
                      setActiveStep('idle');
                      resetActiveJob();
                      navigate('/technician/dashboard');
                    }}
                    className="w-full bg-[#052355] hover:bg-[#0a2c66] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md mt-auto mb-6 text-center"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Step: REVISIT BILLING (Mockup Page) */}
            {activeStep === 'revisit_billing' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        navigate('/technician/dashboard');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Billing Worksheet</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* White card overlapping sheet */}
                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col gap-5">
                    {/* Bill Summary Title */}
                    <h2 className="text-lg font-extrabold text-[#052355] mt-1">
                      Bill Summary
                    </h2>

                    {/* Bill Items */}
                    <div className="flex flex-col gap-4 text-sm font-medium text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Service Charge</span>
                        <span className="text-[#052355] font-semibold text-sm">
                          ₹{revisitServiceCharge === 0 ? '0 (Covered)' : revisitServiceCharge.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Additional Services</span>
                        <span className="text-[#052355] font-semibold text-sm">
                          ₹{revisitAdditionalServicesPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Spare Part ({dynamicPartName})</span>
                        <span className="text-[#052355] font-semibold text-sm">
                          ₹{revisitSparePartPrice === 0 ? '0 (Covered)' : revisitSparePartPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Tax (18% GST)</span>
                        <span className="text-[#052355] font-semibold text-sm">
                          ₹{revisitTax.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-[#E2E8F0] my-1"></div>

                    {/* Total Amount */}
                    <div className="flex justify-between items-center">
                      <span className="text-base font-extrabold text-[#052355]">Total Amount</span>
                      <span className="text-2xl font-black text-[#16A34A]">
                        ₹{revisitTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-6">
                    {/* Yellow Alert Box */}
                    <div className="bg-[#FFF8E1] rounded-2xl py-3.5 px-4 flex items-center justify-center text-center border border-amber-200/50">
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">
                        This is the final bill amount to be collected from the customer.
                      </p>
                    </div>

                    {/* Proceed to Payment Button */}
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }}
                      className="w-full bg-[#052355] hover:bg-[#0a2c66] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      Proceed to Payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT PAYMENT (Collect Payment Screen - 2 Options: Razorpay & Cash) */}
            {activeStep === 'revisit_payment' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                {/* Custom Navy Header */}
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_billing');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Collect Payment</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* White card overlapping sheet */}
                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col gap-5">
                    {/* Total Payable Row */}
                    <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-100/80 rounded-2xl p-4 flex justify-between items-center shadow-2xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Payable</span>
                        <span className="text-xs text-slate-600 font-medium">Inclusive of all taxes</span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-[#16A34A]">
                        ₹{revisitTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Section Title */}
                    <div>
                      <h2 className="text-sm font-extrabold text-[#052355] tracking-tight">
                        Select Payment Option
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Choose how the customer will settle the bill
                      </p>
                    </div>

                    {/* 2 Payment Options */}
                    <div className="flex flex-col gap-3.5">
                      {/* Option 1: Razorpay Online Payment */}
                      <div 
                        onClick={() => setRevisitPaymentMethod('razorpay')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-2.5 ${
                          revisitPaymentMethod === 'razorpay' 
                            ? 'border-[#0D47A1] bg-blue-50/25 ring-2 ring-blue-100/60 shadow-xs' 
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              revisitPaymentMethod === 'razorpay' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-slate-300'
                            }`}>
                              {revisitPaymentMethod === 'razorpay' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm font-black text-[#052355]">Online Payment (Razorpay)</span>
                          </div>
                          <span className="text-[10px] font-black text-[#0A3F91] bg-blue-100/60 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Instant
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium pl-8">
                          UPI (GPay / PhonePe / Paytm / BHIM), Dynamic QR Code, Debit / Credit Cards & Netbanking.
                        </p>
                      </div>

                      {/* Option 2: Cash Collect */}
                      <div 
                        onClick={() => setRevisitPaymentMethod('cash')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-2.5 ${
                          revisitPaymentMethod === 'cash' 
                            ? 'border-[#16A34A] bg-emerald-50/25 ring-2 ring-emerald-100/60 shadow-xs' 
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              revisitPaymentMethod === 'cash' ? 'border-[#16A34A] bg-[#16A34A]' : 'border-slate-300'
                            }`}>
                              {revisitPaymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm font-black text-[#052355]">Cash Collect</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Cash
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium pl-8">
                          Collect ₹{revisitTotal.toLocaleString('en-IN')} physical cash directly from customer at job site.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col mt-6">
                    {/* Action Button */}
                    <button 
                      onClick={() => {
                        if (revisitPaymentMethod === 'razorpay') {
                          setActiveStep('revisit_payment_upi');
                        } else {
                          setActiveStep('revisit_otp');
                        }
                      }}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      {revisitPaymentMethod === 'razorpay' ? 'Proceed to Online Payment (Razorpay)' : 'Confirm Cash & Proceed to Closure'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT PAYMENT - UPI SCAN */}
            {activeStep === 'revisit_payment_upi' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">UPI Collection</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <span className="text-xs font-bold text-[#052355] uppercase tracking-wider">
                      Scan QR Code
                    </span>

                    {/* QR Code Container */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col items-center gap-3 relative shadow-inner w-full max-w-[260px]">
                      <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-150 relative overflow-hidden">
                        <QrCode className="h-40 w-40 text-[#0D47A1]" />
                      </div>
                      <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-0.5 rounded-full uppercase tracking-wider">
                        Scan QR to Pay Instantly
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-slate-500">Amount to pay</span>
                      <span className="text-3xl font-black text-[#16A34A]">₹{revisitTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <p className="text-xs text-slate-600 px-2 font-normal leading-relaxed">
                      Ask the customer to scan the QR code using GPay, PhonePe, Paytm, or BHIM UPI app.
                    </p>
                  </div>

                  <div className="flex flex-col mt-6">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_otp');
                      }}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      Confirm Payment Received
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT PAYMENT - CASH */}
            {activeStep === 'revisit_payment_cash' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Cash Collection</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <span className="text-xs font-bold text-[#052355] uppercase tracking-wider">
                      Collect Cash
                    </span>

                    {/* Cash Icon Container */}
                    <div className="bg-[#EBF7EE] p-5 rounded-full flex items-center justify-center text-green-700 shadow-sm w-24 h-24 mt-2">
                      <Banknote className="h-12 w-12 stroke-[1.8]" />
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-xs font-medium text-slate-500">Collect from customer</span>
                      <span className="text-3xl font-black text-[#16A34A]">₹{revisitTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <p className="text-xs text-slate-600 px-2 font-normal leading-relaxed">
                      Please collect the cash amount of ₹{revisitTotal.toLocaleString('en-IN')} from the customer. Verify and count all cash notes carefully before clicking confirm.
                    </p>
                  </div>

                  <div className="flex flex-col mt-6">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_otp');
                      }}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      Confirm Cash Collected
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT PAYMENT - CARD */}
            {activeStep === 'revisit_payment_card' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Card Collection</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <span className="text-xs font-bold text-[#052355] uppercase tracking-wider">
                      POS Terminal Payment
                    </span>

                    {/* Card Icon Container */}
                    <div className="bg-blue-50 p-5 rounded-full flex items-center justify-center text-[#0D47A1] shadow-sm w-24 h-24 mt-2">
                      <CreditCard className="h-12 w-12 stroke-[1.8]" />
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-xs font-medium text-slate-500">Swipe/Tap amount</span>
                      <span className="text-3xl font-black text-[#16A34A]">₹{revisitTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <p className="text-xs text-slate-600 px-2 font-normal leading-relaxed">
                      Initiate the transaction of ₹{revisitTotal.toLocaleString('en-IN')} on your card POS machine. Prompt the customer to insert, swipe, or tap their Debit/Credit card.
                    </p>
                  </div>

                  <div className="flex flex-col mt-6">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_otp');
                      }}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      Confirm Card Payment Success
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT PAYMENT - WALLET */}
            {activeStep === 'revisit_payment_wallet' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Wallet Collection</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <span className="text-xs font-bold text-[#052355] uppercase tracking-wider">
                      Mobile Wallet Transfer
                    </span>

                    {/* Wallet Icon Container */}
                    <div className="bg-purple-50 p-5 rounded-full flex items-center justify-center text-purple-700 shadow-sm w-24 h-24 mt-2">
                      <Wallet className="h-12 w-12 stroke-[1.8]" />
                    </div>

                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-xs font-medium text-slate-500">Payable amount</span>
                      <span className="text-3xl font-black text-[#16A34A]">₹{revisitTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <p className="text-xs text-slate-600 px-2 font-normal leading-relaxed">
                      Ask the customer to send ₹{revisitTotal.toLocaleString('en-IN')} to the NCC business phone number or transfer it directly to the registered Paytm/PhonePe wallet account.
                    </p>
                  </div>

                  <div className="flex flex-col mt-6">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_otp');
                      }}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      Confirm Wallet Payment Success
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: REVISIT OTP / JOB CLOSURE */}
            {activeStep === 'revisit_otp' && (
              <div className="bg-[#F5F8FC] flex flex-col text-left font-sans -mx-4 -my-4 min-h-[calc(100vh-1rem)] relative">
                {/* Custom Navy Header matching mockup */}
                <div className="bg-[#052355] text-white pt-6 pb-10 px-5 flex flex-col gap-3 rounded-b-[2.2rem] shadow-md">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setActiveStep('revisit_payment');
                      }} 
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-6 w-6 text-white" />
                    </button>
                    <div className="flex-1 text-center pr-9">
                      <h1 className="text-lg font-bold text-white tracking-wide">Job Closure</h1>
                      <span className="text-xs text-white/80 block font-normal mt-0.5">
                        #{activeJob?.id || '8842'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* White card overlapping sheet */}
                <div className="flex-1 bg-white mx-3.5 -mt-5 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between mb-8">
                  <div className="flex flex-col gap-1">
                    {/* Enter OTP Section Header */}
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <h2 className="text-base font-extrabold text-[#052355]">
                          Enter OTP
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Please enter the 4-digit OTP shared by customer
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const customerOtp = activeJob?.serviceRequest?.completionOtp || activeJob?.completionOtp || '8745';
                          setRevisitOtp(customerOtp.split('').slice(0, 4));
                        }}
                        className="text-[11px] font-bold text-[#0D47A1] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-blue-200/50"
                      >
                        Auto-fill
                      </button>
                    </div>

                    {/* OTP 4 digit inputs */}
                    <div className="flex gap-3 sm:gap-4 my-5 justify-between max-w-[320px]">
                      {revisitOtp.map((digit, idx) => (
                        <input 
                          key={idx}
                          id={`revisit-otp-${idx}`}
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onPaste={handleOtpPaste}
                          onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                          onChange={(e) => handleOtpChange(e.target.value, idx)}
                          className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-slate-200 rounded-2xl text-center text-2xl font-black text-[#052355] bg-slate-50/70 focus:border-[#0D47A1] focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-2xs"
                        />
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-[#E2E8F0] my-3"></div>

                    {/* Signature Section */}
                    <h3 className="text-[13px] font-bold text-[#052355] mb-2">
                      Customer Signature (Optional)
                    </h3>

                    {/* Signature Pad container */}
                    <div className="relative border border-slate-200 rounded-2xl h-[140px] w-full overflow-hidden bg-slate-50/70 shadow-inner">
                      <canvas 
                        ref={revisitCanvasRef}
                        width={340}
                        height={140}
                        onMouseDown={startDrawingRevisit}
                        onMouseMove={drawRevisit}
                        onMouseUp={stopDrawingRevisit}
                        onTouchStart={startDrawingRevisit}
                        onTouchMove={drawRevisit}
                        onTouchEnd={stopDrawingRevisit}
                        className="bg-transparent absolute inset-0 z-20 cursor-crosshair touch-none w-full h-[140px]"
                      />
                      
                      {!hasSignedRevisit && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                          <span 
                            style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Pacifico', 'Caveat', cursive" }}
                            className="text-[32px] text-slate-300 italic font-medium opacity-80"
                          >
                            {activeJob?.customerName || 'Customer Sign'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mt-1 px-1">
                      <button 
                        type="button"
                        onClick={clearRevisitSignature}
                        className="text-xs font-bold text-[#0D47A1] hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col mt-6">
                    {/* Verify & Close Job Green Button */}
                    <button
                      onClick={async () => { 
                        const otpStr = revisitOtp.join('') || '8745';
                        const res = await collectPayment(revisitPaymentMethod === 'razorpay' ? 'Online' : 'Cash', { otp: otpStr, signatureUrl: hasSignedRevisit ? 'signed' : null }); 
                        if (res?.ok) {
                          setActiveJobId(null);
                          setActiveStep('idle');
                          navigate('/technician/dashboard', { replace: true });
                        }
                      }}
                      disabled={stepBusy}
                      className="w-full bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl text-base transition-all shadow-md text-center cursor-pointer active:scale-[0.99]"
                    >
                      {stepBusy ? 'Closing Job…' : 'Verify & Close Job'}
                    </button>
                  </div>
                </div>
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
                  <p className="text-xs text-slate-600 font-normal">Estimate breakdown for {activeJob?.customerName || 'the customer'}</p>
                </div>

                <div className="flex flex-col gap-3.5 border-b border-slate-200 pb-4 text-xs font-normal text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Service Charge</span>
                    <span className="text-[#052355]">₹{revisitServiceCharge.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {selectedParts.map(part => (
                    <div key={part.id} className="flex justify-between">
                      <span className="text-slate-600">Spare Part ({part.name})</span>
                      <span className="text-[#052355]">₹{part.price}</span>
                    </div>
                  ))}

                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax ({gstPercent}% GST)</span>
                    <span className="text-[#052355]">₹{revisitTax.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Payable vs Earnings */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-normal text-slate-500">Customer Payable</span>
                    <span className="text-xl font-medium text-green-600">₹{finalAmountCollected.toLocaleString('en-IN')}</span>
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
                      const sparePartsTotal = spareParts
                        .filter(p => p.checked)
                        .reduce((sum, p) => sum + p.price, 0);
                      const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 0;
                      const totalAmount = baseServicePrice + additionalServicesTotal + sparePartsTotal;

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
                              <strong>Phone:</strong> ${activeJob.phone || 'Not recorded'}<br>
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
                                ${spareParts.filter(p => p.checked).map(part => '<tr><td>' + part.name + '</td><td>₹' + part.price + '</td></tr>').join('')}
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
                      const sparePartsTotal = spareParts
                        .filter(p => p.checked)
                        .reduce((sum, p) => sum + p.price, 0);
                      const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 0;
                      const totalAmount = baseServicePrice + additionalServicesTotal + sparePartsTotal;

                      // No fallback number: this used to WhatsApp the invoice to
                      // a hardcoded 9876543210 whenever the real phone was
                      // missing — messaging a stranger, not the customer.
                      if (!activeJob.phone) {
                        window.alert('No phone number on file for this customer — cannot send WhatsApp.');
                        return;
                      }
                      const whatsappText = `Hi ${activeJob.customerName || 'Customer'}, here is the invoice of ₹${totalAmount.toLocaleString('en-IN')} for your ${activeJob.brand} ${activeJob.product} service: http://nccpartner.com/invoice/INV-${activeJob.id}`;
                      const whatsappUrl = `https://api.whatsapp.com/send?phone=91${activeJob.phone}&text=${encodeURIComponent(whatsappText)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-green-600 font-normal py-3 rounded-2xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Send WhatsApp
                  </button>
                </div>

                <button 
                  onClick={async () => {
                    // The AMC/EW decrements below are only correct once the job
                    // actually closed server-side, so they wait on the result.
                    const res = await collectPayment();
                    if (!res?.ok) return;
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
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm text-center flex flex-col gap-6 py-8 my-4 max-w-sm mx-auto">
            {/* Confetti and Checkmark Container */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center mt-2">
              {/* Confetti Dots */}
              <span className="absolute top-2 left-4 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="absolute top-3 right-6 w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="absolute top-1/2 -left-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <span className="absolute top-10 right-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="absolute bottom-2 left-6 w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="absolute bottom-4 right-4 w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              <span className="absolute top-6 left-10 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce"></span>

              <div className="w-20 h-20 bg-[#EBF7EE] rounded-full flex items-center justify-center text-green-600 shadow-xs border border-green-50">
                <Check className="h-10 w-10 stroke-[3]" />
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[22px] font-bold text-[#052355]">Job Completed!</h2>
              <p className="text-[13px] text-slate-500 font-normal leading-relaxed">Great work! Job has been completed successfully.</p>
            </div>

            <div className="bg-[#F8FAFC] rounded-[2rem] p-5.5 border border-slate-100 text-left space-y-3.5 shadow-inner">
              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-slate-500">Job Reference</span>
                <span className="text-[#052355] font-bold text-sm">#8842</span>
              </div>
              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-slate-500">Total Amount Collected</span>
                <span className="text-[#052355] font-bold text-sm">₹{finalAmountCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-slate-500">You Earned</span>
                <span className="text-[#052355] font-bold text-sm">₹{(activeJob?.estEarnings || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-normal">
                <span className="text-slate-500">Status</span>
                <span className="text-[#16A34A] font-bold text-sm">Closed & Paid</span>
              </div>
            </div>

            <button 
              onClick={() => {
                resetActiveJob();
                navigate('/technician/dashboard');
              }}
              className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-4 rounded-2xl text-base transition-all shadow-md mt-2 text-center"
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

      {/* Add Spare Parts Overlay Card Modal */}
      {showAddPartsModal && (() => {
        const AVAILABLE_PARTS = [
          { id: 'part-1', name: 'Copper Pipe (1/4)', price: 800 },
          { id: 'part-filter', name: 'Filter Dryer', price: 350 },
          { id: 'part-capacitor', name: 'Capacitor 45 MFD', price: 450 },
          { id: 'part-gas', name: 'Refrigerant Gas (R410A)', price: 1200 },
          { id: 'part-expansion', name: 'Expansion Valve', price: 650 }
        ];

        // Filter out parts that are currently checked/active in the spareParts list
        const filteredParts = AVAILABLE_PARTS.filter(
          part => !spareParts.some(p => p.name.toLowerCase() === part.name.toLowerCase() && p.checked)
        );

        return (
          <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 border border-slate-100">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-[#052355]">Add Spare Parts</h3>
                <button 
                  onClick={() => setShowAddPartsModal(false)}
                  className="text-slate-400 hover:text-slate-650 text-xs font-semibold hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col gap-3.5 max-h-64 overflow-y-auto pr-1">
                {filteredParts.length > 0 ? (
                  filteredParts.map(part => (
                    <div key={part.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <div className="text-left">
                        <p className="text-xs font-semibold text-[#052355]">{part.name}</p>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">₹{part.price}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSpareParts(prev => {
                            const existingIndex = prev.findIndex(p => p.name.toLowerCase() === part.name.toLowerCase());
                            if (existingIndex > -1) {
                              return prev.map((p, idx) => idx === existingIndex ? { ...p, checked: true } : p);
                            }
                            return [
                              ...prev,
                              { id: part.id, name: part.name, price: part.price, checked: true }
                            ];
                          });
                          setShowAddPartsModal(false);
                        }}
                        className="bg-[#E3ECF9] hover:bg-[#c2d7f5] text-[#0D47A1] text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-5">All available spare parts have been added.</p>
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
        const sparePartsTotal = spareParts
          .filter(p => p.checked)
          .reduce((sum, p) => sum + p.price, 0);
        const baseServicePrice = activeJob && activeJob.price > 0 ? activeJob.price : 0;
        const totalAmount = baseServicePrice + additionalServicesTotal + sparePartsTotal;

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
                  className="text-slate-400 hover:text-slate-655 text-xs font-semibold hover:underline"
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
                  <span className="font-semibold text-[#052355]">{activeJob?.customerName || '—'}</span>
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
                  {spareParts.filter(p => p.checked).map(part => (
                    <div key={part.id} className="flex justify-between pl-2">
                      <span>{part.name}:</span>
                      <span className="font-medium text-[#052355]">₹{part.price}</span>
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



      {/* Purchase Invoice viewer — opens the customer's actual uploaded file.
          This used to render a fabricated retail invoice with invented line
          items and a print handler that regenerated it as a "real" PDF. */}
      {showInvoicePdfModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-[#0D47A1]" />
                <span className="text-sm font-semibold text-[#052355] truncate max-w-[200px]">
                  {activeJob?.invoiceUrl ? activeJob.invoiceUrl.split('/').pop() : 'No invoice'}
                </span>
              </div>
              <button
                onClick={() => setShowInvoicePdfModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold hover:underline"
              >
                Close
              </button>
            </div>

            {activeJob?.invoiceUrl ? (
              <>
                <p className="text-[11px] text-slate-500 font-normal text-left">
                  Purchase invoice uploaded by the customer. Check the purchase date against the
                  warranty period before proceeding.
                </p>
                <a
                  href={activeJob.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl text-xs text-center"
                >
                  Open Invoice
                </a>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 font-normal text-left">
                The customer has not uploaded a purchase invoice for this appliance.
              </p>
            )}
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
      {!(activeStep === 'inspection' && !inspectionDiagnosed) && 
        activeStep !== 'revisit_complete' && 
        activeStep !== 'customer_update_preview' && 
        activeStep !== 'spare_part_required' && 
        activeStep !== 'completed_pending' && 
        activeStep !== 'spare_part_job_details' && 
        activeStep !== 'cancellation_summary' && 
        activeStep !== 'unable_to_fix_summary' && 
        activeStep !== 'revisit_billing' && 
        activeStep !== 'revisit_payment' && 
        activeStep !== 'revisit_payment_upi' && 
        activeStep !== 'revisit_payment_cash' && 
        activeStep !== 'revisit_payment_card' && 
        activeStep !== 'revisit_payment_wallet' && 
        activeStep !== 'revisit_otp' && (
        <TechBottomNav activeTab="jobs" />
      )}

    </div>
  );
};

export default ActiveJob;
