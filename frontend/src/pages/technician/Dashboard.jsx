import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, ClipboardList, Calendar, Wrench, User, MapPin, ChevronRight, Menu } from 'lucide-react';
import { useTech } from '../../context/TechContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    jobs, 
    earningsTally, 
    acceptJob, 
    selectJobForDetails,
    notifications
  } = useTech();

  const [showAllJobs, setShowAllJobs] = useState(false);
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Priority', 'Recommended'
  const [categoryTab, setCategoryTab] = useState('All'); // 'All', 'D2C', 'Partner', 'NCC EW'
  const [expandedJobId, setExpandedJobId] = useState('8842'); // default to D2C Paid Service job ID

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Filter jobs based on selected tabs
  const filteredJobs = jobs.filter(job => {
    if (filterTab === 'Priority' && !job.isPriority) return false;
    if (filterTab === 'Recommended' && !job.isRecommended) return false;

    if (categoryTab === 'D2C' && !job.isD2C) return false;
    if (categoryTab === 'Partner' && !job.isPartner) return false;
    if (categoryTab === 'NCC EW' && !job.isNCCEW) return false;

    return true;
  });

  // Color mappings matching Image 2
  const getCardStyle = (type) => {
    switch (type) {
      case 'D2C Paid Service':
        return {
          borderLeft: 'border-l-[5px] border-[#FF5B26]',
          titleColor: 'text-[#FF5B26]',
          badgeBg: 'bg-[#4CAF50] text-white',
          badgeText: 'PAID SERVICE',
          iconBg: 'bg-[#FF5B26]',
          icon: <ClipboardList className="h-5 w-5 text-white" />
        };
      case 'LG Partner Warranty':
      case 'Samsung Partner Warranty':
        return {
          borderLeft: 'border-l-[5px] border-[#1E6BDB]',
          titleColor: 'text-[#1E6BDB]',
          badgeBg: 'bg-[#1E6BDB] text-white',
          badgeText: 'FREE SERVICE',
          iconBg: 'bg-[#1E6BDB]',
          icon: <Briefcase className="h-5 w-5 text-white" />
        };
      case 'NCC Extended Warranty':
        return {
          borderLeft: 'border-l-[5px] border-[#7C4DFF]',
          titleColor: 'text-[#7C4DFF]',
          badgeBg: 'bg-[#FFA000] text-white',
          badgeText: 'PARTIALLY PAID',
          iconBg: 'bg-[#7C4DFF]',
          icon: <ClipboardList className="h-5 w-5 text-white" />
        };
      default:
        return {
          borderLeft: 'border-l-[5px] border-slate-400',
          titleColor: 'text-slate-700',
          badgeBg: 'bg-slate-500 text-white',
          badgeText: 'SERVICE',
          iconBg: 'bg-slate-500 text-white',
          icon: <Wrench className="h-5 w-5 text-white" />
        };
    }
  };

  const getCardSubtitle = (job) => {
    if (job.type === 'D2C Paid Service') {
      return job.warrantyStatus; // "Out of Warranty"
    }
    return job.product;
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      
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
        <div className="bg-[#052355] text-white pt-3 pb-3 px-3.5 rounded-b-[2rem] flex flex-col gap-2 shadow-md">
          {/* Header Bar */}
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <span className="text-[#FFD400] font-normal text-lg">N</span>
              </div>
              <span className="font-normal tracking-wider text-base">NCC <span className="text-[#FFD400]">PARTNER</span></span>
            </div>
            
            <button 
              onClick={() => navigate('/technician/notifications')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 relative"
            >
              <Bell className="h-4.5 w-4.5 text-white" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-medium flex items-center justify-center border border-[#052355] text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {/* Greeting & Stats Card inside the Navy Blue section if showAllJobs is false */}
          <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm flex flex-col gap-4 mt-1">
            <div>
              <h2 className="text-xl font-medium text-[#052355] flex items-center gap-2">
                Good Morning, Alex 👋
              </h2>
              <p className="text-slate-500 text-xs mt-1 font-normal">Ready to make a difference today?</p>
            </div>

            {/* Nested Stats Box */}
            <div className="bg-[#F0F5FD] rounded-2xl p-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider block">Today's Earnings</span>
                <p className="text-xl font-medium text-[#052355] mt-1 flex items-baseline gap-0.5">
                  <span className="text-sm font-normal">₹</span>{earningsTally.today.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="h-8 w-[1px] bg-slate-200"></div>
              <div className="text-right flex items-center gap-2">
                <p className="text-xl font-medium text-[#0D47A1]">{earningsTally.completedToday}</p>
                <div className="text-left leading-none">
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider block">Jobs</span>
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider block">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container below the Navy Blue Banner */}
      <div className="flex-1 px-3.5 py-4 flex flex-col gap-4">

        {/* VIEW 1: HOME DASHBOARD */}
        {!showAllJobs && (
          <>
            {/* Nearby Jobs Section Header */}
            <div className="flex justify-between items-center mt-1">
              <h3 className="text-base font-medium text-[#052355]">Nearby Jobs</h3>
              <button 
                onClick={() => setShowAllJobs(true)}
                className="text-xs font-medium text-[#0D47A1] hover:underline flex items-center gap-0.5"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* List of 3 nearby jobs - NO Accept/Decline buttons (Image 2 style) */}
            <div className="flex flex-col gap-3.5">
              {jobs.slice(0, 3).map((job) => {
                const styles = getCardStyle(job.type);
                return (
                  <div 
                    key={job.id} 
                    onClick={() => {
                      selectJobForDetails(job.id);
                      navigate('/technician/active-job');
                    }}
                    className={`bg-white rounded-3xl p-3.5 cursor-pointer hover:shadow-md transition-all duration-350 shadow-sm flex justify-between items-start border border-slate-300 ${styles.borderLeft}`}
                  >
                    {/* Left Column: Icon Block & Text Block */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Square Icon Box */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${styles.iconBg}`}>
                        {styles.icon}
                      </div>

                      {/* Text Column */}
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-medium block ${styles.titleColor}`}>
                          {job.type}
                        </span>
                        <h4 className="text-sm font-medium text-[#052355] mt-0.5 truncate leading-snug">
                          {getCardSubtitle(job)}
                        </h4>
                        
                        {/* Location / Bottom Icons Row */}
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-normal mt-3">
                          <span className="w-4 h-4 rounded-full border border-slate-250 bg-slate-50 flex items-center justify-center text-[8px] text-slate-500 font-normal">🧭</span>
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span>{job.distance} km away</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Price and Badge */}
                    <div className="text-right flex flex-col items-end justify-between min-h-[72px] ml-2 flex-shrink-0">
                      <div>
                        <p className="text-base font-medium text-[#052355] leading-none">
                          ₹{job.price > 0 ? job.price.toLocaleString('en-IN') : 'Free'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-normal mt-1">Est. Earn: ₹{job.estEarnings}</p>
                      </div>
                      <span className={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${styles.badgeBg}`}>
                        {styles.badgeText}
                      </span>
                    </div>
                  </div>
                );
              })}
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
                    : 'bg-[#F0F4FA] text-slate-600 hover:bg-[#E1EBF5] hover:text-slate-700'
                }`}
              >
                All Jobs (8)
              </button>
              <button
                onClick={() => setFilterTab('Priority')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  filterTab === 'Priority'
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-[#F0F4FA] text-slate-600 hover:bg-[#E1EBF5] hover:text-slate-700'
                }`}
              >
                Priority (3)
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#E53935] text-white text-[8px] font-medium">
                  −
                </span>
              </button>
              <button
                onClick={() => setFilterTab('Recommended')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                  filterTab === 'Recommended'
                    ? 'bg-[#0D47A1] text-white shadow-sm'
                    : 'bg-[#F0F4FA] text-slate-600 hover:bg-[#E1EBF5] hover:text-slate-700'
                }`}
              >
                Recommended (2)
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
                  const styles = getCardStyle(job.type);
                  const isExpanded = expandedJobId === job.id;
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => {
                        selectJobForDetails(job.id);
                        navigate('/technician/active-job');
                      }}
                      className={`bg-white rounded-3xl p-3.5 transition-all duration-300 flex flex-col gap-3 cursor-pointer ${
                        isExpanded 
                          ? `border-2 border-[#D2E3FC] shadow-md ${styles.borderLeft}` 
                          : `border border-slate-300 shadow-sm hover:border-slate-400 ${styles.borderLeft}`
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        {/* Left Column */}
                        <div className="min-w-0 flex-1">
                          {/* Title Area */}
                          {job.type === 'D2C Paid Service' ? (
                            <span className="inline-block bg-[#FFF2EE] text-[#FF5B26] px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider">
                              D2C Paid Service
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center text-white ${styles.iconBg}`}>
                                {React.cloneElement(styles.icon, { className: "h-3.5 w-3.5 text-white" })}
                              </div>
                              <span className={`text-[11px] font-medium tracking-wide uppercase ${styles.titleColor}`}>
                                {job.type}
                              </span>
                            </div>
                          )}

                          {/* Subtitle / Product name */}
                          <h4 className="text-sm font-medium text-[#052355] mt-2.5 truncate leading-snug">
                            {getCardSubtitle(job)}
                          </h4>
                          
                          {/* Location Pin Row */}
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-normal mt-4">
                            <MapPin className={`h-4 w-4 ${styles.titleColor} stroke-[2]`} />
                            <span>{job.distance} km</span>
                            <span className="text-slate-500 font-normal">•</span>
                            <span>{job.customerName}</span>
                          </div>
                        </div>
                        
                        {/* Right Content: Price, Est Earn, Badge */}
                        <div className="text-right flex flex-col items-end justify-between min-h-[80px] ml-2 flex-shrink-0">
                          <div>
                            <p className="text-base font-medium text-[#052355] leading-none">
                              ₹{job.price > 0 ? job.price.toLocaleString('en-IN') : '0'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-normal mt-1.5">Est. Earn ₹{job.estEarnings}</p>
                          </div>
                          
                          {/* Badges */}
                          <span className={`inline-block text-[9px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            job.type === 'D2C Paid Service' 
                              ? 'bg-[#E8F5E9] text-[#2E7D32]' // Solid green background, dark green text badge
                              : styles.badgeBg
                          }`}>
                            {job.type === 'D2C Paid Service' ? 'PAID SERVICE' : styles.badgeText}
                          </span>
                        </div>
                      </div>

                      {/* Accept / Decline buttons only for Expanded Job */}
                      {isExpanded && (
                        <div className="flex gap-3.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => acceptJob(job.id)}
                            className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-medium py-2.5 rounded-xl text-xs transition-all shadow-sm"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => alert(`Job #${job.id} declined.`)}
                            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-xl text-xs transition-all border border-slate-300"
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
                  <Briefcase className="h-10 w-10 mx-auto text-slate-500 mb-2" />
                  <p className="text-sm font-normal">No available jobs found.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
        <button 
          onClick={() => { setShowAllJobs(false); navigate('/technician/dashboard'); }}
          className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all"
        >
          <Briefcase className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Jobs</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/raise-part-request?tab=claims')}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all"
        >
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/inventory')}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all"
        >
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Inventory</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all"
        >
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all"
        >
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
