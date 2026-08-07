import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Save,
  Check,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

// Which settings fields each tab owns, so saving one tab never writes another
// tab's unsaved values.
const TAB_FIELDS = {
  profile: ['supportEmail', 'supportPhone', 'website'],
  service: ['autoAssignTechnician', 'requireCompletionPhoto'],
  notifications: ['emailNotifications', 'smsAlerts'],
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [brandName, setBrandName] = useState('Brand Partner');
  const [supportEmail, setSupportEmail] = useState('support@brand.com');
  const [supportPhone, setSupportPhone] = useState('1800-123-4567');
  const [website, setWebsite] = useState('https://brand.com');

  // Config toggles
  const [autoAssign, setAutoAssign] = useState(true);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  // Security password fields
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const tabs = [
    { id: 'profile', label: 'Brand Profile', icon: <User size={16} /> },
    { id: 'service', label: 'Service Config', icon: <SettingsIcon size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  ];

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const res = await apiRequest('/brand/settings', { auth: true });
        const s = res?.data;
        if (cancelled || !s) return;
        // brandName is the Brand document's own, owned by super-admin.
        setBrandName(s.brandName || '');
        setSupportEmail(s.supportEmail || '');
        setSupportPhone(s.supportPhone || '');
        setWebsite(s.website || '');
        setAutoAssign(s.autoAssignTechnician !== false);
        setRequirePhoto(s.requireCompletionPhoto !== false);
        setEmailNotifs(s.emailNotifications !== false);
        setSmsAlerts(!!s.smsAlerts);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const persistSettings = async (overrides = {}) => {
    const res = await apiRequest('/brand/settings', {
      method: 'PUT',
      auth: true,
      body: {
        supportEmail,
        supportPhone,
        website,
        autoAssignTechnician: autoAssign,
        requireCompletionPhoto: requirePhoto,
        emailNotifications: emailNotifs,
        smsAlerts,
        ...overrides,
      },
    });
    return res.data;
  };

  // Every branch persists now. The security tab in particular reported
  // "Password updated successfully!" while changing nothing — the admin kept
  // signing in with the old password and had no way to tell.
  const handleSave = async () => {
    setError('');
    try {
      if (activeTab === 'security') {
        if (!currentPassword || !newPassword) {
          showToast('Please fill in password fields to update.');
          return;
        }
        await apiRequest('/auth/password', {
          method: 'PATCH',
          auth: true,
          body: { currentPassword, newPassword },
        });
        setCurrentPassword('');
        setNewPassword('');
        showToast('Password updated. Your other sessions have been signed out.');
        return;
      }

      await persistSettings();
      showToast(
        activeTab === 'profile' ? 'Profile settings saved.'
          : activeTab === 'service' ? 'Service configuration saved.'
          : 'Notification preferences saved.',
      );
    } catch (err) {
      setError(err.message || 'Could not save your settings.');
    }
  };

  // A toggle is a save — leaving it local meant the switch flipped back on the
  // next page load.
  const handleToggle = async (setting, stateSetter, currentVal, field) => {
    const newVal = !currentVal;
    stateSetter(newVal);
    setError('');
    try {
      await persistSettings({ [field]: newVal });
      showToast(`${setting} is now ${newVal ? 'ENABLED' : 'DISABLED'}`);
    } catch (err) {
      stateSetter(currentVal);
      setError(err.message || `Could not change "${setting}".`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
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
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Support Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Support Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">Website</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
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
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={autoAssign} 
                        onChange={() => handleToggle('Auto-assign Technicians', setAutoAssign, autoAssign, 'autoAssignTechnician')} 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">Require Photo Proof</p>
                      <p className="text-xs text-[#64748B]">Technicians must upload photo after service completion.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={requirePhoto} 
                        onChange={() => handleToggle('Require Photo Proof', setRequirePhoto, requirePhoto, 'requireCompletionPhoto')} 
                      />
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
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={emailNotifs} 
                        onChange={() => handleToggle('Email Notifications', setEmailNotifs, emailNotifs, 'emailNotifications')} 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D47A1]"></div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">SMS Alerts</p>
                      <p className="text-xs text-[#64748B]">Send SMS to customers on status updates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={smsAlerts} 
                        onChange={() => handleToggle('SMS Alerts', setSmsAlerts, smsAlerts, 'smsAlerts')} 
                      />
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
                      className="w-full max-w-md px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#64748B] mb-1 block">New Password</label>
                    <input
                      type="password"
                      className="w-full max-w-md px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm text-slate-800 bg-[#F8FAFC]"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-6 text-xs font-semibold text-red-600 text-right">{error}</p>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading || saving}
                className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 min-w-[120px] justify-center shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
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
