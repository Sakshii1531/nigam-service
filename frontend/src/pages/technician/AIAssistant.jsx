import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Mic, Send, Search, Sparkles, ShieldCheck, Calculator, Compass
} from 'lucide-react';
import robotImg from '../../assets/ai_assistant_robot.png';
import { apiRequest } from '../../lib/apiClient';

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

  const [sending, setSending] = useState(false);

  // The assistant answers from this technician's real job and van stock, which
  // the server assembles per request. It replaced a keyword matcher that stated
  // invented stock levels and a named customer's warranty date.
  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = [...messages, { id: Date.now(), sender: 'user', text: trimmed }];
    setMessages(history);
    setInputValue('');
    setSending(true);

    try {
      const res = await apiRequest('/tech/assistant', {
        method: 'POST',
        auth: true,
        body: {
          messages: history.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        },
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: res.reply }]);
    } catch (err) {
      // 503 means the assistant isn't configured on this deployment; anything
      // else is a real failure. Either way, offer the human desk.
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: err.status === 503
          ? "The assistant isn't available on this deployment yet."
          : err.message || 'Could not reach the assistant.',
        offerSupport: true,
      }]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    { label: 'Find Spare Part', icon: <Search className="h-4 w-4 text-[#0D47A1]" />, prompt: 'What spare parts do I have in my van stock right now?' },
    { label: 'Diagnostic Help', icon: <Sparkles className="h-4 w-4 text-[#0D47A1]" />, prompt: 'Help me diagnose the issue on my current job.' },
    { label: 'Warranty Check', icon: <ShieldCheck className="h-4 w-4 text-[#0D47A1]" />, prompt: 'Is my current job covered under warranty?' },
    { label: 'Estimate Help', icon: <Calculator className="h-4 w-4 text-[#0D47A1]" />, prompt: 'Help me put together an estimate for my current job.' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">AI Assistant</h1>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-5">
        
        {/* Initial Robot and Greeting View */}
        <div className="flex flex-col gap-5 items-center">
          
          {/* Robot Card Wrapper with blue/white gradient */}
          <div className="w-full bg-gradient-to-b from-[#E3ECF9]/40 to-[#E3ECF9]/10 rounded-[2.5rem] p-4 flex justify-center items-center relative overflow-hidden border border-[#E3ECF9]/20 shadow-sm">
            <img 
              src={robotImg} 
              alt="AI Robot Assistant" 
              className="w-44 h-44 object-contain drop-shadow-md transform hover:scale-105 transition-all duration-300"
            />
          </div>

          {/* Greeting Speech Card */}
          <div className="w-full bg-white rounded-3xl p-3.5 border border-slate-200 shadow-sm text-left relative">
            <h3 className="text-sm font-medium text-[#052355]">Hello Alex! 👋</h3>
            <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed">
              I am your AI Assistant. How can I help you today?
            </p>
          </div>

          {/* Quick Prompts Grid */}
          {messages.length === 0 && (
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.prompt)}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm hover:shadow-sm hover:border-slate-200 transition-all text-left group"
                >
                  <div className="p-2 bg-slate-50 group-hover:bg-[#E3ECF9]/40 rounded-xl transition-colors">
                    {p.icon}
                  </div>
                  <span className="text-[11px] font-medium text-[#052355] leading-snug">{p.label}</span>
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
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-normal leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#0D47A1] text-white rounded-tr-none' 
                    : 'bg-white text-[#052355] border border-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                  {msg.offerSupport && (
                    <button
                      onClick={() => navigate('/technician/technical-support')}
                      className="mt-2 block w-full bg-[#0D47A1] text-white font-semibold text-[11px] py-2 rounded-xl"
                    >
                      Open Technical Support
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* Bottom Input Pill Bar */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center bg-[#F1F5F9]/60 border border-slate-200 rounded-full px-3.5 py-1.5 gap-2.5">
          <Compass className="h-5 w-5 text-slate-600" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(inputValue); }}
            placeholder="Tap to speak..."
            className="flex-1 bg-transparent border-0 text-xs font-normal placeholder-slate-400 focus:outline-none focus:ring-0 py-2.5"
          />
          {inputValue.trim() ? (
            <button 
              onClick={() => handleSendMessage(inputValue)}
              disabled={sending}
              className="w-9 h-9 bg-[#0D47A1] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4.5 w-4.5 stroke-[2.5]" />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/technician/technical-support')}
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
