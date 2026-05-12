import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Globe, 
  CreditCard, 
  Percent,
  Save
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('App');

  const tabs = [
    { name: 'App', icon: <Globe size={16} /> },
    { name: 'Notifications', icon: <Bell size={16} /> },
    { name: 'Security', icon: <Lock size={16} /> },
    { name: 'Payment', icon: <CreditCard size={16} /> },
    { name: 'Tax', icon: <Percent size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="System Settings" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-8rem)]">
            
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
                <div className="space-y-6 max-w-2xl">
                  <h3 className="font-bold text-[#1E293B]">General Application Settings</h3>
                  
                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Platform Name</label>
                    <input type="text" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]" defaultValue="Nigam Care Company" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Support Email</label>
                    <input type="email" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]" defaultValue="support@nigamcare.com" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Maintenance Mode</label>
                    <button className="w-12 h-6 bg-gray-200 rounded-full flex items-center transition-colors px-1">
                      <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-0"></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Notifications' && (
                <div className="space-y-4 max-w-2xl">
                  <h3 className="font-bold text-[#1E293B]">Notification Preferences</h3>
                  {[
                    { label: 'Email Notifications', desc: 'Send automated emails to users on booking.' },
                    { label: 'SMS Alerts', desc: 'Send SMS to technicians for new jobs.' },
                    { label: 'Push Notifications', desc: 'Enable push notifications for mobile apps.' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 border border-[#E2E8F0] rounded-xl">
                      <div>
                        <p className="font-bold text-[#1E293B] text-sm">{item.label}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">{item.desc}</p>
                      </div>
                      <button className="w-12 h-6 bg-[#0D47A1] rounded-full flex items-center transition-colors px-1">
                        <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-6"></div>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'Security' && (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="font-bold text-[#1E293B]">Security & API</h3>
                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">JWT Secret Key</label>
                    <input type="password" disabled className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm bg-[#F8FAFC] text-[#64748B]" defaultValue="************************" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Two-Factor Authentication</label>
                    <button className="w-12 h-6 bg-gray-200 rounded-full flex items-center transition-colors px-1">
                      <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform translate-x-0"></div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'Payment' && (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="font-bold text-[#1E293B]">Payment Gateway Configuration</h3>
                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Razorpay API Key</label>
                    <input type="text" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]" defaultValue="rzp_live_****************" />
                  </div>
                </div>
              )}

              {activeTab === 'Tax' && (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="font-bold text-[#1E293B]">Tax Settings</h3>
                  <div>
                    <label className="text-xs font-medium text-[#64748B] mb-1 block">Default GST (%)</label>
                    <input type="number" className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0D47A1]" defaultValue="18" />
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end">
              <button 
                onClick={() => alert('Settings saved successfully!')}
                className="bg-[#0D47A1] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
