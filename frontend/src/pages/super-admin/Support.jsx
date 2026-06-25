import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  MessageSquare, 
  Send,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reply, setReply] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [tickets, setTickets] = useState([
    { 
      id: 'TKT-101', 
      user: 'Amit Sharma', 
      message: 'I need to change my address for the booking.', 
      status: 'Open', 
      date: '12 May',
      chats: [
        { sender: 'user', text: 'I need to change my address for the booking.', time: '10:30 AM' },
        { sender: 'admin', text: 'Hello, we are looking into this. Please give us a few minutes.', time: '10:32 AM' }
      ]
    },
    { 
      id: 'TKT-102', 
      user: 'Priya Patel', 
      message: 'Payment failed but money deducted.', 
      status: 'Pending', 
      date: '12 May',
      chats: [
        { sender: 'user', text: 'Payment failed but money deducted.', time: '09:15 AM' }
      ]
    },
    { 
      id: 'TKT-103', 
      user: 'Tech Rahul', 
      message: 'App is crashing on job complete.', 
      status: 'Open', 
      date: '11 May',
      chats: [
        { sender: 'user', text: 'App is crashing on job complete.', time: '04:10 PM' }
      ]
    },
  ]);

  const [selectedTicketId, setSelectedTicketId] = useState('TKT-101');
  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSendReply = (e) => {
    if (e) e.preventDefault();
    if (!reply.trim() || !selectedTicketId) return;

    setTickets(tickets.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          status: 'Pending',
          chats: [
            ...t.chats,
            { sender: 'admin', text: reply.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]
        };
      }
      return t;
    }));

    showToast(`Reply sent to ${selectedTicket?.user}`);
    setReply('');
  };

  const handleMarkResolved = (id) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    showToast(`Ticket ${id} marked as Resolved!`);
  };

  const filteredTickets = tickets.filter(t => 
    t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Customer Support Desk" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 flex flex-col">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Left Column: Ticket List */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Active Tickets</h3>
                <span className="bg-blue-50 text-[#0D47A1] px-2.5 py-1 rounded-full text-xs font-medium">{filteredTickets.filter(t => t.status !== 'Resolved').length} Active</span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search Tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredTickets.map((tkt) => (
                  <div 
                    key={tkt.id}
                    onClick={() => setSelectedTicketId(tkt.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedTicketId === tkt.id 
                        ? 'border-[#0D47A1] bg-[#EEF4FF]' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-[#1E293B]">{tkt.id}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        tkt.status === 'Open' ? 'bg-green-50 text-green-600' :
                        tkt.status === 'Resolved' ? 'bg-slate-100 text-slate-600' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {tkt.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#0D47A1] mt-1">{tkt.user}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 truncate">{tkt.message}</p>
                    <p className="text-xs text-[#64748B] mt-2 flex items-center gap-1 font-semibold"><Clock size={12} /> {tkt.date}</p>
                  </div>
                ))}
                {filteredTickets.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center pt-8">No tickets found.</p>
                )}
              </div>
            </div>

            {/* Right Column: Chat/Resolution Area */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              {selectedTicket ? (
                <>
                  <div className="flex justify-between items-center mb-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <h3 className="font-bold text-[#1E293B]">{selectedTicket.user}</h3>
                      <p className="text-xs text-[#64748B]">{selectedTicket.id}</p>
                    </div>
                    {selectedTicket.status !== 'Resolved' && (
                      <button 
                        onClick={() => handleMarkResolved(selectedTicket.id)}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 size={14} /> Mark Resolved
                      </button>
                    )}
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-2 pr-1">
                    {selectedTicket.chats.map((chat, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 items-start ${chat.sender === 'admin' ? 'justify-end' : ''}`}
                      >
                        {chat.sender !== 'admin' && (
                          <div className="w-8 h-8 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-sm flex-shrink-0">
                            {selectedTicket.user.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div className={`p-3 rounded-xl max-w-md border ${
                          chat.sender === 'admin' 
                            ? 'bg-[#0D47A1] text-white border-transparent' 
                            : 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0]'
                        }`}>
                          <p className="text-sm leading-relaxed">{chat.text}</p>
                          <p className={`text-[10px] mt-1 text-right ${chat.sender === 'admin' ? 'text-blue-200' : 'text-[#64748B]'}`}>{chat.time}</p>
                        </div>
                        {chat.sender === 'admin' && (
                          <div className="w-8 h-8 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            SA
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={handleSendReply} className="mt-4 pt-4 border-t border-[#E2E8F0] flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]"
                      placeholder={selectedTicket.status === 'Resolved' ? "This ticket is resolved. Reopen by sending a reply..." : "Type your reply..."}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <button 
                      type="submit"
                      className="bg-[#0D47A1] text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748B]">
                  <MessageSquare size={48} className="mb-2 opacity-50" />
                  <p className="text-sm">Select a ticket to view conversation</p>
                </div>
              )}
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

export default Support;
