import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Briefcase, ClipboardList, Calendar, Wrench, User, Star, ChevronRight, 
  CreditCard, ShieldCheck, Award, Settings, LogOut, HelpCircle, X, Bell, Sparkles, TrendingUp, Send,
  ArrowLeft, Play, Phone, MessageSquare, BookOpen, AlertTriangle
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import techAvatar from '../../assets/tech_avatar.png';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { earningsTally, notifications, activeSpecs, toggleSpec } = useTech();

  // Sidebar drawer open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chat drawer states for AI Assistant menu option
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello Alex! I am your AI Assistant. How can I help you today?' }
  ]);

  // NCC Academy, Technical Support, and Announcements Overlay states
  const [academyOpen, setAcademyOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [selectedAcademyTab, setSelectedAcademyTab] = useState('All');
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [activeBlogId, setActiveBlogId] = useState(null);

  // Technical Support Live Chat states
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [supportChatInput, setSupportChatInput] = useState('');
  const [supportChatMessages, setSupportChatMessages] = useState([
    { id: 1, sender: 'agent', text: 'Hello Alex! I am Rahul from the NCC Technical Support Team. How can I help you on-site today?' }
  ]);


  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: chatInput }
    ]);
    
    const userText = chatInput;
    setChatInput('');

    setTimeout(() => {
      let reply = "I can assist you with HVAC diagnostic tips, earnings analytics, or inventory requests. What can I do for you?";
      const lowerText = userText.toLowerCase();
      if (lowerText.includes('part') || lowerText.includes('capacitor')) {
        reply = "Capacitor 45/5 MFD is in stock at NCC Warehouse. You can request it from your Inventory tab.";
      } else if (lowerText.includes('earn') || lowerText.includes('money') || lowerText.includes('analytics')) {
        reply = "You can view your full performance stats and withdraw balance from the Analytics tab.";
      } else if (lowerText.includes('schedule') || lowerText.includes('job')) {
        reply = "You have 3 confirmed jobs scheduled for Tuesday, May 14. Split AC Repair is your next appointment.";
      }
      setChatMessages(curr => [
        ...curr,
        { id: Date.now() + 1, sender: 'ai', text: reply }
      ]);
    }, 800);
  };

  const handleSendSupportMessage = () => {
    if (!supportChatInput.trim()) return;
    setSupportChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: supportChatInput }
    ]);
    
    const userText = supportChatInput;
    setSupportChatInput('');

    setTimeout(() => {
      let reply = "Got it. Let me check the technical guidelines for that issue. What model or brand is the unit?";
      const lowerText = userText.toLowerCase();
      if (lowerText.includes('leak') || lowerText.includes('water')) {
        reply = "For water leakage in split ACs, first check if the drain pipe is clogged or if the indoor unit is tilted. Clean the drain tray using a pressurized pump.";
      } else if (lowerText.includes('gas') || lowerText.includes('pressure') || lowerText.includes('charge')) {
        reply = "Standard suction pressure for R32 refrigerant should be around 110-130 PSI. Make sure to perform vacuuming before charging gas.";
      } else if (lowerText.includes('capacitor') || lowerText.includes('compressor')) {
        reply = "If the compressor is drawing high starting current (LRA) but not starting, check if the start capacitor is weak or needs a hard start kit.";
      }
      setSupportChatMessages(curr => [
        ...curr,
        { id: Date.now() + 1, sender: 'agent', text: reply }
      ]);
    }, 1000);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
        
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Profile</h1>
        
        <div className="w-8"></div> {/* Spacer to center the title */}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-6">
        
        {/* Profile Details Block */}
        <div className="flex flex-col items-center text-center">
          <div 
            onClick={() => navigate('/technician/personal-info')}
            className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-200 shadow-md hover:border-[#0D47A1] transition-all relative cursor-pointer group"
          >
            <img 
              src={techAvatar} 
              alt="Alex Rodriguez Avatar" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-[#052355]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-[10px] font-semibold">Edit</span>
            </div>
          </div>
          
          <h2 className="text-lg font-medium text-[#052355] mt-3">Alex Rodriguez</h2>
          <p className="text-xs text-slate-600 font-normal mt-0.5">Expert HVAC Technician</p>
          
          {/* Star Rating Badge */}
          <button 
            onClick={() => navigate('/technician/partner-level')}
            className="flex items-center gap-1.5 mt-2.5 bg-[#E3ECF9]/30 border border-[#0D47A1]/10 px-3 py-1 rounded-full cursor-pointer hover:bg-[#E3ECF9]/50 transition-colors focus:outline-none"
          >
            <Star className="h-3.5 w-3.5 text-[#FFD400] fill-[#FFD400]" />
            <span className="text-xs font-medium text-[#052355]">4.9</span>
            <span className="text-[10px] text-slate-600 font-normal">(120+ Reviews)</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Total Earnings Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Total Earnings</span>
            <p className="text-lg font-medium text-[#0D47A1] mt-1.5 text-center">
              ₹{earningsTally.total.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Jobs Completed Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide block">Jobs Completed</span>
            <p className="text-lg font-medium text-[#0D47A1] mt-1.5 text-center">
              {earningsTally.completedTotal}
            </p>
          </div>

        </div>

        {/* Menu Items List */}
        <div className="flex flex-col border-t border-slate-200 mt-2">
          
          {/* Notifications */}
          <button 
            onClick={() => navigate('/technician/notifications')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Bell className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Notifications</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Manage notifications & alerts</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* NCC Academy */}
          <button 
            onClick={() => setAcademyOpen(true)}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Award className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">NCC Academy</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Blogs and video for learning</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* Need Technical Support */}
          <button 
            onClick={() => setSupportOpen(true)}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <HelpCircle className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Need Technical Support</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Connect with support by call or message</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* Announcements */}
          <button 
            onClick={() => setAnnouncementsOpen(true)}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Bell className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Announcements</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Notice & alert from Headquarters</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>


          {/* Analytics */}
          <button 
            onClick={() => navigate('/technician/analytics')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <TrendingUp className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Analytics</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">View performance & earnings</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>


          {/* KYC Verification */}
          <button 
            onClick={() => navigate('/technician/verification')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">KYC Verification</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Aadhaar, PAN, Bank</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* Skills & Certifications */}
          <button 
            onClick={() => navigate('/technician/skills-certifications')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Award className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Skills & Certifications</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">HVAC, Refrigeration, AC</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* Partner Level & Allocations */}
          <button 
            onClick={() => navigate('/technician/partner-level')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Award className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Partner Level & Allocations</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">Tiers, ratings and automatic job specs</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

          {/* Settings */}
          <button 
            onClick={() => navigate('/technician/settings')}
            className="w-full py-3.5 flex items-center justify-between border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl">
                <Settings className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-medium text-[#052355]">Settings</h4>
                <p className="text-[10px] text-slate-600 font-normal mt-0.5">App preferences</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
          </button>

        </div>

      </div>

      {/* Sidebar Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-sm z-30 transition-all flex justify-start"
          onClick={() => setIsSidebarOpen(false)}
        >
          {/* Drawer Container */}
          <div 
            className="bg-white w-72 h-full shadow-2xl flex flex-col z-40 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Dark Blue Profile Section */}
            <div className="bg-[#052355] text-white p-3.5 flex flex-col gap-3 relative">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 mt-2 shadow-md">
                <img 
                  src={techAvatar} 
                  alt="Alex Rodriguez Avatar Side" 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <div>
                <h3 className="text-sm font-normal text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              
              {/* Dashboard / Jobs */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/dashboard'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Dashboard (Jobs)</span>
              </button>

              {/* My Schedule */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/schedule'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Calendar className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">My Schedule</span>
              </button>

              {/* Part Requests */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/raise-part-request?tab=claims'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ClipboardList className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Part Requests</span>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/inventory'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Wrench className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">My Inventory</span>
              </button>

              {/* Payout Settings */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/payout-settings'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Payout Settings</span>
              </button>

              {/* KYC Verification */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/verification'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ShieldCheck className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">KYC Verification</span>
              </button>

              {/* Help & Support */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/support'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <HelpCircle className="h-5 w-5 text-slate-600" />
                <span className="text-xs font-normal">Help & Support</span>
              </button>

              {/* Divider */}
              <div className="h-[1px] bg-slate-100 my-2 mx-5"></div>

              {/* Logout */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/login'); }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3.5 hover:bg-red-50/20 text-red-500 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-xs font-normal">Logout</span>
              </button>

            </div>

            {/* Version Info */}
            <div className="p-3.5 border-t border-slate-200 text-left">
              <span className="text-[10px] font-normal text-slate-600">Partner App v2.4.1</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Chat Panel Slide-over Drawer Overlay */}
      {chatOpen && (
        <div 
          className="absolute inset-0 bg-[#052355]/40 backdrop-blur-xs z-35 transition-all flex flex-col justify-end"
          onClick={() => setChatOpen(false)}
        >
          <div 
            className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col shadow-2xl relative border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
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

            {/* Chat Messages viewport */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 max-h-[45vh] min-h-[300px] no-scrollbar">
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

            {/* Chat Input form */}
            <div className="p-4 border-t border-slate-200 flex gap-2.5 bg-slate-50 rounded-b-none items-center">
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
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
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


      {/* ========================================================================= */}
      {/* 1. NCC ACADEMY OVERLAY */}
      {/* ========================================================================= */}
      {academyOpen && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col font-sans overflow-hidden">
          {/* Header */}
          <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (activeBlogId !== null) {
                    setActiveBlogId(null);
                  } else if (activeVideoUrl !== null) {
                    setActiveVideoUrl(null);
                  } else {
                    setAcademyOpen(false);
                  }
                }} 
                className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </button>
              <h1 className="text-base font-semibold text-white">NCC Academy</h1>
            </div>
            <Award className="h-5.5 w-5.5 text-[#FFD400] fill-[#FFD400]" />
          </div>

          {activeVideoUrl !== null ? (
            /* Mock Video Player Screen */
            <div className="flex-1 bg-black flex flex-col justify-between">
              {/* Video Player Box */}
              <div className="w-full aspect-video bg-slate-900 relative flex items-center justify-center border-b border-white/10 mt-auto mb-auto">
                <img 
                  src={activeVideoUrl}
                  alt="Video Thumbnail"
                  className="w-full h-full object-cover opacity-80"
                />
                {/* Playing overlay */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 rounded-full bg-[#0D47A1] text-white flex items-center justify-center animate-pulse shadow-lg mb-4">
                    <Play className="w-8 h-8 fill-white translate-x-0.5" />
                  </div>
                  <span className="text-sm font-medium text-white text-center">Streaming: Learning Course Video</span>
                  <span className="text-xs text-slate-300 mt-1">1080p HD • Live Playback Simulated</span>
                </div>
              </div>
              <div className="bg-[#052355] p-5 text-left rounded-t-3xl border-t border-white/10 text-white">
                <span className="bg-[#00C853] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">AC REPAIR COURSE</span>
                <h3 className="text-sm font-semibold mt-2">Professional Split AC Gas Charging & Leak Detection Methods</h3>
                <p className="text-xs text-slate-300 mt-1.5 font-normal leading-relaxed">
                  In this module, senior trainer Inderjeet Singh demonstrates R32 and R410a gas charging techniques, manifold gauge operation, safety guidelines, and pressure checks.
                </p>
                <button
                  onClick={() => setActiveVideoUrl(null)}
                  className="mt-6 w-full py-3 bg-white text-[#052355] font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Close Player
                </button>
              </div>
            </div>
          ) : activeBlogId !== null ? (() => {
            const blog = [
              { id: 1, title: 'R32 Refrigerant Gas Safety Protocol', category: 'Safety Guide', readTime: '5 mins read', author: 'Safety HQ Team', desc: 'R32 is a mildly flammable (A2L) refrigerant. Ensure the following steps are met on-site:\n\n1. Ventilation: Never work in unventilated closed rooms. Open windows or use portable fans.\n2. Leak Test: Perform bubble leak tests or use electronic halogen leak detectors before power connection.\n3. Vacuuming: Use a dedicated vacuum pump to purge moisture and air to 500 microns. Never purge using refrigerant.\n4. Gear: Wear fire-resistant gloves and safety goggles during charging.' },
              { id: 2, title: 'Diagnostic Codes for Inverter Air Conditioners', category: 'Troubleshooting', readTime: '8 mins read', author: 'Technical Support Head', desc: 'Inverter ACs communicate error codes via LED blinks on the outdoor board or codes on the display:\n\n- E1: Indoor & Outdoor Communication Fault. Check connection cable contacts and terminal block.\n- E6: Fan Motor Error. Verify fan capacitor and motor resistance.\n- F1: Compressor Overcurrent Protection. Check refrigerant charge amount and starting capacitor voltage.\n- F5: Discharge Pipe Temperature sensor fault. Replace NTC thermistor.' },
              { id: 3, title: 'Customer Service & Communication Guide', category: 'Soft Skills', readTime: '4 mins read', author: 'Customer Service Lead', desc: 'Maximized ratings lead to higher incentive multipliers:\n\n1. Greeting: Smile and greet the customer. Keep your shoes outside or wear boot covers.\n2. Explanation: Show the customer the diagnosed issue before replacement (e.g. show high current draw or bad capacitor test on multimeter).\n3. Cleanliness: Post repair, clean any grease or dust around the appliance. Do not leave wire clippings.' }
            ].find(b => b.id === activeBlogId);
            
            return (
              <div className="flex-1 bg-white flex flex-col overflow-y-auto p-5 text-left">
                <span className="bg-[#0D47A1]/10 text-[#0D47A1] text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider w-fit">{blog?.category}</span>
                <h2 className="text-base font-semibold text-[#052355] mt-2.5 leading-tight">{blog?.title}</h2>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-normal mt-2 border-b border-slate-100 pb-3">
                  <span>Author: {blog?.author}</span>
                  <span>{blog?.readTime}</span>
                </div>
                <div className="text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line mt-4 flex-1">
                  {blog?.desc}
                </div>
                <button
                  onClick={() => setActiveBlogId(null)}
                  className="mt-6 w-full py-3 bg-[#0D47A1] text-white font-semibold text-xs rounded-xl text-center shadow-sm hover:bg-[#0A3F91] transition-all"
                >
                  Back to Learning Hub
                </button>
              </div>
            );
          })() : (
            /* Academy Hub List */
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-slate-50 pb-8 text-left">
              {/* Category selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {['All', 'Video Lessons', 'Tech Blogs'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedAcademyTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      selectedAcademyTab === tab 
                        ? 'bg-[#0D47A1] text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Videos Section */}
              {(selectedAcademyTab === 'All' || selectedAcademyTab === 'Video Lessons') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Play className="w-4.5 h-4.5 text-[#0D47A1] fill-[#0D47A1]/10" />
                    <h3 className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Video Lessons</h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Video 1 */}
                    <div 
                      onClick={() => setActiveVideoUrl('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80')}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <div className="w-28 bg-slate-200 relative aspect-video flex-shrink-0 flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80" 
                          alt="Video Thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs font-semibold text-[#052355] line-clamp-2 leading-tight">AC Gas Charging & Pressure Check</h4>
                        <span className="text-[9px] text-slate-500 font-normal mt-1 block">12 mins • 1.2k views</span>
                      </div>
                    </div>

                    {/* Video 2 */}
                    <div 
                      onClick={() => setActiveVideoUrl('https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=300&q=80')}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <div className="w-28 bg-slate-200 relative aspect-video flex-shrink-0 flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=300&q=80" 
                          alt="Video Thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs font-semibold text-[#052355] line-clamp-2 leading-tight">Inverter AC PCB Board Diagnosis</h4>
                        <span className="text-[9px] text-slate-500 font-normal mt-1 block">18 mins • 850 views</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blogs Section */}
              {(selectedAcademyTab === 'All' || selectedAcademyTab === 'Tech Blogs') && (
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <BookOpen className="w-4.5 h-4.5 text-[#0D47A1]" />
                    <h3 className="text-xs font-semibold text-[#052355] uppercase tracking-wider">Technical Knowledge Blogs</h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Blog 1 */}
                    <div 
                      onClick={() => setActiveBlogId(1)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <span className="text-[9px] font-semibold text-[#00C853] bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Safety Guide</span>
                      <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">R32 Refrigerant Gas Safety Protocol</h4>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-normal">Guidelines for charging flammable gases on-site and necessary vacuuming steps.</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                        <span>By Safety HQ</span>
                        <span>5 mins read</span>
                      </div>
                    </div>

                    {/* Blog 2 */}
                    <div 
                      onClick={() => setActiveBlogId(2)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Troubleshooting</span>
                      <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">Diagnostic Codes for Inverter Air Conditioners</h4>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-normal">E1, E6, F1 error code quick reference guide for HVAC technicians on job.</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                        <span>By Tech Lead</span>
                        <span>8 mins read</span>
                      </div>
                    </div>

                    {/* Blog 3 */}
                    <div 
                      onClick={() => setActiveBlogId(3)}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Soft Skills</span>
                      <h4 className="text-xs font-semibold text-[#052355] mt-2 leading-tight">Customer Service & Communication Guide</h4>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-normal">Professional etiquette tips to maximize ratings and avoid customer complaints.</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
                        <span>By CS Lead</span>
                        <span>4 mins read</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. NEED TECHNICAL SUPPORT OVERLAY */}
      {/* ========================================================================= */}
      {supportOpen && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col font-sans overflow-hidden">
          {/* Header */}
          <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSupportOpen(false)} 
                className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </button>
              <h1 className="text-base font-semibold text-white">Technical Support</h1>
            </div>
            <HelpCircle className="h-5.5 w-5.5 text-white/90" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 bg-slate-50 text-left">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-[#0D47A1] text-white rounded-3xl p-5 shadow-md">
              <h3 className="text-sm font-semibold">On-Site Technical Helpline</h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed font-normal">
                Facing challenges during repair? Connect with our senior support desk engineers directly by phone call or chat message.
              </p>
            </div>

            {/* Action List */}
            <div className="flex flex-col gap-4">
              {/* Option 1: Call Support */}
              <button
                type="button"
                onClick={() => window.location.href = 'tel:+18006228324'}
                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#0D47A1] transition-all text-left w-full group"
              >
                <div className="p-3 bg-[#E8F1FF] text-[#0D47A1] rounded-2xl group-hover:bg-[#0D47A1] group-hover:text-white transition-all">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#052355]">Call Technical Support</h4>
                  <p className="text-[10px] text-[#0D47A1] mt-0.5 font-medium">Helpline: +1800-NCC-TECH</p>
                  <p className="text-[9px] text-slate-500 font-normal mt-1 leading-tight">Direct line connection (Daily 9:00 AM - 8:00 PM)</p>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </button>

              {/* Option 2: Live Chat */}
              <button
                type="button"
                onClick={() => setSupportChatOpen(true)}
                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#0D47A1] transition-all text-left w-full group"
              >
                <div className="p-3 bg-green-50 text-[#00C853] rounded-2xl group-hover:bg-[#00C853] group-hover:text-white transition-all">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#052355]">Message Support Team</h4>
                  <p className="text-[10px] text-[#00C853] mt-0.5 font-medium">Live Chat (Online Now)</p>
                  <p className="text-[9px] text-slate-500 font-normal mt-1 leading-tight">Send system questions or upload photos for codes verification.</p>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat Screen slide-over overlay */}
      {supportChatOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col font-sans overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-[#052355] text-white">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setSupportChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h3 className="text-sm font-semibold text-white">Rahul - Technical Support</h3>
                <p className="text-[9px] text-[#00C853] font-semibold mt-0.5 uppercase tracking-wide">NCC Senior Desk Engineer</p>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-pulse mr-1"></div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-left">
            {supportChatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-normal leading-relaxed shadow-sm border ${
                  msg.sender === 'user'
                    ? 'bg-[#0D47A1] text-white border-[#0D47A1]/20 rounded-tr-none'
                    : 'bg-white text-[#052355] border-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Panel */}
          <div className="p-3 border-t border-slate-200 flex gap-2.5 bg-slate-50 items-center">
            <input 
              type="text" 
              value={supportChatInput}
              onChange={(e) => setSupportChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendSupportMessage(); }}
              placeholder="Explain issue (e.g. AC water leakage, suction pressure)..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-normal focus:outline-none focus:border-[#0D47A1]"
            />
            <button 
              onClick={handleSendSupportMessage}
              className="p-2.5 bg-[#0D47A1] hover:bg-[#0A3F91] text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
            >
              <Send className="h-4.5 w-4.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ANNOUNCEMENTS OVERLAY */}
      {/* ========================================================================= */}
      {announcementsOpen && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col font-sans overflow-hidden">
          {/* Header */}
          <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setAnnouncementsOpen(false)} 
                className="p-1 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </button>
              <h1 className="text-base font-semibold text-white">Announcements</h1>
            </div>
            <Bell className="h-5.5 w-5.5 text-white/90" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50 text-left pb-8">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notice & alert from Headquarters</span>

            {/* List of Notices */}
            <div className="flex flex-col gap-4">
              {/* Notice 1: Critical */}
              <div className="bg-white rounded-3xl p-4 border-l-4 border-red-500 border-y border-r border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="bg-red-50 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    CRITICAL SAFETY ALERT
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">2 hours ago</span>
                </div>
                <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Double-Harness Safety Mandatory Above 2nd Floor</h4>
                <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
                  Headquarters requires all service partners to wear double-harness safety gear for outdoor unit AC works. You must take and upload a selfie wearing safety harness before commencing work. Payout holds apply for safety violations.
                </p>
              </div>

              {/* Notice 2: Incentive */}
              <div className="bg-white rounded-3xl p-4 border-l-4 border-amber-500 border-y border-r border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    MONSOON SCHEME
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">1 day ago</span>
                </div>
                <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">1.5x Incentive on AC Wet Servicing</h4>
                <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
                  Get a 1.5x earnings multiplier on all preventive wet cleaning and leakage calls completed between 2:00 PM and 6:00 PM this week. Make sure to upsell additional services (jet cleaning, outdoor unit check) to customer.
                </p>
              </div>

              {/* Notice 3: App Update */}
              <div className="bg-white rounded-3xl p-4 border-l-4 border-blue-500 border-y border-r border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    APP UPDATE
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">3 days ago</span>
                </div>
                <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Partner App v2.4.1 Released</h4>
                <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
                  Please update your Nigam Care Partner App immediately from the Play Store. This update improves live GPS precision and resolves real-time spare part inventory syncing issues.
                </p>
              </div>

              {/* Notice 4: Payout timing */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="bg-slate-50 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    PAYMENT NOTICE
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">5 days ago</span>
                </div>
                <h4 className="text-xs font-semibold text-[#052355] mt-2.5 leading-snug">Weekly Payout Timing Update</h4>
                <p className="text-[10px] text-slate-650 font-normal mt-1 leading-relaxed">
                  Due to the upcoming National Bank Holiday on Wednesday, June 24th, payouts will be dispatched to your registered bank account on June 25th instead. Bank transfers may take up to 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
