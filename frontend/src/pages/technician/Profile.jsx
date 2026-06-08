import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Briefcase, ClipboardList, Calendar, Wrench, User, Star, ChevronRight, 
  CreditCard, ShieldCheck, Award, Settings, LogOut, HelpCircle, X, Bell, Sparkles, TrendingUp, Send
} from 'lucide-react';
import { useTech } from '../../context/TechContext';
import techAvatar from '../../assets/tech_avatar.png';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { earningsTally, notifications } = useTech();

  // Sidebar drawer open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chat drawer states for AI Assistant menu option
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello Alex! I am your AI Assistant. How can I help you today?' }
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

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
        
        <h1 className="text-base font-extrabold text-[#052355] flex-1 text-center pr-8">Profile</h1>
        
        <div className="w-8"></div> {/* Spacer to center the title */}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col gap-6">
        
        {/* Profile Details Block */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-md">
            <img 
              src={techAvatar} 
              alt="Alex Rodriguez Avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <h2 className="text-lg font-black text-[#052355] mt-3">Alex Rodriguez</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">Expert HVAC Technician</p>
          
          {/* Star Rating Badge */}
          <div className="flex items-center gap-1.5 mt-2.5 bg-[#E3ECF9]/30 border border-[#0D47A1]/10 px-3 py-1 rounded-full">
            <Star className="h-3.5 w-3.5 text-[#FFD400] fill-[#FFD400]" />
            <span className="text-xs font-black text-[#052355]">4.9</span>
            <span className="text-[10px] text-slate-400 font-bold">(120+ Reviews)</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Total Earnings Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Total Earnings</span>
            <p className="text-lg font-black text-[#0D47A1] mt-1.5 text-center">
              ₹{earningsTally.total.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Jobs Completed Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Jobs Completed</span>
            <p className="text-lg font-black text-[#0D47A1] mt-1.5 text-center">
              {earningsTally.completedTotal}
            </p>
          </div>

        </div>

        {/* Menu Items List */}
        <div className="flex flex-col border-t border-slate-100 mt-2">
          
          {/* Notifications */}
          <button 
            onClick={() => navigate('/technician/notifications')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <Bell className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">Notifications</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage notifications & alerts</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-300" />
          </button>

          {/* AI Assistant */}
          <button 
            onClick={() => navigate('/technician/ai-assistant')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <Sparkles className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">AI Assistant</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Chat with diagnostic assistant</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-300" />
          </button>

          {/* Analytics */}
          <button 
            onClick={() => navigate('/technician/analytics')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <TrendingUp className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">Analytics</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">View performance & earnings</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-300" />
          </button>

          {/* Payout Settings */}
          <button 
            onClick={() => navigate('/technician/payout-settings')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <CreditCard className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">Payout Settings</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage bank & payouts</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-350" />
          </button>

          {/* KYC Verification */}
          <button 
            onClick={() => navigate('/technician/verification')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">KYC Verification</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Aadhaar, PAN, Bank</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-350" />
          </button>

          {/* Skills & Certifications */}
          <button 
            onClick={() => alert('Viewing skills & certifications...')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <Award className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">Skills & Certifications</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">HVAC, Refrigeration, AC</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-350" />
          </button>

          {/* Settings */}
          <button 
            onClick={() => alert('Opening settings...')}
            className="w-full py-4.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl">
                <Settings className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#052355]">Settings</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">App preferences</p>
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 text-slate-300" />
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
            <div className="bg-[#052355] text-white p-5 flex flex-col gap-3 relative">
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
                <h3 className="text-sm font-bold text-white leading-tight">Alex Rodriguez</h3>
                <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Expert HVAC Technician • ★ 4.9</p>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
              
              {/* Dashboard / Jobs */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/dashboard'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Dashboard (Jobs)</span>
              </button>

              {/* My Schedule */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/schedule'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Calendar className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">My Schedule</span>
              </button>

              {/* Part Requests */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/raise-part-request?tab=claims'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ClipboardList className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Part Requests</span>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/inventory'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <Wrench className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">My Inventory</span>
              </button>

              {/* Payout Settings */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/payout-settings'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Payout Settings</span>
              </button>

              {/* KYC Verification */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/verification'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">KYC Verification</span>
              </button>

              {/* Help & Support */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/support'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-slate-50 text-slate-600 hover:text-[#0D47A1] transition-colors text-left"
              >
                <HelpCircle className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold">Help & Support</span>
              </button>

              {/* Divider */}
              <div className="h-[1px] bg-slate-100 my-2 mx-5"></div>

              {/* Logout */}
              <button 
                onClick={() => { setIsSidebarOpen(false); navigate('/technician/login'); }}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-red-50/20 text-red-500 transition-colors text-left"
              >
                <LogOut className="h-5 w-5 text-red-400" />
                <span className="text-xs font-bold">Logout</span>
              </button>

            </div>

            {/* Version Info */}
            <div className="p-5 border-t border-slate-100 text-left">
              <span className="text-[10px] font-bold text-slate-400">Partner App v2.4.1</span>
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
            className="bg-white rounded-t-[2.5rem] max-h-[85vh] flex flex-col shadow-2xl relative border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#052355] text-white rounded-t-[2.5rem]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="h-5 w-5 text-[#FFD400] fill-[#FFD400]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Diagnostic Assistant</h3>
                  <p className="text-[10px] text-slate-300 font-semibold">Online • Ready to assist</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Chat Messages viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[45vh] min-h-[300px] no-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-3xl p-3.5 text-xs font-semibold leading-relaxed shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1]/20 rounded-br-none' 
                      : 'bg-slate-50 text-[#052355] border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-4 border-t border-slate-100 flex gap-2.5 bg-slate-50 rounded-b-none items-center">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Ask AI Assistant..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]"
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 py-3 px-6 flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-bold tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-black tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default ProfilePage;
