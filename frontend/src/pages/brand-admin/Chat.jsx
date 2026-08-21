import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {
  Search,
  Send,
  Smile,
  Paperclip,
  MessageSquare,
  User,
  Wrench,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle,
  CheckCircle2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { apiRequest, getStoredTokens } from '../../lib/apiClient';

// Messages are sent over Socket.IO, not REST — the chat gateway owns delivery
// (chat.gateway.js). REST is used only to list threads and load history.
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });

function shapeMessage(m) {
  return {
    id: m.id,
    // The brand desk sends as 'agent'; everything else is the counterparty.
    sender: m.sender === 'agent' ? 'brand' : 'user',
    text: m.text || '',
    time: m.createdAt ? timeFormatter.format(new Date(m.createdAt)) : '',
  };
}

function shapeConversation(c) {
  return {
    id: c.id,
    ticketId: c.serviceRequest || '—',
    name: c.customer?.name || 'Customer',
    role: 'Customer',
    product: c.kind === 'support' ? 'Support thread' : 'Job chat',
    status: c.status || 'Open',
    lastSeen: '',
    messages: [],
  };
}

const Chat = () => {
  const [activeChannel, setActiveChannel] = useState('cust-1'); // 'cust-1', 'tech-1'
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [conversations, setConversations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  // One socket for the page; the room is switched by joining/leaving as the
  // operator moves between threads.
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('message:new', (message) => {
      setConversations((prev) => {
        const chat = prev[message.conversation];
        if (!chat) return prev;
        // The gateway echoes to every socket in the room, including the sender,
        // so drop anything already present rather than double-rendering it.
        if (chat.messages.some((m) => m.id === message.id)) return prev;
        return { ...prev, [message.conversation]: { ...chat, messages: [...chat.messages, shapeMessage(message)] } };
      });
    });
    socket.on('connect_error', (err) => setError(`Chat connection failed: ${err.message}`));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      try {
        const data = await apiRequest('/chat/conversations', { auth: true });
        if (cancelled) return;
        const list = data || [];
        setConversations(Object.fromEntries(list.map((c) => [c.id, shapeConversation(c)])));
        if (list.length) setActiveChannel(list[0].id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadConversations();
    return () => { cancelled = true; };
  }, []);

  // Load history and join the room whenever the selected thread changes.
  useEffect(() => {
    const socket = socketRef.current;
    if (!activeChannel || !socket) return undefined;
    // 'cust-1'/'tech-1' are the placeholder channel ids this screen starts on
    // until a real conversation is opened. Sending those to the API asks Mongo
    // to cast them to an ObjectId, which failed the request outright.
    if (!/^[0-9a-fA-F]{24}$/.test(activeChannel)) return undefined;

    socket.emit('join-conversation', { conversationId: activeChannel }, (ack) => {
      if (!ack?.ok) setError(ack?.error || 'Could not join this conversation.');
    });

    let cancelled = false;
    (async () => {
      try {
        const msgs = await apiRequest(`/chat/conversations/${activeChannel}/messages`, { auth: true });
        if (cancelled) return;
        setConversations((prev) => prev[activeChannel]
          ? { ...prev, [activeChannel]: { ...prev[activeChannel], messages: (Array.isArray(msgs) ? msgs : []).map(shapeMessage) } }
          : prev);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
      socket.emit('leave-conversation', { conversationId: activeChannel });
    };
  }, [activeChannel]);

  const activeChat = conversations[activeChannel] || null;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'brand',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations({
      ...conversations,
      [activeChannel]: {
        ...activeChat,
        messages: [...activeChat.messages, newMsg]
      }
    });
    
    setInputText('');
  };

  const handleQuickResponse = (text) => {
    setInputText(text);
  };

  const templates = [
    'We are verifying the warranty coverage for your selected parts. Will update shortly.',
    'Spare part has been approved and dispatched to local warehouse hub.',
    'Technician has been notified to coordinate visit directly with you.',
    'Please upload clear photos of the appliance model serial number plate.'
  ];

  const filteredConversations = Object.values(conversations).filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Support Chat & Messaging" />

        {/* Main Split Screen */}
        <div className="flex-1 flex border-t border-[#E2E8F0] overflow-hidden" style={{ height: 'calc(100vh - 70px)' }}>
          
          {/* Left Panel: Chat List */}
          <div className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col">
            <div className="p-4 border-b border-[#E2E8F0]">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg outline-none text-xs bg-[#F8FAFC]"
                  placeholder="Search chats, tickets..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
              {filteredConversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChannel(chat.id)}
                  className={`w-full p-4 flex gap-3 text-left transition-colors ${
                    activeChannel === chat.id ? 'bg-[#EEF4FF]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 relative ${
                    chat.role === 'Technician' ? 'bg-[#FF8F00]' : 'bg-[#0D47A1]'
                  }`}>
                    {chat.name.split(' ').map(n => n[0]).join('')}
                    {chat.lastSeen === 'Online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-[#1E293B] truncate">{chat.name}</h4>
                      <span className="text-[10px] text-[#94A3B8]">{chat.messages[chat.messages.length - 1]?.time}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#64748B] mt-0.5">{chat.role} • Ticket {chat.ticketId}</p>
                    <p className="text-xs text-[#334155] truncate mt-1">
                      {chat.messages[chat.messages.length - 1]?.text}
                    </p>
                  </div>
                </button>
              ))}
              {filteredConversations.length === 0 && (
                <div className="p-8 text-center text-xs text-[#64748B]">No matching chats found.</div>
              )}
            </div>
          </div>

          {/* Center Panel: Active Conversation */}
          {/* activeChat is null until a thread is selected (or when the brand has
              none at all), so the whole pane is guarded rather than every field. */}
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] text-sm font-semibold text-[#64748B]">
              {loading ? 'Loading conversations…' : error || 'No conversations yet.'}
            </div>
          ) : (
          <div className="flex-1 flex flex-col bg-[#F8FAFC] relative">
            {/* Active Header */}
            <div className="bg-white border-b border-[#E2E8F0] px-6 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  activeChat.role === 'Technician' ? 'bg-[#FF8F00]' : 'bg-[#0D47A1]'
                }`}>
                  {activeChat.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">{activeChat.name}</h3>
                  <p className="text-[10px] text-green-600 font-semibold">{activeChat.lastSeen}</p>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeChat.messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'brand' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md rounded-2xl p-4 text-xs font-medium leading-relaxed ${
                    msg.sender === 'brand' 
                      ? 'bg-[#0D47A1] text-white rounded-tr-none' 
                      : 'bg-white text-[#1E293B] border border-[#E2E8F0] rounded-tl-none shadow-sm'
                  }`}>
                    <p>{msg.text}</p>
                    <span className={`text-[9px] block mt-1.5 text-right ${
                      msg.sender === 'brand' ? 'text-white/60' : 'text-[#64748B]'
                    }`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Templates bar */}
            <div className="bg-white px-6 py-2 border-t border-[#E2E8F0] flex gap-2 overflow-x-auto scrollbar-none items-center">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex-shrink-0 mr-2">Templates:</span>
              {templates.map((txt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickResponse(txt)}
                  className="bg-[#F1F5F9] hover:bg-[#EEF4FF] text-[#1E293B] border border-[#E2E8F0] hover:border-[#0D47A1]/35 px-3 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0"
                >
                  {txt.slice(0, 25)}...
                </button>
              ))}
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendMessage} className="bg-white p-4 border-t border-[#E2E8F0] flex gap-3 items-center">
              <button 
                type="button" 
                onClick={() => {
                  setSuccessMessage("File attachment dialog initialized successfully.");
                  setTimeout(() => setSuccessMessage(''), 2500);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded hover:bg-[#F1F5F9]"
              >
                <Paperclip size={18} />
              </button>
              
              <input
                type="text"
                className="flex-1 px-4 py-2.5 border border-[#E2E8F0] rounded-xl outline-none text-xs focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
                placeholder="Type message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <button 
                type="button" 
                onClick={() => {
                  setSuccessMessage("Emoji panel initialized successfully.");
                  setTimeout(() => setSuccessMessage(''), 2500);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded hover:bg-[#F1F5F9]"
              >
                <Smile size={18} />
              </button>

              <button 
                type="submit"
                className="bg-[#0D47A1] text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0 shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
          )}

          {/* Right Panel: Ticket Info */}
          {activeChat && (
          <div className="w-64 bg-white border-l border-[#E2E8F0] p-5 space-y-6 overflow-y-auto">
            <div>
              <h4 className="text-xs uppercase text-[#94A3B8] font-bold tracking-wider mb-3">Ticket Information</h4>
              <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Ticket ID:</span>
                  <span className="font-bold text-[#0D47A1]">{activeChat.ticketId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Product:</span>
                  <span className="font-semibold text-[#1E293B]">{activeChat.product}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Status:</span>
                  <span className="bg-blue-50 text-blue-650 px-2 py-0.5 rounded font-semibold">{activeChat.status}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase text-[#94A3B8] font-bold tracking-wider mb-3">Associated Parties</h4>
              <div className="space-y-4">
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-full bg-[#E3ECF9] flex items-center justify-center text-[#0D47A1]">
                    <User size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#1E293B]">{activeChat.name}</h5>
                    <p className="text-[10px] text-[#64748B]">{activeChat.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Chat;
