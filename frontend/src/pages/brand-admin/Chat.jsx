import React, { useState } from 'react';
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

const Chat = () => {
  const [activeChannel, setActiveChannel] = useState('cust-1'); // 'cust-1', 'tech-1'
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [conversations, setConversations] = useState({
    'cust-1': {
      id: 'cust-1',
      ticketId: 'SR-8901',
      name: 'Amit Sharma',
      role: 'Customer',
      product: 'Smart TV',
      status: 'In Progress',
      lastSeen: 'Online',
      messages: [
        { id: 1, sender: 'user', text: 'Hello, the technician was supposed to visit today. Any updates?', time: '10:00 AM' },
        { id: 2, sender: 'brand', text: 'Hi Amit, technician Rahul Kumar has been assigned and is on his way to your location.', time: '10:05 AM' },
        { id: 3, sender: 'user', text: 'Great, thanks for the update! Will he carry the display board with him?', time: '10:08 AM' },
      ]
    },
    'tech-1': {
      id: 'tech-1',
      ticketId: 'SR-8902',
      name: 'Amit Singh',
      role: 'Technician',
      product: 'Refrigerator',
      status: 'Pending',
      lastSeen: 'Last seen 5m ago',
      messages: [
        { id: 1, sender: 'user', text: 'Hi support team, I checked the Refrigerator model LG-REF-450. The compressor is faulty and needs replacement under warranty.', time: '09:30 AM' },
        { id: 2, sender: 'brand', text: 'Noted Amit. Please raise a spare part request from your technician app claims tab.', time: '09:35 AM' },
        { id: 3, sender: 'user', text: 'Already raised claim #PR-1002. Please approve it so I can fetch it from the hub.', time: '09:38 AM' },
      ]
    }
  });

  const activeChat = conversations[activeChannel] || conversations['cust-1'];

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

          {/* Right Panel: Ticket Info */}
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
