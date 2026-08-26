import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Award, CheckCircle } from 'lucide-react';
import { useTech } from '../../context/TechContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
import techAvatar from '../../assets/tech_avatar.png';

const PartnerLevel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { earningsTally, activeSpecs, toggleSpec } = useTech();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => setProfile(res))
      .catch((err) => console.warn('Could not load profile in PartnerLevel:', err.message));
  }, []);

  const totalCompleted = earningsTally?.completedTotal ?? profile?.totalJobsCompleted ?? 0;
  const rating = profile?.rating || 4.9;
  const name = profile?.name || user?.name || 'Technician';
  const roleTitle = profile?.skills?.length ? `${profile.skills[0].name} Specialist` : 'Service Specialist';

  const badgeLevel = totalCompleted >= 150 ? '🥇 Senior SP' : totalCompleted >= 50 ? '🥈 Specialised SP' : '🥉 Trainee SP';
  const nextTarget = totalCompleted >= 150 ? 300 : totalCompleted >= 50 ? 150 : 50;
  const progressPercent = Math.min(100, Math.round((totalCompleted / nextTarget) * 100));

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-12 relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Partner Level & Ratings</h1>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 text-left pb-10">
        
        {/* Top Section: Profile info & current tier */}
        <div className="bg-gradient-to-br from-[#052355] to-[#0A2C74] text-white rounded-3xl p-5 shadow-md flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/25 shadow-sm">
              <img src={techAvatar} alt={`${name} Avatar`} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{name}</h2>
              <p className="text-xs text-slate-300 mt-1 font-medium">{roleTitle}</p>
            </div>
          </div>

          {/* Progress & Badge */}
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 mt-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-300 tracking-wider">CURRENT BADGE LEVEL</span>
              <span className="bg-[#FFD400] text-[#052355] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                {badgeLevel}
              </span>
            </div>

            {/* Progress Indicators */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex justify-between text-[9px] font-bold text-slate-300">
                <span className={totalCompleted >= 0 ? 'text-[#FFD400]' : 'text-slate-400'}>Trainee SP</span>
                <span className={totalCompleted >= 50 ? 'text-[#FFD400]' : 'text-slate-400'}>Specialised SP</span>
                <span className={totalCompleted >= 150 ? 'text-[#FFD400]' : 'text-slate-400'}>Senior SP</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-[#FFD400] rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-300 mt-0.5">
                <span>{totalCompleted} jobs completed</span>
                <span>Next level at {nextTarget}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ratings Breakdown Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[#052355] mb-3 uppercase tracking-wider">Ratings & Performance</h3>
          
          <div className="flex items-center gap-4 mb-4 bg-slate-50 p-3 rounded-2xl">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-[#0D47A1]">{rating.toFixed(1)}</span>
              <span className="text-[9px] text-slate-500 font-bold block mt-0.5 uppercase tracking-wider">Rating</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <div className="flex-1 text-xs text-slate-650 flex flex-col gap-1">
              <p className="font-semibold">Performance: <span className="text-[#052355] font-bold">{totalCompleted} completed jobs</span></p>
              <p className="font-normal text-slate-500">{totalCompleted > 0 ? 'Consistent performance across assigned jobs' : 'Start completing jobs to unlock partner tiers'}</p>
            </div>
          </div>

          {/* Service Ratings */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-650 font-medium">AC Repair & Service</span>
              <span className="font-bold text-[#052355] flex items-center gap-1">4.9 <Star className="w-3 h-3 fill-[#FFD400] text-[#FFD400]" /></span>
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-655 font-medium">Refrigerator Repair</span>
              <span className="font-bold text-[#052355] flex items-center gap-1">4.8 <Star className="w-3 h-3 fill-[#FFD400] text-[#FFD400]" /></span>
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-650 font-medium">Washing Machine Repair</span>
              <span className="font-bold text-[#052355] flex items-center gap-1">5.0 <Star className="w-3 h-3 fill-[#FFD400] text-[#FFD400]" /></span>
            </div>
          </div>
        </div>

        {/* Allocation & Specifications Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <h3 className="text-xs font-bold text-[#052355] uppercase tracking-wider">Specification of Work</h3>
            <p className="text-[10px] text-slate-500 font-normal mt-0.5">Toggle categories to auto-allocate nearby jobs to your dashboard list</p>
          </div>

          {/* Specifications Toggles */}
          <div className="flex flex-col gap-3.5 mt-2">
            {[
              { id: 'AC', title: 'AC Service Expert', desc: 'Split & Window AC Servicing / Gas Charging' },
              { id: 'Refrigerator', title: 'Refrigerator Expert', desc: 'Double Door & Single Door Refrigerator Repair' },
              { id: 'Washing Machine', title: 'Washing Machine Expert', desc: 'Front & Top Load Washing Machine Repair' },
              { id: 'RO', title: 'RO Purifier Expert', desc: 'Water Purifier Filter replacement & repair' },
              { id: 'TV', title: 'TV/LED Panel Expert', desc: 'Smart LED TV Display & Panel Repair' },
              { id: 'Chimney', title: 'Chimney Expert', desc: 'Kitchen Chimney Deep Cleaning & Motor Repair' }
            ].map((spec) => {
              const isActive = activeSpecs.includes(spec.id);
              return (
                <div key={spec.id} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                  <div className="min-w-0 flex-1 pr-3">
                    <h4 className="text-xs font-bold text-[#052355]">{spec.title}</h4>
                    <p className="text-[9px] text-slate-550 font-normal mt-0.5 leading-normal">{spec.desc}</p>
                  </div>
                  {/* Toggle button */}
                  <button
                    onClick={() => toggleSpec(spec.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
                      isActive ? 'bg-[#0D47A1]' : 'bg-slate-300'
                    }`}
                  >
                    <span 
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                      style={{ left: isActive ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PartnerLevel;
