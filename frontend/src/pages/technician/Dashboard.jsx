import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Briefcase, ClipboardList, Calendar, Wrench, User, MapPin, ChevronRight, Menu,
  Clock, Shield, Star, GraduationCap, MessageSquare, Megaphone, Scan, CheckCircle, RotateCw, X, LogOut, Sparkles, CreditCard, ShieldCheck, Award, Settings, HelpCircle, ArrowLeft
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import techAvatar from '../../assets/tech_avatar.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    jobs, 
    earningsTally, 
    acceptJob, 
    selectJobForDetails,
    setActiveStep,
    notifications,
    activeSpecs,
    toggleSpec
  } = useTech();

  const [showAllJobs, setShowAllJobs] = useState(false);
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Priority', 'Recommended'
  const [categoryTab, setCategoryTab] = useState('All'); // 'All', 'D2C', 'Partner', 'NCC EW'
  const [expandedJobId, setExpandedJobId] = useState('8842'); // default to D2C Paid Service job ID
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

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

  const availableJobsCount = jobs.filter(isJobSpecActive).length;

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

    if (filterTab === 'Priority' && !job.isPriority) return false;
    if (filterTab === 'Recommended' && !job.isRecommended) return false;

    if (categoryTab === 'D2C' && !job.isD2C) return false;
    if (categoryTab === 'Partner' && !job.isPartner) return false;
    if (categoryTab === 'NCC EW' && !job.isNCCEW) return false;

    return true;
  });

  const nearbyJobs = jobs.filter(isJobSpecActive).slice(0, 4);

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
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col pb-[68px] max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-x-hidden">
      
      {/* Top Banner / Header Section */}
      {showAllJobs ? (
        /* White Header for Jobs List Screen (Screen 2) */
        <div className="bg-white px-3.5 py-4 flex justify-between items-center z-10 border-b border-slate-200">
          <button 
            onClick={() => setShowAllJobs(false)}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-[#052355]"
          >
            <Menu className="h-6 w-6 stroke-[2]" />
          </button>
          
          <h1 className="text-base font-normal text-[#052355]">Jobs</h1>
          
          <div className="relative">
            <button 
              onClick={() => navigate('/technician/notifications')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-[#052355] relative"
            >
              <Bell className="h-5 w-5 stroke-[2]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E53935] rounded-full border border-white"></span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Top Navy Blue Banner - Wraps both Header and Greeting Card */
        <div className="bg-[#052355] text-white pt-4 pb-6 px-4 rounded-b-[2rem] flex flex-col gap-4 shadow-lg">
          {/* Header Bar */}
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 ml-1">
                {/* Custom NCC shield logo */}
                <div className="w-7 h-7 rounded-md bg-[#FFD400] flex items-center justify-center shadow-md">
                  <span className="text-[#052355] font-black text-sm">NCC</span>
                </div>
                <span className="font-bold tracking-wider text-sm flex items-center gap-1">
                  NCC <span className="text-[#FFD400]">PARTNER</span>
                </span>
              </div>
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
                Good Morning, Alex 👋
              </h2>
              <p className="text-slate-300 text-[10px] mt-0.5 font-medium">Proud to be a part of NCC Service Network</p>
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
      <div className="flex-1 px-3.5 py-4 flex flex-col gap-5">

        {/* VIEW 1: HOME DASHBOARD */}
        {!showAllJobs && (
          <>
            {/* Redesigned Combined Stats Card (Reduced Height, One Single Container Card) */}
            <div className="bg-white rounded-[22px] border border-slate-200 shadow-sm p-2 grid grid-cols-4 divide-x divide-slate-100 -mt-8 relative z-10">
              {/* Card 1: Available Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[72px] px-1">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-[#1565C0]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#052355]">{availableJobsCount}</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-500 leading-none mt-1">Available<br/>Jobs</span>
                <button 
                  onClick={() => { setShowAllJobs(true); setFilterTab('All'); }}
                  className="text-[7px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 2: Active Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[72px] px-1">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-3.5 h-3.5 text-[#2E7D32]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#2E7D32]">3</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-500 leading-none mt-1">Active<br/>Jobs</span>
                <button 
                  onClick={() => navigate('/technician/active-job')}
                  className="text-[7px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 3: Revisit Jobs */}
              <div className="flex flex-col items-center text-center justify-between min-h-[72px] px-1">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
                    <RotateCw className="w-3.5 h-3.5 text-[#E65100]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#E65100]">2</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-500 leading-none mt-1">Revisit<br/>Jobs</span>
                <button 
                  onClick={() => { setShowAllJobs(true); setFilterTab('All'); }}
                  className="text-[7px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-2 h-2" />
                </button>
              </div>

              {/* Card 4: Completed Today */}
              <div className="flex flex-col items-center text-center justify-between min-h-[72px] px-1">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#F3E5F5] flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-[#6A1B9A]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#6A1B9A]">5</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-500 leading-none mt-1">Completed<br/>Today</span>
                <button 
                  onClick={() => navigate('/technician/earnings')}
                  className="text-[7px] font-bold text-[#1565C0] hover:underline mt-1 flex items-center gap-0.5"
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
                <button 
                  onClick={() => { setShowAllJobs(true); setFilterTab('All'); }}
                  className="text-[10.5px] font-bold text-[#E65100] hover:underline"
                >
                  View All
                </button>
              </div>
              <p className="text-[10px] text-slate-500">Pending jobs requiring spare parts or follow-up visit</p>

              {/* Redesigned Revisit Card */}
              <div className="bg-[#FFFDF9] border border-[#FFE0B2] rounded-2xl p-3 shadow-sm flex flex-col gap-2.5 mt-1.5 hover:shadow-md transition-shadow">
                {/* Row 1: Brand details and Action button */}
                <div className="flex justify-between items-start gap-2.5">
                  {/* Left Block: Brand Box & Details */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-9 h-9 bg-[#FF9800] rounded-xl flex items-center justify-center shadow-sm">
                        <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="5" y="3" width="14" height="18" rx="2" />
                          <circle cx="12" cy="13" r="4" />
                          <circle cx="12" cy="13" r="1.5" />
                          <line x1="8" y1="6" x2="8.01" y2="6" strokeWidth="3.5" strokeLinecap="round" />
                          <line x1="12" y1="6" x2="12.01" y2="6" strokeWidth="3.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-[#0A2C74] font-extrabold text-[7px] tracking-widest mt-1">SAMSUNG</span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-[11px] font-semibold text-[#052355] truncate">Washing Machine</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-normal whitespace-nowrap">Customer: <span className="text-[#052355] font-semibold">Amit Singh</span></p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-normal whitespace-nowrap">Job ID: <span className="text-[#052355] font-semibold">NCC12345</span></p>
                      <div className="flex items-center gap-1 text-[8.5px] text-slate-500 mt-1 font-normal whitespace-nowrap">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>2.6 km away</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Block: Actions */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button 
                      onClick={() => { 
                        selectJobForDetails('8842'); 
                        setActiveStep('revisit_complete'); 
                        navigate('/technician/active-job'); 
                      }}
                      className="border border-[#FF9800] text-[#FF9800] hover:bg-[#FF9800]/5 text-[8px] font-bold py-1 px-2 rounded tracking-wide transition-all shadow-xs whitespace-nowrap"
                    >
                      START REVISIT
                    </button>
                    <span className="bg-[#FFF3E0] text-[#E65100] text-[8px] font-bold py-0.5 px-2 rounded-full text-center whitespace-nowrap">
                      Visit #2
                    </span>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="h-[1px] bg-slate-100 my-2"></div>

                {/* Row 2: Columns (Reason, Part Status, Revisit Date) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider block">Reason</span>
                    <span className="text-[9px] font-semibold text-slate-700 block mt-0.5 leading-snug">Awaiting Drain Pump</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider block">Part Status</span>
                    <span className="text-[9px] font-semibold text-slate-700 flex items-center gap-0.5 mt-0.5 leading-snug flex-wrap">
                      Spare Part Recd.
                      <svg className="w-3 h-3 text-green-600 fill-green-150 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider block">Revisit Date</span>
                    <span className="text-[9px] font-semibold text-slate-700 block mt-0.5 leading-snug">Tomorrow 11:00 AM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* High Priority Jobs Banner */}
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
                  2
                </span>
                <span className="text-[10px] font-bold text-[#D32F2F] flex items-center gap-0.5 whitespace-nowrap">
                  View All
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>

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
              <div className="flex flex-col gap-2.5">
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
                        onClick={() => { selectJobForDetails(job.id); navigate('/technician/active-job'); }}
                        className={`bg-white rounded-2xl p-2.5 cursor-pointer hover:shadow-md transition-all shadow-xs flex justify-between items-center border border-slate-200 border-l-[5px] ${borderColor}`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center flex-shrink-0 ${iconContainerClass}`}>
                            <JobIcon className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-[7.5px] font-bold block tracking-wider uppercase text-slate-400">{job.type}</span>
                            <h4 className="text-[11.5px] font-semibold text-[#052355] mt-0.5 leading-tight truncate">{job.product}</h4>
                            <p className="text-[9px] text-slate-500 mt-0.5 font-normal">Customer: <span className="text-[#052355] font-semibold">{job.customerName}</span></p>
                            <div className="flex items-center gap-2 text-[8.5px] text-slate-500 mt-1 font-normal">
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-slate-400" /> Today, 02:00 PM</span>
                              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-slate-400" /> {job.distance} km away</span>
                            </div>
                          </div>
                        </div>

                        {/* Brand and Pricing details */}
                        <div className="flex items-center gap-1.5 ml-1.5 flex-shrink-0">
                          {renderBrandLogo(job.brand)}
                          <div className="h-5 w-[1px] bg-slate-200"></div>
                          <div className="text-right flex flex-col items-end min-w-[55px]">
                            <p className="text-[11.5px] font-bold text-[#052355]">{job.price > 0 ? `₹${job.price}` : '₹Free'}</p>
                            <p className="text-[8px] text-slate-400 font-semibold mt-0.5">
                              {job.estEarnings > 0 ? `Est. Earn: ₹${job.estEarnings}` : tagText}
                            </p>
                            <span className={`inline-block text-[7px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wider mt-1 shadow-xs ${tagBg}`}>
                              {tagText}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    No allocated jobs for active specifications.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions (Academy, Support, Announcements) */}
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              
              {/* NCC Academy Link */}
              <div 
                onClick={() => navigate('/technician/academy')}
                className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-3.5 h-3.5 text-[#1565C0]" />
                  </div>
                  <h5 className="text-[9px] font-semibold text-[#052355] truncate">NCC Academy</h5>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 flex-shrink-0 ml-1" />
              </div>

              {/* Need Help? Link */}
              <div 
                onClick={() => navigate('/technician/technical-support')}
                className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-[#2E7D32]" />
                  </div>
                  <h5 className="text-[9px] font-semibold text-[#052355] truncate">Need Help?</h5>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400 flex-shrink-0 ml-1" />
              </div>

              {/* Announcements Link */}
              <div 
                onClick={() => navigate('/technician/announcements')}
                className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <div className="w-6.5 h-6.5 rounded-lg bg-[#FFF3E0] flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-3.5 h-3.5 text-[#E65100]" />
                  </div>
                  <h5 className="text-[9px] font-semibold text-[#052355] truncate">Announcements</h5>
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
            <div className="flex flex-col gap-3.5 mt-1">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const borderLeftColor = job.type.includes('Paid') ? 'border-l-[#4CAF50]' : job.type.includes('Warranty') ? 'border-l-[#1E6BDB]' : 'border-l-[#FFA000]';
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => {
                        selectJobForDetails(job.id);
                        navigate('/technician/active-job');
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
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            job.type.includes('Paid') 
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : job.type.includes('Warranty')
                                ? 'bg-[#E3F2FD] text-[#1565C0]'
                                : 'bg-[#FFF3E0] text-[#E65100]'
                          }`}>
                            {job.type}
                          </span>

                          {/* Subtitle / Product name */}
                          <h4 className="text-sm font-bold text-[#052355] mt-2.5 truncate leading-snug">
                            {job.product}
                          </h4>
                          
                          {/* Location Pin Row */}
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-3">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{job.distance} km</span>
                            <span className="text-slate-300">•</span>
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

                      {/* Accept / Decline buttons only for Expanded Job */}
                      {isExpanded && (
                        <div className="flex gap-3.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => acceptJob(job.id)}
                            className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => alert(`Job #${job.id} declined.`)}
                            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-300"
                          >
                            Decline
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

      {/* Sidebar Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 transition-all flex justify-start"
          onClick={() => setIsSidebarOpen(false)}
        >
          {/* Drawer Container */}
          <div 
            className="bg-white w-72 h-full shadow-2xl flex flex-col z-50 text-left animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Dark Blue Profile Section */}
            <div className="bg-[#052355] text-white p-5 flex flex-col gap-4 relative">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 mt-2 shadow-md">
                <img 
                  src={techAvatar} 
                  alt="Alex Rodriguez Avatar Side" 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[11px] text-slate-300 font-medium mt-1">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-0.5">
              {/* Dashboard / Jobs */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/dashboard'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">Dashboard (Jobs)</span>
              </button>

              {/* My Schedule */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/schedule'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Calendar className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">My Schedule</span>
              </button>

              {/* Part Requests */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/raise-part-request?tab=claims'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ClipboardList className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">Part Requests</span>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/inventory'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Wrench className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">My Inventory</span>
              </button>

              {/* Payout Settings */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/payout-settings'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">Payout Settings</span>
              </button>

              {/* KYC Verification */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/verification'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ShieldCheck className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">KYC Verification</span>
              </button>

              {/* Help & Support */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/support'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 text-slate-650 hover:text-[#0D47A1] transition-colors text-left"
              >
                <HelpCircle className="h-5 w-5 text-slate-500" />
                <span className="text-xs font-semibold">Help & Support</span>
              </button>

              {/* Divider */}
              <div className="h-[1px] bg-slate-100 my-3.5 mx-5"></div>

              {/* Logout */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/login'); }}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-red-50/20 text-red-600 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-500" />
                <span className="text-xs font-semibold">Logout</span>
              </button>
            </div>

            {/* Version Info */}
            <div className="p-5 border-t border-slate-150 text-left">
              <span className="text-[10px] font-semibold text-slate-500">Partner App v2.4.1</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-25 shadow-lg">
        <button 
          onClick={() => { setShowAllJobs(false); navigate('/technician/dashboard'); }}
          className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all"
        >
          <Briefcase className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-bold tracking-wide">Jobs</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/raise-part-request?tab=claims')}
          className="flex flex-col items-center gap-1 text-slate-550 hover:text-slate-700 transition-all"
        >
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-semibold tracking-wide">Requests</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/inventory')}
          className="flex flex-col items-center gap-1 text-slate-550 hover:text-slate-700 transition-all"
        >
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-semibold tracking-wide">Inventory</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center gap-1 text-slate-550 hover:text-slate-700 transition-all"
        >
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-semibold tracking-wide">Schedule</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center gap-1 text-slate-550 hover:text-slate-700 transition-all"
        >
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-semibold tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
