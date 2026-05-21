import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail, MessageSquare, ShieldAlert } from 'lucide-react';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    bookingUpdates: true,
    emailPromo: false,
    whatsAppPromo: true,
    securityAlerts: true
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Notification Settings</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5">
        
        {/* Helper Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-3 shadow-xs">
          <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800">Customize Alerts</h3>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed mt-0.5">Select how and when you want to receive alerts about bookings, security, and exclusive updates.</p>
          </div>
        </div>

        {/* Toggles Container */}
        <div className="bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-xs flex flex-col divide-y divide-slate-100 mt-2">
          
          {/* Main Switch */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">Push Notifications</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Receive alerts on your mobile device</span>
              </div>
            </div>
            <button 
              onClick={() => toggleSetting('pushNotifications')}
              className={`w-10 h-5.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                settings.pushNotifications ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${
                settings.pushNotifications ? 'left-[22px]' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Booking & Service updates */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-[#0D47A1] rounded-xl">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">Booking & Service Updates</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Real-time status updates of your requests</span>
              </div>
            </div>
            <button 
              onClick={() => toggleSetting('bookingUpdates')}
              className={`w-10 h-5.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                settings.bookingUpdates ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${
                settings.bookingUpdates ? 'left-[22px]' : 'left-1'
              }`} />
            </button>
          </div>

          {/* WhatsApp Offers */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">WhatsApp Promo Alerts</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Receive discounts and status directly on WhatsApp</span>
              </div>
            </div>
            <button 
              onClick={() => toggleSetting('whatsAppPromo')}
              className={`w-10 h-5.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                settings.whatsAppPromo ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${
                settings.whatsAppPromo ? 'left-[22px]' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Email Promotions */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">Email Promo Newsletters</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Weekly newsletters, guides and coupon sheets</span>
              </div>
            </div>
            <button 
              onClick={() => toggleSetting('emailPromo')}
              className={`w-10 h-5.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                settings.emailPromo ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${
                settings.emailPromo ? 'left-[22px]' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Security alerts */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">Security & Login Alerts</span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Immediate alerts upon critical profile updates or log-ins</span>
              </div>
            </div>
            <button 
              onClick={() => toggleSetting('securityAlerts')}
              className={`w-10 h-5.5 rounded-full transition-all duration-300 relative cursor-pointer ${
                settings.securityAlerts ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300 ${
                settings.securityAlerts ? 'left-[22px]' : 'left-1'
              }`} />
            </button>
          </div>

        </div>

        {/* Action Button */}
        <button 
          onClick={() => {
            alert('Notification preferences updated successfully!');
            navigate('/profile');
          }}
          className="w-full mt-4 bg-[#0D47A1] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-800 active:scale-[0.99] transition-all shadow-md cursor-pointer text-xs"
        >
          Save Changes
        </button>

      </div>
    </div>
  );
};

export default NotificationSettings;
