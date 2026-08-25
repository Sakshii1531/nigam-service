import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Briefcase, ClipboardList, Calendar, Wrench, User, Star, ChevronRight,
  CreditCard, ShieldCheck, Award, Settings, LogOut, HelpCircle, X, Bell, Sparkles,
  TrendingUp, Send, Zap, FileText, Building2, ChevronDown, ChevronUp, BadgeCheck,
  AlertTriangle, Clock, Pencil
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import { useAuth } from '../../context/AuthContext';
import techAvatar from '../../assets/tech_avatar.png';

const recentEarnings = [
  { id: 1, title: 'Electrician Repair', tag: 'QuickPayout', date: '16 May 2026, 02:20 PM', amount: 400, status: 'Credited', statusColor: 'text-green-500', icon: 'zap', tab: 'quick' },
  { id: 2, title: 'Plumbing Service', tag: 'QuickPayout', date: '16 May 2026, 11:15 AM', amount: 350, status: 'Credited', statusColor: 'text-green-500', icon: 'zap', tab: 'quick' },
  { id: 3, title: 'LG Refrigerator – Warranty Claim', tag: 'InvoicePayout', date: '17 May 2026, 04:20 PM', amount: 450, status: 'Approval Pending', statusColor: 'text-orange-500', icon: 'file', tab: 'invoice' },
  { id: 4, title: 'NCC AMC – Quarterly Visit', tag: 'InvoicePayout', date: '17 May 2026, 10:30 AM', amount: 250, status: 'Approved', statusColor: 'text-green-500', icon: 'file', tab: 'invoice' },
  { id: 5, title: 'Voltas AC Service (Partner Brand)', tag: 'InvoicePayout', date: '16 May 2026, 03:45 PM', amount: 600, status: 'Verification', statusColor: 'text-blue-500', icon: 'file', tab: 'invoice' },
];

import { apiRequest } from '../../lib/apiClient';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { earningsTally, notifications } = useTech();

  const [profile, setProfile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: `Hello ${user?.name || 'Technician'}! I am your AI Assistant. How can I help you today?` }
  ]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => setProfile(res))
      .catch((err) => console.warn('Could not load profile:', err.message));
  }, []);

  const primaryPayout = profile?.payoutMethods?.find(m => m.isPrimary) || profile?.payoutMethods?.[0] || null;

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setChatInput('');
    
    try {
      const res = await apiRequest('/tech/assistant', {
        method: 'POST',
        auth: true,
        body: {
          messages: [
            ...chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: userText }
          ]
        }
      });
      setChatMessages(curr => [...curr, { id: Date.now() + 1, sender: 'ai', text: res?.reply || "I'm here to help with your jobs, parts, and earnings." }]);
    } catch {
      setChatMessages(curr => [...curr, { id: Date.now() + 1, sender: 'ai', text: "I can assist you with diagnostic tips, earnings analytics, or inventory requests. What can I do for you?" }]);
    }
  };

  const exploreItems = [
    { label: 'Notifications', desc: 'Manage notifications & alerts', icon: <Bell className="h-5 w-5 text-slate-500" />, path: '/technician/notifications' },
    { label: 'NCC Academy', desc: 'Blogs and video for learning', icon: <Award className="h-5 w-5 text-slate-500" />, path: '/technician/academy' },
    { label: 'Need Technical Support', desc: 'Connect with support by call or message', icon: <HelpCircle className="h-5 w-5 text-slate-500" />, path: '/technician/technical-support' },
    { label: 'Announcements', desc: 'Notice & alert from Headquarters', icon: <Bell className="h-5 w-5 text-slate-500" />, path: '/technician/announcements' },
    { label: 'Analytics', desc: 'View performance & earnings', icon: <TrendingUp className="h-5 w-5 text-slate-500" />, path: '/technician/analytics' },
    { label: 'KYC Verification', desc: 'Aadhaar, PAN, Bank', icon: <ShieldCheck className="h-5 w-5 text-slate-500" />, path: '/technician/verification' },
    { label: 'Skills & Certifications', desc: 'HVAC, Refrigeration, AC', icon: <Award className="h-5 w-5 text-slate-500" />, path: '/technician/skills-certifications' },
    { label: 'Partner Level & Allocations', desc: 'Tiers, ratings and automatic job specs', icon: <Award className="h-5 w-5 text-slate-500" />, path: '/technician/partner-level' },
    { label: 'Settings', desc: 'App preferences', icon: <Settings className="h-5 w-5 text-slate-500" />, path: '/technician/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Profile</h1>
        <div className="w-8"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-3">

        {/* White top card: avatar + name + rating + partner id */}
        <div className="bg-white px-4 pt-5 pb-4">
          <div className="flex items-center gap-3.5">
            <div
              onClick={() => navigate('/technician/personal-info')}
              className="w-[68px] h-[68px] rounded-full overflow-hidden border-[3px] border-slate-200 shadow-md cursor-pointer flex-shrink-0 relative group"
            >
              <img src={techAvatar} alt="Alex Rodriguez" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[#052355]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-white text-[9px] font-semibold">Edit</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#052355] leading-tight">{user?.name || 'Technician'}</h2>
                <button onClick={() => navigate('/technician/personal-info')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Expert HVAC Technician</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <button
                  onClick={() => navigate('/technician/partner-level')}
                  className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                >
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-700">4.9</span>
                  <span className="text-[10px] text-amber-600">(120+ Reviews)</span>
                </button>
                <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="h-3 w-3 text-[#0D47A1]" />
                  <span className="text-[10px] font-semibold text-[#0D47A1]">Elite Partner</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Partner ID: NCCP12345</p>
            </div>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <div className="mx-3 bg-[#0A2D6E] rounded-2xl p-4 shadow-lg">
          <p className="text-[10px] text-blue-300 font-medium uppercase tracking-widest mb-1">Wallet Balance</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-white leading-none">₹{earningsTally.available.toLocaleString('en-IN')}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                <span className="text-[10px] font-semibold text-white">Available to Withdraw</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/technician/payout-settings')}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
            >
              Request Withdraw
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-blue-300 mt-2.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Withdraw requests are approved within 24 Hours
          </p>
        </div>

        {/* Stats Row */}
        <div className="mx-3 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <TrendingUp className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Total Earnings</p>
              <p className="text-sm font-bold text-[#0D47A1] mt-0.5">₹{earningsTally.total.toLocaleString('en-IN')}</p>
              <p className="text-[9px] text-slate-400">All Time</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-xl">
              <ClipboardList className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Jobs Completed</p>
              <p className="text-sm font-bold text-[#0D47A1] mt-0.5">{earningsTally.completedTotal}</p>
              <p className="text-[9px] text-slate-400">All Time</p>
            </div>
          </div>
        </div>

        {/* QuickPayout & InvoicePayout */}
        <div className="mx-3 grid grid-cols-2 gap-3">
          {/* QuickPayout */}
          <button
            onClick={() => navigate('/technician/earnings?tab=quick')}
            className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm text-left hover:border-[#0D47A1]/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <div className="p-1 bg-amber-50 rounded-lg">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-700">QuickPayout</p>
                  <p className="text-[9px] text-slate-400">D2C Services</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-[#0D47A1]">₹{earningsTally.split.quick.amount.toLocaleString('en-IN')}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[9px] text-slate-400">{earningsTally.split.quick.jobs} Jobs</p>
              <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded-full">Instant Credit</span>
            </div>
          </button>

          {/* InvoicePayout */}
          <button
            onClick={() => navigate('/technician/earnings?tab=invoice')}
            className="bg-[#0A2D6E] rounded-xl p-2.5 border border-[#0A2D6E] shadow-sm text-left hover:bg-[#0D3580] transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <div className="p-1 bg-white/15 rounded-lg">
                  <FileText className="h-3.5 w-3.5 text-blue-200" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-white">InvoicePayout</p>
                  <p className="text-[9px] text-blue-300">Invoice Jobs</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-blue-300" />
            </div>
            <p className="text-sm font-bold text-white">₹{earningsTally.split.invoice.amount.toLocaleString('en-IN')}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[9px] text-blue-300">{earningsTally.split.invoice.jobs} Jobs</p>
              <span className="text-[9px] font-semibold text-orange-300 bg-orange-500/20 border border-orange-400/30 px-1 py-0.5 rounded-full">Approval Pending</span>
            </div>
          </button>
        </div>

        {/* Recent Earnings Card */}
        <div className="mx-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => navigate('/technician/recent-earnings')}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors rounded-2xl text-left"
          >
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#052355]">Recent Earnings</p>
              <p className="text-[10px] text-slate-500 mt-0.5">View your recent earnings</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* Bank Account / Payout Method */}
        <div className="mx-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => navigate('/technician/payout-settings')}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors rounded-2xl text-left"
          >
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex-shrink-0">
              <Building2 className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#052355]">{primaryPayout ? (primaryPayout.type === 'bank' ? 'Bank Account' : 'UPI ID') : 'Payout Method'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{primaryPayout ? primaryPayout.name : 'No payout method linked'}</p>
              <p className="text-[10px] text-slate-400">
                {primaryPayout 
                  ? (primaryPayout.accountNo ? `A/C No. ••••••${primaryPayout.accountNo.slice(-4)}` : primaryPayout.upiId || '')
                  : 'Tap to configure for weekly earnings'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {primaryPayout && (
                <span className="text-[10px] font-semibold text-[#0D47A1] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Primary</span>
              )}
              <span className="text-xs font-semibold text-[#0D47A1]">{primaryPayout ? 'Manage' : 'Add'}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* Explore More Section */}
        <div className="mx-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setExploreOpen(prev => !prev)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-[#052355]">Explore More</h3>
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
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#052355]">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mx-3 mb-2">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-semibold"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

      </div>

      {/* Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-sm z-30 transition-all flex justify-start"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className="bg-white w-72 h-full shadow-2xl flex flex-col z-40 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#052355] text-white p-3.5 flex flex-col gap-3 relative">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 mt-2 shadow-md">
                <img src={techAvatar} alt="Alex Rodriguez Avatar Side" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-normal text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              {[
                { label: 'Dashboard (Jobs)', icon: <Briefcase className="h-5 w-5 text-slate-600" />, path: '/technician/dashboard' },
                { label: 'My Schedule', icon: <Calendar className="h-5 w-5 text-slate-600" />, path: '/technician/schedule' },
                { label: 'Part Requests', icon: <ClipboardList className="h-5 w-5 text-slate-600" />, path: '/technician/raise-part-request?tab=claims' },
                { label: 'My Inventory', icon: <Wrench className="h-5 w-5 text-slate-600" />, path: '/technician/inventory' },
                { label: 'Payout Settings', icon: <CreditCard className="h-5 w-5 text-slate-600" />, path: '/technician/payout-settings' },
                { label: 'KYC Verification', icon: <ShieldCheck className="h-5 w-5 text-slate-600" />, path: '/technician/verification' },
                { label: 'Help & Support', icon: <HelpCircle className="h-5 w-5 text-slate-600" />, path: '/technician/support' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { setIsSidebarOpen(false); navigate(item.path); }}
                  className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
                >
                  {item.icon}
                  <span className="text-xs font-normal">{item.label}</span>
                </button>
              ))}
              <div className="h-[1px] bg-slate-100 my-2 mx-5"></div>
              <button
                onClick={() => { setIsSidebarOpen(false); setShowLogoutConfirm(true); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-red-50/20 text-red-500 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-xs font-normal">Logout</span>
              </button>
            </div>
            <div className="p-3.5 border-t border-slate-200 text-left">
              <span className="text-[10px] font-normal text-slate-600">Partner App v2.4.1</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      {chatOpen && (
        <div
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-35 transition-all flex flex-col justify-end"
          onClick={() => setChatOpen(false)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col shadow-2xl relative border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
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
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 max-h-[45vh] min-h-[300px]">
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
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-2.5 bg-slate-50 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Ask AI Assistant..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-normal focus:outline-none focus:border-[#0D47A1]"
              />
              <button
                onClick={handleSendChatMessage}
                className="p-3 bg-[#0D47A1] hover:bg-[#0A3F91] text-white rounded-2xl transition-all shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-3.5 flex justify-around items-center z-20 shadow-lg">
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
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>

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

    </div>
  );
};

export default ProfilePage;
