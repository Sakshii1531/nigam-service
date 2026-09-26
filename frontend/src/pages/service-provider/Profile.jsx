import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Star, ChevronRight,
  ShieldCheck, Award, Settings, LogOut, HelpCircle, Bell, Sparkles,
  TrendingUp, Building2, BadgeCheck,
  Clock, Pencil, ChevronLeft, Wallet, ArrowUpRight, ArrowRight, UserCheck, Shield
} from 'lucide-react';
import { useTech } from '../../context/ServiceProviderContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/apiClient';
import { goBack } from '../../lib/navigation';
import ServiceProviderBottomNav from '../../components/ServiceProviderBottomNav';
import serviceProviderAvatar from '../../assets/service_provider_avatar.png';
import { useServiceProviderSummary } from '../../hooks/useServiceProviderSummary';
import { Skeleton } from '../../components/common/Skeleton';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { earningsTally } = useTech();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const [profile, setProfile] = useState(null);
  const { summary } = useServiceProviderSummary();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    apiRequest('/service-provider/profile/profile', { auth: true })
      .then((res) => setProfile(res))
      .catch((err) => console.warn('Could not load profile:', err.message));
  }, []);

  const primaryPayout = profile?.payoutMethods?.find(m => m.isPrimary) || profile?.payoutMethods?.[0] || null;

  const avatarDisplay = profile?.avatarUrl || user?.avatarUrl || serviceProviderAvatar;
  const serviceProviderName = profile?.name || user?.name || 'Service Partner';
  const serviceProviderSpecs = profile?.specs?.length ? profile.specs.join(', ') : 'Verified Service Specialist';
  const serviceProviderRating = summary?.rating ?? null;
  const serviceProviderReviewCount = summary?.reviewCount ?? 0;
  const serviceProviderPartnerId = profile?.humanId || 'PROV-NCC';
  const isVerifiedPartner = profile?.status === 'Active';

  // Grouped Menu Sections for clarity & modern UX
  const operationsItems = [
    {
      label: 'Notifications',
      desc: 'Alerts, job offers & dispatch notices',
      icon: <Bell className="h-5 w-5 text-blue-600" />,
      path: '/service-provider/notifications',
      badge: unreadNotificationsCount > 0 ? `${unreadNotificationsCount} new` : null,
      badgeColor: 'bg-red-500 text-white',
      accent: 'bg-blue-50/80 border-blue-100',
    },
    {
      label: 'Need Technical Support',
      desc: 'Direct hotline & tech supervisor help',
      icon: <HelpCircle className="h-5 w-5 text-amber-600" />,
      path: '/service-provider/support',
      accent: 'bg-amber-50/80 border-amber-100',
    },
    {
      label: 'Announcements',
      desc: 'Company notices & policy updates',
      icon: <Sparkles className="h-5 w-5 text-rose-600" />,
      path: '/service-provider/announcements',
      accent: 'bg-rose-50/80 border-rose-100',
    },
  ];

  const credentialsItems = [
    {
      label: 'NCC Academy & Training',
      desc: 'Video lessons, courses & trade certification',
      icon: <Award className="h-5 w-5 text-purple-600" />,
      path: '/service-provider/academy',
      accent: 'bg-purple-50/80 border-purple-100',
    },
    {
      label: 'KYC & Verification Status',
      desc: 'Aadhaar, PAN & background security check',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      path: '/service-provider/verification',
      badge: isVerifiedPartner ? 'Verified' : 'In Review',
      badgeColor: isVerifiedPartner ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200',
      accent: 'bg-emerald-50/80 border-emerald-100',
    },
    {
      label: 'Skills & Certifications',
      desc: 'Manage authorized categories & tools',
      icon: <UserCheck className="h-5 w-5 text-indigo-600" />,
      path: '/service-provider/skills-certifications',
      accent: 'bg-indigo-50/80 border-indigo-100',
    },
    {
      label: 'Performance Analytics',
      desc: 'Job completion rate & customer satisfaction',
      icon: <TrendingUp className="h-5 w-5 text-teal-600" />,
      path: '/service-provider/analytics',
      accent: 'bg-teal-50/80 border-teal-100',
    },
  ];

  const preferenceItems = [
    {
      label: 'Personal Information',
      desc: 'Name, contact number & service addresses',
      icon: <Pencil className="h-5 w-5 text-slate-700" />,
      path: '/service-provider/personal-info',
      accent: 'bg-slate-100/80 border-slate-200',
    },
    {
      label: 'App Settings & Security',
      desc: 'Security PIN, password, language & alerts',
      icon: <Settings className="h-5 w-5 text-slate-700" />,
      path: '/service-provider/settings',
      accent: 'bg-slate-100/80 border-slate-200',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FD] flex flex-col pb-28 lg:pb-14 font-sans relative text-left selection:bg-blue-100 selection:text-blue-900">

      {/* ── Ambient Background Lighting (Modern Mesh Gradients) ── */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-linear-to-b from-[#06214D] via-[#0A2D69] to-[#F6F8FD] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-36 left-1/3 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── Mobile Top Sticky App Bar ── */}
      <div className="sticky top-0 z-30 px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-3 lg:hidden backdrop-blur-md bg-[#06214D]/80 border-b border-white/10 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => goBack(navigate, '/service-provider/dashboard')} 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-2xs"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <div className="text-center flex-1 px-2 sm:px-3">
            <h1 className="text-sm font-black text-white tracking-wide">Partner Profile</h1>
            <p className="text-[10px] text-blue-200/90 font-medium">NCC Verified Network</p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/service-provider/notifications')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all relative cursor-pointer shadow-2xs"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#06214D]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop Top Navigation Bar (lg+) ── */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-4 relative z-20">
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/80 shadow-[0_4px_24px_rgba(10,37,84,0.06)]">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => goBack(navigate, '/service-provider/dashboard')}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#06214D] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              title="Back to Dashboard"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Partner Profile & Workspace</h1>
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700">
                  <BadgeCheck size={13} className="text-emerald-600" /> Active Verified Partner
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Manage trade identity, financial payouts, credentials and performance ratings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/service-provider/notifications')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors relative cursor-pointer shadow-2xs"
            >
              <Bell size={16} className="text-[#0D47A1]" />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/service-provider/settings')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              title="App Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="flex-1 px-2.5 sm:px-4 lg:px-6 xl:px-8 pt-2.5 sm:pt-3 lg:pt-0 max-w-screen-xl mx-auto w-full relative z-10 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 gap-3.5 sm:gap-4">

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN (Desktop col-span-5): Identity & Financial Hub        */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3 sm:gap-4">

          {/* 1. HERO IDENTITY CARD */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)] flex flex-col gap-3 sm:gap-4 relative overflow-hidden group">
            {/* Top decorative gradient glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-linear-to-br from-blue-400/20 to-indigo-400/0 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3 sm:gap-4">
              {/* Avatar with Status Ring */}
              <div 
                onClick={() => navigate('/service-provider/personal-info')}
                className="relative cursor-pointer shrink-0"
                title="Edit Personal Information"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-blue-50 border-2 border-[#0D47A1]/20 shadow-md transition-transform group-hover:scale-[1.02]">
                  <img 
                    src={avatarDisplay} 
                    alt={serviceProviderName} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
                {/* Active verified dot */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-3 ring-white flex items-center justify-center shadow-xs" title="Account Active">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Name & Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 break-words line-clamp-1 leading-tight tracking-tight">
                    {serviceProviderName}
                  </h2>
                  <button 
                    onClick={() => navigate('/service-provider/personal-info')} 
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-brand-blue border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer shrink-0 active:scale-90"
                    title="Edit Profile"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-semibold mt-1 break-words line-clamp-2 leading-relaxed">
                  {profile ? serviceProviderSpecs : <Skeleton inline className="h-3 w-40" />}
                </p>

                {/* Rating (Only shown if rating exists) & Verified Badges */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {Boolean(serviceProviderRating != null && serviceProviderReviewCount > 0) && (
                    <div className="inline-flex items-center gap-1.5 bg-amber-50/90 border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      <span className="text-[11px] font-black text-amber-900">
                        {serviceProviderRating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold">
                        ({serviceProviderReviewCount})
                      </span>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-1.5 bg-blue-50/90 border border-blue-200/80 px-2.5 py-1 rounded-xl text-[#0D47A1] text-[11px] font-black shadow-2xs">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#0D47A1]" />
                    <span>Verified Partner</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Identification Bar */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Partner ID</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[#06214D] bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs tracking-wider shadow-2xs">
                  {serviceProviderPartnerId}
                </span>
              </div>
            </div>
          </div>

          {/* 2. WALLET BALANCE & WITHDRAWAL CARD */}
          <div className="bg-linear-to-br from-[#06214D] via-[#092B65] to-[#0D47A1] text-white rounded-3xl p-3.5 sm:p-5 shadow-[0_12px_35px_rgba(9,43,101,0.22)] border border-blue-900/40 flex flex-col gap-3.5 sm:gap-4 relative overflow-hidden">
            {/* Atmospheric light reflections */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-center relative z-10 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-[11px] sm:text-xs font-black text-blue-100 uppercase tracking-wider truncate">
                  Wallet Balance
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full backdrop-blur-sm shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-200 tracking-wide uppercase">Ready to Withdraw</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between relative z-10 flex-wrap gap-2 pt-0.5">
              <div>
                <p className="text-[11px] sm:text-xs text-blue-200/80 font-medium mb-0.5">Available for payout</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    ₹{earningsTally.available.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/service-provider/earnings')}
                className="inline-flex items-center gap-1.5 bg-linear-to-r from-amber-400 to-[#FFD400] text-[#06214D] hover:brightness-105 active:scale-95 text-xs font-black px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              >
                <span>Withdraw</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/80 relative z-10">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                <span>Instant automated approval within 24h</span>
              </div>
              <button
                onClick={() => navigate('/service-provider/recent-earnings')}
                className="text-white hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer underline-offset-2 hover:underline"
              >
                <span>Logs</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 3. PERFORMANCE STATS STRIP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Earnings</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 leading-tight">
                  ₹{earningsTally.total.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Lifetime revenue</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/service-provider/history')}
              className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 hover:border-[#0D47A1]/40 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jobs Completed</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 leading-tight group-hover:text-brand-blue transition-colors">
                  {earningsTally.completedTotal}
                </p>
                <p className="text-[10px] text-brand-blue font-bold mt-0.5 flex items-center gap-0.5">
                  <span>View History</span>
                  <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </button>
          </div>

          {/* 4. PRIMARY PAYOUT METHOD CARD */}
          <button
            onClick={() => navigate('/service-provider/payout-settings')}
            className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:border-[#0D47A1]/40 transition-all text-left flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1] shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                    {primaryPayout ? (primaryPayout.type === 'bank' ? 'Linked Bank Account' : 'UPI Payment ID') : 'Payout & Bank Settings'}
                  </p>
                  {primaryPayout && (
                    <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full uppercase">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  {primaryPayout 
                    ? (primaryPayout.accountNo ? `A/C ••••••${primaryPayout.accountNo.slice(-4)} (${primaryPayout.name})` : primaryPayout.upiId || 'Verified')
                    : 'Tap to configure bank account or UPI for payouts'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </button>

          {/* Logout (Desktop Only in Left Column) */}
          <div className="hidden lg:block pt-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200/80 bg-red-50/70 text-red-600 hover:bg-red-100/80 transition-all text-xs font-black cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out Account</span>
            </button>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN (Desktop col-span-7): Action Hub & Management        */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-4">

          {/* SECTION 1: OPERATIONS & SUPPORT */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-[0_6px_20px_rgba(15,23,42,0.04)] flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Support & Communication
              </h3>
            </div>

            <div className="divide-y divide-slate-100/80">
              {operationsItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="w-full py-3 px-1 flex items-center justify-between hover:bg-slate-50/80 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.accent}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-slate-800 group-hover:text-brand-blue transition-colors truncate">
                          {item.label}
                        </p>
                        {item.badge && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: CREDENTIALS & SKILLS */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-[0_6px_20px_rgba(15,23,42,0.04)] flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Award className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Certifications & Growth
              </h3>
            </div>

            <div className="divide-y divide-slate-100/80">
              {credentialsItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="w-full py-3 px-1 flex items-center justify-between hover:bg-slate-50/80 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.accent}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold text-slate-800 group-hover:text-brand-blue transition-colors truncate">
                          {item.label}
                        </p>
                        {item.badge && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: APP PREFERENCES & SECURITY */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-[0_6px_20px_rgba(15,23,42,0.04)] flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Settings className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Account & Preferences
              </h3>
            </div>

            <div className="divide-y divide-slate-100/80">
              {preferenceItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="w-full py-3 px-1 flex items-center justify-between hover:bg-slate-50/80 rounded-2xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.accent}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 group-hover:text-brand-blue transition-colors truncate">
                        {item.label}
                      </p>
                      <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Logout Button (Mobile Only) */}
          <div className="block lg:hidden pt-2 mb-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 bg-red-50/80 text-red-600 hover:bg-red-100 transition-all text-xs font-black cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out Account</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── Fixed Mobile Bottom Nav ── */}
      <ServiceProviderBottomNav activeTab="profile" />

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex items-center justify-center shadow-xs">
              <LogOut className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 mb-1">Confirm Log Out</h4>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Are you sure you want to log out of your NCC Partner account?
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
                  navigate('/service-provider/login', { replace: true });
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl transition-colors cursor-pointer shadow-sm active:scale-95"
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
