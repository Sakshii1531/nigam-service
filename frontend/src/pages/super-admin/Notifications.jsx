import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Bell, 
  Send, 
  Users, 
  UserCheck, 
  Building,
  CheckCircle2,
  Trash2,
  Smartphone,
  Sparkles,
  Search,
  MessageSquare,
  Radio,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const Notifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('All');
  const [channel, setChannel] = useState('push'); // 'push' | 'whatsapp' | 'inapp'
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [pushStats, setPushStats] = useState(null);

  // Every role-wide notification the platform has broadcast, newest first.
  const loadLogs = React.useCallback(async () => {
    try {
      const res = await apiRequest('/notifications/broadcasts?limit=100', { auth: true });
      setLogs((res || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message || '',
        target: n.broadcastRole,
        channel: n.type === 'promo' ? 'Broadcast' : 'Push',
        date: n.createdAt
          ? new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—',
        status: 'Delivered',
      })));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load broadcast history.');
    }

  }, []);

  // Reach is audience-specific: showing platform-wide device counts while the
  // admin has "Technicians" selected overstates who this will actually land on.
  const loadStats = React.useCallback(async (audience) => {
    try {
      const stats = await apiRequest(
        `/notifications/push-stats?broadcastRole=${encodeURIComponent(audience)}`,
        { auth: true },
      );
      setPushStats(stats || null);
    } catch (err) {
      console.warn('[notifications] Could not load push stats:', err.message);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(target); }, [loadStats, target]);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both title and notification message text.');
      return;
    }

    setSending(true);
    try {
      // A failure here has to be reported — this used to be swallowed and the
      // console claimed success for a broadcast that never left the building.
      // The selector used to change only this toast's wording — every send
      // fanned out to devices regardless of what the admin picked. In-app is
      // always written (it is the record, and the history below reads it back);
      // 'push' is what additionally reaches phones.
      await apiRequest('/notifications/push', {
        method: 'POST',
        auth: true,
        body: {
          broadcastRole: target,
          title,
          body: message,
          type: 'promo',
          channels: channel === 'push' ? ['inapp', 'push'] : ['inapp'],
        },
      });

      showToast(
        channel === 'push'
          ? `Push + in-app broadcast sent to ${target}`
          : `In-app broadcast sent to ${target}`,
      );
      await Promise.all([loadLogs(), loadStats(target)]);

      setTitle('');
      setMessage('');
    } catch (err) {
      showToast(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  // A broadcast that has already gone out cannot be recalled, and the log is the
  // record that it did — so there is nothing honest to delete here.
  const handleDelete = () => {
    showToast('Broadcast history is a permanent record and cannot be deleted.');
  };

  const filteredLogs = logs.filter(log => 
    !searchQuery.trim() || 
    log.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Broadcast & Push Notification Center" subtitle="Send real-time alerts, push notifications, and WhatsApp updates to clients, technicians, and brand managers" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 flex flex-col text-left">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-[#0D47A1] rounded-xl flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Broadcasts</span>
                <span className="text-lg font-black text-slate-900">{(pushStats?.broadcasts ?? logs.length).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Push Devices</span>
                <span className="text-lg font-black text-slate-900">{(pushStats?.activeDevices || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reachable Accounts</span>
                <span className="text-lg font-black text-slate-900">{(pushStats?.deviceHolders || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Left Column: Create Notification & Live Preview */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Form Box */}
              <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Bell className="h-4 w-4 text-[#0D47A1]" />
                  <h3 className="font-extrabold text-xs text-[#1E293B] uppercase tracking-wider">Send Broadcast Alert</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Target Audience */}
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">Target Audience</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'All', label: 'All Users', icon: <Users size={12} /> },
                        { id: 'Customers', label: 'Customers', icon: <Users size={12} /> },
                        { id: 'Technicians', label: 'Technicians', icon: <UserCheck size={12} /> },
                        { id: 'Brands', label: 'Brand Admins', icon: <Building size={12} /> }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTarget(t.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            target === t.id 
                              ? 'border-[#0D47A1] bg-[#EEF4FF] text-[#0D47A1]' 
                              : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {t.icon}
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Channel Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">Delivery Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setChannel('push')}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          channel === 'push' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone size={14} />
                        <span>Push + In-App</span>
                      </button>

                      <button
                        onClick={() => setChannel('inapp')}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          channel === 'inapp' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-[#E2E8F0] text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Radio size={14} />
                        <span>In-App Only</span>
                      </button>

                      {/* Disabled rather than removed: WhatsApp has a provider
                          for one-to-one sends, but no role-wide fan-out — and
                          bulk WhatsApp needs template approval before it could
                          be offered here. Selecting it used to change nothing
                          but this screen's success message. */}
                      <button
                        disabled
                        title="Bulk WhatsApp broadcast is not configured yet"
                        className="py-2 px-2 rounded-xl text-[11px] font-bold border border-[#E2E8F0] text-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      {channel === 'push'
                        ? 'Appears in the app and alerts registered devices.'
                        : 'Appears in the app only — no device alert.'}
                    </p>
                    {/* Says who this actually lands on, counted the same way the
                        fan-out counts: in-audience, holds a device token, has
                        not opted out. */}
                    {channel === 'push' && pushStats && (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        {pushStats.deviceHolders > 0 ? (
                          <>
                            Reaches <span className="text-pink-600">{pushStats.deviceHolders.toLocaleString('en-IN')}</span>
                            {' of '}{(pushStats.audience || 0).toLocaleString('en-IN')} in {target}
                            {' '}({(pushStats.activeDevices || 0).toLocaleString('en-IN')} devices)
                          </>
                        ) : (
                          <span className="text-amber-600">
                            Nobody in {target} has notifications enabled yet — this will be in-app only.
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">Notification Title *</label>
                    <input
                      type="text"
                      className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]"
                      placeholder="e.g. Monsoon Special: 20% OFF AC Service!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5 block">Message Content *</label>
                    <textarea
                      rows={3}
                      className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC] resize-none"
                      placeholder="Write your push notification message copy..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleSend}
                    disabled={sending}
                    className="w-full bg-[#0D47A1] hover:bg-blue-900 text-white py-3 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>{sending ? 'Dispatching...' : 'Dispatch Broadcast Now'}</span>
                  </button>
                </div>
              </div>

              {/* Live Mobile Push Preview Card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-pink-400" /> Live Mobile Push Preview</span>
                  <span className="text-emerald-400 font-black">ACTIVE</span>
                </div>

                <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-[#0D47A1] rounded-md flex items-center justify-center text-[8px] font-black text-white">N</div>
                      <span className="text-[10px] font-extrabold text-slate-300">NIGAM CARE</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold">now</span>
                  </div>
                  <h5 className="text-xs font-extrabold text-white mt-1 leading-snug">
                    {title.trim() || 'Notification Title'}
                  </h5>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    {message.trim() || 'Your broadcast message preview will render here in real time.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column: History Logs */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col min-h-[600px] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-sm text-[#1E293B]">Broadcast History Logs ({filteredLogs.length})</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Record of all past notifications sent across channels</p>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-[#0D47A1]"
                  />
                </div>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 font-semibold border-2 border-dashed border-slate-100 rounded-2xl">
                    No notification logs found.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors relative group text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.target === 'All' ? 'bg-blue-50 text-blue-700' :
                            log.target === 'Users' || log.target === 'Customers' ? 'bg-emerald-50 text-emerald-700' :
                            log.target === 'Technicians' ? 'bg-amber-50 text-amber-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            To: {log.target}
                          </span>

                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {log.channel || 'Push'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">{log.date}</span>
                      </div>

                      <h4 className="font-extrabold text-xs text-[#1E293B] mt-2">{log.title}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{log.message}</p>
                      
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className="absolute top-4 right-4 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-black px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 animate-bounce">
          <Sparkles className="h-4 w-4 text-amber-400" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Notifications;

