import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Save,
  Check
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Brand Profile', icon: <User size={16} /> },
    { id: 'service', label: 'Service Config', icon: <SettingsIcon size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Settings" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Tabs */}
          <div className="flex border-b border-[#E2E8F0]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'border-[#0D47A1] text-[#0D47A1]' 
                    : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] max-w-4xl">
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Brand Profile Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Brand Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      defaultValue="LG Electronics"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Support Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      defaultValue="support@lg.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Support Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      defaultValue="1800-123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Website</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      defaultValue="https://lg.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'service' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Service Configuration</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">Auto-assign Technicians</p>
                      <p className="text-xs text-[#64748B]">Automatically assign closest available technician to new requests.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">Require Photo Proof</p>
                      <p className="text-xs text-[#64748B]">Technicians must upload photo after service completion.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">Email Notifications</p>
                      <p className="text-xs text-[#64748B]">Receive daily summary reports via email.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">SMS Alerts</p>
                      <p className="text-xs text-[#64748B]">Send SMS to customers on status updates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#1E293B]">Security Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Current Password</label>
                    <input
                      type="password"
                      className="w-full max-w-md px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">New Password</label>
                    <input
                      type="password"
                      className="w-full max-w-md px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSave}
                className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 min-w-[120px] justify-center"
              >
                {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
