import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Phone, MessageSquare, ChevronRight, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiRequest, getStoredTokens } from '../../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const TechnicalSupport = () => {
  const navigate = useNavigate();
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [supportChatInput, setSupportChatInput] = useState('');
  const [supportChatMessages, setSupportChatMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [chatError, setChatError] = useState('');
  const socketRef = useRef(null);

  // A real support conversation with the platform desk, over the same chat
  // gateway the rest of the app uses. This screen previously ran a keyword
  // matcher that invented technical answers and stock levels.
  useEffect(() => {
    if (!supportChatOpen || conversationId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest('/chat/conversations/support', { method: 'POST', auth: true });
        const convo = res;
        if (cancelled || !convo) return;
        setConversationId(convo.id);

        const history = await apiRequest(`/chat/conversations/${convo.id}/messages`, { auth: true });
        if (cancelled) return;
        setSupportChatMessages((history || []).map((m) => ({
          id: m.id,
          sender: m.sender === 'technician' ? 'user' : 'agent',
          text: m.text,
        })));

        const { accessToken } = getStoredTokens();
        const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => socket.emit('join-conversation', { conversationId: convo.id }));
        socket.on('message:new', (m) => {
          setSupportChatMessages((prev) => (
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, sender: m.sender === 'technician' ? 'user' : 'agent', text: m.text }]
          ));
        });
        socket.on('connect_error', () => setChatError('Lost connection to support.'));
      } catch (err) {
        if (!cancelled) setChatError(err.message || 'Could not reach support.');
      }
    })();

    return () => { cancelled = true; };
  }, [supportChatOpen, conversationId]);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const handleSendSupportMessage = () => {
    const text = supportChatInput.trim();
    if (!text || !socketRef.current || !conversationId) return;
    socketRef.current.emit('send-message', { conversationId, text }, (ack) => {
      if (!ack?.ok) setChatError(ack?.error || 'Message could not be sent.');
    });
    setSupportChatInput('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-[#052355] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (supportChatOpen) {
                setSupportChatOpen(false);
              } else {
                navigate(-1);
              }
            }} 
            className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
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
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#0D47A1] transition-all text-left w-full group cursor-pointer"
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
            className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-[#0D47A1] transition-all text-left w-full group cursor-pointer"
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

      {/* Support Chat Screen slide-over overlay */}
      {supportChatOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col font-sans overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-[#052355] text-white">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setSupportChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer"
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
              className="p-2.5 bg-[#0D47A1] hover:bg-[#0A3F91] text-white rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              <Send className="h-4.5 w-4.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalSupport;
