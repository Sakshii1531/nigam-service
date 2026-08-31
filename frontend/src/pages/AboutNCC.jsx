import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronRight, FileText, Info, ShieldCheck, Heart, Award, Users, Clock, ThumbsUp, Wrench, CheckCircle2, Headphones, RefreshCw 
} from 'lucide-react';
import defaultLogo from '../assets/nigam-care.png';
import Footer from '../components/layout/Footer';
import { apiRequest } from '../lib/apiClient';

const defaultStats = [
  { label: 'Happy Customers', value: '50,000+', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Certified Technicians', value: '100+', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Satisfaction Rating', value: '4.8 ★', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Response Time', value: '30 Mins', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const defaultCoreValues = [
  {
    title: 'Certified & Verified Technicians',
    desc: 'Every technician undergoes rigorous background verification, technical testing, and safety protocols before taking any job.',
    icon: ShieldCheck,
    color: 'bg-blue-600',
  },
  {
    title: '100% Transparent Pricing',
    desc: 'No hidden fees or unexpected charges. View exact service rates upfront before booking.',
    icon: CheckCircle2,
    color: 'bg-emerald-600',
  },
  {
    title: 'Genuine Spare Parts',
    desc: 'We use only authentic, high-grade OEM spare parts backed by warranty protection for long-lasting performance.',
    icon: Wrench,
    color: 'bg-amber-600',
  },
  {
    title: 'Instant Support & Warranty',
    desc: 'Dedicated 24/7 customer care desk with hassle-free claim processing for all covered home appliances.',
    icon: Headphones,
    color: 'bg-indigo-600',
  },
];

const iconMap = [ShieldCheck, CheckCircle2, Wrench, Headphones, Award, Heart, Info, Clock];
const bgColors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-600'];

const AboutNCC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [heroTitle, setHeroTitle] = useState('Empowering Smart Home Care & Appliance Solutions');
  const [heroSubtitle, setHeroSubtitle] = useState("Nigam Care Center (NCC) is India's leading home service network. We connect households with top-rated, background-verified technicians for AC repair, appliance servicing, electrical work, plumbing, and genuine spare parts delivery.");
  const [appVersion, setAppVersion] = useState('v2.4.0');
  const [stats, setStats] = useState(defaultStats);
  const [coreValues, setCoreValues] = useState(defaultCoreValues);

  const fetchAboutData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/cms/pages/about-ncc');
      if (res) {
        if (res.title) setHeroTitle(res.title);
        if (res.subtitle) setHeroSubtitle(res.subtitle);
        if (res.version) setAppVersion(res.version);

        if (Array.isArray(res.stats) && res.stats.length > 0) {
          const mappedStats = res.stats.map((st, idx) => ({
            label: st.label,
            value: st.value,
            icon: defaultStats[idx % defaultStats.length].icon,
            color: defaultStats[idx % defaultStats.length].color,
            bg: defaultStats[idx % defaultStats.length].bg,
          }));
          setStats(mappedStats);
        }

        if (Array.isArray(res.sections) && res.sections.length > 0) {
          const mappedValues = res.sections.map((sec, idx) => ({
            title: sec.heading,
            desc: sec.text,
            icon: iconMap[idx % iconMap.length],
            color: bgColors[idx % bgColors.length],
          }));
          setCoreValues(mappedValues);
        }
      }
    } catch {
      // Fallback cleanly to default content
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAboutData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 lg:top-20 z-40 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-700"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-black text-slate-900">About Nigam Care Center</h1>
      </div>

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-[#051F42] via-[#0B4EA2] to-[#0D47A1] rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl text-left">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start gap-3 max-w-2xl">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wide text-slate-100">Official Release {appVersion}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight">
                {heroTitle}
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed font-medium mt-1">
                {heroSubtitle}
              </p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] shadow-lg shrink-0">
              <img src={defaultLogo} alt="Nigam Care" className="h-16 w-auto object-contain drop-shadow-md mb-2" />
              <span className="text-xs font-black text-white">Nigam Care Center</span>
              <span className="text-[10px] text-amber-300 font-bold">Trusted Nationwide</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col items-center text-center gap-2 hover:shadow-md transition-all">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-2xl md:text-3xl font-black text-slate-900">{stat.value}</span>
                <span className="text-xs font-bold text-slate-500">{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Core Values Section */}
        <div className="flex flex-col gap-6">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900">Why Millions Trust NCC</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
              We are committed to safety, reliability, and market-leading quality in every home visit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex gap-5 items-start hover:shadow-md transition-all text-left">
                  <div className={`${val.color} text-white p-3.5 rounded-2xl shrink-0 shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-black text-slate-900">{val.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{val.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* App Services Summary Banner */}
        <div className="bg-white rounded-[28px] p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h3 className="text-xl font-black text-slate-900">Need Instant Repair or Servicing?</h3>
            <p className="text-xs md:text-sm text-slate-500 font-medium max-w-xl">
              Book certified AC technicians, washing machine experts, electricians, or plumbers in under 60 seconds with 30-day service warranty.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-[#0B4EA2] hover:bg-[#072C63] text-white font-bold text-xs md:text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            Explore All Services
          </button>
        </div>

        {/* Legal & Policy Links */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] overflow-hidden shadow-xs divide-y divide-slate-100 text-left">
          <div 
            className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer" 
            onClick={() => navigate('/terms-and-conditions')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800">Terms of Service</span>
                <span className="text-[11px] text-slate-400 font-medium">Read our customer agreements & service terms</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>

          <div 
            className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer" 
            onClick={() => navigate('/privacy-policy')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-50 text-[#0D47A1] rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800">Privacy Policy</span>
                <span className="text-[11px] text-slate-400 font-medium">Learn how we protect and secure your personal data</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>

          <div 
            className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer" 
            onClick={() => alert('Open Source Licenses: Built with React 19, Vite, TailwindCSS & Lucide Icons.')}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <Info className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800">Open Source Licenses</span>
                <span className="text-[11px] text-slate-400 font-medium">View third-party software disclosures</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        {/* Made with love credit */}
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <span className="text-xs text-slate-400 font-black flex items-center gap-1.5">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> in India
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            © 2026 Nigam Care Center (NCC). All rights reserved.
          </span>
        </div>

      </div>

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default AboutNCC;
