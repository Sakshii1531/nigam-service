import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Briefcase, ClipboardList, Calendar, Wrench, User, MapPin, ChevronRight, ChevronLeft, Menu,
  Clock, Shield, Star, GraduationCap, MessageSquare, Megaphone, Scan, CheckCircle, RotateCw, X, LogOut, Sparkles, CreditCard, ShieldCheck, Award, Settings, HelpCircle, ArrowLeft, Zap
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import TechBottomNav from '../../components/TechBottomNav';
import techAvatar from '../../assets/tech_avatar.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    jobs, 
    earningsTally, 
    acceptJob, 
    selectJobForDetails,
    setActiveStep,
    activeSpecs,
    toggleSpec,
    jobsLoading,
    availability,
    availabilityBusy,
    setAvailability,
    dismissJob
  } = useTech();

  const isOnline = availability === 'Available';
  // null until the server answers — the pill must not claim "Offline" before we
  // actually know, and tapping it in that window would send the wrong target.
  const availabilityKnown = availability !== null;

  const handleToggleDuty = async () => {
    if (!availabilityKnown) return;
    const res = await setAvailability(isOnline ? 'Offline' : 'Available');
    if (!res.ok) {
      // Most often "your account is Pending" — the technician needs to know why
      // nothing happened rather than watching the pill silently snap back.
      setDutyMessage(res.error || 'Could not change your status.');
    } else if (!isOnline && res.assignedCount > 0) {
      setDutyMessage(`You're online — ${res.assignedCount} waiting job(s) assigned to you.`);
    } else {
      setDutyMessage(null);
    }
  };

  const [showAllJobs, setShowAllJobs] = useState(false);
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Priority', 'Recommended'
  const [categoryTab, setCategoryTab] = useState('All'); // 'All', 'D2C', 'Partner', 'NCC EW'
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dutyMessage, setDutyMessage] = useState(null);
  const [instantAlertJob, setInstantAlertJob] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [declinedInstantIds, setDeclinedInstantIds] = useState([]);
  const [acceptedInstantIds, setAcceptedInstantIds] = useState([]);

  const playDispatchChime = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio might be restricted prior to user gesture
    }
  };

  // 1. Listen for real-time WebSocket job dispatch events
  React.useEffect(() => {
    const handleIncomingEvent = (e) => {
      const payload = e.detail;
      if (!payload) return;

      const jobId = payload.bookingId || payload.serviceRequestId;
      if (declinedInstantIds.includes(jobId) || acceptedInstantIds.includes(jobId)) return;

      const newJobObj = {
        id: jobId,
        serviceRequestId: payload.serviceRequestId,
        bookingId: payload.bookingId,
        product: payload.serviceName || payload.product || `${payload.category || 'Service'} Repair`,
        category: payload.category || 'Service',
        address: payload.address || 'Nearby Customer Location',
        city: payload.city || '',
        state: payload.state || '',
        customerName: payload.fullName || payload.customerName || 'Customer',
        phone: payload.mobile || null,
        totalPrice: payload.totalPrice || 500,
        estEarnings: payload.estEarnings || Math.round((payload.totalPrice || 500) * 0.3) || 180,
        scheduledTime: payload.scheduledTime || 'ASAP',
        scheduledDateLabel: payload.scheduledDateLabel || 'Today',
        isInstant: Boolean(payload.isInstant),
      };

      setInstantAlertJob(newJobObj);
      setCountdown(60);
      playDispatchChime();
    };

    window.addEventListener('tech:incoming_job', handleIncomingEvent);
    return () => window.removeEventListener('tech:incoming_job', handleIncomingEvent);
  }, [declinedInstantIds, acceptedInstantIds]);

  // 2. Auto-detect any newly assigned or waiting available job from `jobs`
  React.useEffect(() => {
    const pendingJob = jobs.find(j => {
      const isUnresponded = !declinedInstantIds.includes(j.id) && !acceptedInstantIds.includes(j.id);
      if (!isUnresponded) return false;

      // Newly assigned job awaiting confirmation
      if (j.activeStep === 'assigned') return true;

      // Broadcast or instant request in territory
      if (j.isAvailableRequest) return true;

      return false;
    });

    if (pendingJob && !instantAlertJob) {
      setInstantAlertJob(pendingJob);
      setCountdown(60);
      playDispatchChime();
    }
  }, [jobs, declinedInstantIds, acceptedInstantIds, instantAlertJob]);

  /** Stop the alert re-opening for this job before the refetch lands. */
  const suppressInstantAlert = (jobId) => {
    if (jobId) setDeclinedInstantIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
    if (instantAlertJob && (instantAlertJob.id === jobId || instantAlertJob.serviceRequestId === jobId)) {
      setInstantAlertJob(null);
    }
  };

  /**
   * Reject for real. A local-only version of this shadowed the context's
   * dismissJob, so both Decline buttons quietly did nothing server-side: the
   * request stayed assigned to the technician who turned it down.
   */
  const rejectJob = async (jobId) => {
    suppressInstantAlert(jobId);
    const res = await dismissJob(jobId);
    setDutyMessage(
      !res?.ok
        ? res?.error || 'Could not reject that job.'
        : res.reassignedTo
          ? `Rejected — passed to ${res.reassignedTo}.`
          : 'Rejected — back in the queue for another technician.',
    );
    return res;
  };

  const declineInstantJob = async () => {
    const job = instantAlertJob;
    setInstantAlertJob(null);
    if (job) await rejectJob(job.serviceRequestId || job.id);
  };

  // Countdown timer for the instant job alert. Running out is a rejection: an
  // ASAP customer cannot wait on a technician who never answered, so the job
  // goes back to the pool for somebody else. The timer used to just sit at
  // "0s" forever with the request still pinned to that technician.
  const autoRejectedRef = React.useRef(null);
  React.useEffect(() => {
    if (!instantAlertJob) return undefined;

    if (countdown <= 0) {
      // Guard against the effect re-running and rejecting the same job twice.
      if (autoRejectedRef.current !== (instantAlertJob.serviceRequestId || instantAlertJob.id)) {
        autoRejectedRef.current = instantAlertJob.serviceRequestId || instantAlertJob.id;
        const job = instantAlertJob;
        setInstantAlertJob(null);
        rejectJob(job.serviceRequestId || job.id).then((res) => {
          if (res?.ok) {
            setDutyMessage(
              res.reassignedTo
                ? `Offer expired — passed to ${res.reassignedTo}.`
                : 'Offer expired — back in the queue for another technician.',
            );
          }
        });
      }
      return undefined;
    }

    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [instantAlertJob, countdown]);

  // Was counting TechContext's local list, which never fetched — so this badge
  // sat at 0 no matter what the platform had actually sent.
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const isJobSpecActive = (job) => {
    const cat = job.category.toLowerCase();
    if (cat.includes('ac')) return activeSpecs.includes('AC');
    if (cat.includes('refrigerator')) return activeSpecs.includes('Refrigerator');
    if (cat.includes('washing') || cat.includes('machine') || job.model.toLowerCase().includes('wm') || job.product.toLowerCase().includes('visit')) {
      return activeSpecs.includes('Washing Machine');
    }
    if (cat.includes('ro') || cat.includes('purifier') || cat.includes('water')) return activeSpecs.includes('RO');
    if (cat.includes('tv') || cat.includes('led') || cat.includes('television')) return activeSpecs.includes('TV');
    if (cat.includes('chimney')) return activeSpecs.includes('Chimney');
    return true;
  };

  // Offers only. This counted the whole list — accepted work included — so the
  // "Available Jobs" tile read 25 while the technician actually had 5 open
  // offers, and it disagreed with the "Active Jobs" tile sitting next to it.
  const availableJobsCount = jobs.filter((j) => j.isAvailableRequest && isJobSpecActive(j)).length;

  // Sony Logo Component
  const SonyLogo = () => (
    <span className="font-extrabold text-slate-800 text-xs tracking-wider select-none">SONY</span>
  );

  // Kent Logo Component
  const KentLogo = () => (
    <span className="font-bold text-sky-600 text-xs italic tracking-wider select-none">KENT</span>
  );

  // Faber Logo Component
  const FaberLogo = () => (
    <span className="font-semibold text-rose-600 text-xs tracking-widest select-none">FABER</span>
  );

  const renderBrandLogo = (brandName) => {
    const b = brandName.toLowerCase();
    if (b.includes('lg')) return <LgLogo />;
    if (b.includes('samsung')) return <SamsungLogo />;
    if (b.includes('voltas')) return <VoltasLogo />;
    if (b.includes('sony')) return <SonyLogo />;
    if (b.includes('kent')) return <KentLogo />;
    if (b.includes('faber')) return <FaberLogo />;
    return <span className="font-bold text-xs uppercase text-slate-650">{brandName}</span>;
  };

  // Filter jobs based on selected tabs for View 2 (Full Jobs list)
  const filteredJobs = jobs.filter(job => {
    if (!isJobSpecActive(job)) return false;
    if (declinedInstantIds.includes(job.id) || declinedInstantIds.includes(job.serviceRequestId)) return false;

    if (filterTab === 'Priority' && !job.isPriority) return false;
    if (filterTab === 'Recommended' && !job.isRecommended) return false;

    if (categoryTab === 'D2C' && !job.isD2C) return false;
    if (categoryTab === 'Partner' && !job.isPartner) return false;
    if (categoryTab === 'NCC EW' && !job.isNCCEW) return false;

    return true;
  });

  const nearbyJobs = jobs.filter(job => (
    job.isAvailableRequest &&
    isJobSpecActive(job) &&
    !declinedInstantIds.includes(job.id) &&
    !declinedInstantIds.includes(job.serviceRequestId) &&
    !acceptedInstantIds.includes(job.id) &&
    !acceptedInstantIds.includes(job.serviceRequestId)
  )).slice(0, 4);

  const priorityJobs = jobs.filter(job => (
    job.isAvailableRequest &&
    isJobSpecActive(job) &&
    !declinedInstantIds.includes(job.id) &&
    !declinedInstantIds.includes(job.serviceRequestId) &&
    !acceptedInstantIds.includes(job.id) &&
    !acceptedInstantIds.includes(job.serviceRequestId) &&
    (job.isPriority || job.priority === 'High' || job.priority === 'Critical')
  ));
  const priorityJobsCount = priorityJobs.length;

  const revisitJobs = jobs.filter(job => (
    !job.isAvailableRequest &&
    job.activeStep !== 'completed' &&
    job.status !== 'Completed' &&
    job.status !== 'Customer Confirmation' &&
    job.status !== 'Closed' &&
    (
      job.activeStep === 'spare_part_required' ||
      job.activeStep === 'spareapproval' ||
      job.activeStep === 'revisit_scheduled' ||
      job.activeStep === 'revisit_ontheway' ||
      job.activeStep === 'revisit_arrived' ||
      job.activeStep === 'revisit_complete' ||
      job.activeStep === 'revisit_billing' ||
      job.activeStep === 'revisit_payment' ||
      job.activeStep === 'revisit_otp' ||
      job.status === 'Spare Required' ||
      job.status === 'Spare Ordered' ||
      job.status === 'Spare Received' ||
      Boolean(job.isRevisit)
    )
  ));

  // LG Logo SVG Component
  const LgLogo = () => (
    <div className="flex items-center gap-1 flex-shrink-0 select-none">
      <svg viewBox="0 0 100 100" className="w-5 h-5">
        <circle cx="50" cy="50" r="48" fill="#C60C30" />
        <path d="M50,22 A28,28 0 0,0 50,78 A28,28 0 0,0 72,70 M62,50 H50 V34" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="40" cy="40" r="4" fill="white" />
      </svg>
      <span className="font-bold text-slate-800 text-xs tracking-tighter">LG</span>
    </div>
  );

  // Voltas Logo Component
  const VoltasLogo = () => (
    <span className="font-black text-[#0D47A1] italic text-xs tracking-wide select-none">VOLTAS</span>
  );

  // Samsung Logo SVG Component
  const SamsungLogo = () => (
    <svg viewBox="0 0 120 40" className="w-14 h-4 select-none">
      <ellipse cx="60" cy="20" rx="55" ry="17" fill="#0A2C74" />
      <text x="60" y="25" fill="white" fontFamily="Helvetica, Arial, sans-serif" fontWeight="900" fontSize="10" textAnchor="middle" letterSpacing="0.8">SAMSUNG</text>
    </svg>
  );

  return (
    <div className="tech-app-container min-h-screen bg-[#F5F8FC] flex flex-col pb-20 lg:pb-8 relative font-sans">

      {/* Top Banner / Header Section */}
      {showAllJobs ? (
        /* White Header for Jobs List Screen (Screen 2) — hidden on desktop */
        <div className="bg-white px-3.5 py-4 flex justify-between items-center z-10 border-b border-slate-200 shadow-xs lg:hidden">
          <button 
            onClick={() => setShowAllJobs(false)}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-[#052355] cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
          
          <h1 className="text-base font-bold text-[#052355]">All Jobs</h1>
          
          <div className="relative">
            <button 
              onClick={() => navigate('/technician/notifications')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-[#052355] relative cursor-pointer"
            >
              <Bell className="h-5 w-5 stroke-[2]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E53935] rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Top Navy Blue Banner - Wraps both Header and Greeting Card — hidden on desktop */
        <div className="bg-[#052355] text-white pt-4 pb-6 px-4 rounded-b-[2rem] flex flex-col gap-4 shadow-lg lg:hidden">
          {/* Header Bar */}
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              {/* Custom NCC shield logo */}
              <div className="w-7 h-7 rounded-md bg-[#FFD400] flex items-center justify-center shadow-md">
                <span className="text-[#052355] font-black text-sm">NCC</span>
              </div>
              <span className="font-bold tracking-wider text-sm flex items-center gap-1">
                NCC <span className="text-[#FFD400]">PARTNER</span>
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification icon */}
              <button 
                onClick={() => navigate('/technician/notifications')}
                className="p-2 hover:bg-white/10 rounded-full transition-all relative"
              >
                <Bell className="h-5.5 w-5.5 text-white" />
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center border border-[#052355] text-white">
                  5
                </span>
              </button>

              {/* User Avatar with Green dot status indicator */}
              <div 
                onClick={() => navigate('/technician/profile')}
                className="relative w-8.5 h-8.5 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer hover:border-white/50 transition-all shadow-md"
              >
                <img 
                  src={techAvatar} 
                  alt="Alex Rodriguez Avatar" 
                  className="w-full h-full object-cover" 
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#052355] rounded-full"></span>
              </div>
            </div>
          </div>

          {/* Greeting & Partner Score Layout */}
          <div className="flex justify-between items-start gap-3 mt-1">
            {/* Greeting Column */}
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                Good Morning, {user?.name?.split(' ')[0] || 'Technician'} 👋
              </h2>
              <p className="text-slate-300 text-[10px] mt-0.5 font-medium">Proud to be a part of NCC Service Network</p>

              {/* Duty toggle. Jobs are only auto-assigned to technicians who are
                  online, so this is the switch that puts you in the running. */}
              <button
                onClick={handleToggleDuty}
                disabled={availabilityBusy || !availabilityKnown}
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-60 ${
                  isOnline ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-slate-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-slate-400'}`}
                />
                {!availabilityKnown
                  ? 'Checking status…'
                  : availabilityBusy
                    ? 'Updating…'
                    : isOnline
                      ? 'Online • Accepting jobs'
                      : 'Offline • Tap to go online'}
              </button>

              {dutyMessage && (
                <p className="text-[9.5px] text-slate-300 mt-1 max-w-[190px] leading-snug">{dutyMessage}</p>
              )}
            </div>

            {/* Partner Score Column */}
            <button 
              onClick={() => navigate('/technician/partner-level')}
              className="text-right flex flex-col items-end cursor-pointer group focus:outline-none border-0 bg-transparent p-0"
            >
              <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-[#FFD400] transition-colors">PARTNER SCORE</span>
              
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* 5 Yellow Stars */}
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-[#FFD400] text-[#FFD400] group-hover:scale-110 transition-transform" />
                  ))}
                </div>
                <span className="text-xl font-bold text-white leading-none group-hover:text-[#FFD400] transition-colors">4.9</span>
              </div>

              {/* Elite Partner Tag */}
              <span className="inline-flex items-center gap-1 bg-[#FFD400] text-[#052355] text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-md mt-1.5 shadow-sm group-hover:bg-yellow-400 transition-colors">
                👑 ELITE PARTNER
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container below the Navy Blue Banner */}
      <div className="flex-1 px-3.5 py-4 md:px-6 md:py-6 xl:px-8 flex flex-col gap-5 md:gap-6 max-w-screen-xl mx-auto w-full">

        {/* VIEW 1: HOME DASHBOARD */}
        {!showAllJobs && (
          <>
            {/* Redesigned Combined Stats Card (2x2 Grid — 4-col on desktop) */}
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4.5 md:p-5 grid grid-cols-2 md:grid-cols-4 -mt-8 md:mt-0 relative z-10">
              {/* Card 1: Available Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[76px] pb-3 pr-2 border-r border-b border-slate-100 md:pb-0 md:px-2 md:border-b-0">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-6.5 h-6.5 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-[#1565C0]" />
                  </div>
                  <span className="text-[14px] font-black text-[#052355]">{jobsLoading ? '—' : availableJobsCount}</span>
                </div>
                <span className="text-[9.5px] font-bold text-slate-500 leading-tight mt-1">Available Jobs</span>
                <button 
                  onClick={() => { setShowAllJobs(true); setFilterTab('All'); }}
                  className="text-[7.5px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 2: Active Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[76px] pb-3 pl-2 border-b border-slate-100 md:pb-0 md:px-2 md:border-b-0 md:border-r">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-6.5 h-6.5 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-3.5 h-3.5 text-[#2E7D32]" />
                  </div>
                  <span className="text-[14px] font-black text-[#2E7D32]">{jobsLoading ? '—' : jobs.filter(j => !j.isAvailableRequest && j.activeStep !== 'completed' && j.status !== 'Completed' && j.status !== 'Customer Confirmation' && j.status !== 'Closed').length}</span>
                </div>
                <span className="text-[9.5px] font-bold text-slate-500 leading-tight mt-1">Active Jobs</span>
                <button 
                  onClick={() => navigate('/technician/active-job')}
                  className="text-[7.5px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 3: Revisit Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[76px] pt-3 pr-2 border-r border-slate-100 md:pt-0 md:px-2">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-6.5 h-6.5 rounded-full bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
                    <RotateCw className="w-3.5 h-3.5 text-[#E65100]" />
                  </div>
                  <span className="text-[14px] font-black text-[#E65100]">{revisitJobs.length}</span>
                </div>
                <span className="text-[9.5px] font-bold text-slate-500 leading-tight mt-1">Revisit Jobs</span>
                <button 
                  onClick={() => { setShowAllJobs(true); setFilterTab('All'); }}
                  className="text-[7.5px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 4: Completed Today */}
              <div className="flex flex-col items-center text-center justify-between min-h-[76px] pt-3 pl-2 md:pt-0 md:px-2">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-6.5 h-6.5 rounded-full bg-[#F3E5F5] flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-[#6A1B9A]" />
                  </div>
                  <span className="text-[14px] font-black text-[#6A1B9A]">{earningsTally.completedToday || 0}</span>
                </div>
                <span className="text-[9.5px] font-bold text-slate-500 leading-tight mt-1">Completed Today</span>
                <button 
                  onClick={() => navigate('/technician/earnings')}
                  className="text-[7.5px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>
            </div>

            {/* Revisit Schedule Section */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-[#E65100]" />
                  <h3 className="text-sm font-bold text-[#052355]">Revisit Schedule</h3>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Pending jobs requiring spare parts or follow-up visit</p>

              {revisitJobs.length > 0 ? (
                <div className="flex flex-col gap-2.5 mt-1.5 md:grid md:grid-cols-2 xl:grid-cols-3">
                  {revisitJobs.map((job) => {
                    const isRevisitScheduled = job.activeStep === 'revisit_scheduled' || job.revisitScheduledDate;
                    const isRevisitOnTheWay = job.activeStep === 'revisit_ontheway';
                    const isRevisitArrived = job.activeStep === 'revisit_arrived';

                    let statusBadgeLabel = 'Spare Part Pending';
                    let statusBadgeStyle = 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]';

                    if (isRevisitScheduled) {
                      statusBadgeLabel = 'Spare Received — Revisit Scheduled';
                      statusBadgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (isRevisitOnTheWay) {
                      statusBadgeLabel = 'On The Way to Revisit';
                      statusBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (isRevisitArrived) {
                      statusBadgeLabel = 'At Customer Location';
                      statusBadgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                    }

                    return (
                      <div 
                        key={job.id}
                        onClick={() => {
                          selectJobForDetails(job.id);
                          navigate('/technician/active-job');
                        }}
                        className="bg-[#FFFDF9] border border-[#FFE0B2] rounded-2xl p-3.5 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] flex items-center justify-center text-[#E65100] flex-shrink-0">
                            <RotateCw className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#052355]">{job.product || job.category}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              Customer: <span className="text-slate-800 font-bold">{job.customerName}</span>
                            </p>
                            {job.revisitScheduledDate && (
                              <p className="text-[9.5px] font-bold text-slate-600 mt-0.5">
                                📅 {new Date(job.revisitScheduledDate).toLocaleDateString()} {job.revisitTimeSlot ? `• ${job.revisitTimeSlot}` : ''}
                              </p>
                            )}
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-full mt-1 ${statusBadgeStyle}`}>
                              {statusBadgeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#052355] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors">
                            {isRevisitScheduled ? 'Start Revisit' : 'Open Job'}
                            <ChevronRight className="w-3.5 h-3.5 text-[#052355]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#FFFDF9] border border-[#FFE0B2] rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center gap-1.5 mt-1.5">
                  <RotateCw className="w-6 h-6 text-amber-400" />
                  <p className="text-xs font-bold text-slate-700">No Revisit Jobs Scheduled</p>
                  <p className="text-[10px] text-slate-400">Revisit requests assigned to you will appear here.</p>
                </div>
              )}
            </div>

            {/* High Priority Jobs Banner - Dynamic */}
            {priorityJobsCount > 0 && (
              <div 
                onClick={() => { setShowAllJobs(true); setFilterTab('Priority'); }}
                className="bg-[#FFF1F2] border border-[#FFD3D6] rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-all mt-2.5"
              >
                <div className="flex items-center gap-3">
                  {/* Premium Alarm Siren SVG */}
                  <div className="flex-shrink-0 animate-pulse">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#E53935]" fill="currentColor">
                      <path d="M4 19h16v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1z" fill="#90A4AE" />
                      <path d="M5 16h14v3H5v-3z" fill="#455A64" />
                      <path d="M12 5C8.13 5 5 8.13 5 12v4h14v-4c0-3.87-3.13-7-12-7z" fill="#E53935" opacity="0.95" />
                      <path d="M12 7c-2.76 0-5 2.24-5 5v4h10v-4c0-2.76-2.24-5-5-5z" fill="#FF8A80" opacity="0.8" />
                      <path d="M2 10a8.97 8.97 0 0 1 2.2-5.8l1.4 1.4A6.97 6.97 0 0 0 4 10H2zm20 0h-2c0-1.9-.77-3.64-2-4.9l1.4-1.4A8.97 8.97 0 0 1 22 10z" fill="#E53935" />
                      <path d="M12 1v2M5.2 3.8l1.4 1.4m10.8-1.4-1.4 1.4" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-[#D32F2F]">High Priority Jobs</h4>
                    <p className="text-[10px] text-slate-650 mt-0.5">Time-sensitive jobs that need your attention</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center">
                    {priorityJobsCount}
                  </span>
                  <span className="text-[10px] font-bold text-[#D32F2F] flex items-center gap-0.5 whitespace-nowrap">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            )}

            {/* Nearby Jobs Section */}
            <div className="flex flex-col gap-2 mt-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#052355]">Nearby Jobs</h3>
                <button 
                  onClick={() => setShowAllJobs(true)}
                  className="text-[10.5px] font-bold text-[#0D47A1] hover:underline flex items-center gap-0.5"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* List of Nearby Jobs */}
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-3">
                {nearbyJobs.length > 0 ? (
                  nearbyJobs.map((job) => {
                    const type = job.type.toLowerCase();
                    
                    // Styles helpers
                    let borderColor = 'border-l-[#4CAF50]';
                    let tagBg = 'bg-[#4CAF50]';
                    let tagText = 'PAID SERVICE';
                    let iconContainerClass = 'bg-[#E8F5E9] text-[#2E7D32]';
                    let JobIcon = ClipboardList;

                    if (type.includes('warranty') && !type.includes('extended')) {
                      borderColor = 'border-l-[#1E6BDB]';
                      tagBg = 'bg-[#1E6BDB]';
                      tagText = 'WARRANTY';
                      iconContainerClass = 'bg-[#E3F2FD] text-[#1565C0]';
                      JobIcon = Shield;
                    } else if (type.includes('extended')) {
                      borderColor = 'border-l-[#7C4DFF]';
                      tagBg = 'bg-[#7C4DFF]';
                      tagText = 'CLAIM JOB';
                      iconContainerClass = 'bg-[#F3E5F5] text-[#6A1B9A]';
                      JobIcon = Shield;
                    } else if (type.includes('amc')) {
                      borderColor = 'border-l-[#FFA000]';
                      tagBg = 'bg-[#FFA000]';
                      tagText = 'AMC VISIT';
                      iconContainerClass = 'bg-[#FFF3E0] text-[#E65100]';
                      JobIcon = Calendar;
                    }

                    return (
                      <div 
                        key={job.id}
                        onClick={() => {
                          selectJobForDetails(job.id);
                          navigate('/technician/active-job');
                        }}
                        className={`bg-white rounded-[20px] p-3.5 cursor-pointer hover:shadow-md transition-all shadow-[0_3px_15px_rgba(0,0,0,0.03)] flex flex-col gap-2.5 border border-slate-200 border-l-[4px] ${borderColor}`}
                      >
                        {/* Top Row: Service Category & Brand Logo */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconContainerClass}`}>
                              <JobIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">{job.type}</span>
                          </div>
                          <div className="flex items-center">
                            {renderBrandLogo(job.brand)}
                          </div>
                        </div>

                        {/* Bottom Row: Details & Pricing */}
                        <div className="flex justify-between items-end">
                          {/* Left: Product & Customer Info */}
                          <div className="min-w-0 flex-1 pr-3">
                            <h4 className="text-[12.5px] font-black text-[#052355] leading-snug">{job.product}</h4>
                            <p className="text-[9.5px] text-slate-500 mt-1 font-semibold">
                              Customer: <span className="text-[#052355] font-black">{job.customerName}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.5px] text-slate-400 mt-1.5 font-bold">
                              {/* Both used to be fixed: "Today, 02:00 PM" and a
                                  flat distance for every job. */}
                              {(job.scheduledDateLabel || job.scheduledTime) && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-300" />
                                  {[job.scheduledDateLabel, job.scheduledTime].filter(Boolean).join(', ')}
                                </span>
                              )}
                              {job.distance != null && (
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-300" /> {job.distance} km away</span>
                              )}
                            </div>
                          </div>

                          {/* Right: Pricing & Status tag */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right flex flex-col items-end min-w-[70px]">
                              <p className="text-[13px] font-black text-[#052355]">{job.price > 0 ? `₹${job.price}` : '₹Free'}</p>
                              <p className="text-[8.5px] text-[#0D47A1] font-black mt-0.5">
                                {job.estEarnings > 0 ? `Est. Earn: ₹${job.estEarnings}` : 'Warranty Job'}
                              </p>
                              <span className={`inline-block text-[7.5px] font-black px-2 py-1 rounded-lg text-white uppercase tracking-wider mt-1.5 shadow-2xs ${tagBg}`}>
                                {tagText}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="md:col-span-2 xl:col-span-3 text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    No allocated jobs for active specifications.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions (Academy, Support, Announcements) */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 mt-2.5">
              
              {/* NCC Academy Link */}
              <div 
                onClick={() => navigate('/technician/academy')}
                className="bg-white rounded-2xl p-2 md:p-3.5 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2.5 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 md:w-9 md:h-9 rounded-lg bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#1565C0]" />
                  </div>
                  <h5 className="text-[9px] md:text-xs font-semibold text-[#052355] truncate">NCC Academy</h5>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 flex-shrink-0 ml-1" />
              </div>

              {/* Need Help? Link */}
              <div 
                onClick={() => navigate('/technician/technical-support')}
                className="bg-white rounded-2xl p-2 md:p-3.5 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2.5 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 md:w-9 md:h-9 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#2E7D32]" />
                  </div>
                  <h5 className="text-[9px] md:text-xs font-semibold text-[#052355] truncate">Need Help?</h5>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 flex-shrink-0 ml-1" />
              </div>

              {/* Announcements Link */}
              <div 
                onClick={() => navigate('/technician/announcements')}
                className="bg-white rounded-2xl p-2 md:p-3.5 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 md:gap-2.5 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 md:w-9 md:h-9 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#E65100]" />
                  </div>
                  <h5 className="text-[9px] md:text-xs font-semibold text-[#052355] truncate">Announcements</h5>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 flex-shrink-0 ml-1" />
              </div>
            </div>
          </>
        )}

        {/* VIEW 2: FULL JOBS LIST */}
        {showAllJobs && (
          <>
            {/* Filter Group 1: Priority/Recommended (Screen 2 Tab Filters) */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setFilterTab('All')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  filterTab === 'All'
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-[#F0F4FA] text-slate-650 hover:bg-[#E1EBF5] hover:text-slate-755'
                }`}
              >
                All Jobs ({filteredJobs.length})
              </button>
              <button
                onClick={() => setFilterTab('Priority')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  filterTab === 'Priority'
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-[#F0F4FA] text-slate-650 hover:bg-[#E1EBF5] hover:text-slate-755'
                }`}
              >
                Priority ({filteredJobs.filter(j => j.isPriority).length})
              </button>
              <button
                onClick={() => setFilterTab('Recommended')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  filterTab === 'Recommended'
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-[#F0F4FA] text-slate-650 hover:bg-[#E1EBF5] hover:text-slate-755'
                }`}
              >
                Recommended ({filteredJobs.filter(j => j.isRecommended).length})
              </button>
            </div>

            {/* Filter Group 2: Categories scroll (All, D2C, Partner, NCC EW, More) */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {['All', 'D2C', 'Partner', 'NCC EW', 'More'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryTab(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryTab === cat
                      ? 'bg-[#0D47A1] border-[#0D47A1] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Jobs List (WITH Accept/Decline buttons) */}
            <div className="flex flex-col gap-3.5 mt-1 lg:grid lg:grid-cols-2">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const borderLeftColor = job.type.includes('Paid') ? 'border-l-[#4CAF50]' : job.type.includes('Warranty') ? 'border-l-[#1E6BDB]' : 'border-l-[#FFA000]';
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => {
                        if (job.isAvailableRequest) {
                          setExpandedJobId(prev => prev === job.id ? null : job.id);
                        } else {
                          selectJobForDetails(job.id);
                          navigate('/technician/active-job');
                        }
                      }}
                      className={`bg-white rounded-3xl p-4 transition-all duration-300 flex flex-col gap-3 cursor-pointer border-l-[6px] ${borderLeftColor} ${
                        isExpanded 
                          ? `border-2 border-[#D2E3FC] shadow-md` 
                          : `border border-slate-300 shadow-sm hover:border-slate-400`
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        {/* Left Column */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              job.type.includes('Paid') 
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : job.type.includes('Warranty')
                                  ? 'bg-[#E3F2FD] text-[#1565C0]'
                                  : 'bg-[#FFF3E0] text-[#E65100]'
                            }`}>
                              {job.type}
                            </span>
                            {!job.isAvailableRequest && (
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                ACTIVE
                              </span>
                            )}
                          </div>

                          {/* Subtitle / Product name */}
                          <h4 className="text-sm font-bold text-[#052355] mt-2.5 truncate leading-snug">
                            {job.product}
                          </h4>
                          
                          {/* Location Pin Row */}
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-3">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {job.distance != null && (
                              <>
                                <span>{job.distance} km</span>
                                <span className="text-slate-300">•</span>
                              </>
                            )}
                            <span>{job.customerName}</span>
                          </div>
                        </div>
                        
                        {/* Right Content: Price, Est Earn, Badge */}
                        <div className="text-right flex flex-col items-end justify-between min-h-[75px] ml-2 flex-shrink-0">
                          <div>
                            <p className="text-base font-bold text-[#052355] leading-none">
                              ₹{job.price > 0 ? job.price.toLocaleString('en-IN') : '0'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1">Est. Earn ₹{job.estEarnings}</p>
                          </div>
                          
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            job.type.includes('Paid') 
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : job.type.includes('Warranty')
                                ? 'bg-[#E3F2FD] text-[#1565C0]'
                                : 'bg-[#FFF3E0] text-[#E65100]'
                          }`}>
                            {job.type.includes('Paid') ? 'PAID SERVICE' : job.type.includes('Claim') ? 'CLAIM JOB' : 'AMC VISIT'}
                          </span>
                        </div>
                      </div>

                      {/* For Available Request: show Accept / Decline if expanded. For Active Job: show Open Job Sheet */}
                      {job.isAvailableRequest ? (
                        isExpanded && (
                          <div className="flex gap-3.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={async () => {
                                setAcceptedInstantIds((prev) => [...prev, job.id, job.serviceRequestId].filter(Boolean));
                                await acceptJob(job.id);
                                navigate('/technician/active-job');
                              }}
                              className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => rejectJob(job.id)}
                              title="Reject this request — it goes back to the queue for another technician"
                              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-300 cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex gap-3.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              selectJobForDetails(job.id);
                              navigate('/technician/active-job');
                            }}
                            className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                          >
                            Open Job Sheet
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-4 text-slate-500">
                  <Briefcase className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium">No available jobs found.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>



      {/* Bottom Navigation */}
      <TechBottomNav activeTab="jobs" />

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#052355] mb-1">Log Out</h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  // Clearing the session is what actually logs the user out;
                  // navigating alone left the tokens in place, so the route
                  // guard saw an authenticated user and sent them straight back.
                  await logout();
                  navigate('/technician/login', { replace: true });
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Redesigned Real-Time Partner Service Dispatch Modal */}
      {instantAlertJob && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[120] animate-fade-in">
          <div className="bg-white border border-blue-100 rounded-[32px] max-w-md w-full flex flex-col shadow-2xl relative overflow-hidden transform transition-all animate-scale-up">
            {/* Signature Royal Blue Header */}
            <div className="bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#0A387E] p-5 text-white flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner relative">
                  <Zap className="w-5 h-5 text-[#FFD600] animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-blue-200 uppercase block">LIVE DISPATCH</span>
                  <h3 className="text-sm font-black text-white tracking-wide">New Service Request</h3>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                <Clock className="w-3.5 h-3.5 text-[#FFD600]" />
                <span className="text-xs font-black text-white tabular-nums">{countdown}s</span>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-[#0D47A1] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1">
                    {instantAlertJob.category || 'Home Service'}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                    {instantAlertJob.product || `${instantAlertJob.category || 'Appliance'} Service`}
                  </h4>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-500">Est. Payout</span>
                  <span className="text-base font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-xl">
                    ₹{instantAlertJob.estEarnings || 250}
                  </span>
                </div>
              </div>

              {/* Territory & Location Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#0D47A1] font-bold">
                    <MapPin className="w-4 h-4 text-[#0D47A1] flex-shrink-0" />
                    <span>
                      {instantAlertJob.city ? `${instantAlertJob.city}` : ''}
                      {instantAlertJob.state ? `, ${instantAlertJob.state}` : 'Service Territory'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    {instantAlertJob.scheduledTime || 'ASAP'} ({instantAlertJob.scheduledDateLabel || 'Today'})
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-200/50 pt-2">
                  {instantAlertJob.address || 'Customer Location'}
                </p>
              </div>

              {/* Customer & Status Bar */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>Customer: <strong className="text-slate-900">{instantAlertJob.customerName || 'Verified Customer'}</strong></span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Assigned to You
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={declineInstantJob}
                  className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer text-center"
                >
                  Decline
                </button>
                <button
                  onClick={async () => {
                    const jobId = instantAlertJob.id || instantAlertJob.serviceRequestId;
                    setAcceptedInstantIds((prev) => [...prev, jobId]);
                    setInstantAlertJob(null);
                    await acceptJob(jobId);
                    navigate('/technician/active-job');
                  }}
                  className="flex-[2] py-3.5 px-4 bg-[#FFD600] hover:bg-yellow-400 active:scale-95 text-[#0D47A1] font-black text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-[#0D47A1]" />
                  <span>Accept & Start Job</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
