import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Bell, 
  Send, 
  Users, 
  UserCheck, 
  Building,
  CheckCircle2,
  Trash2
} from 'lucide-react';

const Notifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('All');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [logs, setLogs] = useState([
    { id: 1, title: 'App Update Scheduled', message: 'The app will be down for maintenance at 2 AM.', target: 'All', date: '12 May, 2026' },
    { id: 2, title: 'New Commission Rates', message: 'We have updated the commission structure for Q2.', target: 'Technicians', date: '11 May, 2026' },
    { id: 3, title: 'LG Partnership Renewal', message: 'We are glad to announce renewal of partnership.', target: 'Brands', date: '10 May, 2026' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      showToast('Please fill in both title and message.');
      return;
    }
    showToast(`Notification broadcasted successfully to ${target}!`);
    setLogs([{ id: Date.now(), title, message, target, date: 'Just now' }, ...logs]);
    setTitle('');
    setMessage('');
  };

  const handleDelete = (id) => {
    setLogs(logs.filter(log => log.id !== id));
    showToast('Notification deleted');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Broadcast Notifications" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 flex flex-col">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Left Column: Create Notification */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-[#E2E8F0] h-fit shadow-sm">
              <h3 className="font-bold text-[#1E293B] mb-4">Send New Broadcast</h3>
              
              <div className="space-y-4">
                {/* Target */}
                <div>
                  <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Target Audience</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['All', 'Users', 'Technicians', 'Brands'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTarget(t)}
                        className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                          target === t 
                            ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1] font-bold' 
                            : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {t === 'Users' && <Users size={12} />}
                        {t === 'Technicians' && <UserCheck size={12} />}
                        {t === 'Brands' && <Building size={12} />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Title</label>
                  <input
                    type="text"
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]"
                    placeholder="Enter notification title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-[#64748B] mb-1.5 block">Message</label>
                  <textarea
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] h-32 text-slate-800 bg-[#F8FAFC]"
                    placeholder="Enter message content..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  ></textarea>
                </div>

                <button 
                  onClick={handleSend}
                  className="w-full bg-[#0D47A1] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send size={16} /> Send Notification
                </button>
              </div>
            </div>

            {/* Right Column: History Logs */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <h3 className="font-bold text-[#1E293B] mb-4">Past Broadcasts</h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.target === 'All' ? 'bg-blue-50 text-blue-600' :
                          log.target === 'Users' ? 'bg-green-50 text-green-600' :
                          log.target === 'Technicians' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          To: {log.target}
                        </span>
                        <h4 className="font-bold text-[#1E293B] mt-1">{log.title}</h4>
                      </div>
                      <span className="text-xs text-[#64748B] flex items-center gap-1 font-medium">{log.date}</span>
                    </div>
                    <p className="text-sm text-[#64748B] mt-1">{log.message}</p>
                    
                    <button 
                      onClick={() => handleDelete(log.id)}
                      className="absolute top-4 right-4 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
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

export default Notifications;
