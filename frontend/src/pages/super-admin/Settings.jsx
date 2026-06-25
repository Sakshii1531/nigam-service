import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Bell, 
  Lock, 
  Globe, 
  CreditCard, 
  Percent,
  Save,
  CheckCircle2
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('App');
  const [successMessage, setSuccessMessage] = useState('');

  // Form input states
  const [platformName, setPlatformName] = useState('Nigam Care Company');
  const [supportEmail, setSupportEmail] = useState('support@nigamcare.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('rzp_live_****************');
  const [defaultGst, setDefaultGst] = useState('18');
  const [twoFactor, setTwoFactor] = useState(false);

  // Notifications toggles
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsAlert, setSmsAlert] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  const tabs = [
    { name: 'App', icon: <Globe size={16} /> },
    { name: 'Notifications', icon: <Bell size={16} /> },
    { name: 'Security', icon: <Lock size={16} /> },
    { name: 'Payment', icon: <CreditCard size={16} /> },
    { name: 'Tax', icon: <Percent size={16} /> },
  ];

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSave = () => {
    showToast(`${activeTab} settings saved successfully!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="System Settings" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-8rem)] shadow-sm">
            
            {/* Sidebar Tabs */}
            <div className="flex border-b border-[#E2E8F0]">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.name 
                      ? 'border-[#0D47A1] text-[#0D47A1]' 
                      : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              
              {activeTab === 'App' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">General Application Settings</h3>
                  
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Platform Name</label>
                    <input 
                      type="text" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Support Email</label>
                    <input 
                      type="email" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)} 
                    />
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Maintenance Mode</p>
                      <p className="text-xs text-[#64748B]">Toggle to display maintenance screen to customers.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !maintenanceMode;
                        setMaintenanceMode(nextVal);
                        showToast(`Maintenance mode is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        maintenanceMode ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Notifications' && (
                <div className="space-y-4 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Notification Preferences</h3>
                  
                  {/* Email Notifications */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">Email Notifications</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Send automated emails to users on booking.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !emailNotif;
                        setEmailNotif(nextVal);
                        showToast(`Email notifications ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        emailNotif ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        emailNotif ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  {/* SMS Alerts */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">SMS Alerts</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Send SMS to technicians for new jobs.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !smsAlert;
                        setSmsAlert(nextVal);
                        showToast(`SMS alerts ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        smsAlert ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        smsAlert ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>

                  {/* Push Notifications */}
                  <div className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                    <div>
                      <p className="font-bold text-[#1E293B] text-sm">Push Notifications</p>
                      <p className="text-xs text-[#64748B] mt-0.5">Enable push notifications for mobile apps.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !pushNotif;
                        setPushNotif(nextVal);
                        showToast(`Push notifications ${nextVal ? 'enabled' : 'disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        pushNotif ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        pushNotif ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Security' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Security & API</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">JWT Secret Key</label>
                    <input type="password" disabled className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm bg-slate-100 text-[#64748B] cursor-not-allowed" defaultValue="************************" />
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Two-Factor Authentication</p>
                      <p className="text-xs text-[#64748B]">Require 2FA verification code for super admin login.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !twoFactor;
                        setTwoFactor(nextVal);
                        showToast(`Two-factor auth is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
                      }}
                      className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${
                        twoFactor ? 'bg-[#0D47A1]' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        twoFactor ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Payment' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Payment Gateway Configuration</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Razorpay API Key</label>
                    <input 
                      type="text" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={razorpayKey}
                      onChange={(e) => setRazorpayKey(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === 'Tax' && (
                <div className="space-y-6 max-w-2xl text-left">
                  <h3 className="font-bold text-[#1E293B] text-base">Tax Settings</h3>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1.5 block">Default GST (%)</label>
                    <input 
                      type="number" 
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1] text-slate-800 bg-[#F8FAFC]" 
                      value={defaultGst}
                      onChange={(e) => setDefaultGst(e.target.value)} 
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end bg-[#F8FAFC]">
              <button 
                onClick={handleSave}
                className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Save size={16} /> Save Changes
              </button>
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

export default Settings;
