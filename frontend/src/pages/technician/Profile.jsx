import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Briefcase, ClipboardList, Calendar, Wrench, User, Star, ChevronRight,
  CreditCard, ShieldCheck, Award, Settings, LogOut, HelpCircle, X, Bell, Sparkles,
  TrendingUp, Send, Zap, FileText, Building2, ChevronDown, ChevronUp, BadgeCheck,
  AlertTriangle, Clock, Pencil, ChevronLeft, Wallet, Shield, CheckCircle2
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/apiClient';
import TechBottomNav from '../../components/TechBottomNav';
import techAvatar from '../../assets/tech_avatar.png';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { earningsTally, notifications } = useTech();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const [profile, setProfile] = useState(null);
  const [exploreOpen, setExploreOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => setProfile(res))
      .catch((err) => console.warn('Could not load profile:', err.message));
  }, []);

  const primaryPayout = profile?.payoutMethods?.find(m => m.isPrimary) || profile?.payoutMethods?.[0] || null;

  const techName = profile?.technician?.name || user?.name || 'Rahul Sharma';
  const techSpecs = profile?.technician?.specs?.length ? profile.technician.specs.join(', ') : 'Expert Appliance Specialist';
  const techRating = profile?.technician?.rating || 4.9;
  const techPartnerId = profile?.technician?.partnerId || (profile?.technician?._id ? `NCC-${profile.technician._id.slice(-6).toUpperCase()}` : 'NCC-TECH01');

  const exploreItems = [
    { label: 'Service History', desc: 'All completed jobs & service logs', icon: <ClipboardList className="h-4.5 w-4.5 text-[#0D47A1]" />, path: '/technician/history', bg: 'bg-blue-50' },
    { label: 'Notifications', desc: 'Manage notifications & alerts', icon: <Bell className="h-4.5 w-4.5 text-[#0D47A1]" />, path: '/technician/notifications', bg: 'bg-blue-50' },
    { label: 'NCC Academy', desc: 'Blogs and video for learning', icon: <Award className="h-4.5 w-4.5 text-purple-600" />, path: '/technician/academy', bg: 'bg-purple-50' },
    { label: 'Need Technical Support', desc: 'Connect with support by call or message', icon: <HelpCircle className="h-4.5 w-4.5 text-amber-600" />, path: '/technician/support', bg: 'bg-amber-50' },
    { label: 'Announcements', desc: 'Notice & alert from Headquarters', icon: <Bell className="h-4.5 w-4.5 text-rose-600" />, path: '/technician/announcements', bg: 'bg-rose-50' },
    { label: 'Analytics', desc: 'View performance & earnings', icon: <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />, path: '/technician/analytics', bg: 'bg-emerald-50' },
    { label: 'KYC Verification', desc: 'Aadhaar, PAN, Bank account verification', icon: <ShieldCheck className="h-4.5 w-4.5 text-teal-600" />, path: '/technician/verification', bg: 'bg-teal-50' },
    { label: 'Skills & Certifications', desc: 'HVAC, Refrigeration, AC', icon: <Award className="h-4.5 w-4.5 text-indigo-600" />, path: '/technician/skills-certifications', bg: 'bg-indigo-50' },
    { label: 'Partner Level & Allocations', desc: 'Tiers, ratings and automatic job specs', icon: <BadgeCheck className="h-4.5 w-4.5 text-[#052355]" />, path: '/technician/partner-level', bg: 'bg-slate-100' },
    { label: 'App Settings', desc: 'Preferences, security and language', icon: <Settings className="h-4.5 w-4.5 text-slate-700" />, path: '/technician/settings', bg: 'bg-slate-100' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col pb-28 lg:pb-12 font-sans relative text-left">

      {/* Signature Dark Navy Header — mobile only */}
      <div className="bg-gradient-to-b from-[#052355] to-[#0A337A] text-white pt-5 pb-8 px-4 shadow-md rounded-b-[2.2rem] sticky top-0 z-20 lg:hidden">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/technician/dashboard')} 
            className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-6 w-6 text-white stroke-[2.5]" />
          </button>
          <div className="text-center flex-1 pr-2">
            <h1 className="text-base font-extrabold text-white tracking-wide">Technician Profile</h1>
            <span className="text-[11px] text-white/80 font-normal">NCC Verified Partner</span>
          </div>
          <button 
            onClick={() => navigate('/technician/notifications')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell className="h-5 w-5 text-white" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#052355]"></span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Page Top Header Bar (lg+ only) */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/technician/dashboard')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#052355] tracking-tight">Technician Profile</h1>
                <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#0D47A1]">
                  <BadgeCheck size={13} /> Verified Partner
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your credentials, performance metrics and payout settings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/technician/notifications')}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors relative cursor-pointer"
            >
              <Bell size={15} className="text-[#0D47A1]" />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => navigate('/technician/settings')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 hover:text-[#052355] transition-colors cursor-pointer"
              title="App Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Responsive Grid (Single Column on Mobile, 2-Column Dashboard on Desktop) */}
      <div className="flex-1 px-3.5 -mt-4 lg:mt-0 lg:px-6 xl:px-8 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 gap-3.5 relative z-30 max-w-screen-xl mx-auto w-full">

        {/* LEFT COLUMN (Desktop col-span-4) */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3.5 lg:gap-4">

          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5">
              <div
                onClick={() => navigate('/technician/personal-info')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#0D47A1]/30 shadow-xs cursor-pointer flex-shrink-0 relative group"
              >
                <img src={techAvatar} alt={techName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#052355]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-[#052355]">{techName}</h2>
                  <button 
                    onClick={() => navigate('/technician/personal-info')} 
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
                    title="Edit Profile"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{techSpecs}</p>
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => navigate('/technician/partner-level')}
                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-100/60 transition-colors"
                  >
                    <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
                    <span className="text-[10.5px] font-black text-amber-800">{techRating}</span>
                    <span className="text-[9.5px] text-amber-700 font-bold">(Verified)</span>
                  </button>
                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="h-3 w-3 text-[#0D47A1]" />
                    <span className="text-[10px] font-black text-[#0D47A1]">Elite Partner</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Partner Identification</span>
              <span className="text-[#052355] font-black bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                {techPartnerId}
              </span>
            </div>

            <button
              onClick={() => navigate('/technician/personal-info')}
              className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#052355] transition-colors cursor-pointer mt-1"
            >
              <Pencil size={13} />
              <span>Edit Personal Details</span>
            </button>
          </div>

          {/* Bank Account / Payout Method (Desktop Left Sidebar Placement) */}
          <div className="hidden lg:block">
            <button
              onClick={() => navigate('/technician/payout-settings')}
              className="w-full bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5 text-left hover:border-[#0D47A1]/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#0D47A1]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#052355] group-hover:text-[#0D47A1] transition-colors">
                      {primaryPayout ? (primaryPayout.type === 'bank' ? 'Linked Bank Account' : 'UPI Payment ID') : 'Bank Account & Payouts'}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                      {primaryPayout 
                        ? (primaryPayout.accountNo ? `A/C No. ••••••${primaryPayout.accountNo.slice(-4)} (${primaryPayout.name})` : primaryPayout.upiId || '')
                        : 'Configure for withdrawal'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              {primaryPayout && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Payout Method</span>
                  <span className="font-bold text-[#0D47A1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Primary</span>
                </div>
              )}
            </button>
          </div>

          {/* Explore More Accordion (Mobile Only Placement) */}
          <div className="block lg:hidden bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <button
              onClick={() => setExploreOpen(prev => !prev)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0D47A1]" />
                <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">Explore Services & Settings</h3>
              </div>
              {exploreOpen
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </button>

            {exploreOpen && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {exploreItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${item.bg} rounded-xl flex-shrink-0 transition-transform group-hover:scale-105`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-[#052355] group-hover:text-[#0D47A1] transition-colors">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout Button (Desktop Sidebar Position) */}
          <div className="hidden lg:block">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all text-xs font-black cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out Account</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN (Desktop col-span-8) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-3.5 lg:gap-4">

          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-br from-[#052355] via-[#082E6E] to-[#0D47A1] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-blue-900/40 flex flex-col gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
              <span className="text-[11px] text-blue-200 font-black uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={14} /> Wallet Balance
              </span>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9.5px] font-bold text-emerald-200">Available to Withdraw</span>
              </div>
            </div>

            <div className="flex items-end justify-between relative z-10 flex-wrap gap-3">
              <div>
                <span className="text-3xl sm:text-4xl font-black text-white leading-none">
                  ₹{earningsTally.available.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => navigate('/technician/earnings')}
                className="flex items-center gap-1.5 bg-white text-[#052355] hover:bg-slate-100 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>Request Withdraw</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[10.5px] text-blue-200/80 mt-0.5 flex items-center gap-1.5 font-medium relative z-10">
              <Clock className="h-3.5 w-3.5" />
              Withdrawal requests are processed & approved within 24 Hours
            </p>
          </div>

          {/* Quick Metrics & History Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#0D47A1] flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Total Earnings</p>
                <p className="text-base font-black text-[#052355] mt-0.5">₹{earningsTally.total.toLocaleString('en-IN')}</p>
                <p className="text-[9.5px] text-slate-400 font-medium">All Time</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/technician/history')}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3 hover:bg-slate-50 hover:border-[#0D47A1]/40 transition-all cursor-pointer text-left group"
            >
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Jobs Done</p>
                <p className="text-base font-black text-[#052355] group-hover:text-[#0D47A1] transition-colors mt-0.5">{earningsTally.completedTotal}</p>
                <p className="text-[9.5px] text-slate-400 font-medium">View History</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/technician/recent-earnings')}
              className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:bg-slate-50 hover:border-[#0D47A1]/40 transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 flex-shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#052355] group-hover:text-[#0D47A1] transition-colors truncate">Earnings History</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Daily credit logs</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-1" />
            </button>
          </div>

          {/* Bank Account / Payout Method (Mobile Only Placement) */}
          <div className="block lg:hidden">
            <button
              onClick={() => navigate('/technician/payout-settings')}
              className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[#0D47A1] flex-shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#052355] group-hover:text-[#0D47A1] transition-colors">
                    {primaryPayout ? (primaryPayout.type === 'bank' ? 'Linked Bank Account' : 'UPI Payment ID') : 'Bank Account & Payouts'}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                    {primaryPayout 
                      ? (primaryPayout.accountNo ? `A/C No. ••••••${primaryPayout.accountNo.slice(-4)} (${primaryPayout.name})` : primaryPayout.upiId || '')
                      : 'Tap to configure for weekly earnings withdrawal'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {primaryPayout && (
                  <span className="text-[10px] font-black text-[#0D47A1] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">Primary</span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* Explore Services & Settings Grid (Desktop 2-Column Card Grid) */}
          <div className="hidden lg:flex flex-col bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs gap-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-[#0D47A1]" />
              <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">Explore Services & Settings</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exploreItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-[#0D47A1]/30 hover:shadow-xs transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 ${item.bg} rounded-xl flex-shrink-0 transition-transform group-hover:scale-105`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[#052355] group-hover:text-[#0D47A1] transition-colors truncate">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Logout Button (Mobile Only Position at Bottom) */}
          <div className="block lg:hidden mb-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all text-xs font-black cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out Account</span>
            </button>
          </div>

        </div>

      </div>

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="profile" />

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex items-center justify-center">
              <LogOut className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-base font-black text-[#052355] mb-1">Confirm Log Out</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Are you sure you want to log out of your NCC Technician account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black py-3 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                  navigate('/technician/login', { replace: true });
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
