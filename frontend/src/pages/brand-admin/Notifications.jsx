import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Bell, 
  ClipboardList, 
  UserCheck, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2,
  Check
} from 'lucide-react';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');

  const tabs = [
    { id: 'all', label: 'All Notifications' },
    { id: 'service', label: 'Service Alerts' },
    { id: 'tech', label: 'Technician Updates' },
    { id: 'dispatch', label: 'Dispatch Alerts' },
  ];

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'service', title: 'New Service Request', message: 'Customer Amit Sharma raised a new request for Smart TV.', time: '10 mins ago', read: false, priority: 'high' },
    { id: 2, type: 'tech', title: 'Technician Assigned', message: 'Rahul Kumar has been assigned to Request #SR-8902.', time: '25 mins ago', read: true, priority: 'medium' },
    { id: 3, type: 'dispatch', title: 'Part Dispatched', message: 'Compressor for Request #SR-8901 has been dispatched.', time: '1 hour ago', read: false, priority: 'medium' },
    { id: 4, type: 'service', title: 'Service Completed', message: 'Request #SR-8903 has been marked as completed.', time: '4 hours ago', read: true, priority: 'low' },
  ]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    showToast('Notification marked as read');
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
    showToast('Notification deleted');
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

  const getIcon = (type) => {
    switch (type) {
      case 'service': return <ClipboardList size={18} />;
      case 'tech': return <UserCheck size={18} />;
      case 'dispatch': return <Truck size={18} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Notification Center" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Controls */}
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[10px] ${
                    activeTab === tab.id 
                      ? 'border-[#0D47A1] text-[#0D47A1]' 
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#0D47A1] hover:underline flex items-center gap-1"
              >
                <Check size={14} /> Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`bg-white p-4 rounded-xl border flex gap-4 items-start transition-shadow hover:shadow-sm ${
                  notif.read ? 'border-[#E2E8F0]' : 'border-blue-100 bg-blue-50/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.priority === 'high' ? 'bg-red-50 text-red-600' :
                  notif.priority === 'medium' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#1E293B]">{notif.title}</h3>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                        )}
                        {notif.priority === 'high' && (
                          <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5">
                            <AlertTriangle size={10} /> High
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#64748B] mt-0.5">{notif.message}</p>
                    </div>
                    <span className="text-xs text-[#64748B]">{notif.time}</span>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-3 text-xs font-medium">
                    {!notif.read && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-[#0D47A1] hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(notif.id)}
                      className="text-[#64748B] hover:text-[#1E293B] flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-[#E2E8F0] animate-in fade-in duration-200">
                <Bell size={48} className="text-[#64748B] mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Notifications</h3>
                <p className="text-sm text-[#64748B]">You have no notifications in this category.</p>
              </div>
            )}
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
