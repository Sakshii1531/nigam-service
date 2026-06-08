import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Mic, Send, Search, Sparkles, ShieldCheck, Calculator, Compass
} from 'lucide-react';
import robotImg from '../../assets/ai_assistant_robot.png';

const AIAssistant = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Trigger AI response
    setTimeout(() => {
      let replyText = "I'm checking that for you. Is there anything specific about it you need to know?";
      const lower = text.toLowerCase();
      
      if (lower.includes('part') || lower.includes('spare')) {
        replyText = "🔍 Inventory Search: Capacitor 45/5 MFD is currently in stock at the Lucknow Hub (6 units remaining). Outdoor Fan Motor is out of stock.";
      } else if (lower.includes('diagnos') || lower.includes('help')) {
        replyText = "🔧 Diagnostic Guide: For Voltas Split AC 'E6' error, check the indoor-outdoor communication cable. For LG Refrigerator noise, inspect the evaporator fan blade.";
      } else if (lower.includes('warranty') || lower.includes('check')) {
        replyText = "🛡️ Warranty Status: Job #8843 for LG Refrigerator is under Active Partner Warranty. Mrs. Neha Verma's unit is covered until May 2027.";
      } else if (lower.includes('estimate') || lower.includes('cost')) {
        replyText = "📊 Price Estimator: Split AC Repair standard D2C rate is ₹2,200 (including gas check). Your estimated payout is ₹850.";
      } else if (lower.includes('hello') || lower.includes('hi')) {
        replyText = "Hello! I am your HVAC assistant. Ask me about diagnostics, spare parts inventory, or job estimates!";
      }

      const aiMsg = { id: Date.now() + 1, sender: 'ai', text: replyText };
      setMessages(prev => [...prev, aiMsg]);
    }, 800);
  };

  const quickPrompts = [
    { label: 'Find Spare Part', icon: <Search className="h-4 w-4 text-[#0D47A1]" /> },
    { label: 'Diagnostic Help', icon: <Sparkles className="h-4 w-4 text-[#0D47A1]" /> },
    { label: 'Warranty Check', icon: <ShieldCheck className="h-4 w-4 text-[#0D47A1]" /> },
    { label: 'Estimate Help', icon: <Calculator className="h-4 w-4 text-[#0D47A1]" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col max-w-md mx-auto border-x border-slate-100 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-[#052355] flex-1 text-center pr-8">AI Assistant</h1>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        
        {/* Initial Robot and Greeting View */}
        <div className="flex flex-col gap-5 items-center">
          
          {/* Robot Card Wrapper with blue/white gradient */}
          <div className="w-full bg-gradient-to-b from-[#E3ECF9]/40 to-[#E3ECF9]/10 rounded-[2.5rem] p-6 flex justify-center items-center relative overflow-hidden border border-[#E3ECF9]/20 shadow-2xs">
            <img 
              src={robotImg} 
              alt="AI Robot Assistant" 
              className="w-44 h-44 object-contain drop-shadow-md transform hover:scale-105 transition-all duration-300"
            />
          </div>

          {/* Greeting Speech Card */}
          <div className="w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs text-left relative">
            <h3 className="text-sm font-black text-[#052355]">Hello Alex! 👋</h3>
            <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
              I am your AI Assistant. How can I help you today?
            </p>
          </div>

          {/* Quick Prompts Grid */}
          {messages.length === 0 && (
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.label)}
                  className="bg-white border border-slate-100 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-2xs hover:shadow-xs hover:border-slate-200 transition-all text-left group"
                >
                  <div className="p-2 bg-slate-50 group-hover:bg-[#E3ECF9]/40 rounded-xl transition-colors">
                    {p.icon}
                  </div>
                  <span className="text-[11px] font-extrabold text-[#052355] leading-snug">{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Chat Messages */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-4.5 mt-2">
            <div className="h-[1px] bg-slate-100 my-1"></div>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed shadow-3xs ${
                  msg.sender === 'user' 
                    ? 'bg-[#0D47A1] text-white rounded-tr-none' 
                    : 'bg-white text-[#052355] border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* Bottom Input Pill Bar */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center bg-[#F1F5F9]/60 border border-slate-100 rounded-full px-4.5 py-1.5 gap-2.5">
          <Compass className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(inputValue); }}
            placeholder="Tap to speak..."
            className="flex-1 bg-transparent border-0 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-0 py-2.5"
          />
          {inputValue.trim() ? (
            <button 
              onClick={() => handleSendMessage(inputValue)}
              className="w-9 h-9 bg-[#0D47A1] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          ) : (
            <button 
              onClick={() => handleSendMessage("Help me diagnose a Split AC issue")}
              className="w-9 h-9 bg-[#0D47A1] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Mic className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default AIAssistant;
