import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Headphones, 
  MessageSquare, 
  User, 
  Send,
  CheckCircle,
  Clock
} from 'lucide-react';

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tickets, setTickets] = useState([
    { id: 'TKT-101', user: 'Amit Sharma', message: 'I need to change my address for the booking.', status: 'Open', date: '12 May' },
    { id: 'TKT-102', user: 'Priya Patel', message: 'Payment failed but money deducted.', status: 'Pending', date: '12 May' },
    { id: 'TKT-103', user: 'Tech Rahul', message: 'App is crashing on job complete.', status: 'Open', date: '11 May' },
  ]);

  const [selectedTicket, setSelectedTicket] = useState(tickets[0]);
  const [reply, setReply] = useState('');

  const handleSendReply = () => {
    if (!reply.trim()) return;
    alert(`Reply sent to ${selectedTicket.user}: ${reply}`);
    setReply('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Active Tickets</h3>
                <span className="bg-blue-50 text-[#0D47A1] px-2.5 py-1 rounded-full text-xs font-medium">{tickets.length} New</span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {tickets.map((tkt) => (
                  <div 
                    key={tkt.id}
                    onClick={() => setSelectedTicket(tkt)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedTicket?.id === tkt.id 
                        ? 'border-[#0D47A1] bg-[#EEF4FF]' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-[#1E293B]">{tkt.id}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tkt.status === 'Open' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                        {tkt.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#0D47A1] mt-1">{tkt.user}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 truncate">{tkt.message}</p>
                    <p className="text-xs text-[#64748B] mt-2 flex items-center gap-1"><Clock size={12} /> {tkt.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Chat/Resolution Area */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
              {selectedTicket ? (
                <>
                  <div className="flex justify-between items-center mb-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <h3 className="font-bold text-[#1E293B]">{selectedTicket.user}</h3>
                      <p className="text-xs text-[#64748B]">{selectedTicket.id}</p>
                    </div>
                    <button className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1">
                      <CheckCircle size={14} /> Mark Resolved
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-2">
                    {/* User Message */}
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-sm">
                        {selectedTicket.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="bg-[#F8FAFC] p-3 rounded-xl max-w-md border border-[#E2E8F0]">
                        <p className="text-sm text-[#1E293B]">{selectedTicket.message}</p>
                        <p className="text-xs text-[#64748B] mt-1">10:30 AM</p>
                      </div>
                    </div>

                    {/* Admin Reply Placeholder */}
                    <div className="flex gap-3 items-start justify-end">
                      <div className="bg-[#0D47A1] text-white p-3 rounded-xl max-w-md">
                        <p className="text-sm">Hello, we are looking into this. Please give us a few minutes.</p>
                        <p className="text-xs text-blue-200 mt-1">10:32 AM</p>
                      </div>
                      <div className="w-8 h-8 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        SA
                      </div>
                    </div>
                  </div>

                  {/* Reply Input */}
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]"
                      placeholder="Type your reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <button 
                      onClick={handleSendReply}
                      className="bg-[#0D47A1] text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748B]">
                  <MessageSquare size={48} className="mb-2 opacity-50" />
                  <p>Select a ticket to view conversation</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Support;
